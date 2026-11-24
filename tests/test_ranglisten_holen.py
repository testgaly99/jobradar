import pytest
import json
from types import SimpleNamespace

from scraper import ranglisten_holen as rh
from scraper.quellen import kandidat


@pytest.fixture(autouse=True)
def ohne_website_abgleich(monkeypatch):
    # Der Website-Schritt (Plan 2026-11-24) hat eigene Tests in test_websites.py; hier nie Netz, nie Wartezeit
    from scraper.quellen import websites
    monkeypatch.setattr(websites, 'websites_zu_namen', lambda namen, *a, **k: {})


def test_monatssperre_und_keine_rohdaten(tmp_path, monkeypatch):
    k = kandidat('A', 'dax'); k.update(wikidata_id='Q1', website='https://example.org')
    monkeypatch.setattr(rh, 'QUELLEN', {'dax': ('https://example.org/dax', lambda _: [k])})
    calls = []
    def holen(url):
        calls.append(url)
        return SimpleNamespace(content=b'ROHDATEN NICHT SPEICHERN')
    assert rh.lauf('2026-11-20', tmp_path, holen)['geholt'] == ['dax']
    assert rh.lauf('2026-11-21', tmp_path, holen)['geholt'] == []
    assert len(calls) == 1
    assert not any(b'ROHDATEN NICHT SPEICHERN' in p.read_bytes() for p in tmp_path.rglob('*') if p.is_file())
    assert json.loads((tmp_path / 'ranglisten/dax.json').read_text())['firmen'][0]['unternehmen'] == 'A'


def test_kaputte_quelle_erhaelt_alte_ausgabe(tmp_path, monkeypatch):
    k = kandidat('A', 'dax'); k['website'] = 'https://example.org'
    monkeypatch.setattr(rh, 'QUELLEN', {'dax': ('https://example.org/dax', lambda _: [k]),
                                     'mdax': ('https://example.org/mdax', lambda _: [dict(k, liste_id='mdax')])})
    rh.lauf('2026-10-20', tmp_path, lambda _: SimpleNamespace(content=b''))
    vorher = (tmp_path / 'ranglisten/dax.json').read_bytes()
    def hole(url):
        if url.endswith('/dax'):
            raise ValueError('Quelle kaputt')
        return SimpleNamespace(content=b'')
    bericht = rh.lauf('2026-11-20', tmp_path, hole)
    assert bericht['fehler'] and bericht['geholt'] == ['mdax']
    assert (tmp_path / 'ranglisten/dax.json').read_bytes() == vorher
    assert 'dax' in (tmp_path / 'companies.csv').read_text(encoding='utf-8')


def test_abgelaufene_quelle_haelt_firma_nicht_aktiv(tmp_path, monkeypatch):
    k = kandidat('A', 'dax'); k['website'] = 'https://example.org'
    monkeypatch.setattr(rh, 'QUELLEN', {'dax': ('https://example.org/dax', lambda _: [k])})
    rh.lauf('2025-01-01', tmp_path, lambda _: SimpleNamespace(content=b''))
    def kaputt(_):
        raise ValueError('kaputt')
    rh.lauf('2026-11-20', tmp_path, kaputt)
    assert not (tmp_path / 'ranglisten/dax.json').exists()
    from scraper.companies import lade_unternehmen
    assert lade_unternehmen(tmp_path / 'companies.csv')[0]['quellen'] == []


def test_epa_raenge_nie_in_oeffentlichen_dateien(tmp_path, monkeypatch):
    # Design: EPA-Ränge nur für den Admin, bis die Lizenz geklärt ist; data/ranglisten/ liegt im öffentlichen Repo
    k = kandidat('A', 'epa-patente'); k.update(rang=1, website='https://example.org')
    monkeypatch.setattr(rh, 'QUELLEN', {'epa-patente': ('https://example.org/epa', lambda _: [k])})
    rh.lauf('2026-11-20', tmp_path, lambda _: SimpleNamespace(content=b''))
    a = json.loads((tmp_path / 'ranglisten/epa-patente.json').read_text())
    assert [f['rang'] for f in a['firmen']] == [None] and a['firmen'][0]['unternehmen'] == 'A'


