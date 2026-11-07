# Phase 1 – Tracker und neue Website: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine neue Website mit Login, Stellenliste mit Filtern und vollständigem Bewerbungs-Tracker. Eine Bewerbung entsteht per Klick aus einem Treffer, per Link (reiner Code) oder manuell. Die Daten liegen in Supabase, ein tägliches Backup läuft in einem privaten Repo, und GitHub Pages wird abgelöst.

**Architecture:**
- **Supabase** (Region Frankfurt) speichert Firmen, Stellen und Bewerbungsdaten.
- **Row Level Security** sorgt dafür, dass jede Person nur ihre eigenen Bewerbungen und Dokumente sieht. Firmen und Stellen dürfen alle angemeldeten Nutzer lesen, schreiben darf sie nur der Scraper (Service-Key).
- **Der Python-Scraper** schreibt per PostgREST (`requests`) in Supabase statt in JSON-Dateien.
- **Die Website** ist eine Next.js-App in `web/`, gehostet auf Vercel. Sie nutzt `@supabase/ssr` für Login und Datenzugriff.
- **Die Link-Erkennung** ist ein reines TypeScript-Modul, getestet mit `node --test`. Node 24 entfernt die Typangaben selbst, deshalb braucht es dafür kein extra Test-Paket.

**Tech Stack:** Python 3.12 (requests, pytest); Next.js (App Router, TypeScript), `@supabase/supabase-js`, `@supabase/ssr`; reines CSS ohne UI-Framework; Supabase (Postgres, Auth, Storage); GitHub Actions; Vercel Hobby.

**Spec:** `CLAUDE.md`, vor allem 3, 4.1, 4.4, 4.5, 5, 6 (Phase 1) und 9, sowie `docs/ENTSCHEIDUNGEN.md` (2026-11-08). Wiederverwendet wird die Filter- und Design-Spezifikation aus `docs/plans/2026-11-07-website-filter-design.md` (Task 1 bis 4 dort), übertragen auf Next.js.

## Global Constraints

- Kostenlos: Supabase Free, Vercel Hobby, GitHub Free. Keine Kreditkarte.
- **Keine KI** zur Laufzeit in Phase 1.
- Geheimnisse (Service-Key, DB-Passwort, OAuth-Secret) liegen nur in GitHub Secrets, Vercel-Umgebungsvariablen und der lokalen `.env.local` (diese steht in `.gitignore`). In den Browser darf nur der öffentliche Anon-Key gelangen.
- RLS ist auf **jeder** Tabelle aktiv. Tabellen mit Nutzerdaten haben `owner_id uuid default auth.uid()`, und die Policy erlaubt nur `owner_id = auth.uid()`.
- Stellen:
  - Offene Stellen haben den vollen Text in `jobs.text`.
  - Wird eine Stelle geschlossen und es gibt **keine** Bewerbung darauf, wird `text` auf `null` gesetzt und `sichtbar` auf `false`. Firma, Titel und die Datumsfelder bleiben als Mini-Notiz erhalten.
  - Gibt es eine Bewerbung darauf, bleibt die Stelle vollständig erhalten.
- Höfliches Abrufen bleibt wie in Version 1: robots.txt, 1 Anfrage pro Sekunde und Domain, User-Agent. Das gilt auch für die Link-Erkennung auf dem Server. LinkedIn, Stepstone, Indeed und Glassdoor werden **nie** abgerufen.
- Die Oberfläche ist komplett deutsch, im Stil „Modern & farbig“, mit Hell- und Dunkelmodus, für Handy und Laptop. Kontrast nach WCAG AA. Daten werden nie als HTML eingesetzt.
- Python wird mit `py` aufgerufen, die Web-Befehle laufen in `web/`. Commits auf Deutsch mit Co-Authored-By-Zeile. Push und Merge nur nach Zustimmung des Nutzers.

## Review Focus

