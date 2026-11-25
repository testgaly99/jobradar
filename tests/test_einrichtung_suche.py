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
    # ohne Stellenwort: nur die Teil-Sitemap mit den Stellen, nie „alle Seiten der Website“ (Review Befund 3)
    assert (r['status'], r['ats_typ'], r['ats_id']) == ('aktiv', 'sitemap', 'https://jobs.firma.example/de-sitemap.xml#')


def test_stellenliste_ohne_sitemap_avature():
    ids = range(530640, 530646)
    links = ''.join(f'<a href="/de_DE/externaljobs/JobDetail/{i}">Stelle</a>' for i in ids)
    links += '<a href="/de_DE/externaljobs/SearchJobs?folderRecordsPerPage=6&amp;folderOffset=6">Weiter</a>'
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


def test_startseite_mit_neuesten_stellen_ohne_blaettern_ist_keine_liste():
    # Review Befund 4: „die 5 neuesten Stellen“ ohne Blätter-Link würde morgen offene Stellen schließen
    links = ''.join(f'<a href="/de/job/Stelle-{i}/{i}">Stelle</a>' for i in range(5))
    seiten = {'https://www.firma.example': links, **{f'https://www.firma.example/de/job/Stelle-{i}/{i}': _jp() for i in range(5)}}
    r = e.richte_ein(firma(), holen=_web(seiten), adapter=PROBE)
    assert r.get('ats_typ') != 'liste'


def test_jobportal_link_fremder_art_wird_nie_quelle():
    # Review Befund 1: karriere.at u. a. sind Jobportale; die zentrale Sperre greift vor jedem Abruf
    from scraper import http
    assert all(http.ist_portal(h) for h in ('www.karriere.at', 'www.stellenanzeigen.de', 'jobboerse.arbeitsagentur.de',
                                            'www.heyjobs.co', 'de.jooble.org'))
    assert not http.ist_portal('karriere.firma.de')
    aufrufe = []
    seiten = {'https://www.firma.example': '<a href="https://www.karriere.at/f/firma">Wir auf karriere.at – Jobs</a>'}
    r = e.richte_ein(firma(), holen=_web(seiten, aufrufe), adapter=PROBE)
    assert r['status'] == 'offen' and not any('karriere.at' in u for u in aufrufe)


def test_fremde_seite_fuehrt_nicht_weiter_auf_dritte_hosts():
    # Review Befund 1b: von einer fremden Seite aus keine Links auf noch andere Hosts
    aufrufe = []
    seiten = {'https://www.firma.example': '<a href="https://partner.example/karriere">Karriere bei Partnern</a>',
              'https://partner.example/karriere': '<a href="https://dritte.example/jobs">Jobs</a>'}
    e.richte_ein(firma(), holen=_web(seiten, aufrufe), adapter=PROBE)
    assert 'https://partner.example/karriere' in aufrufe and not any('dritte.example' in u for u in aufrufe)


def test_403_sperrt_den_host_fuer_weitere_pfade():
    # Review Befund 7: nach einer Absage keine weiteren Pfade auf demselben Host
    aufrufe = []
    r = e.richte_ein(firma(), holen=_web({'https://www.firma.example': _fehler(403)}, aufrufe), adapter=PROBE)
    assert r['status_grund'] == 'lehnt Abruf ab (403)'
    assert [u for u in aufrufe if u.startswith('https://www.firma.example')] == ['https://www.firma.example']


def test_ratenbegrenzung_wird_beim_naechsten_lauf_wiederholt(tmp_path, monkeypatch):
    # Review Befund 8: 429 in der Probe schreibt keinen Stand, sonst 30 Tage Sperre
    from scraper.ranglisten_holen import schreibe_firmen
    schreibe_firmen(tmp_path / 'companies.csv', [firma()])
    monkeypatch.setattr(e, 'richte_ein', lambda f: dict(f, status='offen', aktiv='nein', status_grund='Ratenbegrenzung, später erneut'))
    e.lauf(tmp_path, mit_db=False)
    assert not (tmp_path / 'einrichtung_stand.json').exists() or 'Beispiel' not in (tmp_path / 'einrichtung_stand.json').read_text(encoding='utf-8')


