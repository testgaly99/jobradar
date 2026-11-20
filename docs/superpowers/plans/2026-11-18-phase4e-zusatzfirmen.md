# Phase 4e: Zusatzfirmen je Nutzer – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag über `docs/codex-warteschlange.md`. Setzt 4d voraus (`companies.herkunft`, `db_firmen`, Admin-Abruf im Nachtlauf) und den Link-Schnellstart (`web/lib/seiten-abruf.ts`).

**Goal:** Jeder Nutzer trägt eigene Firmen per Name + Link ein; deren Stellen sieht nur er (Datenbank erzwingt das); der Admin sieht eine Meldeliste ohne Nutzernamen und kann eine Firma für sich oder für alle freigeben.

**Architecture:** Migration 016 ergänzt `companies.fuer_alle` und die Tabelle `firmen_sichtbar (unternehmen, owner_id)`; die Lese-Regeln (RLS) von `companies` und `jobs` gelten dann nur für freigegebene oder eigene Firmen, für Gäste nur `fuer_alle`. Das Formular auf der Konto-Seite erkennt das Portal aus dem Link (vorhandenes `analysiereLink`, sonst ein Seitenabruf mit `holeFirmenseite`), prüft per Probeabruf und legt die Firma als `herkunft='nutzer'` an. Der Nachtlauf ruft sie über `db_firmen` ab, schreibt sie aber weder in `laeufe` noch in den Bericht.

**Tech Stack:** Next.js 16 / TypeScript (node:test), Supabase (RLS, SQL-Funktion), Python (pytest).

**Spec:** `docs/superpowers/specs/2026-11-17-phase4-firmen-ranglisten-design.md` (Abschnitt 4e, Festlegung 2; Anti-Ziel „Private Zusatzfirmen werden für andere sichtbar“)

## Global Constraints

- **Zwei Admin-Konten (Q236/Q237, 2026-11-19):** Task 4b legt für **jede** Zeile in `admins` eine Zeile in `firmen_sichtbar` an (beide Admin-Konten sehen die 13 heutigen Firmen); „kein Limit“ gilt für jedes Admin-Konto.

- Private Firmen und ihre Stellen erscheinen für niemanden außer den eingetragenen Nutzern: nicht in Stellenliste, Facetten (`facetten`), Ranglisten-Funktionen, `laeufe`, `data/bericht.md`, GitHub-Issues (4f) oder Telegram-Digest anderer.
- Unterstützte Portale nur, wenn der Python-Nachtlauf sie abrufen kann: `greenhouse`, `ashby`, `personio`, `recruitee` (Q75; + später neue Adapter aus 4c-3). Sonst Meldung (exakt): „Diese Seite kann jobradar nicht lesen.“
- Höchstens 50 Zusatzfirmen je Nutzer (Q75); **für den Admin gilt kein Limit** (Nutzer 2026-11-19); Formular-Abrufe höchstens 10 je Minute je Nutzer (`darfAbrufen` aus dem Link-Schnellstart).
- Keine Claude-Recherche für Nicht-Admins (Q38).
- Hinweistext im Formular und in der Datenschutzerklärung (exakt): „Der Admin sieht den Firmennamen und kann die Firma für alle freigeben.“
- Meldeliste für den Admin zeigt nie Nutzernamen oder E-Mails, nur Firmenname, Link, Portal, Anzahl Nutzer.
- Migration nur als Datei: `supabase/migrations/016_zusatzfirmen.sql`.

## Review Focus

1. Nutzer A legt „Beispiel GmbH“ an; Nutzer B (angemeldet) und ein Gast sehen weder Firma noch Stellen noch Facettenzahl (RLS-Test Task 1).
2. Nutzer B trägt dieselbe Firma (gleiches Portal, gleiche Kennung) ein: kein zweiter Eintrag, B kommt in `firmen_sichtbar` (Test Task 2).
3. Eine Firma, die es für alle schon gibt, wird eingetragen: Meldung „Diese Firma gibt es schon in jobradar.“, nichts angelegt (Test Task 2).
4. Nutzer löscht sein Konto: seine `firmen_sichtbar`-Zeilen verschwinden (Fremdschlüssel `on delete cascade`); eine Firma ohne verbleibende Nutzer und ohne `fuer_alle` wird beim nächsten Lauf nicht mehr abgerufen (Test Task 3).
5. Nachtlauf mit einer privaten Firma: weder `laeufe` noch `bericht.md` enthalten ihren Namen (Test Task 3).

---

### Task 1: Migration 016

**Files:**
- Create: `supabase/migrations/016_zusatzfirmen.sql`
- Test: SQL-Prüftest (Muster `tests/test_sql_pruefung.py`), RLS-Fälle in `tests/test_rls.py`