1. **RLS-Lücke:** Ein angemeldeter Nutzer B liest oder ändert die Bewerbungen und Dateien von Nutzer A. Erwartet wird, dass er nichts sieht und Änderungen fehlschlagen. → Test in Task 2.
2. **Schließen trotz Bewerbung:** Eine Stelle mit Bewerbung wird geschlossen. Ihr Text bleibt erhalten, und der Snapshot in der Bewerbung bleibt unverändert. → Test in Task 3.
3. **LinkedIn-Link nur mit Nummer** oder ein Link mit Tracking-Parametern (`?trk=…`, `lnkd.in`): Es gibt **keinen** Abruf von LinkedIn. Stattdessen erscheinen die Felder für Firma und Titel. → Test in Task 6.
4. **Service-Key im Browser-Bundle:** Der Build darf den Key nicht enthalten. → Prüfung in Task 4.
5. **Supabase pausiert:** Der tägliche Lauf schreibt jeden Tag. Fällt er aus, zeigt die Website eine Warnung („letzter Lauf älter als 2 Tage“), genau wie die alte Seite. → Task 5.

---

### Task 0: Scroll-Fix auf der alten Seite (sofort, unabhängig)

**Files:** Modify `site/style.css`
- [ ] `.filterbox` ab 800 px: `max-height: calc(100vh - 2rem); overflow-y: auto;`. Commit `Alte Seite: Filterleiste scrollbar`.

### Task 1: Konten anlegen (der Nutzer, mit Anleitung von Claude)

Claude prüft vorher in der aktuellen Doku, dass keines der Konten eine Kreditkarte verlangt, und gibt nummerierte Klickschritte.
1. **Supabase:** Konto anlegen, Projekt `jobradar` in Region **Frankfurt (eu-central-1)**. Das DB-Passwort speichert der Nutzer in einem Passwort-Manager.
2. **Google Cloud:**
   - Ein OAuth-Client vom Typ „Web“ nur für den Login, mit den Scopes `openid`, `email` und `profile`, ohne Gmail.
   - Der Status ist **„In Production“**, damit die 7-Tage-Falle nicht greift. Für diese Scopes ist keine Prüfung durch Google nötig.
   - Client-ID und Secret werden in Supabase unter Auth → Google eingetragen.
