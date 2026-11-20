# Phase 5: Filter, Sperrliste und gespeicherte Suchen – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag über `docs/codex-warteschlange.md` (Nr. 12). Setzt voraus: Sprachniveau (Migration 013, Muster „Mein Deutschniveau“), 4c (`companies.wikidata_id`, `scraper/quellen/wikidata.py`), 4g-1 (`scraper/titel_vergleich.py`).

**Goal:** Angemeldete Nutzer filtern die Stellenliste zusätzlich nach Gehalt, Bürotagen, Vertrieb, Führung, Abschluss, Erfahrung, Vertrag, Workation, Firmengröße, Eigentümer, Geschäftsmodell und Kundenbranche, sehen Vermittler, Ghost-Verdacht und zusammengeführte Dubletten, sperren Firmen dauerhaft, pflegen Synonymgruppen und speichern Suchen.

**Architecture:** Groq liefert mit einer erweiterten Anleitung (Version 2) neue Felder; reine Regeln in `scraper/filterwerte.py` rechnen daraus und aus dem Steckbrief typisierte Filterspalten (`jobs.f_*`, `companies.eigentuemer/geschaeftsmodell`), die der Nachtlauf schreibt. Die Website filtert nur auf diesen Spalten, in `jobs` und in `ranking_stellen` gleich. Nutzerdaten (Sperrliste, Synonyme, Suchen, Abschluss) liegen in eigenen Tabellen mit RLS.

**Tech Stack:** Python 3 (pytest, Attrappen), Groq `openai/gpt-oss-120b`, Next.js 16 / TypeScript (`node --test`), Supabase (Migration 021).

**Spec:** `docs/superpowers/specs/2026-11-19-phase5-filter-design.md`; Antworten Q116–Q132 in `docs/fragen-und-antworten.md`.

## Global Constraints

- Groq nur `openai/gpt-oss-120b`, nur Anzeigentexte; neue Felder ohne Angabe = `null`, nichts erfinden.
- **Ohne Angabe sichtbar (Q121):** jeder neue Filter wird als `or(<spalte>.is.null, <bedingung>)` angewandt; der eine Schalter `nur_angabe=1` lässt `is.null` weg. In der Liste steht bei aktivem Filter und fehlender Angabe `<Feld>: nicht angegeben` (Klasse `gedaempft klein`).
- **Gleich mit und ohne Rangliste:** jede Bedingung in `stellenAbfrage` gilt für beide Pfade; ein Test prüft beide.
- **Nur Angemeldete (Q130):** neue Spalten nicht an `anon` freigeben; Gäste-Abfrage wählt sie nicht aus und wendet keine neuen Filter an.
- **Abschluss (Q125):** Stufen `1 Ausbildung, 2 Bachelor, 3 Master, 4 Promotion`; maßgeblich die **niedrigste** genannte Alternative („Master oder Promotion“ = 3; „Promotion erforderlich“ = 4); „oder vergleichbare Qualifikation/Berufserfahrung“ senkt nicht. Filter: `f_abschluss <= mein_abschluss`.
- **Gehalt (Q129):** Jahresbrutto wie `proJahr` (`web/lib/steckbrief.ts`: Monat × 12, Stunde × 2.080); nur EUR, sonst `null`. Filter `f_gehalt_max >= gehalt_min`.
- **Ghost (Q126):** Gründe `lange_online` (offen und `erstmals_gesehen` mehr als 60 Tage zurück) und `wieder_neu` (gleiche Firma + gleicher Titel nach `norm_titel_streng` war in den letzten 180 Tagen geschlossen).
- **Groq-Nachholen (Q122):** neue und geänderte Stellen immer zuerst; Bestand mit älterer `ki_version` danach, gemerkte zuerst, höchstens `NACHHOL_MAX` je Nacht (Wert im Protokoll begründen, Ziel: neue Stellen am Folgetag nie blockiert).
- Nutzerdaten (Sperrliste ≤ 200 Firmen, Synonymgruppen ≤ 50 mit je ≤ 10 Begriffen, gespeicherte Suchen ≤ 30) nur für den Eigentümer, in Export und Kontolöschung enthalten.
- Migration nur als Datei `supabase/migrations/021_filter.sql`; AGENTS.md (keine `.env`, keine Live-DB, kein Push, `Agent: Codex`).

