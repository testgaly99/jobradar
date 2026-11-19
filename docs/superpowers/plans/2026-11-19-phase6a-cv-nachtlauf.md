# Phase 6a: CV-Abgleich im Nachtlauf (Admin) – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag über `docs/codex-warteschlange.md` (Nr. 10). Setzt 4d (`admins`) und 4f (`abgleich_stichwoerter`, `db.admin_id()`) voraus.

**Goal:** Jede Nacht um 03:00 deutscher Zeit gleicht ein Lauf die gemerkten Stellen des Admins (und Titel-Treffer aus „Automatisch abgleichen bei“) mit allen seinen CV-Versionen ab; die Stellenseite markiert jede Anforderung farbig mit Beleg und empfiehlt die beste CV-Version.

**Architecture:** Der Scraper zerlegt Anforderungs-Abschnitte in `jobs.anforderungsliste`. `scraper/cv_abgleich.py` liest die CVs des Admins, lässt Claude (unverändertes `claude -p`, Haiku) ein Profil mit wörtlichen Belegen erstellen, wählt mit Stufe 1 (`multilingual-e5-small`, ONNX, im Repo) die beste(n) Version(en) und schickt nur Grenzfälle gebündelt an Claude. Ergebnisse liegen in `cv_ergebnisse` mit Prüfsummen; Datenbank-Trigger löschen veraltete. Der Workflow läuft im privaten Repo; Code und Modelldatei liegen im öffentlichen Repo.

**Tech Stack:** Python 3 (`onnxruntime`, `tokenizers`, `pypdf`, `python-docx`; Task 0 prüft Pflegezustand), pytest mit Attrappen; Next.js 16 / TypeScript; Supabase (Migration 018); GitHub Actions; Claude Code CLI.

**Spec:** `docs/superpowers/specs/2026-11-19-phase6-cv-abgleich-design.md` (Gemeinsamer Kern, 6a, Einwilligung); Anforderungen A1–A13 und Abschnitt „Kontingent und Abo-Bedingungen“ in `docs/plans/2026-11-16-cv-abgleich.md`; Abnahmefall `docs/beispiele/cv-abgleich.json`.

## Global Constraints

- **Abo-Weg:** nur das unveränderte Programm `claude -p` (npm-Paket `@anthropic-ai/claude-code`) mit `CLAUDE_CODE_OAUTH_TOKEN`; kein Agent SDK, kein eigener HTTP-Aufruf an Anthropic, kein `ANTHROPIC_API_KEY` im Workflow. Modell `haiku`. Nur Daten des Admins (`db.admin_id()`).
- **Codex selbst** ruft `claude -p` nie mit echtem Token auf und berührt keine Live-DB; Tests nutzen Attrappen für den Prozessaufruf.
- **Logs:** nie CV-Text, Anzeigentext, Prompt oder Claude-Antwort ausgeben; nur Zahlen und Gründe, z. B. `CV-Abgleich: 12 Stellen, 3 Aufrufe, Abbruch: Limit`.
- **Grenze:** höchstens 50 Stellen je Nacht (Konstante `MAX_STELLEN = 50`); bis zu 5 Stellen je Stufe-2-Aufruf (`BUENDEL = 5`). Am Abo-Limit oder bei einem Fehler von Claude Code: sofort aufhören, nichts wiederholen, Rest in der nächsten Nacht.
- **Farben/Gründe (Werte exakt):** `gruen` „belegt“, `gelb` mit Grund `teilweise` („teilweise“) oder `nicht_belegt` („noch nicht belegt“) oder `nicht_pruefbar` („konnte nicht geprüft werden“), `rot` „nicht erfüllt“. Rot nur aus Stufe 2 mit Begründung, die einen wörtlichen CV-Beleg enthält. Stufe 1 erzeugt nie Rot.
- **Beleg-Regel (A5):** jeder Beleg (Profil und Stufe 2) muss buchstabengetreu (`beleg in cv_text`) im CV-Text der genannten Version stehen; sonst Aussage verwerfen bzw. Anforderung → `gelb`/`nicht_pruefbar`.
- **Keine Mischung (A7):** ein Ergebnis nutzt je Anforderung Belege aus genau der empfohlenen Version; bei zwei empfohlenen Versionen gibt es je Version eine vollständige Spalte.
- **Stufe-1-Regeln** stehen einmal in `web/lib/cv-regeln.json` (Python liest dieselbe Datei; 6b nutzt sie im Browser): `{"oben": <zahl>, "unten": <zahl>, "fachbegriff": "<regex>", "soll_woerter": ["wünschenswert","idealerweise","von vorteil","nice to have","plus"], "anforderungs_titel": [...]}`.
- **e5-Konvention:** Anforderungen mit Präfix `"query: "`, Belege mit `"passage: "`, Mean-Pooling, L2-normiert, Ähnlichkeit = Skalarprodukt.
- **Modelldatei:** `web/public/modell/e5-small/` (quantisierte ONNX-Datei, `tokenizer.json`, Lizenzdatei); nie zur Laufzeit von Hugging Face laden.
- **Datenschutz:** Tabellen nur für den Eigentümer (RLS), Gäste ohne Zugriff; Kontolöschung räumt alles per `on delete cascade`; CV-Tabellen nicht im Backup.
- **Migration nur als Datei:** `supabase/migrations/018_cv_abgleich.sql`, wiederholbar ausführbar (Muster der bisherigen Migrationen).
- **Abhängigkeiten:** nur die oben genannten; jede vor dem Hinzufügen in `docs/agenten-protokoll.md` begründen (wofür, gepflegt?).

