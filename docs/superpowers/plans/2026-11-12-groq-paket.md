# Groq-Paket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jede offene Stelle bekommt per Groq eine Zusammenfassung (Aufgaben + Muss-Anforderungen) und eine Studium-Einstufung; „Studium: nein“ wird ausgeblendet; beim Anlegen einer Bewerbung aus Text erkennt Groq Firma und Titel.

**Architecture:** Neues Python-Modul `scraper/ki.py` (Groq-Aufruf, Prüfung der Antwort, Warteschlange, Auswertung) läuft im täglichen Lauf nach dem Abrufen und schreibt über `scraper/db.py` in neue Spalten von `jobs` (Migration 009). Die Website liest die Spalte `ki` auf der Detailseite und zeigt Admins auf der Konto-Seite den Stand. Teil C ruft Groq direkt aus einer Server-Action (`web/lib/groq.ts`).

**Tech Stack:** Python 3.12 + requests + pytest; Next.js 16 (Server Actions), node:test; Supabase/PostgREST; Groq OpenAI-kompatible API.

**Spec:** `docs/superpowers/specs/2026-11-12-groq-paket-design.md`

## Global Constraints

- An Groq gehen nur Anzeigentexte (Stellen bzw. vom Nutzer eingefügter Anzeigentext), nie Namen, E-Mails, Notizen oder andere Nutzerdaten.
- Modelle: groß `openai/gpt-oss-120b`, klein `openai/gpt-oss-20b`; für Teil C zusätzlich `qwen/qwen3.8-27b` als dritte Wahl.
- Endpunkt: `https://api.groq.com/openai/v1/chat/completions`, Schlüssel aus `GROQ_API_KEY` (Scraper: `.env`/GitHub-Secret; Website: Vercel/`web/.env.local`). Fehlt der Schlüssel: Auswertung überspringen mit Hinweis, Lauf läuft weiter.
- Ein KI-Fehler darf den täglichen Lauf nie scheitern lassen (wie `snapshot_nachruesten`).
- Zusammenfassung: 3–5 Aufgaben-Stichpunkte, 0–3 Muss-Anforderungen, Sprache der Anzeige; Überschriften deutsch: „Zusammenfassung“, „Das musst du mitbringen“; fehlt sie: „Zusammenfassung folgt.“
- Nur für Angemeldete; Migration 009 gibt `anon` keine der neuen Spalten.
- „nein“ wird ausgeblendet (`sichtbar = false`), nie gelöscht.
- Jede Stelle wird höchstens einmal ausgewertet und nur neu, wenn sich `text_hash` ändert (CLAUDE.md 3.4).
- Schreiben in die Live-Datenbank (erster echter Auswertungslauf, Migration) nur nach ausdrücklichem OK des Nutzers.
- Keine neuen Python- oder npm-Pakete.
- Probe-Ergebnisse (enthalten Anzeigentexte) nur außerhalb des Repos ablegen.

## Review Focus

1. **Antwort nicht in der Sprache der Anzeige oder mit erfundenen Angaben** → kann kein Unit-Test prüfen; die Probe (Task 2) prüft jede der 20 Antworten gegen den Originaltext.
2. **Tagesgrenze mitten im Lauf** (429 mit „per day“) → großes Modell gilt als erschöpft, Gruppe 1 läuft mit dem kleinen weiter, Gruppen 2/3 warten: Test `test_auswerten_ueberlauf`.
3. **Adapter setzen `sichtbar` jeden Tag wieder auf true** → `nein_ausblenden()` läuft nach jeder Auswertung, auch ohne Schlüssel: Test `test_lauf_ohne_key_blendet_trotzdem_aus`.
4. **Kaputte oder unvollständige JSON-Antwort** → ein zweiter Versuch, danach `ki_modell = 'fehler'`, kein täglicher Neuversuch: Test `test_auswerten_ungueltig_wird_fehler`.
5. **Teil C: Nutzer hat Firma/Titel selbst geändert, bevor der Lauf nachfüllt** → Nachfüllen patcht nur, wo `firma` noch leer ist: Test `test_nachfuellen_ueberschreibt_nichts`.

---

## Teil 1: Kern und Probe (danach Halt für das „passt“ des Nutzers)

### Task 1: `scraper/ki.py` – Anleitung, Groq-Aufruf, Antwort prüfen

