import csv
import json
from pathlib import Path

from scraper.quellen import scoreboard, epa, wikidata

FIX = Path(__file__).parent / 'fixtures/quellen'


def daten(name):
    return json.loads((FIX / name).read_text(encoding='utf-8'))


def test_scoreboard_und_epa():
    sb = scoreboard.lies((FIX / 'scoreboard_world2000.xlsx').read_bytes())
    assert len(sb) == 5
    assert (sb[0]['name'], sb[0]['rang'], sb[0]['land']) == ('AMAZON.COM, INC.', 1, 'US')
    assert len(epa.lies((FIX / 'epa_top_applicants.xlsx').read_bytes())) == 3
    assert scoreboard.aus_zeilen([['Year', 'World rank', 'Company', 'Country'], ['2025', '201', 'Test', 'DE']]) == []


def test_wikidata_fasst_mehrfachzeilen_zusammen():
    kd = wikidata.lies(daten('wikidata_index_dax.json'))
    assert len(kd) == len({k['wikidata_id'] for k in kd})
    assert kd[0]['website']


def test_arbeitgeber_ausschluss_und_ausnahmen():
    with open(FIX.parents[2] / 'data/arbeitgeber_ausschluss.csv', encoding='utf-8') as f:
        ausschluss = list(csv.DictReader(f))
    kd = wikidata.top_arbeitgeber(daten('wikidata_arbeitgeber.json'), ausschluss)
    namen = {k['name'] for k in kd}
    assert {'Auswärtiges Amt', 'Deutsche Bundesbank'} <= namen
    assert not namen & {'Bundeswehr', 'Bundespolizei', 'Deutscher Caritasverband',
                        'Ludwig-Maximilians-Universität München', 'Helios Kliniken', 'Landeshauptstadt München'}
    assert [k['mitarbeitende'] for k in kd] == sorted((k['mitarbeitende'] for k in kd), reverse=True)
    assert len(wikidata.top_arbeitgeber(daten('wikidata_arbeitgeber.json'), ausschluss, 5)) == 5


def test_name_exakt_vor_rechtsform_und_land():
    antwort = daten('wikidata_name_volkswagen.json')
    assert wikidata.name_zu_id('VOLKSWAGEN AG', 'DE', suche=lambda _: antwort) == 'Q156578'
    assert wikidata.name_zu_id('VOLKSWAGEN AG', 'US', suche=lambda _: antwort) is None
    assert wikidata.name_zu_id('Volkswagen GmbH', 'DE', suche=lambda _: antwort) is None


def test_rechtsform_mit_punkten_und_iso_landcodes():
    assert wikidata._normal('Beispiel S.A.') == wikidata._normal('Beispiel N.V.') == 'beispiel'
    antwort = {'results': {'bindings': [{'firma': {'value': 'http://www.wikidata.org/entity/Q1'},
                                        'namen': {'value': 'Exemple'}, 'iso3': {'value': 'FRA'},
                                        'land': {'value': 'http://www.wikidata.org/entity/Q142'}}]}}
    assert wikidata.name_zu_id('Exemple', 'FRA', suche=lambda _: antwort) == 'Q1'


def test_stammdaten_aus_wikidata_werden_uebernommen():
    a = {'results': {'bindings': [{'firma': {'value': 'https://www.wikidata.org/entity/Q1'},
                                  'name': {'value': 'Beispiel'}, 'hauptsitz': {'value': 'Berlin'},
                                  'mitarbeitende': {'value': '1234'}, 'branchen': {'value': 'Q1|Q2'}}]}}
    k = wikidata.lies(a)[0]
    assert k['hauptsitz'] == 'Berlin' and k['mitarbeitende'] == 1234


def test_wikidata_ueber_qlever_mit_praefixen_nie_wikidata_selbst():
    # query.wikidata.org/sparql und die Wikidata-API verbietet robots.txt (geprüft 2026-11-20); QLever (Uni Freiburg) erlaubt es
    from urllib.parse import parse_qs, urlsplit
    from scraper.quellen import wikidata
    from scraper import ranglisten_holen
    for url in (wikidata.url('SELECT ?firma WHERE { ?firma wdt:P31 wd:Q4830453 }'),
                ranglisten_holen._url('SELECT ?firma WHERE { ?firma wdt:P31 wd:Q4830453 }')):
        t = urlsplit(url)
        assert t.hostname == 'qlever.dev' and t.path == '/api/wikidata'
        q = parse_qs(t.query)['query'][0]
        assert 'PREFIX wdt: <http://www.wikidata.org/prop/direct/>' in q and q.rstrip().endswith('}')
    for name in ('index', 'arbeitgeber', 'name_zu_id'):
        assert 'wikidata.org/sparql' not in wikidata.vorlage(name) and 'mwapi' not in wikidata.vorlage(name)


def test_namenssuche_mit_schreibweisen_statt_suchdienst():
    from scraper.quellen import wikidata
    urls = []
    wikidata.suche_name('VOLKSWAGEN AG', lambda u: urls.append(u) or type('R', (), {'content': b'{"results":{"bindings":[]}}'})())
    from urllib.parse import parse_qs, urlsplit
    q = parse_qs(urlsplit(urls[0]).query)['query'][0]
    for variante in ('"VOLKSWAGEN AG"@de', '"Volkswagen Ag"@en', '"VOLKSWAGEN"@de', '"Volkswagen"@en'):
        assert variante in q
    # Anführungszeichen im Namen dürfen die Abfrage nicht aufbrechen
    wikidata.suche_name('Firma "X" GmbH', lambda u: urls.append(u) or type('R', (), {'content': b'{"results":{"bindings":[]}}'})())
    assert '"Firma \\"X\\" GmbH"@de' in parse_qs(urlsplit(urls[1]).query)['query'][0]
