"""Suche über Adressen hinweg (Plan docs/plans/2026-11-24-firmensuche-verbessern.md), nur gespeicherte Antworten."""
import json
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest
import requests

from scraper import einrichtung as e

FIX = Path(__file__).parent / 'fixtures/quellen'


@pytest.fixture(autouse=True)
def ohne_live_db(monkeypatch):
    from scraper import db
    monkeypatch.setattr(db, 'herkunft_da', lambda: False)


def firma(website='https://www.firma.example'):
    return dict(name='Beispiel', website=website, status='offen', quellen=['dax'])


def _fehler(code):
    antwort = requests.Response()
    antwort.status_code = code
    return requests.HTTPError(str(code), response=antwort)


def _web(seiten, aufrufe=None):
    """seiten: URL -> Text oder Ausnahme; unbekannte URL = HTTP 404."""
    def holen(url):
        if aufrufe is not None:
            aufrufe.append(url)
        wert = seiten.get(url, _fehler(404))
        if isinstance(wert, Exception):
            raise wert
        return SimpleNamespace(text=wert, content=wert.encode('utf-8'), url=url)
    return holen


def _jp(titel='Data Analyst'):
    return '<html><script type="application/ld+json">' + json.dumps({'@type': 'JobPosting', 'title': titel}) + '</script></html>'


