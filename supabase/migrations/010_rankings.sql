-- Ranglisten-Unterbau: absichtlich ohne echte Ranglisten, Firmenzuordnungen oder Quellenabrufe.
-- Nur als Datei vorbereitet. Später vom Nutzer im Supabase SQL Editor ausführen.
-- Migration 005 (jobs.land) wird vorausgesetzt. Mehrfach ausführbar.
-- Enthält auch die globale Größensortierung (Spalte groesse_rang); ranking_stellen wird nur hier definiert.

create table if not exists public.ranking_listen (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  herausgeber text not null check (length(btrim(herausgeber)) between 1 and 200),
  aktiv boolean not null default false
);

create table if not exists public.ranking_ausgaben (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  liste_id text not null references public.ranking_listen(id) on update cascade on delete cascade,
  jahr integer not null check (jahr between 1 and 9999),
  veroeffentlicht_am date not null,
  geprueft_am date not null,
  quelle_url text not null check (
    length(quelle_url) <= 2000 and quelle_url ~ '^https://([a-zA-Z0-9][a-zA-Z0-9.-]*|\[[0-9a-fA-F:.]+\])(:[0-9]{1,5})?([/?#][^[:space:]<>"\\]*)?$'
  ),
  lizenz text not null check (length(btrim(lizenz)) between 1 and 1000),
  gueltig_bis date not null,
  freigegeben boolean not null default false,
  check (geprueft_am >= veroeffentlicht_am and geprueft_am < gueltig_bis),
  check (gueltig_bis > veroeffentlicht_am),
  check (gueltig_bis <= (veroeffentlicht_am + interval '13 months')::date)
);
create index if not exists ranking_ausgaben_liste_datum_idx
  on public.ranking_ausgaben(liste_id, veroeffentlicht_am desc, id desc);

create table if not exists public.ranking_firmen (
  ausgabe_id text not null references public.ranking_ausgaben(id) on update cascade on delete cascade,
  unternehmen text not null references public.companies(name) on update cascade on delete restrict,
  rang integer check (rang > 0),
  primary key (ausgabe_id, unternehmen)
);
create index if not exists ranking_firmen_unternehmen_idx on public.ranking_firmen(unternehmen);

alter table public.ranking_listen enable row level security;
alter table public.ranking_ausgaben enable row level security;
alter table public.ranking_firmen enable row level security;

revoke all on public.ranking_listen, public.ranking_ausgaben, public.ranking_firmen from public, anon, authenticated;
grant select on public.ranking_listen, public.ranking_ausgaben, public.ranking_firmen to authenticated;
grant select, insert, update, delete on public.ranking_listen, public.ranking_ausgaben, public.ranking_firmen to service_role;

-- Bewusste, eng begrenzte Ausnahme von security invoker:
-- Eine RLS-Policy mit einer Unterabfrage auf ranking_ausgaben selbst würde rekursieren.
-- Diese boolesche Prüfung liest ausschließlich Ranglistenmetadaten, niemals Nutzerdaten.
-- Der migrationsausführende Tabellenbesitzer muss auch Besitzer dieser Funktion bleiben.
-- Keine beliebige Tabelle/SQL/Eingabe als auszuführender Text, leerer search_path.
create or replace function public.ranking_ausgabe_aktuell(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.ranking_ausgaben a
    join public.ranking_listen l on l.id = a.liste_id
    where a.id = p_id and l.aktiv and a.freigegeben
      and a.veroeffentlicht_am <= current_date and current_date < a.gueltig_bis
      and current_date < (a.veroeffentlicht_am + interval '13 months')::date
      and not exists (
        select 1 from public.ranking_ausgaben neuer
        where neuer.liste_id = a.liste_id and neuer.freigegeben
          and neuer.veroeffentlicht_am <= current_date
          and (neuer.veroeffentlicht_am, neuer.id) > (a.veroeffentlicht_am, a.id)
      )
  );
