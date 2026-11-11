-- Tracker-Paket: Runde und Kommentar pro Bewerbung, Firmenlogo, Verlauf-Eintraege loeschen (fuer "Rueckgaengig"). Im Supabase SQL Editor ausfuehren (mehrfach ausfuehrbar).
alter table public.applications add column if not exists runde smallint;
alter table public.applications drop constraint if exists applications_runde_check;
alter table public.applications add constraint applications_runde_check check (runde between 1 and 4);

alter table public.applications add column if not exists kommentar text;
alter table public.applications drop constraint if exists applications_kommentar_check;
alter table public.applications add constraint applications_kommentar_check check (char_length(kommentar) <= 140);

alter table public.companies add column if not exists logo_url text;

drop policy if exists application_events_delete on public.application_events;
create policy application_events_delete on public.application_events for delete to authenticated
  using (owner_id = (select auth.uid()));
