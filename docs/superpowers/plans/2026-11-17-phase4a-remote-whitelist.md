# Phase 4a: Remote weltweit und Whitelist – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Codex:** zusätzlich `AGENTS.md` lesen; Halte-Punkte (🛑) sind verbindlich.

**Goal:** Remote-Stellen ohne Länderbeschränkung bleiben im Vorfilter; der Admin kann je Firma per Häkchen festlegen, dass „Studium: nein“ dort nichts ausblendet, sofort wirksam.

**Architecture:** Vorfilter-Regel in `scraper/filter.py`. Whitelist als Spalte `companies.whitelist` (null = automatisch, true/false = Admin) plus drei SQL-Funktionen in Migration 011; der Scraper ruft `nein_ausblenden` als RPC auf (mit Rückfall auf das alte Verhalten, solange 011 fehlt), die Konto-Seite ruft `whitelist_setzen` über den Admin-Client.

**Tech Stack:** Python 3 (Scraper, pytest über `pruefe_offline`), Supabase/PostgREST, Next.js 16 Server Actions, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-17-phase4-firmen-ranglisten-design.md` (Abschnitt 4a, Festlegung 8)

## Global Constraints

- AGENTS.md gilt: keine `.env`, keine Live-DB, keine Migration einspielen, kein Push, Commit-Zeile `Agent: Codex`, Eintrag in `docs/agenten-protokoll.md`.
- Dateien einzeln mit `git add <pfad>`; nie `-A`, `.`, `-a`, `-f`.
- Keine neuen Pakete.
- Whitelist-Semantik (Q45–Q47): bei Whitelist-Firmen wird **keine** Stelle wegen `studium = 'nein'` ausgeblendet, auch `taetigkeit = 'einfach'` nicht; Häkchen wirkt sofort; Häkchen (true/false) hat Vorrang vor späteren Prestige-Listen (4d), `null` heißt „automatisch“ (bis 4d: nicht auf der Whitelist).
- Geschlossene Stellen (`status = 'geschlossen'`) werden nie wieder sichtbar gemacht.
- Aussehen nur in `web/app/stil/utilitaer.css`, Aufbau in `web/app/globals.css`.

## Review Focus

1. Migration 011 ist live noch nicht eingespielt → Nachtlauf läuft wie bisher weiter (Rückfall), Konto-Seite zeigt „Migration 011 fehlt“ statt eines Absturzes. → Tests in Task 3 und Task 4.
2. Häkchen wieder abwählen → die „nein“-Stellen der Firma verschwinden sofort wieder. → SQL-Abnahme in Task 2, Live-Prüfung im Halte-Punkt.
3. Nicht-Admin ruft die Server Action direkt auf → 404, nichts geändert. → Task 4.
4. Neue KI-Auswertung im Nachtlauf ergibt „nein“ bei einer Whitelist-Firma → Stelle bleibt sichtbar. → Task 3.
5. „Remote - USA“ mit Remote-Kennzeichen bleibt draußen, „Remote“ allein kommt rein. → Task 1.

---

### Task 1: Remote weltweit im Vorfilter (Q44)

**Files:**
- Modify: `scraper/filter.py` (Docstring Zeile 1, Regeln vor `ist_relevant`, Remote-Zweig in `ist_relevant`)
- Test: `tests/test_filter.py`

**Interfaces:**
- Produces: unveränderte Signatur `ist_relevant(titel: str, ort_text: str, remote: bool) -> tuple[bool, str]`.

**Regel (Ruling zur Spec, Festlegung 8):** wie die bestehende Europa-Regel nur mit `remote=True` (der Test `("Engineer", "Remote - Europe", False)` → Ausland bleibt gültig). Mit `remote=True` zählt zusätzlich: Ortstext enthält `worldwide`, `anywhere`, `global` oder `weltweit` (ganze Wörter, Groß/klein egal), oder der Ortstext besteht nach Entfernen von Leerzeichen, Bindestrichen, Kommas und Klammern nur aus dem Wort `remote` (ein- oder mehrfach).

- [ ] **Step 1: Failing tests** in `tests/test_filter.py`:

```python
@pytest.mark.parametrize("ort", ["Remote - Worldwide", "Anywhere", "Remote (Global)", "Weltweit", "Remote", "Remote - Remote", "remote, "])
def test_remote_weltweit_bleibt(ort):
    assert ist_relevant("Engineer", ort, True) == (True, "")


