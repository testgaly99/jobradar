# Pendelzeit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ÖPNV-Pendelzeit ab der eigenen Haltestelle zu jedem Büro, angezeigt an jeder Stelle und als Filter, für ganz Deutschland.

**Architecture:** Migration 026 (Standorte, Suchsperre, Start-Haltestelle, Pendelzeiten). Der tägliche Lauf (`scraper/run.py`, Workflow `taeglich.yml`) sucht fehlende Büros (`scraper/standorte.py`) und rechnet je Nutzer-Region mit RAPTOR auf einem Auszug des DELFI-Nahverkehrsfahrplans (`scraper/pendeln.py`, `scraper/raptor.py`). Die Website zeigt und filtert `pendelzeiten`.

**Tech Stack:** Python 3 (nur Standardbibliothek + `requests`, keine neue Abhängigkeit), GitHub Actions Cache, Next.js 16, Supabase, pytest, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-19-pendelzeit-design.md`

## Global Constraints

- Nach Phase 5 (Nr. 12): der Filter kommt in deren Filterleiste.
- Codex nach `AGENTS.md` (kein `.env`, keine Live-DB, kein Push, Migration nicht einspielen, Protokoll, `Agent: Codex`).
- Wohnadresse nie in einer Berechnung; Start = `pendel_start`.
- Abrufe: Nominatim höchstens 1/s, User-Agent `scraper/http.py: USER_AGENT`, Ergebnisse dauerhaft gespeichert; Impressum nur Host von `companies.careers_url`, `robots.txt`, 1/s; Wikidata wie bestehende Wikidata-Abrufe; Fahrplan höchstens 1× im Monat.
- Logs des öffentlichen Workflows nur Zahlen (Anzahl Standorte gefunden/nicht gefunden, Regionen, gerechnete Pendelzeiten, Laufzeit).
- Werte fest: Region 80 km; Ankunft Dienstag bis 9:00, frühestens Abfahrt 6:00; Fußweg Luftlinie × 1,3 bei 4,5 km/h, höchstens 15 Min. zum Büro; Umsteige-Fußweg ≤ 400 m; Gesamt > 180 Min. → unbekannt; erneute Büro-Suche nach 90 Tagen; Namensähnlichkeit ≥ 0,8.
- Texte wörtlich: „🚆 {m} Min. · {u} Umstieg(e)“, „ca. {m} Min.“, „Pendelzeit unbekannt“, „nach {Stadt}“ bei mehreren Städten, „Gerechnet für Dienstag, Ankunft bis 9:00; neue Werte ab der nächsten Nacht“, Filter „Pendelzeit höchstens“ mit 15/30/45/60/90 Min. und Häkchen „nur mit bekannter Pendelzeit“.
- Quellenangabe: „Fahrplandaten: DELFI e.V. via gtfs.de / opendata-oepnv.de, CC BY 4.0“ (wörtlich nach Task 0 anpassen) und „Kartendaten © OpenStreetMap-Mitwirkende (ODbL)“.

## Review Focus

1. Stelle in München und Garching (`staedte`) → kürzeste Zeit mit „nach Garching“ (Test Task 4).
2. Start-Haltestelle geändert → alle Pendelzeiten des Nutzers in der nächsten Nacht neu (Test Task 4).
3. Impressum nennt Hauptsitz in Berlin, Stelle in München → nicht verwendet (Test Task 3).
4. Fahrplan-Download scheitert → alter Auszug wird weiter genutzt, Lauf bricht nicht ab (Test Task 2).
5. Nutzer ohne Start-Haltestelle → kein Filter, keine Anzeige, keine Rechnung (Test Task 5).

---

### Task 0 (Claude, vor Codex): Fahrplan-Quelle prüfen

- [ ] `https://download.gtfs.de/germany/nv_free/latest.zip`: ohne Konto ladbar? Lizenz (Seite gtfs.de, NVBW-Lizenzlink) und genaue Quellenangabe hier eintragen; Größe und Gültigkeitszeitraum notieren. Verlangt die Quelle ein Konto: Nutzer fragen (CLAUDE.md 10), Plan anpassen.
- [ ] Nominatim-Nutzungsregeln und Wikidata-Abfrage (P159, P625, P6375) gegen die aktuelle offizielle Doku prüfen; Ergebnis in `docs/agenten-protokoll.md`.

### Task 1: Migration 026

