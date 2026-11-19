# Phase 4g-1: Stelle aus Jobportal-Link auf der Firmenseite finden – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag über `docs/codex-warteschlange.md` (Nr. 9), ab Task 1. Setzt Link-Schnellstart (Migration 012, `scraper/nachruesten.py`), 4b (`erkenne_portal`), 4c (`scraper/einrichtung.py`, `scraper/quellen/wikidata.py`) und 4e (Zusatzfirmen) voraus.

**Goal:** Ein Link von LinkedIn, StepStone, Indeed oder XING (eingefügt oder per Chrome-Erweiterung) führt zur kompletten Stelle von der Karriereseite der Firma, ohne das Portal je aufzurufen: bekannte Firmen sofort, unbekannte im Nachtlauf; bei mehreren oder nur ähnlichen Titeln wählt der Nutzer.

**Architecture:** Firma und Titel kommen aus der Adresse (`analysiereLink`) oder dem Tab-Titel der Erweiterung. Website: `web/lib/original-suche.ts` vergleicht Titel ohne KI und sucht sofort in `jobs`; ohne bekannte Firma wird die Bewerbung mit `original_suche = 'offen'` markiert. Nachtlauf: `scraper/original_suche.py` findet Website (Wikidata), Portal (4c-Einrichtung) und Stelle (Adapter), vergleicht mit denselben Regeln (gemeinsame Fixture) und füllt die Bewerbung über die Nachrüst-Funktion aus dem Link-Schnellstart. Gefundenes landet nur in der Bewerbung, nie in `jobs` oder `companies`.

**Tech Stack:** Next.js 16 Server Actions, `node --test`; Python 3 (`requests`), pytest mit Attrappen; Supabase (Migration 020).

**Spec:** `docs/superpowers/specs/2026-11-17-phase4-firmen-ranglisten-design.md` Abschnitt 4g inkl. „Ergänzung 2026-11-19 (Q107–Q110)“; CLAUDE.md 4.4; Q16, Q69–Q71.

## Global Constraints

- **Jobportale werden nie abgerufen** (Q16, Q69): vor jedem Abruf in TS `istPortal` (`web/lib/stellen-import.ts`), in Python dieselbe Liste wie `PORTALE`; Test, dass bei Portal-Hosts der Abruf-Attrappe nie aufgerufen wird.
- Gefundene Stellen unbekannter Firmen werden **nur** in die Bewerbung geschrieben (`applications`), nie in `jobs`/`companies` (Q108). „Firma dauerhaft beobachten“ ruft die Zusatzfirma-Action aus 4e auf und unterliegt deren Grenze (50, Admin unbegrenzt).
- Titelvergleich ohne KI, in TS und Python identisch (Fixture `tests/fixtures/titel-vergleich.json`, beide Testsuiten lesen sie): Geschlechtszusätze entfernen (`(m/w/d)`, `(w/m/d)`, `(m/f/d)`, `(f/m/d)`, `(d/m/w)`, `(all genders)`, `(gn)`, `(m/w/x)`, `*in`, `:in`), klein, Satzzeichen → Leerzeichen. „gleich“ = normalisiert identisch; „ähnlich“ = Anteil gemeinsamer Wörter bezogen auf den kürzeren Titel ≥ 0,5 (Füllwörter `und, and, of, für, for, the, der, die, das, im, in, m, w, d` zählen nicht). Ort nur vergleichen, wenn beide bekannt.
- Ergebnis je Suche: genau ein gleicher Titel → übernehmen; mehrere gleiche oder nur ähnliche → bis zu 5 zur Auswahl (gleiche zuerst, dann nach Ähnlichkeit) (Q109); keine → `nicht_gefunden`.
- Meldungen wörtlich: „Original wird heute Nacht auf der Karriereseite der Firma gesucht.“ · „Original nicht gefunden.“ · „Welche dieser Stellen ist es?“ mit Knopf „Keine davon“ · Portal-Link ohne Firma: „Aus diesem Link kann jobradar die Firma nicht lesen. Bitte Firma und Titel eintragen – die Chrome-Erweiterung macht das automatisch.“
- Nachtlauf: höchstens 20 Suchen je Nacht; Abrufe nur über `scraper/http.py` (robots.txt, 1 Anfrage/s je Domain, User-Agent); Wikidata nur bei **genau einem** Treffer mit Website (Q110), sonst `nicht_gefunden`.
- **Logs nur Zahlen** (Firmennamen aus Bewerbungen sind persönliche Daten, und das Log des öffentlichen Repos ist öffentlich): z. B. `Original-Suche: 4 gesucht, 2 gefunden, 1 Auswahl, 1 nicht gefunden`.
- Eingaben des Nutzers gehen vor; ein bestehender Link einer anderen eigenen Bewerbung auf dieselbe Originalstelle → nichts überschreiben, Hinweis „Diese Stelle hast du schon“ mit Link (nie automatisch zusammenführen).
- Migration nur als Datei: `supabase/migrations/020_original_suche.sql` (018/019 sind für Phase 6 reserviert).
- AGENTS.md: keine `.env`, keine Live-DB, kein Push; Commits mit `Agent: Codex`.

