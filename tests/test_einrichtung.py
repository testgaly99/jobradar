from pathlib import Path
from types import SimpleNamespace

import pytest

from scraper import einrichtung as e, http
from scraper.ats import sitemap
from scraper.ranglisten_holen import schreibe_firmen

FIX = Path(__file__).parent / 'fixtures/quellen'


def seite(name):
    return SimpleNamespace(text=(FIX / name).read_text(encoding='utf-8'))


def firma():
    return dict(name='Beispiel', website='https://beispiel.example', status='offen', quellen=['dax'])


@pytest.mark.parametrize('ort,status', [('München', 'aktiv'), ('New York, USA', 'keine_stellen_de')])
def test_ein_portal_und_probe(ort, status):
    result = e.richte_ein(firma(), holen=lambda _: seite('karriere_ein_portal.html'),
                         adapter={'greenhouse': lambda _: [dict(titel='Engineer', ort=ort, remote=False)]})
    assert result['status'] == status and result['ats_id'] == 'beispielag'
    assert result['aktiv'] == ('ja' if status == 'aktiv' else 'nein')


def test_mehrere_portale_keine_automatische_wahl():
    result = e.richte_ein(firma(), holen=lambda _: seite('karriere_zwei_portale.html'), adapter={})
    assert result['status'] == 'offen' and 'mehrere Portale' in result['status_grund']
    assert len(e.portal_links(seite('karriere_ein_portal.html').text, firma()['website'])) == 1


def test_ohne_portal_und_robots():
    r = e.richte_ein(firma(), holen=lambda _: seite('karriere_kein_portal.html'), adapter={})
    assert r['status'] == 'offen' and 'nicht gefunden' in r['status_grund']
    def verboten(_):
        raise http.VerbotenDurchRobots('nicht protokollieren')
    r = e.richte_ein(firma(), holen=verboten)
    assert r['status_grund'] == 'robots.txt verbietet Abruf'


def test_budget_und_fortsetzen(tmp_path, monkeypatch):
    schreibe_firmen(tmp_path / 'companies.csv', [firma()])
    calls = []
    def richten(f):
        calls.append(f['name'])
        return dict(f, status='offen', status_grund='Karriereseite nicht gefunden', aktiv='nein')
    monkeypatch.setattr(e, 'richte_ein', richten)
    e.lauf(tmp_path, budget_s=0)
    assert not calls and not (tmp_path / 'einrichtung_stand.json').exists()
    e.lauf(tmp_path)
    e.lauf(tmp_path)
    assert calls == ['Beispiel']
    assert 'Karriereseite nicht gefunden' in (tmp_path / 'karriereseite_nicht_gefunden.md').read_text(encoding='utf-8')


@pytest.mark.parametrize('url,art', [('https://firma.wd3.myworkdayjobs.com/de', 'workday'),
                                   ('https://career5.successfactors.eu/jobs', 'successfactors'),
                                   ('https://jobs.sap.com', 'successfactors'),
                                   ('https://evilworkday.example', None),
                                   ('https://lever.co.evil.example', None)])
def test_portal_art_mit_hostgrenzen(url, art):
    assert e.portal_art(url) == art


def test_portal_statistik():
    firmen = [dict(name='A', status='portal_nicht_unterstuetzt', careers_url='https://firma.myworkdayjobs.com'),
              dict(name='B', status='portal_nicht_unterstuetzt', careers_url='https://jobs.sap.com'),
              dict(name='C', status='portal_nicht_unterstuetzt', careers_url='https://example.org')]
    assert {a: v['anzahl'] for a, v in e.portal_statistik(firmen, {}).items()} == {'workday': 1, 'successfactors': 1, 'sonstige': 1}


def test_workday_nur_sitemap_aus_robots():
    calls = []
    f = dict(firma(), website='https://firma.myworkdayjobs.com/de')
    def holen(url):
        calls.append(url)
        return SimpleNamespace(text='User-agent: *\nAllow: /\nSitemap: https://firma.myworkdayjobs.com/sitemap.xml\n')
    r = e.richte_ein(f, holen=holen, adapter={'sitemap': lambda _: [dict(titel='Engineer', ort='Berlin', remote=False)]})
    assert r['status'] == 'aktiv' and r['ats_typ'] == 'sitemap'
    assert r['ats_id'].endswith('sitemap.xml#/job/')
    assert not any('/wday/cxs/' in u for u in calls)


def test_workday_ort_vorfilter():
    assert sitemap.ort_aus_url('https://x/job/Vietnam-Hanoi/Engineer') == 'Vietnam Hanoi'
    assert sitemap._vorgefiltert('https://x/job/Vietnam-Hanoi/Engineer')
    assert not sitemap._vorgefiltert('https://x/job/Germany-Munich/Engineer')
    assert not sitemap._vorgefiltert('https://x/job/US-WA-Remote/Engineer')
    assert sitemap.ort_aus_url('https://x/offer/123') is None


def test_unterstuetztes_und_fremdes_portal_keine_automatische_wahl():
    html = '<a href="https://boards.greenhouse.io/beispiel">Jobs</a><a href="https://jobs.lever.co/andere">Weitere Jobs</a>'
    r = e.richte_ein(firma(), holen=lambda _: SimpleNamespace(text=html),
                    adapter={'greenhouse': lambda _: [dict(titel='Engineer', ort='Berlin', remote=False)]})
    assert r['status'] == 'offen' and 'mehrere Portale' in r['status_grund']


def test_firmeneigener_karrierehost_mit_sitemap():
    f = dict(firma(), website='https://karriere.beispiel.example')
    def holen(url):
        if url.endswith('/robots.txt'):
            return SimpleNamespace(text='User-agent: *\nAllow: /\nSitemap: https://karriere.beispiel.example/sitemap.xml\n')
        return SimpleNamespace(text='<a href="/job/Germany-Berlin/Engineer">Engineer</a>')
    r = e.richte_ein(f, holen=holen, adapter={'sitemap': lambda _: [dict(titel='Engineer', ort='Berlin', remote=False)]})
    assert r['status'] == 'aktiv' and r['ats_typ'] == 'sitemap'