def _http_fehler(status, retry_after=None):
    import requests
    antwort = requests.Response()
    antwort.status_code = status
    if retry_after is not None:
        antwort.headers['Retry-After'] = str(retry_after)
    return requests.HTTPError(f'HTTP {status}', response=antwort)


def _zeile(q, name):
    return {'firma': {'value': 'http://www.wikidata.org/entity/' + q}, 'namen': {'value': name},
            'land': {'value': 'http://www.wikidata.org/entity/Q183'}, 'website': {'value': 'https://' + q.lower() + '.example'}}


def test_abgleich_in_sammelabfragen_zu_zehn(monkeypatch):
    abfragen, bericht = [], []
    def suche(namen, holen):
        abfragen.append(list(namen))
        return {'results': {'bindings': [_zeile(f'Q{n[1:]}', n) for n in namen]}}
    monkeypatch.setattr(rh.wikidata, 'suche_namen', suche)
    kandidaten = [{'name': f'F{i}', 'land': 'DE'} for i in range(25)] + [{'name': 'Schon da', 'wikidata_id': 'Q9'}]
    rh._anreichern(kandidaten, None, bericht, warte=lambda s: None)
    assert [len(a) for a in abfragen] == [10, 10, 5]
    assert kandidaten[0]['wikidata_id'] == 'Q0' and kandidaten[24]['website'] == 'https://q24.example'
    assert not bericht


def test_wikidata_drosselung_kostet_nicht_die_ganze_quelle(monkeypatch):
    # Live 2026-11-24: QLever antwortete beim Abgleich von ~300 Namen mit 429/500, und die ganze
    # Scoreboard-/EPA-Liste wurde verworfen. Jetzt: einmal warten und neu versuchen, sonst nur diese Gruppe auslassen.
    aufrufe, pausen, bericht = [], [], []
    def suche(namen, holen):
        aufrufe.append(namen[0])
        if namen[0] == 'Gedrosselt' and aufrufe.count('Gedrosselt') == 1:
            raise _http_fehler(429, retry_after=7)
        if namen[0] == 'Kaputt':
            raise _http_fehler(500)
        return {'results': {'bindings': []}}
    monkeypatch.setattr(rh.wikidata, 'suche_namen', suche)
    monkeypatch.setattr(rh, 'GRUPPE', 1)
    kandidaten = [{'name': n} for n in ('Gedrosselt', 'Kaputt', 'Normal')]
    rh._anreichern(kandidaten, None, bericht, warte=pausen.append)
    assert aufrufe == ['Gedrosselt', 'Gedrosselt', 'Kaputt', 'Kaputt', 'Normal']
    assert pausen[0] == 7 and len(pausen) == 2
    assert any('Kaputt' in z and 'nicht erreichbar' in z for z in bericht)


def test_wikidata_abgleich_bricht_nach_fuenf_fehlern_in_folge_ab(monkeypatch):
    aufrufe, bericht = [], []
    def suche(namen, holen):
        aufrufe.append(tuple(namen))
        raise _http_fehler(500)
    monkeypatch.setattr(rh.wikidata, 'suche_namen', suche)
    rh._anreichern([{'name': f'F{i}'} for i in range(90)], None, bericht, warte=lambda s: None)
    assert len(set(aufrufe)) == 5
    assert any('abgebrochen' in z for z in bericht)


def test_quelle_bleibt_erhalten_wenn_wikidata_ausfaellt(tmp_path, monkeypatch):
    monkeypatch.setattr(rh, 'QUELLEN', {'scoreboard-world': ('https://example.invalid/s', lambda b: [
        dict(kandidat('Firma A', 'scoreboard-world'), rang=1, land='DE')])})
    monkeypatch.setattr(rh.wikidata, 'suche_namen', lambda namen, holen: (_ for _ in ()).throw(_http_fehler(429)))
    monkeypatch.setattr(rh.time, 'sleep', lambda s: None)
    b = rh.lauf('2026-11-24', tmp_path, holen=lambda url: SimpleNamespace(content=b''))
    assert b['geholt'] == ['scoreboard-world'] and not b['fehler']
