# Öffentlicher Zugang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stellenliste und Stellenseiten ohne Anmeldung lesbar machen, ohne dass Anzeigentext, Logos oder persönliche Daten an Besucher gehen; dazu Impressum und „nicht auffindbar“.

**Architecture:** Die Datenbank schützt selbst: Die Rolle `anon` bekommt nur Spaltenrechte auf die Listen- und Steckbrief-Spalten plus RLS-Policies für sichtbare, offene Stellen (Migration 007). Die Website erkennt „kein Nutzer“ (`aktuellerNutzer()` ist `null`) und lässt dann alle Abfragen weg, die geschützte Spalten oder Nutzertabellen brauchen. Der Proxy leitet nur noch nicht-öffentliche Pfade auf `/login` um.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), Supabase (Postgres, RLS, PostgREST), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-11-oeffentlicher-zugang-design.md`

**Ausgangsstand:** Zweig `oeffentlich` wird vor Task 1 auf den Stand von `tracker` **nach** dem Zusammenführen mit `entwurf-ui` gebracht (`git merge --ff-only tracker`). Grund: Detailseite `/bewerbung/<id>`, Kasten „Über <Firma>“ und Ausschluss-Suche existieren nur dort. Dieser Plan bezieht sich auf diese Dateien.

## Global Constraints

- Ohne Anmeldung erreichbar: `/` (leitet auf `/stellen`), `/stellen`, `/stellen/<id>`, `/impressum`, `/datenschutz`, `/login`, `/auth/*`. Alles andere leitet auf `/login`.
- Besucher ohne Konto sehen NICHT: ganzen Anzeigentext (`text`), Abschnitte (`abschnitte`), `beschreibung_kurz`, Logos (`logo_url`), Ranglisten.
- Statt „Merken“: Link „Anmelden zum Merken“.
- Impressum-Werte nur aus `IMPRESSUM_NAME`, `IMPRESSUM_STRASSE`, `IMPRESSUM_ORT`, `IMPRESSUM_EMAIL`; nie im Repo. Fehlt eine: „Impressum noch nicht eingerichtet“, kein Absturz, kein Bau-Fehler. Datenschutz „Verantwortlich“ ebenso.
- `noindex, nofollow, noarchive` als Meta-Tag UND als `X-Robots-Tag`-Header auf jeder Antwort; keine Sitemap, keine robots.txt-Sperre.
- „Auch im Anzeigentext suchen“ gibt es ohne Anmeldung nicht; `?volltext=1` wird ignoriert.
- Migration mehrfach ausführbar. Keine Besucherzählung, kein Cookie-Banner.
- Repo ist öffentlich: keine Namen, Adressen, E-Mails, Vercel-Adresse in Code oder Doku.

## Review Focus

1. Besucher mit `?q=x&volltext=1&ohne=Sales` in der Adresse: Seite lädt ohne Fehler, Suche und Ausschluss nur im Titel. → Task 4, Schritt „Gast-Smoke“.
2. Besucher öffnet `/stellen/<id>` einer geschlossenen oder unsichtbaren Stelle: 404, nicht leere Seite. → Task 5, Schritt „Gast-Smoke“.
3. Besucher schickt die Server-Aktion „merken“ (z. B. altes Formular): Weiterleitung auf `/login`, nichts angelegt. → Task 4, Schritt „Gast-Smoke“.
4. Angemeldeter Nutzer: Volltext, ganze Anzeige, „Über <Firma>“, Merken funktionieren unverändert. → Task 7.
5. Direkter Aufruf der Supabase-Schnittstelle mit dem öffentlichen Schlüssel nach `text`, `abschnitte`, `logo_url`, `laeufe.bericht`, `applications`: abgelehnt. → Task 1, Schritt „Anon-Prüfung“.

---

### Task 1: Migration 007 – Rechte für Besucher

**Files:**
- Create: `supabase/migrations/007_oeffentlich.sql`
- Create: `web/scripts/pruefe-anon.mjs` (Prüfskript, ohne Abhängigkeiten, liest `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` aus der Umgebung)

**Interfaces:**
- Produces: Rolle `anon` darf lesen — `jobs`: `id, unternehmen, titel, ort, staedte, remote, arbeitsmodell, vertragsart, abteilung, erfahrungslevel, url, erstmals_gesehen, status, sichtbar, land, steckbrief`; `companies`: `name, groesse_klasse, kategorie, aktiv`; `laeufe`: `datum`; `execute` auf `public.facetten()`. Policies: `jobs_select_anon` (`sichtbar and status = 'offen'`), `companies_select_anon` (`aktiv`), `laeufe_select_anon` (`true`).

- [ ] **Step 1: Prüfskript schreiben.** `pruefe-anon.mjs` macht je einen GET auf `/rest/v1/...` mit Header `apikey` = Anon-Schlüssel und ohne Anmeldung und gibt pro Zeile `OK`/`FEHLER` aus; Exit-Code 1 bei einem FEHLER. Erwartungen:
  - erlaubt (HTTP 200): `jobs?select=id,titel,unternehmen,steckbrief,companies!inner(groesse_klasse,kategorie,aktiv)&limit=1`, `laeufe?select=datum&limit=1`, `rpc/facetten` (POST, Body `{}`)
  - abgelehnt (HTTP 401/403 oder Code `42501`): `jobs?select=text&limit=1`, `jobs?select=abschnitte&limit=1`, `jobs?select=beschreibung_kurz&limit=1`, `companies?select=logo_url&limit=1`, `laeufe?select=bericht&limit=1`, `applications?select=id&limit=1`, `wichtige_punkte?select=begriff&limit=1`
  - leer (200 und `[]`): `jobs?select=id&status=eq.geschlossen&limit=1`, `jobs?select=id&sichtbar=eq.false&limit=1`
- [ ] **Step 2: Vor der Migration ausführen.** Run: `node --env-file=.env.local scripts/pruefe-anon.mjs` (in `web/`). Expected: FEHLER bei den „erlaubt“-Zeilen (anon hat heute keine Rechte).
- [ ] **Step 3: `007_oeffentlich.sql` schreiben.** Reihenfolge: `revoke all on public.jobs, public.companies, public.laeufe from anon;` → `grant select (<Spalten aus Interfaces>) on ... to anon;` → `alter table ... enable row level security` (schon an, schadet nicht) → `drop policy if exists` + `create policy ... for select to anon using (...)` je Tabelle → `grant execute on function public.facetten() to anon;`. Kopfkommentar: wofür, mehrfach ausführbar, im Supabase SQL Editor ausführen.
- [ ] **Step 4: Nutzer-To-do.** Der Nutzer führt 007 im SQL Editor aus (Anleitung im Abschluss, Task 7). Bis dahin ist Task 1 nur „geschrieben“, nicht „geprüft“.
- [ ] **Step 5: Anon-Prüfung nach dem Ausführen.** Run: `node --env-file=.env.local scripts/pruefe-anon.mjs`. Expected: alle Zeilen `OK`, Exit 0.
- [ ] **Step 6: Commit** `git add supabase/migrations/007_oeffentlich.sql web/scripts/pruefe-anon.mjs` → „Migration 007: Lesezugriff für Besucher nur auf Listen- und Steckbrief-Spalten“.

### Task 2: Öffentliche Pfade, Proxy und „nicht auffindbar“

**Files:**
- Create: `web/lib/oeffentlich.ts`
- Test: `web/tests/oeffentlich.test.ts`
- Modify: `web/proxy.ts` (Weiterleitung nur für nicht-öffentliche Pfade), `web/next.config.ts` (Header), `web/app/layout.tsx` (`metadata.robots`)

**Interfaces:**
- Produces: `istOeffentlich(pfad: string): boolean`; `ROBOTS = "noindex, nofollow, noarchive"`.

- [ ] **Step 1: Test schreiben.**
```ts
test("istOeffentlich: nur Stellen, Rechtliches und Anmeldung", () => {
  for (const p of ["/", "/stellen", "/stellen/", "/stellen/Helsing%3A4711", "/impressum", "/datenschutz", "/login", "/auth/callback", "/auth/neues-passwort"])
    assert.equal(istOeffentlich(p), true, p);
  for (const p of ["/stellenx", "/bewerbungen", "/bewerbungen/kanban", "/bewerbung/3f2c", "/konto", "/admin/nutzer", "/export", "/dokumente", "/loginx"])
    assert.equal(istOeffentlich(p), false, p);
});
```
- [ ] **Step 2:** Run `npm test` → FAIL (Modul fehlt).
- [ ] **Step 3: Implementieren.** `istOeffentlich` per Segmentvergleich (erstes Pfadsegment in `{"", "stellen", "impressum", "datenschutz", "login", "auth"}`), kein Präfix-Stringvergleich (sonst wäre `/stellenx` öffentlich). Im Proxy: `getClaims()` läuft weiter für alle Pfade (Sitzung erneuern); umgeleitet wird nur `if (!data?.claims && !istOeffentlich(request.nextUrl.pathname))`. Matcher unverändert. `next.config.ts`: `headers()` mit `source: "/:path*"`, `X-Robots-Tag: ROBOTS`. `layout.tsx`: `robots: ROBOTS` in `metadata`.
- [ ] **Step 4:** Run `npm test` → PASS; `npx tsc --noEmit` sauber.
- [ ] **Step 5: Prüfen ohne Anmeldung.** Run (Dev-Server läuft): `curl -sI http://localhost:<port>/stellen` → `200` und `X-Robots-Tag: noindex, nofollow, noarchive`; `curl -sI .../bewerbungen` → `307` nach `/login`; `curl -s .../stellen | grep -o 'name="robots"[^>]*'` → enthält `noindex`.
- [ ] **Step 6: Commit** → „Öffentliche Pfade: Stellen ohne Anmeldung, Rest geschützt; noindex überall“.

### Task 3: Impressum und Datenschutz aus Umgebungsvariablen

**Files:**
- Create: `web/lib/impressum.ts`, `web/app/impressum/page.tsx`
- Test: `web/tests/impressum.test.ts`
- Modify: `web/app/datenschutz/page.tsx` (Verantwortlich aus `impressum()`, Abschnitt „Ohne Anmeldung“), `web/app/layout.tsx` (Fußzeile: Link „Impressum“ neben „Datenschutz“), `web/.env.example` falls vorhanden (nur die 4 Namen, leere Werte)

**Interfaces:**
- Produces: `type Impressum = { name: string; strasse: string; ort: string; email: string }`; `impressum(env: Record<string, string | undefined> = process.env): Impressum | null` (null, sobald ein Wert fehlt oder nur Leerzeichen ist; Werte getrimmt).

- [ ] **Step 1: Test schreiben.**
```ts
const voll = { IMPRESSUM_NAME: " A B ", IMPRESSUM_STRASSE: "Weg 1", IMPRESSUM_ORT: "12345 Ort", IMPRESSUM_EMAIL: "a@example.com" };
test("impressum: alle vier Werte, getrimmt", () => {
  assert.deepEqual(impressum(voll), { name: "A B", strasse: "Weg 1", ort: "12345 Ort", email: "a@example.com" });
});
test("impressum: fehlt einer oder ist leer → null", () => {
  assert.equal(impressum({ ...voll, IMPRESSUM_EMAIL: undefined }), null);
  assert.equal(impressum({ ...voll, IMPRESSUM_ORT: "  " }), null);
});
```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implementieren.** `/impressum`: Überschrift „Impressum“, „Angaben gemäß § 5 DDG“, Name, Straße, Ort, E-Mail als `mailto:`-Link; bei `null` nur „Impressum noch nicht eingerichtet.“ `export const dynamic = "force-dynamic"` auf Impressum und Datenschutz, damit geänderte Werte ohne neuen Bau greifen und der Bau ohne Werte nicht scheitert. Datenschutz: „Verantwortlich: <Name>, <E-Mail>“ bzw. „noch nicht eingerichtet“; neuer Abschnitt „Ohne Anmeldung“: keine Cookies, keine Zählung; Vercel speichert technische Server-Protokolle (IP-Adresse, Zeit, Adresse) kurzzeitig. Stand-Datum aktualisieren.
- [ ] **Step 4:** `npm test` → PASS; `npx tsc --noEmit` sauber; Suche in `web/app` und `web/lib` nach dem echten Namen, der Anschrift und den E-Mail-Adressen des Betreibers (Suchbegriffe nur im Terminal, nie in eine Datei schreiben) → keine Treffer.
- [ ] **Step 5: Commit** → „Impressum und Datenschutz-Verantwortlicher aus Umgebungsvariablen“.

### Task 4: Stellenliste für Besucher

**Files:**
- Modify: `web/app/stellen/page.tsx`, `web/app/kopf.tsx`

**Interfaces:**
- Consumes: `aktuellerNutzer()` aus `web/lib/nutzer.ts` (`null` = Besucher).

- [ ] **Step 1: Implementieren.**
  - `const nutzer = await aktuellerNutzer();` Ist er `null`: `f = { ...f, volltext: false }` **vor** `stellenAbfrage`; Checkbox „Auch im Anzeigentext suchen“ nicht anzeigen; `listen_felder`- und `applications`-Abfragen auslassen (Standardfelder, kein Merk-Status); statt Merken/Gemerkt-Formular ein Link `Anmelden zum Merken` → `/login` (Klasse wie der Merken-Knopf).
  - `kopf.tsx`: ohne Nutzer statt `null` ein Kopf mit „Jobradar“ (→ `/stellen`) und Navigation „Stellen“, „Anmelden“ (→ `/login`).
- [ ] **Step 2:** `npx tsc --noEmit` sauber, `npm test` grün.
- [ ] **Step 3: Gast-Smoke** (Playwright-Skript im Scratchpad, ohne Cookie, Dev-Server):
  - `/stellen?q=Engineer&volltext=1&ohne=Sales` → HTTP 200, keine Fehlermeldung „konnten nicht geladen werden“, keine Volltext-Checkbox, mindestens ein Link „Anmelden zum Merken“, Kopf zeigt „Anmelden“, nicht „Bewerbungen“.
  - Server-Aktion „merken“ als Gast auslösen (Formular einer angemeldeten Seite nachbauen oder `merken` per `fetch` mit Next-Action-Header aufrufen) → Antwort leitet auf `/login`; per Service-Schlüssel prüfen: keine neue Zeile in `applications`.
- [ ] **Step 4: Commit** → „Stellenliste ohne Anmeldung: nur Titelsuche, Anmelden zum Merken“.

### Task 5: Stellenseite für Besucher

**Files:**
- Modify: `web/app/stellen/[id]/page.tsx`

**Interfaces:**
- Consumes: `aktuellerNutzer()`; vorhandene Helfer `bewerbungenBei`, `firmenTrend` (nur für Angemeldete).

- [ ] **Step 1: Implementieren.**
  - Hauptabfrage ohne `text`: `id,unternehmen,titel,url,ort,remote,arbeitsmodell,vertragsart,erfahrungslevel,erstmals_gesehen,companies(groesse_klasse,kategorie)`; `steckbrief` wie bisher getrennt.
  - Nur mit Nutzer: `text` und `abschnitte` (zusammen in einer Abfrage), `wichtige_punkte`, `applications`, `laeufe(bericht)`, `bewerbungenBei`; Kasten „Über <Firma>“, „Wichtige Punkte“-Zeile, „Ganze Anzeige lesen“, Merken-/Beworben-Knöpfe.
  - Ohne Nutzer: Steckbrief, „Original-Anzeige öffnen“, Link „Anmelden zum Merken“, Hinweis „Melde dich an, um die ganze Anzeige hier zu lesen.“
  - Entscheidung (eigene): Der Kasten „Über <Firma>“ ist nur für Angemeldete – er braucht `laeufe.bericht` und eigene Bewerbungen; kununu/Glassdoor-Links allein lohnen keinen Gast-Kasten.
- [ ] **Step 2:** `npx tsc --noEmit` sauber.
- [ ] **Step 3: Gast-Smoke:** eine offene Stelle → 200, Steckbrief da, kein Text „Ganze Anzeige lesen“, kein „Über “-Kasten, Link „Anmelden zum Merken“; eine geschlossene oder `sichtbar = false` Stelle (id per Service-Schlüssel suchen) → 404-Seite.
- [ ] **Step 4: Commit** → „Stellenseite ohne Anmeldung: Steckbrief und Original-Link, kein Anzeigentext“.

### Task 6: Dokumentation

**Files:**
- Modify: `docs/ENTSCHEIDUNGEN.md`, `docs/STATUS.md`, `CLAUDE.md` (4.6 „Zugang“: Stellenliste und Stellenseiten ohne Konto lesbar, Rest nur angemeldet), `README.md` falls es eine Umgebungsvariablen-Liste hat

- [ ] **Step 1:** ENTSCHEIDUNGEN: eine Zeile „Öffentlicher Zugang“ (Spaltenrechte statt Code-Filter, Gast-Regeln, „Über <Firma>“ nur angemeldet). STATUS: Nutzer-To-dos „007 im SQL Editor ausführen“ und „4 Impressum-Variablen in Vercel und `.env.local` setzen, dann neu deployen“. Keine Werte eintragen.
- [ ] **Step 2: Commit** → „Doku: öffentlicher Zugang“.

### Task 7: Gesamtprüfung

- [ ] **Step 1:** `npm test`, `npx tsc --noEmit`, `npm run build` grün (Build ohne Impressum-Variablen muss durchlaufen).
- [ ] **Step 2:** Nach Nutzer-To-do 007: `node --env-file=.env.local scripts/pruefe-anon.mjs` → alle OK.
- [ ] **Step 3: Angemeldet-Regression** (Wegwerf-Konto `…@example.com`, Cookie-Login wie bisher, im `finally` löschen): `/stellen?q=<Wort aus einem Anzeigentext>&volltext=1` findet mehr als ohne Volltext; Stellenseite zeigt „Ganze Anzeige lesen“ und „Über <Firma>“; Merken legt eine Bewerbung an; `/bewerbungen`, `/konto` erreichbar.
- [ ] **Step 4:** `/ponytail-review` über den Zweig; Befunde beheben oder begründet ablehnen.
