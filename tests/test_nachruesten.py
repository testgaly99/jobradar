"""Nachtlauf rüstet Bewerbungen aus Firmenseiten nach; nur Ersatz für Netz, DNS, Groq und Datenbank."""
import json
import re
from pathlib import Path

import pytest
import requests

from scraper import db, http, ki, nachruesten
from tests.fakedb import FakeDB

JP = {"@type": "JobPosting", "title": "Controller", "hiringOrganization": {"name": "Seiten GmbH"},
      "description": "<h3>Aufgaben</h3><ul><li>Monatsabschluss</li></ul><h3>Profil</h3><ul><li>3 Jahre Erfahrung</li><li>Deutsch C1</li></ul>"}
SEITE = f'<script type="application/ld+json">{json.dumps(JP)}</script>'
KI = {"aufgaben": ["Abschluss"], "rahmen": [], "abschluss": "", "erfahrung": "", "muss": [], "benefits": [],
      "studium": "ja", "taetigkeit": "controlling", "sprache": "de"}


class Seite:
    def __init__(self, text):
        self.text, self.headers = text, {"content-type": "text/html; charset=utf-8"}


@pytest.fixture
def fake(monkeypatch):
    f = FakeDB()
    monkeypatch.setattr(db, "_req", f)
    return f


def app(f, link, i="a1"):
    f.t["applications"].append({"id": i, "link": link, "nachruesten": True, "firma": "X", "titel": "Y"})
    return f.t["applications"][-1]


def lauf(f, seite=SEITE, frage=lambda text, modell: KI, ips=("93.184.216.34",), browser=None, frage_ft=None):
    geholt = []

    def hole(url, pruefe=None):
        pruefe(url)
        geholt.append(url)
        return Seite(seite)
    erg = nachruesten.lauf(frage=frage, hole=hole, aufloesen=lambda host: list(ips), browser=browser, frage_ft=frage_ft)
    return erg, geholt


def leere_app(f, link="https://jobs.konzern.example/job/7"):
    f.t["applications"].append({"id": "b1", "link": link, "nachruesten": True, "firma": None, "titel": None,
                                "standort": None, "snapshot_text": None})
    return f.t["applications"][-1]


def test_ohne_jobposting_liest_der_browser_und_fuellt_leere_felder(fake):
    a = leere_app(fake)
    gesehen = []

    def browser(url, pruefe):
        gesehen.append(url)
        return {"jobposting": {**JP, "jobLocation": {"address": {"addressLocality": "Wolfsburg"}}}, "titel": "egal", "text": "x"}
    erg, _ = lauf(fake, seite="<html>Gerüst</html>", browser=browser)
    assert gesehen == ["https://jobs.konzern.example/job/7"]
    assert (a["firma"], a["titel"], a["standort"]) == ("Seiten GmbH", "Controller", "Wolfsburg")
    assert "Monatsabschluss" in a["snapshot_text"] and a["nachruesten"] is False and erg["nachgeruestet"] == 1


def test_browser_ohne_jobposting_nimmt_text_und_titel_und_fragt_groq_nach_der_firma(fake):
    a = leere_app(fake)
    text = "Praktikum Konzernbeschaffung. " * 20
    erg, _ = lauf(fake, seite="<html></html>", browser=lambda url, pruefe: {"jobposting": None, "titel": "Praktikum Konzernbeschaffung (w/m/d)", "text": text},
                  frage_ft=lambda t: ("Volkswagen AG", "anderer Titel"))
    assert (a["firma"], a["titel"]) == ("Volkswagen AG", "Praktikum Konzernbeschaffung (w/m/d)")
    assert a["snapshot_text"] == text and "snapshot_abschnitte" not in a and a["snapshot_steckbrief"] is not None


def test_eingetragenes_bleibt_und_zu_wenig_text_wird_uebersprungen(fake):
    a = app(fake, "https://jobs.konzern.example/job/8")  # Nutzer hat Firma X und Titel Y eingetragen
    lauf(fake, seite="<html></html>", browser=lambda url, pruefe: {"jobposting": JP, "titel": "", "text": ""})
    assert (a["firma"], a["titel"]) == ("X", "Y")
    b = leere_app(fake)
    erg, _ = lauf(fake, seite="<html></html>", browser=lambda url, pruefe: {"jobposting": None, "titel": "Cookies", "text": "Wir nutzen Cookies."})
    assert b["nachruesten"] is False and b["firma"] is None and erg["uebersprungen"] == 1


def test_robots_verbot_ruft_keinen_browser(fake):
    leere_app(fake)

    def hole(url, pruefe=None):
        raise http.VerbotenDurchRobots("robots")
    benutzt = []
    erg = nachruesten.lauf(frage=None, frage_ft=None, hole=hole, aufloesen=lambda h: ["93.184.216.34"],
                           browser=lambda url, pruefe: benutzt.append(url))
    assert benutzt == [] and erg["uebersprungen"] == 1


