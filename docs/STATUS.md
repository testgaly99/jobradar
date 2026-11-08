# STATUS

Stand: 2026-11-08

## Was funktioniert (Phase 1, Code fertig)
- Täglicher Lauf per GitHub Actions („Täglicher Lauf“, 04:00 UTC): ruft die Stellen von 4 Firmen ab (Helsing, The Exploration Company, Taktile, telli), schreibt sie in Supabase und legt `data/bericht.md` ab.
- Neue Website in `web/` (Next.js): Login, Stellenliste mit Filtern, Bewerbungs-Tracker, Link einfügen, Dokumente, Export.
- Die alten Stellen aus `data/jobs.json` sind nach Supabase umgezogen (`scraper/umzug.py`, einmalig, 221 Stellen mit dem echten Erstdatum). Die alte Seite (`site/`) und GitHub Pages im Workflow sind entfernt.
- Backup-Repo `jobradar-privat` ist lokal vorbereitet (täglicher `pg_dump`), aber noch nicht auf GitHub.
- Repo: https://github.com/testgaly99/jobradar (öffentlich)
- Tests: `py -m pytest` und `npm test` in `web/`.

## Bekannte Probleme
- 9 der 13 Firmen in `data/companies.csv` sind noch nicht angebunden (`aktiv=nein`).
- Das Backup-Workflow ist noch nie gelaufen.

## Umgebung (Windows 11, lokal)
- Python 3.12 immer über `py` aufrufen, nicht über `python`.
- Node v24 ist installiert, die GitHub CLI (`gh`) auch.
- In Git ist für dieses Repo die Identität testgaly99 eingetragen.

## Offene To-dos für den Nutzer
1. Migrationen `002`, `003`, `004` im Supabase SQL Editor ausführen (siehe README „Datenbank einrichten“).
2. Neue Registrierungen abschalten (Supabase → Authentication → Sign In / Providers → „Allow new users to sign up“ aus), sobald dein Konto existiert.
3. Secret Key rotieren: Er war einmal im Chat sichtbar. Supabase → API Keys → neuen Secret key anlegen → in `.env` und im GitHub-Secret `SUPABASE_SERVICE_KEY` eintragen → alten löschen.
4. Vercel einrichten (README „Vercel einrichten“), danach die Vercel-Adresse in Supabase → Authentication → URL Configuration eintragen.
5. `jobradar-privat` auf GitHub anlegen (privat), den Ordner dorthin pushen und das Secret `SUPABASE_DB_URL` (Session pooler URI) setzen. Dann den Workflow einmal von Hand starten.
6. Nach dem Merge GitHub Pages abschalten: Repo → Settings → Pages → Source auf „None“ bzw. die Seite entfernen.

## Nächster Schritt
Abschlussprüfung von Phase 1 (`/ponytail-review`), Merge von `phase-1` nach `main`, dann die To-dos oben. Danach Phase 2.
