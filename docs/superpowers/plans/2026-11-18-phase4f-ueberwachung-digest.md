# Phase 4f: Überwachung, Telegram und Digest – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Codex: Auftrag über `docs/codex-warteschlange.md`. Setzt 4d (`admins`, `herkunft`) und 4e (`fuer_alle`, `firmen_sichtbar`) voraus.

**Goal:** Nach jedem Nachtlauf prüft ein Gesundheitscheck ohne KI jede Firma, öffnet bei Problemen ein GitHub-Issue (Label `scraper-defekt` startet die Reparatur durch Claude) und meldet per Telegram; dazu ein täglicher Digest für den Admin mit neuen Stellen von Wunscharbeitgebern und zu Titel-Stichwörtern.

**Architecture:** `scraper/gesundheit.py` vergleicht den heutigen Bericht mit den letzten 7 Einträgen in `laeufe` (reine Funktion) und legt Issues über die GitHub-REST-Schnittstelle an. `scraper/telegram.py` schickt Nachrichten. `scraper/digest.py` liest Wunschfirmen und Stichwörter des Admins und die seit dem vorigen Lauf neuen Stellen. Beides läuft als eigene Schritte im Workflow „Täglicher Lauf“ nach `scraper.run`. Migration 017 legt `wunschfirmen` und `abgleich_stichwoerter` an (Letztere nutzt Phase 6 mit, Q35).

**Tech Stack:** Python 3 + `requests` (pytest mit Attrappen, kein Netz), Next.js 16 / TypeScript, Supabase, GitHub Actions, `anthropics/claude-code-action@v1`.

**Spec:** `docs/superpowers/specs/2026-11-17-phase4-firmen-ranglisten-design.md` (Abschnitt 4f), CLAUDE.md 4.3

## Global Constraints