@pytest.mark.parametrize("ort,remote", [("Remote - USA", True), ("Remote - Worldwide", False), ("Remote", False), ("Remote - Canada", True)])
def test_remote_mit_land_oder_ohne_kennzeichen_raus(ort, remote):
    assert ist_relevant("Engineer", ort, remote) == (False, "Ausland")
```

- [ ] **Step 2:** `py -B -m pruefe_offline tests/test_filter.py` → die neuen Fälle mit „Worldwide/Anywhere/Global/Weltweit/Remote“ FAIL.
- [ ] **Step 3:** In `scraper/filter.py` `_WELTWEIT_RE` und `_NUR_REMOTE_RE` ergänzen und im Remote-Zweig von `ist_relevant` mit `or` an die bestehende Bedingung hängen. Docstring Zeile 1: „nur Deutschland plus Remote (Europa/EMEA/EU oder weltweit) …“.
- [ ] **Step 4:** `py -B -m pruefe_offline tests/test_filter.py` → alle PASS, danach `py -B -m pruefe_offline` → alle PASS.
- [ ] **Step 5: Commit**

```bash
git add scraper/filter.py tests/test_filter.py
git commit -m "Vorfilter: Remote weltweit zählt (Q44)" -m "Agent: Codex"
```

### Task 2: Migration 011 Whitelist

**Files:**
- Create: `supabase/migrations/011_whitelist.sql`
- Create: `tests/sql/whitelist.sql` (Abnahme mit künstlichen Daten in einer Transaktion mit `rollback`, Muster `tests/sql/rankings.sql`; wird erst bei der späteren SQL-Abnahme ausgeführt)

**Interfaces:**
- Produces:
  - Spalte `public.companies.whitelist boolean` (nullable, kein Default)
  - `public.whitelist_wirksam(p_firma text) returns boolean` – `language sql stable`, Ergebnis `coalesce(companies.whitelist, false)`; unbekannte Firma → `false`. (4d erweitert diese Funktion um Prestige-Listen; deshalb der eigene Name.)
  - `public.nein_ausblenden() returns integer` – setzt `jobs.sichtbar = false` für `studium = 'nein' and status = 'offen' and sichtbar and not whitelist_wirksam(unternehmen)`; gibt die Anzahl zurück.
  - `public.whitelist_setzen(p_firma text, p_wert boolean) returns integer` – setzt `companies.whitelist = p_wert`; unbekannte Firma → `raise exception 'Firma unbekannt'`; danach, wenn `whitelist_wirksam(p_firma)`: `sichtbar = true` für deren Stellen mit `studium = 'nein' and status = 'offen' and not sichtbar`, sonst `sichtbar = false` für deren Stellen mit `studium = 'nein' and status = 'offen' and sichtbar`; gibt die Anzahl geänderter Stellen zurück. Alles in einer Funktion = eine Transaktion.
  - Rechte für alle drei Funktionen: `revoke execute … from public, anon, authenticated; grant execute … to service_role;` (Muster `005_abschnitte_land.sql` Zeile 90–91). Keine `security definer`.

- [ ] **Step 1:** Kopfkommentar wie in `010_rankings.sql` („Nur als Datei vorbereitet. Später vom Nutzer im Supabase SQL Editor ausführen. Mehrfach ausführbar.“), dann `add column if not exists` und `create or replace function`.
- [ ] **Step 2:** `tests/sql/whitelist.sql` mit künstlicher Firma `Testfirma Whitelist` und vier Stellen (`nein`/offen/sichtbar, `nein`/offen/unsichtbar, `nein`/geschlossen/unsichtbar, `ja`/offen/sichtbar). Prüfungen per `do $$ … assert … $$`: `whitelist_setzen(…, true)` gibt 1 zurück und macht genau die offene „nein“-Stelle sichtbar, die geschlossene bleibt unsichtbar; `nein_ausblenden()` ändert danach nichts an der Firma; `whitelist_setzen(…, false)` gibt 2 zurück (beide offenen „nein“-Stellen wieder unsichtbar); `whitelist_setzen('Gibt es nicht', true)` wirft „Firma unbekannt“. Am Ende `rollback`.
- [ ] **Step 3:** `py -B -m pruefe_offline` → alle PASS (u. a. vorhandene SQL-Textprüfungen in `tests/test_sql_pruefung.py`, falls sie Migrationen einlesen).
- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_whitelist.sql tests/sql/whitelist.sql
git commit -m "Migration 011: Whitelist für Stellen ohne Studium (Q45–Q47)" -m "Agent: Codex"
```

