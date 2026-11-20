-- Phase 4e. Nur als Datei vorbereitet; Voraussetzung 001–015, erneut ausführbar.
begin;
alter table public.companies add column if not exists fuer_alle boolean not null default true;

create table if not exists public.firmen_sichtbar (
  unternehmen text not null references public.companies(name) on update cascade on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  eingetragen_am timestamptz not null default now(),
  primary key (unternehmen, owner_id)
);
create index if not exists firmen_sichtbar_owner_idx on public.firmen_sichtbar(owner_id);
alter table public.firmen_sichtbar enable row level security;
revoke all on public.firmen_sichtbar from public, anon, authenticated;
grant select, delete on public.firmen_sichtbar to authenticated;
grant select, insert, update, delete on public.firmen_sichtbar to service_role;
drop policy if exists firmen_sichtbar_eigene_lesen on public.firmen_sichtbar;
create policy firmen_sichtbar_eigene_lesen on public.firmen_sichtbar for select to authenticated
  using (owner_id = auth.uid());
drop policy if exists firmen_sichtbar_eigene_loeschen on public.firmen_sichtbar;
create policy firmen_sichtbar_eigene_loeschen on public.firmen_sichtbar for delete to authenticated
  using (owner_id = auth.uid());

-- Vermeidet RLS-Rekursion auf companies. Kein Admin-Sonderzugang zu fremden Daten.
create or replace function public.firma_sichtbar(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.companies c where c.name = p_name and
      (c.fuer_alle or exists(select 1 from public.firmen_sichtbar f
                            where f.unternehmen = c.name and f.owner_id = auth.uid()))
  );
$$;
revoke all on function public.firma_sichtbar(text) from public, anon, authenticated;
grant execute on function public.firma_sichtbar(text) to authenticated, service_role;

-- Vorhandene permissive SELECT-Policies ersetzen, niemals eine zusätzliche OR-Freigabe.
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated
  using (public.firma_sichtbar(name));
drop policy if exists companies_select_anon on public.companies;
create policy companies_select_anon on public.companies for select to anon
  using (aktiv and fuer_alle);
-- Wird für die sichere anon-Unterabfrage der Job-Policy benötigt; sichtbar sind nur öffentliche Firmen.
grant select (fuer_alle) on public.companies to anon;
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select to authenticated using (
  (sichtbar = true or exists(select 1 from public.applications a
                            where a.job_id = jobs.id and a.owner_id = auth.uid()))
  and public.firma_sichtbar(unternehmen)
);
drop policy if exists jobs_select_anon on public.jobs;
create policy jobs_select_anon on public.jobs for select to anon using (
  sichtbar and status = 'offen' and exists(select 1 from public.companies c
                                         where c.name = unternehmen and c.fuer_alle)
);
drop policy if exists ranking_firmen_lesen on public.ranking_firmen;
create policy ranking_firmen_lesen on public.ranking_firmen for select to authenticated
  using (public.ranking_ausgabe_aktuell(ausgabe_id) and public.firma_sichtbar(unternehmen));

-- facetten() und ranking_stellen() sind SECURITY INVOKER und übernehmen die neuen
-- Firmen-/Stellenregeln. Die SECURITY-DEFINER-Kategorieprojektion braucht den Filter explizit.
create or replace function public.ranking_kategorien(p_firmen text[])
returns table(unternehmen text, kategorie text)
language sql stable security definer set search_path = '' as $$
  select distinct f.unternehmen,l.kategorie
  from public.ranking_firmen f join public.ranking_ausgaben a on a.id=f.ausgabe_id
  join public.ranking_listen l on l.id=a.liste_id join public.companies c on c.name=f.unternehmen
  where auth.uid() is not null and c.aktiv and f.unternehmen=any(p_firmen)
    and public.firma_sichtbar(f.unternehmen)
    and l.aktiv and l.kategorie is not null and a.freigegeben
    and a.veroeffentlicht_am <= current_date and current_date < a.gueltig_bis
    and current_date < (a.veroeffentlicht_am + interval '13 months')::date
    and not exists(select 1 from public.ranking_ausgaben neuer
      where neuer.liste_id=a.liste_id and neuer.freigegeben and neuer.veroeffentlicht_am <= current_date
        and (neuer.jahr,neuer.veroeffentlicht_am,neuer.id) > (a.jahr,a.veroeffentlicht_am,a.id));
$$;
revoke all on function public.ranking_kategorien(text[]) from public, anon, authenticated;
grant execute on function public.ranking_kategorien(text[]) to authenticated;

