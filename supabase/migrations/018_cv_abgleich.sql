-- Phase 6a: CV-Abgleich. Wiederholbar ausführbar; setzt 001, 004 und 023 voraus.
-- Alles nur für den Eigentümer (auch der Admin sieht fremde Zeilen nicht); Gäste ohne Rechte.
begin;

-- Anforderungsliste je Stelle und je Bewerbung ohne Stelle (Q111)
alter table public.jobs add column if not exists anforderungsliste jsonb;
alter table public.jobs add column if not exists anforderungs_hash text;
alter table public.applications add column if not exists anforderungsliste jsonb;
alter table public.applications add column if not exists anforderungs_hash text;

-- Höchstens eine Standard-CV je Nutzer
alter table public.documents add column if not exists standard boolean not null default false;
create unique index if not exists documents_ein_standard on public.documents(owner_id) where standard;

create table if not exists public.cv_texte (
  dokument_id uuid primary key references public.documents(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null default '',
  herkunft text not null check (herkunft in ('ausgelesen','korrigiert','leer')),
  hash text not null,
  geaendert timestamptz not null default now()
);

create table if not exists public.cv_profile (
  dokument_id uuid primary key references public.documents(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  text_hash text not null,
  aussagen jsonb not null check (jsonb_typeof(aussagen) = 'array')
);

create table if not exists public.cv_ergebnisse (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  job_id text references public.jobs(id) on update cascade on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  weg text not null check (weg in ('claude','browser','browser-vorlaeufig')),
  empfohlen uuid[] not null,
  geprueft uuid[] not null,
  anforderungen jsonb not null check (jsonb_typeof(anforderungen) = 'array'),
  anforderungs_hash text not null,
  cv_hashes jsonb not null,
  erstellt timestamptz not null default now(),
  constraint cv_ergebnis_genau_ein_ziel check ((job_id is null) <> (application_id is null))
);
create unique index if not exists cv_ergebnisse_job on public.cv_ergebnisse(owner_id, job_id) where job_id is not null;
create unique index if not exists cv_ergebnisse_bewerbung on public.cv_ergebnisse(owner_id, application_id) where application_id is not null;

create table if not exists public.cv_einwilligung (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  erteilt_am timestamptz not null default now()
);

alter table public.cv_texte enable row level security;
alter table public.cv_profile enable row level security;
alter table public.cv_ergebnisse enable row level security;
alter table public.cv_einwilligung enable row level security;
revoke all on public.cv_texte, public.cv_profile, public.cv_ergebnisse, public.cv_einwilligung from public, anon, authenticated;
grant select, insert, update, delete on public.cv_texte, public.cv_profile, public.cv_ergebnisse, public.cv_einwilligung to authenticated;
grant select, insert, update, delete on public.cv_texte, public.cv_profile, public.cv_ergebnisse, public.cv_einwilligung to service_role;
grant usage, select on sequence public.cv_ergebnisse_id_seq to authenticated, service_role;

drop policy if exists cv_texte_eigene on public.cv_texte;
create policy cv_texte_eigene on public.cv_texte for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.documents d
    where d.id = dokument_id and d.owner_id = auth.uid() and d.art = 'cv'));
drop policy if exists cv_profile_eigene on public.cv_profile;
create policy cv_profile_eigene on public.cv_profile for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.documents d
    where d.id = dokument_id and d.owner_id = auth.uid() and d.art = 'cv'));
drop policy if exists cv_ergebnisse_eigene on public.cv_ergebnisse;
create policy cv_ergebnisse_eigene on public.cv_ergebnisse for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (application_id is null or exists (select 1 from public.applications a
    where a.id = application_id and a.owner_id = auth.uid())));
drop policy if exists cv_einwilligung_eigene on public.cv_einwilligung;
create policy cv_einwilligung_eigene on public.cv_einwilligung for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Veraltete Ergebnisse sofort löschen (Q31, Review Focus 2). Läuft mit den Rechten des Auslösers:
-- Nutzer löschen so nur eigene Ergebnisse, der Nachtlauf (service_role) alle betroffenen.
create or replace function public.cv_ergebnisse_je_owner_loeschen() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.cv_ergebnisse where owner_id = coalesce(new.owner_id, old.owner_id);
  return null;
end $$;
create or replace function public.cv_ergebnisse_je_stelle_loeschen() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'jobs' then
    delete from public.cv_ergebnisse where job_id = new.id;
  else
    delete from public.cv_ergebnisse where application_id = new.id;
  end if;
  return null;
end $$;
revoke all on function public.cv_ergebnisse_je_owner_loeschen() from public, anon, authenticated;
revoke all on function public.cv_ergebnisse_je_stelle_loeschen() from public, anon, authenticated;

drop trigger if exists cv_texte_neu_oder_weg on public.cv_texte;
create trigger cv_texte_neu_oder_weg after insert or delete on public.cv_texte
  for each row execute function public.cv_ergebnisse_je_owner_loeschen();
drop trigger if exists cv_texte_geaendert on public.cv_texte;
create trigger cv_texte_geaendert after update of hash on public.cv_texte
  for each row when (old.hash is distinct from new.hash) execute function public.cv_ergebnisse_je_owner_loeschen();
drop trigger if exists cv_profile_geaendert on public.cv_profile;
create trigger cv_profile_geaendert after update of text_hash on public.cv_profile
  for each row when (old.text_hash is distinct from new.text_hash) execute function public.cv_ergebnisse_je_owner_loeschen();
drop trigger if exists jobs_anforderungen_geaendert on public.jobs;
create trigger jobs_anforderungen_geaendert after update of anforderungs_hash on public.jobs
  for each row when (old.anforderungs_hash is distinct from new.anforderungs_hash) execute function public.cv_ergebnisse_je_stelle_loeschen();
drop trigger if exists applications_anforderungen_geaendert on public.applications;
create trigger applications_anforderungen_geaendert after update of anforderungs_hash on public.applications
  for each row when (old.anforderungs_hash is distinct from new.anforderungs_hash) execute function public.cv_ergebnisse_je_stelle_loeschen();
commit;