### Task 3: Scraper nutzt die Whitelist

**Files:**
- Modify: `scraper/db.py` (`speichere_ki`, `nein_ausblenden`)
- Modify: `scraper/run.py` (`_ki`)
- Modify: `tests/fakedb.py` (RPC `rpc/nein_ausblenden`, Schalter `ohne_whitelist`)
- Test: `tests/test_db.py`, `tests/test_run.py`

**Interfaces:**
- Consumes: SQL-Funktion `nein_ausblenden()` aus Task 2.
- Produces: `db.nein_ausblenden() -> int` (gleiche Signatur wie bisher).

- [ ] **Step 1: Failing tests**
  - `test_db.py::test_nein_ausblenden_ruft_rpc`: FakeDB beantwortet `POST rpc/nein_ausblenden` mit `2` → `db.nein_ausblenden() == 2`, und es gab **keinen** PATCH auf `jobs`.
  - `test_db.py::test_nein_ausblenden_rueckfall_ohne_migration`: `fake.ohne_whitelist = True` (RPC wirft `RuntimeError("Supabase POST rpc/nein_ausblenden: 404 {\"code\":\"PGRST202\"}")`) → bisheriges Verhalten; die vorhandenen Erwartungen aus `test_nein_ausblenden_nur_offene_sichtbare` gelten in diesem Modus unverändert (Test entsprechend auf `ohne_whitelist = True` umstellen).
  - `test_db.py::test_speichere_ki_blendet_nicht_selbst_aus`: `speichere_ki(id, {…, "studium": "nein", "taetigkeit": "einfach"}, …)` → im PATCH steht kein `sichtbar`; `studium == "nein"` wird gespeichert.
  - `test_run.py::test_ki_blendet_vor_und_nach_der_auswertung_aus`: mit gesetztem `GROQ_API_KEY` und gemockten `ki.auswerten`/`ki.nachfuellen` ist die Reihenfolge `["aus", "auswerten", "nachfuellen", "aus"]` (Muster vorhandener Test Zeile ~163).
- [ ] **Step 2:** `py -B -m pruefe_offline tests/test_db.py tests/test_run.py` → die neuen Tests FAIL.
- [ ] **Step 3:** `nein_ausblenden()` ruft `_req("POST", "rpc/nein_ausblenden", json={})` und gibt die Zahl zurück; bei `RuntimeError` mit `": 404 "` oder `"PGRST202"` einmal `print("Hinweis: nein_ausblenden fehlt (Migration 011 offen), alte Regel ohne Whitelist.")` und der bisherige PATCH (Muster `snapshot_nachruesten`). `speichere_ki` setzt `sichtbar` nicht mehr. In `run._ki` nach `nachfuellen` einen zweiten Schritt `("ausblenden", …)` anhängen, der das Ergebnis zu `erg["ausgeblendet"]` addiert. Vorher `grep -rn "sichtbar" scraper/` und sicherstellen, dass keine weitere Stelle „nein“ selbst ausblendet.
- [ ] **Step 4:** `py -B -m pruefe_offline` → alle PASS.
- [ ] **Step 5: Commit**

```bash
git add scraper/db.py scraper/run.py tests/fakedb.py tests/test_db.py tests/test_run.py
git commit -m "Nachtlauf: Ausblenden über nein_ausblenden mit Whitelist, Rückfall ohne Migration 011" -m "Agent: Codex"
```

### Task 4: Häkchen auf der Konto-Seite (nur Admin)

**Files:**
- Create: `web/lib/whitelist.ts`
- Test: `web/tests/whitelist.test.ts`
- Modify: `web/app/konto/actions.ts`, `web/app/konto/page.tsx`, ggf. `web/app/stil/utilitaer.css`

