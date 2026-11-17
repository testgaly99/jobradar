-- 009: Spalten für die KI-Auswertung (Groq) an jobs.
-- Im Supabase SQL Editor ausführen; mehrfach ausführbar (if not exists).
--   ki          jsonb: aufgaben, rahmen, abschluss, erfahrung, muss, benefits, sprache
--   ki_hash     text:  Hash des Stellentexts, zu dem die Auswertung gehört (neu auswerten, wenn er sich ändert)
--   ki_modell   text:  verwendetes Modell, bei gescheiterter Auswertung "fehler"
--   studium     text:  ja | nein | unklar   (nein blendet die Stelle aus)
--   taetigkeit  text:  anspruchsvoll | einfach
-- Alle Spalten dürfen leer sein (noch nicht ausgewertet).
-- Bewusst KEINE Rechte für anon: 007 vergibt Spaltenrechte einzeln, die neuen Spalten bleiben für Gäste unsichtbar.
alter table public.jobs
  add column if not exists ki jsonb,
  add column if not exists ki_hash text,
  add column if not exists ki_modell text,
  add column if not exists studium text,
  add column if not exists taetigkeit text;

-- Check-Constraints ohne "if not exists"-Syntax: erst entfernen, dann neu setzen.
alter table public.jobs drop constraint if exists jobs_studium_check;
alter table public.jobs add constraint jobs_studium_check check (studium in ('ja', 'nein', 'unklar'));
alter table public.jobs drop constraint if exists jobs_taetigkeit_check;
alter table public.jobs add constraint jobs_taetigkeit_check check (taetigkeit in ('anspruchsvoll', 'einfach'));