**Files:**
- Create: `scraper/ki_prompt.md` (System-Prompt), `scraper/ki.py`, `tests/test_ki.py`

**Interfaces:**
- Produces:
  - `GROSS = "openai/gpt-oss-120b"`, `KLEIN = "openai/gpt-oss-20b"`
  - `class Erschoepft(Exception)` (Attribut `modell`), `class GroqWeg(Exception)`, `class Ungueltig(Exception)`
  - `pruefe(roh: dict) -> dict` → `{"aufgaben": list[str], "muss": list[str], "studium": str, "taetigkeit": str, "sprache": str}`; wirft `Ungueltig`
  - `frage_groq(text: str, modell: str, post=requests.post, schlaf=time.sleep) -> dict` → geprüftes Ergebnis

- [ ] **Step 1: System-Prompt schreiben** (`scraper/ki_prompt.md`). Inhalt, sinngemäß verbindlich:
  - Rolle: fasst Stellenanzeigen sachlich zusammen, erfindet nichts.
  - `aufgaben`: 3–5 Stichpunkte zu den nicht-trivialen Aufgaben im Arbeitsalltag; nichts Banales („Präsentationen erstellen“, „mit Kunden sprechen“, „im Team arbeiten“). Wenn in der Anzeige: Befristung, Reisetätigkeit, Sicherheitsüberprüfung, Anzahl Büro-Tage, Gehalt in einen der Punkte. Nicht: Ort, Arbeitsmodell ohne Tage, Erfahrungsjahre.
  - `muss`: die bis zu 3 wichtigsten Muss-Anforderungen; keine „wünschenswert/nice to have“, **keine Sprachkenntnisse**.
  - `studium`: `ja` (Studium oder ausdrücklich gleichwertig gefordert), `nein` (Ausbildung/kein Abschluss genügt, Studium nicht erwähnt bei klar nicht-akademischer Tätigkeit), `unklar` („Studium oder Ausbildung“, keine Angabe bei akademisch wirkender Tätigkeit).
  - `taetigkeit`: `anspruchsvoll` | `einfach`.
  - `sprache`: `de` | `en` (Sprache der Anzeige); `aufgaben` und `muss` in dieser Sprache.
  - Antwort ausschließlich als JSON-Objekt mit genau diesen fünf Schlüsseln.
  - Zwei Beispiele (eine deutsche, eine englische Kurzanzeige, je mit perfekter Antwort), selbst formuliert, keine echten Anzeigen.

- [ ] **Step 2: Failing tests** in `tests/test_ki.py`:

```python
GUT = {"aufgaben": ["a", "b", "c"], "muss": ["x"], "studium": "ja", "taetigkeit": "anspruchsvoll", "sprache": "de"}

def test_pruefe_gueltig_und_trimmt():
    r = ki.pruefe({**GUT, "aufgaben": [" a ", "b", "c"]})
    assert r["aufgaben"] == ["a", "b", "c"] and r["muss"] == ["x"]

@pytest.mark.parametrize("kaputt", [
    {**GUT, "aufgaben": ["a", "b"]}, {**GUT, "aufgaben": ["a"] * 6}, {**GUT, "muss": ["x"] * 4},
    {**GUT, "studium": "vielleicht"}, {**GUT, "taetigkeit": "mittel"}, {**GUT, "sprache": "fr"},
    {**GUT, "aufgaben": ["a", "", "c"]}, {k: v for k, v in GUT.items() if k != "muss"},
])
def test_pruefe_ungueltig(kaputt):
    with pytest.raises(ki.Ungueltig):
        ki.pruefe(kaputt)

def test_frage_groq_wartet_bei_minutengrenze():  # 429 mit retry-after 2, dann 200 → ein Schlaf von 2 s
def test_frage_groq_tagesgrenze_ist_erschoepft():  # 429, Body enthält "tokens per day (TPD)" → Erschoepft, modell gesetzt
def test_frage_groq_serverfehler_ist_weg():         # 503 bzw. requests.ConnectionError → GroqWeg
def test_frage_groq_kaputtes_json_ist_ungueltig():  # 200 mit content "kein json" → Ungueltig
def test_frage_groq_schickt_nur_text():              # die gesendeten messages sind [system=Prompt, user=text], sonst nichts
```