## Review Focus

1. Stelle ohne erkennbaren Anforderungsabschnitt: leere Liste, kein Claude-Aufruf, Stellenseite zeigt „Kein Anforderungsabschnitt erkannt“ (Test Task 1, Task 5).
2. CV wird korrigiert oder gelöscht, während ein Ergebnis existiert: Ergebnis verschwindet sofort (Trigger), Stellenseite zeigt „Noch nicht abgeglichen“, nicht das alte (SQL-Test Task 2).
3. Claude liefert kaputtes JSON oder einen erfundenen Beleg: betroffene Anforderungen `gelb`/`nicht_pruefbar`, Lauf geht weiter (Test Task 4).
4. Abo-Limit mitten in Bündel 3 von 10: Bündel 1–2 sind gespeichert, keine weiteren Aufrufe, Exitcode 0, Log nennt „Abbruch: Limit“ (Test Task 4).
5. Admin ohne Einwilligung oder ohne CV: kein Aufruf, Log „übersprungen: keine Einwilligung“ bzw. „kein CV“ (Test Task 4).

---

### Task 0: Vorprüfung (ohne Produktcode)

- [ ] **Step 1:** Lizenz und Größe von `intfloat/multilingual-e5-small` und einer quantisierten ONNX-Fassung (z. B. `Xenova/multilingual-e5-small`, `onnx/model_quantized.onnx`) prüfen. Weiter nur bei offener Lizenz (MIT/Apache) und Datei ≤ 50 MB.
- [ ] **Step 2:** `claude --help` lokal lesen (ohne Anfrage): Schalter für Modell, JSON-Ausgabe, keine Werkzeuge bzw. nur `Read` für Bilddateien, Eingabe über stdin. Dokumentiertes Verhalten am Nutzungslimit (Exitcode/Text) in der offiziellen Doku suchen.
- [ ] **Step 3:** Pflegezustand von `onnxruntime`, `tokenizers`, `pypdf`, `python-docx` (letzte Version, Lizenz).
- [ ] **Step 4:** Ergebnis als Eintrag in `docs/agenten-protokoll.md` mit Quellen. **🛑 Wenn Step 1 scheitert: anhalten, Warteschlange auf „wartet auf Claude“.**
- [ ] **Step 5: Commit** — „6a: Vorprüfung Modell und Claude-CLI“ + `Agent: Codex`.

### Task 1: Anforderungsliste je Stelle

**Files:**
- Create: `scraper/anforderungen.py`, `web/lib/cv-regeln.json` (zunächst mit Platzhalter-Schwellen `oben: 0.9, unten: 0.8`, Task 3 kalibriert)
- Modify: `scraper/run.py` (bei neuen/geänderten Stellen), `scraper/db.py` (Schreiben der zwei Spalten; `anforderungen_nachruesten()` für offene Stellen mit `anforderungsliste is null`, Aufruf am Ende von `run`, höchstens 2.000 je Lauf; ebenso für Bewerbungen ohne `job_id` aus `snapshot_abschnitte`, wenn die Liste fehlt oder sich die Prüfsumme ändert, Q111)
- Test: `tests/test_anforderungen.py`

