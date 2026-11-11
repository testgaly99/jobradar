# Tracker-Paket – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein flüssiges Bewerbungs-Board (Ziehen, kein Neuladen, Rückgängig, Archiv mit Ergebnis, Gesprächsrunden), Filter ohne Knopf in Stellenliste und Bewerbungen, Sortieren, „Diese Woche“, Auswertung und ein Seitenfenster für die Bewerbung.

**Architecture:** Server-Komponenten liefern weiter die Daten; neue Client-Komponenten übernehmen Ziehen (dnd-kit), sofortige Anzeige (`useOptimistic`) und Filter-Navigation (`useTransition`). Statuswechsel laufen über **eine** Server-Action `zugAusfuehren`, die alles in einem Update schreibt und die IDs der Verlaufseinträge für „Rückgängig“ zurückgibt. Reine Logik (Kartenfelder, Wochenliste, Kennzahlen, Rundenregeln, Filter-URLs) liegt in `web/lib/` und ist mit `node --test` getestet. Migration 006 ergänzt `runde`, `kommentar`, `logo_url` und eine Lösch-Policy für eigene Verlaufseinträge; die Website läuft auch ohne 006.

**Tech Stack:** Next.js 16 App Router, React 19 (`useOptimistic`, `useTransition`), TypeScript, schlichtes CSS mit Tokens in `web/app/stil/utilitaer.css`; neu: `@dnd-kit/core` und `@dnd-kit/sortable` (einzige neue Abhängigkeiten); Supabase/PostgREST; Python-Scraper für Logos.

**Spec:** `docs/superpowers/specs/2026-11-09-tracker-paket-design.md` (gelesen zusammen mit diesem Plan).

## Global Constraints

- „Server-Actions: Sitzung zuerst prüfen. `redirect()` außerhalb von try/catch. Nur der Nutzer-Client (RLS), nie der Service-Key. Statuswechsel nur über eine Action, die auch den Verlauf schreibt (Trigger `log_status_wechsel` gibt es).“
- „Schreibbedingungen wie in Phase 2b: Die Bedingung gehört in den Schreibbefehl selbst (kein Prüfen-dann-Schreiben).“
- „Die Website muss weiterlaufen, solange 006 noch nicht ausgeführt ist: Ohne die Felder gibt es keine Runde, keinen Kommentar und keine Logos.“ Erkennung wie bei 005: fehlende Spalte ⇒ PostgREST 400/42703 ⇒ Feld leer behandeln, Bedienelement ausblenden.
- „Das Aussehen steckt nur in `web/app/stil/utilitaer.css` (Tokens), `globals.css` hat den Aufbau.“ Neue Farben/Abstände nur als Token.
- Hallmark-Mindestregeln: Kontrast AA, sichtbarer Fokus, alles per Tastatur bedienbar, `prefers-reduced-motion: reduce` ohne Bewegung.
- Anti-Ziele (wörtlich): „Eine Statusänderung lädt die Seite neu oder flackert.“ „Zwei Ansichten zeigen unterschiedliche Stände.“ „Ziehen geht nur mit der Maus.“ „Ein Speicherfehler bleibt unbemerkt.“
- Neue Abhängigkeiten: nur `@dnd-kit/core` und `@dnd-kit/sortable`, feste Versionen in `web/package.json`.
- Status-Werte bleiben: `gemerkt, beworben, eingang_bestaetigt, im_gespraech, angebot, abgeschlossen`. Ergebnis-Werte bleiben: `zusage, absage, zurueckgezogen, angebot_abgelehnt`; Anzeige von `zurueckgezogen` ist überall „Abgebrochen“.
- Kommentar höchstens 140 Zeichen; Runde 1–4.
- Tests: `node --test` in `web/` für reine Logik; `py -m pytest` für den Scraper. `npm run build` muss grün sein. Nichts aus `.superpowers/` ins Repo; Commits mit Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; nicht pushen.
- UI-Texte Deutsch.

## Review Focus

