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
