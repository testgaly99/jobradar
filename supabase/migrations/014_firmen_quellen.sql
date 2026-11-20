-- Ergänzt ausschließlich Stammdaten; Admin-Felder bleiben unberührt.
alter table public.companies
  add column if not exists website text,
  add column if not exists wikidata_id text,
  add column if not exists quellen text[] not null default '{}',
  add column if not exists status text not null default 'aktiv',
  add column if not exists status_grund text;

create unique index if not exists companies_wikidata_id_unique
  on public.companies (wikidata_id) where wikidata_id is not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'companies_status_check'
                 and conrelid = 'public.companies'::regclass) then
    alter table public.companies add constraint companies_status_check
      check (status in ('aktiv', 'kein_portal', 'portal_nicht_unterstuetzt', 'keine_stellen_de', 'offen'));
  end if;
end $$;

-- Nur der bestehende Service-Zugang darf geprüfte Ausgaben atomar ersetzen.
create or replace function public.importiere_ranking_ausgabe(p_daten jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  l public.ranking_listen;
  a public.ranking_ausgaben;
begin
  if jsonb_array_length(p_daten->'ranking_listen') <> 1
     or jsonb_array_length(p_daten->'ranking_ausgaben') <> 1 then
    raise exception 'Genau eine Liste und Ausgabe erwartet';
  end if;
  select * into l from jsonb_populate_record(null::public.ranking_listen, p_daten->'ranking_listen'->0);
  select * into a from jsonb_populate_record(null::public.ranking_ausgaben, p_daten->'ranking_ausgaben'->0);
  if l.id is null or a.id is null or a.liste_id is distinct from l.id
     or exists (select 1 from public.ranking_ausgaben where id = a.id and liste_id <> l.id)
     or exists (select 1 from jsonb_to_recordset(p_daten->'ranking_firmen') as f(ausgabe_id text)
                where f.ausgabe_id is distinct from a.id) then
    raise exception 'Ungültige Listenzuordnung';
  end if;
  -- Gleiche Liste serialisieren, damit parallele Läufe keine Mischstände bilden.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(l.id, 0));
  insert into public.ranking_listen(id, name, herausgeber, aktiv)
    values(l.id, l.name, l.herausgeber, l.aktiv)
    on conflict(id) do update set name=excluded.name, herausgeber=excluded.herausgeber, aktiv=excluded.aktiv;
  insert into public.ranking_ausgaben values(a.*)
    on conflict(id) do update set jahr=excluded.jahr, veroeffentlicht_am=excluded.veroeffentlicht_am,
      geprueft_am=excluded.geprueft_am, quelle_url=excluded.quelle_url, lizenz=excluded.lizenz,
      gueltig_bis=excluded.gueltig_bis, freigegeben=excluded.freigegeben;
  delete from public.ranking_firmen f using public.ranking_ausgaben alt
    where f.ausgabe_id=alt.id and alt.liste_id=l.id;
  insert into public.ranking_firmen(ausgabe_id, unternehmen, rang)
    select ausgabe_id, unternehmen, rang
    from jsonb_to_recordset(p_daten->'ranking_firmen') as f(ausgabe_id text, unternehmen text, rang integer);
  delete from public.ranking_ausgaben where liste_id=l.id and id<>a.id;
end $$;
revoke all on function public.importiere_ranking_ausgabe(jsonb) from public, anon, authenticated;
grant execute on function public.importiere_ranking_ausgabe(jsonb) to service_role;

create or replace function public.bereinige_ranking_ausgaben()
returns void language sql security invoker set search_path = '' as $$
  delete from public.ranking_ausgaben
  where gueltig_bis <= current_date
     or veroeffentlicht_am + interval '13 months' <= current_date;
$$;
revoke all on function public.bereinige_ranking_ausgaben() from public, anon, authenticated;
grant execute on function public.bereinige_ranking_ausgaben() to service_role;