- [ ] **Step 3: Run** `py -m pytest -q tests/test_ki.py` → Expected: FAIL (`ModuleNotFoundError: scraper.ki`).

- [ ] **Step 4: Implement** `pruefe` and `frage_groq` in `scraper/ki.py`.
  - Request-Body: `{"model", "messages": [system, user], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_completion_tokens": 1500, "reasoning_effort": "low"}`; Text vorher auf 12.000 Zeichen kürzen.
  - 429: Body enthält „per day“ → `Erschoepft(modell)`; sonst `schlaf(min(retry-after, 60))`, höchstens 5 Versuche, dann `Erschoepft`.
  - 5xx, Timeout, Verbindungsfehler → `GroqWeg`. Schlüssel aus `os.environ["GROQ_API_KEY"]` (über `db._lade_env()`).

- [ ] **Step 5: Run** `py -m pytest -q` → Expected: alle grün.

- [ ] **Step 6: Commit** `git add scraper/ki.py scraper/ki_prompt.md tests/test_ki.py` → `git commit -m "Groq: Anleitung, Aufruf und Prüfung der Antwort"`

### Task 2: Probe mit 20 Anzeigen

**Files:**
- Create: `scraper/ki_probe.py`

**Interfaces:**
- Consumes: `ki.frage_groq`, `ki.GROSS`, `db._req`
- Produces: `waehle_probe(stellen: list[dict], n: int = 20) -> list[dict]` (reine Funktion), CLI `py -m scraper.ki_probe <ausgabe.html>`

- [ ] **Step 1: Failing test** `test_waehle_probe_mischt` in `tests/test_ki.py`: aus 60 Fake-Stellen (6 Firmen, 10 englische, Titel mit „Werkstudent“, „Assistenz“, „Sales“) liefert `waehle_probe` 20 Stück, mindestens 5 Firmen, mindestens 4 englische (Heuristik: ≥ 5 × „ the “ im Text), jeder der drei Grenzfall-Titel mindestens einmal, deterministisch (gleiche Eingabe → gleiche Auswahl).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `waehle_probe`; der CLI-Teil liest offene Stellen nur lesend (`id,unternehmen,titel,url,text`), ruft `frage_groq(text, GROSS)` je Stelle und schreibt eine HTML-Tabelle (Titel mit Link, Firma, Aufgaben, Muss, Studium, Tätigkeit, Sprache, Modellname aus der Groq-Antwort (`model`), Zeitpunkt, Originaltext in `<details>`) an den übergebenen Pfad. Die Felder stammen 1:1 aus der Groq-Antwort; ungültige Antworten erscheinen als Rohtext mit Vermerk „ungültig“, statt übersprungen zu werden. Es wird nichts in die Datenbank geschrieben.
- [ ] **Step 4: Run** `py -m pytest -q` → grün. **Commit** `git add scraper/ki_probe.py tests/test_ki.py` → `"Groq: Probe mit 20 gemischten Anzeigen"`.
- [ ] **Step 5: Probe ausführen** `py -m scraper.ki_probe <scratchpad>/probe.html` und jede der 20 Antworten gegen den Originaltext prüfen: Erfundenes? Banales? Sprache? Sprachen in „muss“? Studium plausibel? Fehler markieren; bei mehr als 2 Fehlern Prompt verbessern und erneut ausführen (Ruling im Ledger).
- [ ] **Step 6: HALT.** Dem Nutzer die Übersicht zeigen; weiter erst nach „passt“. **Verbindlich (Wunsch des Nutzers):** Die Übersicht zeigt ausschließlich die **unveränderten Antworten von Groq** aus dem letzten Probelauf, so wie `ki_probe.py` sie geschrieben hat: jede Zeile mit Modellname und Zeitpunkt des Aufrufs. Claude formuliert, kürzt oder korrigiert an diesen Antworten nichts. Claudes eigene Prüfung dient nur dem Verbessern der Anleitung; wird sie gezeigt, dann getrennt und deutlich als „Claudes Prüfung“ beschriftet. Die HTML-Datei wird unverändert veröffentlicht (kein Nachbearbeiten des Inhalts).

## Teil 2: Für alle Stellen

### Task 3: Migration 009 und Datenbank-Funktionen

**Files:**
- Create: `supabase/migrations/009_ki.sql`
- Modify: `scraper/db.py`, `tests/fakedb.py`, `tests/test_db.py`

