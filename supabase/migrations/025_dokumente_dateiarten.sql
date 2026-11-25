-- Q308 (Sicherheitsprüfung 2026-11-25, Befund 8): Speicher nimmt nur PDF, Word, JPG und PNG an.
-- Gilt nur für neue Uploads; vorhandene Dateien bleiben. Mehrfaches Ausführen schadet nicht.
-- Gleiche Liste wie DATEIARTEN in web/lib/dokumente.ts.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]
where id = 'dokumente';
