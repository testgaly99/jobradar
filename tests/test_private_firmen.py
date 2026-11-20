import pytest

from scraper import db, run
from scraper.bestand_umziehen import umziehen
from scraper.ranglisten_holen import schreibe_firmen
from scraper.companies import lade_unternehmen
from tests.test_run import firma, stelle, aufbau


def test_verwaiste_private_firma_wird_auch_nicht_neu_eingerichtet(tmp_path,monkeypatch):
    from scraper import einrichtung
    schreibe_firmen(tmp_path/'companies.csv',[])
    monkeypatch.setattr(db,'db_firmen',lambda status=None:[dict(firma('Verwaist'),status='offen',fuer_alle=False,nutzer=0)])
    monkeypatch.setattr(einrichtung,'richte_ein',lambda f:pytest.fail('Verwaiste Firma abgerufen'))
    monkeypatch.setattr(db,'setze_einrichtung',lambda *a:pytest.fail('Verwaiste Firma verändert'))
    einrichtung.lauf(tmp_path,mit_db=True)


def test_privater_abruf_nur_bei_verbleibendem_nutzer_ohne_inhalte_im_bericht(aufbau, monkeypatch, capsys):
    d, tabellen = aufbau([firma('Datei')], {'fake': lambda *a, **kw: [stelle('1')]})
    private = [dict(firma('Vertraulich'),status='aktiv',herkunft='nutzer',fuer_alle=False,nutzer=1),
               dict(firma('Verwaist'),status='aktiv',herkunft='nutzer',fuer_alle=False,nutzer=0)]
    monkeypatch.setattr(db,'db_firmen',lambda status=None:private)
    b = run.lauf('2026-11-20',d)
    assert 'Vertraulich:1' in tabellen['jobs'] and 'Verwaist:1' not in tabellen['jobs']
    for text in [str(b),str(tabellen['laeufe']),(d/'bericht.md').read_text(encoding='utf-8'),capsys.readouterr().out]:
        assert 'Vertraulich' not in text and 'Verwaist' not in text
    assert b['private_firmen'] == {'abgerufen':1,'fehler':0}


def test_oeffentlich_freigegebene_dbfirma_darf_bericht_erscheinen(aufbau,monkeypatch):
    d,t=aufbau([firma('Datei')],{'fake':lambda *a,**kw:[stelle('1')]})
    monkeypatch.setattr(db,'db_firmen',lambda status=None:[dict(firma('Freigegeben'),status='aktiv',fuer_alle=True,nutzer=0)])
    b=run.lauf('2026-11-20',d)
    assert any(z['name']=='Freigegeben' for z in b['firmen'])


def test_db_firmen_016_normalisiert_rpc_ergebnis(monkeypatch):
    monkeypatch.setattr(db,'herkunft_da',lambda:True)
    monkeypatch.setattr(db,'zusatzfirmen_da',lambda:True,raising=False)
    monkeypatch.setattr(db,'_req',lambda m,p,**kw:[{'name':'A','aktiv':True,'status':'aktiv','fuer_alle':False,'nutzer':2}])
    a=db.db_firmen('aktiv')[0]
    assert a['aktiv']=='ja' and a['nutzer']==2 and a['fuer_alle'] is False


def test_bestand_entfernt_csv_erst_nach_atomarem_erfolg(tmp_path,monkeypatch):
    bestand=[dict(firma('A'),quellen=['bestand']),dict(firma('B'),quellen=['bestand','dax'])]
    pfad=tmp_path/'companies.csv';schreibe_firmen(pfad,bestand)
    monkeypatch.setattr(db,'zusatzfirmen_da',lambda:True,raising=False)
    calls=[]
    monkeypatch.setattr(db,'privatisiere_bestand',lambda namen:calls.append(namen) or False,raising=False)
    assert umziehen(bestand,pfad)==bestand
    assert lade_unternehmen(pfad)[0]['name']=='A'
    monkeypatch.setattr(db,'privatisiere_bestand',lambda namen:True)
    result=umziehen(bestand,pfad)
    assert [f['name'] for f in result]==['B'] and result[0]['quellen']==['dax']
    assert [f['name'] for f in lade_unternehmen(pfad)]==['B']
    assert calls==[['A']]


def test_bestand_dbfehler_und_fehlende_migration_lassen_datei_unveraendert(tmp_path,monkeypatch):
    bestand=[dict(firma('A'),quellen=['bestand'])]
    p=tmp_path/'companies.csv';schreibe_firmen(p,bestand);vorher=p.read_bytes()
    monkeypatch.setattr(db,'zusatzfirmen_da',lambda:False,raising=False)
    monkeypatch.setattr(db,'privatisiere_bestand',lambda _:pytest.fail('Keine Migration'),raising=False)
    assert umziehen(bestand,p)==bestand and p.read_bytes()==vorher
    monkeypatch.setattr(db,'zusatzfirmen_da',lambda:True)
    def kaputt(_): raise RuntimeError('nicht ausgeben')
    monkeypatch.setattr(db,'privatisiere_bestand',kaputt)
    with pytest.raises(RuntimeError): umziehen(bestand,p)
    assert p.read_bytes()==vorher


def test_promotionsuebergang_ruft_gleiches_portal_nicht_doppelt_ab(aufbau,monkeypatch):
    calls=[]
    def adapter(kennung,**kw):
        calls.append(kennung); return [stelle('1')]
    d,t=aufbau([firma('Datei')],{'fake':adapter})
    monkeypatch.setattr(db,'db_firmen',lambda status=None:[dict(firma('Anderer Name'),ats_id='Datei',status='aktiv',fuer_alle=True,nutzer=1)])
    run.lauf('2026-11-20',d)
    assert calls==['Datei']


def test_source_promotion_nur_bei_exaktem_portal(monkeypatch):
    monkeypatch.setattr(db,'herkunft_da',lambda:True)
    monkeypatch.setattr(db,'firmen_quellen_da',lambda:True)
    monkeypatch.setattr(db,'zusatzfirmen_da',lambda:True)
    monkeypatch.setattr(db,'db_firmen',lambda status=None:[dict(firma('A'),herkunft='nutzer',fuer_alle=False,nutzer=1)])
    calls=[]
    monkeypatch.setattr(db,'_req',lambda *a,**kw:calls.append((a,kw)))
    db.sync_companies([firma('A')])
    assert calls[0][1]['json']['p_firmen'][0]['fuer_alle'] is True
    with pytest.raises(ValueError,match='Herkunft'):
        db.sync_companies([dict(firma('A'),ats_id='andere')])
    assert len(calls)==1
