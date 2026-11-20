# Sprachniveau Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag kommt über `docs/codex-warteschlange.md` (AGENTS.md Abschnitt 0).

**Goal:** Jede Stelle bekommt ohne KI ein erkanntes Deutschniveau; Nutzer sehen es in „Das bringst du mit“ (abschaltbar) und filtern die Stellenliste nach „Mein Deutschniveau“.

**Architecture:** Der getestete Prototyp wird zu `scraper/sprachniveau.py`; der Steckbrief speichert das Ergebnis unter `steckbrief.deutsch`, dazu eine Zahlenspalte `jobs.deutsch_stufe` für den Filter in der Datenbank. Bestehende Stellen rüstet der Nachtlauf nach. Die Web-Seite liest Einstellung und Niveau aus einer neuen Tabelle `sprach_einstellung`.

**Tech Stack:** Python 3 (pytest), Next.js 16 / TypeScript (node:test), Supabase/PostgREST, SQL-Migration.

**Stand 2026-11-20:** Tasks 1–6 von Claude gebaut (statt Codex); wartet auf Migration 013 und die Live-Messung (Halte-Punkt Task 6).

**Spec:** `docs/superpowers/specs/2026-11-18-sprachniveau-design.md` (verbindliche Referenz für die Erkennung: `docs/superpowers/specs/2026-11-18-sprachniveau-prototyp.py`)

## Global Constraints

- Keine KI für die Erkennung; Groq-Prompt, Probe und `ki.streiche` bleiben unverändert.
- Stufen: `A1 < A2 < B1 < B2 < C1 < C2 < Muttersprache` (Rang 1–7).
- Wortlaute (exakt): `Deutsch C1`, `Deutsch ≈ C1` (geschätzt), `Deutsch von Vorteil`, `Deutsch von Vorteil (B2–C1)`, `Deutsch: Niveau nicht angegeben`. Bei Status `keins` wird nichts angezeigt.
- Standard der Einstellung „Sprachkenntnisse in ‚Das bringst du mit‘ zeigen“: aus für den Admin (`nutzer.admin`), an für alle anderen, solange der Nutzer nichts gespeichert hat.
- Filter zeigt: verlangte Stufe ≤ gewählte Stufe, plus Status `keins`, `vorteil`, `ohne_niveau`, plus noch nicht nachgerüstete Stellen.
- Migration nur als Datei (`supabase/migrations/013_sprachniveau.sql`); der Nutzer spielt sie ein. Ohne Migration darf nichts kaputtgehen (Fehlercodes `42703`, `42P01`, `PGRST205`, `PGRST204` → altes Verhalten).
- Regex nur mit Edit/Write-Werkzeug einfügen, nie über Shell-Heredoc (`\b` wird sonst zum Steuerzeichen).
- Repo öffentlich: Testsätze nur aus dem Prototyp, keine Firmen- oder Personendaten dazuerfinden.

## Review Focus

1. Migration 013 fehlt noch, Website läuft schon: Stellenliste, Detailseite und Konto müssen ohne Fehlerseite laufen (Test in Task 4 und 5).
2. Stelle ohne `steckbrief.deutsch` (noch nicht nachgerüstet) bei aktivem Filter: bleibt sichtbar, kein Hinweis (Test in Task 4).
3. Ranglisten-Filter (`ranking_stellen`) zusammen mit Deutsch-Filter: Spalte muss dort auch vorhanden sein (Migration Task 2, Test Task 4).
4. Admin ohne gespeicherte Einstellung sieht keine Sprachzeile; Testerin ohne gespeicherte Einstellung sieht sie (Test Task 5).
5. Vorteil-Satz mit Stufe („German at B2 to C1 is a strong plus“) darf nie als Pflicht gelten (Test Task 1).

---

### Task 1: Erkennung als Modul

**Files:**
- Create: `scraper/sprachniveau.py`
- Modify: `scraper/steckbrief.py` (`_sprachen`, `steckbrief`)
- Test: `tests/test_sprachniveau.py`, `tests/test_steckbrief.py`

**Interfaces:**
- Produces: `deutsch(text: str, englisch: bool = False) -> dict` mit `{"status": "pflicht"|"vorteil"|"ohne_niveau"|"keins", "stufe": str|None, "geschaetzt": bool}`; `STUFEN: list[str]`; `rang(ergebnis: dict) -> int|None` (1–7 nur bei `pflicht`, sonst `None`); `englisch(text: str) -> bool` (Regel aus `ki_probe._englisch`: mindestens 5× `" the "`).
- `steckbrief(abschnitte, text)` liefert zusätzlich den Schlüssel `"deutsch"` (Ergebnis von `deutsch(t, englisch(t))`).

