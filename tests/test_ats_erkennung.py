"""Portal aus einem Karriere-Link erkennen (Phase 4b, Plan docs/plans/2026-11-15-firmenportal-erkennung.md).

Alle Links sind erfunden. Der Erkenner ruft nichts ab und speichert nichts.
"""
import pytest

from scraper.ats_erkennung import erkenne_portal


def kandidat(url):
    e = erkenne_portal(url)
    assert e.status == "erkannt", (url, e.grund)
    assert e.kandidat.herkunft == "direktes URL-Muster"
    return e.kandidat.ats_typ, e.kandidat.ats_id


@pytest.mark.parametrize("url", [
    "https://boards.greenhouse.io/demo-fiktiv",
    "https://boards.greenhouse.io/demo-fiktiv/",
    "https://job-boards.greenhouse.io/demo-fiktiv/jobs/4711",
    "https://boards.greenhouse.io/demo-fiktiv/jobs/4711?gh_src=abc#bewerben",
])
def test_greenhouse_board_und_stelle_gleicher_kandidat(url):
    assert kandidat(url) == ("greenhouse", "demo-fiktiv")


@pytest.mark.parametrize("url", [
    "https://jobs.ashbyhq.com/demo-fiktiv",
    "https://jobs.ashbyhq.com/demo-fiktiv/0a1b2c3d-1111-2222-3333-444455556666",
    "https://jobs.ashbyhq.com/demo-fiktiv/9f8e7d6c-aaaa-bbbb-cccc-ddddeeeeffff/application",
    "https://JOBS.AshbyHQ.com/demo-fiktiv?utm_source=x",
])
def test_ashby_board_und_stellen(url):
    assert kandidat(url) == ("ashby", "demo-fiktiv")


@pytest.mark.parametrize("url", [
    "https://demo-fiktiv.jobs.personio.de/",
    "https://demo-fiktiv.jobs.personio.de",
    "https://demo-fiktiv.jobs.personio.de/job/123?language=de",
    "https://DEMO-fiktiv.Jobs.Personio.DE/job/123",
])
def test_personio_kennung_aus_host(url):
    assert kandidat(url) == ("personio", "demo-fiktiv")


def test_gross_kleinschreibung_der_boardkennung_bleibt():
    assert kandidat("https://BOARDS.greenhouse.io/DemoFiktiv_2") == ("greenhouse", "DemoFiktiv_2")


@pytest.mark.parametrize("url", [
    "https://jobs.ashbyhq.com/",
    "https://boards.greenhouse.io",
    "https://boards.greenhouse.io/embed/job_board?for=demo",
    "https://demo-fiktiv.jobs.personio.de/stellen/123",
    "https://jobs.personio.de/",
    "https://a.b.jobs.personio.de/",
    "https://demo.jobs.personio.com/",
])
def test_bekannter_host_ohne_passendes_muster(url):
    e = erkenne_portal(url)
    assert (e.status, e.kandidat) == ("nicht_erkannt", None)
    assert e.grund


@pytest.mark.parametrize("url", [
    "https://jobs.ashbyhq.com.evil.example/demo",
    "https://evil.example/?portal=jobs.ashbyhq.com/demo",
    "https://karriere.beispiel-firma.example/jobs?a=https://jobs.ashbyhq.com/x&b=https://boards.greenhouse.io/y",
    "https://jobs.lever.co/demo-fiktiv/123",
    "https://demo-fiktiv.recruitee.com/o/stelle",
    "https://evilboards.greenhouse.io.example/demo",
    "https://xjobs.ashbyhq.com/demo",
])
def test_fremde_hosts_und_hinweise_in_query_werden_nicht_erkannt(url):
    e = erkenne_portal(url)
    assert (e.status, e.kandidat) == ("nicht_erkannt", None)


@pytest.mark.parametrize("url", [
    "https://jobs.ashbyhq.com@evil.example/demo",
    "https://nutzer:pw@jobs.ashbyhq.com/demo",
    "javascript:alert(1)",
    "file:///C:/demo",
    "http://jobs.ashbyhq.com/demo",
    "/demo-fiktiv/jobs/1",
    "jobs.ashbyhq.com/demo",
    "<a href=\"https://jobs.ashbyhq.com/demo\">x</a>",
    "",
    "   ",
    "https://jobs.ashbyhq.com/" + "a" * 4100,
    "https://jobs.ashbyhq.com/de\tmo",
    "https://jobs.ashbyhq.com/de mo",
    "https://jobs.ashbyhq.com\\demo",
    "https://jobs.ashbyhq.com:444/demo",
    "https://jobs.ashbyhq.com:abc/demo",
    "https://jobs.ashbyhq.com/../demo",
    "https://jobs.ashbyhq.com/./demo",
    "https://jobs.ashbyhq.com/demo%2fx",
    "https://jobs.ashbyhq.com/demo%5Cx",
    "https://jobs.ashbyhq.com/demo%0a",
    "https://jobs.ashbyhq.com/de%6do",
    "https://jobs.ashbyhq.com/-demo",
    "https://jobs.ashbyhq.com/d" + "x" * 100,
    "https://-demo.jobs.personio.de/",
    "https://Demo_x.jobs.personio.de/",
])
def test_ungueltige_oder_unsichere_eingaben(url):
    e = erkenne_portal(url)
    assert e.status in ("ungueltig", "nicht_erkannt")
    assert e.kandidat is None and e.grund


@pytest.mark.parametrize("url", [
    "https://jobs.ashbyhq.com@evil.example/demo", "javascript:alert(1)", "http://jobs.ashbyhq.com/demo",
    "https://jobs.ashbyhq.com:444/demo", "https://jobs.ashbyhq.com/../demo", "https://jobs.ashbyhq.com/demo%2fx", "",
])
def test_klar_unbrauchbare_eingaben_sind_ungueltig(url):
    assert erkenne_portal(url).status == "ungueltig"


@pytest.mark.parametrize("url", [
    "https://[abc/demo",                       # kaputte IPv6-Klammer
    "https://[jobs.ashbyhq.com]/demo",
    "https://a／b/demo",                   # Schrägstrich in voller Breite im Host
    "https://Kacme.jobs.personio.de/",    # Kelvin-Zeichen sieht aus wie K
    "https://jobs.ashbyhq.com/demo/%2e%2e",
    "https://boards.greenhouse.io/demo/jobs/²",  # hochgestellte 2 ist keine Jobnummer
])
def test_sonderfaelle_ohne_absturz_und_ohne_kandidat(url):
    e = erkenne_portal(url)
    assert e.kandidat is None and e.status in ("ungueltig", "nicht_erkannt")


def test_port_443_und_aussenleerzeichen_erlaubt():
    assert kandidat("  https://jobs.ashbyhq.com:443/demo-fiktiv \n") == ("ashby", "demo-fiktiv")


def test_kein_text_kein_absturz():
    assert erkenne_portal(None).status == "ungueltig"  # type: ignore[arg-type]


def test_wiederholbar_und_ohne_netz_oder_fremde_importe():
    a = erkenne_portal("https://jobs.ashbyhq.com/demo-fiktiv")
    assert a == erkenne_portal("https://jobs.ashbyhq.com/demo-fiktiv")
    import scraper.ats_erkennung as m
    quelle = open(m.__file__, encoding="utf-8").read()
    for verboten in ("import requests", "scraper.ats", "scraper.http", "scraper.db", "socket", "urllib.request"):
        assert verboten not in quelle
