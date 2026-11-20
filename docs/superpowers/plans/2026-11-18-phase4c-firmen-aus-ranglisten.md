# Phase 4c: Firmen aus Ranglisten – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Codex: Auftrag kommt über `docs/codex-warteschlange.md` (AGENTS.md Abschnitt 0). **Codex ruft keine echte Quelle ab**; alle Tests laufen gegen Beispieldateien aus Task 0.

**Goal:** Aus offenen Ranglisten entsteht eine Kandidatenliste (~1.000 Firmen), jede Firma wird einmal eingerichtet (Karriereseite → Portal → Probeabruf) und steht danach mit Status in `data/companies.csv`; Ranglisten-Ausgaben landen in den Tabellen aus Migration 010.

**Architecture:** Je Quelle ein reiner Parser in `scraper/quellen/` (Eingabe: Rohdaten, Ausgabe: Kandidaten). `scraper/kandidaten.py` führt zusammen und wendet Branchen-Zuordnung und `firmen_korrekturen.csv` an. `scraper/ranglisten_holen.py` (monatlich) holt Quellen und schreibt Dateien; `scraper/einrichtung.py` (eigener Lauf, fortsetzbar) richtet neue Firmen ein. Ergebnisse kommen als Pull Request, der Nutzer übernimmt. Der Nachtlauf überträgt Datei → Datenbank und importiert Ausgaben.