- [ ] **Step 1: Tests schreiben.** Alle 39 `FAELLE` aus dem Prototyp als `pytest.mark.parametrize` übernehmen (Erwartung über dieselbe Kurzform wie `kurz()` im Prototyp). Zusätzlich:

```python
def test_vorteil_mit_stufenbereich():
    assert deutsch("German at B2 to C1 is a strong plus.", True) == {"status": "vorteil", "stufe": "B2–C1", "geschaetzt": False}

def test_vorteil_mit_einer_stufe():
    assert deutsch("German (B2) is a plus.", True)["stufe"] == "B2"

def test_rang():
    assert rang({"status": "pflicht", "stufe": "C1", "geschaetzt": True}) == 5
    assert rang({"status": "vorteil", "stufe": "B2", "geschaetzt": False}) is None

def test_steckbrief_enthaelt_deutsch():  # in tests/test_steckbrief.py
    s = steckbrief([], "Sehr gute Deutschkenntnisse und gute Englischkenntnisse")
    assert s["deutsch"] == {"status": "pflicht", "stufe": "C1", "geschaetzt": True}
    assert {"sprache": "Deutsch", "niveau": "≈ C1"} in s["sprachen"]
```

- [ ] **Step 2:** `py -m pytest -q tests/test_sprachniveau.py tests/test_steckbrief.py` → FAIL (Modul fehlt).
- [ ] **Step 3: Umsetzen.** Prototyp-Logik unverändert übernehmen (Datei mit Edit/Write anlegen, nicht kopieren per Shell). Ergänzung für „Vorteil“: Befunde mit `vorteil` merken alle echten Stufen ihres Satzteils; Ergebnis-`stufe` = einzelne Stufe oder `min–max` (Gedankenstrich `–`). In `steckbrief.py`: „Deutsch“ aus `_SPRACHEN` entfernen; bei `pflicht` stattdessen `{"sprache": "Deutsch", "niveau": stufe}` bzw. `"≈ " + stufe` vorne in `sprachen` einfügen (damit Kurzzeile und Detail nicht widersprechen).
- [ ] **Step 4:** `py -m pytest -q` → alles grün (bestehende Steckbrief-Tests ggf. auf neue Deutsch-Herkunft anpassen, Abweichung im Protokoll begründen).
- [ ] **Step 5: Commit** `git add scraper/sprachniveau.py scraper/steckbrief.py tests/test_sprachniveau.py tests/test_steckbrief.py` — „Sprachniveau: Deutsch-Erkennung aus Prototyp“ + `Agent: Codex`.

### Task 2: Migration 013

**Files:**
- Create: `supabase/migrations/013_sprachniveau.sql`
- Test: `tests/sql/` nach vorhandenem Muster (siehe `tests/test_sql_pruefung.py`)

**Interfaces:**
- Produces: Spalte `public.jobs.deutsch_stufe smallint null check (deutsch_stufe between 1 and 7)` mit Index; Tabelle `public.sprach_einstellung (owner_id uuid primary key default auth.uid() references auth.users on delete cascade, zeigen boolean null, niveau text null check (niveau in ('A1','A2','B1','B2','C1','C2','Muttersprache')))` mit RLS und Rechten genau wie `listen_felder` (005, Zeilen 96–108); `ranking_stellen(p_listen text[])` liefert zusätzlich Spalte `deutsch_stufe smallint`.

- [ ] **Step 1:** Prüftest ergänzen, der die Datei durch die vorhandene SQL-Prüfung schickt und prüft: `drop function if exists public.ranking_stellen(text[])` vor dem Neuanlegen (Rückgabetyp ändert sich), `revoke … from public, anon, authenticated` und `grant execute … to authenticated, service_role` danach wie in 010, Tabelle hat `enable row level security`.
- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Datei schreiben. `ranking_stellen` aus `010_rankings.sql` Zeile 129ff. übernehmen und nur die neue Spalte durchreichen. Idempotent (`if not exists`, `drop policy if exists`).
- [ ] **Step 4:** `py -m pytest -q` → grün.
- [ ] **Step 5: Commit** — „Migration 013: Deutschniveau-Spalte und Spracheinstellung“ + `Agent: Codex`.

### Task 3: Scraper schreibt und rüstet nach

