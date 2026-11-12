-- 008: Status „Eingang bestätigt“ wird nicht mehr genutzt.
-- Bestehende Bewerbungen in diesem Status gehen zurück auf „Beworben“.
-- Der Trigger log_status_wechsel ist dabei aus, damit kein künstlicher Verlauf entsteht;
-- alte Verlaufseinträge bleiben und zählen in der Auswertung weiter als Antwort.
-- Der Wert bleibt im Enum (Postgres kann Enum-Werte nicht einfach löschen), die App bietet ihn nur nicht mehr an.
begin;
alter table public.applications disable trigger applications_status_log;
update public.applications set status = 'beworben' where status = 'eingang_bestaetigt';
alter table public.applications enable trigger applications_status_log;
commit;
