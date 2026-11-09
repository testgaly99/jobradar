import json
import re
from datetime import date, timedelta
from pathlib import Path

import pytest
import requests

from scraper import http
from scraper.ats import ADAPTER, sitemap

FIX = Path(__file__).parent / "fixtures"
ATS_ID = "https://www.dm-jobs.de/sitemap/jobs.xml#/job/"
SITEMAP = "https://www.dm-jobs.de/sitemap/jobs.xml"
DM = "https://www.dm-jobs.de/job/senior-it-inhouse-consultant-w-m-d/273760/"
FILIALE = "https://www.dm-jobs.de/job/mitarbeiter-filiale-w-m-d-in-76131-karlsruhe/273761/"
LEITUNGSRECHT = "https://www.dm-jobs.de/job/consultant-leitungsrecht-w-m-d/273762/"  # liefert die Porsche-Fixture
SCHLUESSEL = {"ext_id", "titel", "ort", "remote", "url", "beschreibung_kurz", "text",
              "abteilung", "arbeitsmodell", "vertragsart", "abschnitte"}


def _lies(name):
    return (FIX / name).read_text(encoding="utf-8")


class Antwort:
    """Wie requests: ohne charset im Content-Type dekodiert .text als ISO-8859-1."""

    def __init__(self, inhalt, typ="text/html; charset=utf-8"):
        self.content = inhalt.encode("utf-8")
        self.headers = {"content-type": typ}
        self.text = self.content.decode("utf-8" if "charset" in typ else "latin-1")


def _http_fehler(code):
    antwort = requests.Response()
    antwort.status_code = code
    return requests.HTTPError(f"{code} Error", response=antwort)


def _fake(monkeypatch, seiten):
    """seiten: URL -> Text, Antwort oder Ausnahme. Unbekannte URL: hole wirft wie bei HTTP 404."""
    abgerufen = []

    def hole(url):
        abgerufen.append(url)
        wert = seiten.get(url, _http_fehler(404))
        if isinstance(wert, Exception):
            raise wert
        return wert if isinstance(wert, Antwort) else Antwort(wert)

    monkeypatch.setattr(http, "hole", hole)
    return abgerufen


def _standard(monkeypatch, **ersetzt):
    seiten = {SITEMAP: _lies("sitemap_jobs.xml"), DM: _lies("sitemap_dm.html"),
              LEITUNGSRECHT: _lies("sitemap_porsche.html")}
    return _fake(monkeypatch, {**seiten, **ersetzt})


