"""Einziger HTTP-Zugang: robots.txt beachten, max. 1 Anfrage/s pro Domain."""
from contextlib import contextmanager
from contextvars import ContextVar
from http.client import HTTPException, HTTPSConnection
import ipaddress
import socket
import ssl
import time
import urllib.robotparser
from urllib.parse import urljoin, urlsplit, urlunsplit

import requests

USER_AGENT = "jobradar/1.0 (+https://github.com/testgaly99/jobradar)"
TIMEOUT = 30
PAUSE = 1.0
MAX_REDIRECTS = 5  # RFC 9309: mindestens fünf Robots-Weiterleitungen auch über Domains folgen.
MAX_ANTWORT_BYTES = 20 * 1024 * 1024
_REDIRECTS = {301, 302, 303, 307, 308}

_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
_zuletzt: dict[str, float] = {}
_zielpruefungen = ContextVar('jobradar_zielpruefungen', default=())
_ipbindung = ContextVar('jobradar_ipbindung', default=False)


@contextmanager
def zielschutz(pruefe, *, gepinnt=False):
    """Zusätzlicher Zielschutz für alle Adapterabrufe innerhalb einer privaten Suche."""
    token = _zielpruefungen.set((*_zielpruefungen.get(), pruefe))
    ip_token = _ipbindung.set(_ipbindung.get() or gepinnt)
    try:
        yield
    finally:
        _ipbindung.reset(ip_token)
        _zielpruefungen.reset(token)


# Jobportale: nie abrufen, auch nicht über Weiterleitungen oder robots.txt (CLAUDE.md 4.4; Review 2026-11-24).
# Gleich wie PORTALE in web/lib/jobportale.ts und browser-erweiterung/chrome/kern.mjs (Tests prüfen das);
# "name.*" steht für beliebige Endungen.
PORTALE = ["linkedin.com", "lnkd.in", "stepstone.*", "indeed.*", "xing.com", "glassdoor.*", "monster.*", "kununu.com",
           "karriere.at", "stellenanzeigen.de", "jobware.de", "meinestadt.de", "absolventa.de", "ausbildung.de",
           "arbeitsagentur.de", "jobs.ch", "jobscout24.ch", "stellenwerk.de", "yourfirm.de", "experteer.*",
           "get-in-it.de", "staufenbiel.de", "jobvector.de", "academics.de", "hokify.*", "heyjobs.*", "jobrapido.*",
           "careerjet.*", "jooble.*", "adzuna.*", "kimeta.de", "jobteaser.com", "ziprecruiter.com", "totaljobs.com"]
_ZWEITE_EBENE = {"co", "com", "org", "net", "gv", "ac", "or", "gov", "edu"}


def ist_portal(host):
    l = (host or "").lower().rstrip(".").split(".")
    for p in PORTALE:
        if not p.endswith(".*"):
            n = p.split(".")
            if len(l) >= 2 and l[-len(n):] == n:
                return True
        elif len(l) >= 2 and len(l[-1]) >= 2:
            name = p[:-2]
            if l[-2] == name or (len(l[-1]) == 2 and len(l) >= 3 and l[-2] in ("co", "com") and l[-3] == name):
                return True
    return False


def registrierbare_domain(host):
    """firma.de, firma.co.uk: Grundlage für Unteradressen der Suche und für die Pause je Firma."""
    t = (host or "").lower().rstrip(".").split(".")
    return ".".join(t[-3:]) if len(t) > 2 and t[-2] in _ZWEITE_EBENE and len(t[-1]) == 2 else ".".join(t[-2:])


class VerbotenDurchRobots(Exception):
    pass


class Jobportal(VerbotenDurchRobots):
    """Ziel ist ein Jobportal: wird wie ein robots.txt-Verbot behandelt und nie abgerufen."""


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


