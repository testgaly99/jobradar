-- Phase 4d. Nur als Datei vorbereitet; mehrfach ausführbar, setzt 010–014 voraus.
begin;
-- Nach 016 nicht erneut ausführen: 015 würde dessen Privatschutz in zwei Funktionen überschreiben.
do $$ begin
  if to_regclass('public.firmen_sichtbar') is not null then
    raise exception '015 ist bereits durch 016 erweitert. Bitte nicht erneut ausführen; es wurde nichts geändert.';
  end if;
end $$;
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  telegram_chat_id text
);
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;
grant select, insert, update, delete on public.admins to service_role;

create or replace function public.ist_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.ist_admin() from public, anon, authenticated;
grant execute on function public.ist_admin() to authenticated, service_role;

alter table public.ranking_ausgaben add column if not exists sichtbarkeit text not null default 'angemeldet';
alter table public.ranking_listen add column if not exists kategorie text;
alter table public.companies add column if not exists herkunft text not null default 'datei';
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.ranking_ausgaben'::regclass and conname='ranking_sichtbarkeit_check') then
    alter table public.ranking_ausgaben add constraint ranking_sichtbarkeit_check check (sichtbarkeit in ('admin','angemeldet'));
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.companies'::regclass and conname='companies_herkunft_check') then
    alter table public.companies add constraint companies_herkunft_check check (herkunft in ('datei','admin','nutzer'));
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.ranking_listen'::regclass and conname='ranking_kategorie_check') then
    alter table public.ranking_listen add constraint ranking_kategorie_check check (kategorie in
      ('Top-Arbeitgeber','Beliebt bei Studierenden','Große Unternehmen','Börsennotiert','Innovation','Wachstum & Startups','Top-Gehalt Tech'));
  end if;
end $$;

create table if not exists public.stoebern_links (
  id bigint generated always as identity primary key,
  titel text not null check(length(btrim(titel)) between 1 and 120),
  url text not null check(url ~ '^https://[^[:space:]<>"\\]+$'),
  reihenfolge int not null default 0,
  geprueft_am date not null default current_date,
  art text not null default 'stoebern' check(art in ('stoebern','einfuegen'))
);
alter table public.stoebern_links enable row level security;
revoke all on public.stoebern_links from public, anon, authenticated;
grant select on public.stoebern_links to authenticated;
grant select, insert, update, delete on public.stoebern_links to service_role;
grant usage, select on sequence public.stoebern_links_id_seq to service_role;
drop policy if exists stoebern_links_lesen on public.stoebern_links;
create policy stoebern_links_lesen on public.stoebern_links for select to authenticated
  using (art = 'stoebern' or public.ist_admin());

-- SECURITY DEFINER vermeidet rekursive RLS-Abfragen auf ranking_ausgaben.
create or replace function public.ranking_ausgabe_aktuell(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ranking_ausgaben a join public.ranking_listen l on l.id=a.liste_id
    where a.id=p_id and l.aktiv and a.freigegeben
      and (a.sichtbarkeit <> 'admin' or public.ist_admin())
      and a.veroeffentlicht_am <= current_date and current_date < a.gueltig_bis
      and current_date < (a.veroeffentlicht_am + interval '13 months')::date
      and not exists (
        select 1 from public.ranking_ausgaben neuer where neuer.liste_id=a.liste_id and neuer.freigegeben
          and (neuer.sichtbarkeit <> 'admin' or public.ist_admin())
          and neuer.veroeffentlicht_am <= current_date
          and (neuer.jahr,neuer.veroeffentlicht_am,neuer.id) > (a.jahr,a.veroeffentlicht_am,a.id)
      )
  );
$$;
revoke all on function public.ranking_ausgabe_aktuell(text) from public, anon, authenticated;
grant execute on function public.ranking_ausgabe_aktuell(text) to authenticated, service_role;

-- Bewusste Ausnahme: nur Kategorien freigeben, niemals Listenname, ID oder Rang.
create or replace function public.ranking_kategorien(p_firmen text[])
returns table(unternehmen text, kategorie text)
language sql stable security definer set search_path = '' as $$
  select distinct f.unternehmen,l.kategorie
  from public.ranking_firmen f join public.ranking_ausgaben a on a.id=f.ausgabe_id
  join public.ranking_listen l on l.id=a.liste_id
  join public.companies c on c.name=f.unternehmen
  where auth.uid() is not null and c.aktiv and f.unternehmen=any(p_firmen)
    and l.aktiv and l.kategorie is not null and a.freigegeben
    and a.veroeffentlicht_am <= current_date and current_date < a.gueltig_bis
    and current_date < (a.veroeffentlicht_am + interval '13 months')::date
    and not exists (
      select 1 from public.ranking_ausgaben neuer where neuer.liste_id=a.liste_id and neuer.freigegeben
      and neuer.veroeffentlicht_am <= current_date
      and (neuer.jahr,neuer.veroeffentlicht_am,neuer.id) > (a.jahr,a.veroeffentlicht_am,a.id)
    );