## Review Focus

1. Firma aus dem Link passt auf zwei jobradar-Firmen („Siemens“ ↔ „Siemens AG“, „Siemens Energy“) und beide haben den gleichen Titel → Auswahl, nie automatische Übernahme (Test Task 2).
2. Nutzer hat dieselbe Stelle schon über den Original-Link angelegt → kein Duplikat, Hinweis mit Link (Test Task 2 und 4).
3. Wikidata kennt zwei Firmen gleichen Namens → `nicht_gefunden`, kein Raten (Test Task 4).
4. Website gefunden, aber Portal ohne Adapter (z. B. Workday ohne Sitemap) → `nicht_gefunden`, Bewerbung unverändert (Test Task 4).
5. Bewerbung wurde vor dem Nachtlauf gelöscht oder auf eine Stelle gesetzt → still überspringen (Test Task 4).

---

### Task 0 (Claude, nicht Codex): Nutzungsbedingungen und Tab-Titel

- [ ] Offene Prüfung aus Q16: aktuelle Nutzungsbedingungen von LinkedIn, StepStone, Indeed, XING zu (a) Speichern von Adresse und Titel durch den Nutzer selbst, (b) Suche derselben Stelle auf der Firmenseite. Nur die Rechtstexte lesen (Nutzerauftrag Q16), keine Stellenseiten. Ergebnis mit Quellen in `docs/ENTSCHEIDUNGEN.md`; widerspricht etwas, 🛑 Rückfrage an den Nutzer.
- [ ] Nutzer kopiert aus dem eigenen Browser je Portal 2–3 Tab-Titel geöffneter Anzeigen (Nutzer-To-do); Claude legt sie anonymisiert (fiktive Firmen/Titel, gleiche Form) als `tests/fixtures/tab-titel.json` an: `[{host, tab_titel, firma, titel}]`.

### Task 1: Titelvergleich und Tab-Titel (TS und Python)

**Files:**
- Create: `web/lib/original-suche.ts`, `scraper/titel_vergleich.py`, `tests/fixtures/titel-vergleich.json`, `web/tests/original-suche.test.ts`, `tests/test_titel_vergleich.py`

**Interfaces:**
- TS: `normTitelStreng(s: string): string`; `aehnlichkeit(a: string, b: string): number`; `vergleiche<T extends { titel: string; ort?: string | null }>(titel: string, ort: string | null, kandidaten: T[]): { art: "eindeutig"; treffer: T } | { art: "auswahl"; treffer: T[] } | { art: "keine" }`; `ausTabTitel(tabTitel: string, host: string): { firma?: string; titel?: string }` (Trennzeichen ` | `, ` - `, ` – `; Portalname-Teil entfernen; Reihenfolge je Portal laut Fixture).
- Python: `norm_titel_streng`, `aehnlichkeit`, `vergleiche(titel, ort, kandidaten) -> dict` mit denselben Rückgaben (`{"art": "eindeutig", "treffer": k}` usw.).
- Fixture `titel-vergleich.json`: `[{titel, ort, kandidaten: [{titel, ort}], erwartet: {art, indizes}}]`, mindestens 12 Fälle inkl. Review Focus 1, Geschlechtszusätze, „Data Analyst“ ↔ „Data Analyst Controlling (m/w/d)“ (ähnlich), „Data Analyst“ ↔ „Datenanalyst“ (keine), verschiedene Orte bei gleichem Titel.

