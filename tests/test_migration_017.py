from pathlib import Path


def test_017_own_tables_limit_visibility_and_service_only_health():
    s=(Path(__file__).parents[1]/'supabase/migrations/017_wunschfirmen.sql').read_text(encoding='utf-8').lower()
    for table in ['wunschfirmen','abgleich_stichwoerter','firmen_gesundheit']:
        assert f'create table if not exists public.{table}' in s
        assert f'alter table public.{table} enable row level security' in s
    assert 'public.firma_sichtbar(unternehmen)' in s
    assert 'pg_advisory_xact_lock' in s and '>= 50' in s
    assert 'lower(btrim(begriff))' in s
    assert 'revoke all on public.firmen_gesundheit from public, anon, authenticated' in s
    assert 'grant select on public.firmen_gesundheit to authenticated' not in s
    assert 'on delete cascade' in s and 'on update cascade' in s
    assert 'create table if not exists public.digest_stand' in s
    assert 'create table if not exists public.digest_versand' in s
    assert 'revoke all on public.digest_stand,public.digest_versand from public, anon, authenticated' in s
    assert 'grant execute on function public.digest_erfolg(uuid,text[],date) to service_role' in s
    assert "j.erstmals_gesehen>grenze" in s


def test_db_helpers_preserve_report_fields_and_filter_private(monkeypatch):
    from scraper import db
    calls=[]
    def req(method,path,**kw):
        calls.append((method,path,kw))
        if method=='GET': return [{'datum':'2026-11-21','bericht':{'stand':'2026-11-21','firmen':[{'name':'A'}]}}]
        return None
    monkeypatch.setattr(db,'_req',req)
    db.ergaenze_lauf('2026-11-21',{'gesundheit':[]})
    assert calls[-1][2]['json']['bericht']['firmen']==[{'name':'A'}]
    assert calls[-1][2]['params']['datum']=='eq.2026-11-21'


def test_health_store_drops_raw_or_personal_extra_fields(monkeypatch):
    from scraper import db
    calls=[]
    monkeypatch.setattr(db,'_req',lambda *a,**kw:calls.append((a,kw)))
    db.speichere_firmen_gesundheit('2026-11-21',[dict(name='Privat',gefunden=2,fehler='',snapshot_text='nie speichern',owner_id='nie speichern')])
    payload=calls[-1][1]['json']['p_berichte']
    assert 'snapshot_text' not in str(payload) and 'owner_id' not in str(payload)
    assert payload[0]['name']=='Privat'
