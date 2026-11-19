# Bewerbungsformular neu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Bewerbung zeigt Kästen nach Status, Stellendaten bei bekannter Stelle als Text mit ✎, ohne „Portal-Hinweis“ und „Vergleich aktuelles Gehalt“.

**Architecture:** Eine reine Funktion `sichtbareKaesten` entscheidet, welche Kästen `web/app/bewerbung/[id]/inhalt.tsx` rendert; Migration 025 rettet die Inhalte der zwei Spalten in `notizen` und löscht die Spalten.

**Tech Stack:** Next.js 16, Supabase, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-19-bewerbungsformular-design.md`

## Global Constraints

- Erst nach Nr. 0 (Runde 1) und Nr. 11a (Bewerben-Helfer); deren Kästen (Anschreiben, Anlagen, „Bewerbung vorbereiten“, Nachfrage-Leiste) werden nur einsortiert, nicht verändert.
- Codex nach `AGENTS.md` (kein `.env`, keine Live-DB, kein Push, Migration nicht einspielen, Protokoll, `Agent: Codex`).
- Status-Reihenfolge: `gemerkt` < `beworben` < `im_gespraech` < `angebot` < `abgeschlossen`.
- Texte wörtlich: „Alle Felder zeigen“ / „Weniger Felder zeigen“; Präfixe in Notizen „Portal-Hinweis: “ und „Vergleich aktuelles Gehalt: “.
- Kanban, Liste, Auswertung unverändert (Kanban-Animationen nie anfassen).

## Review Focus

1. Bewerbung springt von `gemerkt` direkt auf `abgeschlossen` → Ergebnis sichtbar, „Bewerbung“-Kasten nur wenn gefüllt (Test Task 1).
2. Hand-Bewerbung ohne Stelle (`job_id` leer) → Stellendaten als Eingabefelder (Test Task 2).
3. `notizen` schon gefüllt und `portal_hinweis` gefüllt → Text wird mit Leerzeile angehängt, nichts überschrieben (Test Task 3).
4. Altes Backup (mit den zwei Spalten) wiederherstellen → Anleitung nennt, dass diese Spalten vorher anzulegen oder aus der Sicherung zu entfernen sind (Task 3, README).
5. Status zurück von `angebot` auf `beworben` mit gefüllten Angebotsfeldern → Angebotskasten bleibt sichtbar (Test Task 1).

---

### Task 1: `sichtbareKaesten`

**Files:** Create `web/lib/kaesten.ts`; Test `web/tests/kaesten.test.ts`

**Interfaces — Produces:** `type Kasten = "kopf"|"ablauf"|"vorbereiten"|"einschaetzung"|"kontakte"|"bewerbung"|"interviews"|"angebot"|"ergebnis"|"verlauf"`; `sichtbareKaesten(status: string, ergebnis: string | null, zeile: Record<string, unknown>, alle: boolean, anzahl: { kontakte: number; interviews: number; anlagen: number }): Kasten[]` (Reihenfolge wie im Design); `ergebnisFelder(ergebnis: string | null): string[]` → `absage` → `["ergebnis","absagegrund","feedback"]`, `zurueckgezogen` → `["ergebnis","rueckzug_grund"]`, sonst `["ergebnis","feedback"]`.

- [ ] Step 1: Failing tests:
```ts
sichtbareKaesten("gemerkt", null, {}, false, {kontakte:0,interviews:0,anlagen:0}) → ["kopf","ablauf","vorbereiten","einschaetzung","kontakte","verlauf"]
sichtbareKaesten("beworben", …) enthält "bewerbung", nicht "vorbereiten", nicht "interviews"
sichtbareKaesten("im_gespraech", …) enthält "interviews", nicht "angebot"
sichtbareKaesten("angebot", …) enthält "angebot"; sichtbareKaesten("abgeschlossen", …) enthält "ergebnis"
sichtbareKaesten("gemerkt", null, {angebot_fix: 80000}, false, …) enthält "angebot"            // gefüllt bleibt sichtbar
sichtbareKaesten("beworben", null, {angebot_fix: 80000}, false, …) enthält "angebot"           // Review Focus 5
sichtbareKaesten("gemerkt", null, {}, false, {interviews:1,…}) enthält "interviews"
sichtbareKaesten("abgeschlossen", "absage", {}, false, …) enthält "ergebnis", nicht "bewerbung"  // Review Focus 1
sichtbareKaesten("gemerkt", null, {}, true, …).length === 10   // „Alle Felder zeigen“
ergebnisFelder("absage"), ergebnisFelder("zurueckgezogen"), ergebnisFelder("zusage") wie oben
```
- [ ] Step 2: FAIL → Step 3: implementieren (Feldlisten je Kasten aus `FELDER` in `web/lib/bewerbung.ts`) → Step 4: PASS → Step 5: Commit `Bewerbung: Kästen nach Status`.

### Task 2: Ansicht umbauen

**Files:** Modify `web/app/bewerbung/[id]/inhalt.tsx`; Create `web/app/bewerbung/[id]/stellenkopf.tsx`; Test `web/tests/bewerbung.test.ts`
- [ ] Step 1: Failing test für die reine Hilfsfunktion `stelleAlsText(zeile: { job_id: string | null }): boolean` (in `web/lib/kaesten.ts`): `job_id` gesetzt → true, leer → false (Review Focus 2).
- [ ] Step 2: FAIL → Step 3: `inhalt.tsx` rendert nur Kästen aus `sichtbareKaesten`; Umschalter „Alle Felder zeigen“/„Weniger Felder zeigen“ (Client-Zustand, nicht gespeichert); `stellenkopf.tsx`: bei `stelleAlsText` Titel · Firma, Standort · Präsenzmodell · Gehalt laut Anzeige, Link „Karriereseite ↗“ und ✎, der die bisherigen Eingabefelder des Stelle-Kastens aufklappt; sonst direkt die Eingabefelder. Ergebnis-Kasten zeigt nur `ergebnisFelder(ergebnis)`.
- [ ] Step 4: `npm test`, `npm run build` grün → Step 5: Commit `Bewerbung: Stellenkopf als Text, Kästen nach Status`.

### Task 3: Zwei Felder streichen (Migration 025)

**Files:** Create `supabase/migrations/025_felder_streichen.sql`; Modify `web/lib/bewerbung.ts`, `web/lib/export.ts`, `web/lib/schalter.ts`, `web/app/bewerbung/[id]/inhalt.tsx`, `README.md` (Abschnitt Wiederherstellen); Test `web/tests/formular-migration.test.ts`, bestehende Tests anpassen
- [ ] Step 1: Failing test liest die SQL-Datei: zuerst `update public.applications set notizen = …` mit `concat_ws(E'\n\n', nullif(notizen,''), 'Portal-Hinweis: ' || portal_hinweis)` (nur `where portal_hinweis is not null and portal_hinweis <> ''`), dasselbe für `gehalt_aktuell_vergleich` mit „Vergleich aktuelles Gehalt: “; danach `alter table public.applications drop column if exists portal_hinweis`, `… gehalt_aktuell_vergleich`; alles in einer Transaktion (`begin;` … `commit;`); wiederholbar (zweiter Lauf ändert nichts, weil die Spalten fehlen → Updates in `do $$ … if exists (select 1 from information_schema.columns …) … $$`). Zusätzlich: `grep` über `web/` findet keine der zwei Feldnamen mehr außer in der Migration.
- [ ] Step 2: FAIL → Step 3: Migration; Felder aus `FELDER`, Export und `schalter.ts` entfernen; README: „Sicherungen vor Migration 025 enthalten `portal_hinweis` und `gehalt_aktuell_vergleich`; vor dem Einspielen die zwei Spalten wieder anlegen oder die Spalten aus der Sicherung entfernen.“ (Review Focus 4).
- [ ] Step 4: `npm test` grün → Step 5: Commit `Felder Portal-Hinweis und Vergleich aktuelles Gehalt entfernt (Inhalte in Notizen)`.

### Task 4: Doku und Halt

- [ ] `docs/STATUS.md`, `docs/agenten-protokoll.md`, `docs/codex-warteschlange.md` (🛑); `npm test`, `npm run build`, `npm run pruefe:build` grün; Commit `Bewerbungsformular: Doku`.
- [ ] 🛑 Halt: Nutzer spielt Migration 025 ein (unumkehrbar: die zwei Spalten werden gelöscht, Inhalte stehen dann in den Notizen). Claude prüft vorher mit dem Nutzer, dass das tägliche Backup der Nacht davor vorhanden ist, danach live: Notizen einer Bewerbung mit altem Portal-Hinweis enthalten den Text; Klicktest gemerkt → beworben → angebot mit Wegwerf-Konto.
