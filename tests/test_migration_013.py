"""Migration 013 (Sprachniveau) als Text geprüft; läuft ohne Datenbank."""
import re
from pathlib import Path

SQL = (Path(__file__).parent.parent / "supabase/migrations/013_sprachniveau.sql").read_text(encoding="utf-8").lower()
FN = "public.ranking_stellen(text[])"


def test_spalte_deutsch_stufe_mit_grenzen_und_index():
    assert "alter table public.jobs add column if not exists deutsch_stufe smallint" in SQL
    assert re.search(r"check \(deutsch_stufe between 1 and 7\)", SQL)
    assert "create index if not exists" in SQL and "(deutsch_stufe)" in SQL


def test_spracheinstellung_eigene_zeile_mit_rls():
    assert "create table if not exists public.sprach_einstellung" in SQL
    assert "owner_id uuid primary key default auth.uid() references auth.users on delete cascade" in SQL
    assert "check (niveau in ('a1','a2','b1','b2','c1','c2','muttersprache'))" in SQL
    assert "alter table public.sprach_einstellung enable row level security" in SQL
    assert "revoke all on public.sprach_einstellung from anon" in SQL
    assert "grant select, insert, update on public.sprach_einstellung to authenticated" in SQL
    assert "using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))" in SQL


def test_ranking_stellen_neu_mit_spalte_und_rechten():
    drop, neu = SQL.index(f"drop function if exists {FN}"), SQL.index("create function public.ranking_stellen(p_listen text[])")
    assert drop < neu
    rueckgabe = SQL[neu:SQL.index("language plpgsql", neu)]
    assert "deutsch_stufe smallint" in rueckgabe
    assert "j.deutsch_stufe" in SQL[neu:]
    assert SQL.index(f"revoke all on function {FN} from public, anon, authenticated") > neu
    assert SQL.index(f"grant execute on function {FN} to authenticated, service_role") > neu
    assert "security invoker" in SQL[neu:] and "set search_path = ''" in SQL[neu:]