$$;
revoke all on function public.ranking_ausgabe_aktuell(text) from public, anon, authenticated;
grant execute on function public.ranking_ausgabe_aktuell(text) to authenticated, service_role;

drop policy if exists ranking_listen_lesen on public.ranking_listen;
create policy ranking_listen_lesen on public.ranking_listen for select to authenticated using (
  aktiv and exists (
    select 1 from public.ranking_ausgaben a
    where a.liste_id = ranking_listen.id and public.ranking_ausgabe_aktuell(a.id)
  )
);
drop policy if exists ranking_ausgaben_lesen on public.ranking_ausgaben;
create policy ranking_ausgaben_lesen on public.ranking_ausgaben for select to authenticated
  using (public.ranking_ausgabe_aktuell(id));
drop policy if exists ranking_firmen_lesen on public.ranking_firmen;
create policy ranking_firmen_lesen on public.ranking_firmen for select to authenticated
  using (public.ranking_ausgabe_aktuell(ausgabe_id));

-- Technischer Größenschlüssel, muss vor ranking_stellen existieren.
alter table public.companies add column if not exists groesse_rang integer
  generated always as (
    case groesse_klasse when '<50' then 0 when '50–249' then 1
      when '250–999' then 2 when '1.000+' then 3 else 99 end
  ) stored;
-- Ausschließlich die bereits öffentliche Größeninformation, keine Text-/Nutzerrechte ergänzen.
grant select (groesse_rang) on public.companies to anon;

-- Von den öffentlichen facetten() getrennt, damit Gastrechte unverändert bleiben.
create or replace function public.ranking_katalog()
returns table(id text, name text, anzahl bigint)
language sql stable security invoker set search_path = '' as $$
  select l.id, l.name, count(distinct j.id)
  from public.ranking_listen l
  join public.ranking_ausgaben a on a.liste_id = l.id
  left join public.ranking_firmen f on f.ausgabe_id = a.id
  left join public.companies c on c.name = f.unternehmen and c.aktiv
  left join public.jobs j on j.unternehmen = c.name and j.status = 'offen' and j.sichtbar
  where public.ranking_ausgabe_aktuell(a.id)
  group by l.id, l.name
  order by l.name, l.id;
$$;
revoke all on function public.ranking_katalog() from public, anon, authenticated;
grant execute on function public.ranking_katalog() to authenticated, service_role;

create or replace function public.ranking_zuordnungen(p_firmen text[])
returns table(unternehmen text, liste_id text, name text, jahr integer, rang integer, quelle_url text, lizenz text)
language sql stable security invoker set search_path = '' as $$
  select f.unternehmen, l.id, l.name, a.jahr, f.rang, a.quelle_url, a.lizenz
  from public.ranking_firmen f
  join public.ranking_ausgaben a on a.id = f.ausgabe_id
  join public.ranking_listen l on l.id = a.liste_id
  where f.unternehmen = any(p_firmen) and public.ranking_ausgabe_aktuell(a.id)
  order by f.unternehmen, l.name, l.id;
$$;
revoke all on function public.ranking_zuordnungen(text[]) from public, anon, authenticated;
grant execute on function public.ranking_zuordnungen(text[]) to authenticated, service_role;

-- PostgREST wendet weitere Filter, Sortierung, exact count und range auf dieses Ergebnis an.
-- Keine interne LIMIT-Kappung. Pro Job nur eine Zeile, unabhängig von Mehrfachmitgliedschaft.
-- "text" ist nur für angemeldete Volltext-/Ausschlusssuche vorhanden; Gäste dürfen diese RPC nicht aufrufen.
create or replace function public.ranking_stellen(p_listen text[])
returns table(
  id text, unternehmen text, titel text, ort text, staedte text[], remote boolean,
  arbeitsmodell text, vertragsart text, abteilung text, erfahrungslevel text, url text,
  erstmals_gesehen date, text text, land text, groesse_klasse text, kategorie text[],
  companies jsonb, rang integer
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
      case when eine_liste then zuordnung.rang else null::integer end
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
