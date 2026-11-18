# Phase 4d: Ranglisten-Anzeige und Admin-Listen – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag über `docs/codex-warteschlange.md`. Setzt 4c voraus (Spalten aus Migration 014, `scraper/einrichtung.py`).

**Goal:** Jede Ranglisten-Ausgabe hat eine Sichtbarkeit (Admin / angemeldet / öffentlich); der Admin kann Listen von Hand einfügen und eine Linksammlung „Rankings zum Stöbern“ pflegen; Firmen aus Hand-Listen werden Admin-Firmen (nur Datenbank) und vom Nachtlauf abgerufen.

**Architecture:** Migration 015 ergänzt `ranking_ausgaben.sichtbarkeit`, eine Tabelle `admins` mit Funktion `ist_admin()`, `companies.herkunft` und `stoebern_links`; `ranking_ausgabe_aktuell` prüft die Sichtbarkeit. Die Admin-Seite `/admin/ranglisten` liest eingefügten Text zuerst per Regel, sonst per Groq, zeigt eine Vorschau und schreibt erst bei „Speichern“ (Server-Action mit Service-Rolle nach Admin-Prüfung). Filter „Liste“, Rang-Sortierung und Rang-Anzeige gibt es schon (Migration 010, `web/lib/rankings.ts`) und bleiben.

**Tech Stack:** Next.js 16 / TypeScript (node:test), Supabase (RLS), Python (pytest), Groq `openai/gpt-oss-120b`.

**Spec:** `docs/superpowers/specs/2026-11-17-phase4-firmen-ranglisten-design.md` (Abschnitt 4d, Festlegung 3 und 5)

## Global Constraints

- Sichtbarkeitswerte (exakt): `admin`, `angemeldet`, `oeffentlich`; Standard `angemeldet`. Gäste (anon) sehen vorerst keine Ränge (CLAUDE.md 4.6); `oeffentlich` wirkt deshalb wie `angemeldet`, bis der Nutzer Gäste freigibt.
- Hand-Listen und ihre Firmen stehen **nur in der Datenbank**, nie in `data/`, Tests, Fixtures, Commits oder `data/bericht.md` (Q61). Testdaten nur erfunden („Beispiel AG“).
- Gespeichert werden nur Firmenname, Rang, Listenname, Jahr, Quell-Link, Lizenz (CLAUDE.md 4.8); der eingefügte Rohtext wird nie gespeichert.
- Groq nur `openai/gpt-oss-120b`, nur der eingefügte öffentliche Listentext, höchstens 12.000 Zeichen je Durchgang. Kein PDF-Upload (bräuchte ein neues Paket, CLAUDE.md 10): Text aus dem PDF kopieren und einfügen.
- `herkunft`-Werte (exakt): `datei`, `admin`, `nutzer`. `sync_companies` setzt immer `herkunft = 'datei'` und fasst Zeilen mit anderer Herkunft sonst nicht an.
- Migration nur als Datei: `supabase/migrations/015_ranglisten_sichtbarkeit.sql`.

## Review Focus

1. Angemeldeter Nicht-Admin ruft `ranking_zuordnungen`/`ranking_stellen` mit einer Admin-Liste auf: bekommt nichts (RLS-Test Task 1).
2. Eingefügte Liste mit Firmen, die es noch nicht gibt: Vorschau markiert sie „neu“, Speichern legt sie mit `herkunft='admin'`, `status='offen'` an, nichts davon landet in Dateien (Test Task 3).
3. Zweiter Teil derselben Ausgabe (gleiche Liste + Jahr) wird ergänzt, nicht ersetzt; neue Ausgabe (anderes Jahr) ersetzt die ältere in der Anzeige (Test Task 3).
4. Text mit 12.001 Zeichen ohne erkennbare Rang-Zeilen: Hinweis „Bitte in Teilen einfügen“, kein Groq-Aufruf (Test Task 2).
5. Admin-Firma ohne Website: erscheint in `karriereseite_nicht_gefunden`, keine automatische Namenssuche (Test Task 4).

---

### Task 1: Migration 015

**Files:**
- Create: `supabase/migrations/015_ranglisten_sichtbarkeit.sql`
- Test: SQL-Prüftest nach Muster `tests/test_sql_pruefung.py`; RLS-Fälle in `tests/test_rls.py` (laufen nur mit lokaler Test-DB wie die vorhandenen)