**Interfaces:**
- Produces in `scraper/db.py`:
  - `ki_spalten_da() -> bool` (wie `_spalten_da`, prüft `ki`)
  - `ki_kandidaten() -> list[dict]` (offene Stellen mit Text: `id,text_hash,ki_hash,ki_modell,erstmals_gesehen`, seitenweise)
  - `lade_text(job_id: str) -> str | None`
  - `speichere_ki(job_id: str, ergebnis: dict | None, modell: str, text_hash: str) -> None` (bei `ergebnis["studium"] == "nein"` zusätzlich `sichtbar: false`)
  - `nein_ausblenden() -> int` (ein PATCH: `studium=eq.nein&status=eq.offen&sichtbar=eq.true` → `sichtbar: false`)
  - `bewerbungen_ohne_firma() -> list[dict]` (`id,snapshot_text` wo `firma` und `titel` leer und `snapshot_text` nicht leer)
  - `setze_firma_titel(app_id: str, firma: str, titel: str) -> None` (PATCH mit `firma=is.null`)

- [ ] **Step 1: Migration** `009_ki.sql`, mehrfach ausführbar: `jobs` bekommt `ki jsonb`, `ki_hash text`, `ki_modell text`, `studium text check (studium in ('ja','nein','unklar'))`, `taetigkeit text check (taetigkeit in ('anspruchsvoll','einfach'))`. Keine Rechte für `anon` (007 vergibt Spaltenrechte einzeln, neue Spalten bleiben gesperrt). Kopfkommentar wie bei 007/008.
- [ ] **Step 2: Failing tests** in `tests/test_db.py` (FakeDB um die neuen Filter erweitern): `test_speichere_ki_nein_blendet_aus`, `test_speichere_ki_ja_bleibt_sichtbar`, `test_nein_ausblenden_nur_offene_sichtbare`, `test_nachfuellen_ueberschreibt_nichts` (Bewerbung mit inzwischen gesetzter Firma bleibt unverändert), `test_ki_spalten_fehlen_gibt_false`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** `py -m pytest -q` → grün.
- [ ] **Step 6: Commit** `git add supabase/migrations/009_ki.sql scraper/db.py tests/fakedb.py tests/test_db.py` → `"Migration 009 und DB-Funktionen für die KI-Auswertung"`

### Task 4: Warteschlange, Auswertung, täglicher Lauf

**Files:**
- Modify: `scraper/ki.py`, `scraper/run.py`, `.github/workflows/taeglich.yml`, `tests/test_ki.py`, `tests/test_run.py`

**Interfaces:**
- Consumes: Task 1 (`frage_groq`, Ausnahmen), Task 3 (db-Funktionen)
- Produces:
  - `warteschlange(zeilen: list[dict], heute: str) -> list[tuple[str, int]]` (id, Gruppe 1/2/3)
  - `auswerten(heute: str, frage=frage_groq, frist_s: int = 5400) -> dict` → `{"ausgewertet": int, "klein": int, "fehler": int, "wartend": int}`
  - `nachfuellen(frage_ft=...) -> int` (Teil C im Lauf; nutzt `firma_titel(text, modell)` aus diesem Modul, eigener kurzer Prompt: nur `{"firma","titel"}`)

- [ ] **Step 1: Failing tests:**