**Files:**
- Modify: `scraper/db.py` (Schreiben in `schreibe`, Spaltenprüfung wie `ki_spalten_da`), `scraper/run.py`
- Test: `tests/test_db.py`, `tests/test_run.py` (mit `tests/fakedb.py`)

**Interfaces:**
- Consumes: `deutsch`, `englisch`, `rang` (Task 1).
- Produces: `db.deutsch_spalte_da() -> bool` (einmal pro Lauf, 400/`42703` → `False`, Hinweis drucken); `db.stellen_ohne_deutsch(limit: int = 2000) -> list[dict]` (offene Stellen mit `steckbrief->deutsch is null`, Felder `id,text,abschnitte,steckbrief`); `db.setze_deutsch(id: str, steckbrief: dict, stufe: int|None) -> None`; `run._deutsch_nachruesten() -> int` (Anzahl).

- [ ] **Step 1: Tests.** (a) `schreibe` setzt `deutsch_stufe = rang(steckbrief["deutsch"])`, wenn die Spalte da ist, und lässt sie weg, wenn nicht. (b) `_deutsch_nachruesten` mit Fake-DB: zwei alte Stellen ohne `deutsch` → beide bekommen `steckbrief.deutsch` (übrige Steckbrief-Schlüssel bleiben erhalten) und passende Stufe; Rückgabe 2. (c) Fehlt die Spalte → Rückgabe 0, kein Schreibversuch.
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Umsetzen. `_deutsch_nachruesten` läuft im Nachtlauf nach dem Firmen-Abruf und vor den KI-Schritten; ein Fehler darf den Lauf nicht kippen (wie Steckbrief: Hinweis drucken, weiter). Ausgabe in den Bericht: „Deutschniveau nachgerüstet: N“.
- [ ] **Step 4:** `py -m pytest -q` → grün.
- [ ] **Step 5: Commit** — „Sprachniveau: Scraper schreibt und rüstet nach“ + `Agent: Codex`.

### Task 4: Filter „Mein Deutschniveau“

**Files:**
- Create: `web/lib/sprachniveau.ts`
- Modify: `web/lib/filter.ts` (Filter-Typ, `leseFilter`, `filterZuUrl`), `web/lib/stellen.ts`, `web/app/stellen/page.tsx`, `web/app/stellen/filterblock.tsx` bzw. Filterbereich in `page.tsx`, `web/lib/stellendaten.ts` (`leseSteckbrief` liest `deutsch`)
- Test: `web/tests/sprachniveau.test.ts`, `web/tests/filter.test.ts`, `web/tests/stellen.test.ts`

**Interfaces:**
- Produces in `web/lib/sprachniveau.ts`: `STUFEN` (wie Python); `type Deutsch = { status: "pflicht"|"vorteil"|"ohne_niveau"|"keins"; stufe: string|null; geschaetzt: boolean }`; `leseDeutsch(roh: unknown): Deutsch|null`; `deutschText(d: Deutsch): string|null` (Wortlaute aus Global Constraints, `keins` → `null`); `stufenRang(stufe: string): number|null` (1–7).
- `Filter` bekommt `deutsch: string` (`""` = aus, sonst eine Stufe aus `STUFEN`; URL-Parameter `deutsch`; ungültige Werte → `""`). Ohne URL-Parameter gilt das gespeicherte `sprach_einstellung.niveau`; `deutsch=alle` schaltet für diesen Aufruf aus.
- `stellenAbfrage`: bei aktivem Filter `q.or(\`deutsch_stufe.is.null,deutsch_stufe.lte.${rang}\`)` — für beide Pfade (Tabelle und `ranking_stellen`).

- [ ] **Step 1: Tests.**

```ts
assert.equal(deutschText({ status: "pflicht", stufe: "C1", geschaetzt: true }), "Deutsch ≈ C1");
assert.equal(deutschText({ status: "pflicht", stufe: "B2", geschaetzt: false }), "Deutsch B2");
assert.equal(deutschText({ status: "vorteil", stufe: "B2–C1", geschaetzt: false }), "Deutsch von Vorteil (B2–C1)");
assert.equal(deutschText({ status: "vorteil", stufe: null, geschaetzt: false }), "Deutsch von Vorteil");
assert.equal(deutschText({ status: "ohne_niveau", stufe: null, geschaetzt: false }), "Deutsch: Niveau nicht angegeben");
assert.equal(deutschText({ status: "keins", stufe: null, geschaetzt: false }), null);
assert.equal(leseFilter({ deutsch: "B2" }).deutsch, "B2");
assert.equal(leseFilter({ deutsch: "X9" }).deutsch, "");
// stellen.test.ts: Abfrage-Attrappe sieht or("deutsch_stufe.is.null,deutsch_stufe.lte.4") bei deutsch "B2"
```