- **Gehaltsschätzung (Q133):** nur ohne eigene Angabe; Stufen Firma (≥ 2 Stellen) → ähnliche Titel DE (≥ 3), sonst keine Schätzung (kein Entgeltatlas, Q134); Median; Ähnlichkeit `aehnlichkeit` aus `scraper/titel_vergleich.py` ≥ 0,5 und gleiches `erfahrungslevel`; Text exakt „≈ <min>–<max> € (geschätzt aus <n> Anzeigen derselben Firma)“ bzw. „… ähnlicher Stellen“; im Filter nur mit `schaetzung=1`.

## Review Focus

1. Stelle mit Gehalt „60.000–75.000 € “ und Filter 70.000 → sichtbar; „5.000 €/Monat“ → 60.000/Jahr; „80.000 CHF“ → „nicht angegeben“ (Test Task 2).
2. Rangliste gewählt + neuer Filter → gleiche Treffer wie ohne Rangliste, geschnitten mit der Liste (Test Task 5).
3. Dublette, deren zweiter Eintrag in München liegt, Stadt-Filter München → Gruppe erscheint (Test Task 3 und 5).
4. Gast ruft `/stellen?gehalt_min=70000` auf → Seite lädt ohne Fehler, Filter wird ignoriert (Test Task 5).
5. Gesperrte Firma taucht weder in der Liste noch in den Facetten-Zahlen auf; „Wieder zeigen“ macht sie sofort sichtbar (Test Task 7).

---

### Task 0 (Claude, nicht Codex): Vorab-Prüfung Gehaltsschätzung

- [x] Entgeltatlas (erledigt 2026-11-19): keine offizielle Schnittstelle (nur Webseite; die Statistik-API der Bundesagentur liefert bisher nur „Aktuelle Eckwerte“) → Stufe 3 entfällt; Nutzer entschied „Keine Schätzung“ (Q134).
- [x] Entgelttransparenzrichtlinie (erledigt 2026-11-19): Frist 7.6.2026 verpasst, Anfang November 2026 noch kein Referentenentwurf, Gesetz frühestens 2027 → Gehaltsangaben in Anzeigen bleiben vorerst freiwillig. Ergebnis in `docs/phasen-vorarbeit.md`.

### Task 1: Groq-Anleitung Version 2 und Nachholen

**Files:**
- Modify: `scraper/ki_prompt.md`, `scraper/ki.py` (`pruefe`, `warteschlange`, `auswerten`, Konstante `KI_VERSION = 2`), `scraper/db.py` (`ki_kandidaten` liest `ki_version`; `speichere_ki` schreibt `ki_version`; `gemerkte_job_ids()`), `scraper/ki_probe.py` falls nötig
- Test: `tests/test_ki.py`

**Interfaces:**
- Neue Felder im JSON (Werte exakt): `fuehrung` "ja"|"nein"|null; `vertrieb` "kein"|"etwas"|"ueberwiegend"|null; `buerotage` 0–5|null; `remote_gebiet` "de"|"eu"|"welt"|null; `workation` true|null; `variabel` true|null; `vermittler` true|false; `familienunternehmen` true|null; `geschaeftsmodell` "hersteller"|"zulieferer"|"dienstleister"|"beratung"|"handel"|"software"|"finanz"|null; `kundenbranche` Liste aus `data/kategorien.md` (nur bei `beratung`/`dienstleister`, sonst `[]`). Zwei Beispiele im Prompt um die Felder ergänzen.
- `pruefe` wirft `Ungueltig` bei unbekannten Werten (wie heute); fehlende neue Felder → `null` (alte Antworten bleiben gültig).
- `warteschlange(zeilen, heute, gemerkt: set[str])`: Gruppe 1 und 2 wie heute; **Gruppe 3** = Hash aktuell, aber `ki_version < KI_VERSION`, gemerkte zuerst; Gruppe 3 nur bis `NACHHOL_MAX`.