**Tech Stack:** Python 3 nur Standardbibliothek + `requests` (XLSX per `zipfile` + `xml.etree`, kein neues Paket), pytest, SQL-Migration, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-17-phase4-firmen-ranglisten-design.md` (Abschnitt 4c, „Festlegungen nach der Bauprüfung“ 1, 3, 4, 6, 7)

## Umsetzung 2026-11-20 durch Codex

Tasks 1–8 lokal gebaut, Tests und unabhängige Prüfung siehe `docs/agenten-protokoll.md`. Keine Live-Abrufe oder Migration durch Codex ausgeführt. Nachtrag 2026-11-20: Nutzer bestätigt „014 ist eingebaut“; Migration damit laut Nutzer erledigt, Live-Prüfung noch offen. Commit-Schritte werden als zusammenhängendes Paket abgegeben; keine Veröffentlichung. Der Haltepunkt für Hochladen und echten Abruf unten bleibt offen.

Abweichungen mit Begründung: Geschützter Offline-Prüfeinstieg statt ungeschütztem pytest; transaktionaler Service-RPC und Ablaufbereinigung in 014 statt mehrerer nicht atomarer REST-Schreibvorgänge; `data/quellen_ausgaben.json` hält Inhaltsfingerabdruck und Fristen gegen Wiederaufnahme veralteter Ausgaben. Quellenfehler zählen als monatlicher Versuch gegen Abrufflut. Bestands-Websites aus vorhandenen Angaben ergänzt, damit Bestand und Listenquellen zugeordnet werden können; unbekannte Größe leer statt erfundener Klasse. Bestehende Quelleneinträge ohne Identität bleiben innerhalb ihrer Quelle erhalten; keine Zusammenlegung gleichnamiger Firmen anderer Quellen. Eigene Karrierehosts mit Job-Links dürfen die in robots.txt angebotene Sitemap nutzen. Gemeinsame Wikidata-ID verschiedener Portale nur an einem Eintrag, weitere Zuordnungen werden gemeldet (Unique-Regel).

## Global Constraints

- Jeder Netzabruf nur über `scraper/http.hole` (robots.txt, ≤ 1 Anfrage/s je Domain, eigener User-Agent). Quellen höchstens 1× je Quelle und Monat.
- Im Repo, in Tests und Fixtures nur offen lizenzierte Quellen namentlich: EU Industrial R&D Investment Scoreboard (CC BY), Wikidata (CC0), EPA, CORDIS/EIC, Behörden-/Forschungsliste. **Keine Wikipedia-Liste** (Q77).
- **Ergebnisse von Task 0 (2026-11-19, verbindlich):** Quellen-Formate stehen in der Spec unter „Quellen-Formate (Task 0)“; Abfragen in `scraper/quellen/sparql/`; Beispieldateien in `tests/fixtures/quellen/` (Herkunft in `LIZENZ.md`); Branchen-Zuordnung `data/branchen_zuordnung.csv` ist fertig (106 Wikidata-Branchen; Task 3 liest sie nur). Ausschlussliste für die Arbeitgeber-Liste: `data/arbeitgeber_ausschluss.csv` (fertig).
- **Firmenauswahl nach Q80–Q93 (2026-11-19, ersetzt Spec 4c-1 wo abweichend):** Scoreboard nur Top 200 weltweit (Q94: aus jeder Liste höchstens Top 200, kleinere Listen ganz); alle vier Indizes; EPA Top 100 (Rang nur Admin); „Top 200 Arbeitgeber“ statt „Top 20 je Branche“; EIC Accelerator ganz Europa, die 200 mit der höchsten EU-Förderung (Nachtrag, Q97); **keine** Behörden-/Forschungsliste (Q82 ersetzt Q42) und keine `data/behoerden.csv`; die 13 heutigen Firmen bleiben bis 4e als `bestand`; Austritt wie Spec (Q90).
- **EIC/CORDIS (Q78):** CORDIS verbietet Programmen per robots.txt den Ordner `/data/`. Kein automatischer Abruf; der Nutzer lädt die Datei 1× im Jahr selbst im Browser herunter. Der EIC-Parser ist **nicht** Teil dieses Plans (Format erst nach dem ersten Handdownload bekannt; eigener Nachtrag).
- **Workday und SuccessFactors (Q76):** nur über die Sitemap, die die Firmen-Karriereseite in ihrer robots.txt anbietet, und die einzelnen Stellenseiten (JSON-LD `JobPosting`), also über den vorhandenen Adapter `sitemap`; **nie** die interne Workday-Schnittstelle (`/wday/cxs/…`). Hosts `career*.successfactors.*` verbieten Programme per robots.txt → `portal_nicht_unterstuetzt`.
- Rohseiten nie speichern; gespeichert werden nur Firmenname, Rang, Listenname, Jahr, Quell-Link (CLAUDE.md 4.8). Ausgaben leben höchstens 13 Monate (`pruefe_ausgabe` erzwingt das).
- Firmenschlüssel bleibt `companies.name`; neue Spalte `wikidata_id`. Nie automatisch zusammenlegen, wenn zwei Kandidaten gleiche Wikidata-ID/Domain, aber verschiedene Portale haben → Bericht.
- Stammdaten gehören der Datei, Admin-Felder (`whitelist`, Wunscharbeitgeber, Hand-Listen) nur der Datenbank; `sync_companies` schreibt nie Admin-Felder. `data/firmen_korrekturen.csv` hat Vorrang vor allen automatischen Werten.
- Status-Werte (exakt): `aktiv`, `kein_portal`, `portal_nicht_unterstuetzt`, `keine_stellen_de`, `offen` (noch nicht eingerichtet).
- Kein Playwright, keine KI in diesem Paket. Keine neue Abhängigkeit.
- Migration nur als Datei: `supabase/migrations/014_firmen_quellen.sql`.

## Review Focus

1. Gleiche Firma aus zwei Quellen mit unterschiedlicher Schreibweise („Siemens AG“ / „Siemens“) und gleicher Wikidata-ID: genau ein Kandidat, beide Quellen in `quellen` (Test Task 3).
2. Einrichtungslauf bricht nach Zeitbudget ab: nächster Lauf setzt fort, erledigte Firmen werden nie neu gesucht (Test Task 5).
3. Karriereseite verlinkt mehrere Portale (z. B. Greenhouse und Personio): kein automatischer Treffer, Status `offen`, Eintrag in „nicht gefunden“ mit Grund „mehrere Portale“ (Test Task 5).
4. Die 13 heutigen Firmen (`quellen` = `bestand`) bleiben aktiv, auch ohne Listenplatz, bis Paket 4e sie zu privaten Firmen des Admins macht (Q83/Q93); dm, Porsche und Bundesbank stehen zusätzlich auf Listen (Test Task 6).
5. Migration 014 fehlt: Nachtlauf läuft weiter wie heute, Hinweis im Bericht (Test Task 6).

---

### Task 0 (Claude): Vorarbeit – erledigt 2026-11-19

- [x] Wikipedia-Liste geprüft: zwei von drei Teilen aus Quellen ohne offene Lizenz, dritter mit Zahlen von 2020 → weglassen (Q77).
- [x] Börsenindizes in Wikidata geprüft: aktuell (letzte Änderungen Sept./Okt. 2026); DAX 40 Firmen + Unterindex DivDAX (wird durch Unternehmens-Filter entfernt), MDAX 50, SDAX 71 (vermutlich ein nicht ausgetragener Aufsteiger), TecDAX 30 → Abweichung von der Sollgröße (40/50/70/30) als Berichtszeile.
- [x] Workday/SuccessFactors geprüft → nur Sitemap + Stellenseite (Q76, Global Constraints).
- [x] Beispieldateien und Abfragen angelegt (Global Constraints); CORDIS nicht abgerufen (robots.txt, Q78).
- [x] Quellen-Formate in der Spec notiert.

### Task 1: Firmendatei und Migration 014

**Files:**
- Modify: `data/companies.csv` (neue Spalten), `scraper/companies.py`, `scraper/db.py` (`sync_companies`)
- Create: `data/firmen_korrekturen.csv` (nur Kopfzeile `name,feld,wert,quelle`), `supabase/migrations/014_firmen_quellen.sql`
- Test: `tests/test_companies.py`, `tests/test_db.py`, SQL-Prüftest nach Muster `tests/test_sql_pruefung.py`

**Interfaces:**
- Neue Spalten in `companies.csv` (am Ende, Reihenfolge fest): `website,wikidata_id,quellen,status,status_grund`. `quellen` = `;`-getrennte Listen-IDs (z. B. `scoreboard-world;dax`), heutige 13 Firmen: `bestand`, Status `aktiv`.
- `lade_unternehmen(pfad)` liefert zusätzlich `quellen: list[str]`; fehlende neue Spalten (alte Datei) → Standardwerte (`""`, `[]`, `aktiv` wenn `aktiv == "ja"`).
- `wende_korrekturen_an(firmen: list[dict], pfad) -> list[dict]` in `scraper/companies.py`: je Zeile `name,feld,wert,quelle` setzt `feld` der Firma `name` (nur bekannte Stammdaten-Felder, sonst `ValueError`).
- Migration: `companies` bekommt `website text`, `wikidata_id text unique`, `quellen text[] not null default '{}'`, `status text not null default 'aktiv' check (status in ('aktiv','kein_portal','portal_nicht_unterstuetzt','keine_stellen_de','offen'))`, `status_grund text`.
- `sync_companies` schreibt die neuen Felder nur, wenn `db._spalten_da`-artige Prüfung (`firmen_quellen_da() -> bool`) wahr ist; `aktiv` = `status == "aktiv" and aktiv == "ja"`.

- [x] **Step 1: Tests.** Alte Datei ohne neue Spalten lädt wie bisher; neue Datei liefert `quellen == ["scoreboard-world", "dax"]`; Korrektur `Helsing,hauptsitz,Berlin,Impressum` setzt `hauptsitz`; unbekanntes Feld → `ValueError`; `sync_companies` sendet `wikidata_id` nur mit Spalte; SQL-Prüftest für 014 (idempotent, `unique`, `check`).
- [x] **Step 2:** `py -m pytest -q` → FAIL.
- [x] **Step 3:** Umsetzen; `data/companies.csv` um die Spalten ergänzen (13 Zeilen: `,,bestand,aktiv,`).
- [x] **Step 4:** `py -m pytest -q` → grün.
- [x] **Step 5: Commit** — „4c: Firmendatei mit Quellen und Status, Migration 014“ + `Agent: Codex`.

### Task 2: Quellen-Parser

**Files:**
- Create: `scraper/quellen/__init__.py`, `scraper/quellen/xlsx.py`, `scraper/quellen/scoreboard.py`, `scraper/quellen/wikidata.py`, `scraper/quellen/epa.py`
- Test: `tests/test_quellen.py`

**Interfaces:**
- `Kandidat = dict` mit Schlüsseln `name: str, wikidata_id: str|None, website: str|None, liste_id: str, rang: int|None, mitarbeitende: int|None, branche_wd: str|None, hauptsitz: str|None`.
- `xlsx.zeilen(daten: bytes, blatt: int = 0) -> list[list[str]]` (sharedStrings + Blatt-XML, nur Standardbibliothek).
- Je Quelle `lies(daten: bytes|dict) -> list[Kandidat]`; Listen-IDs (exakt): `scoreboard-world` (**nur Rang 1–200**, Q81/Q94; keine EU-800), `dax`, `mdax`, `sdax`, `tecdax` (alle vier, Q86), `top200-arbeitgeber` (Q80/Q94), `epa-patente` (Q88) (`eic` folgt im Nachtrag: EIC Accelerator, ganz Europa, Q89; die 200 mit der höchsten EU-Förderung, Q95/Q97). Jede Liste trägt eine Kategorie (Q96): Scoreboard und EPA `Innovation`, Indizes `Börsennotiert`, Arbeitgeber-Liste `Große Unternehmen`, EIC `Wachstum & Startups`.
- `wikidata.lies(antwort: dict) -> list[Kandidat]` fasst Zeilen **je Firma** zusammen (eine Firma kann mehrere Websites/Branchen haben: DAX liefert 138 Zeilen für 40 Firmen); bei mehreren Mitarbeiterzahlen die größte.
- `wikidata.top_arbeitgeber(antwort: dict, ausschluss: list[dict], anzahl: int = 200) -> list[Kandidat]` (Abfrage `sparql/arbeitgeber.rq`, Q80/Q85/Q91/Q94): Zeilen mit einer Kennung aus `data/arbeitgeber_ausschluss.csv` (`art=behalten`) bleiben immer; sonst raus, wenn ein Typ (`art=typ`) passt oder ein Namensteil (`art=name`, Groß/klein egal) im Namen steht; Rest nach Mitarbeitenden absteigend, die ersten 200, `rang` = Platz. Kategorie für den Filter über `data/branchen_zuordnung.csv` (erste zuordenbare Branche, sonst `Sonstige`). Fehler, die durchrutschen (Doppelte wie „DHL“/„DHL AG“, einzelne Werke, Pflegeheimketten ohne Typ), streicht der Nutzer später über `data/firmen_korrekturen.csv` (Q84: automatisch live).
- `wikidata.name_zu_id(name: str, land: str, suche=…) -> str | None` (Abfrage `sparql/name_zu_id.rq`): Stufe 1 vollständiger Name (Groß/klein egal) gleich Bezeichnung oder Alias; nur wenn Stufe 1 nichts findet, Stufe 2 ohne Rechtsform (AG, SE, GmbH, KGaA, Inc., Ltd., Corp., S.A., N.V., PLC) und Satzzeichen; jeweils nur Ergebnisse mit passendem Land; genau ein Treffer → Kennung, sonst `None` (→ Liste „nicht gefunden“). Für Scoreboard und EPA, die keine Kennung liefern.

- [x] **Step 1: Tests** gegen die Fixtures: `scoreboard_world2000.xlsx` → 5 Kandidaten, erster „AMAZON.COM, INC.“ Rang 1, Land „US“; Zeile mit Rang 201 (im Test angehängt) fällt weg; `wikidata_index_dax.json` → je Firma ein Kandidat; `wikidata_arbeitgeber.json` (33 Zeilen) → Bundeswehr, Bundespolizei, Deutscher Caritasverband, Ludwig-Maximilians-Universität München, Helios Kliniken und Landeshauptstadt München fehlen, Auswärtiges Amt und Deutsche Bundesbank sind dabei (`behalten`), Rang 1 = meiste Mitarbeitende; mit `top_arbeitgeber(..., anzahl=5)` → 5; `epa_top_applicants.xlsx` (Titelzeile überspringen) → 3 Kandidaten; `name_zu_id("VOLKSWAGEN AG", "DE")` mit `wikidata_name_volkswagen.json` → `Q156578` (nicht die Marke `Q246`).
- [x] **Step 2:** FAIL. **Step 3:** Umsetzen. **Step 4:** grün.
- [x] **Step 5: Commit** — „4c: Parser für offene Ranglisten“ + `Agent: Codex`.

### Task 3: Zusammenführen und Branchen

**Files:**
- Create: `scraper/kandidaten.py` (liest das fertige `data/branchen_zuordnung.csv`, Kopf `wikidata_branche,bezeichnung,kategorie`)
- Test: `tests/test_kandidaten.py`

**Interfaces:**
- `zusammenfuehren(kandidaten: list[Kandidat], bestand: list[dict]) -> tuple[list[dict], list[str]]`: Ergebnis sind Firmenzeilen im Format von `companies.csv` (neue Firmen mit `status=offen`, `aktiv=nein`), dazu Berichtszeilen. Abgleich: zuerst `wikidata_id`, dann Domain von `website` (ohne `www.`), nie Name allein. Bestehende Firmen behalten Portal und Status; nur `quellen` wird ergänzt. Name einer neuen Firma = Wikidata-Bezeichnung, sonst Name aus der Quelle.
- `kategorie_fuer(branche_wd: str|None, zuordnung: dict) -> str` → nicht zuordenbar = `Sonstige` und Berichtszeile `Branche ohne Zuordnung: <wert>`.
- `ausgaben(kandidaten, heute: str) -> list[dict]`: je Liste ein Objekt im Eingabeformat von `scraper.rankings.pruefe_ausgabe` (`gueltig_bis` = heute + 12 Monate, `freigegeben` false für `epa-patente`, sonst true).

- [x] **Step 1: Tests** (u. a. Review Focus 1): gleiche Wikidata-ID → ein Eintrag mit beiden Quellen; gleiche Domain ohne Wikidata-ID → ein Eintrag; gleicher Name, verschiedene Domains → zwei Einträge + Berichtszeile; Bestandsfirma behält `ats_typ`; Korrekturen aus `firmen_korrekturen.csv` gewinnen; jede erzeugte Ausgabe besteht `pruefe_ausgabe`.
- [x] **Step 2–4:** FAIL → Umsetzen → `py -m pytest -q` grün.
- [x] **Step 5: Commit** — „4c: Kandidaten zusammenführen, Branchen zuordnen“ + `Agent: Codex`.

### Task 4: Monatlicher Abruf der Quellen

**Files:**
- Create: `scraper/ranglisten_holen.py`, `.github/workflows/ranglisten.yml`
- Test: `tests/test_ranglisten_holen.py` (Netz per `monkeypatch` auf `scraper.http.hole`)

**Interfaces:**
- `lauf(heute: str, datenordner="data", holen=http.hole) -> dict` (Bericht): liest `data/quellen_stand.json` (`{liste_id: "YYYY-MM-DD"}`), überspringt Quellen, die in diesem Kalendermonat schon geholt wurden, ruft Parser (Task 2), `zusammenfuehren` (Task 3), schreibt `data/companies.csv`, `data/ranglisten/<liste_id>.json` (Ausgabe-Objekt) und `data/kandidaten_bericht.md`. Eine kaputte Quelle stoppt die anderen nicht.
- Workflow: `workflow_dispatch` und `cron: "0 3 1 * *"`; Ergebnis auf Zweig `ranglisten-<datum>` committen und per `gh pr create` als Pull Request öffnen (nie nach `main` pushen).

- [x] **Step 1: Tests:** zweiter Lauf im selben Monat holt nichts; Fehler einer Quelle → Bericht nennt sie, übrige Dateien geschrieben; keine Rohdaten im Datenordner.
- [x] **Step 2–4:** FAIL → Umsetzen → grün.
- [x] **Step 5: Commit** — „4c: monatlicher Ranglisten-Abruf als Pull Request“ + `Agent: Codex`.

### Task 5: Einmalige Einrichtung je Firma

**Files:**
- Create: `scraper/einrichtung.py`, `.github/workflows/einrichtung.yml`
- Modify: `scraper/ats_erkennung.py` (aus 4b) nur falls nötig für HTML-Links
- Test: `tests/test_einrichtung.py` (Fixtures `karriere_*.html` aus Task 0, Adapter per `monkeypatch`)

**Interfaces:**
- Consumes: `erkenne_portal(url)` aus 4b (`scraper/ats_erkennung.py`), `ADAPTER` aus `scraper/ats/__init__.py`, `ist_relevant` aus `scraper/filter.py`.
- `PFADE = ["", "/karriere", "/careers", "/jobs", "/de/karriere", "/en/careers"]`.
- `portal_links(html: str, basis: str) -> list[dict]`: alle `<a href>`, absolut gemacht, durch `erkenne_portal`, nur `erkannt`, ohne Doppelte.
- `richte_ein(firma: dict, holen=http.hole, adapter=ADAPTER) -> dict`: Ablauf laut Spec 4c-2 Schritt 1; Ergebnis setzt `careers_url, ats_typ, ats_id, status, status_grund, aktiv`. Genau ein Portal + mindestens eine Stelle mit `ist_relevant(...)[0]` → `aktiv`; Portal, aber keine passende Stelle → `keine_stellen_de`; mehrere Portale → bleibt `offen`, Grund `mehrere Portale: …`; nichts gefunden → bleibt `offen`, Grund `Karriereseite nicht gefunden`; Portal-Host bekannt, aber kein Adapter (siehe Task 7) → `portal_nicht_unterstuetzt` mit Portalname. **Workday / SuccessFactors auf firmeneigener Adresse (Q76):** robots.txt des Karriere-Hosts lesen; erlaubt sie den Stellenpfad und nennt eine `Sitemap:`, dann `ats_typ = "sitemap"`, `ats_id = <Sitemap-URL>#/job/` (Workday) bzw. der Stellenpfad als Filter; sonst `portal_nicht_unterstuetzt`. Nie `/wday/cxs/`.
- `lauf(datenordner="data", budget_s: int = 19800) -> dict`: bearbeitet alle Firmen mit `status == "offen"` und ohne Eintrag in `data/einrichtung_stand.json`, sortiert nach bestem Rang; speichert den Stand nach jeder Firma; stoppt vor Ablauf von `budget_s`. Schreibt `data/karriereseite_nicht_gefunden.md` (Name, Website, bester Rang, Grund; sortiert nach Rang) für die Morgen-Sitzung mit Claude.
- Workflow: nur `workflow_dispatch`, `timeout-minutes: 350`, Ergebnis als Pull Request wie Task 4.
- **Vorfilter im Sitemap-Adapter (`scraper/ats/sitemap.py`):** Workday-Sitemaps enthalten alle Stellen weltweit, der Ort steht in der Adresse (`…/job/Vietnam-Hanoi/…`). Neue Funktion `ort_aus_url(url: str) -> str | None` (Segment nach `/job/`, Bindestriche → Leerzeichen); Stellen-URLs, deren Ort weder Deutschland/Germany, eine deutsche Stadt (`deutsche_staedte`) noch „Remote“ enthält, werden vor dem Abruf als `vorgefiltert` gezählt. Ohne erkennbaren Ort: abrufen. Test: `…/job/Vietnam-Hanoi/…` vorgefiltert, `…/job/Germany-Munich/…` und `…/job/US-WA-Remote/…` abgerufen (Remote entscheidet danach wie heute `ist_relevant`).

