from types import SimpleNamespace

from scraper import telegram


def ok(*a, **kw):
    return SimpleNamespace(ok=True, json=lambda: {'ok': True})


def test_ohne_secrets_und_explizit_kein_chat(monkeypatch):
    monkeypatch.setenv('TELEGRAM_CHAT_ID', 'system-test')
    calls=[]
    assert not telegram.sende('nicht senden', token=None, post=lambda *a, **kw:calls.append(kw))
    assert not telegram.sende('nicht senden', token='synthetisch', chat=None, post=lambda *a, **kw:calls.append(kw))
    assert not calls


def test_lange_nachricht_und_unicode_sicher_geteilt():
    calls=[]
    def post(url, **kw):
        calls.append(kw['json'])
        return ok()
    assert telegram.sende('a'*9000, post=post,token='synthetisch',chat='eins')
    assert len(calls)==3 and ''.join(c['text'] for c in calls)=='a'*9000
    calls.clear()
    assert telegram.sende('😀'*3000,post=post,token='synthetisch',chat='eins')
    assert all(len(c['text'].encode('utf-16-le'))//2<=4096 for c in calls)
    assert all(c['disable_web_page_preview'] for c in calls)


def test_fehler_keine_ausnahme_und_keine_geheimnisse(capsys):
    geheim='synthetischer-token-nicht-loggen'
    assert not telegram.sende('privater Inhalt', post=lambda *a, **kw:SimpleNamespace(ok=False),token=geheim,chat='chatprivat')
    def kaputt(*a, **kw):
        raise RuntimeError(geheim+' privater Inhalt chatprivat')
    assert not telegram.sende('privater Inhalt',post=kaputt,token=geheim,chat='chatprivat')
    out=capsys.readouterr()
    assert all(s not in out.out+out.err for s in [geheim,'privater Inhalt','chatprivat'])


def test_http_200_telegram_fehler_gilt_nicht_als_versandt():
    assert not telegram.sende('a',post=lambda *a,**kw:SimpleNamespace(ok=True,json=lambda:{'ok':False}),token='test',chat='test')