1. **Zwei Tabs, derselbe Zug:** Tab A archiviert eine Karte, Tab B zieht dieselbe Karte (alter Stand) nach „Angebot“. Erwartung: Der zweite Zug scheitert sauber (Bedingung `status = <alter Status>` im Update, 0 Zeilen ⇒ Fehlermeldung, Karte springt zurück). Test in Task 3 (`zugPatch`-Bedingung) und manuell.
2. **Rückgängig nach Ablauf:** Der Nutzer klickt „Rückgängig“ nach 11 Minuten oder für einen Zug, den ein anderer Tab schon weitergezogen hat. Erwartung: Meldung „Rückgängig nicht mehr möglich“, keine Änderung. Test in Task 3.
3. **Migration 006 fehlt:** Board, Tabelle und Seitenfenster laden ohne Fehler, Runde/Kommentar/Logo sind ausgeblendet. Test in Task 2 (`ohneSpalten`-Fallback) und manuell vor dem Ausführen von 006.
4. **Leere Werte auf Karten:** Bewerbung ohne Verlauf, ohne Termine, ohne Gehalt. Erwartung: nur Firma und Titel, keine „undefined“, „NaN“ oder „–“. Test in Task 4.
5. **Adresse mit ungültigen Filtern:** `?sort=foo&archiv=1&status=xyz`. Erwartung: Unbekanntes wird ignoriert, Seite lädt. Test in Task 6 und Task 8.

---

### Task 1: Migration 006 und Abhängigkeiten

**Files:**
- Create: `supabase/migrations/006_tracker.sql`
- Modify: `web/package.json`, `web/package-lock.json`
- Modify: `README.md` (Abschnitt „Datenbank einrichten“: 006 ergänzen), `docs/STATUS.md` (Nutzer-To-do „Migration 006 ausführen“)

**Interfaces:**
- Produces: Spalten `applications.runde smallint`, `applications.kommentar text`, `companies.logo_url text`; RLS-Policy `application_events_delete` (eigene Zeilen); alles `if not exists`/`drop … if exists`, mehrfach ausführbar.

- [ ] **Step 1: Migration schreiben.** Inhalt genau:
  - `alter table public.applications add column if not exists runde smallint;` plus Constraint `applications_runde_check check (runde between 1 and 4)` (vorher `drop constraint if exists`).
  - `alter table public.applications add column if not exists kommentar text;` plus `applications_kommentar_check check (char_length(kommentar) <= 140)`.
  - `alter table public.companies add column if not exists logo_url text;`
  - `drop policy if exists application_events_delete on public.application_events; create policy application_events_delete on public.application_events for delete to authenticated using (owner_id = (select auth.uid()));`
  - Kopfkommentar wie in 005 (Zweck, mehrfach ausführbar).
- [ ] **Step 2:** `npm install @dnd-kit/core@6 @dnd-kit/sortable@10` in `web/` (die dann installierten exakten Versionen im Report nennen; `package-lock.json` committen).
- [ ] **Step 3:** README und STATUS ergänzen (To-do vor den anderen offenen Punkten: „Migration 006 ausführen“, mit Was/Warum/Erfolg wie bei 005).
- [ ] **Step 4:** `npm run build` grün. Commit `Tracker: Migration 006 und dnd-kit`

### Task 2: Datenzugriff mit 006-Fallback

**Files:**
- Create: `web/lib/tracker-daten.ts` (server-only), Test `web/tests/tracker-daten.test.ts`
- Modify: `web/lib/bewerbung.ts` (Labels: `ERGEBNIS_LABEL.zurueckgezogen = "Abgebrochen"`)

**Interfaces:**
- Produces:
  - `type Karte = { id: string; firma: string | null; titel: string | null; status: Status; ergebnis: string | null; interesse: number | null; beworben_am: string | null; erstellt_am: string; runde: number | null; kommentar: string | null; logo_url: string | null; gehalt: string | null; letzterSchritt: string; naechsterTermin: { datum: string; text: string } | null }`
  - `ladeKarten(sb, filter: TabellenFilter & { archiv: boolean }): Promise<{ karten: Karte[]; ohneSpalten: boolean }>` – lädt `applications` (+ `jobs.steckbrief` über `job_id`, `companies.logo_url` über `jobs.unternehmen`), die letzten `application_events` je Bewerbung, Interviews (`datum`, `aufgabe_frist`) und baut die Karten mit den reinen Funktionen aus Task 4. Fehlt eine 006-Spalte (PostgREST-Fehler mit Code `42703` oder Status 400 und Text enthält `runde`/`kommentar`/`logo_url`), wird **ohne** diese Spalten erneut geladen und `ohneSpalten = true`.
  - `spaltenFehlen(error: { code?: string; message?: string } | null): boolean`
