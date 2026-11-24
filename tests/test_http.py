import pytest
import requests

from scraper import http

UA = "jobradar/1.0 (+https://github.com/testgaly99/jobradar)"


class Antwort:
    def __init__(self, status=200, text=""):
        self.status_code, self.text = status, text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


@pytest.fixture(autouse=True)
def sauber(monkeypatch):
    http._robots.clear()
    http._zuletzt.clear()
    monkeypatch.setattr(http.time, "sleep", lambda s: None)
    yield


def fake_get(robots_text="", aufrufe=None):
    def get(url, **kw):
        if aufrufe is not None:
            aufrufe.append((url, kw))
        if url.endswith("/robots.txt"):
            return Antwort(200, robots_text)
        return Antwort(200, "ok")
    return get


def test_robots_verbot_wirft(monkeypatch):
    monkeypatch.setattr(requests, "get", fake_get("User-agent: *\nDisallow: /privat\n"))
    with pytest.raises(http.VerbotenDurchRobots):
        http.hole("https://example.com/privat/x")
    assert http.hole("https://example.com/offen").text == "ok"


def test_wartet_pro_domain(monkeypatch):
    schlaf = []
    monkeypatch.setattr(requests, "get", fake_get())
    monkeypatch.setattr(http.time, "monotonic", lambda: 100.0)
    monkeypatch.setattr(http.time, "sleep", schlaf.append)
    http.hole("https://example.com/a")
    http.hole("https://example.com/b")
    assert schlaf and max(schlaf) >= 1


def test_user_agent_gesetzt(monkeypatch):
    aufrufe = []
    monkeypatch.setattr(requests, "get", fake_get(aufrufe=aufrufe))
    http.hole("https://example.com/a")
    assert aufrufe and all(kw["headers"]["User-Agent"] == UA for _, kw in aufrufe)
    assert all(kw["timeout"] == 30 for _, kw in aufrufe)


def test_robots_404_alles_erlaubt(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda url, **kw: Antwort(404) if url.endswith("/robots.txt") else Antwort(200, "ok"))
    assert http.hole("https://example.com/x").text == "ok"


def test_robots_503_wirft(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda url, **kw: Antwort(503))
    with pytest.raises(http.RobotsNichtErreichbar):
        http.hole("https://example.com/x")


def test_robots_netzfehler_wirft(monkeypatch):
    def get(url, **kw):
        raise requests.ConnectionError("weg")
    monkeypatch.setattr(requests, "get", get)
    with pytest.raises(http.RobotsNichtErreichbar):
        http.hole("https://example.com/x")


def test_pause_gilt_je_firma_ueber_unteradressen(monkeypatch):
    # Review 2026-11-24 Befund 6: www./jobs./karriere. derselben Firma teilen sich die Sekunde
    assert http.registrierbare_domain("jobs.firma.de") == http.registrierbare_domain("www.firma.de") == "firma.de"
    assert http.registrierbare_domain("careers.firma.co.uk") == "firma.co.uk"
    assert http.registrierbare_domain("jobs.firma.org.uk") == "firma.org.uk"
    schlaf = []
    monkeypatch.setattr(http.time, "sleep", schlaf.append)
    monkeypatch.setattr(http.requests, "get", lambda *a, **k: None)
    http._zuletzt.clear()
    http._get("https://www.firma.de", "https://www.firma.de/")
    http._get("https://jobs.firma.de", "https://jobs.firma.de/")
    assert schlaf and schlaf[0] > 0
