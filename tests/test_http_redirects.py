"""Jeder Redirect-Hop bleibt unter Robots-Regeln und Domainpause; nur Ersatzantworten."""
from urllib.parse import urlsplit

import pytest
import requests

from scraper import http

A = "https://a.example.invalid"
B = "https://b.example.invalid"


def antwort(status=200, text="", location=None):
    r = requests.Response()
    r.status_code, r._content = status, text.encode("utf-8")
    r._content_consumed, r.encoding = True, "utf-8"
    if location is not None:
        r.headers["Location"] = location
    return r


def aufbau(monkeypatch, routen):
    calls, jetzt = [], [0.0]
    http._robots.clear()
    http._zuletzt.clear()
    monkeypatch.setattr(http.time, "monotonic", lambda: jetzt[0])
    monkeypatch.setattr(http.time, "sleep", lambda s: jetzt.__setitem__(0, jetzt[0] + s))

    def get(url, **kw):
        calls.append((url, jetzt[0], kw))
        r = routen[url]
        if isinstance(r, Exception):
            raise r
        r.url = url
        return r

    monkeypatch.setattr(requests, "get", get)
    return calls


@pytest.mark.parametrize("status", [301, 302, 303, 307, 308])
def test_relative_weiterleitung_und_requests_automatik_aus(monkeypatch, status):
    calls = aufbau(monkeypatch, {
        A + "/robots.txt": antwort(), A + "/pfad/start": antwort(status, location="../ziel#abschnitt"),
        A + "/ziel": antwort(text="angekommen"),
    })
    assert http.hole(A + "/pfad/start").text == "angekommen"
    assert [c[0] for c in calls] == [A + "/robots.txt", A + "/pfad/start", A + "/ziel"]
    assert all(c[2].get("allow_redirects") is False for c in calls)
    assert all(b[1] - a[1] >= http.PAUSE for a, b in zip(calls, calls[1:]))


def test_fremdes_redirectziel_wird_vor_abruf_auf_robots_geprueft(monkeypatch):
    calls = aufbau(monkeypatch, {
        A + "/robots.txt": antwort(), A + "/start": antwort(302, location=B + "/privat"),
        B + "/robots.txt": antwort(text="User-agent: *\nDisallow: /privat\n"),
    })
    with pytest.raises(http.VerbotenDurchRobots):
        http.hole(A + "/start")
    assert [c[0] for c in calls] == [A + "/robots.txt", A + "/start", B + "/robots.txt"]


def test_weiterleitung_hin_und_zurueck_respektiert_pause_je_domain(monkeypatch):
    calls = aufbau(monkeypatch, {
        A + "/robots.txt": antwort(), B + "/robots.txt": antwort(),
        A + "/start": antwort(301, location=B + "/mitte"),
        B + "/mitte": antwort(307, location=A + "/ende"), A + "/ende": antwort(text="fertig"),
    })
    assert http.hole(A + "/start").text == "fertig"
    for host in ["a.example.invalid", "b.example.invalid"]:
        times = [t for url, t, _ in calls if urlsplit(url).hostname == host]
        assert all(b - a >= http.PAUSE for a, b in zip(times, times[1:]))
    assert [c[0] for c in calls].count(A + "/robots.txt") == 1


def test_http_zu_https_teilt_domainpause_aber_nicht_robotsregeln(monkeypatch):
    unsicher = "http://a.example.invalid"
    calls = aufbau(monkeypatch, {
        unsicher + "/robots.txt": antwort(), unsicher + "/start": antwort(308, location=A + "/ziel"),
        A + "/robots.txt": antwort(), A + "/ziel": antwort(text="sicher"),
    })
    assert http.hole(unsicher + "/start").text == "sicher"
    assert all(b[1] - a[1] >= http.PAUSE for a, b in zip(calls, calls[1:]))


def test_robots_redirectregeln_gelten_fuer_ursprung_ohne_rekursion(monkeypatch):
    calls = aufbau(monkeypatch, {
        A + "/robots.txt": antwort(302, location=B + "/regeln.txt"),
        B + "/regeln.txt": antwort(text="User-agent: *\nDisallow: /privat\n"),
    })
    with pytest.raises(http.VerbotenDurchRobots):
        http.hole(A + "/privat")
    assert [c[0] for c in calls] == [A + "/robots.txt", B + "/regeln.txt"]
    assert A in http._robots and B not in http._robots