- Consumes: `leseTabelle`, `TabellenFilter`, `escapeLike` aus `web/lib/bewerbung.ts`; Kartenlogik aus Task 4 (Task 4 kann zuerst gebaut werden; Reihenfolge im Plan: Task 4 vor Task 2 ausführen, siehe Hinweis unten).

**Hinweis Ausführung:** Task 4 (reine Logik) wird **vor** Task 2 umgesetzt. Die Nummerierung bleibt, damit die Spec-Bezüge stimmen.

- [ ] **Step 1: Failing tests** (`spaltenFehlen`):
  - `{code: "42703", message: 'column applications.runde does not exist'}` → true
  - `{code: "PGRST204", message: "Could not find the 'kommentar' column"}` → true
  - `{code: "23505"}` → false; `null` → false
- [ ] **Step 2:** Test scheitert.
- [ ] **Step 3:** `tracker-daten.ts` umsetzen; `ladeKarten` zweistufig (voll, dann Fallback-Select ohne `runde,kommentar` und ohne `companies(logo_url)`).
- [ ] **Step 4:** Tests grün, Build grün. Commit `Tracker: Kartendaten laden, 006-Fallback, "Abgebrochen"`

### Task 3: Zug-Action, Rückgängig, Runde, Kommentar, Erledigt

**Files:**
- Create: `web/lib/zug.ts` (rein), Test `web/tests/zug.test.ts`
- Create: `web/app/bewerbungen/zug-actions.ts` (`"use server"`)
- Modify: `web/app/bewerbungen/detail-actions.ts` (`statusWechseln` ruft intern dieselbe Regel `zugPatch`)

**Interfaces:**
- Produces (rein, `web/lib/zug.ts`):
  - `zugPatch(alt: { status: Status; runde: number | null; ergebnis: string | null; beworben_am: string | null }, ziel: { status: Status; ergebnis?: string | null }, heute: string): { status: Status; runde?: number; ergebnis?: string | null; beworben_am?: string }` – Regeln der Spec: Runde 1 beim ersten Erreichen von `im_gespraech` wenn `runde` leer; Runde bleibt sonst; `beworben_am = heute` wenn Ziel ≥ beworben und leer; Ziel `abgeschlossen` verlangt `ergebnis` ∈ Ergebnis-Werte (sonst `throw new Error("ergebnis")`); Ziel ≠ `abgeschlossen` setzt `ergebnis = null`, falls vorher gesetzt.
  - `rundePatch(runde: number | null, richtung: 1 | -1): { runde: number } | null` – 1..4, sonst `null` (nichts tun).
  - `rueckgaengigErlaubt(zeitpunktIso: string, jetzt: Date): boolean` – jünger als 10 Minuten.
  - `STATUS_RANG: Record<Status, number>` (gemerkt 0 … abgeschlossen 5).