**Interfaces:**
- `zerlege(abschnitte: list[dict]) -> list[dict]`: Abschnitte, deren Titel (klein) einen Eintrag aus `anforderungs_titel` enthält (mindestens: „anforderung“, „profil“, „qualifikation“, „das bringst du mit“, „was du mitbringst“, „requirements“, „your profile“, „what you bring“, „qualifications“); je Punkt `{"id": sha1(text)[:10], "text": <punkt unverändert>, "muss": not soll}`; `soll`, wenn der Punkt (klein) ein `soll_woerter`-Wort als ganzes Wort enthält. Doppelte Texte einmal.
- `prufsumme(liste) -> str`: sha256 über `json.dumps(liste, ensure_ascii=False, sort_keys=True)`.
- Spalten (Task 2): `anforderungsliste jsonb`, `anforderungs_hash text` an `jobs` und `applications`. Fehlen sie (Migration offen), Hinweis im Log wie `_spalten_da()`, kein Fehler.

- [ ] **Step 1: Tests:** Anzeige aus `docs/beispiele/cv-abgleich.json` (über `abschnitte()` aus dem Text als einfaches HTML) ergibt die erwartete Zahl Anforderungen; „Power BI wünschenswert“ → `muss False`; „plus“ nur als ganzes Wort („Plusminus“ nicht); kein passender Titel → `[]` (Review Focus 1); gleiche Liste → gleiche Prüfsumme.
- [ ] **Step 2–4:** `py -m pytest -q tests/test_anforderungen.py` FAIL → umsetzen → grün; danach `py -m pytest -q` (ohne `-m supabase`) grün.
- [ ] **Step 5: Commit** — „6a: Anforderungsliste je Stelle“ + `Agent: Codex`.

### Task 2: Migration 018

**Files:**
- Create: `supabase/migrations/018_cv_abgleich.sql`
- Modify: `tests/test_rls.py` (neuer Test, Marker `supabase`, läuft nur beim Nutzer/Claude), `tests/test_sql_pruefung.py` falls dort Migrationen statisch geprüft werden

