-- Phase 2b: gegliederte Anzeige (abschnitte), Land und Facette "land". Im Supabase SQL Editor ausfuehren (mehrfach ausfuehrbar).
alter table public.jobs add column if not exists abschnitte jsonb, add column if not exists land text;
alter table public.applications add column if not exists snapshot_abschnitte jsonb;

create or replace function public.facetten() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with j as (
    select c.groesse_klasse, c.kategorie, j.erfahrungslevel, j.arbeitsmodell, j.vertragsart,
           j.abteilung, j.unternehmen, j.staedte, j.remote, j.land
    from public.jobs j join public.companies c on c.name = j.unternehmen
    where j.status = 'offen' and j.sichtbar and c.aktiv
  ),
  r as (
    select 'groesse' g, groesse_klasse w, count(*) n from j group by 2
    union all select 'kategorie', w, count(*) from j, unnest(j.kategorie) w group by w
    union all select 'level', erfahrungslevel, count(*) from j group by 2
    union all select 'modell', arbeitsmodell, count(*) from j group by 2
    union all select 'vertrag', vertragsart, count(*) from j group by 2
    union all select 'bereich', abteilung, count(*) from j group by 2
    union all select 'firma', unternehmen, count(*) from j group by 2
    union all select 'stadt', w, count(*) from j, unnest(j.staedte) w group by w
    union all select 'stadt', 'Remote', count(*) from j where remote having count(*) > 0
    union all select 'land', land, count(*) from j group by 2
  )
  select coalesce(jsonb_object_agg(g, o), '{}'::jsonb)
  from (select g, jsonb_object_agg(w, n) o from r
        where w is not null and w <> '' and lower(w) <> 'unbekannt' group by g) s;
$$;

grant execute on function public.facetten() to authenticated;

-- ---------- Admin-Einblicke: nur Zahlen, nur per service_role aufrufbar ----------
create or replace function public.admin_einblicke() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'pro_nutzer', coalesce((select jsonb_agg(jsonb_build_object('id', p.owner_id, 'bewerbungen', p.n))
                            from (select owner_id, count(*) n from public.applications group by owner_id) p), '[]'::jsonb),
    'aktiv_7', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'aktiv_30', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'bewerbungen_pro_woche', (select jsonb_agg(jsonb_build_object('woche', g.wo, 'anzahl', coalesce(c.n, 0)) order by g.wo)
                            from (select generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week')::date wo) g
                            left join (select date_trunc('week', erstellt_am)::date wo, count(*) n from public.applications
                                       where erstellt_am >= date_trunc('week', now()) - interval '7 weeks' group by 1) c on c.wo = g.wo)
  );
$$;
revoke execute on function public.admin_einblicke() from public, anon, authenticated;
grant execute on function public.admin_einblicke() to service_role;

-- ---------- Wichtige Punkte (Begriffe pro Nutzer) ----------
create table if not exists public.wichtige_punkte (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  begriff text not null check (length(trim(begriff)) between 2 and 60),
  erstellt_am timestamptz not null default now()
);
drop index if exists public.wichtige_punkte_eindeutig;
create unique index if not exists wichtige_punkte_eindeutig_v2 on public.wichtige_punkte (owner_id, lower(trim(begriff)));

-- Obergrenze 50 pro Nutzer, auch bei direktem API-Zugriff. Unter Parallelität (Sperre pro Nutzer) abgesichert.
create or replace function public.wichtige_punkte_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));
  if (select count(*) from public.wichtige_punkte where owner_id = new.owner_id) >= 50 then
    raise exception 'wichtige_punkte_limit' using errcode = 'P0001', hint = 'LIMIT_50';
  end if;
  return new;
end $$;
drop trigger if exists wichtige_punkte_limit on public.wichtige_punkte;
create trigger wichtige_punkte_limit before insert on public.wichtige_punkte
  for each row execute function public.wichtige_punkte_limit();
alter table public.wichtige_punkte enable row level security;
revoke all on public.wichtige_punkte from anon;
grant select, insert, delete on public.wichtige_punkte to authenticated;
drop policy if exists wichtige_punkte_eigene on public.wichtige_punkte;
create policy wichtige_punkte_eigene on public.wichtige_punkte for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Bestehende Bewerbungen bekommen die gegliederte Anzeige nachgereicht (der Scraper ruft das nach jedem Lauf auf).
create or replace function public.snapshot_nachruesten() returns integer
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.applications a set snapshot_abschnitte = j.abschnitte
    from public.jobs j
    where a.job_id = j.id and a.snapshot_abschnitte is null and j.abschnitte is not null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.snapshot_nachruesten() from public, anon, authenticated;
grant execute on function public.snapshot_nachruesten() to service_role;

-- ---------- Steckbrief (regelbasiert aus der Anzeige) und einstellbare Kurzbeschreibung ----------
alter table public.jobs add column if not exists steckbrief jsonb;

create table if not exists public.listen_felder (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  felder text[] not null
);
alter table public.listen_felder drop constraint if exists listen_felder_namen;
alter table public.listen_felder add constraint listen_felder_namen check (
  felder <@ array['groesse','level','modell','vertrag','ort','online_seit','erfahrung','gehalt','sprachen','sicherheit','branche']::text[]);
alter table public.listen_felder enable row level security;
revoke all on public.listen_felder from anon;
grant select, insert, update on public.listen_felder to authenticated;
drop policy if exists listen_felder_eigene on public.listen_felder;
create policy listen_felder_eigene on public.listen_felder for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
