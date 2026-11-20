import json
import pytest
from scraper import db, einrichtung, kandidaten, run
from scraper.quellen import kandidat
from tests.test_run import firma, stelle, aufbau


def test_sync_schuetzt_private_namenskollision(monkeypatch):
    monkeypatch.setattr(db, 'herkunft_da', lambda: True, raising=False)
    monkeypatch.setattr(db, 'firmen_quellen_da', lambda: True)
    monkeypatch.setattr(db, 'zusatzfirmen_da', lambda: False)
    monkeypatch.setattr(db, 'db_firmen', lambda status=None: [dict(name='A', herkunft='admin')], raising=False)
    calls=[]
    monkeypatch.setattr(db, '_upsert', lambda *a: calls.append(a))
    monkeypatch.setattr(db, '_req', lambda *a, **kw: calls.append(a))
    assert db.sync_companies([firma('A')]) == ['A']
    assert not calls


def test_db_firmen_pagination_und_normalisierung(monkeypatch):
    monkeypatch.setattr(db, 'herkunft_da', lambda: True, raising=False)
    monkeypatch.setattr(db, 'zusatzfirmen_da', lambda: False)
    calls=[]
    def req(m,p,**kw):
        calls.append(kw['params'])
        return [dict(name='Privat', aktiv=True, status='offen', herkunft='admin', kategorie=['Tech'])]
    monkeypatch.setattr(db, '_req', req)
    assert db.db_firmen('offen')[0]['aktiv'] == 'ja'
    assert calls[0]['herkunft'] == 'neq.datei' and calls[0]['status'] == 'eq.offen'


def test_admin_firma_nur_im_db_bericht(aufbau, monkeypatch, capsys):
    d,t=aufbau([firma('A')], {'fake':lambda *a,**kw:[stelle('1')]})
    monkeypatch.setattr(db,'db_firmen',lambda status=None:[dict(firma('PrivateFirma'),status='aktiv',herkunft='admin')],raising=False)
    b=run.lauf('2026-11-20',d)
    assert any(f['name']=='PrivateFirma' for f in b['firmen'])
    assert 'PrivateFirma' not in (d/'bericht.md').read_text(encoding='utf-8')
    assert 'PrivateFirma' not in capsys.readouterr().out


def test_db_einrichtung_schreibt_nie_oeffentlich(tmp_path,monkeypatch):
    from scraper.ranglisten_holen import schreibe_firmen
    schreibe_firmen(tmp_path/'companies.csv',[])
    monkeypatch.setattr(db,'db_firmen',lambda status=None:[dict(name='GeheimFirma',website='',careers_url='',status='offen',herkunft='admin')],raising=False)
    calls=[]
    monkeypatch.setattr(db,'setze_einrichtung',lambda *a:calls.append(a),raising=False)
    einrichtung.lauf(tmp_path,mit_db=True)
    assert calls[0][1]['status_grund']=='keine Website bekannt'
    assert 'GeheimFirma' not in (tmp_path/'companies.csv').read_text(encoding='utf-8')
    assert 'GeheimFirma' not in (tmp_path/'karriereseite_nicht_gefunden.md').read_text(encoding='utf-8')
    assert 'GeheimFirma' in (tmp_path/'einrichtung_privat.md').read_text(encoding='utf-8')


def test_epa_sichtbarkeit_und_015_fallback(monkeypatch):
    a=kandidaten.ausgaben([kandidat('A','epa-patente')],'2026-11-20')[0]
    assert a['ausgabe']['sichtbarkeit']=='admin' and a['ausgabe']['freigegeben']
    monkeypatch.setattr(db,'herkunft_da',lambda:False,raising=False)
    calls=[]
    monkeypatch.setattr(db,'_req',lambda method,pfad,**kw: ([{'name':'A'}] if method=='GET' else calls.append(kw['json'])))
    db.importiere_ausgabe(a)
    row=calls[0]['p_daten']['ranking_ausgaben'][0]
    assert not row['freigegeben'] and 'sichtbarkeit' not in row


def test_unbekannte_sichtbarkeit_abgewiesen():
    from scraper.rankings import pruefe_ausgabe
    a=kandidaten.ausgaben([kandidat('A','dax')],'2026-11-20')[0]
    a['ausgabe']['sichtbarkeit']='oeffentlich'
    with pytest.raises(ValueError): pruefe_ausgabe(a,{'A'})


def test_alte_epa_datei_wird_nur_als_admin_importiert(monkeypatch):
    a=kandidaten.ausgaben([kandidat('A','epa-patente')],'2026-11-20')[0]
    a['ausgabe'].pop('sichtbarkeit'); a['ausgabe']['freigegeben']=False
    monkeypatch.setattr(db,'herkunft_da',lambda:True)
    calls=[]
    monkeypatch.setattr(db,'_req',lambda method,pfad,**kw: ([{'name':'A'}] if method=='GET' else calls.append(kw['json'])))
    db.importiere_ausgabe(a)
    row=calls[0]['p_daten']['ranking_ausgaben'][0]
    assert row['sichtbarkeit']=='admin' and row['freigegeben']
    assert 'sichtbarkeit' not in a['ausgabe']  # Eingabe bleibt unangetastet.