def test_gueltige_seite_bekommt_alle_drei_snapshots(fake):
    a = app(fake, "https://karriere.seiten.example/job/1")
    erg, geholt = lauf(fake)
    assert geholt == ["https://karriere.seiten.example/job/1"]
    assert a["nachruesten"] is False
    assert [x["titel"] for x in a["snapshot_abschnitte"]] == ["Aufgaben", "Profil"]
    assert a["snapshot_steckbrief"]["erfahrung_jahre"] == 3
    assert a["snapshot_ki"] == {k: v for k, v in KI.items() if k not in ("studium", "taetigkeit")}
    assert erg == {"nachgeruestet": 1, "uebersprungen": 0}


@pytest.mark.parametrize("link", ["https://www.linkedin.com/jobs/view/1/", "https://de.indeed.com/viewjob?jk=1",
                                  "https://lnkd.in/abcdef",
                                  "http://firma.example/job", "https://firma.example:8443/job", "https://u:p@firma.example/job"])
def test_portale_und_unzulaessige_links_werden_nie_abgerufen(fake, link):
    a = app(fake, link)
    erg, geholt = lauf(fake)
    assert geholt == []
    assert a["nachruesten"] is False and "snapshot_ki" not in a
    assert erg["uebersprungen"] == 1


def test_interne_adresse_wird_nie_abgerufen(fake):
    a = app(fake, "https://intern.example/job")
    _, geholt = lauf(fake, ips=("127.0.0.1",))
    assert geholt == [] and a["nachruesten"] is False


def test_groq_weg_laesst_markierung_stehen_und_beendet_den_lauf(fake):
    a, b = app(fake, "https://a.example/1", "a1"), app(fake, "https://b.example/2", "a2")

    def frage(text, modell):
        raise ki.GroqWeg("weg", 503)
    erg, geholt = lauf(fake, frage=frage)
    assert geholt == ["https://a.example/1"]
    assert a["nachruesten"] is True and b["nachruesten"] is True and "snapshot_abschnitte" not in a


def test_ohne_jobposting_uebersprungen(fake):
    a = app(fake, "https://firma.example/job")
    erg, _ = lauf(fake, seite="<html>nichts</html>")
    assert a["nachruesten"] is False and erg == {"nachgeruestet": 0, "uebersprungen": 1}


def test_ohne_groq_schluessel_gliederung_und_steckbrief_trotzdem(fake):
    a = app(fake, "https://firma.example/job")
    erg, _ = lauf(fake, frage=None)
    assert a["nachruesten"] is False and a["snapshot_abschnitte"] and a["snapshot_steckbrief"]
    assert a.get("snapshot_ki") is None and erg["nachgeruestet"] == 1


def test_ohne_migration_012_nichts_tun(fake, capsys):
    fake.ohne_nachruesten = True
    assert nachruesten.lauf(frage=None, hole=None, aufloesen=None) == {"nachgeruestet": 0, "uebersprungen": 0}
    assert "Migration 012" in capsys.readouterr().out


def test_portalliste_gleich_wie_website():
    ts = (Path(__file__).parent.parent / "web/lib/jobportale.ts").read_text(encoding="utf-8")
    liste = re.search(r"export const PORTALE(?:: string\[\])? = \[(.*?)\];", ts, re.S).group(1)
    assert sorted(re.findall(r'"([^"]+)"', liste)) == sorted(nachruesten.PORTALE)
    for host in ["www.indeed.co.uk", "x.xing.com", "linkedin.de", "jobs.stepstone.de", "karriere.firma.de"]:
        assert nachruesten.ist_portal(host) == (host != "karriere.firma.de" and host != "linkedin.de"), host


def test_http_hole_prueft_jeden_hop_auch_robots(monkeypatch):
    http._robots.clear()
    http._zuletzt.clear()
    monkeypatch.setattr(http.time, "sleep", lambda s: None)
    routen = {"https://a.example.invalid/robots.txt": (404, None), "https://a.example.invalid/job": (301, "https://intern.invalid/x")}
    geholt = []

    def get(url, **kw):
        geholt.append(url)
        status, ort = routen[url]
        r = requests.Response()
        r.status_code, r._content, r._content_consumed, r.url = status, b"", True, url
        if ort:
            r.headers["Location"] = ort
        return r
    monkeypatch.setattr(requests, "get", get)

    def pruefe(url):
        if "intern" in url:
            raise ValueError("intern")
    with pytest.raises(ValueError, match="intern"):
        http.hole("https://a.example.invalid/job", pruefe=pruefe)
    assert geholt == ["https://a.example.invalid/robots.txt", "https://a.example.invalid/job"]


def test_titel_og_vor_h1_und_kein_cookie_banner():
    from scraper.browser_seite import _jobposting, waehle_titel
    assert waehle_titel("Manufacture Digitalization Intern #2", "We value your privacy") == "Manufacture Digitalization Intern #2"
    assert waehle_titel("", "We value your privacy") == ""
    assert waehle_titel(None, "  Praktikum   Konzernbeschaffung (w/m/d) ") == "Praktikum Konzernbeschaffung (w/m/d)"
    assert waehle_titel("Cookie-Einstellungen", "Controller (m/w/d)") == "Controller (m/w/d)"
    assert _jobposting(["kaputt", json.dumps({"@graph": [{"@type": "Organization"}, JP]})])["title"] == "Controller"
    assert _jobposting([json.dumps([{"@type": ["JobPosting"], "title": "T"}])])["title"] == "T"
    assert _jobposting([]) is None
