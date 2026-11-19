# Erinnerungen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einmalige Nachfass-Erinnerung (Standard 30 Tage, einstellbar, abschaltbar) und Antwortfrist bei Angeboten in „Diese Woche fällig“, für den Admin zusätzlich im Telegram-Digest; Knopf „Mail mit Claude“.

**Architecture:** Migration 027. Die Fälligkeitsregel steht zweimal – `web/lib/erinnerungen.ts` (Website) und `scraper/erinnerungen_faellig.py` (Digest) – und beide prüfen dieselbe gemeinsame Fixture `tests/fixtures/erinnerungen.json`, damit sie nie auseinanderlaufen.

**Tech Stack:** Next.js 16, Supabase, Python (Digest aus 4f), `node --test`, pytest.

**Spec:** `docs/superpowers/specs/2026-11-19-erinnerungen-design.md`

## Global Constraints

- **Zwei Admin-Konten (Q236/Q237, 2026-11-19):** „Telegram nur an den Admin“ heißt: je Admin-Konto an dessen `telegram_chat_id` (aus `db.admin_ids()`, 4f), nur dessen Bewerbungen. Test: Fixture mit zwei Admins, keine Erinnerung landet im falschen Chat.

- Nach Nr. 0 (Runde 1: `claudeAuftrag`, Anrede), Nr. 8 (4f: `scraper/digest.py`, `scraper/telegram.py`), Nr. 11b (Angebotskasten).
- Codex nach `AGENTS.md` (kein `.env`, keine Live-DB, kein Push, Migration nicht einspielen, Protokoll, `Agent: Codex`).
- Werte: Standard 30 Tage, erlaubt 7–90; Vorschau wie „Diese Woche fällig“ (heute + 7); Antwortfrist-Erinnerung ab Frist − 2 Tage.
- Texte wörtlich: „Nachfassen ({n} Tage ohne Antwort)“, Knöpfe „Erledigt“ und „Mail mit Claude“; „Antwort aufs Angebot bis {TT.MM.}“; Konto-Abschnitt „Erinnerungen“ mit „Ans Nachfassen erinnern“ und „nach [n] Tagen ohne Antwort“; Telegram „Fällig heute: …“ und „Heute Antwortfrist: {Firma}“; Claude-Auftrag „Schreibe eine kurze, höfliche Nachfass-Mail auf Deutsch zu meiner Bewerbung. Frage nach dem Stand, ohne zu drängen.“
- Telegram nur an den Admin, nur Firma/Stelle/Datum (Q152); Logs nur Zahlen.

## Review Focus

1. Bewerbung ohne `beworben_am` und ohne Statusereignis (Altbestand) → keine Nachfass-Erinnerung statt Absturz (Test Task 2).
2. Status `beworben` → `im_gespraech` → zurück `beworben`: zählt ab dem neuen Wechsel, aber nie nach „Erledigt“ (Test Task 2).
3. Einstellungszeile fehlt → Standardwerte (Test Task 2 und 3).
4. Antwortfrist in der Vergangenheit, Status noch `angebot` → als überfällig gezeigt (Test Task 2).
5. Website und Digest liefern für die gemeinsame Fixture dieselben Einträge (Test Task 2 und 3).

---

### Task 1: Migration 027

**Files:** Create `supabase/migrations/027_erinnerungen.sql`; Test `web/tests/erinnerungen-migration.test.ts`
**Interfaces — Produces:** `erinnerung_einstellungen(owner_id uuid pk default auth.uid() → auth.users on delete cascade, nachfass_an boolean not null default true, nachfass_tage integer not null default 30 check (nachfass_tage between 7 and 90))`, RLS eigene Zeile, `revoke all … from anon`; `applications` + `nachfass_erledigt_am date`, `angebot_antwort_bis date`.
- [ ] Step 1: Failing Regex-Test der SQL-Datei. Step 2: FAIL. Step 3: Migration (wiederholbar). Step 4: PASS. Step 5: Commit `Migration 027: Erinnerungen`.

### Task 2: Fälligkeitsregel (Website) + gemeinsame Fixture