```python
def test_warteschlange_reihenfolge():
    h = "2026-11-12"
    z = [dict(id="alt", text_hash="1", ki_hash=None, ki_modell=None, erstmals_gesehen="2026-11-01"),
         dict(id="vorl", text_hash="2", ki_hash="2", ki_modell=ki.KLEIN, erstmals_gesehen="2026-11-11"),
         dict(id="neu", text_hash="3", ki_hash=None, ki_modell=None, erstmals_gesehen=h),
         dict(id="geaendert", text_hash="4", ki_hash="alt", ki_modell=ki.GROSS, erstmals_gesehen="2026-10-01"),
         dict(id="fertig", text_hash="5", ki_hash="5", ki_modell=ki.GROSS, erstmals_gesehen=h),
         dict(id="kaputt", text_hash="6", ki_hash="6", ki_modell="fehler", erstmals_gesehen=h)]
    assert ki.warteschlange(z, h) == [("neu", 1), ("geaendert", 1), ("vorl", 2), ("alt", 3)]
```
  (Gruppe 1 = Text nie/anders ausgewertet und `erstmals_gesehen` ≥ heute − 2 Tage **oder** schon einmal ausgewertet; Gruppe 2 = aktuell, aber `ki_modell == KLEIN`; Gruppe 3 = Rest ohne aktuelle Auswertung; innerhalb einer Gruppe neueste zuerst.)

  - `test_auswerten_ueberlauf`: großes Modell wirft nach 1 Aufruf `Erschoepft`; die übrigen Gruppe-1-Stellen laufen mit `KLEIN`, Gruppe 2/3 bleiben unberührt; Rückgabe zählt `klein` und `wartend` richtig.
  - `test_auswerten_ungueltig_wird_fehler`: zweimal `Ungueltig` → `speichere_ki(..., None, "fehler", hash)`.
  - `test_auswerten_groq_weg_stoppt`: `GroqWeg` → keine weiteren Aufrufe, kein Absturz.
  - `test_auswerten_frist`: nach Ablauf von `frist_s` (Uhr per Parameter/monkeypatch) keine weiteren Aufrufe.
  - `test_lauf_ohne_key_blendet_trotzdem_aus` (in `test_run.py`): ohne `GROQ_API_KEY` ruft `lauf` kein Groq, aber `nein_ausblenden`; `bericht["ki"]` enthält einen Hinweis.
  - `test_ki_fehler_kippt_lauf_nicht` (in `test_run.py`): Exception in `auswerten` → Lauf endet normal.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** In `run.lauf` nach `db.snapshot_nachruesten()`: wenn `db.ki_spalten_da()` → `auswerten`, `nachfuellen` (beide in try/except wie `snapshot_nachruesten`), dann immer `db.nein_ausblenden()`; Ergebnis in `bericht["ki"]`, eine Zeile in `_markdown`. Workflow: `GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}` beim Schritt `python -m scraper.run`.
- [ ] **Step 4: Run** `py -m pytest -q` → grün.
- [ ] **Step 5: Commit** `git add scraper/ki.py scraper/run.py .github/workflows/taeglich.yml tests/test_ki.py tests/test_run.py` → `"Groq-Auswertung im täglichen Lauf"`
- [ ] **Step 6: HALT für Live-Schritte:** Nutzer führt Migration 009 aus; nach seinem OK ein Lauf `py -c "from scraper import ki; print(ki.auswerten(<heute>, frist_s=300))"` gegen die Live-Datenbank (schreibt nur KI-Spalten). Danach in der DB prüfen: Stellen mit `ki`, ausgeblendete „nein“-Stellen gezählt.

### Task 5: Zusammenfassung auf der Detailseite

**Files:**
- Create: `web/lib/zusammenfassung.ts`, `web/tests/zusammenfassung.test.ts`
- Modify: `web/app/stellen/[id]/page.tsx`, `web/app/globals.css` (nur Aufbau, falls nötig)

**Interfaces:**
- Produces: `leseKi(roh: unknown) -> { aufgaben: string[]; muss: string[]; sprache: "de" | "en" } | null`

- [ ] **Step 1: Failing tests:** gültiges Objekt → Werte; `null`, String, fehlende `aufgaben`, Nicht-String-Einträge, `sprache: "fr"` → `null`.
- [ ] **Step 2: Run** `cd web && npm test` → FAIL. **Step 3: Implement** `leseKi`; auf der Detailseite (nur `nutzer`) zusätzlich `ki,ki_modell` laden und **vor** dem Steckbrief einen Abschnitt `section.karte` mit `h2` „Zusammenfassung“, `ul` der Aufgaben, `h3` „Das musst du mitbringen“ + `ol` (nur wenn `muss` nicht leer), `lang` = `sprache`. Ohne Ergebnis: „Zusammenfassung folgt.“, bei `ki_modell === "fehler"`: „Für diese Anzeige gibt es keine Zusammenfassung.“ Gäste sehen den Abschnitt nicht.
- [ ] **Step 4: Run** `npm test` und `npx tsc --noEmit` → grün.
- [ ] **Step 5: Klicktest** (webapp-testing, `localhost:3002`, Wegwerf-Konto): Stelle mit `ki` zeigt beide Überschriften und 3–5 Punkte; Stelle ohne `ki` zeigt „Zusammenfassung folgt.“; als Gast kein Abschnitt; Kontrastprüfung hell/dunkel.
- [ ] **Step 6: Commit** → `"Detailseite: KI-Zusammenfassung"`

