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