- [ ] **Step 1: Tests:** neue Felder gültig/ungültig; Antwort ohne neue Felder gültig; Gruppe 3 nach 1 und 2, gemerkte vorn, begrenzt.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „5: Groq-Anleitung Version 2 (Filterfelder) und Nachholen“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt:** Claude führt `scraper/ki_probe.py` mit 20 Anzeigen aus (braucht `.env`), Nutzer prüft die Tabelle wie bei Q21 und sagt „passt“ oder nennt Fehler. Erst danach Task 2.

### Task 2: Filterwerte je Stelle (Regeln ohne KI)

**Files:**
- Create: `scraper/filterwerte.py`, `tests/test_filterwerte.py`

**Interfaces:**
- `abschluss_stufe(text: str|None) -> int|None`, `jahresgehalt(gehalt: dict|None) -> tuple[int|None, int|None]`, `urlaubstage(text: str) -> int|None` (15–40, sonst `None`), `befristet(text: str, ki: dict|None) -> bool|None`, `ghost_gruende(stelle: dict, geschlossene: list[dict], heute: str) -> list[str]`.
- `filterwerte(stelle: dict, heute: str, geschlossene: list[dict]) -> dict` mit Schlüsseln `f_gehalt_min, f_gehalt_max, f_erfahrung, f_abschluss, f_fuehrung, f_vertrieb, f_buerotage, f_remote_gebiet, f_workation, f_befristet, f_urlaubstage, f_variabel, f_vermittler, f_kundenbranche, f_ghost` (aus `steckbrief`, `ki`, Text).

- [ ] **Step 1: Tests:** Review Focus 1; „Master oder Promotion“ = 3, „Promotion erforderlich“ = 4, „Bachelor oder vergleichbare Berufserfahrung“ = 2, `None` = `None`; „30 Tage Urlaub“ = 30, „300 Tage“ = `None`; Ghost 61 Tage → `lange_online`, 60 → nichts; geschlossene Notiz vor 100 Tagen mit gleichem Titel „Data Analyst (m/w/d)“ ↔ „Data Analyst“ → `wieder_neu`, vor 200 Tagen → nichts.
- [ ] **Step 2–4:** FAIL → umsetzen → grün.
- [ ] **Step 5: Commit** — „5: Filterwerte je Stelle“ + `Agent: Codex`.

### Task 3: Dubletten und Firmenangaben

**Files:**
- Modify: `scraper/filterwerte.py`, `scraper/quellen/wikidata.py`, `scraper/quellen/sparql/` (neue Abfrage `eigentuemer.rq`)
- Test: `tests/test_filterwerte.py`, `tests/test_quellen_wikidata.py` (Fixture)

**Interfaces:**
- `dubletten(stellen: list[dict]) -> dict[str, dict]`: je Stelle `{"dublette_von": id|None, "gruppe_staedte": list[str]|None, "gruppe_remote": bool}`; Gruppe = gleiche Firma + gleicher `norm_titel_streng`, beide offen; Haupteintrag = frühestes `erstmals_gesehen`, dann kleinste id; nur der Haupteintrag bekommt `gruppe_staedte` (Vereinigung) und `gruppe_remote` (oder).
- `geschaeftsmodell(werte: list[str|None]) -> str|None`: häufigster Nicht-null-Wert bei mindestens 2 Werten, Gleichstand → `None`.
- `wikidata.eigentuemer(antwort: dict) -> dict[str, list[str]]` (wikidata_id → aus `boersennotiert`, `konzerntochter`, `oeffentlich`); Eigenschaften im Protokoll begründen (z. B. Börse, Mutterorganisation, Eigentümer ist Staat/Gebietskörperschaft). `familie` kommt dazu, wenn mindestens eine Anzeige der Firma `familienunternehmen: true` hat.
- `firmen_korrekturen.csv` darf `eigentuemer` und `geschaeftsmodell` überschreiben (Feldnamen in `scraper/companies.py` zulassen).