**Interfaces:**
- `public.admins (user_id uuid primary key references auth.users on delete cascade)`; RLS an, keine Rechte für `anon`/`authenticated`; `public.ist_admin() returns boolean` (`security definer`, leerer `search_path`, prüft `auth.uid()`), Ausführen für `authenticated`, `service_role`.
- `ranking_ausgaben.sichtbarkeit text not null default 'angemeldet' check (sichtbarkeit in ('admin','angemeldet','oeffentlich'))`.
- `ranking_ausgabe_aktuell(p_id)` zusätzlich: `sichtbarkeit <> 'admin' or public.ist_admin()`. Die „neuere Ausgabe“-Prüfung zählt nur Ausgaben, die der Aufrufer sehen darf.
- `companies.herkunft text not null default 'datei' check (herkunft in ('datei','admin','nutzer'))`.
- `public.stoebern_links (id bigint generated always as identity primary key, titel text not null check (length(btrim(titel)) between 1 and 120), url text not null check (url ~ '^https://'), reihenfolge int not null default 0)`; lesen für `authenticated`, schreiben nur `service_role`.

- [ ] **Step 1:** Prüftest: Datei idempotent, `ist_admin` mit `security definer` und `set search_path = ''`, `revoke … from public, anon` vor jedem `grant`, keine E-Mail-Adresse in der Datei.
- [ ] **Step 2–4:** FAIL → schreiben → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „4d: Migration 015 Sichtbarkeit, Admins, Herkunft, Linksammlung“ + `Agent: Codex`.

### Task 2: Liste lesen (Regel, dann Groq)

**Files:**
- Create: `web/lib/listen-import.ts`
- Modify: `web/lib/groq-kern.ts` (neue Anleitung + Funktion), `scraper/ki_prompt_liste.md` (gleicher Text, wie bei `PROMPT_FIRMA`)
- Test: `web/tests/listen-import.test.ts`, `web/tests/groq.test.ts`

**Interfaces:**
- `type Eintrag = { rang: number | null; firma: string }`.
- `leseRangZeilen(text: string): Eintrag[]`: Zeilen wie `1. Beispiel AG`, `1) Beispiel AG`, `1 Beispiel AG`, `Platz 1: Beispiel AG`, `#1 Beispiel AG`; liefert nur etwas, wenn mindestens 80 % der nicht leeren Zeilen passen, sonst `[]`. HTML vorher mit `htmlZuText` aus `web/lib/link-import.ts` zu Text machen.
- `PROMPT_LISTE` + `erkenneListe(text, holen?, key?): Promise<Eintrag[] | null>` in `groq-kern.ts` nach Muster `erkenneFirmaTitel` (JSON `{"eintraege":[{"rang":…, "firma":…}]}`, nichts erfinden, Firmenname wie im Text).
- `leseListe(text: string, groq = erkenneListe): Promise<{ eintraege: Eintrag[]; hinweis: string | null }>`: erst Regel; sonst bei > 12.000 Zeichen `hinweis = "Bitte in Teilen einfügen (höchstens 12.000 Zeichen)."` ohne Groq; sonst Groq; doppelte Firmen (gleich nach `normFirma`) nur einmal (bester Rang).

- [ ] **Step 1: Tests:** fünf Zeilenformate → Ränge 1–5; Fließtext → Groq-Attrappe wird gerufen; 12.001 Zeichen Fließtext → Hinweis, Attrappe nicht gerufen; doppelte Firma → einmal; `PROMPT_LISTE` gleich Dateitext.
- [ ] **Step 2–4:** `cd web && npm test` FAIL → umsetzen → grün.
- [ ] **Step 5: Commit** — „4d: Ranglisten-Text lesen (Regel vor Groq)“ + `Agent: Codex`.

### Task 3: Admin-Seite „Ranglisten“

**Files:**
- Create: `web/app/admin/ranglisten/page.tsx`, `web/app/admin/ranglisten/actions.ts`, `web/lib/listen-speichern.ts`
- Modify: `web/app/kopf.tsx` (Link „Ranglisten“ nur für Admin neben „Nutzer“)
- Test: `web/tests/listen-speichern.test.ts`

**Interfaces:**
- Seite: ohne `nutzer.admin` → `notFound()` (wie `web/app/admin/nutzer/page.tsx`). Formular: Listenname, Herausgeber, Jahr, Quell-Link (https), Lizenz, Sichtbarkeit (Standard `admin`), Textfeld. Knopf „Vorschau“ → Tabelle Rang | Firma | Zuordnung (`vorhanden` / `neu`), Abgleich mit `companies.name` über `normFirma`. Knopf „Speichern“ schickt die Vorschau als verstecktes JSON zurück.
- `baueAusgabe(eingabe, eintraege, vorhandeneFirmen: string[], heute: string)` → `{ liste, ausgabe, firmen, neueFirmen: string[] }`; IDs: Liste `hand-<slug>` (`slugAusFirma`), Ausgabe `<liste-id>-<jahr>`; `gueltig_bis` = heute + 12 Monate; `freigegeben: true`.
- Action `listeSpeichern(formData)`: Admin prüfen, mit `createAdminClient()` schreiben: neue Firmen in `companies` (`herkunft 'admin'`, `status 'offen'`, `aktiv false`, `ats_typ ''`), dann Liste/Ausgabe upserten, dann `ranking_firmen` upserten (Ergänzen, nichts löschen). Rohtext nie speichern.
- Zweiter Abschnitt „Rankings zum Stöbern“: Liste mit Entfernen, Formular Titel + Link (https), Reihenfolge per Zahl. Für alle Angemeldeten erscheint die Linksammlung auf `/stellen` unter dem Filter (eingeklappt, Überschrift „Rankings zum Stöbern“), nur Titel als Link (`rel="noopener noreferrer"`, `target="_blank"`).

