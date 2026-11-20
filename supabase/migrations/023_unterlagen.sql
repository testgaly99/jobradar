-- Runde 1 Unterlagen: Briefkopf, Anschreiben-Vorlagen, Anlagen je Bewerbung, Anrede am Kontakt, Art der Anlage.
-- Wiederholbar ausfuehrbar. Im Supabase SQL Editor ausfuehren.

create table if not exists public.briefkopf (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text, strasse text, plz_ort text, telefon text, email text, linkedin text,
  geaendert_am timestamptz not null default now()
);

create table if not exists public.anschreiben_vorlagen (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  betreff text not null default 'Bewerbung als {{stelle}}',
  text text not null check (char_length(text) <= 20000),
  geaendert_am timestamptz not null default now()
);
create index if not exists anschreiben_vorlagen_owner_idx on public.anschreiben_vorlagen (owner_id);

-- Angehakte Anlagen: Dokument laesst sich nicht loeschen, solange es angehakt ist.
create table if not exists public.bewerbung_anlagen (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete restrict,
  primary key (application_id, document_id)
);
create index if not exists bewerbung_anlagen_owner_idx on public.bewerbung_anlagen (owner_id);
create index if not exists bewerbung_anlagen_dokument_idx on public.bewerbung_anlagen (document_id);

alter table public.contacts add column if not exists anrede text check (anrede in ('frau','herr','ohne'));
-- Nur bei art = 'anlage' gesetzt; der spaetere Bewerben-Helfer laedt Anlagen nach Art in passende Felder (Q182).
alter table public.documents add column if not exists anlage_art text check (anlage_art in ('zeugnis','zertifikat','sonstiges'));

drop trigger if exists briefkopf_geaendert_am on public.briefkopf;
create trigger briefkopf_geaendert_am before update on public.briefkopf
  for each row execute function public.set_geaendert_am();
drop trigger if exists anschreiben_vorlagen_geaendert_am on public.anschreiben_vorlagen;
create trigger anschreiben_vorlagen_geaendert_am before update on public.anschreiben_vorlagen
  for each row execute function public.set_geaendert_am();

alter table public.briefkopf enable row level security;
alter table public.anschreiben_vorlagen enable row level security;
alter table public.bewerbung_anlagen enable row level security;

revoke all on public.briefkopf, public.anschreiben_vorlagen, public.bewerbung_anlagen from anon;

drop policy if exists briefkopf_own on public.briefkopf;
create policy briefkopf_own on public.briefkopf for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists anschreiben_vorlagen_own on public.anschreiben_vorlagen;
create policy anschreiben_vorlagen_own on public.anschreiben_vorlagen for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists bewerbung_anlagen_own on public.bewerbung_anlagen;
create policy bewerbung_anlagen_own on public.bewerbung_anlagen for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.applications a where a.id = application_id and a.owner_id = (select auth.uid()))
    and exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid()))
  );