- Produces (Actions, `zug-actions.ts`, alle: Sitzung zuerst, Nutzer-Client):
  - `zugAusfuehren(id: string, vonStatus: Status, ziel: { status: Status; ergebnis?: string }): Promise<{ ok: true; vorher: ZugVorher; eventIds: string[] } | { ok: false; fehler: string }>` – liest `status, runde, ergebnis, beworben_am` der eigenen Zeile, berechnet `zugPatch`, **ein** Update mit `.eq("id", id).eq("status", vonStatus)`; 0 Zeilen ⇒ `{ ok:false, fehler:"Die Bewerbung wurde inzwischen geändert." }`; danach `select id from application_events where application_id = id and datum >= <vor dem Update>` ⇒ `eventIds`; `revalidatePath` für `/bewerbungen`, `/bewerbungen/kanban`, `/stellen`. `ZugVorher = { status, runde, ergebnis, beworben_am, zeitpunkt: string }`.
  - `zugRueckgaengig(id: string, vorher: ZugVorher, eventIds: string[], aktuell: Status): Promise<{ ok: boolean; fehler?: string }>` – nur wenn `rueckgaengigErlaubt(vorher.zeitpunkt, new Date())`; Update auf `vorher`-Werte mit `.eq("id", id)` **und** `.eq("status", aktuell)` (`aktuell` = Zielstatus des Zugs, den der Client kennt); danach `delete from application_events where id in eventIds and application_id = id` (RLS: nur eigene); der Trigger schreibt für die Rücknahme erneut einen Eintrag: diesen ebenfalls löschen (select ids nach dem Update, älter als 5 s ausgeschlossen). `revalidatePath` wie oben.
  - `rundeAendern(id: string, richtung: 1 | -1)`, `kommentarSpeichern(id: string, text: string)` (trim, ≤ 140, sonst Fehler), `schrittErledigt(id: string)` – leert `naechster_schritt`/`naechster_schritt_faellig`, fügt `application_events` mit `notiz = "Erledigt: <Text>"` ein (ohne Statuswechsel).
  - Fehlt 006 (`spaltenFehlen`), antworten `rundeAendern`/`kommentarSpeichern` mit `{ ok:false, fehler:"Erst Migration 006 ausführen." }`.

- [ ] **Step 1: Failing tests** (`zug.test.ts`), exakte Werte:
  - `zugPatch({status:"gemerkt",runde:null,ergebnis:null,beworben_am:null},{status:"beworben"},"2026-11-11")` → `{status:"beworben", beworben_am:"2026-11-11"}`
  - dieselbe Basis mit `beworben_am:"2026-10-01"` → kein `beworben_am` im Patch
  - `…→{status:"im_gespraech"}` mit `runde:null` → `runde:1` und `beworben_am` gesetzt; mit `runde:3` → kein `runde` im Patch
  - `…{status:"abgeschlossen"}` ohne ergebnis → wirft; mit `ergebnis:"absage"` → `{status:"abgeschlossen", ergebnis:"absage", beworben_am:…}`
  - Rückweg `abgeschlossen`+`ergebnis:"absage"` → `{status:"im_gespraech"}` ergibt `ergebnis:null`
  - `rundePatch(4,1)` → null; `rundePatch(null,1)` → `{runde:1}`; `rundePatch(1,-1)` → null
  - `rueckgaengigErlaubt("2026-11-11T10:00:00Z", new Date("2026-11-11T10:09:59Z"))` → true; `10:10:01Z` → false
- [ ] **Step 2:** Test scheitert.
- [ ] **Step 3:** `zug.ts`, dann `zug-actions.ts`, dann `statusWechseln` auf `zugPatch` umstellen (gleiches Verhalten, ein Update).
- [ ] **Step 4:** Tests grün, Build grün. Commit `Tracker: Zug-Action mit Rückgängig, Runde, Kommentar, Erledigt`

### Task 4: Reine Kartenlogik, Wochenliste, Kennzahlen

**Files:**
- Create: `web/lib/karte.ts`, `web/lib/woche.ts`, `web/lib/auswertung.ts`; Tests `web/tests/karte.test.ts`, `web/tests/woche.test.ts`, `web/tests/auswertung.test.ts`

