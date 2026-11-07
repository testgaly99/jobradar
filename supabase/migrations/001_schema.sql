-- jobradar Schema + Zugriffsschutz (RLS). Im Supabase SQL Editor ausfuehren.

do $$ begin
  create type public.application_status as enum
    ('gemerkt','beworben','eingang_bestaetigt','im_gespraech','angebot','abgeschlossen');
exception when duplicate_object then null; end $$;

-- ---------- Scraper-Tabellen (Schreiben nur per Service-Key) ----------
create table if not exists public.companies (
  name text primary key,
  careers_url text,
  ats_typ text,
  ats_id text,
  mitarbeitende_ca int,
  groesse_klasse text,
  kategorie text[],
  hauptsitz text,
  aktiv boolean not null default true
);

create table if not exists public.jobs (
  id text primary key,                       -- firma:ext_id
  unternehmen text references public.companies(name) on update cascade,
  titel text, ort text, staedte text[], remote boolean,
  arbeitsmodell text, vertragsart text, abteilung text, erfahrungslevel text,
  url text, beschreibung_kurz text,
  text text,
  text_hash text,
  erstmals_gesehen date, zuletzt_gesehen date,
  status text not null default 'offen' check (status in ('offen','geschlossen')),
  sichtbar boolean not null default true
);
create index if not exists jobs_unternehmen_idx on public.jobs (unternehmen);
create index if not exists jobs_sichtbar_status_idx on public.jobs (sichtbar, status);

create table if not exists public.laeufe (
  id bigint generated always as identity primary key,
  datum date not null default current_date,
  bericht jsonb
);

-- ---------- Nutzer-Tabellen ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  art text check (art in ('cv','anschreiben','anlage')),
  name text,
  version_datum date,
  storage_pfad text
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  job_id text references public.jobs(id) on delete set null,
  firma text, titel text, link text, quelle text, standort text, praesenzmodell text,
  snapshot_text text, anforderungen text,
  beworben_am date, bewerbungsweg text, referenznummer text, portal_hinweis text,
  cv_dokument_id uuid references public.documents(id) on delete set null,
  anschreiben_dokument_id uuid references public.documents(id) on delete set null,
  gehalt_spanne_anzeige text, gehalt_wunsch text, angebot_fix text, angebot_variabel text,
  angebot_urlaub text, angebot_benefits text, gehalt_aktuell_vergleich text,
  starttermin date, kuendigungsfrist text, referenzen text,
  ergebnis text check (ergebnis in ('zusage','absage','zurueckgezogen','angebot_abgelehnt')),
  absagegrund text, feedback text, rueckzug_grund text,
  interesse int check (interesse between 1 and 5),
  tags text[], notizen text,
  status public.application_status not null default 'gemerkt',
  naechster_schritt text, naechster_schritt_faellig date,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index if not exists applications_owner_status_idx on public.applications (owner_id, status);
create index if not exists applications_job_idx on public.applications (job_id);
create index if not exists applications_cv_idx on public.applications (cv_dokument_id);
create index if not exists applications_anschreiben_idx on public.applications (anschreiben_dokument_id);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  datum timestamptz not null default now(),
  alter_status public.application_status,
  neuer_status public.application_status,
  notiz text
);
create index if not exists application_events_app_idx on public.application_events (application_id);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  firma text, name text, rolle text, email text, telefon text, linkedin text,
  art text check (art in ('ansprechpartner','eigener_kontakt','empfehlungsgeber'))
);
create index if not exists contacts_app_idx on public.contacts (application_id);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  datum timestamptz, format text, teilnehmer text,
  fragen_gestellt text, eigene_fragen text, eindruck text,
  aufgabe text, aufgabe_frist date
);
create index if not exists interviews_app_idx on public.interviews (application_id);
create index if not exists documents_owner_idx on public.documents (owner_id);
create index if not exists contacts_owner_idx on public.contacts (owner_id);
create index if not exists interviews_owner_idx on public.interviews (owner_id);
create index if not exists application_events_owner_idx on public.application_events (owner_id);

