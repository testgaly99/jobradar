from types import SimpleNamespace
import pytest
from scraper import gesundheit as g
from tests.test_run import aufbau


@pytest.fixture(autouse=True)
def kuenstliche_laufumgebung(monkeypatch):
    monkeypatch.delenv('GITHUB_RUN_ID',raising=False)
    monkeypatch.delenv('GITHUB_RUN_ATTEMPT',raising=False)


def report(n, datum='2026-11-21', **kw):
    return {'stand':datum,'firmen':[dict(name='Beispiel AG',gefunden=n,fehler='',uebersprungen={},**kw)]}


def test_vorgeschichte_und_genau_halber_rueckgang():
    assert g.pruefe(report(0),[])==[]
    assert g.pruefe(report(5),[report(10,'2026-11-20')])==[]
    assert {p['art'] for p in g.pruefe(report(0),[report(10,'2026-11-20')])}=={'null_stellen','einbruch'}
    assert g.pruefe(report(0),[report(10,'2026-10-20')])==[]


def test_fehler_ungueltige_stellen_und_firmendaten():
    r=report(5,stammdaten={'aktiv':'ja','careers_url':'','ats_typ':'ashby','groesse_klasse':''})
    r['firmen'][0].update(fehler='Abruf: HTTPError: HTTP 500 TOKEN-geheim',uebersprungen={'ohne Titel':2})
    p=g.pruefe(r,[])
    assert {z['art'] for z in p}=={'fehler','ohne_titel_link','firmendaten'}
    assert 'TOKEN-geheim' not in str(p)


def response(daten):
    return SimpleNamespace(ok=True,json=lambda:daten)


def test_issues_nur_datei_maximal_drei_und_offene_kommentieren():
    probleme=[dict(firma=f'Firma {i}',art='fehler',text='HTTP 500',verlauf=[5]) for i in range(6)]
    firmen={f'Firma {i}':dict(herkunft='datei' if i<5 else 'nutzer',careers_url='https://example.org/jobs') for i in range(6)}
    calls=[]
    def post(url,**kw):
        calls.append((url,kw));return response({'number':len(calls),'html_url':'https://github.com/test/repo/issues/1'})
    result=g.melde_issues(probleme,firmen,post=post,get=lambda *a,**kw:response([]),token='synthetisch',repo='test/repo',heute='2026-11-21')
    assert len(calls)==len(result)==3
    calls.clear()
    g.melde_issues(probleme[:1],firmen,post=post,get=lambda *a,**kw:response([{'title':'Scraper defekt: Firma 0','number':42,'state':'open'}]),token='synthetisch',repo='test/repo',heute='2026-11-21')
    assert calls[0][0].endswith('/issues/42/comments')


def test_wieder_in_ordnung_und_tagesgrenze_gelten_bei_wiederholung():
    posts=[]
    offen=[{'title':'Scraper defekt: Beispiel AG','number':42,'state':'open'}]
    g.melde_issues([],{'Beispiel AG':{'herkunft':'datei','careers_url':'https://example.org'}},
        post=lambda u,**kw:posts.append(kw['json']) or response({}),get=lambda *a,**kw:response(offen),
        token='synthetisch',repo='test/repo',heute='2026-11-21',gesund={'Beispiel AG':4})
    assert 'Wieder in Ordnung: 4 Stellen' in posts[0]['body']
    posts.clear()
    erstellt=[dict(title=f'Scraper defekt: Andere {i}',number=i,state='closed',created_at='2026-11-21T04:00:00Z') for i in range(3)]
    g.melde_issues([dict(firma='Beispiel AG',art='fehler',text='x',verlauf=[])],{'Beispiel AG':{'herkunft':'datei'}},
        post=lambda *a,**kw:posts.append(kw),get=lambda *a,**kw:response(erstellt),token='synthetisch',repo='test/repo',heute='2026-11-21')
    assert not posts