**Interfaces:**
- `gehaltText(a: { angebot_fix?: string|null; gehalt_wunsch?: string|null; gehalt_spanne_anzeige?: string|null }, steckbrief: { gehalt?: { min?: number|null; max?: number|null; waehrung?: string|null; zeitraum?: string|null } | null } | null): string | null` – Reihenfolge laut Spec; Leerstrings zählen als fehlend; Steckbrief-Format `70.000–85.000 € / Jahr`, Einzelwert ohne Strich, CHF als „CHF“, `zeitraum` „Monat“ ⇒ „/ Monat“, sonst „/ Jahr“.
- `tageSeit(events: { datum: string }[], erstellt_am: string, heute: string): number` – ganze Tage (Ortszeit-Datumsteil), letztes Event sonst `erstellt_am`.
- `naechsterTermin(items: { datum: string | null; text: string }[], heute: string): { datum: string; text: string } | null` – frühester mit `datum >= heute` (Datumsteil).
- `wochenListe(bewerbungen: { id: string; firma: string|null; status: Status; naechster_schritt: string|null; naechster_schritt_faellig: string|null; interviews: { datum: string|null; aufgabe: string|null; aufgabe_frist: string|null }[] }[], heute: string): WochenEintrag[]` mit `WochenEintrag = { id: string; firma: string; datum: string; zeit: string | null; text: string; art: "schritt" | "interview" | "aufgabe"; ueberfaellig: boolean }` – Spec Regel 5: `abgeschlossen` ausgeschlossen; Interviews/Aufgaben nur heute..heute+7; Schritte heute..heute+7 **oder** überfällig (`< heute`); sortiert nach `datum`, dann `zeit`.
- `kennzahlen(bewerbungen: { status: Status; ergebnis: string|null; beworben_am: string|null; erstellt_am: string; events: { datum: string; neuer_status: Status | null }[] }[], heute: string): { anzahl: number; gespraechsquote: number | null; angebotsquote: number | null; proWoche: { woche: string; anzahl: number }[]; antwortzeitMedian: number | null; zuWenig: boolean }` – Bewerbungsdatum laut Spec Regel 1; Quoten als 0–100 gerundet; `zuWenig = anzahl < 5` ⇒ Quoten `null`; `proWoche` 12 Wochen (Montag als `woche` YYYY-MM-DD), leere 0; Median über `beworben_am` → erstes Event mit `neuer_status ∈ {eingang_bestaetigt, im_gespraech, abgeschlossen}` nach dem Datum.

- [ ] **Step 1: Failing tests**, exakte Werte:
  - `gehaltText({angebot_fix:" "}, {gehalt:{min:70000,max:85000,waehrung:"EUR",zeitraum:"Jahr"}})` → `"70.000–85.000 € / Jahr"`; `{min:5000,max:null,waehrung:"CHF",zeitraum:"Monat"}` → `"5.000 CHF / Monat"`; `{gehalt_wunsch:"80k"}` → `"80k"`; alles leer → `null`
  - `tageSeit([{datum:"2026-11-01T10:00:00Z"}],"2026-10-01T00:00:00Z","2026-11-11")` → 10; ohne Events → 41
  - `naechsterTermin([{datum:"2026-11-10",text:"a"},{datum:"2026-11-12T09:00:00Z",text:"b"}],"2026-11-11")` → `{datum:"2026-11-12T09:00:00Z",text:"b"}`
  - `wochenListe`: ein überfälliger Schritt (2026-11-09) ⇒ `ueberfaellig:true`; ein Interview am 2026-11-09 ⇒ nicht enthalten; Interview 2026-11-15T10:00 ⇒ `zeit:"10:00"`; Aufgabe 2026-11-19 ⇒ nicht enthalten (> +7); `abgeschlossen` ⇒ nicht enthalten
  - `kennzahlen` mit 4 Bewerbungen ⇒ `zuWenig:true`, Quoten `null`; mit 5 Bewerbungen, davon 2 je `im_gespraech` erreicht (eine per Event, eine per Status) ⇒ `gespraechsquote:40`; `proWoche.length === 12`; Median: Daten 3 und 7 Tage ⇒ 5
- [ ] **Step 2:** Tests scheitern.
- [ ] **Step 3:** Umsetzen (Datum-Helfer `tagePlus`, `heuteLokal` aus `web/lib/filter.ts` wiederverwenden).
- [ ] **Step 4:** Tests grün. Commit `Tracker: Kartenfelder, Wochenliste, Kennzahlen (reine Logik)`

### Task 5: Kanban-Board mit Ziehen, Rückgängig, Archiv