- Problem-Kriterien (CLAUDE.md 4.3, exakt): (a) 0 Stellen, obwohl in den letzten 7 Tagen > 0; (b) Rückgang um mehr als 50 % gegenüber dem Höchstwert der letzten 7 Tage; (c) Fehler (HTTP, Timeout, Parser) im Bericht; (d) übersprungene Stellen ohne Titel oder Link; (e) Firmendaten fehlen (`careers_url`, `ats_typ` oder `groesse_klasse` leer bei aktiver Firma).
- GitHub-Issues (öffentliches Repo!) nur für Firmen mit `herkunft = 'datei'`; Admin- und private Firmen nur per Telegram an den Admin, private Firmen anderer Nutzer gar nicht.
- Ein offenes Issue je Firma (Titel exakt `Scraper defekt: <Firma>`); ist es schon offen, Kommentar statt neuem Issue. Höchstens 3 neue Issues je Nacht (schont das Claude-Kontingent); **Gespeichert werden immer alle Probleme** (Q74): im Laufbericht in `laeufe` (Feld `gesundheit`) und in der Telegram-Nachricht; die übrigen bekommen ihr Issue in der nächsten Nacht, wenn das Problem dann noch besteht.
- Issue-Inhalt: Problemart, Fehlertext (höchstens 1.000 Zeichen), Karriere-Link, Stellenzahlen der letzten 7 Läufe als Tabelle. Kein HTML-Schnappschuss (der Reparatur-Lauf holt die Seite selbst; spart Platz und vermeidet fremde Inhalte im Repo).
- Reparatur: Claude Code Action mit Secret `CLAUDE_CODE_OAUTH_TOKEN` öffnet einen Pull Request mit Stellenzahl vorher/nachher; **kein Auto-Merge**.
- Telegram: Secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`; Link-Basis `SEITE_URL` als Secret (Adresse steht nie im Code). Fehlt ein Secret: Hinweis im Log, kein Fehler. Nachricht höchstens 4.096 Zeichen.
- Digest zunächst nur für den Admin (Q60); höchstens 20 Zeilen, Rest als „X weitere neue Stellen“ mit Link.
- Migration nur als Datei: `supabase/migrations/017_wunschfirmen.sql`.

## Review Focus

1. Erster Lauf einer neuen Firma (keine Vorgeschichte in `laeufe`): kein Problem (a)/(b) (Test Task 1).
2. Firma war gestern kaputt und hat heute wieder Stellen: kein neues Issue, offenes Issue bekommt Kommentar „Wieder in Ordnung: N Stellen“ (wird nicht automatisch geschlossen) (Test Task 2).
3. Private Firma eines anderen Nutzers mit Fehler: weder Issue noch Telegram (Test Task 2).
4. Digest-Stelle einer privaten Firma, die der Admin nicht sehen darf: taucht nicht auf (Test Task 4).
5. Telegram antwortet mit Fehler 429/500: Lauf bleibt grün, Hinweis im Log (Test Task 3).

---

### Task 1: Gesundheitscheck (reine Funktion)

**Files:**
- Create: `scraper/gesundheit.py`
- Modify: `scraper/db.py` (`letzte_laeufe(n: int = 7) -> list[dict]`, liefert `bericht`-Objekte, neueste zuerst)
- Test: `tests/test_gesundheit.py`

**Interfaces:**
- `pruefe(heute: dict, vorher: list[dict]) -> list[dict]`: je Problem `{"firma": str, "art": "null_stellen"|"einbruch"|"fehler"|"ohne_titel_link"|"firmendaten", "text": str, "verlauf": list[int]}`; `verlauf` = `gefunden` der letzten 7 Läufe (fehlende Tage ausgelassen).

- [ ] **Step 1: Tests** je Kriterium (a)–(e) ein Fall, dazu Review Focus 1, und ein Rückgang von genau 50 % → kein Problem.
- [ ] **Step 2–4:** `py -m pytest -q tests/test_gesundheit.py` FAIL → umsetzen → grün.
- [ ] **Step 5: Commit** — „4f: Gesundheitscheck nach CLAUDE.md 4.3“ + `Agent: Codex`.

### Task 2: Issues und Reparatur-Workflow

**Files:**
- Modify: `scraper/gesundheit.py`
- Create: `.github/workflows/reparatur.yml`
- Modify: `.github/workflows/taeglich.yml` (neuer Schritt `python -m scraper.gesundheit` nach `scraper.run`, `if: always()`; `permissions: issues: write`)
- Test: `tests/test_gesundheit.py`

**Interfaces:**
- `melde_issues(probleme, firmen: dict[str, dict], post=requests.post, get=requests.get, token=os.environ.get("GITHUB_TOKEN"), repo=os.environ.get("GITHUB_REPOSITORY")) -> list[str]` (Issue-Links): filtert auf `herkunft == "datei"`, sucht offene Issues mit Label `scraper-defekt` und gleichem Titel, kommentiert oder legt an (Label `scraper-defekt`), höchstens 3 neue (Q74).
- `db.ergaenze_lauf(datum: str, felder: dict) -> None` (PATCH auf die heutige `laeufe`-Zeile, ergänzt das `bericht`-Objekt um `felder`).
- `main()`: lädt heutigen Bericht (`letzte_laeufe(8)[0]` ist heute) und Vorgeschichte, ruft `pruefe`, speichert **alle** Probleme per `ergaenze_lauf(heute, {"gesundheit": probleme})`, dann `melde_issues`, dann `telegram.sende` (Task 3) mit einer Sammelnachricht; Rückgabecode immer 0.
- `reparatur.yml`: `on: issues: types: [labeled]`, nur wenn `github.event.label.name == 'scraper-defekt'`; `permissions: contents: write, pull-requests: write, issues: write`; Schritt `anthropics/claude-code-action@v1` mit `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` und einem Prompt: AGENTS.md/CLAUDE.md lesen, Ursache für die Firma aus dem Issue finden, Adapter oder Firmendaten reparieren, Tests, Pull Request mit Stellenzahl vorher/nachher, nie mergen, keine `.env`. Eingabenamen vor dem Commit mit der README der Action abgleichen (Abweichung im Protokoll begründen).

- [ ] **Step 1: Tests** mit Attrappen: neues Problem → ein POST `/issues`; offenes Issue → POST `/comments`; 5 Probleme → 3 neue Issues, aber alle 5 in `ergaenze_lauf` und in der Telegram-Nachricht; Review Focus 2 und 3; Admin-Firma → kein Issue.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q` grün.
- [ ] **Step 5: Commit** — „4f: Issues bei defekten Firmen, Reparatur durch Claude“ + `Agent: Codex`.

### Task 2b: Firmendaten prüfen lassen (Q112, CLAUDE.md 4.3)

