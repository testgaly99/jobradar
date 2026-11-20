-- 013: Sprachniveau (Design docs/superpowers/specs/2026-11-18-sprachniveau-design.md, Q65–Q68)
-- Verlangtes Deutschniveau je Stelle als Zahl (1 = A1 … 7 = Muttersprache; leer = keine Pflicht-Stufe)
-- und die Einstellung je Nutzer. Mehrfach ausführbar.

begin;

alter table public.jobs add column if not exists deutsch_stufe smallint;
alter table public.jobs drop constraint if exists jobs_deutsch_stufe_bereich;
alter table public.jobs add constraint jobs_deutsch_stufe_bereich check (deutsch_stufe between 1 and 7);
create index if not exists jobs_deutsch_stufe_idx on public.jobs (deutsch_stufe);

-- Eigene Tabelle statt Spalten an listen_felder: dort ist felder "not null", ein Upsert nur der Spracheinstellung ginge nicht.
create table if not exists public.sprach_einstellung (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  zeigen boolean,
  niveau text check (niveau in ('A1','A2','B1','B2','C1','C2','Muttersprache'))
);
alter table public.sprach_einstellung enable row level security;
revoke all on public.sprach_einstellung from anon;
grant select, insert, update on public.sprach_einstellung to authenticated;
drop policy if exists sprach_einstellung_eigene on public.sprach_einstellung;
create policy sprach_einstellung_eigene on public.sprach_einstellung for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- ranking_stellen aus 010 mit zusätzlicher Spalte deutsch_stufe (Rückgabetyp ändert sich, daher drop + create).
drop function if exists public.ranking_stellen(text[]);
create function public.ranking_stellen(p_listen text[])
returns table(
  id text, unternehmen text, titel text, ort text, staedte text[], remote boolean,
  arbeitsmodell text, vertragsart text, abteilung text, erfahrungslevel text, url text,
  erstmals_gesehen date, text text, land text, groesse_klasse text, kategorie text[],
  companies jsonb, rang integer, deutsch_stufe smallint
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  eine_liste boolean;
begin
  if p_listen is null or coalesce(pg_catalog.cardinality(p_listen), 0) not between 1 and 100
     or pg_catalog.array_ndims(p_listen) is distinct from 1 then
    raise exception using errcode = '22023', message = 'Bitte zwischen 1 und 100 gültige Listen auswählen.';
  end if;
  if exists (
    select 1 from pg_catalog.unnest(p_listen) gewaehlt(id)
    where not exists (
      select 1 from public.ranking_listen l
      join public.ranking_ausgaben a on a.liste_id = l.id
      where l.id = gewaehlt.id and public.ranking_ausgabe_aktuell(a.id)
    )
  ) then
    raise exception using errcode = '22023', message = 'Eine ausgewählte Liste ist unbekannt oder nicht mehr verfügbar.';
  end if;
  select count(distinct gewaehlt.id) = 1 into eine_liste from pg_catalog.unnest(p_listen) gewaehlt(id);
  return query
    select j.id, j.unternehmen, j.titel, j.ort, j.staedte, j.remote,
      j.arbeitsmodell, j.vertragsart, j.abteilung, j.erfahrungslevel, j.url,
      j.erstmals_gesehen, j.text, j.land, c.groesse_klasse, c.kategorie,
      pg_catalog.jsonb_build_object('groesse_klasse', c.groesse_klasse, 'kategorie', c.kategorie, 'groesse_rang', c.groesse_rang),
      case when eine_liste then zuordnung.rang else null::integer end,
      j.deutsch_stufe
    from public.jobs j
    join public.companies c on c.name = j.unternehmen and c.aktiv
    join lateral (
      select count(*) as anzahl, min(f.rang) as rang
      from public.ranking_firmen f
      join public.ranking_ausgaben a on a.id = f.ausgabe_id
      where f.unternehmen = j.unternehmen and a.liste_id = any(p_listen)
        and public.ranking_ausgabe_aktuell(a.id)
    ) zuordnung on zuordnung.anzahl > 0
    where j.status = 'offen' and j.sichtbar;
end;
$$;
revoke all on function public.ranking_stellen(text[]) from public, anon, authenticated;
grant execute on function public.ranking_stellen(text[]) to authenticated, service_role;

commit;