**Files:**
- Create: `web/app/bewerbungen/kanban/board.tsx` (Client), `web/app/bewerbungen/kanban/karte.tsx` (Client), `web/app/bewerbungen/kanban/archiv-dialog.tsx`
- Modify: `web/app/bewerbungen/kanban/page.tsx` (Server: lädt über `ladeKarten`, übergibt Karten + `ohneSpalten`), `web/app/globals.css`, `web/app/stil/utilitaer.css` (Tokens: `--uebergang`, `--karte-schatten-hover`, Archiv-Farbe)

**Interfaces:**
- Consumes: `Karte`, `ladeKarten` (Task 2); `zugAusfuehren`, `zugRueckgaengig`, `rundeAendern`, `kommentarSpeichern` (Task 3); `STATUS`, `STATUS_LABEL`, `ERGEBNIS_LABEL`.
- Produces: `<Board karten={Karte[]} ohneSpalten={boolean} archiv={boolean} />`; Spalten `gemerkt, beworben, eingang_bestaetigt, im_gespraech, angebot` plus Ablage „Archiv“ (Droppable) und bei `archiv=true` die Spalte „Archiv“ mit Ergebnis-Abzeichen.

- [ ] **Step 1: Board.** dnd-kit `DndContext` mit `PointerSensor`, `TouchSensor`, `KeyboardSensor` (sortableKeyboardCoordinates); Spalten als `useDroppable`, Karten als `useDraggable`; `useOptimistic` für die Kartenliste; bei `onDragEnd`: Ziel „Archiv“ ⇒ Dialog (Task-Schritt 3), sonst sofort optimistisch verschieben und `zugAusfuehren(id, vonStatus, {status})` aufrufen; `{ok:false}` ⇒ zurücksetzen und `role="alert"`-Meldung; `{ok:true}` ⇒ Meldung „Verschoben nach <Label>“ mit Knopf **Rückgängig** (8 s sichtbar), der `zugRueckgaengig(id, vorher, eventIds, status)` ruft.
- [ ] **Step 2: Karte** (`karte.tsx`): Logo (`logo_url` als `<img>` 24 px mit `alt=""`, sonst Kreis mit Anfangsbuchstabe in `firmenFarbe`), Firma, Titel; Zeilen nur bei Wert: Gehalt, „seit N Tagen“, nächster Termin (`tagDe`), Sterne (`interesse`, `aria-label="Interesse 3 von 5"`); Kommentar als klickbarer Text ⇒ `<input maxLength=140>`; Enter/Blur ⇒ `kommentarSpeichern`; Abzeichen `R{runde}` nur in `im_gespraech`, daneben Knopf „+ Runde“ (`rundeAendern(id, 1)`), Klick aufs Abzeichen ⇒ Menü „Runde zurück“. Status-Auswahl `<select>` auf der Karte (Spec 15) ⇒ `onChange` ⇒ derselbe Zugweg wie Ziehen (Archiv ⇒ Dialog). Bei `ohneSpalten`: Runde, Kommentar, Logo ausblenden; Link „Bewerbung öffnen“ auf `/bewerbungen/[id]`.
- [ ] **Step 3: Archiv-Dialog** (`<dialog>` nativ): Überschrift „Ergebnis“, vier Knöpfe (Zusage, Absage, Abgebrochen, Angebot abgelehnt) und „Abbrechen“; Esc = Abbrechen; Fokus beim Öffnen auf dem ersten Knopf; Auswahl ⇒ `zugAusfuehren(id, von, {status:"abgeschlossen", ergebnis})`.
- [ ] **Step 4: Layout und Übergänge.** `.kanban` nimmt die volle Breite unter der Unternavigation (`grid-template-columns: repeat(5, minmax(220px, 1fr))`, unter 900 px `overflow-x: auto`); Übergänge über `--uebergang: 160ms ease` für Hover, Fokus, Verschieben; `@media (prefers-reduced-motion: reduce) { * { transition: none } }` im Board-Bereich. Schalter „Archiv anzeigen“ (Link, setzt `?archiv=1`).
- [ ] **Step 5:** `npm run build` grün; manueller Kurztest mit `curl` (Seite liefert 200 nach Login nicht prüfbar ⇒ Build reicht). Commit `Tracker: Kanban mit Ziehen, Rückgängig, Archiv, Runden, Kommentar`

