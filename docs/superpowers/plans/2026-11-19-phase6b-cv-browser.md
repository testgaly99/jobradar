# Phase 6b: CV-Abgleich im Browser – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag über `docs/codex-warteschlange.md` (Nr. 10). Setzt 6a vollständig voraus (Migration 018, `web/lib/cv-regeln.json`, Modelldatei, `web/lib/cv-ergebnis.ts`).

**Goal:** Alle angemeldeten Nutzer außer dem Admin bekommen den CV-Abgleich kostenlos im eigenen Browser; der Admin bekommt beim Merken sofort vorläufige Farben aus Stufe 1, die der Nachtlauf ersetzt (Q103).

**Architecture:** Ein Web Worker lädt dieselbe e5-small-Datei aus `/modell/e5-small/` über `@huggingface/transformers` (nur lokal, keine Hugging-Face-Abrufe) und wendet dieselben Regeln aus `cv-regeln.json` an wie `scraper/cv_stufe1.py`. Grenzfälle prüft Chromes eingebautes Modell (Prompt API), falls vorhanden; sonst bleiben sie Gelb. Das Ergebnis wird in `cv_ergebnisse` gespeichert (`weg 'browser'` bzw. `'browser-vorlaeufig'` beim Admin).

**Tech Stack:** Next.js 16 / TypeScript, `@huggingface/transformers`, `pdfjs-dist`, `mammoth` (Pflegezustand prüft Task 1), `node --test`, webapp-testing (Python + Playwright) für den Klicktest.

**Spec:** `docs/superpowers/specs/2026-11-19-phase6-cv-abgleich-design.md` (Gemeinsamer Kern, 6b, Q103); Plan 6a für Spalten und Regeln.

## Global Constraints

- Das CV verlässt das Gerät nur zur eigenen Supabase-Datenbank; nie an einen KI-Anbieter, nie an Hugging Face. `env.allowRemoteModels = false`, Modellpfad `/modell/e5-small/`.
- Stufe 1 im Browser muss bei gleichen Ähnlichkeitswerten **exakt** dieselben Entscheidungen treffen wie `scraper/cv_stufe1.py` (`bewerte`, `waehle`) – geprüft mit `tests/fixtures/cv-aehnlichkeiten.json` aus 6a.
- Farben, Gründe, Labels und Beleg-Regel wie in Plan 6a („Global Constraints“), unverändert aus `web/lib/cv-ergebnis.ts`.
- Ohne Chromes Modell kein Rot; Grenzfälle `gelb` mit Grund `nicht_automatisch` (Label „nicht automatisch prüfbar“; neuer Eintrag in `LABEL`).
- Admin (`istAdmin`): nur Stufe 1, nie Chromes Modell; gespeichert mit `weg 'browser-vorlaeufig'`; Grenzfälle grau mit „wird heute Nacht genauer geprüft“, oben Hinweis „vorläufig“. Überschreibt nie ein Ergebnis mit `weg 'claude'`.
- Ein vorhandenes gültiges Ergebnis wird nicht neu berechnet (A11).
- Der Abgleich läuft im Web Worker und blockiert die Seite nicht; Fehler zeigen „Abgleich nicht möglich“ und lassen die Seite benutzbar.
- Profil im Browser ohne Sprachmodell: Sätze und Stichpunkte des CV-Texts (getrennt an Zeilenumbrüchen und Satzenden, mindestens 3 Wörter) sind Aussage = Beleg.
- Keine Migration erwartet (018 erlaubt `browser-vorlaeufig` schon). Braucht es doch eine, als `019_…sql` und 🛑.

## Review Focus

1. Browser ohne Chromes Modell (Firefox, Safari, älteres Chrome): Grün/Gelb, kein Rot, Hinweis „nicht automatisch prüfbar“ (Test Task 3).
2. Gescannte PDF ohne Textebene: Hinweis „Kein Text erkannt – bitte in der Vorschau einfügen“, kein Abgleich mit leerem Text (Test Task 1).
3. Admin merkt eine Stelle, für die schon ein Claude-Ergebnis existiert: nichts wird überschrieben (Test Task 4).
4. Modelldatei lädt nicht (offline, 404): „Abgleich nicht möglich“, Merken funktioniert trotzdem (Test Task 2).
5. Zwei Tabs rechnen dieselbe Stelle gleichzeitig: ein Ergebnis bleibt (Upsert auf `(owner_id, job_id)`), kein Fehler (Test Task 4).