$$;
revoke all on function public.ranking_kategorien(text[]) from public, anon, authenticated;
grant execute on function public.ranking_kategorien(text[]) to authenticated;

-- Datei-Import: sämtliche neuen Spalten explizit nennen; bestehende 014-RPC ersetzen.
create or replace function public.importiere_ranking_ausgabe(p_daten jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare l public.ranking_listen; a public.ranking_ausgaben;
begin
  if jsonb_array_length(p_daten->'ranking_listen') is distinct from 1
     or jsonb_array_length(p_daten->'ranking_ausgaben') is distinct from 1 then
    raise exception 'Genau eine Liste und Ausgabe erwartet';
  end if;
  select * into l from jsonb_populate_record(null::public.ranking_listen,p_daten->'ranking_listen'->0);
  select * into a from jsonb_populate_record(null::public.ranking_ausgaben,p_daten->'ranking_ausgaben'->0);
  if l.id is null or a.id is null or a.liste_id is distinct from l.id or l.id like 'hand-%' then
    raise exception 'Ungültige Listenzuordnung';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(l.id,0));
  if exists(select 1 from public.ranking_ausgaben where id=a.id and liste_id<>l.id)
     or exists(select 1 from jsonb_to_recordset(p_daten->'ranking_firmen') f(ausgabe_id text)
               where f.ausgabe_id is distinct from a.id) then
    raise exception 'Ungültige Listenzuordnung';
  end if;
  insert into public.ranking_listen(id,name,herausgeber,aktiv,kategorie)
    values(l.id,l.name,l.herausgeber,l.aktiv,l.kategorie)
    on conflict(id) do update set name=excluded.name,herausgeber=excluded.herausgeber,aktiv=excluded.aktiv,kategorie=excluded.kategorie;
  insert into public.ranking_ausgaben(id,liste_id,jahr,veroeffentlicht_am,geprueft_am,quelle_url,lizenz,gueltig_bis,freigegeben,sichtbarkeit)
    values(a.id,a.liste_id,a.jahr,a.veroeffentlicht_am,a.geprueft_am,a.quelle_url,a.lizenz,a.gueltig_bis,a.freigegeben,coalesce(a.sichtbarkeit,'angemeldet'))
    on conflict(id) do update set jahr=excluded.jahr,veroeffentlicht_am=excluded.veroeffentlicht_am,
      geprueft_am=excluded.geprueft_am,quelle_url=excluded.quelle_url,lizenz=excluded.lizenz,
      gueltig_bis=excluded.gueltig_bis,freigegeben=excluded.freigegeben,sichtbarkeit=excluded.sichtbarkeit;
  delete from public.ranking_firmen f using public.ranking_ausgaben alt where f.ausgabe_id=alt.id and alt.liste_id=l.id;
  insert into public.ranking_firmen(ausgabe_id,unternehmen,rang)
    select ausgabe_id,unternehmen,rang from jsonb_to_recordset(p_daten->'ranking_firmen') f(ausgabe_id text,unternehmen text,rang integer);
  delete from public.ranking_ausgaben where liste_id=l.id and id<>a.id;
end $$;
revoke all on function public.importiere_ranking_ausgabe(jsonb) from public, anon, authenticated;
grant execute on function public.importiere_ranking_ausgabe(jsonb) to service_role;