**Files:** Create `web/lib/erinnerungen.ts`, `tests/fixtures/erinnerungen.json`; Modify `web/lib/woche.ts` (neue Arten `nachfassen`, `antwortfrist`), `web/lib/tracker-daten.ts` (`ladeWoche` lädt zusätzlich Einstellungen, `nachfass_erledigt_am`, `angebot_antwort_bis`, letzten Wechsel auf `beworben` aus `application_events`); Test `web/tests/erinnerungen.test.ts`
**Interfaces — Produces:** `nachfassFaellig(a: {status: string; beworben_seit: string | null; nachfass_erledigt_am: string | null}, e: {nachfass_an: boolean; nachfass_tage: number} | null, heute: string): {datum: string; tage: number} | null`; `antwortfristFaellig(a: {status: string; angebot_antwort_bis: string | null}, heute: string): {datum: string; frist: string} | null`. `beworben_seit` = Datum des letzten Statusereignisses nach `beworben`, sonst `beworben_am`.
- [ ] Step 1: Fixture mit ≥ 10 Fällen (Feld `erwartet`) und Failing tests: Tag 23 mit 30 Tagen → fällig (Vorschau 7), Tag 22 → null; eigene 14 Tage; aus → null; erledigt → null; Status `im_gespraech` → null; Review Focus 1, 2, 3, 4; Antwortfrist 5 Tage vorher → fällig ab Frist − 2 (in der Vorschau); Status `abgeschlossen` → null; alle Fixture-Fälle wie `erwartet` (Review Focus 5).
- [ ] Step 2: FAIL. Step 3: implementieren; `wochenListe` sortiert die neuen Einträge mit ein. Step 4: PASS. Step 5: Commit `Erinnerungen: Fälligkeit in „Diese Woche fällig“`.

### Task 3: Digest (Admin, Telegram)

**Files:** Create `scraper/erinnerungen_faellig.py`; Modify `scraper/digest.py` (Abschnitt „Fällig heute“), `scraper/db.py`; Test `tests/test_erinnerungen_faellig.py`
**Interfaces — Produces:** `nachfass_faellig(a: dict, e: dict | None, heute: date) -> dict | None`, `antwortfrist_faellig(a: dict, heute: date) -> dict | None` (gleiche Regeln wie Task 2, ohne Vorschau: im Digest nur, was **heute** fällig wird); `faellig_text(eintraege: list[dict]) -> str`.
- [ ] Step 1: Failing tests: alle Fälle der gemeinsamen Fixture (Feld `erwartet_digest`), Fristtag → Satz „Heute Antwortfrist: {Firma}“, leere Liste → kein Abschnitt.
- [ ] Step 2: FAIL. Step 3: implementieren. Step 4: PASS. Step 5: Commit `Erinnerungen: Fälliges im Telegram-Digest`.

### Task 4: Oberfläche

**Files:** Modify `web/app/bewerbungen/woche.tsx` (Knöpfe „Erledigt“ → Server Action `nachfassErledigt(id)` setzt `nachfass_erledigt_am = heute`; „Mail mit Claude“ → `claudeAuftrag` aus Runde 1), `web/app/bewerbung/[id]/inhalt.tsx` (Feld „Antwort bis“ im Angebotskasten), `web/lib/bewerbung.ts` (`angebot_antwort_bis: "datum"`), `web/app/konto/page.tsx` + `actions.ts` (Abschnitt „Erinnerungen“), `web/lib/export.ts` (Spalte „Antwort bis“); Test `web/tests/erinnerungen-ui.test.ts`
- [ ] Step 1: Failing tests: Einstellung 6 bzw. 91 Tage → Fehlermeldung „Bitte 7 bis 90 Tage.“; `nachfassErledigt` für fremde Bewerbung → nichts geändert; Claude-Auftrag enthält Firma, Stelle, Datum und Anrede-Zeile.
- [ ] Step 2: FAIL. Step 3: implementieren. Step 4: PASS, Build grün. Step 5: Commit `Erinnerungen: Einstellungen, Antwortfrist, Knöpfe`.

### Task 5: Doku und Halt

- [ ] CLAUDE.md 4.4 „Nachfassen nach 14 Tagen ohne Antwort“ → „Nachfassen: einmal nach 30 Tagen ohne Antwort (einstellbar 7–90, abschaltbar; Q219/Q220)“ ist bereits von Claude geändert – prüfen; `docs/STATUS.md`, `docs/agenten-protokoll.md`, Warteschlange 🛑; `npm test`, `pytest`, `npm run build` grün; Commit `Erinnerungen: Doku`.
- [ ] 🛑 Halt: Nutzer spielt Migration 027 ein. Claude prüft mit Wegwerf-Konto (Bewerbung mit zurückdatiertem Statusereignis) Anzeige, „Erledigt“, Einstellung „aus“ und den Digest-Text (Testlauf ohne Senden).