**Files:**
- Create: `.github/workflows/firmendaten.yml`, `web/lib/firmendaten-issue.ts`, `web/tests/firmendaten-issue.test.ts`
- Modify: `web/app/stellen/[id]/page.tsx` (Abschnitt „Über {firma}“), `web/app/stellen/actions.ts`

**Interfaces:**
- Knopf „Firmendaten prüfen lassen“ nur für den Admin (`istAdmin`) und nur bei Firmen mit `herkunft = 'datei'` (öffentliches Repo: private Firmen nie in einem Issue). Optionales Feld „Was stimmt nicht?“ (höchstens 300 Zeichen).
- `firmendatenIssue(firma: string, hinweis: string, dep?) -> Promise<{ link: string } | { fehler: string }>`: `POST /repos/<repo>/issues` mit Titel exakt `Firmendaten prüfen: <Firma>`, Label `firmendaten-pruefen`, Text: Firmenname, heutige Werte (Größe, Branche, Hauptsitz, Karriere-Link), Hinweis des Admins. Kein Listen- oder Rangname im Text. Ist ein Issue mit gleichem Titel offen → dessen Link zurück, kein neues. Secrets in Vercel: `GITHUB_ISSUE_TOKEN` (fein abgestuftes Token, nur Issues dieses Repos), `GITHUB_REPOSITORY`. Fehlen sie → Meldung „Firmendaten-Prüfung ist noch nicht eingerichtet.“
- `firmendaten.yml`: `on: issues: types: [labeled]`, nur bei Label `firmendaten-pruefen`; `anthropics/claude-code-action@v1` mit `CLAUDE_CODE_OAUTH_TOKEN`; Prompt: AGENTS.md/CLAUDE.md lesen; Wert nur aus Impressum, Geschäftsbericht oder Handelsregister (nie kununu, Glassdoor, LinkedIn o. Ä.); Pull Request auf `data/firmen_korrekturen.csv` mit Quelle je Zeile; nie mergen; ohne belastbare Quelle nur Kommentar am Issue.

- [ ] **Step 1: Tests:** Nicht-Admin → Fehler; private Firma → Fehler; offenes Issue → kein POST; Text enthält keine Listennamen (Prüfung gegen die Listen-IDs aus `data/`).
- [ ] **Step 2–4:** FAIL → umsetzen → `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „4f: Firmendaten prüfen lassen (Recherche durch Claude)“ + `Agent: Codex`.

### Task 3: Telegram

**Files:**
- Create: `scraper/telegram.py`
- Test: `tests/test_telegram.py`

**Interfaces:**
- `sende(text: str, post=requests.post, token=os.environ.get("TELEGRAM_BOT_TOKEN"), chat=os.environ.get("TELEGRAM_CHAT_ID")) -> bool`: ohne Token/Chat → `False` + Hinweis; teilt Text an Zeilengrenzen in Stücke ≤ 4.096 Zeichen; `POST https://api.telegram.org/bot<token>/sendMessage` mit `chat_id`, `text`, `disable_web_page_preview: true`; Fehler → `False`, nie eine Ausnahme. Das Token erscheint nie im Log.

- [ ] **Step 1: Tests:** ohne Secrets; 9.000 Zeichen → 3 Aufrufe; 429 → `False` (Review Focus 5); Log enthält das Token nicht.
- [ ] **Step 2–4:** FAIL → umsetzen → grün.
- [ ] **Step 5: Commit** — „4f: Telegram-Nachrichten“ + `Agent: Codex`.

### Task 4: Migration 017, Wunschfirmen, Stichwörter, Digest

**Files:**
- Create: `supabase/migrations/017_wunschfirmen.sql`, `scraper/digest.py`
- Modify: `scraper/db.py`, `.github/workflows/taeglich.yml` (Schritt `python -m scraper.digest` nach dem Gesundheitscheck, Secrets `TELEGRAM_*`, `SEITE_URL`), `web/app/stellen/[id]/page.tsx` (Stern im Abschnitt „Über {firma}“), `web/app/stellen/actions.ts`, `web/app/konto/page.tsx`, `web/app/konto/actions.ts`
- Test: `tests/test_digest.py`, SQL-Prüftest, `web/tests/wunschfirmen.test.ts`

