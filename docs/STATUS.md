# STATUS

Stand: 2026-11-08

## Was funktioniert (Phase 1, Code fertig)
- „Täglicher Lauf“ (GitHub Actions) ist **pausiert** bis zum Ende aller Phasen und startet nur per Knopf. Er ruft die Stellen von 4 Firmen ab (Helsing, The Exploration Company, Taktile, telli), schreibt sie in Supabase und legt `data/bericht.md` ab.
- Neue Website in `web/` (Next.js): Login, Stellenliste mit Filtern, Bewerbungs-Tracker, Link einfügen, Dokumente, Export.
- Die alten Stellen aus `data/jobs.json` sind nach Supabase umgezogen (`scraper/umzug.py`, einmalig, 221 Stellen mit dem echten Erstdatum). Die alte Seite (`site/`) und GitHub Pages im Workflow sind entfernt.
- Backup-Repo `jobradar-privat` ist auf GitHub (privat, Stand c51c373, Sichtbarkeit geprüft) mit täglichem `pg_dump`; ohne das Secret `SUPABASE_DB_URL` läuft es noch nicht.
- Repo: https://github.com/testgaly99/jobradar (öffentlich)
- Tests: `py -m pytest` und `npm test` in `web/`.

## Bekannte Probleme
- Weil der tägliche Lauf pausiert ist, kann Supabase das Projekt nach ca. 7 Tagen ohne Aktivität pausieren. Abhilfe: Supabase → Projekt → „Restore project“, oder den Lauf per Knopf starten.
- 9 der 13 Firmen in `data/companies.csv` sind noch nicht angebunden (`aktiv=nein`).
- Der Backup-Workflow ist noch nie gelaufen (Secret `SUPABASE_DB_URL` fehlt).

## Umgebung (Windows 11, lokal)
- Python 3.12 immer über `py` aufrufen, nicht über `python`.
- Node v24 ist installiert, die GitHub CLI (`gh`) auch.
- In Git ist für dieses Repo die Identität testgaly99 eingetragen.

## Offene To-dos für den Nutzer
1. Migrationen `002`, `003`, `004` im Supabase SQL Editor ausführen, in dieser Reihenfolge (siehe README „Datenbank einrichten“). Ohne 002 fehlen die Zahlen an den Filtern. Ohne 003 sind doppelte Bewerbungen möglich. Ohne 004 lässt sich ein verwendeter Lebenslauf löschen.
1a. Klicktest der neuen Seiten (nach Punkt 1): Bewerbung aus einer Stelle, aus einem Link und manuell anlegen; Status ändern; Verlauf und Kanban ansehen; ein Dokument hochladen; den Export öffnen. Auffälligkeiten mit Bildschirmfoto melden.
2. Neue Registrierungen abschalten (Supabase → Authentication → Sign In / Providers → „Allow new users to sign up“ aus), sobald dein Konto existiert.
3. Secret Key rotieren: Er war einmal im Chat sichtbar. Supabase → API Keys → neuen Secret key anlegen → in `.env` und im GitHub-Secret `SUPABASE_SERVICE_KEY` eintragen → alten löschen.
4. Vercel einrichten (README „Vercel einrichten“), danach die Vercel-Adresse in Supabase → Authentication → URL Configuration eintragen.
5. Im Repo `jobradar-privat` das Secret `SUPABASE_DB_URL` (Session-Pooler-URI) setzen und den Workflow „Backup“ einmal von Hand starten. Warum: ohne das Secret kann das Backup die Datenbank nicht erreichen.
6. Nach dem Merge GitHub Pages abschalten: Repo → Settings → Pages → Source auf „None“ bzw. die Seite entfernen.

## Nächster Schritt
Merge von `phase-1` nach `main`, dann die To-dos oben. Danach Phase 2.
