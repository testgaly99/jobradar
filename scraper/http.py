"""Einziger HTTP-Zugang: robots.txt beachten, max. 1 Anfrage/s pro Domain."""
import time
import urllib.robotparser
from urllib.parse import urlsplit

import requests

USER_AGENT = "jobradar/1.0 (+https://github.com/testgaly99/jobradar)"
TIMEOUT = 30
PAUSE = 1.0

_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
_zuletzt: dict[str, float] = {}


class VerbotenDurchRobots(Exception):
    pass


def _get(basis: str, url: str) -> requests.Response:
    warte = _zuletzt.get(basis, float("-inf")) + PAUSE - time.monotonic()
    if warte > 0:
        time.sleep(warte)
    try:
        return requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
    finally:
        _zuletzt[basis] = time.monotonic()


def _darf(basis: str, url: str) -> bool:
    if basis not in _robots:
        parser = None
        try:
            antwort = _get(basis, basis + "/robots.txt")
            if antwort.status_code < 400:  # 4xx/5xx: alles erlaubt
                parser = urllib.robotparser.RobotFileParser()
                parser.parse(antwort.text.splitlines())
        except requests.RequestException:
            pass
        _robots[basis] = parser
    parser = _robots[basis]
    return parser is None or parser.can_fetch(USER_AGENT, url)


def hole(url: str) -> requests.Response:
    teile = urlsplit(url)
    basis = f"{teile.scheme}://{teile.netloc}"
    if not _darf(basis, url):
        raise VerbotenDurchRobots(url)
    antwort = _get(basis, url)
    antwort.raise_for_status()
    return antwort
