"""Einziger HTTP-Zugang: robots.txt beachten, max. 1 Anfrage/s pro Domain."""
import time
import urllib.robotparser
from urllib.parse import urljoin, urlsplit, urlunsplit

import requests

USER_AGENT = "jobradar/1.0 (+https://github.com/testgaly99/jobradar)"
TIMEOUT = 30
PAUSE = 1.0
MAX_REDIRECTS = 5  # RFC 9309: mindestens fünf Robots-Weiterleitungen auch über Domains folgen.
_REDIRECTS = {301, 302, 303, 307, 308}

_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
_zuletzt: dict[str, float] = {}


class VerbotenDurchRobots(Exception):
    pass


class RobotsNichtErreichbar(Exception):
    def __init__(self, text, status=None):
        super().__init__(text)
        self.status = status


def _adresse(url):
    """Nur HTTP(S), keine Anmeldedaten/Steuerzeichen; Fragmente werden nicht angefordert."""
    if (not isinstance(url, str) or not url or "\\" in url
            or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in url)):
        raise ValueError("Ungültige HTTP-Adresse")
    try:
        teile = urlsplit(url)
        port = teile.port
        if (teile.scheme not in {"http", "https"} or not teile.hostname or "%" in teile.hostname
                or teile.username is not None or teile.password is not None or port == 0):
            raise ValueError("Ungültige HTTP-Adresse")
        host = teile.hostname.encode("idna").decode("ascii").lower()
    except (ValueError, UnicodeError):
        raise ValueError("Ungültige HTTP-Adresse") from None
    netloc = f"[{host}]" if ":" in host else host
    if port is not None and port != (443 if teile.scheme == "https" else 80):
        netloc += f":{port}"
    basis = f"{teile.scheme}://{netloc}"
    return urlunsplit((teile.scheme, netloc, teile.path or "/", teile.query, "")), basis


def _get(basis: str, url: str) -> requests.Response:
    # Ein Protokoll-/Portwechsel gibt derselben Domain kein zweites Abrufkontingent.
    domain = urlsplit(basis).hostname
    warte = _zuletzt.get(domain, float("-inf")) + PAUSE - time.monotonic()
    if warte > 0:
        time.sleep(warte)
    try:
        return requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT, allow_redirects=False)
    finally:
        _zuletzt[domain] = time.monotonic()


def _mit_weiterleitungen(url, robots_pruefen, pruefe=None):
    gesehen = set()
    for hops in range(MAX_REDIRECTS + 1):
        url, basis = _adresse(url)
        if url in gesehen:
            raise requests.TooManyRedirects("Weiterleitungsschleife")
        gesehen.add(url)
        if pruefe:
            pruefe(url)  # z. B. Nachrüsten: Ziel darf nie intern sein, auch nach Weiterleitung
        if robots_pruefen and not _darf(basis, url, pruefe):
            raise VerbotenDurchRobots(url)
        antwort = _get(basis, url)
        if antwort.status_code not in _REDIRECTS:
            return antwort
        try:
            if hops == MAX_REDIRECTS:
                raise requests.TooManyRedirects("Zu viele Weiterleitungen", response=antwort)
            ziel = antwort.headers.get("Location")
            if not isinstance(ziel, str) or not ziel:
                raise ValueError("Weiterleitung ohne gültiges Ziel")
            # Vor urljoin prüfen: urlsplit würde manche Steuerzeichen still entfernen.
            if "\\" in ziel or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in ziel):
                raise ValueError("Ungültiges Weiterleitungsziel")
            url, _ = _adresse(urljoin(url, ziel))
        finally:
            antwort.close()


def _darf(basis: str, url: str, pruefe=None) -> bool:
    if basis not in _robots:
        parser = None
        try:
            # RFC 9309: Redirect-Regeln gehören zum Ursprung. Keine rekursive Robots-Abfrage
            # für den Ablageort der Datei; die Domainpause gilt trotzdem für jeden Hop.
            antwort = _mit_weiterleitungen(basis + "/robots.txt", robots_pruefen=False, pruefe=pruefe)
        except (requests.RequestException, ValueError) as e:
            status = getattr(getattr(e, "response", None), "status_code", None)
            raise RobotsNichtErreichbar("robots.txt nicht erreichbar", status) from e
        if antwort.status_code >= 500:
            raise RobotsNichtErreichbar(f"{basis}: HTTP {antwort.status_code}", antwort.status_code)
        if antwort.status_code < 400:  # 4xx: alles erlaubt
            parser = urllib.robotparser.RobotFileParser()
            parser.parse(antwort.text.splitlines())
        _robots[basis] = parser
    parser = _robots[basis]
    return parser is None or parser.can_fetch(USER_AGENT, url)


def hole(url: str, pruefe=None) -> requests.Response:
    antwort = _mit_weiterleitungen(url, robots_pruefen=True, pruefe=pruefe)
    antwort.raise_for_status()
    return antwort