def test_einzelne_suchseite_unter_den_proben_kippt_die_quelle_nicht():
    # Abnahme REWE Group: „…/jobs/suchen“ steht in der Sitemap zwischen echten Stellen
    jobs = [f'https://jobs.firma.example/jobs/marke/{i}/Stelle-{i}.html' for i in range(6)]
    alle = jobs[:3] + ['https://jobs.firma.example/jobs/suchen'] + jobs[3:]
    seiten = {'https://www.firma.example': '<p>x</p>', 'https://jobs.firma.example/': '<p>Jobs</p>',
              'https://jobs.firma.example/robots.txt': 'Sitemap: https://jobs.firma.example/sitemap.xml\n',
              'https://jobs.firma.example/sitemap.xml': _karte(*alle), 'https://jobs.firma.example/jobs/suchen': '<p>Suche</p>',
              **{u: _jp() for u in jobs}}
    r = e.richte_ein(firma(), holen=_web(seiten), adapter=PROBE)
    assert (r['ats_typ'], r['status']) == ('sitemap', 'aktiv')


def test_portal_link_bricht_suche_nicht_ab_eigene_quelle_gewinnt():
    # Abnahme Lidl/Schwarz: Link auf einen SuccessFactors-Server, Stellen aber auf jobs.<firma> mit Sitemap
    jobs = [f'https://jobs.firma.example/de/job/Berlin-Analyst/{i}' for i in range(3)]
    seiten = {'https://www.firma.example': '<a href="https://career5.successfactors.eu/career?company=firma">Bewerben</a>',
              'https://jobs.firma.example/': '<p>Jobs</p>',
              'https://jobs.firma.example/robots.txt': 'Sitemap: https://jobs.firma.example/sitemap.xml\n',
              'https://jobs.firma.example/sitemap.xml': _karte(*jobs), **{u: _jp() for u in jobs}}
    r = e.richte_ein(firma(), holen=_web(seiten), adapter=PROBE)
    assert (r['ats_typ'], r['status']) == ('sitemap', 'aktiv')


def test_ausschnitt_ohne_de_treffer_ist_nicht_keine_stellen_de():
    # Abnahme VW/Siemens: 20 Proben aus Tausenden Stellen beweisen nicht „keine Stellen in Deutschland“
    html = (FIX / 'karriere_ein_portal.html').read_text(encoding='utf-8')
    ausland = [dict(titel='Engineer', ort='New York, USA', remote=False)]
    r = e.richte_ein(firma('https://beispiel.example'), holen=lambda _: SimpleNamespace(text=html),
                    adapter={'greenhouse': lambda _: ausland + [{'uebersprungen': 'vertagt'}]})
    assert r['status'] == 'aktiv'
    r = e.richte_ein(firma('https://beispiel.example'), holen=lambda _: SimpleNamespace(text=html),
                    adapter={'greenhouse': lambda _: ausland})
    assert r['status'] == 'keine_stellen_de'  # vollständig gesehen: dann stimmt das Urteil


def test_websites_werden_vor_der_suche_ergaenzt(tmp_path, monkeypatch):
    # Plan „Websites ergänzen“: Firmen ohne Website bekommen sie über Wikidata, nur eindeutige; Fehler kosten nur den Schritt
    from scraper.ranglisten_holen import schreibe_firmen
    from scraper.companies import lade_unternehmen
    ohne = dict(name='NVIDIA CORP', website='', status='offen', quellen=['scoreboard-world'])
    unklar = dict(name='CEA', website='', status='offen', quellen=['epa-patente'])
    schreibe_firmen(tmp_path / 'companies.csv', [ohne, unklar])
    gesehen = []
    monkeypatch.setattr(e, 'richte_ein', lambda f: gesehen.append(f.get('website')) or dict(f, status_grund='x'))
    e.lauf(tmp_path, mit_db=False, finden=lambda namen: {'NVIDIA CORP': {'website': 'https://www.nvidia.com', 'wikidata_id': 'Q182477'},
                                                         'CEA': {'grund': 'mehrdeutig'}})
    firmen = {f['name']: f for f in lade_unternehmen(tmp_path / 'companies.csv')}
    assert firmen['NVIDIA CORP']['website'] == 'https://www.nvidia.com' and firmen['CEA']['website'] == ''
    assert 'https://www.nvidia.com' in gesehen

    def kaputt(_):
        raise RuntimeError('QLever weg')
    assert e.websites_ergaenzen([dict(ohne)], kaputt) == 0


def test_ohne_website_eigener_grund():
    r = e.richte_ein(dict(name='X', website='', status='offen'), holen=lambda _: None, adapter={})
    assert r['status_grund'] == 'keine Website bekannt'