**Interfaces (Spaltennamen verbindlich für alle späteren Tasks und 6b):**
- `jobs` und `applications` (Q111): `anforderungsliste jsonb`, `anforderungs_hash text`.
- `documents`: `standard boolean not null default false`; eindeutiger Teilindex `(owner_id) where standard`.
- `cv_texte (dokument_id uuid primary key references documents on delete cascade, owner_id uuid not null default auth.uid() references auth.users on delete cascade, text text not null default '', herkunft text not null check (herkunft in ('ausgelesen','korrigiert','leer')), hash text not null, geaendert timestamptz not null default now())`.
- `cv_profile (dokument_id uuid primary key references documents on delete cascade, owner_id …, text_hash text not null, aussagen jsonb not null)` – `aussagen` = `[{aussage, beleg}]`.
- `cv_ergebnisse (owner_id uuid … , job_id text references jobs on delete cascade, application_id uuid references applications on delete cascade (genau eins von beiden gesetzt, `check`, Q111), weg text not null check (weg in ('claude','browser','browser-vorlaeufig')), empfohlen uuid[] not null, geprueft uuid[] not null, anforderungen jsonb not null, anforderungs_hash text not null, cv_hashes jsonb not null, erstellt timestamptz not null default now(), id bigint generated always as identity primary key)` mit eindeutigen Teilindizes `(owner_id, job_id)` und `(owner_id, application_id)`` – `anforderungen` = `[{id, je_cv: {<dokument_id>: {farbe, grund, beleg, begruendung}}}]`. (`browser-vorlaeufig` schon jetzt erlaubt, damit 6b keine Migration braucht – Claudes Entscheidung.)
- `cv_einwilligung (owner_id uuid primary key default auth.uid() references auth.users on delete cascade, erteilt_am timestamptz not null default now())`.
- RLS: alle vier Tabellen `for all to authenticated using/with check (owner_id = auth.uid())`; `anon` ohne Rechte; `cv_texte`/`cv_profile` nur für Dokumente des Eigentümers mit `art = 'cv'`.
- Trigger (Q31): nach `insert`/`update of hash`/`delete` auf `cv_texte` → `delete from cv_ergebnisse where owner_id = <owner>`; nach `update of anforderungs_hash` auf `jobs` (Wert geändert) → `delete from cv_ergebnisse where job_id = new.id`; ebenso auf `applications` (`where application_id = new.id`); nach `update of text_hash` auf `cv_profile` ebenso je Owner.

- [ ] **Step 1: Test** `test_cv_rls(users)`: Nutzer B sieht keine Zeile von A in den vier Tabellen; Gast sieht nichts; Ergebnis von A verschwindet nach Änderung des CV-Texts (Review Focus 2) und nach Änderung von `anforderungs_hash` der Stelle.
- [ ] **Step 2:** SQL schreiben; statische Prüfung `py -m pytest -q tests/test_sql_pruefung.py` grün. Der `supabase`-Test läuft erst am Halte-Punkt.
- [ ] **Step 3: Commit** — „6a: Migration 018 CV-Abgleich“ + `Agent: Codex`.

### Task 3: Stufe 1 in Python und Kalibrierung

**Files:**
- Create: `scraper/cv_stufe1.py`, `web/public/modell/e5-small/` (Modelldatei, `tokenizer.json`, `LICENSE`)
- Modify: `web/lib/cv-regeln.json` (kalibrierte Schwellen), `requirements.txt`
- Test: `tests/test_cv_stufe1.py`, `tests/fixtures/cv-aehnlichkeiten.json`

**Interfaces:**
- `einbetten(texte: list[str], art: "query"|"passage") -> list[list[float]]` (Konvention aus Global Constraints).
- `fachbegriffe(text: str) -> list[str]` mit Regex `fachbegriff` (Wörter mit Großbuchstaben im Wortinneren, Ziffern oder `+#/.`, z. B. „SQL“, „C++“, „S/4HANA“; normale großgeschriebene Substantive zählen nicht).
- `bewerte(anforderungen: list[dict], profil: list[dict], aehnlich: list[list[float]], regeln: dict) -> list[dict]`: je Anforderung `{"id", "stufe": "sicher"|"grenzfall"|"nicht_belegt", "beleg": str|None, "wert": float}`; `sicher` nur bei `wert >= oben` und allen Fachbegriffen wörtlich (ohne Groß/klein) im Beleg; `wert < unten` → `nicht_belegt`. Reine Funktion (ohne Modell), damit 6b dieselben Fälle prüfen kann.
- `waehle(bewertungen: dict[str, list[dict]], anforderungen, standard_id: str|None) -> list[str]`: Rangfolge mehr `sicher` bei Muss, dann bei Soll; zweite Version kommt dazu, wenn gleichauf oder genau eine Muss-Anforderung dahinter; bei Gleichstand Standard-CV zuerst, sonst Reihenfolge der Dokumentliste.

- [ ] **Step 1: Tests (ohne Modell):** `bewerte` mit `tests/fixtures/cv-aehnlichkeiten.json` (Task-Step 3 erzeugt sie mit dem echten Modell aus dem Abnahmefall) ergibt kein `sicher` für eine im Abnahmefall nicht belegte Anforderung (a5 Power BI); „SQL“ fehlt im Beleg → nie `sicher`; `waehle`: Gleichstand → Standard zuerst; Abstand genau eine Muss → zwei Versionen; zwei Muss → eine.
- [ ] **Step 2:** FAIL → umsetzen.
- [ ] **Step 3:** Modelldatei einchecken (`git add` einzeln je Datei), Ähnlichkeiten für den Abnahmefall berechnen, als Fixture speichern; Schwellen so wählen, dass alle Abnahmefälle stimmen und möglichst viele Fälle `sicher` oder `nicht_belegt` statt `grenzfall` werden. Werte und Begründung in `docs/agenten-protokoll.md`.
- [ ] **Step 4:** `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „6a: Stufe 1 Bedeutungsvergleich mit e5-small“ + `Agent: Codex`.

### Task 4: Nachtlauf mit Claude Code

**Files:**
- Create: `scraper/claude_cli.py`, `scraper/cv_abgleich.py`, `scraper/cv_prompt.md` (Abschnitte `## Profil`, `## Scan`, `## Grenzfaelle`)
- Modify: `scraper/db.py`, `requirements.txt`
- Test: `tests/test_claude_cli.py`, `tests/test_cv_abgleich.py`

