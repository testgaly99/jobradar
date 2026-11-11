# Phase 2b – Website-Überarbeitung: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Rückmeldungen aus dem Klicktest umsetzen. Dazu gehören:
- klare Begriffe und bessere Filter
- „Merken“
- eine eigene Detailseite pro Stelle mit gegliederten Stichpunkten
- eine sinnvolle Konto- und Admin-Seite
- ein neues Design mit Hallmark

**Architecture:**
- **Gliederung der Anzeigen:** Heute speichern die Adapter den Anzeigentext flachgeklopft, ohne Überschriften. Die Gliederung entsteht deshalb im **Scraper**: Aus dem HTML der Anzeige wird eine Liste von Abschnitten (Überschrift plus Stichpunkte) und in `jobs.abschnitte` (jsonb) gespeichert.
- **Land:** Der Scraper leitet es aus dem Ort ab und speichert es in `jobs.land`.
- **Website:** Sie zeigt nur an, sie zerlegt nichts selbst.
- **Bewerbungen:** Sie bekommen beim Anlegen eine Kopie der Abschnitte (`applications.snapshot_abschnitte`).

**Tech Stack:** Python 3.12 (Scraper, pytest), Next.js 16 und TypeScript (`node --test`), Supabase, Skill **hallmark** für das Design.

**Spec:** `CLAUDE.md` Abschnitt 6, Punkt 2b, und `docs/ENTSCHEIDUNGEN.md` (Zeilen vom 2026-11-08).

## Global Constraints

- Keine KI zur Laufzeit. Kostenlos. Keine neue Abhängigkeit. Ausnahme: Hallmark ist ein Skill, keine Laufzeit-Abhängigkeit.
- Daten werden nie als HTML eingesetzt. Auch die Abschnitte werden als reiner Text gespeichert und angezeigt.
- RLS bleibt unverändert. Admin-Einblicke zeigen nur Zahlen, nie Inhalte wie Firmen, Titel oder Notizen.
- Begriffe in der Oberfläche:
  - **Branche** (Feld `kategorie`)
  - **Funktion** (Feld `abteilung`)
  - **Online seit** (Feld `erstmals_gesehen`)
  - **Mitarbeitende** hinter der Größenklasse
- Erfahrungslevel-Beschriftung, genau so:
  - `Junior (0–2 Jahre)`
  - `Mid (2–5 Jahre)`
  - `Senior (5–8 Jahre)`
  - `Lead (8+ Jahre)`
- Reihenfolge der Größen: `<50`, `50–249`, `250–999`, `1.000+`.
- „Online seit“-Felder: `Heute`, `3 Tage`, `7 Tage`, `30 Tage`. Abzeichen „Neu“ bei höchstens 3 Tagen, mit `title`-Erklärung „Seit höchstens 3 Tagen online“.
- Länder: `Deutschland`, `Österreich`, `Schweiz`. Remote bleibt ein eigener Filter.
- Die Kategorie `Startup / Venture-finanziert` wird in Filtern und Chips ausgeblendet.
- Die Oberfläche ist komplett deutsch, mit Hell- und Dunkelmodus, für Handy und Laptop, WCAG AA.
- Die neue Migration heißt `supabase/migrations/005_abschnitte_land.sql` und muss mehrfach ausführbar sein. Der Nutzer führt sie aus; der Code muss auch **ohne** sie laufen, mit Rückfall auf den Text.
- Commits sind deutsch, mit Co-Authored-By. Push nur nach Zustimmung.

## Review Focus

1. **Anzeigen ohne Überschriften oder mit ungewöhnlichem HTML**, etwa nur Fließtext oder `<strong>` statt `<h3>`:
   - Es gibt keinen Absturz.
   - Die Detailseite zeigt dann einen Abschnitt „Beschreibung“ mit Absätzen.
   - → Test in Task 1.
2. **Bösartiges oder kaputtes HTML in Anzeigen**, etwa `<script>`, `onerror=` oder nicht geschlossene Tags:
   - Gespeichert wird nur Text.
   - → Test in Task 1.
3. **Migration 005 ist noch nicht eingespielt:**
   - Die Stellenliste und die Detailseite funktionieren trotzdem, ohne Land-Filter und mit Text statt Abschnitten.
   - → Task 2 und Task 3.
4. **Admin-Einblicke bei vielen Nutzern und Bewerbungen:**
   - Gezählt wird in der Datenbank, nicht durch Laden aller Zeilen.
   - Es gibt keine N+1-Abfragen pro Nutzer.
   - → Task 4.