- [ ] **Step 1: Tests:** Review Focus 3 (Gruppe München + Berlin → Haupteintrag hat beide Städte); geschlossene Stelle bildet keine Gruppe; Geschäftsmodell 1 Wert → `None`, 3×„beratung“ 1×„handel“ → „beratung“; Wikidata-Fixture.
- [ ] **Step 2–4:** FAIL → umsetzen → grün.
- [ ] **Step 5: Commit** — „5: Dubletten und Firmenangaben“ + `Agent: Codex`.

### Task 3b: Gehaltsschätzung

**Files:**
- Create: `scraper/gehalt_schaetzung.py`, `tests/test_gehalt_schaetzung.py`

**Interfaces:**
- `schaetze(stelle: dict, offene: list[dict]) -> dict | None`: `{"min": int, "max": int, "quelle": "firma"|"aehnlich", "anzahl": int}` nach den Regeln aus den Global Constraints; Stelle mit eigener Angabe (`f_gehalt_max` gesetzt) → `None`. `offene` = Stellen mit `f_gehalt_min/max`, `unternehmen`, `titel`, `erfahrungslevel`.

- [ ] **Step 1: Tests:** 2 Firmenstellen „Data Analyst“ (60–70 k, 70–80 k) → Firma, 65–75 k; nur 1 Firmenstelle, aber 3 ähnliche anderswo → `aehnlich`; anderes Erfahrungslevel zählt nicht; eigene Angabe → `None`; zu wenig Daten → `None`.
- [ ] **Step 2–4:** FAIL → umsetzen → grün.
- [ ] **Step 5: Commit** — „5: Gehaltsschätzung aus vorhandenen Anzeigen“ + `Agent: Codex`.

### Task 4: Migration 021 und Schreiben im Nachtlauf

**Files:**
- Create: `supabase/migrations/021_filter.sql`
- Modify: `scraper/db.py` (`schreibe_filterwerte(patches)`, `schreibe_firmenwerte(patches)`, `geschlossene_notizen(tage=180)`), `scraper/run.py` (nach KI-Schritt: für alle offenen Stellen Filterwerte und Dubletten neu rechnen, nur geänderte Zeilen patchen; danach Firmenwerte), `tests/fakedb.py`, `tests/test_sql_pruefung.py`
- Test: `tests/test_run.py`

**Interfaces:**
- `jobs`: Spalten aus Task 2 (`f_gehalt_min int, f_gehalt_max int, f_erfahrung smallint, f_abschluss smallint, f_fuehrung boolean, f_vertrieb text, f_buerotage smallint, f_remote_gebiet text, f_workation boolean, f_befristet boolean, f_urlaubstage smallint, f_variabel boolean, f_vermittler boolean, f_kundenbranche text[], f_ghost text[]`), `f_schaetz_min int, f_schaetz_max int, f_schaetz_quelle text, f_schaetz_anzahl smallint` (Task 3b), `dublette_von text references jobs(id) on delete set null`, `gruppe_staedte text[]`, `gruppe_remote boolean`, `ki_version smallint`. `companies`: `eigentuemer text[]`, `geschaeftsmodell text`. Keine Rechte für `anon`.
- `ranking_stellen` neu (gleiche Signatur und Prüfungen) mit allen neuen Spalten und `mitarbeitende_ca`, `eigentuemer`, `geschaeftsmodell`.
- `facetten()` neu: zusätzliche Gruppen `vertrieb`, `fuehrung`, `abschluss`, `eigentuemer`, `geschaeftsmodell`, `kundenbranche`, `remote_gebiet`; nur Haupteinträge (`dublette_von is null`) zählen; für `anon` unverändert alte Gruppen.
- Tabellen mit RLS „nur eigene Zeilen“: `sperrliste (owner_id, unternehmen text references companies(name) on update cascade on delete cascade, primary key(owner_id, unternehmen))`, `synonymgruppen (id identity, owner_id, begriffe text[] not null check (cardinality between 2 and 10))`, `suchen (id identity, owner_id, name text check (length between 1 and 60), adresse text not null check (adresse like '/stellen%'), erstellt timestamptz default now())`, `such_einstellung (owner_id primary key, abschluss smallint check (abschluss between 1 and 4))`; Grenzen per Trigger wie `wichtige_punkte`.
- Ohne Migration (Spalten fehlen): Hinweis im Log, Lauf läuft weiter (Muster `_spalten_da`).