-- Unabhängige Teile derselben Hand-Ausgabe atomar ergänzen, Metadaten niemals still ändern.
create or replace function public.speichere_handliste(p_daten jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare l public.ranking_listen; a public.ranking_ausgaben; alt public.ranking_ausgaben;
begin
  select * into l from jsonb_populate_record(null::public.ranking_listen,p_daten->'liste');
  select * into a from jsonb_populate_record(null::public.ranking_ausgaben,p_daten->'ausgabe');
  if l.id is null or l.id !~ '^hand-[a-z0-9][a-z0-9_-]{0,69}$'
     or l.kategorie is null
     or a.id is distinct from l.id||'-'||a.jahr::text or a.liste_id is distinct from l.id
     or a.freigegeben is distinct from true or l.aktiv is distinct from true
     or jsonb_typeof(p_daten->'firmen') is distinct from 'array'
     or jsonb_array_length(p_daten->'firmen') not between 1 and 200
     or jsonb_typeof(p_daten->'neueFirmen') is distinct from 'array' then
    raise exception 'Ungültige Hand-Ausgabe';
  end if;
  if exists(select 1 from jsonb_to_recordset(p_daten->'firmen') f(unternehmen text,rang integer)
            where f.unternehmen is null or length(btrim(f.unternehmen)) not between 1 and 200
               or (rang is not null and rang not between 1 and 200))
     or exists(select 1 from jsonb_to_recordset(p_daten->'firmen') f(unternehmen text) group by unternehmen having count(*)>1) then
    raise exception 'Ungültige Firmen oder Ränge';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(l.id,0));
  if exists(select 1 from public.ranking_listen r where r.id=l.id
             and (r.name,r.herausgeber,r.kategorie) is distinct from (l.name,l.herausgeber,l.kategorie)) then
    raise exception 'Listenmetadaten widersprechen';
  end if;
  select * into alt from public.ranking_ausgaben where id=a.id;
  if found and (alt.gueltig_bis <= current_date
       or alt.veroeffentlicht_am + interval '13 months' <= current_date) then
    raise exception 'Ausgabe abgelaufen; bitte aktuelle Ausgabe verwenden';
  end if;
  if found and (alt.liste_id,alt.jahr,alt.quelle_url,alt.lizenz,alt.sichtbarkeit)
       is distinct from (a.liste_id,a.jahr,a.quelle_url,a.lizenz,a.sichtbarkeit) then
    raise exception 'Ausgabenmetadaten widersprechen';
  end if;
  if exists(select 1 from public.ranking_firmen r
      join jsonb_to_recordset(p_daten->'firmen') f(unternehmen text,rang integer) on f.unternehmen=r.unternehmen
      where r.ausgabe_id=a.id and r.rang is distinct from f.rang) then
    raise exception 'Rangkonflikt in derselben Ausgabe';
  end if;
  if (select count(*) from (
      select unternehmen from public.ranking_firmen where ausgabe_id=a.id
      union select unternehmen from jsonb_to_recordset(p_daten->'firmen') f(unternehmen text)
    ) alle) > 200 then
    raise exception 'Höchstens 200 Firmen je Ausgabe';
  end if;
  if exists(select 1 from jsonb_array_elements_text(p_daten->'neueFirmen') n(name)
             where not exists(select 1 from jsonb_to_recordset(p_daten->'firmen') f(unternehmen text) where f.unternehmen=n.name)) then
    raise exception 'Neue Firmen außerhalb der Vorschau';
  end if;
  insert into public.companies(name,herkunft,status,aktiv,ats_typ)
    select n.name,'admin','offen',false,'' from jsonb_array_elements_text(p_daten->'neueFirmen') n(name)
    on conflict(name) do nothing;
  insert into public.ranking_listen(id,name,herausgeber,aktiv,kategorie)
    values(l.id,l.name,l.herausgeber,true,l.kategorie) on conflict(id) do nothing;
  insert into public.ranking_ausgaben(id,liste_id,jahr,veroeffentlicht_am,geprueft_am,quelle_url,lizenz,gueltig_bis,freigegeben,sichtbarkeit)
    values(a.id,a.liste_id,a.jahr,a.veroeffentlicht_am,a.geprueft_am,a.quelle_url,a.lizenz,a.gueltig_bis,true,a.sichtbarkeit)
    on conflict(id) do nothing;
  insert into public.ranking_firmen(ausgabe_id,unternehmen,rang)
    select a.id,f.unternehmen,f.rang from jsonb_to_recordset(p_daten->'firmen') f(unternehmen text,rang integer)
    on conflict(ausgabe_id, unternehmen) do nothing;
end $$;
revoke all on function public.speichere_handliste(jsonb) from public, anon, authenticated;
grant execute on function public.speichere_handliste(jsonb) to service_role;