### Task 6: Admin-Stand auf der Konto-Seite

**Files:**
- Create: `web/lib/ki-stand.ts`, `web/tests/ki-stand.test.ts`
- Modify: `web/app/konto/page.tsx`

**Interfaces:**
- Produces: `kiStand(zeilen: { text_hash: string | null; ki_hash: string | null; ki_modell: string | null }[]) -> { wartend: number; vorlaeufig: number; fehler: number }`

- [ ] **Step 1: Failing test** mit je einem Fall pro Kategorie und einer fertigen Zeile (zählt nirgends).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; auf der Konto-Seite nur bei `n.admin` per `createAdminClient()`: offene Stellen laden (`text_hash,ki_hash,ki_modell`), Abschnitt „KI-Auswertung“ mit „Noch X Anzeigen warten auf Auswertung“, „Y vorläufig (kleines Modell)“, „Z nicht auswertbar“ und einer aufklappbaren Liste „Ausgeblendet wegen Studium: nein“ (Firma, Titel, Link zur Originalanzeige).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit` → grün; Klicktest: Admin sieht den Abschnitt, Wegwerf-Konto nicht.
- [ ] **Step 5: Commit** → `"Konto: Stand der KI-Auswertung für Admins"`

### Task 7: Teil C – Firma und Titel aus eingefügtem Text

**Files:**
- Create: `web/lib/groq.ts`, `web/tests/groq.test.ts`
- Modify: `web/app/bewerbungen/actions.ts`, `web/app/bewerbungen/knoepfe.tsx`

**Interfaces:**
- Produces:
  - `erkenneFirmaTitel(text: string, holen: typeof fetch = fetch, key = process.env.GROQ_API_KEY) -> Promise<{ firma: string; titel: string } | null>` – Modelle der Reihe nach `gpt-oss-120b`, `gpt-oss-20b`, `qwen/qwen3.8-27b`; nächstes Modell bei 429; `null` bei fehlendem Schlüssel, Netzwerkfehler, 5xx oder unbrauchbarer Antwort.
  - Server-Action `firmaTitelVorschlag(text: string): Promise<{ firma: string; titel: string } | { fehler: string }>` (nur angemeldet)

- [ ] **Step 1: Failing tests:** gültige Antwort → Werte getrimmt; erstes Modell 429, zweites liefert → Wert und genau zwei Aufrufe; alle 429 → `null`; ohne Schlüssel → `null` ohne Aufruf; Antwort ohne `titel` → `null`; gesendeter Body enthält nur den Text (keine weiteren Felder aus dem Formular).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.**
  - Formular: Knopf „Firma und Titel aus Text erkennen“ unter dem Textfeld (nur aktiv mit Text) füllt die beiden Felder, sie bleiben änderbar; Hinweis am Textfeld: „Nur den Anzeigentext einfügen, keine eigenen Daten.“ Ohne Link sind Firma und Titel nicht mehr Pflicht, **wenn** Text eingefügt ist.
  - `bewerbungAusLink` ohne Link: fehlen Firma/Titel und gibt es Text → `erkenneFirmaTitel`; liefert es `null`, wird die Bewerbung trotzdem mit leerer Firma/Titel angelegt (der tägliche Lauf füllt per `nachfuellen` nach).
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit`, `npm run build` → grün.
- [ ] **Step 5: Klicktest:** Text einfügen → Knopf füllt Felder → Anlegen; ohne Schlüssel (Umgebung ohne `GROQ_API_KEY`) wird trotzdem angelegt, Karte zeigt leere Firma ohne Absturz.
- [ ] **Step 6: Commit** → `"Bewerbung: Firma und Titel aus eingefügtem Text"`

### Task 8: Abschluss

- [ ] `docs/STATUS.md`: Stand, neue Nutzer-To-dos (GitHub-Secret `GROQ_API_KEY` im Repo `jobradar`; `GROQ_API_KEY` in Vercel und `web/.env.local`; Migration 009), Checkliste (Artifact) aktualisieren.
- [ ] `/ponytail-review` über den Zweig, Befunde beheben oder begründen.
- [ ] Commit `"docs: Groq-Paket abgeschlossen"`; Hochladen nur nach „Ja, hochladen“.
