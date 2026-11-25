"""Original-Suche mit künstlichen Firmen, HTTP-/KI-/DB-Ersatz."""
from copy import deepcopy
import importlib
from types import SimpleNamespace

import pytest

from scraper import db, http, nachruesten
from scraper.quellen import wikidata


def modul():
    return importlib.import_module('scraper.original_suche')


@pytest.fixture
def stand(monkeypatch):
    firma='Private Musterfirma'
    app={'id':'a1','owner_id':'u1','geaendert_am':'2026-11-21T00:00:00Z','firma':firma,'titel':'Data Analyst',
         'standort':None,'link':'https://www.indeed.de/viewjob?jk=1','portal_link':None,'job_id':None,
         'original_suche':'offen','original_wahl':None,'original_vorschlaege':None}
    apps=[app]; patches=[]
    monkeypatch.setattr(db,'bewerbungen_original_offen',lambda limit=20:deepcopy(apps[:limit]),raising=False)
    monkeypatch.setattr(db,'bewerbung_original',lambda id,owner:deepcopy(next((a for a in apps if a['id']==id and a['owner_id']==owner),None)),raising=False)
    def speichern(id,patch,owner,version):
        a=next((a for a in apps if a['id']==id and a['owner_id']==owner),None)
        if not a or a['geaendert_am']!=version or a.get('job_id') or a['original_suche']!='offen':
            return {'status':'veraltet'}
        patches.append((id,deepcopy(patch),owner,version)); a.update(patch)
        return {'status':'gespeichert'}
    monkeypatch.setattr(db,'setze_original',speichern,raising=False)
    monkeypatch.setattr(wikidata,'website_zu_name',lambda name,holen=None:'https://firma.example.invalid',raising=False)
    return SimpleNamespace(app=app,apps=apps,patches=patches)


def ausfuehren(stand, monkeypatch, stellen=None, **kw):
    m=modul()
    monkeypatch.setattr(m,'finde_portal',lambda website,holen=None:{'typ':'greenhouse','id':'muster'})
    if stellen is None:
        stellen=[{'ext_id':'7','titel':'Data Analyst (m/w/d)','ort':'','url':'https://firma.example.invalid/jobs/7',
                  'text':'Öffentliche Anzeige mit Datenanalyse und Reporting.','abschnitte':[{'titel':'Aufgaben','punkte':['Reporting']}]}]
    def pruefe(url):
        assert not nachruesten.ist_portal(__import__('urllib.parse',fromlist=['urlsplit']).urlsplit(url).hostname or '')
    return m.lauf(holen=lambda *a,**kw:pytest.fail('Unerwarteter HTTP-Abruf'),adapter={'greenhouse':lambda id:deepcopy(stellen)},frage=None,pruefe=pruefe,**kw)


def test_eindeutig_nur_bewerbung_snapshot_und_portalherkunft(stand,monkeypatch,capsys):
    erg=ausfuehren(stand,monkeypatch)
    assert erg['gefunden']==1 and stand.app['original_suche']=='gefunden'
    assert stand.app['portal_link']=='https://www.indeed.de/viewjob?jk=1'
    assert stand.app['link']=='https://firma.example.invalid/jobs/7'
    assert stand.app['original_portal']=={'typ':'greenhouse','id':'muster'}
    assert stand.app['snapshot_text'].startswith('Öffentliche Anzeige')
    assert stand.app['snapshot_steckbrief'] is not None
    assert stand.patches[0][2:] == ('u1','2026-11-21T00:00:00Z')
    assert stand.app['firma'] not in capsys.readouterr().out


def test_mehrere_titel_werden_auswahl_keine_stille_uebernahme(stand,monkeypatch):
    stellen=[{'ext_id':str(i),'titel':'Data Analyst','ort':'','url':f'https://firma.example.invalid/jobs/{i}','text':'Text'} for i in range(7)]
    erg=ausfuehren(stand,monkeypatch,stellen)
    assert erg['auswahl']==1 and len(stand.app['original_vorschlaege'])==5
    assert stand.app['link'].startswith('https://www.indeed.de')
    assert all(s['ats_id']=='muster' for s in stand.app['original_vorschlaege'])


def test_wahl_nur_frische_adapterstelle_keine_beliebige_url(stand,monkeypatch):
    stand.app['original_wahl']=0
    stand.app['original_vorschlaege']=[{'titel':'Data Analyst','ort':'','url':'https://firma.example.invalid/jobs/7','ats_typ':'greenhouse','ats_id':'muster','ext_id':'7'}]
    erg=ausfuehren(stand,monkeypatch)
    assert erg['gefunden']==1 and stand.app['original_wahl'] is None
    assert stand.app['original_vorschlaege'] is None