**Interfaces:**
- `claude_cli.frage(prompt: str, bilder: list[Path] = (), run=subprocess.run) -> dict|list`: ruft `claude -p --model haiku` mit JSON-Ausgabe, Prompt über stdin, ohne Werkzeuge (mit `bilder` nur das Lese-Werkzeug für diese Dateien; genaue Schalter aus Task 0); liefert das geparste JSON aus dem Antworttext. Wirft `AboLimit` (Erkennung laut Task 0) oder `ClaudeFehler` (sonstiger Exitcode, kein JSON). Gibt nie Prompt oder Antwort aus.
- `cv_abgleich.text_lesen(datei: Path) -> str` (PDF-Textebene, Word-Text); `profil_pruefen(aussagen, cv_text) -> list` (verwirft Belege, die nicht wörtlich vorkommen); `antwort_pruefen(antwort, anforderungen, cv_texte) -> dict` (ungültige Farbe, fehlender/erfundener Beleg, Rot ohne Begründung → `gelb`/`nicht_pruefbar`).
- `cv_abgleich.main() -> int`: Admin bestimmen → Einwilligung → CVs (`documents.art = 'cv'`) laden, Dateien per Service-Schlüssel aus dem Speicher holen (temporärer Ordner, danach löschen) → fehlender/alter Text: auslesen; leer → Claude mit Seitenbildern (`## Scan`); weiter leer → `herkunft 'leer'` → fehlendes/altes Profil: Claude (`## Profil`) + `profil_pruefen` → Stellen: gemerkte (`applications.status = 'gemerkt'`; mit `job_id` über die Stelle, ohne `job_id` über die Bewerbung selbst, Q111) zuerst, dann offene Stellen mit Stichwort aus `abgleich_stichwoerter` im Titel (Wortanfang, wie Digest 4f), nur mit nicht leerer Anforderungsliste und ohne gültiges Ergebnis (fehlend oder `weg = 'browser-vorlaeufig'`), höchstens 50 → Stufe 1 → Bündel zu 5 an Claude (`## Grenzfaelle`, nur Grenzfälle der gewählten Versionen mit deren Profil-Belegen) → prüfen → speichern (`weg 'claude'`, Prüfsummen). Leerer CV-Text erzeugt nie Rot. Rückgabe immer 0; Log nur Zahlen.
- `db`: `cv_dokumente(owner)`, `lade_datei(pfad) -> bytes`, `speichere_cv_text(...)`, `speichere_profil(...)`, `stellen_fuer_abgleich(owner, grenze)`, `speichere_ergebnis(...)`, `hat_einwilligung(owner)`.

- [ ] **Step 1: Tests (Attrappe für `run`):** Antwort ok → Ergebnis gespeichert; Review Focus 3, 4, 5; Log enthält keinen Text aus CV oder Anzeige (Suchstring aus der Testanzeige darf in `capsys` nicht vorkommen); 12 Stellen → 3 Aufrufe; 60 Kandidaten → 50 bearbeitet; Stelle mit `browser-vorlaeufig` wird neu gerechnet; leerer CV → keine Anforderung `rot`.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „6a: Nachtlauf CV-Abgleich über Claude Code“ + `Agent: Codex`.

### Task 5: Website – Einwilligung, CV-Text, Standard, Anzeige, Datenschutz, Export

**Files:**
- Modify: `web/app/dokumente/page.tsx`, `web/app/dokumente/upload.tsx`, `web/app/dokumente/actions.ts`, `web/app/stellen/[id]/page.tsx`, `web/app/abschnitte.tsx`, `web/app/datenschutz/page.tsx`, `web/app/konto/page.tsx`
- Create: `web/lib/cv-ergebnis.ts`, `web/app/export/cv/route.ts`, `web/tests/cv-ergebnis.test.ts`