def test_main_keine_altmeldungen_und_private_nur_an_berechtigten_admin(monkeypatch):
    from scraper import db,telegram
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[dict(report(0),gesundheit_db_aktuell=True)])
    monkeypatch.setattr(g,'lade_unternehmen',lambda *a:[dict(name='Beispiel AG',aktiv='ja',ats_typ='ashby',careers_url='https://example.org',groesse_klasse='1.000+')])
    monkeypatch.setattr(db,'db_firmen',lambda:[dict(name='Privat A',aktiv='ja',status='aktiv',fuer_alle=False,herkunft='nutzer',careers_url='https://example.org',ats_typ='ashby',groesse_klasse='1.000+')])
    monkeypatch.setattr(db,'lade_firmen_gesundheit',lambda *a:[{'datum':'2026-11-21','bericht':dict(name='Privat A',gefunden=0,fehler='HTTPError HTTP 500')}])
    monkeypatch.setattr(db,'admin_ids',lambda:[{'user_id':'A','telegram_chat_id':'chat-a'},{'user_id':'B','telegram_chat_id':'chat-b'}])
    monkeypatch.setattr(db,'sichtbare_firmen',lambda owner:{'Privat A'} if owner=='A' else set())
    saved=[];sent=[]
    monkeypatch.setattr(db,'ergaenze_lauf',lambda datum,felder:saved.append(felder))
    monkeypatch.setattr(telegram,'sende',lambda text,**kw:sent.append((text,kw)) or True)
    monkeypatch.setattr(g,'melde_issues',lambda *a,**kw:[])
    assert g.main('2026-11-21')==0
    assert 'Privat A' not in str(saved)
    assert len(sent)==1 and sent[0][1]['chat']=='chat-a'
    sent.clear();assert g.main('2026-11-22')==0
    assert len(sent)==1 and 'Privat A' not in sent[0][0] and not sent[0][1]


def test_nachtlauf_diagnosen_bleiben_nur_im_service_speicher(aufbau,monkeypatch):
    from scraper import db,run
    from tests.test_run import firma,stelle
    d,t=aufbau([firma('Datei')],{'fake':lambda *a,**kw:[stelle('1')]})
    monkeypatch.setattr(db,'db_firmen',lambda status=None:[dict(firma('Vertraulich'),status='aktiv',herkunft='nutzer',fuer_alle=False,nutzer=1)])
    gespeichert=[]
    monkeypatch.setattr(db,'speichere_firmen_gesundheit',lambda datum,rows:gespeichert.append((datum,rows)))
    b=run.lauf('2026-11-21',d)
    assert gespeichert[0][0]=='2026-11-21' and gespeichert[0][1][0]['name']=='Vertraulich'
    assert 'Vertraulich' not in str(b) and 'Vertraulich' not in (d/'bericht.md').read_text(encoding='utf-8')


def test_abgebrochene_wiederholung_nimmt_keinen_alten_tagesbericht(monkeypatch):
    from scraper import db,telegram
    monkeypatch.setenv('GITHUB_RUN_ID','lauf-2');monkeypatch.setenv('GITHUB_RUN_ATTEMPT','2')
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[report(0)])
    monkeypatch.setattr(g,'lade_unternehmen',lambda *a:pytest.fail('Alter Bericht ausgewertet'))
    sent=[]
    monkeypatch.setattr(telegram,'sende',lambda text,**kw:sent.append(text) or True)
    assert g.main('2026-11-21')==0
    assert len(sent)==1 and 'Kein aktueller' in sent[0]


def test_fehlgeschlagene_private_diagnose_nimmt_keine_alten_details(monkeypatch):
    from scraper import db
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[dict(report(1),gesundheit_db_aktuell=False)])
    monkeypatch.setattr(g,'lade_unternehmen',lambda *a:[dict(name='Beispiel AG',aktiv='ja',careers_url='https://example.org',ats_typ='ashby',groesse_klasse='1.000+')])
    monkeypatch.setattr(db,'ergaenze_lauf',lambda *a:None)
    monkeypatch.setattr(g,'melde_issues',lambda *a,**kw:[])
    monkeypatch.setattr(db,'db_firmen',lambda:pytest.fail('Alte private Diagnosen gelesen'))
    assert g.main('2026-11-21')==0


def test_systemfehler_meldet_nur_festen_hinweis(monkeypatch):
    from scraper import db,telegram
    def kaputt(n):raise RuntimeError('Privatname und TOKEN')
    monkeypatch.setattr(db,'letzte_laeufe',kaputt)
    sent=[]
    monkeypatch.setattr(telegram,'sende',lambda text,**kw:sent.append(text) or True)
    assert g.main('2026-11-21')==0
    assert len(sent)==1 and 'Privatname' not in sent[0] and 'TOKEN' not in sent[0]