**Interfaces:**
- Migration: `public.wunschfirmen (owner_id uuid default auth.uid() references auth.users on delete cascade, unternehmen text references public.companies(name) on update cascade on delete cascade, primary key (owner_id, unternehmen))`; `public.abgleich_stichwoerter (id bigint generated always as identity primary key, owner_id uuid not null default auth.uid() references auth.users on delete cascade, begriff text not null check (length(btrim(begriff)) between 2 and 60))` mit eindeutigem `(owner_id, lower(trim(begriff)))` und Grenze 50 je Nutzer (Muster `wichtige_punkte`, Migration 005); RLS: nur eigene Zeilen.
- Web: Knopf „☆ Wunscharbeitgeber“ / „★ Wunscharbeitgeber“ (Actions `wunschfirmaUmschalten(formData)`); Konto-Abschnitte „Wunscharbeitgeber“ (Liste mit Entfernen) und „Automatisch abgleichen bei“ (Titel-Stichwörter, gleiche Bedienung wie „Wichtige Punkte“).
- `db.admin_id() -> str|None` (erste Zeile aus `admins`), `db.neue_stellen_seit(datum: str) -> list[dict]` (`id, unternehmen, titel`, offen + sichtbar, `erstmals_gesehen > datum`), `db.wunsch_und_stichwoerter(owner: str) -> tuple[set[str], list[str]]`, `db.sichtbare_firmen(owner: str) -> set[str]` (`fuer_alle` oder in `firmen_sichtbar`).
- `digest.passt(stelle, wunsch, woerter) -> bool`: Firma in `wunsch` oder ein Stichwort trifft ein ganzes Wort bzw. einen Wortanfang im Titel (ohne Groß/klein, wie „Wichtige Punkte“).
- `digest.text(treffer, rest: int, basis: str) -> str`: je Treffer `<Firma> – <Titel>\n<basis>/stellen/<id>`, höchstens 20; dann `<rest> weitere neue Stellen: <basis>/stellen?seit=heute` (gültigen `seit`-Wert aus `web/lib/filter.ts` verwenden); keine Treffer → nur die Restzeile; keine neuen Stellen → keine Nachricht.
- `digest.main()`: vorheriges Laufdatum aus `letzte_laeufe(2)[1]`, sonst gestern.

- [ ] **Step 1: Tests:** Wortanfang („Data“ trifft „Datenanalyst“ nicht, „Daten“ schon); 25 Treffer → 20 Zeilen + Rest; Review Focus 4; ohne `admins`-Eintrag → Hinweis, keine Nachricht; Web: Umschalten legt an und entfernt; Stichwort-Grenze 50.
- [ ] **Step 2–4:** FAIL → umsetzen → `py -m pytest -q`; in `web/`: `npm test`, `npx tsc --noEmit`, `npm run build` grün.
- [ ] **Step 5: Commit** — „4f: Wunscharbeitgeber, Stichwörter und täglicher Digest“ + `Agent: Codex`.

### Task 5: Doku und Halt

- [ ] `docs/STATUS.md` (Nutzer-To-dos: Migration 017; Telegram-Bot bei @BotFather anlegen, Secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SEITE_URL` und `CLAUDE_CODE_OAUTH_TOKEN` in GitHub eintragen – Claude erklärt es Schritt für Schritt; Labels `scraper-defekt` und `firmendaten-pruefen` in GitHub anlegen; Token `GITHUB_ISSUE_TOKEN` und `GITHUB_REPOSITORY` in Vercel), `docs/ENTSCHEIDUNGEN.md` (kein HTML-Schnappschuss im Issue; höchstens 3 neue Issues je Nacht; Issues nur für Dateifirmen; Issue wird nicht automatisch geschlossen), `docs/agenten-protokoll.md`, Warteschlange `🛑`.
- [ ] Commit — „4f: Doku“ + `Agent: Codex`.
- [ ] **🛑 Halte-Punkt:** Nutzer legt Bot und Secrets an und spielt Migration 017 ein; Claude startet mit ihm einen Lauf von Hand, prüft Telegram-Nachricht und Digest und löst einen Test-Issue an einer absichtlich falschen Firmen-Kennung auf einem Wegwerf-Zweig aus (Reparatur-PR ansehen, nicht mergen).