**Interfaces:**
- Dokumente: vor dem ersten CV-Upload Kasten mit Häkchen und exakt dem Text aus dem Design (Abschnitt „Einwilligung“); ohne Häkchen ist „Hochladen“ für CVs gesperrt, mit Häkchen wird `cv_einwilligung` angelegt (Action `einwilligen()`). Je CV: Knopf „Als Standard“ (`standardSetzen(id)`, setzt alle anderen auf `false`), Vorschau des CV-Texts mit „Korrigieren“ (`cvTextSpeichern(id, text)` → `herkunft 'korrigiert'`, neuer Hash); leerer Text: „Kein Text erkannt“. Löschen eines CV entfernt Datei und (per Kaskade) Text, Profil und Ergebnisse.
- `cv-ergebnis.ts`: `gueltig(ergebnis, anforderungsHash, cvHashes) -> boolean`; `markierung(punkt: string, liste, ergebnis, cvId) -> {farbe, label, beleg, begruendung, cvName} | null` (Zuordnung Punkt ↔ Anforderung über exakt gleichen Text); `LABEL = {gruen: "belegt", teilweise: "teilweise", nicht_belegt: "noch nicht belegt", nicht_pruefbar: "konnte nicht geprüft werden", rot: "nicht erfüllt"}`.
- Stellenseite (nur angemeldet, nur eigenes Ergebnis): markierte Punkte mit Farbe **und** Label; Klick/Enter öffnet Beleg bzw. Begründung mit CV-Namen (`<button>` mit `aria-expanded`); oben „Am besten passt: <CV>“ oder „Gleich gut: <A> und <B>“ mit Umschalter, Standard zuerst; ohne gültiges Ergebnis „Noch nicht abgeglichen“; leere Anforderungsliste „Kein Anforderungsabschnitt erkannt“. Farben als Tokens in `web/app/stil/utilitaer.css`. Dieselbe Markierung in der gegliederten Anzeige einer Bewerbung ohne `job_id` (`web/app/bewerbung/[id]/`), Ergebnis über `application_id` (Q111).
- Datenschutz: Abschnitt „Lebenslauf“ (Speicherort Supabase Frankfurt, Zweck, Abgleich beim Admin über Claude/Anthropic, bei allen anderen nur im Browser, Bedeutungsmodell e5-small von uns ausgeliefert, Löschung durch Löschen des CV, Einwilligung Art. 9).
- `GET /export/cv`: JSON mit eigenen `cv_texte`, `cv_profile`, `cv_ergebnisse`, `cv_einwilligung`; Link „CV-Daten exportieren“ neben dem bestehenden Export auf der Konto-Seite.

- [ ] **Step 1: Tests** (`node --test`): `gueltig` false bei abweichendem Hash; `markierung` liefert für jede Farbe das Label; Punkt ohne passende Anforderung → `null`.
- [ ] **Step 2–4:** FAIL → umsetzen → in `web/`: `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „6a: CV-Abgleich auf Stellen- und Dokumentseite“ + `Agent: Codex`.

### Task 6: Doku und Halt (Codex); Workflow und Backup (Claude)

- [ ] **Codex:** `docs/STATUS.md` (Nutzer-To-dos: Migration 018 einspielen; 27/28 erledigen; Secret `CLAUDE_CODE_OAUTH_TOKEN` im privaten Repo), `docs/ENTSCHEIDUNGEN.md` (Modelldatei im Repo; `browser-vorlaeufig` schon in 018; Trigger löschen veraltete Ergebnisse; Export als eigene JSON-Datei), `docs/agenten-protokoll.md`, Warteschlange Nr. 9 → `🛑`. Commit „6a: Doku“ + `Agent: Codex`.
- [ ] **Claude (privates Repo, nicht Codex):** `jobradar-privat/.github/workflows/cv-abgleich.yml` – `cron: "0 1,2 * * *"` mit Prüfschritt „nur weiter, wenn es in Europe/Berlin 03 Uhr ist“ (Sommer-/Winterzeit), `workflow_dispatch`; öffentliches Repo auschecken, Python-Abhängigkeiten, `npm i -g @anthropic-ai/claude-code`, `python -m scraper.cv_abgleich` mit Secrets `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`. `backup.yml`: `--exclude-table-data` für `public.cv_texte`, `public.cv_profile`, `public.cv_ergebnisse`.
- [ ] **🛑 Halte-Punkte (Design 6a):** (a) Nutzer spielt Migration 018 ein, To-dos 27/28 erledigt, Claude lässt `py -m pytest -m supabase` laufen; (b) Lauf von Hand mit künstlichem CV (aus `docs/beispiele/cv-abgleich.json`) über 5 Stellen, Nutzer liest Settings → Usage vorher/nachher ab, dann Grenze 50 bestätigen oder senken; (c) echter CV, Nutzer prüft 10 Ergebnisse.
