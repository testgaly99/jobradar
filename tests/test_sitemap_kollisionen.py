"""Gleiche technische ID bei verschiedenen URLs: erste URL gilt, die weitere wird als übersprungen gemeldet."""
from copy import deepcopy
from hashlib import sha256
from html import escape
import json
from types import SimpleNamespace

import pytest

from scraper import db, http, run
from scraper.ats import sitemap
from tests.fakedb import FakeDB

SITEMAP = "https://example.invalid/sitemap.xml"


def vorbereiten(monkeypatch, urls):
    aufrufe = []
    seite = '<script type="application/ld+json">' + json.dumps({
        "@type": "JobPosting", "title": "Engineer", "description": "Künstlicher unveränderter Bestandstext",
        "jobLocation": {"address": {"addressLocality": "Berlin", "addressCountry": "Deutschland"}},
    }) + '</script>'

    def hole(url):
        aufrufe.append(url)
        text = ('<urlset>' + ''.join(f'<url><loc>{escape(u)}</loc></url>' for u in urls) + '</urlset>') if url == SITEMAP else seite
        return SimpleNamespace(content=text.encode("utf-8"), text=text, headers={"content-type": "text/html; charset=utf-8"})

    monkeypatch.setattr(http, "hole", hole)
    return aufrufe


@pytest.mark.parametrize("urls", [
    ["https://example.invalid/job/a+b/1", "https://example.invalid/job/a,b/1"],
    ["https://example.invalid/job/a/1?q=a+b", "https://example.invalid/job/a/1?q=a,b"],
    ["https://a.example.invalid/job/a/1", "https://b.example.invalid/job/a/1"],
])
@pytest.mark.parametrize("bekannt", [False, True])
def test_verschiedene_urls_mit_gleicher_id_erste_gilt_weitere_uebersprungen(monkeypatch, urls, bekannt):
    assert sitemap._ext_id(urls[0]) == sitemap._ext_id(urls[1])
    u0 = "https://example.invalid/job/eindeutig/0"
    aufrufe = vorbereiten(monkeypatch, [u0, *urls])
    id_ = sitemap._ext_id(urls[0])
    stellen = sitemap.hole_stellen(SITEMAP + "#/job/", bekannte=frozenset([id_]) if bekannt else frozenset())
    assert {"uebersprungen": "doppelte ID"} in stellen
    gueltig = [x for x in stellen if "uebersprungen" not in x]
    assert [x["ext_id"] for x in gueltig] == [sitemap._ext_id(u0), id_]
    assert aufrufe == [SITEMAP, u0] + ([] if bekannt else [urls[0]])


@pytest.mark.parametrize("bekannt", [False, True])
def test_identische_url_wird_weiterhin_dedupliziert(monkeypatch, bekannt):
    u = "https://example.invalid/job/eindeutig/1"
    aufrufe = vorbereiten(monkeypatch, [u, u, u])
    id_ = sitemap._ext_id(u)
    stellen = sitemap.hole_stellen(SITEMAP + "#/job/", bekannte=frozenset([id_]) if bekannt else frozenset())
    assert len(stellen) == 1 and stellen[0]["ext_id"] == id_
    assert aufrufe == [SITEMAP] + ([] if bekannt else [u])


def test_fragmentfilter_schliesst_nicht_verwendete_urls_vor_kollisionspruefung_aus(monkeypatch):
    u = "https://example.invalid/job/eindeutig/1"
    aufrufe = vorbereiten(monkeypatch, [
        "https://example.invalid/anders/a+b/1", "https://example.invalid/anders/a,b/1", u,
    ])
    assert [s["url"] for s in sitemap.hole_stellen(SITEMAP + "#/job/")] == [u]
    assert aufrufe == [SITEMAP, u]


@pytest.mark.parametrize("bekannt", [False, True])
def test_lange_urls_behalten_unterschiedliche_hash_ids_und_echte_duplikate(monkeypatch, bekannt):
    urls = ["https://example.invalid/job/" + "lang-" * 50 + f"/{i}" for i in [1, 2]]
    ids = [sitemap._ext_id(u) for u in urls]
    assert ids == [sha256(u.encode()).hexdigest()[:32] for u in urls]
    assert len(set(ids)) == 2
    aufrufe = vorbereiten(monkeypatch, [*urls, urls[0]])
    stellen = sitemap.hole_stellen(SITEMAP + "#/job/", bekannte=frozenset(ids) if bekannt else frozenset())
    assert [s["ext_id"] for s in stellen] == ids
    assert aufrufe == [SITEMAP] + ([] if bekannt else urls)


def test_spaete_kollision_uebernimmt_neue_stelle_und_schliesst_nichts(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)
    monkeypatch.setattr(db, "_spalten", True)
    monkeypatch.setattr(run, "ADAPTER", {"sitemap": sitemap.hole_stellen})
    firma = {"name": "Testfirma", "ats_typ": "sitemap", "ats_id": SITEMAP + "#/job/"}
    urls = [f"https://example.invalid/job/bestand/{i}" for i in [1, 2]]
    vorbereiten(monkeypatch, urls)
    assert run._firma(firma, "2026-11-15")["fehler"] == ""
    assert len(fake.t["jobs"]) == 2
    bestand = deepcopy(fake.t["jobs"])
    urls[:] = ["https://example.invalid/job/neue-stelle/0",
               "https://example.invalid/job/a+b/1", "https://example.invalid/job/a,b/1"]
    bericht = run._firma(firma, "2026-11-16")
    assert bericht["fehler"] == "" and bericht["uebersprungen"] == {"doppelte ID": 1}
    assert bericht["neu"] == 2 and bericht["geschlossen"] == 0
    assert {k: fake.t["jobs"][k] for k in bestand} == bestand  # Bestand bleibt offen und unverändert