-- ---------- Trigger ----------
create or replace function public.set_geaendert_am() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.geaendert_am := pg_catalog.now();
  return new;
end $$;

drop trigger if exists applications_geaendert_am on public.applications;
create trigger applications_geaendert_am before update on public.applications
  for each row execute function public.set_geaendert_am();

-- invoker genuegt: der Nutzer darf eigene Events anlegen (RLS-Policy unten)
create or replace function public.log_status_wechsel() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.application_events (application_id, owner_id, alter_status, neuer_status)
    values (new.id, new.owner_id, old.status, new.status);
  end if;
  return new;
end $$;

drop trigger if exists applications_status_log on public.applications;
create trigger applications_status_log after update of status on public.applications
  for each row execute function public.log_status_wechsel();

-- ---------- Rechte + RLS ----------
alter table public.companies          enable row level security;
alter table public.jobs               enable row level security;
alter table public.laeufe             enable row level security;
alter table public.documents          enable row level security;
alter table public.applications       enable row level security;
alter table public.application_events enable row level security;
alter table public.contacts           enable row level security;
alter table public.interviews         enable row level security;

revoke all on public.companies, public.jobs, public.laeufe, public.documents, public.applications,
  public.application_events, public.contacts, public.interviews from anon;
revoke insert, update, delete, truncate on public.companies, public.jobs, public.laeufe from authenticated;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated using (true);

drop policy if exists laeufe_select on public.laeufe;
create policy laeufe_select on public.laeufe for select to authenticated using (true);

-- Jobs sind geteilte, nicht private Daten: eine versteckte Stelle ueber die eigene Bewerbung zu sehen ist gewollt.
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select to authenticated using (
  sichtbar = true
  or exists (select 1 from public.applications a
             where a.job_id = jobs.id and a.owner_id = (select auth.uid()))
);

drop policy if exists documents_own on public.documents;
create policy documents_own on public.documents for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists applications_own on public.applications;
create policy applications_own on public.applications for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (cv_dokument_id is null or exists (select 1 from public.documents d
         where d.id = cv_dokument_id and d.owner_id = (select auth.uid())))
    and (anschreiben_dokument_id is null or exists (select 1 from public.documents d
         where d.id = anschreiben_dokument_id and d.owner_id = (select auth.uid())))
  );

-- Audit-Trail: nur lesen und anlegen, kein Update/Delete
drop policy if exists application_events_own on public.application_events;
drop policy if exists application_events_select on public.application_events;
create policy application_events_select on public.application_events for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists application_events_insert on public.application_events;
create policy application_events_insert on public.application_events for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.applications a
                where a.id = application_id and a.owner_id = (select auth.uid()))
  );

drop policy if exists contacts_own on public.contacts;
create policy contacts_own on public.contacts for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (application_id is null or exists (select 1 from public.applications a
         where a.id = application_id and a.owner_id = (select auth.uid())))
  );

drop policy if exists interviews_own on public.interviews;
create policy interviews_own on public.interviews for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.applications a
                where a.id = application_id and a.owner_id = (select auth.uid()))
  );

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('dokumente', 'dokumente', false)
on conflict do nothing;

drop policy if exists dokumente_select on storage.objects;
create policy dokumente_select on storage.objects for select to authenticated using (
  bucket_id = 'dokumente' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists dokumente_insert on storage.objects;
create policy dokumente_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'dokumente' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists dokumente_update on storage.objects;
create policy dokumente_update on storage.objects for update to authenticated
  using (bucket_id = 'dokumente' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'dokumente' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists dokumente_delete on storage.objects;
create policy dokumente_delete on storage.objects for delete to authenticated using (
  bucket_id = 'dokumente' and (storage.foldername(name))[1] = (select auth.uid())::text);