def _karte(*urls):
    return ('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + ''.join(f'<url><loc>{u}</loc></url>' for u in urls) + '</urlset>')


PROBE = {'sitemap': lambda _: [dict(titel='Engineer', ort='Berlin', remote=False)],
         'liste': lambda _: [dict(titel='Engineer', ort='Berlin', remote=False)]}


def test_karriereseite_auf_anderem_host_der_firmengruppe():
    # wie Volkswagen: volkswagenag.com verlinkt jobs.volkswagen-group.com
    jobs = [f'https://jobs.firmengruppe.example/global/en/job/ID{i}/Analyst' for i in range(3)]
    holen = _web({'https://www.firma.example': '<a href="https://jobs.firmengruppe.example/de/karriere">Karriere</a>',
                  'https://jobs.firmengruppe.example/de/karriere': '<p>Willkommen</p>',
                  'https://jobs.firmengruppe.example/robots.txt': 'User-agent: *\nSitemap: https://jobs.firmengruppe.example/sitemap.xml\n',
                  'https://jobs.firmengruppe.example/sitemap.xml': _karte(*jobs), **{u: _jp() for u in jobs}})
    r = e.richte_ein(firma(), holen=holen, adapter=PROBE)
    assert (r['status'], r['ats_typ'], r['ats_id']) == ('aktiv', 'sitemap', 'https://jobs.firmengruppe.example/sitemap.xml#/job/')


def test_unteradresse_und_stellenadressen_ohne_jobwort():
    # wie Mercedes: jobs.<domain>, Stellen als „/de/titel-235908-mer00047kx“, Sitemap-Index ohne Stellen-Namen
    jobs = [f'https://jobs.firma.example/de/data-analyst-23590{i}-mer0004{i}kx' for i in range(3)]
    index = ('<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
             '<sitemap><loc>https://jobs.firma.example/de-sitemap.xml</loc></sitemap></sitemapindex>')
    holen = _web({'https://www.firma.example': '<p>Startseite ohne Links</p>',
                  'https://jobs.firma.example/': '<p>Jobs</p>',
                  'https://jobs.firma.example/robots.txt': 'Sitemap: https://jobs.firma.example/sitemap.xml\n',
                  'https://jobs.firma.example/sitemap.xml': index,
                  'https://jobs.firma.example/de-sitemap.xml': _karte('https://jobs.firma.example/de', *jobs),
                  **{u: _jp() for u in jobs}})
    r = e.richte_ein(firma(), holen=holen, adapter=PROBE)
    assert (r['status'], r['ats_typ'], r['ats_id']) == ('aktiv', 'sitemap', 'https://jobs.firma.example/sitemap.xml#')


def test_stellenliste_ohne_sitemap_avature():
    ids = range(530640, 530646)
    links = ''.join(f'<a href="/de_DE/externaljobs/JobDetail/{i}">Stelle</a>' for i in ids)
    avature = ('<meta property="og:title" content="Ingenieur"><div class="article__content__view__field__label">Standort(e)</div>'
               '<div class="article__content__view__field__value">Berlin</div>')
    seiten = {'https://www.firma.example': '<a href="https://jobs.firma.example/de_DE/externaljobs/SearchJobs">Stellen suchen</a>',
              'https://jobs.firma.example/de_DE/externaljobs/SearchJobs': links,
              **{f'https://jobs.firma.example/de_DE/externaljobs/JobDetail/{i}': avature for i in ids}}
    r = e.richte_ein(firma(), holen=_web(seiten), adapter=PROBE)
    assert (r['ats_typ'], r['ats_id']) == ('liste', 'https://jobs.firma.example/de_DE/externaljobs/SearchJobs#/JobDetail/')


def test_403_gilt_als_ausnahme():
    def holen(_):
        raise _fehler(403)
    r = e.richte_ein(firma(), holen=holen, adapter=PROBE)
    assert (r['status'], r['status_grund']) == ('offen', 'lehnt Abruf ab (403)')


def test_nicht_erreichbare_website():
    def holen(_):
        raise requests.ConnectionError('weg')
    r = e.richte_ein(firma(), holen=holen, adapter=PROBE)
    assert r['status_grund'] == 'Website nicht erreichbar'


def test_jobportale_und_soziale_netze_auch_tiefer_nie_abgerufen():
    aufrufe = []
    seiten = {'https://www.firma.example': ('<a href="https://karriere.firma.example/">Karriere</a>'
                                            '<a href="https://www.stepstone.de/cmp/firma/jobs">Jobs</a>'),
              'https://karriere.firma.example/': ('<a href="https://de.linkedin.com/company/firma/jobs">Jobs</a>'
                                                  '<a href="https://de.indeed.com/cmp/firma/jobs">Stellen</a>'
                                                  '<a href="https://www.xing.com/pages/firma/jobs">Karriere</a>')}
    r = e.richte_ein(firma(), holen=_web(seiten, aufrufe), adapter=PROBE)
    assert r['status'] == 'offen'
    assert not any(x in u for u in aufrufe for x in ('stepstone', 'linkedin', 'indeed', 'xing'))


def test_hoechstens_max_seiten():
    aufrufe = []
    links = ''.join(f'<a href="https://www.firma.example/karriere/{i}">Karriere {i}</a>' for i in range(200))
    seiten = {'https://www.firma.example': links, **{f'https://www.firma.example/karriere/{i}': links for i in range(200)}}
    e.richte_ein(firma(), holen=_web(seiten, aufrufe), adapter=PROBE)
    assert len([u for u in aufrufe if not u.endswith(('/robots.txt', '.xml'))]) <= e.MAX_SEITEN


def test_probe_nur_vertagt_bleibt_offen():
    html = (FIX / 'karriere_ein_portal.html').read_text(encoding='utf-8')
    r = e.richte_ein(firma('https://beispiel.example'), holen=lambda _: SimpleNamespace(text=html),
                    adapter={'greenhouse': lambda _: [{'uebersprungen': 'vertagt'}]})
    assert (r['status'], r['status_grund']) == ('offen', 'Ratenbegrenzung, später erneut')


def test_probe_mit_kleiner_grenze():
    from scraper.ats import liste, sitemap
    gesehen = []
    html = (FIX / 'karriere_ein_portal.html').read_text(encoding='utf-8')
    e.richte_ein(firma('https://beispiel.example'), holen=lambda _: SimpleNamespace(text=html),
                 adapter={'greenhouse': lambda _: gesehen.append((sitemap.MAX_NEU, liste.MAX_SEITEN)) or []})
    assert gesehen == [(e.PROBE_NEU, 5)] and sitemap.MAX_NEU == 300  # danach wieder die Tagesgrenze


def test_faellig_fuer_erneuten_versuch():
    heute = date(2026, 11, 24)
    assert not e.faellig({'status': 'aktiv'}, None, heute)
    assert e.faellig({'status': 'offen'}, None, heute)
    assert e.faellig({'status': 'offen'}, '2026-11-24', heute)  # alter Stand ohne Suchversion
    assert not e.faellig({'status': 'offen'}, {'datum': '2026-11-20', 'suche': e.SUCHVERSION}, heute)
    assert e.faellig({'status': 'portal_nicht_unterstuetzt'}, {'datum': '2026-10-20', 'suche': e.SUCHVERSION}, heute)
