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
- [ ] Commit `Konto und Admin-Einblicke, Dokumente aus der Navigation`

### Task 5: Design mit Hallmark

**Files:** `web/app/globals.css` sowie Struktur- und Klassen-Anpassungen in den Seiten unter `web/app/**/page.tsx`, ohne Logikänderungen.

- [ ] Skill **hallmark** im Modus `redesign` auf `web/app` anwenden. Die Floor-Regeln der Skill-Datei gelten. Der bestehende Hell- und Dunkelmodus sowie WCAG AA bleiben erhalten.
- [ ] `node ~/.claude/skills/hallmark/scripts/sloplint.mjs` auf die geänderten CSS- und Seitendateien laufen lassen. Jedes `FAIL` beheben, jedes `REFLEX` beheben oder begründet zulassen.
- [ ] `npm test`, `npm run build`
- [ ] Commit `Design mit Hallmark`

### Task 6: Doku und Nutzer-To-dos

- [ ] `README.md`: Begriffe (Branche, Funktion, Online seit), Merken und Detailseite.
- [ ] `docs/STATUS.md`: neues Nutzer-To-do „Migration 005 ausführen“ **vor** dem Klicktest. Der Klicktest wird um die neuen Punkte ergänzt.
- [ ] Die Checkliste (Artifact) aktualisiert der Controller selbst.
- [ ] Commit `Doku für Phase 2b`