def test_unterstuetztes_portal_fehlt_keine_verknuepfung(stand,monkeypatch):
    m=modul(); monkeypatch.setattr(m,'finde_portal',lambda *a,**kw:{'typ':'unbekannt','id':'muster'})
    erg=m.lauf(holen=lambda *a,**kw:pytest.fail('Abruf'),adapter={},frage=None,pruefe=lambda url:None)
    assert erg['nicht_gefunden']==1 and stand.app['link'].startswith('https://www.indeed.de')


def test_geloeschte_oder_schon_verknuepfte_bewerbung_ueberspringen(stand,monkeypatch):
    m=modul()
    monkeypatch.setattr(db,'bewerbung_original',lambda *a:None)
    assert m.lauf(adapter={},frage=None)['gesucht']==0 and not stand.patches


def test_gleichzeitige_nutzeraenderung_wird_durch_version_abgewiesen(stand,monkeypatch):
    m=modul(); monkeypatch.setattr(m,'finde_portal',lambda *a,**kw:{'typ':'greenhouse','id':'muster'})
    def adapter(id):
        stand.app['geaendert_am']='2026-11-21T01:00:00Z'
        stand.app['titel']='Neue Nutzereingabe'
        return [{'ext_id':'7','titel':'Data Analyst','url':'https://firma.example.invalid/7','text':'Text'}]
    erg=m.lauf(adapter={'greenhouse':adapter},frage=None,pruefe=lambda url:None)
    assert stand.app['titel']=='Neue Nutzereingabe' and not stand.patches
    assert erg['gefunden']==0


def test_aenderung_vor_zweitlesen_startet_keine_alte_suche(stand,monkeypatch):
    def queue(limit=20):
        alt=deepcopy(stand.apps)
        stand.app['geaendert_am']='2026-11-21T02:00:00Z'
        stand.app['link']='https://eigene.example.invalid/neuer-link'
        return alt
    monkeypatch.setattr(db,'bewerbungen_original_offen',queue)
    erg=ausfuehren(stand,monkeypatch)
    assert erg['gesucht']==0 and not stand.patches
    assert stand.app['link']=='https://eigene.example.invalid/neuer-link'


def test_alte_ats_kennung_nach_erfolgloser_suche_nicht_als_neuen_treffer_nutzen():
    from scraper.einrichtung import richte_ein
    calls=[]
    erg=richte_ein({'name':'Muster','website':'https://firma.example.invalid','ats_typ':'greenhouse','ats_id':'altefirma'},
        holen=lambda url:SimpleNamespace(text='',url=url),adapter={'greenhouse':lambda id:calls.append(id) or [{'titel':'Data Analyst','ort':'München'}]})
    assert calls==[] and erg['aktiv']=='nein'


def test_original_queue_filtert_verknuepfte_zeilen_vor_limit(monkeypatch):
    calls=[]
    monkeypatch.setattr(db,'_req',lambda m,pfad,**kw:calls.append((pfad,kw['params'])) or ([{'user_id':'admin'}] if pfad=='admins' and not kw['params'].get('offset') else []))
    assert db.bewerbungen_original_offen()==[]
    bewerbungen=[p for pfad,p in calls if pfad=='applications']
    assert len(bewerbungen)==2 and all(p['job_id']=='is.null' for p in bewerbungen) and bewerbungen[0]['limit']==20


def test_hoechstens_20_suchen(stand,monkeypatch):
    stand.apps[:]=[{**stand.app,'id':str(i)} for i in range(25)]
    erg=ausfuehren(stand,monkeypatch)
    assert erg['gesucht']==20 and len(stand.patches)==20


def test_fehler_mit_privaten_angaben_niemals_im_log(stand,monkeypatch,capsys):
    m=modul()
    monkeypatch.setattr(wikidata,'website_zu_name',lambda *a,**kw:(_ for _ in ()).throw(ValueError(stand.app['firma'])))
    m.lauf(adapter={},frage=None,pruefe=lambda url:None)
    assert stand.app['firma'] not in capsys.readouterr().out


def test_dnsfehler_irrelevanter_stelle_verhindert_eindeutigen_treffer_nicht(stand,monkeypatch):
    import socket
    m=modul();monkeypatch.setattr(m,'finde_portal',lambda *a,**kw:{'typ':'greenhouse','id':'muster'})
    def pruefe(url):
        if 'kaputt' in url:raise socket.gaierror('Veraltet')
    jobs=[{'ext_id':'1','titel':'Data Analyst','url':'https://firma.example.invalid/1','text':'Anzeige'},
          {'ext_id':'2','titel':'Controller','url':'https://kaputt.example.invalid/2','text':'Anzeige'}]
    erg=m.lauf(adapter={'greenhouse':lambda id:jobs},frage=None,pruefe=pruefe)
    assert erg['gefunden']==1