---

### Task 1: CV-Text im Browser auslesen

**Files:**
- Create: `web/lib/cv-text.ts`, `web/tests/cv-text.test.ts`
- Modify: `web/app/dokumente/upload.tsx`, `web/app/dokumente/actions.ts`, `web/package.json`

**Interfaces:**
- `textAusDatei(datei: File) -> Promise<string>`: PDF über `pdfjs-dist` (Textebene, Seiten mit `\n` verbunden), `.docx` über `mammoth` (`extractRawText`); anderes Format → `""`.
- `saetze(text: string) -> string[]` (Profil-Regel aus Global Constraints).
- Upload: nach dem Hochladen Text auslesen und `cv_texte` mit `herkunft 'ausgelesen'` bzw. `'leer'` speichern (bestehende Action `cvTextSpeichern` aus 6a erweitern, Herkunft als Parameter). Ab jetzt liest der Nachtlauf (6a) Text nur noch, wenn keiner da ist, und für den Admin bei `'leer'` per Claude.

- [ ] **Step 0:** Pflegezustand und Lizenz der drei Pakete in `docs/agenten-protokoll.md`.
- [ ] **Step 1: Tests:** `saetze` trennt Stichpunkte und Sätze, verwirft Zweiwortzeilen; leerer Text → `[]` und Hinweistext (Review Focus 2); `.txt` → `""`.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit` grün.
- [ ] **Step 5: Commit** — „6b: CV-Text im Browser auslesen“ + `Agent: Codex`.

### Task 2: Stufe 1 im Web Worker

**Files:**
- Create: `web/lib/cv-stufe1.ts` (reine Regeln), `web/app/cv-abgleich.worker.ts`, `web/tests/cv-stufe1.test.ts`

**Interfaces:**
- `bewerte(...)`, `waehle(...)`, `fachbegriffe(...)`: gleiche Namen, Parameter und Rückgaben wie `scraper/cv_stufe1.py` (6a, Task 3), Regeln aus `web/lib/cv-regeln.json`.
- Worker-Nachricht `{art: "abgleich", anforderungen, cvs: [{id, text, hash, standard}]}` → Antwort `{art: "fertig", bewertungen, empfohlen}` oder `{art: "fehler", grund}`. Einbettung über `pipeline("feature-extraction", "e5-small", {pooling: "mean", normalize: true})` mit lokalem Pfad, Präfixe `query: `/`passage: `.

- [ ] **Step 1: Tests:** mit `tests/fixtures/cv-aehnlichkeiten.json` liefern `bewerte`/`waehle` dieselben Ergebnisse wie die erwarteten Werte aus 6a (Fixture um die Python-Ergebnisse ergänzen, falls noch nicht drin); Fehler beim Modellladen → `{art: "fehler"}` (Review Focus 4, mit Attrappe für `pipeline`).
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün (Build prüft, dass der Worker gebündelt wird).
- [ ] **Step 5: Commit** — „6b: Bedeutungsvergleich im Browser“ + `Agent: Codex`.

### Task 3: Stufe 2 mit Chromes Modell

**Files:**
- Create: `web/lib/cv-chrome.ts`, `web/tests/cv-chrome.test.ts`
- Modify: `web/lib/cv-ergebnis.ts` (`LABEL.nicht_automatisch`)

**Interfaces:**
- `chromeVerfuegbar() -> Promise<boolean>`: `typeof LanguageModel !== "undefined" && (await LanguageModel.availability()) === "available"`; sonst `false` (kein Download auslösen).
- `pruefeGrenzfaelle(grenzfaelle, belege, cvText) -> Promise<Ergebnis[]>`: eine Sitzung, Anweisung auf Deutsch mit JSON-Schema (`responseConstraint`), Antwort durch dieselbe Prüfung wie 6a (`antwort_pruefen` als TS-Funktion `antwortPruefen` in dieser Datei): Beleg nicht wörtlich → `nicht_pruefbar`; Rot ohne Begründung → `nicht_pruefbar`.
- Ohne Chrome-Modell: Grenzfälle → `gelb`/`nicht_automatisch`.

- [ ] **Step 0:** Aktuelle Chrome-Doku zur Prompt API lesen (Verfügbarkeit auf normalen Webseiten ohne Origin Trial, Namen `LanguageModel.availability/create`, `responseConstraint`); Abweichungen im Protokoll und im Code übernehmen.
- [ ] **Step 1: Tests (Attrappe für `LanguageModel`):** nicht vorhanden → kein Rot (Review Focus 1); erfundener Beleg → `nicht_pruefbar`; gültiges Rot mit Beleg bleibt Rot.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit` grün.
- [ ] **Step 5: Commit** — „6b: Grenzfälle mit Chromes eingebautem Modell“ + `Agent: Codex`.