**Files:** Create `supabase/migrations/026_pendelzeit.sql`; Test `web/tests/pendel-migration.test.ts`
**Interfaces — Produces:** Tabellen genau wie im Design Abschnitt 1, dazu `pendel_haltestellen(id text pk, name text, ort text, lat double precision, lon double precision)` (füllt der Nachtlauf aus dem Fahrplan, `select` für `authenticated`). `firmen_standorte`, `firmen_standort_suche`: `select` für `authenticated`, schreiben nur `service_role` und Admin (`istAdmin`-Muster aus Migration 015); `pendel_start`, `pendelzeiten`: RLS `owner_id = auth.uid()`; alle: `revoke all … from anon`.
- [ ] Step 1: Failing Regex-Test der SQL-Datei (Tabellen, Checks, Policies, revoke, kein `drop table`). Step 2: FAIL. Step 3: Migration (wiederholbar). Step 4: PASS. Step 5: Commit `Migration 026: Pendelzeit`.

### Task 2: Fahrplan-Auszug und RAPTOR

**Files:** Create `scraper/gtfs_region.py`, `scraper/raptor.py`; Tests `tests/test_gtfs_region.py`, `tests/test_raptor.py`, Fixture `tests/fixtures/gtfs_mini/` (erfundener Fahrplan: 3 Linien, 6 Haltestellen, ein Dienstag)
**Interfaces — Produces:**
- `lade_fahrplan(ziel: Path, url: str, jetzt: date) -> Path | None` — lädt nur, wenn die gespeicherte Datei älter als 30 Tage ist; bei Fehler alte Datei zurück (Review Focus 4), sonst `None`.
- `region_auszug(zip_pfad: Path, mitte: tuple[float, float], radius_km: float, tag: date) -> Fahrplan` — liest die CSV-Dateien gestreamt (`csv`, `zipfile`), behält Haltestellen im Radius und Fahrten, die an `tag` verkehren (calendar/calendar_dates).
- `Fahrplan = dataclass(haltestellen: dict[str, (name, lat, lon)], fahrten: list[list[(stop_id, ankunft_s, abfahrt_s)]], umstiege: dict[str, list[(stop_id, sek)]])`
- `fruehste_ankuenfte(fp: Fahrplan, start: str, ab_s: int, bis_s: int, max_umstiege: int = 4) -> dict[str, (ankunft_s, umstiege)]` (RAPTOR vorwärts); Pendelzeit nutzt die späteste Abfahrt, die bis 9:00 ankommt: `pendel_minuten(fp, start, ziel_stops: dict[str, fuss_s], bis_s=9*3600, ab_s=6*3600) -> (minuten, umstiege) | None` (Abfahrten von `start` rückwärts durchprobieren, je Abfahrt RAPTOR, kleinste Reisedauer).
- [ ] Step 1: Failing tests: Mini-Fahrplan direkte Fahrt 20 Min. → (20, 0); mit Umstieg → (35, 1); Ankunft nur nach 9:00 möglich → None; Haltestelle außerhalb 80 km fehlt im Auszug; Fahrt nur sonntags fehlt am Dienstag; Download-Fehler → alte Datei.
- [ ] Step 2: FAIL. Step 3: implementieren (nur Standardbibliothek). Step 4: PASS. Step 5: Commit `Pendelzeit: Fahrplan-Auszug und RAPTOR`.

### Task 3: Büro finden

**Files:** Create `scraper/standorte.py`; Test `tests/test_standorte.py` mit gespeicherten Antworten (`tests/fixtures/standorte/`: Nominatim-JSON, Impressum-HTML, Wikidata-JSON)
**Interfaces — Produces:** `adresse_aus_anzeige(job: dict) -> str | None`; `suche_osm(firma: str, stadt: str, hole) -> Standort | None`; `suche_impressum(careers_url: str, stadt: str, hole) -> Standort | None`; `suche_wikidata(firma: str, stadt: str, hole) -> Standort | None`; `finde_buero(firma, stadt, job, careers_url, hole) -> Standort | None` (Reihenfolge Anzeige → OSM → Impressum → Wikidata); `Standort = dataclass(adresse, lat, lon, quelle, quelle_url)`; `faellige_suchen(db, regionen, heute) -> list[(firma, stadt)]` (nur in Region, nicht in den letzten 90 Tagen versucht).
- [ ] Step 1: Failing tests: schema.org `streetAddress` → Quelle `anzeige`; Standortname „Munich – Arnulfstraße 19“ erkannt; OSM-Treffer „Beispiel GmbH“ für „Beispiel“ (Ähnlichkeit ohne Rechtsform) angenommen, „Beispielbau AG“ abgelehnt; Impressum Berlin für Stadt München → None (Review Focus 3); Wikidata gleiche Stadt → `wikidata`; Suchsperre 90 Tage; `robots.txt` verbietet `/impressum` → kein Abruf.
- [ ] Step 2: FAIL. Step 3: implementieren mit `scraper/http.py` (1/s je Domain). Step 4: PASS. Step 5: Commit `Pendelzeit: Büroadressen finden`.