3. **Vercel:** Konto anlegen und mit GitHub verbinden. Das Projekt aus `testgaly99/jobradar` mit dem Root-Verzeichnis `web` importieren.
4. **Privates Repo** `testgaly99/jobradar-privat` anlegen.
5. **Secrets eintragen:**
   - In `jobradar`: `SUPABASE_URL` und `SUPABASE_SERVICE_KEY`.
   - In `jobradar-privat`: `SUPABASE_DB_URL` (Session-Pooler-URL, IPv4).
   - In Vercel: `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Lokal: `web/.env.local`.
- [ ] Der Nutzer bestätigt, dass alles angelegt ist. Claude prüft per `curl` gegen die REST-URL mit dem Anon-Key, dass das Projekt erreichbar ist.

### Task 2: Datenbankschema mit RLS

**Files:** Create `supabase/migrations/001_schema.sql` und `tests/test_rls.py` (läuft gegen das echte Projekt mit zwei Testnutzern, wird per `pytest -m supabase` gestartet und ist ohne Secrets übersprungen).

**Tabellen** (Spaltennamen deutsch wie im Repo):
- **`companies`:**
  - `name` (PK)
  - `careers_url`
  - `ats_typ`
  - `ats_id`
  - `mitarbeitende_ca` (int)
  - `groesse_klasse`
  - `kategorie` (text[])
  - `hauptsitz`
  - `aktiv` (bool)
- **`jobs`:**
  - `id` (PK, `firma:ext_id`)
  - `unternehmen` (FK auf `companies`)
  - Inhalt: `titel`, `ort`, `staedte` (text[]), `remote` (bool), `arbeitsmodell`, `vertragsart`, `abteilung`, `erfahrungslevel`, `url`, `beschreibung_kurz`
  - `text` (nullable)
  - `text_hash`
  - `erstmals_gesehen`, `zuletzt_gesehen`
  - `status` (`offen` oder `geschlossen`)
  - `sichtbar` (bool)
- **`laeufe`:**
  - `datum`
  - `bericht` (jsonb)
- **`applications`** (pro Nutzer):
  - `id`
  - `owner_id`
  - `job_id` (nullable, FK)
  - Anzeige: `firma`, `titel`, `link`, `quelle`, `standort`, `praesenzmodell`, `snapshot_text`, `anforderungen`
  - Bewerbung: `beworben_am`, `bewerbungsweg`, `referenznummer`, `portal_hinweis`, `cv_dokument_id`, `anschreiben_dokument_id`
  - Gehalt: `gehalt_spanne_anzeige`, `gehalt_wunsch`, `angebot_fix`, `angebot_variabel`, `angebot_urlaub`, `angebot_benefits`, `gehalt_aktuell_vergleich`
  - Rahmen: `starttermin`, `kuendigungsfrist`, `referenzen`
  - Ergebnis: `ergebnis`, `absagegrund`, `feedback`, `rueckzug_grund`
  - Einschätzung: `interesse` (1–5), `tags` (text[]), `notizen`
  - Ablauf: `status` (Enum: `gemerkt`, `beworben`, `eingang_bestaetigt`, `im_gespraech`, `angebot`, `abgeschlossen`), `naechster_schritt`, `naechster_schritt_faellig`
  - `erstellt_am`, `geaendert_am`
- **`application_events`:**
  - `application_id`
  - `owner_id`
  - `datum`
  - `alter_status`, `neuer_status`
  - `notiz`
- **`contacts`:**
  - `owner_id`
  - `application_id` (nullable)
  - `firma`
  - `name`, `rolle`, `email`, `telefon`, `linkedin`
  - `art` (Ansprechpartner, eigener Kontakt oder Empfehlungsgeber)
- **`interviews`:**
  - `owner_id`
  - `application_id`
  - `datum`, `format`, `teilnehmer`
  - `fragen_gestellt`, `eigene_fragen`, `eindruck`
  - `aufgabe`, `aufgabe_frist`
- **`documents`:**
  - `owner_id`
  - `art` (CV, Anschreiben oder Anlage)
  - `name`
  - `version_datum`
  - `storage_pfad`

**RLS-Regeln:**
- `companies`, `jobs` und `laeufe` dürfen alle angemeldeten Nutzer lesen (`authenticated`). Schreiben darf nur der Service-Key, es gibt dafür keine Policy.
- Bei `jobs` liefert die Lese-Policy nur `sichtbar = true` **oder** Stellen, auf die der Nutzer eine Bewerbung hat.
- Alle anderen Tabellen sind nur für ihren Besitzer zugänglich (`owner_id = auth.uid()`), für alle Operationen.

**Storage:**
- Bucket `dokumente`, privat.
- Pfad `<uid>/<datei>`.
- Policy: Der erste Ordner im Pfad muss `auth.uid()` sein.

**Trigger:**
- Statuswechsel bei `applications` → neuer Eintrag in `application_events`.
- `geaendert_am` wird bei jeder Änderung gesetzt.

**Schritte:**
- [ ] SQL schreiben. Der Nutzer führt es im Supabase SQL Editor aus (Copy-Paste nach Anleitung), oder Claude führt es per `psql` mit der Pooler-URL aus. Vorher fragen.
- [ ] `test_rls.py`: Zwei Testnutzer werden per Admin-API angelegt. A legt eine Bewerbung und eine Datei an. B sieht 0 Bewerbungen, sein Update schlägt fehl, und sein Download der Datei bekommt 403/404. Ein anonymer Zugriff liest keine `jobs`. Am Ende werden die Testnutzer gelöscht.
- [ ] Commit `Datenbankschema mit Zugriffsschutz`.

### Task 3: Scraper schreibt in Supabase

**Files:**
- Modify: `scraper/ats/greenhouse.py`, `scraper/ats/ashby.py`, `scraper/filter.py`, `scraper/run.py`
- Replace: `scraper/bestand.py` durch `scraper/db.py`
- Tests anpassen

**Interfaces:**
- Die Adapter liefern zusätzlich:
  - `text`: Klartext ohne HTML
  - `abteilung`
  - `arbeitsmodell`
  - `vertragsart`
  - Die Regeln dafür stehen im pausierten Plan, Task 2.
- `filter.erfahrungslevel(titel)` und `filter.deutsche_staedte(ort)` übernehmen die Regeln und Testfälle aus dem pausierten Plan, Task 1.
- `db.py`:
  - `lade_offene(firma) -> dict[id, row]`
  - `schreibe(firma, neue: list[dict], heute)`:
    - Upsert der aktuellen Stellen mit `text_hash = sha256(text)`.
    - Fehlende offene Stellen werden geschlossen. Gibt es keine Bewerbung darauf (Prüfung per RPC `hat_bewerbung(job_id)` oder Abfrage mit dem Service-Key), werden `text=null` und `sichtbar=false` gesetzt.
  - `sync_companies(list)`: Upsert aus `companies.csv`.
  - `speichere_lauf(bericht)`
  - Alle Aufrufe gehen per PostgREST mit dem Service-Key. Lässt sich ein Teil nicht testen, wird er in einer kleinen Funktion gekapselt, und die Tests nutzen `monkeypatch`.
- `run.py`: Die Logik pro Firma bleibt gleich (Fehler pro Firma abfangen). Schreiben geht nur noch in Supabase. `data/jobs.json` und `site/daten.json` entfallen am Ende von Task 9.

**Schritte:**
- [ ] Tests zuerst: Abgleich offen und geschlossen, Schließen mit und ohne Bewerbung (Review Focus 2), Text-Hash ändert sich nur bei neuem Text, neue Felder in den Adaptern.
- [ ] Echter Lauf gegen Supabase. Ergebnis: Anzahl der Stellen pro Firma, Stichproben der neuen Felder.
- [ ] Workflow `taeglich.yml`: Secrets als Umgebungsvariablen. Der Commit-Schritt committet nur noch `data/bericht.md`. Er bleibt als tägliche Aktivität gegen die 60-Tage-Regel erhalten.
- [ ] Commit `Scraper schreibt in Supabase`.

### Task 4: Next.js-Grundgerüst, Design und Login

**Files:** `web/` (`create-next-app` mit TypeScript, App Router, ohne Tailwind und ohne ESLint-Extras), `web/lib/supabase/{client,server}.ts`, `web/middleware.ts`, `web/app/login/page.tsx`, `web/app/globals.css`, `web/app/layout.tsx`

- **Design:** Die CSS-Variablen für Hell und Dunkel, die Karten, Chips und der Farbakzent pro Firma (per Hash) kommen aus dem pausierten Plan, Task 4. Es gibt eine Navigation mit „Stellen“, „Bewerbungen“, „Dokumente“ und „Abmelden“.
- **Login:**
  - „Mit Google anmelden“ sowie E-Mail und Passwort (Anmelden, Registrieren, Passwort vergessen).
  - Registrieren ist per Supabase-Einstellung nur für die E-Mail des Nutzers erlaubt. Die Einladungsfunktion kommt in Phase 2. Die Umsetzung über Auth-Hook oder die Einstellung „Allow new users to sign up“ wählt der Implementer und begründet sie.
  - Die Middleware leitet nicht angemeldete Nutzer auf `/login` um.
- **Prüfen:**
  - `npm run build` ist grün.
  - `grep` im Ordner `.next/static` findet den Service-Key nicht (Review Focus 4).
  - Login lokal mit `npm run dev` und dem Nutzer testen.
- [ ] Commit `Neue Website: Grundgerüst, Design, Login`.

### Task 5: Stellenliste mit Filtern

**Files:** `web/app/stellen/page.tsx`, `web/lib/filter.ts` (pure Funktionen), `web/tests/filter.test.ts`, SQL-Funktion `facetten()` in `supabase/migrations/002_facetten.sql`

- **Filterung** läuft serverseitig per Supabase-Query, damit sie mit 1000 Firmen skaliert. Die Facetten mit Trefferzahlen kommen aus der SQL-Funktion, die Filterwerte stehen in der URL.
- **Filter:**
  - Größe
  - Kategorie (Treffer, wenn eine beliebige Kategorie passt)
  - Erfahrungslevel
  - Arbeitsmodell
  - Vertragsart
  - Bereich
  - Unternehmen
  - Stadt (inklusive „Remote“)
  - Stichwort (Titel und Text)
  - „neu seit“
- **Seitenweise** Anzeige mit 50 Stellen pro Seite.
- **Jede Karte** hat den Knopf „Bewerbung anlegen“. Er erzeugt eine `application` mit `job_id`, `status='gemerkt'`, `snapshot_text = jobs.text` und den übernommenen Feldern und führt zur Detailansicht.
- **Warnung:** erscheint, wenn der letzte Eintrag in `laeufe` älter als 2 Tage ist (Review Focus 5).
- [ ] Tests für das Zusammenbauen der Filter, die URL-Kodierung und die Kategorie-Treffer. Danach Build und einmal von Hand durchklicken.
- [ ] Commit `Neue Website: Stellenliste mit Filtern`.

### Task 6: Link-Erkennung (reiner Code)

**Files:** `web/lib/link-import.ts`, `web/tests/link-import.test.ts`, Server-Action `web/app/bewerbungen/actions.ts`

**Interfaces:** `analysiereLink(url: string) -> {quelle, ats?: {typ, id, jobId}, titel?, firma?}`. Die Funktion ist pur und ruft nichts ab.

**Erkannte Muster:**
- **Greenhouse:** `boards.greenhouse.io/<id>/jobs/<jid>`, `job-boards.greenhouse.io/<id>/jobs/<jid>`, `?gh_jid=`
- **Ashby:** `jobs.ashbyhq.com/<id>/<uuid>`
- **Lever:** `jobs.lever.co/<id>/<uuid>`
- **Personio:** `<id>.jobs.personio.de/job/<nr>`
- **LinkedIn:**
  - `linkedin.com/jobs/view/<slug>-at-<firma>-<nummer>` → Titel und Firma aus dem Slug
  - `…/jobs/view/<nummer>`, `currentJobId=`, `lnkd.in/…` → nichts erkennbar
- **Stepstone:** `stellenangebote--<Titel>-<Ort>-<Firma>--<id>-inline.html` → Titel und Firma, so weit eindeutig
- **Sonst:** nur `quelle` = Domain

**Server-Action `bewerbungAusLink(url, firma?, titel?)`, Schritte in dieser Reihenfolge:**
1. Ist der Link eine ATS-URL, wird die Stelle über die offizielle Schnittstelle geholt (Greenhouse und Ashby wie im Scraper; Lever und Personio nur für die Einzelstelle). Dabei gelten User-Agent und robots.txt.
2. Sonst wird mit Firma und Titel in `jobs` gesucht: Firma per Ähnlichkeit ohne Rechtsform, Titel normalisiert.
3. Sonst werden die ATS-Boards unter dem Firmennamen als Slug geprüft (Greenhouse, Ashby, Lever), und dort wird der Titel gesucht.
4. Sonst wird die Bewerbung nur mit Link, Firma und Titel angelegt.

Ohne Firma und Titel gibt die Action `{brauchtEingabe: true}` zurück. Die Oberfläche zeigt dann die zwei Felder.

- [ ] Tests (rein, ohne Netz): jedes Muster, LinkedIn nur mit Nummer und mit `?trk=` ergibt `brauchtEingabe` (Review Focus 3), ein Stepstone-Beispiel, Domains von LinkedIn, Stepstone, Indeed und Glassdoor lösen **nie** einen Abruf aus (Assertion gegen eine Sperrliste in der Abruf-Funktion).
- [ ] Commit `Bewerbung per Link (ohne KI)`.

### Task 7: Bewerbungen – Tabelle, Kanban, Detail

**Files:** `web/app/bewerbungen/page.tsx` (Tabelle mit Filtern nach Status, Firma und Interesse sowie Feld „Link einfügen“), `web/app/bewerbungen/kanban/page.tsx`, `web/app/bewerbungen/[id]/page.tsx`

- **Kanban:** Spalten nach Status. Status wechseln per Auswahlfeld, Drag-and-Drop ist nicht nötig.
- **Detailansicht:**
  - Abschnitte entsprechend CLAUDE.md 4.4: Stelle, Bewerbung, Gehalt, Personen (`contacts`), Prozess mit Verlauf (`application_events`) und `interviews`, Rahmen, Ergebnis, Einschätzung.
  - Der Snapshot wird als formatierter Text gezeigt, mit einem Knopf „Drucken/PDF“ (`window.print` mit Druck-CSS).
  - „Manuell anlegen“ ist ein leeres Formular.
- [ ] Prüfen: Build. Klickpfad mit dem Nutzer: anlegen aus Stelle, aus Link, manuell; Status ändern; Verlauf ist sichtbar.
- [ ] Commit `Bewerbungs-Tracker`.

### Task 8: Dokumente und Export

**Files:** `web/app/dokumente/page.tsx`, `web/app/export/route.ts`

- **Dokumente:**
  - Hochladen nach `dokumente/<uid>/…`, höchstens 50 MB (Gratis-Grenze).
  - Art und Versionsname angeben.
  - Download nur über einen signierten Link, 60 s gültig.
  - In der Bewerbung CV und Anschreiben auswählen.
  - Ein Dokument, auf das eine Bewerbung verweist, lässt sich nicht löschen. Das wird per FK oder Prüfung erzwungen.
- **Export:**
  - CSV im Excel-Format: UTF-8 mit BOM, Trennzeichen `;`.
  - Inhalt: alle eigenen Bewerbungen inklusive Kontakten und Interviews, je eine Datei, gebündelt als ZIP.
  - *Ruling: CSV statt .xlsx. So kommt keine zusätzliche Bibliothek dazu, und Excel öffnet die Dateien direkt. Wenn es nicht passt, wird später exceljs ergänzt.*
- [ ] Commit `Dokumente und Export`.

### Task 9: Backup, Umzug, Abschluss

- **`jobradar-privat/.github/workflows/backup.yml`:**
  - Läuft täglich um 05:00 UTC und auf Knopfdruck.
  - `pg_dump --data-only` aller Tabellen im Schema `public` und der Auth-Nutzerliste über `SUPABASE_DB_URL`. Das Ergebnis ist `backup/jobradar.sql`, und es wird nur committet, wenn sich etwas geändert hat.
  - Das Schema selbst liegt schon in `jobradar`.
  - In `jobradar-privat/README.md` steht eine Wiederherstellungs-Anleitung in Klickschritten.
- **Umzug:**
  - Ein Skript übernimmt die bisherigen Stellen aus `data/jobs.json` einmalig nach Supabase.
  - Danach werden `data/jobs.json`, `site/` und der Pages-Teil im Workflow entfernt, und GitHub Pages wird in den Einstellungen abgeschaltet. Das tut der Nutzer nach Anleitung.
  - Die Vercel-URL wird die neue Adresse.
- **Doku:** `README.md` neu (Website, Login, Link einfügen, Backup und Wiederherstellung, Fehlerbehebung), dazu `docs/STATUS.md` und `docs/ENTSCHEIDUNGEN.md`. Der pausierte Website-Plan wird als „aufgegangen in Phase 1“ markiert.
- [ ] `/ponytail-review`, abschließende Gesamtprüfung, Push nach Zustimmung.