**Interfaces:**
- `companies.fuer_alle boolean not null default true`.
- `public.firmen_sichtbar (unternehmen text references public.companies(name) on update cascade on delete cascade, owner_id uuid not null default auth.uid() references auth.users on delete cascade, eingetragen_am timestamptz not null default now(), primary key (unternehmen, owner_id))`; RLS: Nutzer liest und löscht nur eigene Zeilen; Einfügen nur `service_role` (die Server-Action prüft vorher).
- Funktion `public.firma_sichtbar(p_name text) returns boolean` (`security definer`, leerer `search_path`): `fuer_alle` oder Zeile in `firmen_sichtbar` mit `owner_id = auth.uid()`.
- Policies ersetzen: `companies_select` (authenticated) → `using (public.firma_sichtbar(name))`; `companies_select_anon` → `using (aktiv and fuer_alle)`; `jobs_select` → bisherige Bedingung `and public.firma_sichtbar(unternehmen)`; `jobs_select_anon` → bisherige Bedingung `and exists (select 1 from public.companies c where c.name = unternehmen and c.fuer_alle)`.
- `public.zusatzfirmen_meldung() returns table(unternehmen text, careers_url text, ats_typ text, nutzer bigint, fuer_alle boolean)` nur für `service_role`.

- [ ] **Step 1:** Prüftest (Policies vorhanden, alte Bedingungen nicht verloren, keine Rechte für `anon` auf `firmen_sichtbar`) und RLS-Fälle aus Review Focus 1.
- [ ] **Step 2–4:** FAIL → schreiben → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „4e: Migration 016 private Zusatzfirmen“ + `Agent: Codex`.

### Task 2: Formular „Eigene Firma hinzufügen“

**Files:**
- Create: `web/lib/zusatzfirma.ts`
- Modify: `web/app/konto/page.tsx`, `web/app/konto/actions.ts`, `web/app/datenschutz/page.tsx`, `web/lib/link-import.ts`, `web/lib/ats-abruf.ts` (Recruitee)
- Test: `web/tests/zusatzfirma.test.ts`

**Interfaces:**
- Consumes: `analysiereLink` (`web/lib/link-import.ts`), `alleStellen` (`web/lib/ats-abruf.ts`), `holeFirmenseite`, `darfAbrufen` (`web/lib/seiten-abruf.ts`, Link-Schnellstart).
- `UNTERSTUETZT = ["greenhouse", "ashby", "personio", "recruitee"] as const`. Recruitee kennt das Web bisher nicht: `analysiereLink` (`web/lib/link-import.ts`) erkennt zusätzlich `https://<id>.recruitee.com/…` (Typ `recruitee`, `id` = Subdomain), `alleStellen` (`web/lib/ats-abruf.ts`) liest `https://<id>.recruitee.com/api/offers/` (gleiches Format wie `scraper/ats/recruitee.py`, Fixture `tests/fixtures/recruitee_quantum.json` wiederverwenden).
- `erkennePortal(link: string, dep?): Promise<{ typ: string; id: string } | { fehler: string }>`: erst `analysiereLink`; ohne Treffer Seite mit `holeFirmenseite` holen und alle `href` durch `analysiereLink`; genau ein unterstütztes Portal → Treffer; keins/mehrere/nicht unterstützt → `{ fehler: "Diese Seite kann jobradar nicht lesen." }`.
- `pruefeZusatzfirma(name: string, link: string, dep?)`: Name 2–80 Zeichen; Portal erkennen; Probeabruf `alleStellen` → mindestens eine Stelle, sonst `„Bei dieser Firma hat jobradar gerade keine Stellen gefunden.“`.
- Action `zusatzfirmaHinzufuegen(formData)`: Nutzer prüfen, Limit 50 (nicht für `nutzer.admin`), `pruefeZusatzfirma`; mit `createAdminClient()`: gibt es eine Firma mit gleichem `ats_typ` + `ats_id` → `fuer_alle` → Meldung Review Focus 3; privat → Nutzer in `firmen_sichtbar` eintragen; sonst neue Firma (`herkunft 'nutzer'`, `fuer_alle false`, `status 'aktiv'`, `aktiv true`, `careers_url` = Link) + Zeile in `firmen_sichtbar`. Namensgleichheit mit einer anderen Firma (anderes Portal) → Name bekommt Zusatz „ (eigene)“.
- Action `zusatzfirmaEntfernen(formData)`: eigene Zeile in `firmen_sichtbar` löschen.
- Konto-Abschnitt „Eigene Firmen“: Liste (Name, Portal, Entfernen), Formular Name + Link, Hinweistext aus Global Constraints. Datenschutzerklärung: ein Satz mit demselben Hinweis.

- [ ] **Step 1: Tests:** Greenhouse-Link direkt → Treffer ohne Seitenabruf; Recruitee-Link → Treffer, `alleStellen` liest die Fixture; 51. Firma → Meldung „Du kannst höchstens 50 eigene Firmen anlegen.“; Admin mit 51. Firma → angelegt; Karriereseite mit einem Personio-Link → Treffer; mit zwei Portalen → Fehler; Workday-Link → Fehler; keine Stellen → Meldung; Review Focus 2 und 3 mit Supabase-Attrappe.
- [ ] **Step 2–4:** `npm test` FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „4e: eigene Firmen auf der Konto-Seite“ + `Agent: Codex`.