- [ ] **Step 1: Tests** für `baueAusgabe` (IDs, Gültigkeit, neue Firmen) und Review Focus 2/3 mit einer Supabase-Attrappe (Reihenfolge der Schreibaufrufe, kein Rohtext im Aufruf, gleiches Jahr → gleiche Ausgabe-ID).
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün; lokal `http://localhost:3002/admin/ranglisten` als Nicht-Admin → 404.
- [ ] **Step 5: Commit** — „4d: Admin-Seite Ranglisten und Linksammlung“ + `Agent: Codex`.

### Task 4: Admin-Firmen einrichten und abrufen

**Files:**
- Modify: `scraper/db.py`, `scraper/einrichtung.py`, `scraper/run.py`
- Test: `tests/test_einrichtung.py`, `tests/test_run.py`, `tests/test_db.py`

**Interfaces:**
- `sync_companies` schreibt `herkunft: "datei"` (nur wenn Migration 015 da, Prüfung `herkunft_da() -> bool`).
- `db.db_firmen(status: str | None = None) -> list[dict]`: Firmen mit `herkunft <> 'datei'` (Felder wie `lade_unternehmen`); `db.setze_einrichtung(name, felder: dict) -> None`.
- `einrichtung.lauf(..., mit_db: bool = True)`: bearbeitet zusätzlich `db_firmen("offen")` und schreibt deren Ergebnis per `setze_einrichtung` in die Datenbank, **nicht** in Dateien; Admin-Firmen ohne Website → nur in `karriereseite_nicht_gefunden` mit Grund „keine Website bekannt“. Diese Datei wird für DB-Firmen **nicht** committet: der Workflow schreibt DB-Firmen in eine zweite Datei `einrichtung_privat.md`, die nur als Workflow-Artefakt (7 Tage) hochgeladen wird.
- `run.lauf`: ruft zusätzlich `db_firmen()` mit `status == "aktiv"` ab; diese Firmen stehen in `laeufe`, aber **nie** in `data/bericht.md`.

- [ ] **Step 1: Tests:** Admin-Firma aktiv → abgerufen, nicht in `bericht.md`, aber im Bericht-Objekt für `laeufe`; Admin-Firma ohne Website → Grund; Einrichtungsergebnis einer DB-Firma geht an `setze_einrichtung`, nicht in die CSV.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „4d: Admin-Firmen einrichten und abrufen, nie in öffentlichen Dateien“ + `Agent: Codex`.

### Task 5: Import aus Dateien setzt Sichtbarkeit

**Files:**
- Modify: `scraper/kandidaten.py` (`ausgaben`), `scraper/rankings.py` (`pruefe_ausgabe` akzeptiert `sichtbarkeit`), `scraper/db.py` (`importiere_ausgabe`)
- Test: `tests/test_rankings.py`, `tests/test_kandidaten.py`

**Interfaces:**
- Ausgabe-Objekt bekommt `sichtbarkeit`; `epa-patente` → `admin` und `freigegeben: true` (ersetzt die Übergangsregel aus 4c Task 3), alle anderen offenen Quellen → `angemeldet`. Unbekannter Wert → `ValueError`.

- [ ] **Step 1–4:** Tests (Standard, EPA, ungültig) → FAIL → umsetzen → grün.
- [ ] **Step 5: Commit** — „4d: Sichtbarkeit beim Import der offenen Listen“ + `Agent: Codex`.

### Task 6: Doku und Halt

- [ ] `docs/STATUS.md` (Nutzer-To-dos: Migration 015 einspielen; danach im SQL Editor einmal die eigene Kennung in `admins` eintragen – Claude gibt die Zeile vor, die E-Mail steht nie im Repo), `docs/ENTSCHEIDUNGEN.md` (Admin in der Datenbank über `admins`; kein PDF-Upload ohne neues Paket; Gäste sehen weiter keine Ränge; Teil-Import ergänzt), Datenschutzerklärung prüfen (keine Änderung nötig, falls nur Admin-Daten), `docs/agenten-protokoll.md`, Warteschlange `🛑`.
- [ ] Commit — „4d: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt:** Nutzer spielt Migration 015 ein und trägt sich als Admin ein; Claude prüft mit dem Nutzer die Groq-Extraktion live an einer echten, von Hand kopierten Liste (Vorschau vergleichen, dann speichern) und prüft mit einem Wegwerf-Konto `…@example.com`, dass Admin-Listen dort nicht erscheinen.