def test_gleiche_firma_nur_bei_echter_marke():
    # Review 2 Befund 1: geratene oder ähnlich klingende Adressen gehören oft Fremden
    assert e._gleiche_firma('www.bertelsmann.de', 'createyourowncareer.bertelsmann.com') or e._gleiche_firma('bertelsmann.de', 'bertelsmann.com')
    assert e._gleiche_firma('jobs.firma.de', 'www.firma.de')
    for a, b in [('abc.xyz', 'careers.abc.com'), ('global.honda', 'jobs.global.com'), ('global.honda', 'global.canon'),
                 ('gruppe.schwarz', 'jobs.gruppe.com'), ('tk.de', 'jobs.tk.com'), ('deutsche-bank.de', 'deutsche-post.de')]:
        assert not e._gleiche_firma(a, b), (a, b)


def test_403_nur_auf_eigener_karriereadresse_ist_ausnahme():
    seiten = {'https://www.firma.example': '<a href="https://careers.fremd.example/">Karriere bei Partnern</a>',
              'https://careers.firma.example/': _fehler(403), 'https://careers.fremd.example/': _fehler(403)}
    r = e.richte_ein(firma(), holen=_web(seiten), adapter=PROBE)
    assert r['status_grund'] == 'lehnt Abruf ab (403)'  # careers.firma.example lehnt ab
    seiten['https://careers.firma.example/'] = '<p>x</p>'
    r = e.richte_ein(firma(), holen=_web(seiten), adapter=PROBE)
    assert r['status_grund'] != 'lehnt Abruf ab (403)'  # nur der fremde Host lehnt ab


def test_keine_geratenen_unteradressen_auf_fremder_endung():
    aufrufe = []
    e.richte_ein(firma('https://www.firma.de'), holen=_web({'https://www.firma.de': '<p>x</p>'}, aufrufe), adapter=PROBE)
    assert not any('firma.com' in u for u in aufrufe)


def test_firma_mit_eigenem_wikidata_eintrag_bekommt_keine_fremde_website():
    f = dict(name='Deutsche Ausrüstungswerke', website='', status='offen', wikidata_id='Q123')
    assert e.websites_ergaenzen([f], lambda namen: {n: {'website': 'https://fremd.example', 'wikidata_id': 'Q9'} for n in namen}) == 0


def test_handlisten_firmen_zuerst_nur_neue_werktags(tmp_path, monkeypatch):
    # Nutzer 2026-11-25: manuell eingefügte Listen (Datenbank, nur Namen) müssen eingerichtet werden, vor der Firmenliste
    from scraper import db
    from scraper.ranglisten_holen import schreibe_firmen
    schreibe_firmen(tmp_path / 'companies.csv', [dict(name='Datei AG', website='https://datei.example', status='offen')])
    datenbank = [dict(name='Neu GmbH', website='', status='offen', status_grund=''),
                 dict(name='Alt GmbH', website='https://alt.example', status='offen', status_grund='Karriereseite nicht gefunden')]
    monkeypatch.setattr(db, 'db_firmen', lambda status=None: [dict(f) for f in datenbank])
    gesetzt, reihenfolge = [], []
    monkeypatch.setattr(db, 'setze_einrichtung', lambda name, felder: gesetzt.append((name, dict(felder))))
    monkeypatch.setattr(e, 'richte_ein', lambda f: reihenfolge.append(f['name']) or dict(f, status='aktiv', aktiv='ja', status_grund=''))
    finden = lambda namen: {n: {'website': 'https://neu.example', 'wikidata_id': 'Q1'} for n in namen if n == 'Neu GmbH'}
    erg = e.lauf(tmp_path, finden=finden)
    assert reihenfolge == ['Neu GmbH', 'Datei AG']  # neue Datenbank-Firma zuerst, die alte erst sonntags
    assert ('Neu GmbH', {'website': 'https://neu.example', 'wikidata_id': 'Q1'}) in gesetzt
    assert erg['offen'] == 0 and erg['bearbeitet'] == 1
    reihenfolge.clear()
    datenbank[0]['status_grund'] = 'Karriereseite nicht gefunden'
    e.lauf(tmp_path, finden=finden, privat_alle=True)
    assert reihenfolge == ['Neu GmbH', 'Alt GmbH']  # sonntags alle offenen erneut; Datei AG ist heute schon versucht
    assert 'Neu GmbH' not in (tmp_path / 'companies.csv').read_text(encoding='utf-8')  # nie in die öffentliche Liste