@pytest.mark.parametrize('url', [
    'https://127.0.0.1/job', 'https://1.1.1.1/job', 'https://127.1/job',
    'https://0x7f000001/job', 'https://2130706433/job',
    'https://[2001:4860:4860::8888]/job',
    'https://%65xample.invalid/job', 'https://@example.invalid/job', 'https://:@example.invalid/job',
    'https://localhost/job', 'https://a.localhost./job',
    'https://example.invalid/job\x00', 'https://example.invalid/job\x7f',
    'https://./job', 'https://../job', 'https://career..example.invalid/job', 'https://example.invalid../job',
])
def test_externe_vorschlaege_benutzen_domaenen_ohne_rohe_hostsonderformen(url):
    m=modul()
    assert not m._stelle_ok({'titel':'Data Analyst','url':url,'ext_id':'1'})
    assert not m._portal_ok({'typ':'sitemap','id':url+'#/job/'})


def test_wikidata_website_nur_ein_deutliches_unternehmen(monkeypatch):
    def antwort(rows):
        return {'results':{'bindings':[{k:{'value':v} for k,v in r.items()} for r in rows]}}
    fn=getattr(wikidata,'website_zu_name',None); assert callable(fn)
    queries=[]
    def mehrdeutig(query,holen=None):
        queries.append(query)
        return antwort([
        {'firma':'http://www.wikidata.org/entity/Q1','website':'https://a.example.invalid'},
        {'firma':'http://www.wikidata.org/entity/Q2','website':'https://b.example.invalid'}])
    monkeypatch.setattr(wikidata,'abfrage',mehrdeutig)
    assert fn('Musterfirma') is None
    assert 'SAMPLE' not in queries[0]
    monkeypatch.setattr(wikidata,'abfrage',lambda *a,**kw:antwort([
        {'firma':'http://www.wikidata.org/entity/Q1','website':'https://a.example.invalid'},
        {'firma':'http://www.wikidata.org/entity/Q1','website':'https://a.example.invalid'}]))
    assert fn('Musterfirma')=='https://a.example.invalid'


def test_http_kontext_prueft_auch_adapterweiterleitungen(monkeypatch):
    schutz=getattr(http,'zielschutz',None); assert callable(schutz)
    http._robots.clear();http._zuletzt.clear()
    monkeypatch.setattr(http.time,'sleep',lambda _:None)
    import requests
    calls=[]
    def get(url,**kw):
        calls.append(url);r=requests.Response();r.url=url;r._content=b'';r._content_consumed=True
        r.status_code=404 if url.endswith('robots.txt') else 302
        r.headers['Location']=ziel[0]
        return r
    monkeypatch.setattr(requests,'get',get)
    def pruefe(url):
        if 'intern' in url:raise ValueError('Intern')
    ziel=['https://intern.example.invalid/x']
    with schutz(pruefe),pytest.raises(ValueError,match='Intern'):
        http.hole('https://firma.example.invalid/jobs')
    assert calls==['https://firma.example.invalid/robots.txt','https://firma.example.invalid/jobs']
    # Weiterleitung auf ein Jobportal stoppt die zentrale Sperre, auch ohne eigene Prüfung (Review 2026-11-24)
    calls.clear();http._robots.clear();ziel[0]='https://www.indeed.de/viewjob?jk=9'
    with pytest.raises(http.Jobportal):
        http.hole('https://firma.example.invalid/jobs')
    assert not any('indeed' in u for u in calls)


def test_fehlende_migration_020_kontrolliert(monkeypatch,capsys):
    m=modul()
    def req(*a,**kw):raise RuntimeError('Supabase GET applications: 400 42703')
    monkeypatch.setattr(db,'_req',req)
    erg=m.lauf(adapter={},frage=None)
    assert erg['gesucht']==0 and '020' in capsys.readouterr().out
    from scraper import run
    assert run._original_suche()['gesucht']==0
    assert '020' in capsys.readouterr().out


def test_tageslauf_bindet_suche_nach_nachruesten_ein(monkeypatch,capsys):
    from scraper import run
    m=modul()
    fn=getattr(run,'_original_suche',None);assert callable(fn)
    monkeypatch.setattr(m,'lauf',lambda:(_ for _ in ()).throw(ValueError('Private Musterfirma')))
    assert fn()=={}
    assert 'Private Musterfirma' not in capsys.readouterr().out
    from pathlib import Path
    s=Path(run.__file__).read_text(encoding='utf-8')
    assert s.index('bericht["nachruesten"] = _nachruesten()')<s.index('bericht["original_suche"] = _original_suche()')