- [x] **Step 1: Tests** (Review Focus 2 und 3): ein Portal + Stelle in München → `aktiv`; nur Stellen in den USA (nicht remote) → `keine_stellen_de`; zwei Portale → `offen` + Grund; kein Link → Eintrag in der Liste; `budget_s=0` → nichts bearbeitet, Stand unverändert; zweiter Lauf überspringt erledigte Firmen; robots.txt-Verbot (`http.hole` wirft) → Grund `robots.txt verbietet Abruf`.
- [x] **Step 2–4:** FAIL → Umsetzen → grün.
- [x] **Step 5: Commit** — „4c: einmalige Einrichtung je Firma“ + `Agent: Codex`.

### Task 6: Nachtlauf, Aufnahme und Austritt, Ausgaben-Import

**Files:**
- Modify: `scraper/run.py`, `scraper/db.py`
- Test: `tests/test_run.py`, `tests/test_db.py`

**Interfaces:**
- `db.importiere_ausgabe(daten: dict) -> None`: `pruefe_ausgabe(daten, bekannte_firmen)` und dann Upsert in `ranking_listen`, `ranking_ausgaben`, `ranking_firmen` (eine neue Ausgabe einer Liste ersetzt deren ältere Firmenzuordnungen).
- `run.lauf`: nach `sync_companies` alle `data/ranglisten/*.json` importieren (Fehler je Datei → Bericht, Lauf geht weiter). Abgerufen werden nur Firmen mit `status == "aktiv"`.
- Austritt (Spec 4c-4): Firma ohne jede Liste und ohne `bestand` → `aktiv=nein` beim Erzeugen in Task 3/4 (nicht im Nachtlauf löschen); ihre Stellen verschwinden über den vorhandenen Ablauf, Bewerbungen bleiben.
- Bericht: Gesamtlaufzeit in Minuten (`Laufzeit: N min`), Ziel < 120.

