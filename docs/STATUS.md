# STATUS

Stand: 2026-11-08

## Was funktioniert (Phase 1 und 2, Code fertig)
- Täglicher Lauf per GitHub Actions („Täglicher Lauf“, 04:00 UTC): ruft die Stellen von 4 Firmen ab (Helsing, The Exploration Company, Taktile, telli), schreibt sie in Supabase und legt `data/bericht.md` ab.
- Neue Website in `web/` (Next.js): Login, Stellenliste mit Filtern, Bewerbungs-Tracker, Link einfügen, Dokumente, Export.
- Die alten Stellen aus `data/jobs.json` sind nach Supabase umgezogen (`scraper/umzug.py`, einmalig, 221 Stellen mit dem echten Erstdatum). Die alte Seite (`site/`) und GitHub Pages im Workflow sind entfernt.
- Backup-Repo `jobradar-privat` ist auf GitHub (privat, Stand c51c373, Sichtbarkeit geprüft) mit täglichem `pg_dump`; ohne das Secret `SUPABASE_DB_URL` läuft es noch nicht.
- Phase 2 (Freunde): Mehrere Nutzer, jeder sieht nur seine Daten. Unter `/konto` löscht jeder sein Konto samt Daten selbst (Bestätigungswort LÖSCHEN); das Admin-Konto kann nie gelöscht werden. `/admin/nutzer` zeigt dem Admin Name, E-Mail und „dabei seit“ mit „Entfernen“, nie Bewerbungen. Öffentliche Seite `/datenschutz`, verlinkt in der Fußzeile und beim Login. Neue Server-Variablen: `SUPABASE_SERVICE_KEY`, `ADMIN_EMAIL` (mehrere durch Komma).
- Repo: https://github.com/testgaly99/jobradar (öffentlich)
- Tests: `py -m pytest` und `npm test` in `web/`.

## Bekannte Probleme
- 9 der 13 Firmen in `data/companies.csv` sind noch nicht angebunden (`aktiv=nein`).
- Der Backup-Workflow ist noch nie gelaufen (Secret `SUPABASE_DB_URL` fehlt).

## Umgebung (Windows 11, lokal)
- Python 3.12 immer über `py` aufrufen, nicht über `python`.
- Node v24 ist installiert, die GitHub CLI (`gh`) auch.
- In Git ist für dieses Repo die Identität testgaly99 eingetragen.

## Offene To-dos für den Nutzer (Schlussliste Phase 2)
1. ~~Migrationen `002`, `003`, `004` ausführen~~ **Erledigt 2026-11-08**, von Claude geprüft: Filter-Zahlen, Schutz vor doppelten Bewerbungen und Löschschutz für verwendete Dokumente wirken; der Lösch-Test besteht.
2. Klicktest der Seiten: Bewerbung aus einer Stelle, aus einem Link und manuell anlegen; Status ändern; Verlauf und Kanban ansehen; ein Dokument hochladen; den Export öffnen; Admin-Seite „Nutzer“ ansehen. Danach einmal mit dem zweiten Konto `ichqwer16@gmail.com` (kein Admin) anmelden und prüfen, was ein Freund sieht. Auffälligkeiten mit Bildschirmfoto melden.
3. Secret Key rotieren: Er war einmal im Chat sichtbar. Supabase → API Keys → neuen Secret key anlegen → in `.env`, `web/.env.local` und im GitHub-Secret `SUPABASE_SERVICE_KEY` eintragen → alten löschen.
4. Vercel einrichten (README „Vercel einrichten“), dabei auch die Server-Variablen `SUPABASE_SERVICE_KEY` und `ADMIN_EMAIL=markgaly99@gmail.com` eintragen (ohne `NEXT_PUBLIC_`).
5. Die Vercel-Adresse in Supabase → Authentication → URL Configuration eintragen (Site URL und Redirect URLs).
6. Im Repo `jobradar-privat` das Secret `SUPABASE_DB_URL` (Session-Pooler-URI) setzen und den Workflow „Backup“ einmal von Hand starten. Warum: ohne das Secret kann das Backup die Datenbank nicht erreichen.
7. GitHub Pages abschalten: Repo → Settings → Pages → Source auf „None“ bzw. die Seite entfernen.
8. Den ersten Freund als Google-Testnutzer eintragen (README „Freunde einladen“).

## Nächster Schritt
Die Liste oben abarbeiten, dann Phase 2 abschließen und nach `main` mergen.