**Interfaces:**
- Consumes: SQL-Funktion `whitelist_setzen(p_firma, p_wert)` aus Task 2; `aktuellerNutzer()` (`@/lib/nutzer`, Feld `admin`), `createAdminClient()` (`@/lib/supabase/admin`).
- Produces: `whitelistEingabe(firma: unknown, wert: unknown): { firma: string; wert: boolean } | null` in `web/lib/whitelist.ts`; Server Action `whitelistSetzen(formData: FormData): Promise<void>` in `web/app/konto/actions.ts`.

- [ ] **Step 1: Failing test** `web/tests/whitelist.test.ts`:
  - `whitelistEingabe("Helsing", "an")` → `{ firma: "Helsing", wert: true }`; `("Helsing", "aus")` → `{ …, wert: false }`
  - `("", "an")`, `("x".repeat(201), "an")`, `(null, "an")`, `("Helsing", "vielleicht")` → `null`
  - Firmenname wird nicht verändert außer Trimmen: `(" A&B, \"C\" ", "an")` → `firma: "A&B, \"C\""`.
- [ ] **Step 2:** `cd web && npm test` → FAIL (Modul fehlt).
- [ ] **Step 3:** `whitelistEingabe` implementieren (1–200 Zeichen nach Trimmen, `wert` nur `"an"`/`"aus"`). Server Action `whitelistSetzen`: `aktuellerNutzer()`; kein Admin → `notFound()`; Eingabe ungültig → `zurueck("Ungültige Eingabe.")`; `createAdminClient().rpc("whitelist_setzen", { p_firma, p_wert })`; Fehler mit Code `PGRST202` → `zurueck("Migration 011 fehlt: bitte im Supabase SQL Editor einspielen.")`, anderer Fehler → `console.error` und `zurueck("Speichern fehlgeschlagen.")`; Erfolg → `revalidatePath("/konto")` und `redirect("/konto#whitelist")`.
- [ ] **Step 4:** In `page.tsx` nur für `n.admin` einen Abschnitt `id="whitelist"` vor „Konto löschen“: Überschrift „Stellen ohne Studium trotzdem zeigen“, ein Satz Erklärung („Bei angehakten Firmen blendet jobradar keine Stelle wegen ‚Studium: nein‘ aus.“), dann je Firma (`createAdminClient().from("companies").select("name, whitelist").order("name")`) eine Zeile mit Name und einem Formular-Knopf „an“/„aus“ (versteckte Felder `firma`, `wert`), Zustand sichtbar als Häkchen ☑/☐ für `whitelist === true`. Fehlt die Spalte (Fehler beim Lesen), statt der Liste der Hinweis „Migration 011 fehlt“.
- [ ] **Step 5:** `cd web && npm test && npx tsc --noEmit && npm run build` → alles grün.
- [ ] **Step 6: Commit**

```bash
git add web/lib/whitelist.ts web/tests/whitelist.test.ts web/app/konto/actions.ts web/app/konto/page.tsx web/app/stil/utilitaer.css
git commit -m "Konto: Whitelist-Häkchen für den Admin (Q46)" -m "Agent: Codex"
```

### Task 5: Doku und Übergabe

**Files:** `docs/STATUS.md`, `docs/ENTSCHEIDUNGEN.md` (Ruling Remote nur mit Kennzeichen), `docs/agenten-protokoll.md`, dieser Plan (Häkchen setzen).

- [ ] **Step 1:** STATUS: „4a gebaut, Migration 011 offen (Nutzer)“; Nutzer-To-do „Migration 011 im Supabase SQL Editor einspielen“ mit Was/Warum/Woran-erkennen.
- [ ] **Step 2:** Agentenprotokoll-Eintrag nach Vorlage; Commit `docs: 4a übergeben` mit `Agent: Codex`.

🛑 **Halte-Punkt (nicht Codex):**
1. Nutzer spielt `011_whitelist.sql` im Supabase SQL Editor ein.
2. Claude prüft live: Häkchen bei einer Firma mit „nein“-Stelle an → Stelle in der Stellenliste sichtbar; aus → wieder weg; nächster Nachtlauf zeigt keinen Hinweis „Migration 011 offen“.
3. Hochladen erst nach „Ja, hochladen“.