- [x] **Step 1: Tests:** Import mit Fake-DB schreibt drei Tabellen; ungültige Datei → Berichtszeile, andere Dateien importiert; `bestand`-Firma ohne Liste bleibt aktiv; Firma mit `status=offen` wird nicht abgerufen; ohne Migration 014 (`firmen_quellen_da` falsch) Lauf wie heute.
- [x] **Step 2–4:** FAIL → Umsetzen → `py -m pytest -q` grün.
- [x] **Step 5: Commit** — „4c: Nachtlauf importiert Ranglisten, ruft nur eingerichtete Firmen ab“ + `Agent: Codex`.

### Task 7: Portal-Messung (4c-3, nur Messen)

**Files:**
- Modify: `scraper/einrichtung.py`
- Test: `tests/test_einrichtung.py`

**Interfaces:**
- `PORTAL_HOSTS = {"workday": r"\.myworkdayjobs\.com$|\.wd\d+\.myworkdaysite\.com$", "successfactors": r"successfactors\.(com|eu)$|^jobs\.sap\.com$|career\d*\.successfactors", "smartrecruiters": r"smartrecruiters\.com$", "lever": r"lever\.co$", "softgarden": r"softgarden\.io$", "join": r"join\.com$"}`.
- `portal_art(url: str) -> str|None`; `lauf` zählt je Art die Firmen mit Status `portal_nicht_unterstuetzt` und schreibt die Tabelle „Portal-Arten“ (Art, Anzahl Firmen, bester Rang, 3 Beispielfirmen) in `data/karriereseite_nicht_gefunden.md`.