def test_defekte_quelle_nach_7_tagen_neu_suchen():
    # Q300: Karriereseite geändert -> 7 Tagesläufe Fehler/0 Stellen -> zurück auf „offen“, die Suche findet die neue Seite
    def tag(i, **firmen):
        return {'stand': f'2026-12-{i:02d}', 'firmen': [dict(name=n, **w) for n, w in firmen.items()]}
    kaputt = [tag(i, A={'gefunden': 0, 'fehler': ''}, B={'gefunden': 5, 'fehler': ''}, C={'gefunden': 3, 'fehler': 'Abruf: HTTP 404'})
              for i in range(1, 8)]
    assert e.defekte_quellen(kaputt) == {'A', 'C'}
    assert e.defekte_quellen(kaputt[:6]) == set()  # erst nach 7 Tagen
    kaputt[3] = tag(4, A={'gefunden': 2, 'fehler': ''}, C={'gefunden': 0, 'fehler': 'x'})
    assert e.defekte_quellen(kaputt) == {'C'}  # ein guter Tag dazwischen: A ist nicht dauerhaft defekt


def test_selbstheilung_setzt_firma_zurueck(tmp_path, monkeypatch):
    from scraper import db
    from scraper.companies import lade_unternehmen
    from scraper.ranglisten_holen import schreibe_firmen
    schreibe_firmen(tmp_path / 'companies.csv', [dict(name='Kaputt AG', website='https://kaputt.example', status='aktiv', aktiv='ja',
                                                    careers_url='https://alt.example/jobs', ats_typ='sitemap', ats_id='https://alt.example/s.xml#/job/')])
    berichte = [{'stand': f'2026-12-{i:02d}', 'firmen': [{'name': 'Kaputt AG', 'gefunden': 0, 'fehler': 'Abruf: HTTP 404'}]} for i in range(1, 8)]
    monkeypatch.setattr(db, 'letzte_laeufe', lambda n=7: berichte)
    monkeypatch.setattr(db, 'db_firmen', lambda status=None: [])
    monkeypatch.setattr(db, 'lade_firmen_gesundheit', lambda datum=None: [])
    gesucht = []
    monkeypatch.setattr(e, 'richte_ein', lambda f: gesucht.append(dict(f)) or dict(f, status='aktiv', aktiv='ja', status_grund='',
                                                                                  ats_typ='sitemap', ats_id='https://neu.example/s.xml#/job/'))
    e.lauf(tmp_path, finden=lambda namen: {})
    assert gesucht and gesucht[0]['careers_url'] == '' and gesucht[0]['status_grund'] == 'Quelle defekt, neue Suche'
    f = lade_unternehmen(tmp_path / 'companies.csv')[0]
    assert f['ats_id'] == 'https://neu.example/s.xml#/job/'  # neue Quelle steht im Vorschlag


def test_mehrere_regionale_sitemaps_deutsche_zuerst():
    # Abnahme GitHub 2026-11-25: DHL bekam die Sitemap „africa/ar“, Allianz „my/en“ – die erste aus robots.txt
    assert sorted(['https://careers.dhl.com/africa/ar/sitemap_index.xml', 'https://careers.dhl.com/global/en/sitemap_index.xml',
                   'https://careers.dhl.com/de/de/sitemap_index.xml'], key=e._regionsrang)[0] == 'https://careers.dhl.com/de/de/sitemap_index.xml'
    assert sorted(['https://careers.x.com/my/en/sitemap.xml', 'https://careers.x.com/global/en/sitemap.xml'],
                  key=e._regionsrang)[0] == 'https://careers.x.com/global/en/sitemap.xml'
    jobs = [f'https://careers.firma.example/de/de/job/ID{i}/Analyst' for i in range(3)]
    robots = ('Sitemap: https://careers.firma.example/africa/ar/sitemap.xml\n'
              'Sitemap: https://careers.firma.example/de/de/sitemap.xml\n')
    seiten = {'https://www.firma.example': '<p>x</p>', 'https://careers.firma.example/': '<p>Karriere</p>',
              'https://careers.firma.example/robots.txt': robots,
              'https://careers.firma.example/africa/ar/sitemap.xml': _karte('https://careers.firma.example/africa/ar/job/X1/Mudir'),
              'https://careers.firma.example/de/de/sitemap.xml': _karte(*jobs), **{u: _jp() for u in jobs},
              'https://careers.firma.example/africa/ar/job/X1/Mudir': _jp()}
    r = e.richte_ein(firma(), holen=_web(seiten), adapter=PROBE)
    assert r['ats_id'].startswith('https://careers.firma.example/de/de/sitemap.xml')