def _sitemap(*urls):
    return ('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + "".join(f"<url><loc>{u}</loc></url>" for u in urls) + "</urlset>")


def _job(i):
    return f"https://www.dm-jobs.de/job/data-engineer-{i}/{i}/"


def _seite(**jp):
    return ('<html><script type="application/ld+json">'
            + json.dumps({"@type": "JobPosting", "title": "Data Engineer", **jp}) + "</script></html>")


def test_sitemap_filter_und_duplikat(monkeypatch):
    abgerufen = _standard(monkeypatch)
    stellen = sitemap.hole_stellen(ATS_ID)
    # Duplikat, Nicht-Job-URL, Filiale und image:loc nie abgerufen
    assert abgerufen == [SITEMAP, DM, LEITUNGSRECHT]
    assert [s["url"] for s in stellen] == [DM, LEITUNGSRECHT]
    for s in stellen:
        assert set(s) == SCHLUESSEL
        assert s["beschreibung_kurz"] == s["text"][:300]
    assert ADAPTER["sitemap"] is sitemap.hole_stellen


def test_vorfilter_spart_abruf(monkeypatch):
    abgerufen = _standard(monkeypatch)
    sitemap.hole_stellen(ATS_ID)
    assert FILIALE not in abgerufen


def test_vorfilter_umlaute(monkeypatch):
    verkaeufer = "https://www.dm-jobs.de/job/verkaeufer-in-teilzeit/12345/"
    schueler = "https://www.dm-jobs.de/job/schuelerpraktikum-dm-markt-w-m-d-in-76131-karlsruhe/355/"
    controller = "https://www.dm-jobs.de/job/controller-in/678/"
    xml = _sitemap(verkaeufer, schueler, controller)
    abgerufen = _fake(monkeypatch, {SITEMAP: xml, controller: _lies("sitemap_porsche.html")})
    assert len(sitemap.hole_stellen(ATS_ID)) == 1
    assert abgerufen == [SITEMAP, controller]


def test_bekannte_werden_nicht_geladen(monkeypatch):
    abgerufen = _standard(monkeypatch)
    erste = "job-senior-it-inhouse-consultant-w-m-d-273760"
    stellen = sitemap.hole_stellen(ATS_ID, bekannte=frozenset({erste}))
    assert DM not in abgerufen
    assert stellen[0] == {"ext_id": erste, "unveraendert": True}
    assert stellen[1]["url"] == LEITUNGSRECHT and set(stellen[1]) == SCHLUESSEL


def test_jsonld_felder(monkeypatch):
    _standard(monkeypatch)
    s = sitemap.hole_stellen(ATS_ID)[1]  # Porsche-Seite: Text vor dem JSON, Beschreibung HTML-escaped
    assert s["titel"] == "Consultant Leitungsrecht & Grunderwerb (f/m/d) - IE2S GmbH"
    assert s["ort"] == "Ludwigsburg, Frankfurt am Main, DE"
    assert (s["remote"], s["vertragsart"], s["abteilung"], s["arbeitsmodell"]) == (False, "Vollzeit", "", "")
    assert "<" not in s["text"] and "&lt;" not in s["text"] and "Beratung von Kunden" in s["text"]
    assert [a["titel"] for a in s["abschnitte"]] == ["Aufgaben", "Anforderungen"]


def test_nuxt_payload(monkeypatch):
    # Controlware (job-shop/Nuxt): das JobPosting steckt in der @graph-Liste des Nuxt-Schema-Skripts
    _standard(monkeypatch, **{DM: _lies("sitemap_controlware.html")})
    s = sitemap.hole_stellen(ATS_ID)[0]
    assert (s["titel"], s["ort"], s["vertragsart"]) == ("DevOps Engineer (m/w/d)", "Deutschland", "")
    assert "Übernahme der Architektur" in s["text"]
    assert "Linux-Administration" in s["text"]  # Profil steht in "responsibilities"


def test_dm_volltext(monkeypatch):
    # dm: JSON-LD hat nur einen Anrisstext, Aufgaben/Profil stehen im Seiten-HTML
    _standard(monkeypatch)
    s = sitemap.hole_stellen(ATS_ID)[0]
    assert s["titel"].startswith("Senior IT Inhouse Consultant Analytics & Reporting")
    assert (s["remote"], s["arbeitsmodell"], s["ort"], s["vertragsart"]) == (True, "Remote", "DE", "Vollzeit")
    assert "Als Inhouse Consultant" in s["text"] and "BI-Tool" in s["text"] and "<" not in s["text"]
    assert {"Deine Aufgaben", "Das bringst Du mit"} <= {a["titel"] for a in s["abschnitte"]}


@pytest.mark.parametrize("jp,ort", [
    ({"jobLocation": "Berlin"}, "Berlin"),
    ({"jobLocation": {"address": "Hauptstraße 1, 10115 Berlin"}}, "Hauptstraße 1, 10115 Berlin"),
    ({"jobLocation": {"address": {"addressLocality": "Berlin", "addressCountry": {"name": "DE"}}},
      "applicantLocationRequirements": {"@type": "Country", "name": "Germany"}}, "Berlin, DE"),
    ({"applicantLocationRequirements": {"@type": "Country", "name": "DE"}}, "DE"),
])
def test_ort_varianten(monkeypatch, jp, ort):
    # schema.org erlaubt Text statt Place/PostalAddress; applicantLocationRequirements nur ohne jobLocation
    _fake(monkeypatch, {SITEMAP: _sitemap(_job(1)), _job(1): _seite(**jp)})
    assert sitemap.hole_stellen(ATS_ID)[0]["ort"] == ort


def test_textfelder_getrennt(monkeypatch):
    _fake(monkeypatch, {SITEMAP: _sitemap(_job(1)), _job(1): _seite(description="Ende.", responsibilities="Anfang")})
    assert sitemap.hole_stellen(ATS_ID)[0]["text"] == "Ende. Anfang"


def test_ohne_charset_wird_utf8_gelesen(monkeypatch):
    _standard(monkeypatch, **{LEITUNGSRECHT: Antwort(_lies("sitemap_porsche.html"), "text/html")})
    assert "Europas größten Infrastrukturprojekten" in sitemap.hole_stellen(ATS_ID)[1]["text"]


def test_ohne_jsonld_und_404_uebersprungen(monkeypatch):
    seiten = {SITEMAP: _lies("sitemap_jobs.xml"), DM: _lies("sitemap_ohne_jsonld.html")}
    abgerufen = _fake(monkeypatch, seiten)  # LEITUNGSRECHT fehlt -> HTTP 404
    assert sitemap.hole_stellen(ATS_ID) == []
    assert LEITUNGSRECHT in abgerufen


def test_kaputtes_json_uebersprungen(monkeypatch):
    kaputt = _lies("sitemap_porsche.html").replace('"title":', '"title"', 1)
    _standard(monkeypatch, **{LEITUNGSRECHT: kaputt})
    assert [s["url"] for s in sitemap.hole_stellen(ATS_ID)] == [DM]


def test_sitemap_fehler_kippt_firma(monkeypatch):
    _fake(monkeypatch, {})
    with pytest.raises(requests.HTTPError):
        sitemap.hole_stellen(ATS_ID)


def test_abgelaufen(monkeypatch):
    gestern = (date.today() - timedelta(days=1)).isoformat()
    heute = date.today().isoformat()
    _standard(monkeypatch, **{LEITUNGSRECHT: _lies("sitemap_porsche.html").replace("2099-12-31", gestern)})
    assert [s["url"] for s in sitemap.hole_stellen(ATS_ID)] == [DM]
    _standard(monkeypatch, **{LEITUNGSRECHT: _lies("sitemap_porsche.html").replace("2099-12-31", heute + "T23:59")})
    assert [s["url"] for s in sitemap.hole_stellen(ATS_ID)] == [DM, LEITUNGSRECHT]


def test_sitemapindex(monkeypatch):
    index = ('<?xml version="1.0"?><sitemapindex xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">'
             "<sitemap><loc>https://www.dm-jobs.de/sitemap/teil1.xml</loc></sitemap></sitemapindex>")
    abgerufen = _fake(monkeypatch, {SITEMAP: index, "https://www.dm-jobs.de/sitemap/teil1.xml": _lies("sitemap_jobs.xml"),
                                    DM: _lies("sitemap_dm.html"), LEITUNGSRECHT: _lies("sitemap_porsche.html")})
    assert len(sitemap.hole_stellen(ATS_ID)) == 2
    assert abgerufen[:2] == [SITEMAP, "https://www.dm-jobs.de/sitemap/teil1.xml"]


def test_ext_id_form(monkeypatch):
    _standard(monkeypatch)
    ids = [s["ext_id"] for s in sitemap.hole_stellen(ATS_ID)]
    ids += [sitemap._ext_id(u) for u in (
        "https://jobportal.bundesbank.de/index.php?ac=jobad&id=212",
        "https://jobs.neura-robotics.com/offer/rt-kernel-engineer-human/0a1b%20c",
        "https://x.de/job/" + "sehr-lang-" * 30 + "/1/",
        "https://x.de/",
    )]
    assert ids[:3] == ["job-senior-it-inhouse-consultant-w-m-d-273760", "job-consultant-leitungsrecht-w-m-d-273762",
                       "index.php-ac-jobad-id-212"]
    for i in ids:
        assert re.fullmatch(r"[A-Za-z0-9._~-]{1,200}", i), i
    assert len(ids[-2]) == 32 and len(ids[-1]) == 32  # zu lang bzw. leer -> sha256


def test_abbruch_nach_5_ausfaellen_in_folge(monkeypatch):
    urls = [_job(i) for i in range(6)]
    ausfaelle = [requests.Timeout("t"), requests.ConnectionError("c"), _http_fehler(503), _http_fehler(429),
                 requests.Timeout("t")]
    abgerufen = _fake(monkeypatch, {SITEMAP: _sitemap(*urls), **dict(zip(urls, ausfaelle)),
                                    urls[5]: _lies("sitemap_porsche.html")})
    with pytest.raises(RuntimeError, match="www.dm-jobs.de"):
        sitemap.hole_stellen(ATS_ID)
    assert abgerufen == [SITEMAP] + urls[:5]  # die 6. Seite wird nicht mehr versucht


def test_404_und_robots_kein_abbruch(monkeypatch):
    # 404/410 und robots.txt-Sperren sind Einzelfehler einer Anzeige, kein Ausfall des Hosts
    urls = [_job(i) for i in range(8)]
    fehler = {u: _http_fehler(404) for u in urls[:5]} | {urls[5]: _http_fehler(410),
                                                        urls[6]: http.VerbotenDurchRobots(urls[6])}
    abgerufen = _fake(monkeypatch, {SITEMAP: _sitemap(*urls), **fehler, urls[7]: _lies("sitemap_porsche.html")})
    assert [s["url"] for s in sitemap.hole_stellen(ATS_ID)] == [urls[7]]
    assert abgerufen == [SITEMAP] + urls


def test_geladene_seite_setzt_serie_zurueck(monkeypatch):
    # 4 Ausfälle, Treffer, 4 Ausfälle, geladene Seite ohne JobPosting, 4 Ausfälle, Treffer: kein Abbruch
    urls = [_job(i) for i in range(15)]
    seiten = {u: requests.Timeout("t") for u in urls} | {
        urls[4]: _lies("sitemap_porsche.html"), urls[9]: _lies("sitemap_ohne_jsonld.html"), urls[14]: _lies("sitemap_dm.html")}
    _fake(monkeypatch, {SITEMAP: _sitemap(*urls), **seiten})
    assert [s["url"] for s in sitemap.hole_stellen(ATS_ID)] == [urls[4], urls[14]]