- [x] **Step 1: Test:** drei Links (Workday, SuccessFactors, unbekannt) → Zählung 1/1, unbekannt fällt in „sonstige“.
- [x] **Step 2–4:** FAIL → Umsetzen → grün.
- [x] **Step 5: Commit** — „4c: Häufigkeit der Portal-Arten messen“ + `Agent: Codex`.

### Task 8: Doku und Halt

- [x] `docs/STATUS.md` (Stand, Nutzer-To-dos: Migration 014 einspielen, Workflows „Ranglisten“ und „Einrichtung“ einmal von Hand starten, Pull Requests ansehen), `docs/ENTSCHEIDUNGEN.md` (XLSX ohne Zusatzpaket; Bestandsfirmen bleiben über `bestand` aktiv; Austritt nur beim Erzeugen der Datei, nie im Nachtlauf löschen), `docs/agenten-protokoll.md`, Warteschlange `🛑 wartet auf Nutzer/Claude`.
- [x] Commit — „4c: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt (noch offen):** Nutzer spielt Migration 014 ein und lädt hoch; Claude startet mit dem Nutzer den ersten echten Abruf („Ranglisten“), prüft den Pull Request (Stichprobe 20 Firmen: Name, Website, Branche), dann „Einrichtung“; am Morgen danach arbeiten Nutzer und Claude `karriereseite_nicht_gefunden.md` ab. Anhand der Portal-Messung schreibt Claude den Plan für die Adapter (Workday/SuccessFactors) und 4g.
