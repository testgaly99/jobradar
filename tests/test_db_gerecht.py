"""Befund 6 / Q307: Nachtläufe gerecht je Konto; Admin-Konten immer zuerst, sonst höchstens 5 je Konto und Nacht."""
from scraper import db
from tests.fakedb import _in

ADMIN = 'admin-1'


def fake_mit(zeilen):
    def req(method, pfad, params=None, **kw):
        params = params or {}
        if pfad == 'admins':
            return [{'user_id': ADMIN, 'telegram_chat_id': None}][params.get('offset', 0):]
        assert method == 'GET' and pfad == 'applications'
        rows = [dict(z) for z in sorted(zeilen, key=lambda z: (z['erstellt_am'], z['id']))]
        o = params.get('owner_id', '')
        if o.startswith('in.('):
            rows = [z for z in rows if z['owner_id'] in _in(o)]
        elif o.startswith('not.in.('):
            rows = [z for z in rows if z['owner_id'] not in _in(o[4:])]
        for k in ('nachruesten', 'original_suche'):
            if k in params:
                rows = [z for z in rows if str(z.get(k)).lower() == params[k][3:]]
        return rows[params.get('offset', 0):][:params.get('limit', 10**6)]
    return req


def zeile(i, owner, alt='2026-11-20', **kw):
    return dict(id=f'{owner}-{i}', owner_id=owner, erstellt_am=alt, link='https://x.example/j', firma=None,
                nachruesten=True, original_suche='offen', job_id=None, **kw)


def test_fremdes_konto_verdraengt_admin_nicht(monkeypatch):
    # 100 fremde Einträge mit absichtlich uraltem Datum vor 3 eigenen: alle eigenen kommen dran, fremd höchstens 5
    zeilen = [zeile(i, 'fremd', alt='2000-01-01') for i in range(100)] + [zeile(i, ADMIN) for i in range(3)]
    monkeypatch.setattr(db, '_req', fake_mit(zeilen))
    for gewaehlt in (db.bewerbungen_zum_nachruesten(), db.bewerbungen_original_offen()):
        konten = [z['owner_id'] for z in gewaehlt]
        assert konten.count(ADMIN) == 3 and konten.count('fremd') == 5


def test_mehrere_konten_kommen_reihum_dran(monkeypatch):
    zeilen = [zeile(i, 'a', alt='2001-01-01') for i in range(30)] + [zeile(i, 'b') for i in range(2)]
    monkeypatch.setattr(db, '_req', fake_mit(zeilen))
    konten = [z['owner_id'] for z in db.bewerbungen_zum_nachruesten()]
    assert konten.count('a') == 5 and konten.count('b') == 2


def test_gesamtgrenze_bleibt(monkeypatch):
    zeilen = [zeile(i, ADMIN) for i in range(30)] + [zeile(i, f'k{i}') for i in range(30)]
    monkeypatch.setattr(db, '_req', fake_mit(zeilen))
    assert len(db.bewerbungen_original_offen()) == 20 and len(db.bewerbungen_zum_nachruesten()) == 50


def test_anforderungen_admin_zuerst(monkeypatch):
    zeilen = [dict(id='f1', owner_id='fremd'), dict(id='e1', owner_id=ADMIN)]
    monkeypatch.setattr(db, '_alle_zeilen', lambda t, p: [{'user_id': ADMIN}] if t == 'admins' else [dict(z) for z in zeilen])
    assert [z['id'] for z in db.anforderungen_bewerbungen()] == ['e1', 'f1']
