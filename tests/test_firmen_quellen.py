"""Phase 4c: ausschließlich künstliche Daten, keine Dienste."""
import csv
from pathlib import Path

import pytest

from scraper import companies, db


def test_altes_format_und_quellen(tmp_path):
    p = tmp_path / 'firmen.csv'
    p.write_text('name,kategorie,aktiv\nA,Tech,ja\n', encoding='utf-8')
    f = companies.lade_unternehmen(p)[0]
    assert f['quellen'] == [] and f['status'] == 'aktiv' and f['website'] == ''
    p.write_text('name,kategorie,aktiv,quellen,status\nA,Tech,nein,scoreboard-world;dax,offen\n', encoding='utf-8')
    assert companies.lade_unternehmen(p)[0]['quellen'] == ['scoreboard-world', 'dax']


def test_korrekturen_mit_vorrang_und_feldschutz(tmp_path):
    p = tmp_path / 'korrekturen.csv'
    p.write_text('name,feld,wert,quelle\nA,hauptsitz,Berlin,Impressum\n', encoding='utf-8')
    original = [{'name': 'A', 'hauptsitz': 'München'}]
    assert companies.wende_korrekturen_an(original, p)[0]['hauptsitz'] == 'Berlin'
    assert original[0]['hauptsitz'] == 'München'
    p.write_text('name,feld,wert,quelle\nA,whitelist,ja,Impressum\n', encoding='utf-8')
    with pytest.raises(ValueError):
        companies.wende_korrekturen_an(original, p)


@pytest.mark.parametrize('vorhanden', [True, False])
def test_sync_neue_felder_nur_mit_migration(monkeypatch, vorhanden):
    calls = []
    monkeypatch.setattr(db, 'firmen_quellen_da', lambda: vorhanden, raising=False)
    monkeypatch.setattr(db, 'herkunft_da', lambda: False)
    monkeypatch.setattr(db, '_upsert', lambda *a: calls.append(a))
    f = dict(name='A', careers_url='', ats_typ='', ats_id='', mitarbeitende_ca='',
             groesse_klasse='<50', kategorie=['Tech'], hauptsitz='', aktiv='ja',
             status='offen', website='https://example.org', wikidata_id='Q1', quellen=['dax'])
    db.sync_companies([f])
    row = calls[0][1][0]
    assert ('wikidata_id' in row) == vorhanden
    assert not row['aktiv']
    assert 'whitelist' not in row


def test_migration_014_nur_ergaenzend():
    sql = (Path(__file__).parents[1] / 'supabase/migrations/014_firmen_quellen.sql').read_text(encoding='utf-8').lower()
    assert 'if not exists' in sql and 'unique' in sql and 'check' in sql
    assert all(s in sql for s in ['kein_portal', 'portal_nicht_unterstuetzt', 'keine_stellen_de', 'offen'])
    assert 'drop table' not in sql


def test_unvollstaendige_oder_kopierte_zeile_kippt_den_lauf_nicht(tmp_path, capsys):
    p = tmp_path / 'firmen.csv'
    zeilen = [
        'name,careers_url,ats_typ,ats_id,groesse_klasse,mitarbeitende_ca,kategorie,hauptsitz,aktiv,notiz,website,wikidata_id,quellen,status,status_grund',
        'A,,,,,,Tech,,ja,,https://a.example,Q1,bestand,aktiv,',
        'B,,,,,,Tech,,ja,,https://b.example,Q1,bestand,aktiv,',  # Zeile kopiert, Kennung stehen gelassen
        'C,,,,,,Tech,,ja,',                                       # von Hand, ohne neue Spalten
        'D,,,,,,,,ja,,,,,,',                                      # leerer Status und leere Kategorie
    ]
    p.write_text('\n'.join(zeilen) + '\n', encoding='utf-8')
    a, b, c, d = companies.lade_unternehmen(p)
    assert a['wikidata_id'] == 'Q1' and b['wikidata_id'] == ''
    assert c['quellen'] == [] and c['status'] == 'aktiv' and c['website'] == ''
    assert d['status'] == 'aktiv' and d['kategorie'] == []
    assert 'doppelte Wikidata-Kennung' in capsys.readouterr().out