def test_fuenf_robots_redirects_werden_gefolgt(monkeypatch):
    routen = {A + "/robots.txt": antwort(301, location="/regeln-1")}
    routen.update({A + f"/regeln-{i}": antwort(302, location=f"/regeln-{i+1}") for i in range(1, 5)})
    routen[A + "/regeln-5"] = antwort(text="User-agent: *\nDisallow: /privat\n")
    calls = aufbau(monkeypatch, routen)
    with pytest.raises(http.VerbotenDurchRobots):
        http.hole(A + "/privat")
    assert len(calls) == 6


@pytest.mark.parametrize("robots", [False, True])
def test_redirectkette_hat_feste_grenze_und_erlaubt_keinen_unbegrenzten_abruf(monkeypatch, robots):
    pfad = "/robots.txt" if robots else "/start"
    routen = {A + "/robots.txt": antwort()}
    routen[A + pfad] = antwort(301, location="/weiter-1")
    routen.update({A + f"/weiter-{i}": antwort(301, location=f"/weiter-{i+1}") for i in range(1, 50)})
    calls = aufbau(monkeypatch, routen)
    with pytest.raises(http.RobotsNichtErreichbar if robots else requests.TooManyRedirects):
        http.hole(A + "/start")
    assert len(calls) <= 32  # mindestens fünf Redirects; verhindert Endlosschleifen
    if robots:
        assert A + "/start" not in [c[0] for c in calls]
        assert A not in http._robots


@pytest.mark.parametrize("location", ["/start#neu", "https://A.EXAMPLE.INVALID/start"])
def test_normalisierte_redirectschleife_wird_vor_zweitem_seitenabruf_erkannt(monkeypatch, location):
    calls = aufbau(monkeypatch, {A + "/robots.txt": antwort(), A + "/start": antwort(302, location=location)})
    with pytest.raises(requests.TooManyRedirects):
        http.hole(A + "/start")
    assert [c[0] for c in calls] == [A + "/robots.txt", A + "/start"]


@pytest.mark.parametrize("location", [None, "", "ftp://b.example.invalid/datei", "https://nutzer:pass@b.example.invalid/", "https://b.example.invalid/\r\nx", "\\b.example.invalid\\ziel"])
def test_ungueltiges_redirectziel_wird_nicht_abgerufen(monkeypatch, location):
    calls = aufbau(monkeypatch, {A + "/robots.txt": antwort(), A + "/start": antwort(302, location=location)})
    with pytest.raises(ValueError):
        http.hole(A + "/start")
    assert len(calls) == 2


@pytest.mark.parametrize("url", [None, 42, "", "/relativ", "file:///datei", "https://nutzer:pass@a.example.invalid/", "https://a.example.invalid:99999/", "https://a.example.invalid/a\tb", "https://a.example.invalid\\ziel"])
def test_ungueltige_startadresse_wird_vor_jedem_abruf_abgewiesen(monkeypatch, url):
    calls = aufbau(monkeypatch, {})
    with pytest.raises(ValueError):
        http.hole(url)
    assert calls == []


def test_redirectziel_mit_nicht_erreichbaren_robots_wird_nicht_besucht(monkeypatch):
    calls = aufbau(monkeypatch, {
        A + "/robots.txt": antwort(), A + "/start": antwort(302, location=B + "/ziel"),
        B + "/robots.txt": requests.Timeout("synthetisch"),
    })
    with pytest.raises(http.RobotsNichtErreichbar):
        http.hole(A + "/start")
    assert [c[0] for c in calls] == [A + "/robots.txt", A + "/start", B + "/robots.txt"]


def test_http_fehler_am_endziel_bleibt_httpfehler(monkeypatch):
    aufbau(monkeypatch, {
        A + "/robots.txt": antwort(), A + "/start": antwort(302, location="/ziel"),
        A + "/ziel": antwort(403),
    })
    with pytest.raises(requests.HTTPError) as exc:
        http.hole(A + "/start")
    assert exc.value.response.status_code == 403
