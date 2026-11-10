# STATUS

Stand: 2026-11-09

## Was funktioniert (Phase 1, 2 und 2b, Code fertig)
- Täglicher Lauf per GitHub Actions („Täglicher Lauf“, 04:00 UTC): ruft die Stellen von 4 Firmen ab (Helsing, The Exploration Company, Taktile, telli), schreibt sie in Supabase und legt `data/bericht.md` ab.
- Neue Website in `web/` (Next.js): Login, Stellenliste mit Filtern, Bewerbungs-Tracker, Link einfügen, Dokumente, Export.
- Die alten Stellen aus `data/jobs.json` sind nach Supabase umgezogen (`scraper/umzug.py`, einmalig, 221 Stellen mit dem echten Erstdatum). Die alte Seite (`site/`) und GitHub Pages im Workflow sind entfernt.
- Backup-Repo `jobradar-privat` ist auf GitHub (privat, Stand c51c373, Sichtbarkeit geprüft) mit täglichem `pg_dump`; ohne das Secret `SUPABASE_DB_URL` läuft es noch nicht.
- Phase 2 (Freunde): Mehrere Nutzer, jeder sieht nur seine Daten. Unter `/konto` löscht jeder sein Konto samt Daten selbst (Bestätigungswort LÖSCHEN); das Admin-Konto kann nie gelöscht werden. `/admin/nutzer` zeigt dem Admin Name, E-Mail und „dabei seit“ mit „Entfernen“, nie Bewerbungen. Öffentliche Seite `/datenschutz`, verlinkt in der Fußzeile und beim Login. Neue Server-Variablen: `SUPABASE_SERVICE_KEY`, `ADMIN_EMAIL` (mehrere durch Komma).
- Phase 2b (Überarbeitung, Code fertig, braucht Migration 005): Stellenliste mit Größe nach Mitarbeitenden, Level mit Jahren, Branche/Funktion, Land-Filter, „Online seit“, „Neu“-Marke (≤ 3 Tage), besserer Suche, „Merken“ und einstellbarer Kurzbeschreibung. Detailseite mit Steckbrief (Erfahrung, Gehalt, Sprachen, Sicherheitsüberprüfung, regelbasiert in `scraper/steckbrief.py`, ohne KI) und „Ganze Anzeige lesen“ (`scraper/abschnitte.py`). `/konto` zeigt eigene Daten, Bewerbungen nach Stand, Export, „Wichtige Punkte“ (bis 50, gelb markiert) und die Listen-Felder. Bewerbungen speichern die Anzeige gegliedert (`snapshot_abschnitte`, der tägliche Lauf reicht sie nach). Admin „Nutzer“ zeigt Kennzahlen (aktiv 7/30 Tage, Bewerbungen pro Woche, letzter Login), nie Inhalte. Design „utilitär“ (`web/app/stil/utilitaer.css`).
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
2. ~~Migration `005_abschnitte_land.sql` ausführen~~ **Erledigt 2026-11-09**, von Claude geprüft: alle Tests grün, 219 offene Stellen haben Land, Abschnitte und Steckbrief. Ursprüngliche Anleitung: Supabase → „SQL Editor“ → Datei `supabase/migrations/005_abschnitte_land.sql` öffnen, den ganzen Inhalt kopieren, einfügen, „Run“. Warum: Ohne sie fehlen Land-Filter, gegliederte Anzeige und Steckbrief, „Wichtige Punkte“, die Listen-Einstellungen und die Admin-Kennzahlen. Erfolg: unten steht „Success. No rows returned“. Mehrfaches Ausführen schadet nicht. Danach Claude Bescheid sagen („005 ist drin“): Claude startet dann einmal den Abruf mit dem neuen Code, damit Land, Steckbrief und Abschnitte der Stellen gefüllt werden. Der Lauf auf GitHub kann das erst nach dem Hochladen von Phase 2.
3. Klicktest der Seiten: Bewerbung aus einer Stelle, aus einem Link und manuell anlegen; Status ändern; Verlauf und Kanban ansehen; ein Dokument hochladen; den Export öffnen; Admin-Seite „Nutzer“ ansehen. Neu seit Phase 2b: in der Stellenliste Filter (Größe, Level, Branche, Funktion, Land, „Online seit“) und Suche ausprobieren und auf „Neu“-Marken achten; „Merken“ klicken (die Bewerbung erscheint im Tracker); eine Stelle öffnen und Steckbrief sowie „Ganze Anzeige lesen“ prüfen; unter „Konto“ einen Begriff bei „Wichtige Punkte“ eintragen (er wird in Anzeigen gelb) und bei der Kurzbeschreibung Häkchen ändern (die Listenzeile ändert sich); auf der Admin-Seite die Kennzahlen ansehen. Eine LinkedIn-Anzeige mit Strg+A, Strg+C kopieren und mit Link und Text im Link-Formular anlegen; denselben Link nochmal eingeben (es muss die vorhandene Bewerbung öffnen statt einer zweiten). Am Handy einen Anzeigentext ins Link-Formular einfügen. Danach einmal mit deinem zweiten Testkonto (kein Admin) anmelden und prüfen, was ein Freund sieht. Auffälligkeiten mit Bildschirmfoto melden.
4. Secret Key rotieren: Er war einmal im Chat sichtbar. Supabase → API Keys → neuen Secret key anlegen → in `.env`, `web/.env.local` und im GitHub-Secret `SUPABASE_SERVICE_KEY` eintragen → alten löschen.
5. Vercel einrichten (README „Vercel einrichten“), dabei auch die Server-Variablen `SUPABASE_SERVICE_KEY` und `ADMIN_EMAIL=markgaly99@gmail.com` eintragen (ohne `NEXT_PUBLIC_`).
6. Die Vercel-Adresse in Supabase → Authentication → URL Configuration eintragen (Site URL und Redirect URLs).
7. Im Repo `jobradar-privat` das Secret `SUPABASE_DB_URL` (Session-Pooler-URI) setzen und den Workflow „Backup“ einmal von Hand starten. Warum: ohne das Secret kann das Backup die Datenbank nicht erreichen.
8. GitHub Pages abschalten: Repo → Settings → Pages → Source auf „None“ bzw. die Seite entfernen.
9. ~~Den ersten Freund als Google-Testnutzer eintragen~~ **Verschoben 2026-11-10:** Vorerst nutzt nur Mark Jobradar; steht im Backlog unter „Live gehen“.
10. Groq-Konto für einen späteren Test von KI-Zusammenfassungen öffentlicher Anzeigen: Auf groq.com ein kostenloses Konto anlegen, einen API-Key erstellen und ihn selbst als `GROQ_API_KEY=...` in `jobradar/.env` eintragen. Nie in den Chat und nie ins Repo. Warum: Ein Key im Chat oder Repo wäre einsehbar und müsste getauscht werden. Erfolg: Die Zeile steht in `.env`; sag Claude nur „Key ist eingetragen“, nicht den Key.

## Offene To-dos für spätere Phasen
- **Phase 3 (Gmail):** Erinnerungs-Mail an den Admin (`ADMIN_EMAIL`) einrichten, sobald die jährlichen Hand-Quellen der Rankings (trendence, Universum, LinkedIn) fällig sind. Bis dahin erinnert ein GitHub-Issue (Entscheidung 2026-11-10, CLAUDE.md 4.8).

## Nächster Schritt
Die Liste oben abarbeiten, dann Phase 2 abschließen und nach `main` mergen.