### Task 4: Nachtlauf-Schritt Pendelzeiten

**Files:** Create `scraper/pendeln.py`; Modify `scraper/run.py` (Schritt nach dem Scrapen), `scraper/db.py` (Lesen/Schreiben der vier Tabellen), `.github/workflows/taeglich.yml` (`actions/cache` für `daten/gtfs/`, Schlüssel je Monat); Test `tests/test_pendeln.py` mit `tests/fakedb.py`
**Interfaces — Produces:** `aktualisiere_haltestellen(db, fahrplan_zip: Path) -> int` (alle Haltestellen Deutschlands mit Name/Ort, nach jedem neuen Fahrplan); `rechne_alle(db, fahrplan_zip: Path, heute: date) -> dict[str, int]` (nur Zahlen für das Log: `regionen`, `nutzer`, `gerechnet`, `unbekannt`).
- [ ] Step 1: Failing tests: Nutzer mit Haltestelle + Stelle mit gefundenem Büro → Zeile in `pendelzeiten`; mehrere Städte → kürzeste mit Stadt (Review Focus 1); Büro `ungefaehr` → `ungefaehr = true`; Remote-Stelle → keine Zeile; geänderte Haltestelle → Neuberechnung (Review Focus 2); unveränderte Eingaben → keine Neuberechnung; > 180 Min. → `minuten null`; Log-Rückgabe enthält nur Zahlen.
- [ ] Step 2: FAIL. Step 3: implementieren; Regionen mit überlappenden 80-km-Kreisen zu einem Auszug zusammenlegen. Step 4: PASS (`pytest`). Step 5: Commit `Pendelzeit: Nachtlauf`.

### Task 5: Website

**Files:** Modify `web/app/konto/page.tsx` + `web/app/konto/actions.ts` (Abschnitt „Pendeln“: Haltestellensuche, Fußweg), `web/app/stellen/page.tsx`, `web/app/stellen/[id]/page.tsx`, Filter-Dateien aus Phase 5 (`web/lib/filter*.ts`, `web/app/stellen/filter*.tsx`); Create `web/lib/pendeln.ts`, `web/app/api/haltestellen/route.ts`; Test `web/tests/pendeln.test.ts`
**Interfaces — Produces:** `pendelText(p: {minuten: number|null; umstiege: number|null; ungefaehr: boolean; stadt: string|null} | null, remote: boolean): string | null`; `passtPendelFilter(p, max: number | null, nurBekannt: boolean): boolean`; `GET /api/haltestellen?q=` → bis 20 `{id, name, ort}` aus `pendel_haltestellen` (Task 1; Task 4 füllt sie).
- [ ] Step 1: Failing tests: `pendelText` für (35,1) → „🚆 35 Min. · 1 Umstieg“, (35,2) → „· 2 Umstiege“, ungefähr → „ca. 35 Min.“, null → „Pendelzeit unbekannt“, remote → null, Stadt → „… nach Garching“; `passtPendelFilter` unbekannt + `nurBekannt=false` → true, mit `true` → false, 50 Min. bei max 45 → false; ohne Start-Haltestelle wird kein Filter angeboten (Review Focus 5).
- [ ] Step 2: FAIL. Step 3: implementieren; Admin: „Büroadresse eintragen/ändern“ auf der Stellenseite (Geokodierung erst im Nachtlauf, bis dahin „wird heute Nacht verortet“). Step 4: PASS, Build grün. Step 5: Commit `Pendelzeit: Anzeige, Filter, Einstellungen`.

### Task 6: Quellen, Datenschutz, Doku, Halt

- [ ] Quellenangaben (Global Constraints) auf der Datenschutz-/Quellenseite; Datenschutz: „Deine Start-Haltestelle wird nur für die Pendelzeit genutzt und nicht weitergegeben.“; `docs/STATUS.md`, `docs/agenten-protokoll.md`, Warteschlange 🛑; `pytest`, `npm test`, `npm run build` grün; Commit `Pendelzeit: Quellen und Doku`.
- [ ] 🛑 Halt: Nutzer spielt Migration 026 ein und trägt auf der Konto-Seite seine Haltestelle ein. Claude startet den Lauf von Hand, prüft Laufzeit (Log), Trefferquote der Büro-Suche und 5 Pendelzeiten gegen die MVV-Auskunft (± 10 Min.).