- [ ] **Step 1: Tests:** Lauf schreibt nur geänderte Filterwerte; fehlende Spalten → Hinweis, kein Fehler; SQL-Prüftest (idempotent, keine `anon`-Rechte auf neue Spalten, RLS an allen neuen Tabellen).
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „5: Migration 021 und Filterwerte im Nachtlauf“ + `Agent: Codex`.

### Task 5: Filter in der Abfrage

**Files:**
- Modify: `web/lib/filter.ts` (Typ `Filter`, `leseFilter`, `filterZuUrl`), `web/lib/stellen.ts`
- Test: `web/tests/filter.test.ts`, `web/tests/stellen.test.ts`

**Interfaces:**
- URL-Parameter (exakt): `ma_von`, `ma_bis` (Zahl), `eigentuemer` (mehrfach), `geschaeft` (mehrfach), `kunde` (mehrfach), `erf_max` (Zahl), `fuehrung` (`mit`|`ohne`), `vertrieb` (mehrfach), `abschluss` (1–4; ohne Parameter gilt `such_einstellung.abschluss`, `abschluss=alle` schaltet aus), `gehalt_min` (Zahl), `befristet` (`ja`|`nein`), `urlaub_min` (Zahl), `variabel` (`1`), `buero_max` (0–5), `remote_gebiet` (mehrfach), `workation` (`1`), `ohne_ghost` (`1`), `ohne_vermittler` (`1`), `ohne_firma` (mehrfach), `nur_angabe` (`1`), `schaetzung` (`1`: Mindestgehalt prüft `coalesce(f_gehalt_max, f_schaetz_max)`). Ungültige Werte werden ignoriert.
- `stellenAbfrage(sb, f, opt: { angemeldet: boolean; sperrliste: string[]; synonyme: string[][] })`: neue Bedingungen nur bei `angemeldet`; immer `dublette_von is null`; Stadt-Filter prüft `staedte` **oder** `gruppe_staedte`; Sperrliste und `ohne_firma` als `not.in`; Synonyme erweitern jeden Suchbegriff um seine Gruppe (ODER), auch in `ranking_stellen`-Pfad. `SPALTEN_ANGEMELDET` = `SPALTEN` + neue Spalten, im `companies`-Embed zusätzlich `mitarbeitende_ca, eigentuemer, geschaeftsmodell` (Firmenfilter im Tabellenpfad über `companies.<spalte>`, im Ranglistenpfad über die Rückgabespalten); Gäste behalten `SPALTEN`.