-- Ein einziger eindeutiger PostgREST-Endpunkt für Liste UND Kategorie.
drop function if exists public.ranking_stellen(text[]);
create or replace function public.ranking_stellen(p_listen text[] default '{}', p_kategorien text[] default '{}')
returns table(
  id text, unternehmen text, titel text, ort text, staedte text[], remote boolean,
  arbeitsmodell text, vertragsart text, abteilung text, erfahrungslevel text, url text,
  erstmals_gesehen date, text text, land text, groesse_klasse text, kategorie text[],
  companies jsonb, rang integer, deutsch_stufe smallint
)
language plpgsql stable security invoker set search_path = '' as $$
declare eine_liste boolean;
begin
  if p_listen is null or p_kategorien is null
     or cardinality(p_listen)>100 or cardinality(p_kategorien)>7
     or cardinality(p_listen)+cardinality(p_kategorien)=0
     or (cardinality(p_listen)>0 and array_ndims(p_listen)<>1)
     or (cardinality(p_kategorien)>0 and array_ndims(p_kategorien)<>1)
     or array_position(p_listen,null) is not null or array_position(p_kategorien,null) is not null then
    raise exception using errcode='22023', message='Bitte gültige Listen oder Kategorien auswählen.';
  end if;
  if exists(select 1 from unnest(p_kategorien) k where k not in
      ('Top-Arbeitgeber','Beliebt bei Studierenden','Große Unternehmen','Börsennotiert','Innovation','Wachstum & Startups','Top-Gehalt Tech')) then
    raise exception using errcode='22023', message='Unbekannte Ranglisten-Kategorie.';
  end if;
  if exists(select 1 from unnest(p_listen) gewaehlt(id)
    where not exists(select 1 from public.ranking_listen l join public.ranking_ausgaben a on a.liste_id=l.id
                      where l.id=gewaehlt.id and public.ranking_ausgabe_aktuell(a.id))) then
    raise exception using errcode='22023', message='Eine ausgewählte Liste ist unbekannt oder nicht mehr verfügbar.';
  end if;
  select count(distinct g.id)=1 into eine_liste from unnest(p_listen) g(id);
  return query
    select j.id,j.unternehmen,j.titel,j.ort,j.staedte,j.remote,j.arbeitsmodell,j.vertragsart,j.abteilung,
      j.erfahrungslevel,j.url,j.erstmals_gesehen,j.text,j.land,c.groesse_klasse,c.kategorie,
      jsonb_build_object('groesse_klasse',c.groesse_klasse,'kategorie',c.kategorie,'groesse_rang',c.groesse_rang),
      case when eine_liste then zuordnung.rang else null::integer end,j.deutsch_stufe
    from public.jobs j join public.companies c on c.name=j.unternehmen and c.aktiv
    join lateral (
      select count(*) anzahl,min(f.rang) rang from public.ranking_firmen f
      join public.ranking_ausgaben a on a.id=f.ausgabe_id
      where f.unternehmen=j.unternehmen and a.liste_id=any(p_listen) and public.ranking_ausgabe_aktuell(a.id)
    ) zuordnung on cardinality(p_listen)=0 or zuordnung.anzahl>0
    where j.status='offen' and j.sichtbar
      and (cardinality(p_kategorien)=0 or exists(
        select 1 from public.ranking_kategorien(array[j.unternehmen]) k where k.kategorie=any(p_kategorien)
      ));
end $$;
revoke all on function public.ranking_stellen(text[],text[]) from public, anon, authenticated;
grant execute on function public.ranking_stellen(text[],text[]) to authenticated, service_role;

-- Der Datei-Sync darf weder fremde Herkunft übernehmen noch bei einem Rennen Teilstände schreiben.
create or replace function public.sync_dateifirmen(p_firmen jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare anzahl integer;
begin
  if jsonb_typeof(p_firmen) is distinct from 'array' or exists(
      select 1 from jsonb_to_recordset(p_firmen) f(name text,herkunft text)
      where herkunft is distinct from 'datei' or name is null or btrim(name)=''
    ) then raise exception 'Ungültige Dateifirmen'; end if;
  insert into public.companies(name,careers_url,ats_typ,ats_id,mitarbeitende_ca,groesse_klasse,kategorie,hauptsitz,
                              aktiv,website,wikidata_id,quellen,status,status_grund,herkunft)
    select name,careers_url,ats_typ,ats_id,mitarbeitende_ca,groesse_klasse,kategorie,hauptsitz,
           aktiv,website,wikidata_id,quellen,status,status_grund,'datei'
    from jsonb_to_recordset(p_firmen) f(name text,careers_url text,ats_typ text,ats_id text,mitarbeitende_ca int,
      groesse_klasse text,kategorie text[],hauptsitz text,aktiv boolean,website text,wikidata_id text,
      quellen text[],status text,status_grund text,herkunft text)
    on conflict(name) do update set careers_url=excluded.careers_url,ats_typ=excluded.ats_typ,ats_id=excluded.ats_id,
      mitarbeitende_ca=excluded.mitarbeitende_ca,groesse_klasse=excluded.groesse_klasse,kategorie=excluded.kategorie,
      hauptsitz=excluded.hauptsitz,aktiv=excluded.aktiv,website=excluded.website,wikidata_id=excluded.wikidata_id,
      quellen=excluded.quellen,status=excluded.status,status_grund=excluded.status_grund
    where companies.herkunft='datei';
  get diagnostics anzahl = row_count;
  if anzahl <> jsonb_array_length(p_firmen) then
    raise exception 'Herkunftskollision: keine Dateifirmen geschrieben';
  end if;
end $$;
revoke all on function public.sync_dateifirmen(jsonb) from public, anon, authenticated;
grant execute on function public.sync_dateifirmen(jsonb) to service_role;
commit;