-- Nur der Server mit Service-Rolle darf Zuordnungen anlegen. Eigentümer kommt aus
-- der authentifizierten Server-Action, nie aus einem Browserfeld. Limit/Deduplikation atomar.
create or replace function public.zusatzfirma_hinzufuegen(
  p_owner uuid, p_name text, p_link text, p_typ text, p_id text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare f public.companies; neu text; n integer := 1;
begin
  -- Kein Lesen von auth.users: service_role hat dort keine Rechte. Ein unbekannter
  -- Nutzer scheitert am Fremdschlüssel von firmen_sichtbar, die ganze Transaktion rollt zurück.
  if p_owner is null
     or p_name is null or length(btrim(p_name)) not between 2 and 80
     or p_name ~ '[[:cntrl:]]' or p_link is null or length(p_link)>4096
     or p_link !~ '^https://[^[:space:]<>"\\]+$'
     or p_typ is null or p_typ not in ('greenhouse','ashby','personio','recruitee')
     or p_id is null or length(p_id)>150
     or (p_typ <> 'recruitee' and p_id !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$')
     or (p_typ = 'recruitee' and p_id !~ '^[a-z0-9][a-z0-9-]{0,62}\.recruitee\.com$') then
    raise exception 'Ungültige Zusatzfirma';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zusatz-owner:'||p_owner::text,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('firmen-namen',0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('portal:'||p_typ||':'||p_id,0));
  if (select count(*) from public.companies c where c.ats_typ = p_typ and c.ats_id = p_id)>1 then
    raise exception 'Portalzuordnung mehrdeutig';
  end if;
  select c.* into f from public.companies c where c.ats_typ = p_typ and c.ats_id = p_id for update;
  if found then
    if f.fuer_alle then return jsonb_build_object('status','vorhanden'); end if;
    if exists(select 1 from public.firmen_sichtbar z where z.unternehmen=f.name and z.owner_id=p_owner) then
      return jsonb_build_object('status','verbunden','unternehmen',f.name);
    end if;
  end if;
  if not exists(select 1 from public.admins where user_id = p_owner)
     and (select count(*) from public.firmen_sichtbar where owner_id=p_owner) >= 50 then
    return jsonb_build_object('status','limit');
  end if;
  if f.name is null then
    -- Kurzer globaler Namenslock verhindert konkurrierende Suffix-Kollisionen.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('firmen-namen',0));
    neu := btrim(p_name);
    while exists(select 1 from public.companies where name=neu) loop
      neu := btrim(p_name)||case when n=1 then ' (eigene)' else ' (eigene '||n::text||')' end;
      n := n+1;
    end loop;
    insert into public.companies(name,careers_url,ats_typ,ats_id,herkunft,fuer_alle,status,aktiv)
      values(neu,p_link,p_typ,p_id,'nutzer',false,'aktiv',true) returning * into f;
    insert into public.firmen_sichtbar(unternehmen,owner_id) values(f.name,p_owner);
    return jsonb_build_object('status','angelegt','unternehmen',f.name);
  end if;
  insert into public.firmen_sichtbar(unternehmen,owner_id) values(f.name,p_owner) on conflict do nothing;
  return jsonb_build_object('status','verbunden','unternehmen',f.name);
end $$;
revoke all on function public.zusatzfirma_hinzufuegen(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.zusatzfirma_hinzufuegen(uuid,text,text,text,text) to service_role;

create or replace function public.zusatzfirmen_meldung()
returns table(unternehmen text, careers_url text, ats_typ text, nutzer bigint, fuer_alle boolean)
language sql stable security invoker set search_path = '' as $$
  select c.name,c.careers_url,c.ats_typ,count(z.owner_id),c.fuer_alle
  from public.companies c left join public.firmen_sichtbar z on z.unternehmen=c.name
  where c.herkunft='nutzer' group by c.name,c.careers_url,c.ats_typ,c.fuer_alle;
$$;
revoke all on function public.zusatzfirmen_meldung() from public, anon, authenticated;
grant execute on function public.zusatzfirmen_meldung() to service_role;

create or replace function public.zusatzfirma_freigeben(p_admin uuid,p_name text,p_fuer_alle boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_admin is null or p_fuer_alle is null or not exists(select 1 from public.admins where user_id=p_admin) then
    raise exception 'Nicht berechtigt';
  end if;
  perform 1 from public.companies where name=p_name and herkunft='nutzer' for update;
  if not found then raise exception 'Keine Zusatzfirma'; end if;
  if p_fuer_alle then
    update public.companies set fuer_alle = true where name=p_name;
  else
    insert into public.firmen_sichtbar(unternehmen,owner_id) values(p_name,p_admin) on conflict do nothing;
  end if;
end $$;
revoke all on function public.zusatzfirma_freigeben(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.zusatzfirma_freigeben(uuid,text,boolean) to service_role;

-- Zählt nur Zuordnungen, liefert niemals Nutzer-IDs an den allgemeinen Bericht.
create or replace function public.firmen_fuer_nachtlauf() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('nutzer',
    (select count(*) from public.firmen_sichtbar z where z.unternehmen=c.name)) order by c.name),'[]'::jsonb)
  from public.companies c where c.herkunft<>'datei';
$$;
revoke all on function public.firmen_fuer_nachtlauf() from public, anon, authenticated;
grant execute on function public.firmen_fuer_nachtlauf() to service_role;

create or replace function public.bestand_privatisieren(p_firmen text[]) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if p_firmen is null or array_position(p_firmen,null) is not null then
    raise exception 'Ungültige Bestandsauswahl';
  end if;
  if not exists(select 1 from public.admins) then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bestand-privatisieren',0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('firmen-namen',0));
  perform 1 from public.companies where name=any(p_firmen) order by name for update;
  -- Wiederholung nach einem lokalen Dateischreibfehler ist erlaubt, andere Firmen nie umklassifizieren.
  if exists(select 1 from unnest(p_firmen) n(name) left join public.companies c on c.name=n.name
    where c.name is null or not (c.quellen = array['bestand']::text[] or
      (c.herkunft='nutzer' and not c.fuer_alle and c.quellen='{}'::text[]))) then
    raise exception 'Bestandsauswahl widerspricht den Quellen';
  end if;
  insert into public.firmen_sichtbar(unternehmen,owner_id)
    select c.name,a.user_id from public.companies c cross join public.admins a
    where c.name=any(p_firmen) on conflict do nothing;
  update public.companies set herkunft='nutzer',fuer_alle=false,quellen='{}'::text[]
    where name=any(p_firmen);
  return true;
end $$;
revoke all on function public.bestand_privatisieren(text[]) from public, anon, authenticated;
grant execute on function public.bestand_privatisieren(text[]) to service_role;

-- Gleichnamige Privatfirmen werden nur bei identischem Portal öffentlich. Andere
-- Namen beim selben Portal brauchen eine explizite Zuordnung, nie ein implizites Umbenennen.
create or replace function public.sync_dateifirmen(p_firmen jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare f record; alt public.companies;
begin
  if jsonb_typeof(p_firmen) is distinct from 'array' then raise exception 'Ungültige Dateifirmen'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('firmen-namen',0));
  for f in select * from jsonb_to_recordset(p_firmen) z(name text,careers_url text,ats_typ text,ats_id text,
    mitarbeitende_ca integer,groesse_klasse text,kategorie text[],hauptsitz text,aktiv boolean,website text,
    wikidata_id text,quellen text[],status text,status_grund text,herkunft text,fuer_alle boolean)
  loop
    if f.name is null or btrim(f.name)='' or f.herkunft is distinct from 'datei' or f.fuer_alle is distinct from true then
      raise exception 'Ungültige Dateifirmen';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('portal:'||coalesce(f.ats_typ,'')||':'||coalesce(f.ats_id,''),0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('firmen-namen',0));
    select * into alt from public.companies where name=f.name for update;
    if found and alt.herkunft<>'datei' and
       (nullif(f.ats_typ,'') is null or nullif(f.ats_id,'') is null or
        (alt.ats_typ,alt.ats_id) is distinct from (f.ats_typ,f.ats_id)) then
      raise exception 'Identitaetskollision: Dateifirma und Privatfirma';
    end if;
    if alt.name is not null and not alt.fuer_alle and not exists(
      select 1 from unnest(f.quellen) q(quelle) where q.quelle <> 'bestand' and btrim(q.quelle) <> ''
    ) then
      raise exception 'Privater Bestand darf nicht durch veraltete Dateien veröffentlicht werden';
    end if;
    if nullif(f.ats_typ,'') is not null and nullif(f.ats_id,'') is not null and exists(
      select 1 from public.companies c where c.name<>f.name and c.ats_typ=f.ats_typ and c.ats_id=f.ats_id
    ) then raise exception 'Identitaetskollision: Portal mit anderem Firmennamen'; end if;
    insert into public.companies(name,careers_url,ats_typ,ats_id,mitarbeitende_ca,groesse_klasse,kategorie,
      hauptsitz,aktiv,website,wikidata_id,quellen,status,status_grund,herkunft,fuer_alle)
    values(f.name,f.careers_url,f.ats_typ,f.ats_id,f.mitarbeitende_ca,f.groesse_klasse,f.kategorie,
      f.hauptsitz,f.aktiv,f.website,f.wikidata_id,f.quellen,f.status,f.status_grund,'datei',true)
    on conflict(name) do update set careers_url=excluded.careers_url,ats_typ=excluded.ats_typ,ats_id=excluded.ats_id,
      mitarbeitende_ca=excluded.mitarbeitende_ca,groesse_klasse=excluded.groesse_klasse,kategorie=excluded.kategorie,
      hauptsitz=excluded.hauptsitz,aktiv=excluded.aktiv,website=excluded.website,wikidata_id=excluded.wikidata_id,
      quellen=excluded.quellen,status=excluded.status,status_grund=excluded.status_grund,fuer_alle=true,herkunft='datei';
    -- Echte Quellenübernahme wird Dateifirma; private Zuordnungen, Whitelist,
    -- Logos und Bewerbungsverweise bleiben erhalten. Keine doppelte Nachtlauf-Zuständigkeit.
  end loop;
end $$;
revoke all on function public.sync_dateifirmen(jsonb) from public, anon, authenticated;
grant execute on function public.sync_dateifirmen(jsonb) to service_role;
commit;
