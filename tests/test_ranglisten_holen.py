import json
from types import SimpleNamespace

from scraper import ranglisten_holen as rh
from scraper.quellen import kandidat


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