5. **„Merken“ doppelt klicken:**
   - Es entsteht keine zweite Bewerbung.
   - Index 003 und `anlegenAusJob` werden wiederverwendet.
   - → Task 2.

---

### Task 1: Scraper – Abschnitte und Land

**Files:**
- Create: `scraper/abschnitte.py`, `supabase/migrations/005_abschnitte_land.sql`
- Modify: `scraper/ats/greenhouse.py`, `scraper/ats/ashby.py`, `scraper/filter.py` (Land), `scraper/db.py` (Felder), `scraper/run.py`
- Test: `tests/test_abschnitte.py`, plus Erweiterungen in `tests/test_greenhouse.py`, `tests/test_ashby.py`, `tests/test_filter.py`

**Interfaces:**
- Produces: `abschnitte(html: str) -> list[dict]`. Jeder Eintrag hat die Form `{"titel": str, "punkte": list[str]}`. Nur Standardbibliothek (`html.parser`).
  - Überschriften sind `h1` bis `h4`. Auch ein `<p>`, dessen einziger Inhalt `<strong>` oder `<b>` ist, gilt als Überschrift.
  - Punkte sind `li`-Texte. Absätze ohne Liste werden zu je einem Punkt.
  - Text vor der ersten Überschrift kommt in einen Abschnitt `"Über die Stelle"`.
  - Ganz ohne Überschriften gibt es einen Abschnitt `"Beschreibung"` mit allen Absätzen.
  - Leere Abschnitte fallen weg.
  - `script` und `style` werden komplett ignoriert. Entities werden aufgelöst, Leerraum normalisiert.
- Produces: `land(ort_text: str) -> str`. Rückgabe ist `"Deutschland"`, `"Österreich"`, `"Schweiz"` oder `""`.
  - Treffer gibt es über die deutsche Städteliste (dann Deutschland) und über Wörter wie Germany, Deutschland, Austria, Österreich, Switzerland, Schweiz sowie Wien, Zürich, Genf, Basel.
  - Bei mehreren Ländern zählt das erste deutschsprachige. Deutschland hat Vorrang, weil der Vorfilter nur Deutschland plus Remote durchlässt.
- Adapter-Quellen:
  - Greenhouse: `content` (HTML, Entities doppelt auflösen wie bisher)
  - Ashby: `descriptionHtml`
  - Beide liefern zusätzlich `abschnitte`. `text` bleibt wie bisher.
- `run.py` ergänzt `land`. `db.py` schreibt `abschnitte` und `land` mit.
- Migration 005:
  - `alter table public.jobs add column if not exists abschnitte jsonb, add column if not exists land text;`
  - `alter table public.applications add column if not exists snapshot_abschnitte jsonb;`
  - `public.facetten()` um die Facette `land` erweitern: `create or replace` mit der kompletten Funktion aus 002 plus `land`.

- [ ] Tests:
  - Greenhouse-HTML mit `<h3>` und `<ul>`
  - Ashby-HTML mit `<p><strong>…</strong></p>` als Überschrift
  - nur Fließtext ergibt `[{"titel":"Beschreibung",…}]`
  - `<script>alert(1)</script>` ist nicht im Ergebnis
  - `&amp;` wird zu `&`
  - `land("Berlin; London")` ergibt `"Deutschland"`
  - `land("Vienna, Austria")` ergibt `"Österreich"`
  - `land("Remote - Europe")` ergibt `""`
- [ ] Rot → Code → Grün (`py -m pytest -q`)
- [ ] Echter Lauf `py -m scraper.run` **erst nachdem der Nutzer 005 eingespielt hat**. Bis dahin werden die neuen Felder nur geschrieben, wenn die Spalten existieren. Dafür wird einmal pro Lauf geprüft, ob die Spalten da sind (z. B. ein `select=abschnitte&limit=0`, das 400 liefert, wenn es sie nicht gibt).
- [ ] Commit `Scraper: Anzeigen gegliedert und Land erkannt`

### Task 2: Stellenliste und „Merken“

**Files:**
- Modify: `web/app/stellen/page.tsx`, `web/app/stellen/filterblock.tsx`, `web/app/stellen/actions.ts`, `web/lib/stellen.ts`, `web/lib/filter.ts`
- Test: `web/tests/filter.test.ts`

