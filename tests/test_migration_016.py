"""Verträge der vorbereiteten Migration, kein Ersatz für PostgreSQL/RLS-Abnahme."""
from pathlib import Path


def sql():
    return (Path(__file__).parents[1] / 'supabase/migrations/016_zusatzfirmen.sql').read_text(encoding='utf-8').lower()


def test_016_firmen_und_stellen_rechte_ersetzen_ohne_altfreigabe():
    s = sql()
    assert 'add column if not exists fuer_alle boolean not null default true' in s
    for policy, table in [('companies_select', 'companies'), ('companies_select_anon', 'companies'),
                          ('jobs_select', 'jobs'), ('jobs_select_anon', 'jobs')]:
        assert f'drop policy if exists {policy} on public.{table}' in s
    assert 'public.firma_sichtbar(unternehmen)' in s
    assert 'jobs.status' in s or "status = 'offen'" in s
    assert 'public.applications' in s  # geschlossene eigene Bewerbungen weiter zugänglich
    assert "security definer set search_path = ''" in s


def test_016_service_funktionen_lesen_auth_users_nicht():
    # service_role darf auth.users bei Supabase nicht lesen; live 2026-11-20 schlug „Eigene Firma hinzufügen“ daran fehl.
    s = sql()
    assert 'from auth.users' not in s


def test_016_nutzerzeilen_nur_eigene_und_kaskade():
    s = sql()
    assert 'create table if not exists public.firmen_sichtbar' in s
    assert 'references auth.users on delete cascade' in s
    assert 'on update cascade on delete cascade' in s
    assert 'owner_id = auth.uid()' in s
    assert 'revoke all on public.firmen_sichtbar from public, anon, authenticated' in s
    assert 'grant select, delete on public.firmen_sichtbar to authenticated' in s
    assert 'grant insert on public.firmen_sichtbar to authenticated' not in s


def test_016_atomic_limit_identitaet_und_meldung_ohne_nutzeridentitaeten():
    s = sql()
    assert 'pg_advisory_xact_lock' in s
    assert "'limit'" in s and '>= 50' in s
    assert 'from public.admins where user_id = p_owner' in s
    assert 'c.ats_typ = p_typ and c.ats_id = p_id' in s
    for fn in ['zusatzfirma_hinzufuegen(uuid,text,text,text,text)',
               'zusatzfirma_freigeben(uuid,text,boolean)', 'zusatzfirmen_meldung()',
               'bestand_privatisieren(text[])']:
        assert f'revoke all on function public.{fn} from public, anon, authenticated' in s
        assert f'grant execute on function public.{fn} to service_role' in s
    meldung = s[s.index('create or replace function public.zusatzfirmen_meldung'):]
    meldung = meldung[:meldung.index('$$;')]
    projection = meldung[meldung.index('returns table'):meldung.index('language sql')]
    assert 'owner_id' not in projection and 'email' not in projection


def test_016_kategorien_und_dateipromotion_keine_namensannahme():
    s = sql()
    fn = s[s.index('create or replace function public.ranking_kategorien'):]
    fn = fn[:fn.index('$$;')]
    assert 'public.firma_sichtbar(f.unternehmen)' in fn
    assert 'sync_dateifirmen' in s and 'fuer_alle = true' in s
    assert 'identitaetskollision' in s
    assert "quellen = array['bestand']::text[]" in s
    assert "fuer_alle=true,herkunft='datei'" in s
    assert 'veraltete dateien' in s


def test_016_abnahme_fuer_echte_rechte_vorbereitet():
    p = Path(__file__).parent / 'sql/zusatzfirmen.sql'
    s = p.read_text(encoding='utf-8').lower()
    assert "current_setting('jobradar.offline_test', true)" in s
    assert 'set local role authenticated' in s and 'set local role anon' in s
    assert 'public.facetten()' in s and 'public.ranking_kategorien' in s
    assert 'rollback;' in s and 'limit' in s