### Task 4: Auslöser, Speichern und Anzeige

**Files:**
- Create: `web/app/cv-abgleich.tsx` (Client-Komponente, startet den Worker), `web/tests/cv-ausloeser.test.ts`
- Modify: `web/app/stellen/[id]/page.tsx`, `web/app/stellen/actions.ts` (Merken), `web/app/dokumente/upload.tsx`, `web/app/abschnitte.tsx`, `web/lib/cv-ergebnis.ts`

**Interfaces:**
- `sollRechnen({istAdmin, vorhanden, gueltig}) -> "browser"|"browser-vorlaeufig"|null`: gültiges Ergebnis → `null`; Admin mit vorhandenem `weg 'claude'` (gültig) → `null`; Admin sonst → `"browser-vorlaeufig"`; andere → `"browser"`.
- Auslöser: Öffnen einer Stellenseite ohne gültiges Ergebnis, Merken (danach), Upload/Korrektur eines CV (rechnet die gemerkten Stellen des Nutzers nach, höchstens 20 pro Seitenbesuch, gemerkte zuerst).
- Speichern: Upsert in `cv_ergebnisse` auf `(owner_id, job_id)` mit Prüfsummen aus 6a; vor dem Schreiben erneut lesen und nicht schreiben, wenn inzwischen ein gültiges `claude`-Ergebnis da ist (Review Focus 3, 5).
- Anzeige: während der Rechnung „Wird abgeglichen …“; vorläufig (Admin): Hinweis „vorläufig“, Grenzfälle grau mit „wird heute Nacht genauer geprüft“ (Farbe-Token `--cv-vorlaeufig`).

- [ ] **Step 1: Tests:** `sollRechnen` für alle vier Fälle; Upsert-Attrappe: zwei gleichzeitige Aufrufe → eine Zeile.
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „6b: Abgleich beim Merken, Öffnen und CV-Upload“ + `Agent: Codex`.

### Task 5: Klicktest, Doku und Halt

- [ ] Klicktest-Skript `tests/klick/cv_browser.py` (webapp-testing, `channel="chrome"`, Wegwerf-Konto `…@example.com`, künstlicher CV aus `docs/beispiele/cv-abgleich.json` als PDF erzeugt): Einwilligung, Upload, Stelle öffnen, Markierungen und Labels sichtbar, kein Rot ohne Chrome-Modell. Läuft erst am Halte-Punkt (braucht `.env` und Live-DB) – Codex schreibt es nur.
- [ ] `docs/STATUS.md`, `docs/ENTSCHEIDUNGEN.md` (Profil = Sätze; `nicht_automatisch`; Admin-Vorläufig überschreibt nie Claude), `docs/agenten-protokoll.md`, Datenschutzerklärung prüfen (Browser-Abgleich schon in 6a beschrieben), Warteschlange Nr. 10 → `🛑`. Commit „6b: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkte (Design 6b):** (a) Migration 019 nur falls angelegt; (b) Claude startet den Klicktest mit Wegwerf-Konto in Chrome mit und ohne eingebautes Modell und löscht das Konto danach; Nutzer sieht sich das Ergebnis an; Admin-Sofortfarben prüft der Nutzer mit seinem Konto an einer gemerkten Stelle.
