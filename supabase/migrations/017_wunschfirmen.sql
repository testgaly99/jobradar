-- Phase 4f. Nur vorbereitet, setzt Migrationen 015 und 016 voraus.
begin;
create table if not exists public.wunschfirmen (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  unternehmen text not null references public.companies(name) on update cascade on delete cascade,
  primary key(owner_id,unternehmen)
);
alter table public.wunschfirmen enable row level security;
revoke all on public.wunschfirmen from public, anon, authenticated;
grant select, insert, delete on public.wunschfirmen to authenticated;
grant select, insert, update, delete on public.wunschfirmen to service_role;
drop policy if exists wunschfirmen_eigene_lesen on public.wunschfirmen;
create policy wunschfirmen_eigene_lesen on public.wunschfirmen for select to authenticated using(owner_id=auth.uid());
drop policy if exists wunschfirmen_eigene_einfuegen on public.wunschfirmen;
create policy wunschfirmen_eigene_einfuegen on public.wunschfirmen for insert to authenticated
  with check(owner_id=auth.uid() and public.firma_sichtbar(unternehmen));
drop policy if exists wunschfirmen_eigene_loeschen on public.wunschfirmen;
create policy wunschfirmen_eigene_loeschen on public.wunschfirmen for delete to authenticated using(owner_id=auth.uid());

create table if not exists public.abgleich_stichwoerter (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  begriff text not null check(length(btrim(begriff)) between 2 and 60)
);
create unique index if not exists abgleich_stichwoerter_eindeutig
  on public.abgleich_stichwoerter(owner_id,lower(btrim(begriff)));
alter table public.abgleich_stichwoerter enable row level security;
revoke all on public.abgleich_stichwoerter from public, anon, authenticated;
grant select, insert, delete on public.abgleich_stichwoerter to authenticated;
grant select, insert, update, delete on public.abgleich_stichwoerter to service_role;
grant usage, select on sequence public.abgleich_stichwoerter_id_seq to authenticated, service_role;
drop policy if exists abgleich_stichwoerter_eigene on public.abgleich_stichwoerter;
create policy abgleich_stichwoerter_eigene on public.abgleich_stichwoerter for all to authenticated
  using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create or replace function public.abgleich_stichwoerter_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('abgleich:'||new.owner_id::text,0));
  if (select count(*) from public.abgleich_stichwoerter where owner_id=new.owner_id) >= 50 then
    raise exception 'abgleich_stichwoerter_limit' using errcode='P0001',hint='LIMIT_50';
  end if;
  return new;
end $$;
revoke all on function public.abgleich_stichwoerter_limit() from public, anon, authenticated;
drop trigger if exists abgleich_stichwoerter_limit on public.abgleich_stichwoerter;
create trigger abgleich_stichwoerter_limit before insert on public.abgleich_stichwoerter
  for each row execute function public.abgleich_stichwoerter_limit();

-- Kurze technische DB-Firmenhistorie: öffentliches laeufe enthält niemals Privatnamen.
create table if not exists public.firmen_gesundheit (
  unternehmen text not null references public.companies(name) on update cascade on delete cascade,
  datum date not null,
  bericht jsonb not null check(jsonb_typeof(bericht)='object'),
  primary key(unternehmen,datum)
);
alter table public.firmen_gesundheit enable row level security;
revoke all on public.firmen_gesundheit from public, anon, authenticated;
grant select, insert, update, delete on public.firmen_gesundheit to service_role;
create or replace function public.speichere_firmen_gesundheit(p_datum date,p_berichte jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_datum is null or jsonb_typeof(p_berichte) is distinct from 'array' then
    raise exception 'Ungültige Firmenhistorie';
  end if;
  insert into public.firmen_gesundheit(unternehmen,datum,bericht)
    select z->>'name',p_datum,z from jsonb_array_elements(p_berichte) z
    on conflict(unternehmen,datum) do update set bericht=excluded.bericht;
  delete from public.firmen_gesundheit where datum < current_date-7;
end $$;
revoke all on function public.speichere_firmen_gesundheit(date,jsonb) from public, anon, authenticated;
grant execute on function public.speichere_firmen_gesundheit(date,jsonb) to service_role;

-- Zustellung je Admin statt Fortschreiben anhand des letzten Scraperlaufs.
-- Nur technische Zuordnungen, niemals Telegram-Nachrichten oder Anzeigentexte.
create table if not exists public.digest_stand (
  owner_id uuid primary key references public.admins(user_id) on delete cascade,
  ab date not null
);
create table if not exists public.digest_versand (
  owner_id uuid not null references public.admins(user_id) on delete cascade,
  job_id text not null references public.jobs(id) on update cascade on delete cascade,
  gesendet_am timestamptz not null default now(),
  primary key(owner_id,job_id)
);
alter table public.digest_stand enable row level security;
alter table public.digest_versand enable row level security;
revoke all on public.digest_stand,public.digest_versand from public, anon, authenticated;
grant select, insert, update, delete on public.digest_stand,public.digest_versand to service_role;

create or replace function public.digest_fenster(p_owner uuid,p_initial date)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare grenze date;
begin
  if p_owner is null or p_initial is null or not exists(select 1 from public.admins where user_id=p_owner) then
    raise exception 'Ungültiger Digest-Admin';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('digest:'||p_owner::text,0));
  insert into public.digest_stand(owner_id,ab) values(p_owner,p_initial) on conflict(owner_id) do nothing;
  select ab into grenze from public.digest_stand where owner_id=p_owner;
  return jsonb_build_object('ab',grenze,'gesendet_ids',coalesce((
    select jsonb_agg(v.job_id order by v.job_id) from public.digest_versand v
    join public.jobs j on j.id=v.job_id where v.owner_id=p_owner and j.erstmals_gesehen>grenze
  ),'[]'::jsonb));
end $$;
revoke all on function public.digest_fenster(uuid,date) from public, anon, authenticated;
grant execute on function public.digest_fenster(uuid,date) to service_role;

create or replace function public.digest_erfolg(p_owner uuid,p_ids text[],p_ab date)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_owner is null or p_ab is null or p_ab>=current_date or p_ids is null
     or array_position(p_ids,null) is not null or not exists(select 1 from public.admins where user_id=p_owner) then
    raise exception 'Ungültiger Digest-Abschluss';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('digest:'||p_owner::text,0));
  if not exists(select 1 from public.digest_stand where owner_id=p_owner) then
    raise exception 'Digest-Fenster fehlt';
  end if;
  insert into public.digest_versand(owner_id,job_id)
    select p_owner,i from unnest(p_ids) i on conflict(owner_id,job_id) do nothing;
  update public.digest_stand set ab=greatest(ab,p_ab) where owner_id=p_owner;
  delete from public.digest_versand v using public.jobs j,public.digest_stand s
    where v.job_id=j.id and s.owner_id=p_owner and v.owner_id=s.owner_id and j.erstmals_gesehen<=s.ab;
  return true;
end $$;
revoke all on function public.digest_erfolg(uuid,text[],date) from public, anon, authenticated;
grant execute on function public.digest_erfolg(uuid,text[],date) to service_role;
commit;
