# Öffentlicher Zugang – Design (kurz)

Stand 2026-11-11. Entscheidungen Q62–Q66 des Nutzers.

## Warum
Freunde sollen die Stellenliste ohne Konto ansehen können (Q62 a). Persönliches (Bewerbungen, Konto, Dokumente) bleibt hinter der Anmeldung.

## Ziele
- Ohne Anmeldung erreichbar: `/` (leitet auf `/stellen`), `/stellen`, `/stellen/<id>`, `/impressum`, `/datenschutz`, `/login`, `/auth/*`.
- Besucher ohne Konto sehen: Liste mit Filtern und Kurzinfo, Detailseite mit Steckbrief und Link zur Original-Anzeige.
- Besucher ohne Konto sehen NICHT: ganzen Anzeigentext, Abschnitte, `beschreibung_kurz`, Logos (Q66), Ranglisten außer offen lizenzierten (Q62; Ranglisten kommen erst in Phase 4, die Regel gilt dann).
- Statt „Merken“: Link „Anmelden zum Merken“.
- Impressum mit Name, Anschrift, E-Mail (Q63 a, Q64): Werte nur aus Umgebungsvariablen, nie im Repo. Datenschutz-Seite „Verantwortlich“ ebenso.
- Praktisch nicht auffindbar: `noindex, nofollow, noarchive` als Meta-Tag UND als `X-Robots-Tag`-Header auf jeder Antwort; keine Sitemap, keine robots.txt-Sperre (sonst sähen Suchmaschinen das noindex nicht). Schwer zu erratende Vercel-Adresse richtet der Nutzer ein.

## Nicht-Ziele
Ranglisten-Anzeige, Registrierung ohne Einladung, Zählung von Besuchern, Cookie-Banner (ohne Anmeldung werden keine Cookies gesetzt).

## Ansätze
1. **Gewählt: Datenbank-Spaltenrechte für die Rolle `anon` + RLS-Policies nur für sichtbare, offene Stellen.** Die Datenbank selbst verweigert den Anzeigentext; auch wer den öffentlichen Supabase-Schlüssel direkt benutzt, bekommt ihn nicht.
2. Verworfen: Lesen über den Service-Schlüssel auf dem Server und Filtern im Code. Ein Fehler im Code würde Text preisgeben, und der Service-Schlüssel umgeht alle Schutzregeln.
3. Verworfen: Eine öffentliche View. Doppelte Abfragelogik für Liste, Facetten und Detail.

## Festlegungen
- Migration `007_oeffentlich.sql` (mehrfach ausführbar): Tabellenrechte von `anon` auf `jobs`, `companies`, `laeufe` entziehen; Spaltenrechte nur für die Spalten, die Liste und Detail brauchen; Policies `to anon` (jobs: `sichtbar and status = 'offen'`; companies: `aktiv`; laeufe: `true`, nur Spalte `datum`); `grant execute on function public.facetten() to anon`.
- Umgebungsvariablen: `IMPRESSUM_NAME`, `IMPRESSUM_STRASSE`, `IMPRESSUM_ORT` (PLZ + Ort), `IMPRESSUM_EMAIL`. Fehlt eine, zeigt die Seite „Impressum noch nicht eingerichtet“ (kein Absturz, kein Bau-Fehler).
- „Auch im Anzeigentext suchen“ gibt es ohne Anmeldung nicht; ein `?volltext=1` in der Adresse wird ignoriert.

## Dem Bauenden überlassen
Texte der Hinweise, genaue Kopfzeile ohne Anmeldung (mindestens „Stellen“ und „Anmelden“).
