from scraper import digest, db, telegram
import pytest


@pytest.fixture(autouse=True)
def keine_geerbte_workflow_kennung(monkeypatch):
    monkeypatch.delenv('GITHUB_RUN_ID',raising=False)
    monkeypatch.delenv('GITHUB_RUN_ATTEMPT',raising=False)
    monkeypatch.setattr(db,'digest_fenster',lambda owner,initial:{'ab':initial,'gesendet_ids':[]},raising=False)
    monkeypatch.setattr(db,'digest_erfolg',lambda owner,ids,ab:None,raising=False)


def job(name='A',titel='Datenanalyst',id='A:1'):
    return dict(unternehmen=name,titel=titel,id=id)


def test_wortanfang_statt_beliebiger_teilzeichenfolge():
    assert digest.passt(job(),set(),['Daten'])
    assert not digest.passt(job(),set(),['Data','analyst'])
    assert digest.passt(job(titel='C++ Entwickler'),set(),['C++'])
    assert digest.passt(job(),{'A'},[])


def test_text_zwanzig_eintraege_rest_und_url_kodierung():
    text=digest.text([job(id='A/ B:1')]*25,3,'https://example.invalid/')
    assert text.count('Datenanalyst')==20
    assert '8 weitere neue Stellen' in text and 'seit=heute' not in text
    assert '/stellen/A%2F%20B%3A1' in text


def test_zwei_admins_nur_eigene_sichtbare_zeilen(monkeypatch):
    monkeypatch.setenv('SEITE_URL','https://example.invalid')
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[{'stand':'2026-11-21'},{'stand':'2026-11-20'}],raising=False)
    monkeypatch.setattr(db,'admin_ids',lambda:[{'user_id':'a','telegram_chat_id':'chat-a'},{'user_id':'b','telegram_chat_id':'chat-b'},{'user_id':'c','telegram_chat_id':None}],raising=False)
    monkeypatch.setattr(db,'neue_stellen_seit',lambda d:[job('A'),job('B'),job('Geheim')],raising=False)
    monkeypatch.setattr(db,'sichtbare_firmen',lambda owner:{owner.upper()},raising=False)
    monkeypatch.setattr(db,'wunsch_und_stichwoerter',lambda owner:({owner.upper()},[]),raising=False)
    sends=[]
    monkeypatch.setattr(telegram,'sende',lambda text,**kw:sends.append((text,kw)) or True)
    assert digest.main('2026-11-21')==0
    assert len(sends)==2
    assert [s[1]['chat'] for s in sends]==['chat-a','chat-b']
    assert 'A –' in sends[0][0] and 'B –' not in sends[0][0]
    assert all('Geheim' not in s[0] for s in sends)
    assert all('weitere' not in s[0] for s in sends)  # private Fremdstellen auch nicht mitzählen


def test_versandfehler_und_fehlender_chat_verlieren_keinen_vortag(monkeypatch):
    monkeypatch.setenv('SEITE_URL','https://example.invalid')
    tag=['2026-11-21']; chats=[None]; nachrichten=[]; fenster={}; delivered=set()
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[{'stand':tag[0]},{'stand':'2026-11-20' if tag[0]=='2026-11-21' else '2026-11-21'}])
    monkeypatch.setattr(db,'admin_ids',lambda:[{'user_id':'a','telegram_chat_id':chats[0]}])
    def seed(owner,initial):
        fenster.setdefault(owner,initial)
        return {'ab':fenster[owner],'gesendet_ids':list(delivered)}
    monkeypatch.setattr(db,'digest_fenster',seed)
    monkeypatch.setattr(db,'neue_stellen_seit',lambda ab:[job('A',id='Tag1')] if ab<'2026-11-21' else [])
    monkeypatch.setattr(db,'sichtbare_firmen',lambda owner:{'A'})
    monkeypatch.setattr(db,'wunsch_und_stichwoerter',lambda owner:({'A'},[]))
    monkeypatch.setattr(telegram,'sende',lambda text,**kw:nachrichten.append(text) or False)
    monkeypatch.setattr(db,'digest_erfolg',lambda *a:pytest.fail('Fehlschlag darf keinen Versand bestätigen'))
    digest.main(tag[0]);assert fenster['a']=='2026-11-20' and not nachrichten
    chats[0]='chat-a';digest.main(tag[0]);assert len(nachrichten)==1
    tag[0]='2026-11-22';digest.main(tag[0]);assert len(nachrichten)==2 and 'Tag1' in nachrichten[-1]


