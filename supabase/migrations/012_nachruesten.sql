-- Link-Schnellstart: Bewerbungen aus Firmen-Karriereseiten werden im Nachtlauf nachgerüstet (Gliederung, Steckbrief, Groq).
-- Nur als Datei vorbereitet; der Nutzer spielt sie im Supabase SQL Editor ein. Wiederholbar ausführbar.
alter table public.applications
  add column if not exists nachruesten boolean not null default false,
  add column if not exists snapshot_steckbrief jsonb,
  add column if not exists snapshot_ki jsonb;