### Task 3: Nachtlauf hält private Firmen privat

**Files:**
- Modify: `scraper/run.py`, `scraper/db.py`
- Test: `tests/test_run.py`, `tests/test_db.py`

**Interfaces:**
- `db.db_firmen()` liefert zusätzlich `fuer_alle: bool` und `nutzer: int` (Anzahl Zeilen in `firmen_sichtbar`).
- `run.lauf`: private Firmen (`fuer_alle` falsch) mit `nutzer > 0` werden abgerufen; ohne Nutzer übersprungen. Ihre Bericht-Zeilen werden vor `speichere_lauf` und `_markdown` entfernt; nur eine Zahl „Private Firmen: N abgerufen, M Fehler“ bleibt im `laeufe`-Bericht.
- `sync_companies` setzt für Firmen aus der Datei `fuer_alle: true` (taucht eine private Firma auf einer Liste auf, wird sie für alle sichtbar; Bewerbungen bleiben verknüpft).

- [ ] **Step 1: Tests:** Review Focus 4 und 5; Dateifirma gleichen Namens macht eine private Firma `fuer_alle`.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „4e: Nachtlauf ruft private Firmen ab, ohne sie zu zeigen“ + `Agent: Codex`.

### Task 4: Admin-Meldeliste und Freigabe

**Files:**
- Create: `web/app/admin/firmen/page.tsx`, `web/app/admin/firmen/actions.ts`
- Modify: `web/app/kopf.tsx` (Link „Firmen“ nur für Admin)
- Test: `web/tests/zusatzfirma.test.ts`

**Interfaces:**
- Seite: ohne `nutzer.admin` → `notFound()`. Tabelle aus `zusatzfirmen_meldung()` (Service-Rolle): Firma, Link, Portal, „von N Nutzern“, Status. Knöpfe „Für mich freigeben“ (Admin-ID in `firmen_sichtbar`) und „Für alle freigeben“ (`fuer_alle = true`, nach Bestätigung per zweitem Klick „Wirklich für alle?“ ohne Browser-Dialog).
- Actions `fuerMichFreigeben(formData)`, `fuerAlleFreigeben(formData)`: Admin prüfen, Firmenname muss in der Meldeliste stehen.

- [ ] **Step 1: Tests:** Nicht-Admin → Action bricht ab, nichts geschrieben; Freigabe für alle setzt nur `fuer_alle`, nicht `herkunft`; Meldeliste-Daten enthalten keine Felder `owner_id`/`email`.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „4e: Admin-Meldeliste für Zusatzfirmen“ + `Agent: Codex`.

### Task 4b: Die 13 heutigen Firmen werden private Firmen des Admins (Q83/Q93)

**Files:** Modify: `scraper/run.py` oder eigenes kleines Skript `scraper/bestand_umziehen.py`, `data/companies.csv`; Test: `tests/test_run.py`

- Firmen mit `quellen == ["bestand"]` (nur diese Herkunft) werden in der Datenbank zu `herkunft='nutzer'`, `fuer_alle=false`, mit einer Zeile in `firmen_sichtbar` für den Admin (Kennung aus `admins`, 4d). Danach werden sie aus `data/companies.csv` entfernt (Stellen, Bewerbungen und Logos bleiben, weil die Firma in der Datenbank weiterlebt). Firmen mit `bestand` **und** einer Liste (dm, Porsche, Bundesbank) verlieren nur `bestand`.
- Läuft einmal im ersten Nachtlauf nach Migration 016, danach nie wieder (prüft, ob noch `bestand`-Zeilen da sind). Ohne `admins`-Eintrag: nichts tun, Hinweis im Bericht.
- [ ] Tests: `bestand`-Firma → privat für Admin, nicht mehr in der CSV; `bestand;dax` → bleibt für alle, nur `dax`; ohne Admin → unverändert.
- [ ] Commit — „4e: heutige Firmen werden private Firmen des Admins“ + `Agent: Codex`.

### Task 5: Doku und Halt

- [ ] `docs/STATUS.md` (Nutzer-To-do: Migration 016 einspielen), `docs/ENTSCHEIDUNGEN.md` (nur Portale mit Python-Adapter inkl. Recruitee; Grenze 50 je Nutzer (Q75); Namenszusatz „(eigene)“; Freigabe ohne Browser-Dialog), `docs/agenten-protokoll.md`, Warteschlange `🛑`.
- [ ] Commit — „4e: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt:** Nutzer spielt Migration 016 ein; Claude prüft live mit zwei Wegwerf-Konten `…@example.com` (A legt Firma an, B und Gast sehen sie nicht, Facettenzahlen gleich; Admin-Meldeliste ohne Namen) und danach einen Nachtlauf (`bericht.md` ohne private Firma).