- [ ] **Step 2:** `cd web && npm test` → FAIL.
- [ ] **Step 3:** Umsetzen. Filterbereich: Auswahlfeld „Mein Deutschniveau“ mit „egal“ + den 7 Stufen, nur für angemeldete Nutzer. Bei aktivem Filter steht unter jeder Stelle, deren `steckbrief.deutsch` `vorteil` oder `ohne_niveau` ist, der Hinweis aus `deutschText` (Klasse `gedaempft klein`). Zähler „Filter (n aktiv)“ zählt den Deutsch-Filter mit. Fehlt die Spalte (Fehlercode `42703`/`PGRST204` aus der Abfrage), Abfrage ohne Deutsch-Filter wiederholen und Hinweis „Deutsch-Filter geht erst nach Migration 013.“ zeigen.
- [ ] **Step 4:** In `web/`: `npm test`, `npx tsc --noEmit`, `npm run build` → grün.
- [ ] **Step 5: Commit** — „Sprachniveau: Filter in der Stellenliste“ + `Agent: Codex`.

### Task 5: Anzeige und Konto-Einstellung

**Files:**
- Modify: `web/app/stellen/[id]/page.tsx` (Block „Das bringst du mit“), `web/app/konto/page.tsx`, `web/app/konto/actions.ts`
- Test: `web/tests/sprachniveau.test.ts`

**Interfaces:**
- Consumes: `leseDeutsch`, `deutschText` (Task 4).
- Produces: `sprachenZeigen(gespeichert: boolean|null|undefined, admin: boolean): boolean` (in `web/lib/sprachniveau.ts`); `sprachzeilen(steckbrief): string[]` (Deutsch-Zeile aus `deutschText`, danach übrige `sprachen` außer Deutsch als „Englisch fließend“); Server-Action `spracheSpeichern(formData)` in `web/app/konto/actions.ts` (Felder `zeigen` = Checkbox, `niveau` = Stufe oder leer; Upsert in `sprach_einstellung`, nur erlaubte Werte).

- [ ] **Step 1: Tests.**

```ts
assert.equal(sprachenZeigen(null, true), false);
assert.equal(sprachenZeigen(null, false), true);
assert.equal(sprachenZeigen(true, true), true);
assert.equal(sprachenZeigen(false, false), false);
assert.deepEqual(sprachzeilen({ deutsch: { status: "vorteil", stufe: null, geschaetzt: false }, sprachen: [{ sprache: "Englisch", niveau: "fließend" }] }),
  ["Deutsch von Vorteil", "Englisch fließend"]);
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Umsetzen. Detailseite: wenn `sprachenZeigen(...)` wahr, die `sprachzeilen` ans Ende von „Das bringst du mit“ (gleiche Liste `haken`); gibt es keine KI-Zusammenfassung, eigene kleine Liste mit derselben Überschrift. Konto: neuer Abschnitt „Sprachkenntnisse“ mit Checkbox „Sprachkenntnisse in ‚Das bringst du mit‘ zeigen“ (vorbelegt nach `sprachenZeigen`) und Auswahl „Mein Deutschniveau (Filter in der Stellenliste)“; fehlt die Tabelle, Hinweis „Geht erst nach Migration 013.“ wie bei `listen_felder`.
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit`, `npm run build` → grün; lokal `http://localhost:3002` Konto und eine Stelle ansehen (ohne Migration: keine Fehlerseite).
- [ ] **Step 5: Commit** — „Sprachniveau: Anzeige und Konto-Einstellung“ + `Agent: Codex`.

### Task 6: Doku und Halt

- [ ] `docs/STATUS.md` (Stand, Nutzer-To-do „Migration 013 einspielen“), `docs/ENTSCHEIDUNGEN.md` (Tabelle `sprach_einstellung` statt Spalten an `listen_felder`, weil `felder not null` ein Upsert nur der Spracheinstellung verhindert; Filterwahl in Konto gespeichert, URL überschreibt; bei `keins` keine Zeile), `docs/agenten-protokoll.md`, Warteschlange Status `🛑 wartet auf Nutzer/Claude`.
- [ ] Commit — „Sprachniveau: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt:** Nutzer spielt Migration 013 ein; nach dem nächsten Nachtlauf misst Claude live an 20 neuen Anzeigen (Ziel wie Spec). Nicht weiterbauen.