### Task 6: Filter ohne Knopf (Stellenliste) und Sortieren

**Files:**
- Create: `web/app/stellen/filter-client.tsx` (Client-Wrapper)
- Modify: `web/app/stellen/page.tsx` (Formular ⇒ Client-Wrapper; Sortier-Auswahl; Knopf „Filtern“ entfernt; Suchfeld mit Knopf „Suchen“), `web/lib/filter.ts` (Sortierung lesen/schreiben), `web/lib/stellen.ts` (Query-Order), Test `web/tests/filter.test.ts`

**Interfaces:**
- Produces: `SORTIERUNG = ["neu", "firma", "titel", "groesse"] as const`; `leseFilter` liest `sort` (Standard `neu`, Unbekanntes ⇒ `neu`); `filterZuUrl` schreibt `sort` nur wenn ≠ `neu`; Query-Order: `neu` ⇒ `erstmals_gesehen desc, id`; `firma` ⇒ `unternehmen asc`; `titel` ⇒ `titel asc`; `groesse` ⇒ in JS nach `GROESSEN_REIHENFOLGE` (Join-Spalte, nicht sortierbar in PostgREST) – nur die geladene Seite, Hinweis im Code.
- `<FilterClient aktion="/stellen">` umschließt die Checkbox-Gruppen: `onChange` ⇒ `filterZuUrl` ⇒ `router.replace(url, { scroll:false })` in `startTransition`; `aria-busy` auf der Liste während `isPending`; Suchfeld: Submit per Enter oder Knopf „Suchen“ (kein Live-Suchen – Entscheidung: Volltextsuche ist eine DB-Abfrage, Live wäre spürbarer Mehraufwand).

- [ ] **Step 1: Failing tests:** `leseFilter({sort:"foo"}).sort === "neu"`; `filterZuUrl({...leer, sort:"firma"})` enthält `sort=firma`; `filterZuUrl({...leer, sort:"neu"})` enthält kein `sort`.
- [ ] **Step 2:** Test scheitert. **Step 3:** umsetzen. **Step 4:** Tests + Build grün. Commit `Stellenliste: Filter ohne Knopf, Sortieren, Suche mit Knopf`

### Task 7: Seitenfenster für die Bewerbung

**Files:**
- Create: `web/app/bewerbungen/@fenster/default.tsx` (gibt `null`), `web/app/bewerbungen/@fenster/(.)[id]/page.tsx` (abfangende Route), `web/app/bewerbungen/fenster.tsx` (Client: `<dialog>`, Esc/Zurück ⇒ `router.back()`)
- Modify: `web/app/bewerbungen/layout.tsx` (neu anlegen: rendert `children` und `fenster`), `web/app/bewerbungen/[id]/page.tsx` (Inhalt in eine Server-Komponente `BewerbungInhalt` auslagern, die Seite und Fenster beide nutzen), `web/app/globals.css`

**Interfaces:**
- Produces: `BewerbungInhalt({ id }: { id: string })` (Server-Komponente, gleiche Formulare wie heute). Direktaufruf/Neu laden von `/bewerbungen/[id]` zeigt die volle Seite (Standardverhalten der abfangenden Route). Karten und Tabellenzeilen verlinken weiter auf `/bewerbungen/[id]` (`<Link>`), das Fenster fängt ab.
- Fenster: `<dialog open>` rechts, 40 % Breite ab 1100 px, sonst volle Breite; Hintergrund abgedunkelt; Fokus ins Fenster; Esc ⇒ `router.back()`; Formular-Actions in der Bewerbung bleiben unverändert (sie `redirect`en auf `/bewerbungen/[id]` ⇒ Fenster bleibt offen, weil die Route gleich bleibt).

- [ ] **Step 1:** Struktur anlegen, Inhalt auslagern. **Step 2:** `npm run build` grün (abfangende Routen kompilieren). **Step 3:** Commit `Tracker: Seitenfenster für Bewerbungen (abfangende Route)`

### Task 8: Bewerbungen: Filter ohne Knopf, Archiv-Schalter, „Diese Woche“, Auswertung