- [ ] **Step 1: Tests** in beiden Sprachen über alle Fixture-Fälle; `ausTabTitel` über `tests/fixtures/tab-titel.json`.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q tests/test_titel_vergleich.py` und in `web/`: `npm test` grün.
- [ ] **Step 5: Commit** — „4g: Titelvergleich ohne KI (TS und Python)“ + `Agent: Codex`.

### Task 2: Migration 020 und Sofort-Suche beim Anlegen

**Files:**
- Create: `supabase/migrations/020_original_suche.sql`
- Modify: `web/app/bewerbungen/actions.ts` (`bewerbungAusLink`, Schritt 2), `web/lib/stellen-import.ts` (`importiereStelle`), `web/lib/bewerbung-anlegen.ts`, `web/lib/original-suche.ts`, `web/app/bewerbungen/knoepfe.tsx`
- Test: `web/tests/original-suche.test.ts`

**Interfaces:**
- Migration: `applications` + `portal_link text`, `original_suche text check (original_suche in ('offen','auswahl','gefunden','nicht_gefunden'))`, `original_vorschlaege jsonb` (`[{titel, ort, job_id?, url?, ats_typ?, ats_id?, ext_id?}]`, höchstens 5), `original_wahl int`, `original_portal jsonb` (`{typ, id}` für den Beobachten-Knopf); Index auf `original_suche` wo `= 'offen'`. RLS unverändert (Zeilen gehören dem Nutzer).
- `snapshotAusJob(job: JobZeile): Partial<Bewerbung>` aus `anlegenAusJob` herausziehen (gleiche Felder wie heute), damit eine bestehende Bewerbung nachträglich auf eine Stelle gesetzt werden kann.
- `ordneOriginalZu(sb, app: { id, firma, titel, ort? }, dep?): Promise<"gefunden"|"auswahl"|"offen"|"nicht_gefunden">`: Kandidaten = sichtbare offene `jobs`, deren `unternehmen` per `firmaPasst` passt; keine passende Firma → `offen` (Nachtlauf); sonst `vergleiche` → `eindeutig`: Bewerbung bekommt `job_id` + `snapshotAusJob`, `link` = Stellen-URL, `portal_link` = Portal-Link; `auswahl`: `original_vorschlaege` mit `job_id`; `keine`: `nicht_gefunden`.
- `bewerbungAusLink`: bei Portal-Host (`istPortal`) ersetzt `ordneOriginalZu` den heutigen Schritt 2; der heutige Schritt 3 (Boards unter dem Firmennamen, schon heute sofort) läuft weiter, bevor `offen` gesetzt wird. Ablauf: Bewerbung mit `link` = Portal-Link anlegen, dann `ordneOriginalZu`. Portal-Link ohne Firma und ohne Eingabe → `{ brauchtEingabe: true, grund: "portal_ohne_firma" }` mit Meldung aus Global Constraints. Dublettenprüfung zusätzlich über `portal_link`.
- `importiereStelle`: bei Portal-Host Firma/Titel per `ausTabTitel`, nach dem Anlegen `ordneOriginalZu`.

- [ ] **Step 1: Tests** (Attrappen für Supabase): eindeutiger Treffer setzt `job_id` und `portal_link`; Review Focus 1 und 2; unbekannte Firma → `offen`; Portal-Link ohne Firma → `brauchtEingabe`; für Portal-Hosts wird kein Abruf ausgelöst.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün; SQL-Prüftest `py -m pytest -q tests/test_sql_pruefung.py` grün.
- [ ] **Step 5: Commit** — „4g: Originalstelle zu Portal-Links sofort suchen, Migration 020“ + `Agent: Codex`.

### Task 3: Auswahl, Hinweise und „Firma dauerhaft beobachten“

**Files:**
- Modify: `web/app/bewerbung/[id]/inhalt.tsx`, `web/app/bewerbungen/actions.ts`
- Test: `web/tests/original-suche.test.ts`

**Interfaces:**
- Anzeige je `original_suche`: `offen` → Hinweis „Original wird heute Nacht …“; `auswahl` → „Welche dieser Stellen ist es?“ mit bis zu 5 Zeilen (Titel, Ort) und Knopf je Zeile, dazu „Keine davon“; `nicht_gefunden` → „Original nicht gefunden.“; `gefunden` mit `original_portal` und Firma nicht in `companies` → Knopf „Firma dauerhaft beobachten“.
- `originalWaehlen(appId: string, index: number)`: Vorschlag mit `job_id` → wie `eindeutig` in Task 2; Vorschlag ohne `job_id` (aus dem Nachtlauf) → `original_wahl = index`, `original_suche = 'offen'` (der Nachtlauf holt genau diese Stelle).
- `keinOriginal(appId)`: `original_suche = 'nicht_gefunden'`, Vorschläge leeren.
- `firmaBeobachten(appId)`: ruft die Zusatzfirma-Action aus 4e (Task 2, Formular „Eigene Firma hinzufügen“) mit Firmenname und Stellen-URL; deren Fehlermeldungen unverändert anzeigen.

- [ ] **Step 1: Tests:** Wahl mit `job_id` verknüpft sofort; Wahl ohne `job_id` setzt `offen` + `original_wahl`; fremde Bewerbung (anderer Owner) → Fehler; Index außerhalb → Fehler.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „4g: Auswahl der Originalstelle und Firma beobachten“ + `Agent: Codex`.

### Task 4: Nachtlauf für unbekannte Firmen

**Files:**
- Create: `scraper/original_suche.py`, `tests/test_original_suche.py`
- Modify: `scraper/quellen/wikidata.py` (`website_zu_name`), `scraper/einrichtung.py` (`finde_portal` herausziehen), `scraper/nachruesten.py` (`fuelle` herausziehen), `scraper/db.py`, `scraper/run.py` (Aufruf nach `nachruesten.lauf`, in `try/except`), `tests/fakedb.py`

**Interfaces:**
- `wikidata.website_zu_name(name: str, holen=http.hole) -> str | None`: Wikidata-Suche nach Namen (Organisationen), Website (P856); genau ein Treffer mit Website → Adresse, sonst `None` (Review Focus 3).
- `einrichtung.finde_portal(website: str, holen=http.hole) -> dict | None` (`{typ, id}`; gleiche Schritte wie `richte_ein`, ohne `companies` zu ändern); `richte_ein` nutzt sie danach selbst.
- `nachruesten.fuelle(app_id: str, html: str, frage=ki.frage_groq) -> None`: Gliederung, Steckbrief, Groq-Zusammenfassung wie im Link-Schnellstart, aus dem Anzeigen-HTML.
- `db.bewerbungen_original_offen(limit=20) -> list[dict]` (`id, firma, titel, standort, original_wahl, original_vorschlaege, job_id`), `db.setze_original(app_id, patch)`.
- `original_suche.lauf(holen=http.hole, adapter=ADAPTER, frage=ki.frage_groq) -> dict` (Zähler): je Bewerbung (überspringen, wenn inzwischen `job_id` gesetzt, Review Focus 5) → `original_wahl` gesetzt: genau diese Stelle über ihren Adapter holen; sonst Website → Portal → `adapter[typ](id)` → `vergleiche` → `eindeutig`: `fuelle`, `link` = Stellen-URL, `portal_link` behalten, `original_portal`, `original_suche = 'gefunden'`; `auswahl`: Vorschläge mit `url, ats_typ, ats_id, ext_id`; sonst `nicht_gefunden`. Hat der Nutzer eine andere Bewerbung mit derselben URL → `nicht_gefunden` + Vorschlag leer, Hinweis über Task 3 (Review Focus 2). Nie `jobs`/`companies` schreiben. Log nur Zähler.

- [ ] **Step 1: Tests** mit FakeDB und Attrappen: eindeutig → Patch mit Text und `gefunden`; Review Focus 2–5; 25 offene → 20 bearbeitet; Log enthält keinen Firmennamen aus den Testdaten; FakeDB ohne Spalten (Migration 020 offen) → Nullen, Hinweis, kein Fehler.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „4g: Nachtlauf sucht Originalstellen unbekannter Firmen“ + `Agent: Codex`.

### Task 5: Doku und Halt

- [ ] `docs/STATUS.md` (Nutzer-To-dos: Migration 020; 5 eigene Portal-Links für die Prüfung bereithalten), `docs/ENTSCHEIDUNGEN.md` (Funde nur in der Bewerbung; Titelvergleich-Regeln; höchstens 20 Suchen je Nacht), `docs/agenten-protokoll.md`, Warteschlange Nr. 9 → `🛑`. Commit „4g: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt:** Nutzer spielt Migration 020 ein. Claude legt mit 5 Portal-Links des Nutzers Bewerbungen auf einem Wegwerf-Konto `…@example.com` an (jobradar ruft dabei kein Portal auf), startet die Original-Suche von Hand und berichtet: gefunden / Auswahl / nicht gefunden je Link; danach Wegwerf-Konto löschen.