**Interfaces:**
- Consumes: `jobs.land`, `jobs.staedte`, `jobs.erstmals_gesehen`; `anlegenAusJob` in `web/lib/bewerbung-anlegen.ts`.
- Produces, pure in `web/lib/filter.ts`:
  - `GROESSEN_REIHENFOLGE` mit den 4 Werten in der Reihenfolge aus den Global Constraints
  - `levelText(level: string): string` mit den Beschriftungen aus den Global Constraints
  - `onlineSeitGrenze(wahl: "heute"|"3"|"7"|"30", jetzt: Date): string` liefert das ISO-Datum für den Filter
  - `istNeu(erstmals: string, jetzt: Date): boolean` für höchstens 3 Tage
  - `stadtAnzeige(staedte: string[], gefiltert: string[]): string`: bei Filter die erste gefilterte Stadt, die die Stelle hat, sonst `"<erste> +N weitere"` bzw. nur `"<erste>"`
- URL-Parameter:
  - `land` (mehrfach)
  - `seit=heute|3|7|30` ersetzt `neu` (Datum)
  - `volltext=1` schaltet die Suche in `text` zu; ohne den Parameter wird nur in `titel` gesucht
- Liste:
  - Titel verlinkt auf `/stellen/<id>`
  - Chips: Größe + „Mitarbeitende“, Level mit Jahren, Arbeitsmodell, Vertragsart, „Neu“
  - Stadtanzeige über `stadtAnzeige`
  - Kein Beschreibungstext
  - Branche ohne „Startup / Venture-finanziert“
- Knopf „Merken“ (ersetzt „Bewerbung anlegen“):
  - Server-Action `merken(jobId)` über `anlegenAusJob` mit Status `gemerkt`
  - Ist die Stelle schon gemerkt oder beworben, zeigt der Knopf „Gemerkt ✓“ bzw. „Beworben“ und ist inaktiv. Dafür wird ein Lookup der eigenen Bewerbungen für die angezeigten Job-IDs in **einer** Abfrage gemacht.
- Facetten:
  - Größe in fester Reihenfolge
  - `land`-Facette nur, wenn vorhanden
  - „Online seit“ als 4 Radio-Felder
  - Beschriftungen Branche und Funktion

- [ ] Tests:
  - `levelText` für alle 4 Stufen
  - `onlineSeitGrenze` für alle 4 Werte mit festem `jetzt`
  - `istNeu` an der Grenze 3 Tage
  - `stadtAnzeige` mit und ohne Filter
  - Größen-Reihenfolge
  - Suche nur im Titel (Abfrage-Baustein)
- [ ] Rot → Code → Grün, `npm test`, `npx tsc --noEmit`, `npm run build`
- [ ] Commit `Stellenliste: klare Begriffe, Merken, bessere Suche`

### Task 3: Detailseite pro Stelle und gegliederter Snapshot

**Files:**
- Create: `web/app/stellen/[id]/page.tsx`, `web/app/abschnitte.tsx` (Darstellung)
- Modify: `web/lib/bewerbung-anlegen.ts` (`snapshot_abschnitte` mitkopieren, wenn vorhanden), `web/app/bewerbungen/[id]/page.tsx` (Abschnitte statt Fließtext, Fallback Text), `web/app/stellen/actions.ts`

**Interfaces:**
- Consumes: `jobs.abschnitte`, `merken(jobId)`, `anlegenAusJob`
- Produces:
  - Server-Komponente `Abschnitte({ abschnitte, text })`
    - zeigt je Abschnitt eine `h3` und eine `ul` mit den Punkten
    - ohne Abschnitte wird der Text in Absätzen gezeigt
    - immer als Text, nie als HTML
  - Seite `/stellen/[id]`:
    - id-Format prüfen, sonst `notFound()`. Unsichtbare oder fremde Stellen gibt es nicht (RLS).
    - Kopf mit Titel, Firma, Größe, Ort, Arbeitsmodell, Level und Online-seit
    - Knöpfe „Merken“, „Original-Anzeige öffnen“ (externer Link, `rel="noopener noreferrer"`, nur http/https) und „Ich habe mich beworben“
    - darunter `Abschnitte`
  - Server-Action `beworben(jobId)`:
    - legt die Bewerbung über `anlegenAusJob` an oder findet sie
    - setzt `status='beworben'` und `beworben_am=heute`, falls leer; der Trigger schreibt den Verlauf
    - leitet auf `/bewerbungen/<id>` weiter

