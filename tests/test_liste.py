import json

import pytest
import requests

from scraper import http
from scraper.ats import ADAPTER, liste, sitemap

START = "https://jobs.beispiel.com/de_DE/externaljobs/SearchJobs/"
ATS_ID = START + "#/JobDetail/"


def _http_fehler(code):
    antwort = requests.Response()
    antwort.status_code = code
    return requests.HTTPError(f"{code} Error", response=antwort)


class Antwort:
    def __init__(self, text):
        self.text, self.content, self.headers = text, text.encode("utf-8"), {"content-type": "text/html; charset=utf-8"}


def _fake(monkeypatch, seiten):
    abgerufen = []

    def hole(url):
        abgerufen.append(url)
        wert = seiten.get(url, _http_fehler(404))
        if isinstance(wert, Exception):
            raise wert
        return Antwort(wert)
    monkeypatch.setattr(http, "hole", hole)
    return abgerufen


def _liste(ids, weiter=None):
    links = "".join(f'<a href="/de_DE/externaljobs/JobDetail/Stelle-{i}/{i}">Stelle {i}</a>' for i in ids)
    links += '<a href="/de_DE/externaljobs/JobDetailApplied">Beworben</a><a href="https://anders.example/JobDetail/9/9">fremd</a>'
    if weiter is not None:
        links += f'<a href="{START}?folderRecordsPerPage=6&amp;folderOffset={weiter}">Weiter</a>'
    return f"<html><body>{links}</body></html>"


def _detail(i):
    return f"https://jobs.beispiel.com/de_DE/externaljobs/JobDetail/Stelle-{i}/{i}"


def _avature(titel="Data Analyst (w/m/d)", ort="München, Bayern, Deutschland"):
    beschreibung = "<p><b>Ihre Aufgaben</b></p><ul>" + "".join(f"<li>SQL-Abfragen und Berichte Nummer {n} erstellen</li>" for n in range(12)) + "</ul>"
    return (f'<html><head><meta property="og:title" content="{titel}"></head><body><article class="article article--details">'
            '<div class="article__content__view__field "><div class="article__content__view__field__label ">Job ID</div>'
            '<div class="article__content__view__field__value ">530646</div></div>'
            '<div class="article__content__view__field "><div class="article__content__view__field__label ">Standort(e)</div>'
            f'<div class="article__content__view__field__value ">{ort}</div></div>'
            f'<div class="article__content__view__field "><div class="article__content__view__field__value ">{beschreibung}</div></div>'
            "</article></body></html>")


def _jsonld():
    return ('<html><script type="application/ld+json">'
            + json.dumps({"@type": "JobPosting", "title": "Controller", "description": "<p>Zahlen</p>",
                          "jobLocation": {"address": {"addressLocality": "Berlin", "addressCountry": "DE"}}}) + "</script></html>")


def test_blaettern_avature_und_jsonld(monkeypatch):
    seite2 = START + "?folderRecordsPerPage=6&folderOffset=6"
    abgerufen = _fake(monkeypatch, {START: _liste([1, 2], weiter=6), seite2: _liste([3], weiter=6),
                                    _detail(1): _avature(), _detail(2): _jsonld(), _detail(3): _avature(titel="Ingenieur (w/m/d)")})
    stellen = liste.hole_stellen(ATS_ID)
    assert [s["titel"] for s in stellen] == ["Data Analyst (w/m/d)", "Controller", "Ingenieur (w/m/d)"]
    assert stellen[0]["ort"] == "München, Bayern, Deutschland" and "SQL-Abfragen" in stellen[0]["text"]
    assert stellen[0]["ext_id"] == "JobDetail-1" and stellen[1]["ort"] == "Berlin, DE"
    assert abgerufen.count(seite2) == 1  # jede Listenseite einmal, fremde Hosts und Nicht-Stellen nie
    assert not any("anders.example" in u or "Applied" in u for u in abgerufen)
    assert ADAPTER["liste"] is liste.hole_stellen


def test_unvollstaendige_liste_schliesst_nichts(monkeypatch):
    seiten = {START: _liste([1], weiter=6)}
    for k in range(6, 60, 6):
        seiten[f"{START}?folderRecordsPerPage=6&folderOffset={k}"] = _liste([k], weiter=k + 6)
    _fake(monkeypatch, seiten | {_detail(1): _avature()})
    monkeypatch.setattr(liste, "MAX_SEITEN", 3)
    stellen = liste.hole_stellen(ATS_ID, bekannte=frozenset({"JobDetail-6", "JobDetail-12"}))
    assert stellen[-1] == {"uebersprungen": "unvollstaendig"}  # Lauf schließt dann nichts
    assert {"ext_id": "JobDetail-6", "unveraendert": True} in stellen


def test_tagesgrenze_und_429(monkeypatch):
    abgerufen = _fake(monkeypatch, {START: _liste([1, 2, 3]), _detail(1): _http_fehler(429), _detail(2): _avature(), _detail(3): _avature()})
    assert liste.hole_stellen(ATS_ID) == [{"uebersprungen": "vertagt"}]
    assert _detail(2) not in abgerufen
    abgerufen = _fake(monkeypatch, {START: _liste([1, 2, 3]), **{_detail(i): _avature() for i in (1, 2, 3)}})
    monkeypatch.setattr(sitemap, "MAX_NEU", 1)
    stellen = liste.hole_stellen(ATS_ID, bekannte=frozenset({"JobDetail-3"}))
    assert [s.get("ext_id") for s in stellen] == ["JobDetail-1", "JobDetail-3", None]


def test_erste_listenseite_nicht_erreichbar_kippt_firma(monkeypatch):
    _fake(monkeypatch, {START: _http_fehler(503)})
    with pytest.raises(requests.HTTPError):
        liste.hole_stellen(ATS_ID)
