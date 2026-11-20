"""Offline-Vertragsprüfung der Migration, keine Behauptung einer SQL-Ausführung."""
from pathlib import Path
import re


def sql():
    return (Path(__file__).parents[1] / 'supabase/migrations/015_ranglisten_sichtbarkeit.sql').read_text(encoding='utf-8').lower()


def test_015_admins_rls_und_geschlossene_schreibrechte():
    s = sql()
    assert 'create table if not exists public.admins' in s
    assert 'telegram_chat_id text' in s
    assert 'alter table public.admins enable row level security' in s
    assert 'revoke all on public.admins from public, anon, authenticated' in s
    assert 'auth.uid()' in s and "security definer set search_path = ''" in s
    assert '@' not in s
    for fn in ['public.ist_admin()', 'public.ranking_ausgabe_aktuell(text)',
               'public.ranking_kategorien(text[])', 'public.speichere_handliste(jsonb)',
               'public.importiere_ranking_ausgabe(jsonb)']:
        assert f'revoke all on function {fn} from public, anon, authenticated' in s
    assert 'grant execute on function public.speichere_handliste(jsonb) to service_role' in s


def test_015_kategorien_leaken_keine_listenmetadaten():
    s = sql()
    f = s[s.index('create or replace function public.ranking_kategorien'):]
    f = f[:f.index('$$;')]
    assert 'returns table(unternehmen text, kategorie text)' in f
    assert 'auth.uid() is not null' in f
    assert 'c.aktiv' in f and "a.sichtbarkeit" not in f
    assert 'current_date < a.gueltig_bis' in f
    assert 'neuer.jahr' in f


def test_015_atomare_importe_benannte_spalten_und_teilimportschutz():
    s = sql()
    assert 'values(a.*)' not in s
    assert 'pg_advisory_xact_lock' in s
    assert 'on conflict(ausgabe_id, unternehmen) do nothing' in s
    assert 'rang is distinct from' in s
    assert 'metadaten widersprechen' in s
    assert 'on conflict(name) do nothing' in s
    assert "check (sichtbarkeit in ('admin','angemeldet'))" in s
    assert "check (herkunft in ('datei','admin','nutzer'))" in s


def test_015_bricht_nach_016_ab_bevor_es_etwas_aendert():
    # Erneutes 015 nach 016 ersetzte ranking_kategorien/sync_dateifirmen durch Fassungen ohne Privatschutz
    # (in der Wegwerf-Datenbank nachgewiesen, 2026-11-20). Die Sperre muss vor der ersten Änderung stehen.
    s = sql()
    sperre = s.index("to_regclass('public.firmen_sichtbar') is not null")
    assert s.index('begin;') < sperre < s.index('create table if not exists public.admins')


def test_015_sql_abnahme_rolle_und_rollback_vorbereitet():
    p = Path(__file__).parent / 'sql/ranglisten_sichtbarkeit.sql'
    s = p.read_text(encoding='utf-8').lower()
    assert "current_setting('jobradar.offline_test', true)" in s
    assert 'set local role authenticated' in s
    assert 'rollback;' in s and 'rangkonflikt' in s