- [ ] Tests: Die Darstellung bleibt ohne Unit-Test, weil sie nur rendert. Ein reiner Helfer, falls nötig, bekommt einen Test.
- [ ] Live-Check mit einem Wegwerf-Nutzer:
  - Merken, dann „Ich habe mich beworben“: genau 1 Bewerbung mit Status beworben und einem Verlaufseintrag.
  - Danach aufräumen, mit try/finally.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build`
- [ ] **Markierung der wichtigen Punkte** (Tabelle aus Task 4, darum Task 3 **nach** Task 4 ausführen, oder vorher mit leerer Liste und Rückfall, wenn die Tabelle fehlt):
  - Reiner Helfer `markiere(text: string, begriffe: string[]): Array<{text: string, treffer: boolean}>`
    - Groß- und Kleinschreibung egal, Umlaute normal
    - erkennt nur ganze Wortanfänge, also findet „Python“ in „Python-Kenntnisse“, aber „Java“ nicht in „JavaScript“
    - Ergebnis als Segmente, die als `<mark>`-**Elemente** gerendert werden, nie über HTML-Strings
  - Oben auf der Detailseite: „N deiner wichtigen Punkte kommen vor“.
  - Tests:
    - Treffer am Anfang, in der Mitte und am Ende
    - kein Treffer innerhalb eines Wortes
    - mehrere Begriffe
    - Sonderzeichen im Begriff wie `C++` und `(`
    - leere Begriffsliste
- [ ] Commit `Detailseite pro Stelle, gegliederte Anzeige`

### Task 4: Navigation, Konto und Admin-Einblicke

**Files:**
- Modify:
  - `web/app/kopf.tsx`: „Dokumente“ raus
  - `web/app/konto/page.tsx`
  - `web/app/admin/nutzer/page.tsx`
  - `web/app/datenschutz/page.tsx`
  - `web/app/bewerbungen/[id]/page.tsx`: beim CV-Auswahlfeld ein Link „Dokument hochladen“ auf `/dokumente`. Die Route bleibt erhalten.
- Create: `supabase` SQL-Funktion `public.admin_einblicke()` in **Migration 005** (gleiche Datei wie Task 1, ergänzen)
  - `security definer`, `search_path=''`
  - `execute` nur für `service_role`, **nicht** für authenticated
  - liefert `jsonb` mit:
    - `pro_nutzer`: `[{id, bewerbungen}]`, nur Zählungen
    - `aktiv_7` und `aktiv_30` aus `auth.users.last_sign_in_at`
    - `bewerbungen_pro_woche`: letzte 8 Wochen, `date_trunc('week', erstellt_am)`
- Test: `web/tests/nutzerliste.test.ts` (erweitern), `tests/test_rls.py` (prüfen, dass `authenticated` `admin_einblicke` **nicht** aufrufen darf)

**Interfaces:**
- Produces:
  - `nutzerZeilen` erweitert um `letzteAnmeldung: string` (TT.MM.JJJJ, Berlin, oder „nie“) und `istGoogle: boolean`
  - Name nur bei Google, sonst leer
- Admin-Seite:
  - oben 3 Kennzahlen (aktiv 7 Tage, aktiv 30 Tage, Bewerbungen der letzten 8 Wochen) und eine kleine Wochenreihe als Balken in einer Tabelle
  - darunter eine Tabelle mit Name, E-Mail, dabei seit, letzte Anmeldung und Bewerbungen
  - „Entfernen“ in einem `<details>`-Menü „…“ pro Zeile, mit dem bestehenden Bestätigungsweg
  - ohne Migration 005: Kennzahlen ausblenden, Hinweis „Einblicke nach Migration 005“
- Konto-Seite, von oben nach unten:
  1. Name, E-Mail, Anmeldeart (Google/E-Mail) und dabei seit
  2. Bewerbungen nach Status (Zählung per RLS-Abfrage)
  3. Export
  4. klein am Ende „Konto löschen“, mit unveränderter Logik
- Datenschutz: ein Satz „Der Betreiber sieht pro Konto nur Zahlen: letzte Anmeldung und Anzahl der Bewerbungen, keine Inhalte.“

- [ ] Tests:
  - `nutzerZeilen` mit `last_sign_in_at` null ergibt „nie“
  - Google-Erkennung über `app_metadata.provider`
  - Live: `authenticated` erhält bei `rpc('admin_einblicke')` einen Fehler. Dieser Live-Test läuft erst nach Migration 005, vorher `skip`.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build`, `py -m pytest -q`
- [ ] **Wichtige Punkte (Nutzerwunsch 2026-11-08):**
  - Neue Tabelle `public.wichtige_punkte` in Migration 005:
    - Spalten `id uuid pk`, `owner_id uuid not null default auth.uid() references auth.users on delete cascade`, `begriff text not null check (length(trim(begriff)) between 2 and 60)`, `erstellt_am`
    - eindeutig pro (owner_id, lower(begriff))
    - RLS: nur eigene Zeilen
    - `anon` revoked
  - Die Konto-Seite bekommt den Bereich „Was mir bei einer Stelle wichtig ist“: Liste plus Feld „Begriff hinzufügen“ plus Entfernen.
  - Die Server-Actions prüfen die Sitzung. Höchstens 50 Begriffe pro Nutzer.
  - Den Löschen-Kern `loescheNutzerMit` nicht vergessen: Die Tabelle hängt per Cascade an auth.users, das passt. Prüfen.
- [ ] Commit `Konto und Admin-Einblicke, Dokumente aus der Navigation`

### Task 5: Design mit Hallmark

**Files:** `web/app/globals.css` sowie Struktur- und Klassen-Anpassungen in den Seiten unter `web/app/**/page.tsx`, ohne Logikänderungen.

- [ ] Skill **hallmark** im Modus `redesign` auf `web/app` anwenden. Die Floor-Regeln der Skill-Datei gelten. Der bestehende Hell- und Dunkelmodus sowie WCAG AA bleiben erhalten.
- [ ] `node ~/.claude/skills/hallmark/scripts/sloplint.mjs` auf die geänderten CSS- und Seitendateien laufen lassen. Jedes `FAIL` beheben, jedes `REFLEX` beheben oder begründet zulassen.
- [ ] `npm test`, `npm run build`
- [ ] Commit `Design mit Hallmark`

### Task 7: Steckbrief (nach Task 5 ausführen, vor Task 6)

**Wunsch des Nutzers vom 2026-11-08:** „Ich schaue täglich hunderte Stellenanzeigen durch und habe keine Zeit, sie zu lesen.“

**Files:**
- Create: `scraper/steckbrief.py`, `tests/test_steckbrief.py`, Liste-Darstellung in `web/lib/steckbrief.ts`, Test `web/tests/steckbrief.test.ts`
- Modify: Migration 005 (ergänzen), Scraper (Adapter, `run.py`, `db.py`), `web/app/stellen/page.tsx`, `web/app/stellen/[id]/page.tsx`, `web/app/konto/page.tsx` + `actions.ts`

**Interfaces:**
- `steckbrief(abschnitte: list, text: str) -> dict` (Python, rein, nur Standardbibliothek). Felder:
  - `erfahrung_jahre`: int oder None. Regeln für „3+ years“, „mind. 5 Jahre“, „5–7 Jahre“; bei einer Spanne gilt die kleinste Zahl.
  - `sprachen`: Liste von `{sprache, niveau}`. Deutsch/Englisch/Französisch; Niveau aus A1–C2, „fließend/fluent“, „verhandlungssicher“, „Muttersprache/native“; sonst leer.
  - `gehalt`: `{min, max, waehrung, zeitraum}` oder None. Erkennt €/EUR/CHF, „k“, Spannen mit „–“ und „-“, „pro Jahr/brutto/p.a.“.
  - `sicherheitsueberpruefung`: bool, bei security clearance, Sicherheitsüberprüfung oder Ü1/Ü2/Ü3.
- Speicherung in `jobs.steckbrief` (jsonb), in Migration 005 ergänzt. Schutz wie bei `abschnitte`: Fehlt die Spalte, wird sie nicht geschrieben.
- Neue Tabelle `public.listen_felder` in 005:
  - Spalten: `owner_id uuid primary key default auth.uid() references auth.users on delete cascade`, `felder text[] not null`
  - RLS nur eigene Zeile, `anon` revoked
  - Erlaubte Feldnamen (check): `groesse, level, modell, vertrag, ort, online_seit, erfahrung, gehalt, sprachen, sicherheit, branche`
- **Standard**, wenn keine Zeile existiert: `groesse, level, modell, ort, online_seit, erfahrung, gehalt`. Sprachen sind standardmäßig aus.
- Konto-Seite: Abschnitt „Kurzbeschreibung in der Stellenliste“ mit Checkboxen für alle Felder. Server-Action speichert per Upsert, Sitzung zuerst prüfen, nur erlaubte Namen.
- Stellenliste: Pro Stelle eine Zeile mit genau den gewählten Feldern, in der festen Reihenfolge oben. Fehlt ein Wert, entfällt das Feld still (kein „unbekannt“).
- Detailseite: Oben ein Steckbrief-Kasten mit allen vorhandenen Feldern. Die gegliederte Anzeige folgt darunter in `<details>` „Ganze Anzeige lesen“, standardmäßig zu.

- [ ] Tests (Python):
  - „3+ years of experience“ → 3
  - „mindestens 5 Jahre Berufserfahrung“ → 5
  - „5–7 years“ → 5
  - kein Hinweis → None
  - „€70.000 – €85.000 brutto pro Jahr“ → min 70000, max 85000, EUR, Jahr
  - „70k-85k EUR“ → gleiches Ergebnis
  - „German (C1)“ → Deutsch C1
  - „fließend Englisch“ → Englisch fließend
  - „Ü2“ → `sicherheitsueberpruefung` true
- [ ] Tests (TS): Feldauswahl und Reihenfolge, Standard ohne Zeile, unbekannte Feldnamen werden ignoriert.
- [ ] `py -m pytest -q`, `npm test`, `npx tsc --noEmit`, `npm run build`
- [ ] Commit `Steckbrief und einstellbare Kurzbeschreibung`

### Task 6: Doku und Nutzer-To-dos

- [ ] `README.md`: Begriffe (Branche, Funktion, Online seit), Merken und Detailseite.
- [ ] `docs/STATUS.md`: neues Nutzer-To-do „Migration 005 ausführen“ **vor** dem Klicktest. Der Klicktest wird um die neuen Punkte ergänzt.
- [ ] Die Checkliste (Artifact) aktualisiert der Controller selbst.
- [ ] Commit `Doku für Phase 2b`

### Task 8: Fixes aus dem Klicktest (nach Task 6)

**Wunsch des Nutzers vom 2026-11-09:** „Gemerkt und Beworben sind verschiedene Kategorien. Bei beworben nur ausblenden, nie entfernen. Bei gemerkt wirklich entfernen.“

**Files:** `web/app/stellen/actions.ts`, `web/app/stellen/page.tsx`, `web/app/stellen/[id]/page.tsx`, `web/app/bewerbungen/knoepfe.tsx`, Tests in `web/tests/`.

- [ ] **Merken als Schalter.** Neue Server-Action `entmerken(jobId)`: Sitzung zuerst prüfen. Die eigene Bewerbung zur Stelle suchen. Nur wenn ihr Status `gemerkt` ist, wird sie gelöscht; Kontakte, Interviews und Verlauf fallen per `on delete cascade` mit weg (so gewollt, keine Rückfrage). Bei jedem anderen Status passiert nichts. Danach `revalidatePath` wie bei `merken`.
  - Stellenliste: „Gemerkt ✓“ ist ein echter Knopf (`aria-pressed="true"`, `title="Klicken, um nicht mehr zu merken"`), der `entmerken` aufruft.
  - Detailseite: Bei Status `gemerkt` stehen der Schalter „Gemerkt ✓“ und der Link „Zur Bewerbung“ nebeneinander.
- [ ] **Beworben zurücknehmen, nie löschen.** Neue Server-Action `bewerbungZuruecknehmen(jobId)`: Nur bei Status `beworben` wird der Status auf `gemerkt` zurückgesetzt und `beworben_am` geleert. Die Bewerbung samt allen Einträgen bleibt erhalten, der Trigger schreibt den Wechsel in den Verlauf. Bei späteren Status (z. B. im Gespräch) passiert nichts, die ändert man in der Bewerbung selbst. Ein Fehler beim Update führt wie bei `beworben` zu einem Redirect mit `?fehler=`.
  - Stellenliste und Detailseite: Bei Status `beworben` steht der Schalter „Beworben ✓“ (`aria-pressed="true"`, `title="Klicken, um zurückzunehmen"`). Bei späteren Status bleibt die Anzeige wie bisher, nicht klickbar.
- [ ] **Link-Formular hängt nicht mehr.** Nach der Meldung „Aus dem Link ist nichts erkennbar“ sind Firma und Titel Pflichtfelder. Bisher blockierten sie das Absenden eines neuen Links. Neu gelten die Felder nur für den Link, für den gefragt wurde: Ändert der Nutzer den Link, verschwinden die Felder und die Meldung, und der Knopf heißt wieder „Anlegen“.
- [ ] Tests für die reine Logik (welcher Status was erlaubt), `npm test`, `npm run build`.
- [ ] Commit `Klicktest: Merken und Beworben umschaltbar, Link-Formular`

### Task 9: Stellen von LinkedIn und Co. übernehmen (nach Task 8)

**Wunsch des Nutzers vom 2026-11-09:** Ein LinkedIn-Link wurde nicht erkannt („sehr schlecht“). Die Regel bleibt: Kein Server von Jobradar ruft LinkedIn, Stepstone o. Ä. ab (`GESPERRT` in `web/lib/ats-abruf.ts` bleibt). Der Nutzer wählte beide Wege: Lesezeichen-Knopf am PC und Text einfügen fürs Handy.

**Files:** neu `web/lib/uebernahme.ts` + Test, neu `web/app/bewerbungen/uebernehmen/page.tsx` (+ Client-Teil), `web/app/bewerbungen/actions.ts`, `web/app/bewerbungen/knoepfe.tsx`, `web/app/bewerbungen/neu/page.tsx` + `detail-actions.ts`, `web/app/konto/page.tsx`, `web/lib/link-import.ts`.

- [ ] **Text einfügen.** Link-Formular und „Manuell anlegen“ bekommen ein optionales Feld „Anzeigentext (optional)“ (`<textarea>`). Der Text wird in `applications.snapshot_text` gespeichert. Höchstens 50.000 Zeichen, sonst Meldung. Keine KI jetzt; die Auswertung per Groq kommt mit der Groq-Probe.
- [ ] **LinkedIn-Links vereinheitlichen.** `analysiereLink` macht aus `linkedin.com/jobs/collections/…?currentJobId=<n>` und `…/jobs/search/…?currentJobId=<n>` die Form `https://www.linkedin.com/jobs/view/<n>/`. So erkennt die Dublettenprüfung dieselbe Stelle wieder. Test dazu.
- [ ] **Lesezeichen-Knopf (Bookmarklet, ein Lesezeichen mit JavaScript statt Adresse).**
  - Läuft im Browser des Nutzers auf der Seite, die er gerade ansieht. Es liest: Adresse, Titel, Firma, Ort und Anzeigentext.
  - Reihenfolge der Quellen: JSON-LD `JobPosting` → LinkedIn-Elemente (Titel im `h1`, Firma im Firmenlink der Top-Card, Text aus `#job-details` bzw. `.jobs-description__content`) → `og:title` → `document.title` im Muster „Titel | Firma | LinkedIn“. Hat der Nutzer Text markiert, gilt die Markierung als Anzeigentext.
  - Dann öffnet es `<jobradar-adresse>/bewerbungen/uebernehmen` in einem neuen Tab und schickt die Daten per `postMessage`, wiederholt, bis die Seite den Empfang bestätigt (höchstens ca. 10 s).
  - Die Seite `/bewerbungen/uebernehmen` (nur mit Anmeldung, wie alle Seiten) nimmt nur Nachrichten an, deren Form `pruefeUebernahme()` aus `web/lib/uebernahme.ts` besteht: nur Strings, Längen begrenzt, URL nur http/https. Sie zeigt ein **vorausgefülltes, änderbares** Formular. **Nichts wird ohne Klick auf „Bewerbung anlegen“ gespeichert**, denn jede fremde Seite könnte diese Seite öffnen und ihr Daten schicken.
  - Gespeichert wird über `bewerbungAusLink(url, firma, titel, text)`: Die Dublettenprüfung greift, und es wird nichts abgerufen.
  - Konto-Seite, neuer Abschnitt „Stellen von LinkedIn & Co. übernehmen“: der Knopf als ziehbarer Link, gebaut mit der aktuellen Adresse der Website, also lokal und später bei Vercel jeweils richtig. Dazu drei Sätze Anleitung: in die Lesezeichenleiste ziehen, auf der Anzeige klicken, prüfen und anlegen. Hinweis: am Handy stattdessen den Text einfügen.
- [ ] Tests: `pruefeUebernahme` (gültig, zu lang, falsche Typen, `javascript:`-URL) und die LinkedIn-Vereinheitlichung. Dazu `npm test` und `npm run build`. Das Lesezeichen selbst kann nur der Nutzer auf LinkedIn testen; das kommt in die Checkliste.
- [ ] Doku: README-Abschnitt „Link einfügen“ ergänzen, CLAUDE.md Abschnitt zur Link-Erkennung um den Lesezeichen-Weg ergänzen, eine Zeile in `docs/ENTSCHEIDUNGEN.md`.
- [ ] Commit `LinkedIn und Co.: Lesezeichen-Knopf und Text einfügen`

### Task 10: Fehler aus dem Klicktest vom 2026-11-10 (nach Task 9)

**Wunsch des Nutzers (Klicktest, Teil 1):** Erfahrungslevel falsch sortiert; „Neu“ steht an jeder Stelle; „Beworben am“ füllt sich nicht; Kästen im Bewerbungsformular sollen einklappbar sein.

**Files:** `web/lib/filter.ts`, `web/app/stellen/page.tsx`, `web/app/bewerbungen/detail-actions.ts`, `web/app/bewerbungen/[id]/page.tsx`, `web/app/globals.css`, Tests in `web/tests/`.

- [ ] **Erfahrungslevel in fester Reihenfolge.** Neue Konstante `LEVEL_REIHENFOLGE = ["Junior", "Mid", "Senior", "Lead"]` in `web/lib/filter.ts`. Die Facette „level“ sortiert danach (wie `groesse` nach `GROESSEN_REIHENFOLGE`), unbekannte Werte ans Ende. Test.
- [ ] **„Neu“ nur für wirklich neue Stellen.** Ursache: Alle 218 Stellen des ersten Laufs tragen `erstmals_gesehen = 2026-11-07`, weil es davor keine Daten gab. `istNeu(erstmals, jetzt, ersterLauf)` gibt `false`, wenn `erstmals <= ersterLauf`. `ersterLauf` ist das kleinste `datum` in `laeufe` (eine Abfrage pro Seitenaufruf, parallel zu den vorhandenen). Fehlt die Tabelle oder ist sie leer, gilt wie bisher nur die 3-Tage-Regel. `shortcut:` Kommentar: Echte Veröffentlichungsdaten aus dem ATS (Ashby `publishedAt`, Greenhouse `first_published`, Recruitee `published_at`, JSON-LD `datePosted`) kommen mit Phase 4 als Spalte `veroeffentlicht_am`. Test.
- [ ] **„Beworben am“ bei jedem Wechsel auf „beworben“.** In `statusWechseln` (detail-actions.ts): Wird der Status `beworben` und ist `beworben_am` leer, wird `beworben_am = heuteLokal()` im selben Update gesetzt (Bedingung im Schreibbefehl: `.is("beworben_am", null)` nur für den Datumsteil, zwei Updates sind erlaubt, falls PostgREST keine bedingte Spalte kann). Gleiche Regel bleibt in `beworben()` (stellen/actions.ts). Test der reinen Regel (Funktion `beworbenPatch(status, beworbenAm, heute)` in `web/lib/bewerbung.ts`).
- [ ] **Kästen einklappbar.** Jeder Abschnitt der Bewerbungsseite (`<section className="karte">` mit `<h2>`) wird ein `<details className="karte" open>` mit `<summary><h2>…</h2></summary>`. Standard: offen. Der Browser merkt sich nichts, das ist bewusst (kein JavaScript). Druckansicht: alle offen (CSS `@media print { details { display: block } summary { … } }` prüfen, dass der Inhalt gedruckt wird).
- [ ] `npm test`, `npm run build`. Commit `Klicktest 2: Level-Reihenfolge, Neu, Beworben am, Kästen einklappbar`

### Task 11: Link mit Job-Nummer, aber ohne Board-Kennung (nach Task 10)

**Wunsch des Nutzers (Klicktest 2026-11-10):** Ein Helsing-Link `https://helsing.ai/de/jobs/4782354101?gh_jid=4782354101` wurde nicht erkannt. Ursache: `analysiereLink` liefert für `gh_jid` ein ATS mit `id: null`, und Schritt 1 in `bewerbungAusLink` läuft nur mit `id`. Firma und Titel sind leer, also endet es bei „nichts erkennbar“.

**Files:** `web/app/bewerbungen/actions.ts`, `web/lib/link-import.ts` (nur falls nötig), `web/tests/link-import.test.ts` bzw. neuer Test für die reine Logik.

- [ ] **Schritt 1b: Job-Nummer in der eigenen Stellenliste suchen.** Direkt nach Schritt 1, wenn `!ziel && a.ats?.jobId`: Suche in `jobs` nach `id` mit Endung `:<jobId>` (PostgREST `like`, Muster `%:<jobId>`, `jobId` vorher auf `^[A-Za-z0-9._-]{1,200}$` geprüft, sonst überspringen) und `sichtbar = true`, `limit 2`. Genau **ein** Treffer → `ziel = { link, quelle: a.quelle, job }` wie in Schritt 2. Mehrere Treffer (zwei Firmen mit gleicher Nummer) → kein Ziel, weiter wie bisher.
- [ ] **Schritt 1c: Board-Kennung über die Firmentabelle.** Wenn weiterhin `!ziel && a.ats && !a.ats.id`: Firma suchen, deren `careers_url` denselben Host hat wie der Link (Host ohne `www.`), `ats_typ === a.ats.typ`; mit deren `ats_id` Schritt 1 ausführen (`holeStelle`). So klappt es auch für Stellen, die noch nicht in der Liste sind (z. B. gerade erst online).
- [ ] Reine Hilfsfunktion `hostOhneWww(url: string): string` in `web/lib/link-import.ts` mit Test. Test für die Reihenfolge der Schritte mit einem Fake-Client, falls das Test-Setup das ohne großen Umbau zulässt; sonst nur die Hilfsfunktion testen und die Schritte im Bericht beschreiben.
- [ ] `npm test`, `npm run build`. Commit `Link-Import: Job-Nummer in Stellenliste und Firmen-Board suchen`