def _verbinde_oeffentlich(ziel, timeout, source_address):
    # Hook einer einzelnen HTTPSConnection: nur hier wird der Name für TCP aufgelöst.
    host, port = ziel
    eintraege = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP)
    ips = [ipaddress.ip_address(e[4][0]) for e in eintraege]
    if not ips or any(not ip.is_global or ip.is_multicast or ip.is_reserved
                      or (ip.version == 6 and (ip.is_site_local or ip.scope_id or ip.sixtofour or ip.teredo))
                      for ip in ips):
        raise ValueError("Keine öffentliche Zieladresse")

    ende = time.monotonic() + timeout
    fehler = None
    for ip in ips:
        rest = ende - time.monotonic()
        if rest <= 0:
            raise TimeoutError("Zeitlimit beim Verbindungsaufbau")
        try:
            sock = socket.socket(socket.AF_INET if ip.version == 4 else socket.AF_INET6, socket.SOCK_STREAM)
        except OSError as exc:
            fehler = exc
            continue
        try:
            sock.settimeout(rest)
            sock.connect((str(ip), port))
            sock.settimeout(timeout)
            return sock
        except OSError as exc:
            sock.close()
            fehler = exc
    raise fehler


def _get_gepinnt(url):
    teile = urlsplit(url)
    if (teile.scheme != "https" or teile.port not in (None, 443)
            or teile.username is not None or teile.password is not None):
        raise ValueError("Nur HTTPS auf Port 443 erlaubt")
    pfad = requests.utils.requote_uri(urlunsplit(("", "", teile.path, teile.query, "")))
    verbindung = HTTPSConnection(teile.hostname, 443, timeout=TIMEOUT, context=ssl.create_default_context())
    # TLS prüft weiterhin den Originalhost und http.client setzt den dazugehörigen Host-Header.
    verbindung._create_connection = _verbinde_oeffentlich
    try:
        verbindung.request("GET", pfad, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "identity"})
        with verbindung.getresponse() as roh:
            if roh.getheader("Content-Encoding", "identity").strip().lower() != "identity":
                raise ValueError("Unerwartete HTTP-Inhaltskodierung")
            if roh.length is not None and roh.length > MAX_ANTWORT_BYTES:
                raise ValueError("HTTP-Antwort zu groß")
            inhalt = roh.read(MAX_ANTWORT_BYTES + 1)
            if len(inhalt) > MAX_ANTWORT_BYTES:
                raise ValueError("HTTP-Antwort zu groß")
            if roh.length:
                raise ValueError("Unvollständige HTTP-Antwort")
            antwort = requests.Response()
            antwort.url, antwort.status_code, antwort.reason = url, roh.status, roh.reason
            antwort.headers.update(roh.getheaders())
            antwort.encoding = requests.utils.get_encoding_from_headers(antwort.headers)
            antwort._content, antwort._content_consumed = inhalt, True
            return antwort
    except TimeoutError as exc:
        raise requests.Timeout("Zeitlimit beim HTTPS-Abruf") from exc
    except (OSError, HTTPException) as exc:
        raise requests.ConnectionError("HTTPS-Abruf fehlgeschlagen") from exc
    finally:
        verbindung.close()


def _get(basis: str, url: str) -> requests.Response:
    # Ein Protokoll-/Port- oder Unteradressen-Wechsel (www./jobs./karriere.) gibt derselben Firma kein zweites Kontingent.
    domain = registrierbare_domain(urlsplit(basis).hostname)
    warte = _zuletzt.get(domain, float("-inf")) + PAUSE - time.monotonic()
    if warte > 0:
        time.sleep(warte)
    try:
        if _ipbindung.get():
            return _get_gepinnt(url)
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
        if ist_portal(urlsplit(url).hostname):  # vor robots.txt, vor jedem Abruf und jeder Weiterleitung
            raise Jobportal(url)
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
    pruefungen = (*_zielpruefungen.get(), *((pruefe,) if pruefe else ()))
    if pruefungen:
        def pruefe(url):
            for schutz in pruefungen:
                schutz(url)
    antwort = _mit_weiterleitungen(url, robots_pruefen=True, pruefe=pruefe)
    antwort.raise_for_status()
    return antwort