- [ ] **Step 1: Tests:** jede Bedingung mit und ohne `nur_angabe`; Review Focus 2, 3, 4; Synonymgruppe „Data Analyst, BI Analyst“ → Suche „BI Analyst“ trifft beide; ungültige Parameter ignoriert; `filterZuUrl(leseFilter(x))` stabil.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit` grün.
- [ ] **Step 5: Commit** — „5: neue Filter in der Stellenabfrage“ + `Agent: Codex`.

### Task 6: Oberfläche der Stellenliste und Detailseite

**Files:**
- Modify: `web/app/stellen/page.tsx`, `web/app/stellen/filterblock.tsx`, `web/app/stellen/filter-client.tsx`, `web/app/stellen/[id]/page.tsx`, `web/app/stil/utilitaer.css`, `web/lib/stellendaten.ts`

**Interfaces:**
- Vier einklappbare Gruppen unter den bisherigen Filtern: „Unternehmen“ (Mitarbeitende von/bis, Eigentümer, Geschäftsmodell, Kundenbranche, Firmen ausschließen), „Rolle“ (höchstens X Jahre Erfahrung, Personalverantwortung, Vertriebsanteil, Mein Abschluss), „Gehalt & Vertrag“ (Mindestgehalt, Befristung, Urlaubstage ab, variable Vergütung, Bürotage höchstens, Remote-Gebiet, Workation), „Qualität“ (verdächtige ausblenden, Vermittler ausblenden); darüber das Häkchen „nur Stellen mit Angabe“. Zähler „Filter (n aktiv)“ zählt alle mit. Nur für Angemeldete.
- Liste: Markierungen „Vermittler“, Ghost-Ampel mit Grund („seit 74 Tagen online“, „schon einmal ausgeschrieben“), „+N weitere Orte“, bei aktivem Filter „<Feld>: nicht angegeben“; Gehaltsspanne neben dem Treffer, wenn Mindestgehalt aktiv; geschätzte Spanne immer im Text aus den Global Constraints, optisch von echten Angaben getrennt (Klasse `geschaetzt`). In „Gehalt & Vertrag“ das Häkchen „Schätzung beim Filtern mitzählen“.
- Detailseite: Abschnitt „Weitere Einträge dieser Stelle“ mit Links, wenn Dubletten existieren; Kurzbeschreibung (Konto-Felder) kann die neuen Angaben zeigen (neue Feldnamen in `waehleFelder`).

- [ ] **Step 1: Tests** (`web/tests/stellendaten.test.ts`): Ghost-Text je Grund; „nicht angegeben“-Text je Feld; Zähler aktiver Filter.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „5: Filtergruppen und Markierungen“ + `Agent: Codex`.

### Task 7: Sperrliste, Synonyme, gespeicherte Suchen, Mein Abschluss

**Files:**
- Create: `web/lib/nutzerfilter.ts`, `web/tests/nutzerfilter.test.ts`
- Modify: `web/app/stellen/actions.ts`, `web/app/stellen/page.tsx`, `web/app/konto/page.tsx`, `web/app/konto/actions.ts`, `web/app/export/route.ts` bzw. `web/lib/export.ts`, `web/lib/nutzer-loeschen-kern.ts` (nur falls Kaskade nicht reicht)

**Interfaces:**
- Actions: `firmaSperren(name)`, `firmaEntsperren(name)`, `synonymgruppeSpeichern(id|null, begriffe: string)` (Komma-getrennt, 2–10 Begriffe, je 2–60 Zeichen), `synonymgruppeLoeschen(id)`, `sucheSpeichern(name, adresse)` (nur Adressen, die `leseFilter`/`filterZuUrl` unverändert lassen), `sucheLoeschen(id)`, `sucheUmbenennen(id, name)`, `abschlussSetzen(stufe|null)`.
- Stellenliste: Knopf „Suche speichern“ (Name abfragen), Liste „Meine Suchen“ über den Filtern; an jeder Stelle im „…“-Menü „Firma nie mehr zeigen“.
- Konto: Abschnitte „Gesperrte Firmen“ (mit „Wieder zeigen“), „Synonymgruppen“, „Meine Suchen“, „Mein Abschluss“.
- Export: die vier Tabellen als zusätzliche Abschnitte bzw. Datei (Muster des bestehenden Exports).

- [ ] **Step 1: Tests:** Grenzen (201. Firma, 51. Gruppe, 31. Suche → Meldung); fremde Adresse (`https://…`) abgelehnt; Review Focus 5.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „5: Sperrliste, Synonyme, gespeicherte Suchen“ + `Agent: Codex`.

### Task 8: Doku und Halt

- [ ] `docs/STATUS.md` (Nutzer-To-dos: Migration 021), `docs/ENTSCHEIDUNGEN.md` (Spaltennamen, `NACHHOL_MAX`, Wikidata-Eigenschaften), `docs/phasen-vorarbeit.md` (Phase 5 als geplant markieren), `docs/agenten-protokoll.md`, Warteschlange Nr. 12 → `🛑`. Commit „5: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt:** Nutzer spielt Migration 021 ein; Claude startet einen Lauf, prüft Stichproben je Filter live (mit und ohne Rangliste, als Gast und angemeldet) und führt einen Klicktest mit Wegwerf-Konto `…@example.com` durch (Sperren, Synonym, Suche speichern, Handy-Breite); Nutzer sieht sich die Filterseite an.