**Files:**
- Create: `web/app/bewerbungen/woche.tsx` (Server: `wochenListe`, Häkchen-Form ⇒ `schrittErledigt`), `web/app/bewerbungen/auswertung/page.tsx`
- Modify: `web/app/bewerbungen/page.tsx` (Filterformular ⇒ `FilterClient` aus Task 6 wiederverwenden mit `aktion="/bewerbungen"`; Schalter „Archiv anzeigen“; Standard ohne `archiv`: Status `abgeschlossen` ausgeblendet), `web/lib/bewerbung.ts` (`leseTabelle` liest `archiv`; `tabelleZuUrl` schreibt es), `web/app/bewerbungen/unternav.tsx` (Reiter „Auswertung“; alle Reiter-Links übernehmen die aktuellen Suchparameter)

- [ ] **Step 1: Failing tests:** `leseTabelle({archiv:"1"}).archiv === true`; `leseTabelle({status:"xyz"}).status` ist `[]`; `tabelleZuUrl` behält `archiv=1`.
- [ ] **Step 2:** Test scheitert. **Step 3:** umsetzen; „Diese Woche“ als `<details open>` über der Unternavigation auf allen drei Reitern; Zeile: Datum (`tagDe`), Zeit, Firma (Link ins Fenster), Text, bei Schritt ein Häkchen-Formular; überfällig mit Klasse `.ueberfaellig` (Token `--farbe-fehler`). Auswertung: vier Kacheln (Gesprächsquote, Angebotsquote, Antwortzeit, Anzahl) und eine einfache Balkenliste „Bewerbungen pro Woche“ (12 `<li>` mit `style={{width}}`, keine Chart-Bibliothek); bei `zuWenig` Text „Noch zu wenig Daten (mindestens 5 Bewerbungen)“.
- [ ] **Step 4:** Tests + Build grün. Commit `Tracker: Filter ohne Knopf, Archiv-Schalter, Diese Woche, Auswertung`

### Task 9: Logos im Scraper

**Files:**
- Create: `scraper/logo.py`, Test `tests/test_logo.py` (Fixture: kleines HTML mit `apple-touch-icon` und `icon`)
- Modify: `scraper/run.py` (nach `sync_companies`: für Firmen ohne `logo_url` einmal `logo_url(careers_url)` holen, höchstens 1 Abruf je Firma und Lauf), `scraper/db.py` (`setze_logo(name, url)`; fehlt die Spalte ⇒ Hinweis, überspringen wie `_spalten_da`)

**Interfaces:**
- `logo_url(html: str, basis: str) -> str | None` – `<link rel="apple-touch-icon" …>` bevorzugt, sonst `rel="icon"`/`"shortcut icon"`, `href` absolut gemacht (`urljoin`), nur `http(s)`; sonst `None`.
- `hole_logo(careers_url: str) -> str | None` – lädt die Seite über `scraper.http.hole`, Fehler ⇒ `None`.

- [ ] **Step 1: Failing tests:** Fixture mit beiden Links ⇒ apple-touch-icon absolut; nur `icon` mit relativem Pfad ⇒ absolut; kein Link ⇒ `None`; `href="data:…"` ⇒ `None`.
- [ ] **Step 2:** scheitert. **Step 3:** umsetzen (`html.parser`, keine neue Abhängigkeit). **Step 4:** `py -m pytest -q` grün. Commit `Scraper: Firmen-Logo von der eigenen Website`

### Task 10: Doku

**Files:** `README.md` („Was die Website kann“: Board, Diese Woche, Auswertung, Seitenfenster, Filter ohne Knopf), `docs/STATUS.md` (Klicktest-Punkte für das Board; Nachfragen an den Nutzer: Seitenfenster und Logos), `docs/ENTSCHEIDUNGEN.md` (eine Zeile: dnd-kit, abfangende Routen, Rückgängig löscht Verlaufseinträge), `CLAUDE.md` Abschnitt 6 (Tracker-Paket als erledigt mit Datum).

- [ ] Doku anpassen, `py -m pytest -q` und `npm test` grün. Commit `Doku: Tracker-Paket`