def test_zwei_laeufe_am_selben_tag_senden_nur_neue_ids(monkeypatch):
    monkeypatch.setenv('SEITE_URL','https://example.invalid')
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[{'stand':'2026-11-21'},{'stand':'2026-11-20'}])
    monkeypatch.setattr(db,'admin_ids',lambda:[{'user_id':'a','telegram_chat_id':'chat-a'}])
    geliefert=set();jobs=[job('A',id='eins')];gesendet=[]
    monkeypatch.setattr(db,'digest_fenster',lambda owner,initial:{'ab':'2026-11-20','gesendet_ids':list(geliefert)})
    monkeypatch.setattr(db,'digest_erfolg',lambda owner,ids,ab:geliefert.update(ids))
    monkeypatch.setattr(db,'neue_stellen_seit',lambda ab:jobs)
    monkeypatch.setattr(db,'sichtbare_firmen',lambda owner:{'A'})
    monkeypatch.setattr(db,'wunsch_und_stichwoerter',lambda owner:({'A'},[]))
    monkeypatch.setattr(telegram,'sende',lambda text,**kw:gesendet.append(text) or True)
    digest.main('2026-11-21');jobs.append(job('A',id='zwei'));digest.main('2026-11-21')
    assert len(gesendet)==2 and '/stellen/eins' not in gesendet[1] and '/stellen/zwei' in gesendet[1]


def test_alter_fehlgeschlagener_lauf_keine_veraltete_nachricht(monkeypatch):
    monkeypatch.setenv('SEITE_URL','https://example.invalid')
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[{'stand':'2026-11-20'}],raising=False)
    monkeypatch.setattr(db,'admin_ids',lambda:[],raising=False)
    monkeypatch.setattr(telegram,'sende',lambda *a,**kw:(_ for _ in ()).throw(AssertionError('Versand verboten')))
    assert digest.main('2026-11-21')==0


def test_keine_admins_oder_keine_neuen_stellen_keine_nachricht(monkeypatch):
    monkeypatch.setenv('SEITE_URL','https://example.invalid')
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[{'stand':'2026-11-21'}],raising=False)
    monkeypatch.setattr(db,'admin_ids',lambda:[],raising=False)
    monkeypatch.setattr(telegram,'sende',lambda *a,**kw:(_ for _ in ()).throw(AssertionError('Versand verboten')))
    assert digest.main('2026-11-21')==0


def test_fehlgeschlagene_wiederholung_am_selben_tag_nutzt_nie_altbericht(monkeypatch):
    monkeypatch.setenv('SEITE_URL','https://example.invalid')
    monkeypatch.setenv('GITHUB_RUN_ID','lauf-neu')
    monkeypatch.setenv('GITHUB_RUN_ATTEMPT','2')
    b={'stand':'2026-11-21','workflow_lauf':{'id':'lauf-neu','versuch':'1'}}
    monkeypatch.setattr(db,'letzte_laeufe',lambda n:[b])
    monkeypatch.setattr(db,'admin_ids',lambda:pytest.fail('Alter Bericht wurde weiterverarbeitet'))
    assert digest.main('2026-11-21')==0
    b['workflow_lauf']={'id':'lauf-alt','versuch':'2'}
    assert digest.main('2026-11-21')==0
