"""Vertragsprüfung der vorbereiteten Migration, keine PostgreSQL-/RLS-Abnahme."""
from pathlib import Path


def test_original_suche_schema_und_service_schreibschutz():
    sql = (Path(__file__).parents[1] / 'supabase/migrations/020_original_suche.sql').read_text(encoding='utf-8')
    for feld in ('portal_link text', 'original_suche text', 'original_vorschlaege jsonb',
                 'original_wahl integer', 'original_portal jsonb', 'original_dublette uuid'):
        assert 'add column if not exists '+feld in sql
    assert "'offen','auswahl','gefunden','nicht_gefunden'" in sql
    assert 'jsonb_array_length(original_vorschlaege)<=5' in sql
    assert "where original_suche='offen'" in sql
    assert 'alter policy' not in sql.lower()
    assert 'function public.ranking_stellen' not in sql
    assert 'setze_original(uuid,uuid,timestamptz,jsonb) from public, anon, authenticated' in sql
    assert 'setze_original(uuid,uuid,timestamptz,jsonb) to service_role' in sql
    assert 'a.owner_id=p_owner' in sql
    assert 'a.geaendert_am=p_stand' in sql
    assert 'a.job_id is null' in sql


def test_original_suche_sperrt_fremde_und_veraltete_schreibfelder():
    sql = (Path(__file__).parents[1] / 'supabase/migrations/020_original_suche.sql').read_text(encoding='utf-8')
    assert "jsonb_object_keys(p_patch)" in sql
    assert "p_patch->>'owner_id'" not in sql
    assert 'pg_advisory_xact_lock' in sql
    assert "errcode='23505'" in sql
    assert 'for update' in sql
    rpc=sql[sql.index('create or replace function public.setze_original'):]
    assert rpc.index('for update')<rpc.index('pg_advisory_xact_lock'), 'Gleiche Sperrreihenfolge wie BEFORE-UPDATE-Trigger'
    assert 'a.id=new.original_dublette and a.owner_id=new.owner_id' in sql
    assert 'new.link is distinct from old.link' in sql


def test_original_dubletten_pruefen_neue_schluessel_und_lassen_verschiedene_jobs_zu():
    sql = (Path(__file__).parents[1] / 'supabase/migrations/020_original_suche.sql').read_text(encoding='utf-8')
    trigger, rpc = sql.split('create or replace function public.setze_original')
    assert "tg_op='UPDATE' and new.owner_id is not distinct from old.owner_id" in trigger
    assert 'neuer_job=case when new.job_id is distinct from old.job_id' in trigger
    assert 'new.link is distinct from old.link and new.link is distinct from old.portal_link' in trigger
    assert 'new.portal_link is distinct from old.link and new.portal_link is distinct from old.portal_link' in trigger
    assert 'neuer_job is not null and a.job_id=neuer_job' in trigger
    assert '(new.job_id is null or a.job_id is null)' in trigger
    assert 'ziel_link is distinct from alt.link and ziel_link is distinct from alt.portal_link' in rpc
    assert 'ziel_portal_link is distinct from alt.link and ziel_portal_link is distinct from alt.portal_link' in rpc
    assert '(ziel_job is null or a.job_id is null)' in rpc
