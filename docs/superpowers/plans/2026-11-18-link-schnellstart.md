# Link-Schnellstart – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Codex:** zusätzlich `AGENTS.md` lesen; Halte-Punkte (🛑) sind verbindlich.

**Goal:** Aus dem Link einer beliebigen Firmen-Karriereseite entsteht beim Anlegen sofort eine Bewerbung mit Firma, Titel, Ort und Anzeigentext; in der folgenden Nacht kommen gegliederte Anzeige, Steckbrief und Groq-Zusammenfassung dazu.

**Architecture:** Website: neuer sicherer Einzelabruf (`web/lib/seiten-abruf.ts`) plus JSON-LD-Leser (`web/lib/jobposting.ts`), eingehängt als Schritt 1d in `bewerbungAusLink`; die Bewerbung wird mit `nachruesten = true` markiert. Nachtlauf: `scraper/nachruesten.py` holt diese Seiten mit `scraper/http.py`, gliedert, erstellt den Steckbrief und fragt Groq. Migration 012 ergänzt drei Spalten an `applications`.

**Tech Stack:** Next.js 16 Server Actions, `node --test`, Python 3 (`pruefe_offline`), Supabase/PostgREST.

**Spec:** `docs/superpowers/specs/2026-11-18-link-schnellstart-design.md`

## Global Constraints

- AGENTS.md: keine `.env`, keine Live-DB, keine Migration einspielen, keine echten Abrufe in Tests, kein Push; Commits mit Zeile `Agent: Codex`; Eintrag in `docs/agenten-protokoll.md`.
- Dateien einzeln `git add <pfad>`; keine neuen Pakete (Node: `node:dns/promises`, `node:net`; Python: `ipaddress`, `socket`).
- **Jobportale werden nie abgerufen:** Host prüfen mit `istPortal` (`web/lib/stellen-import.ts`) bzw. derselben Liste in Python; Q16.
- Abrufregeln (Spec): nur `https`, Port leer oder 443, keine Zugangsdaten in der Adresse; aufgelöste IP muss öffentlich sein; höchstens 3 Weiterleitungen, jede neu geprüft; `robots.txt` beachten; User-Agent `USER_AGENT` aus `web/lib/ats-abruf.ts`; Zeitlimit 10 s; höchstens 2 MB; nur `text/html`; nur angemeldete Nutzer; höchstens 10 Abrufe je Nutzer und Minute.
- Meldung ohne JobPosting, wörtlich: „Diese Seite enthält keine maschinenlesbare Anzeige. Bitte Firma und Titel eintragen oder den Anzeigentext einfügen.“
- Eingetragene Felder des Nutzers gehen immer vor.
- Groq nur `openai/gpt-oss-120b` über vorhandenes `ki.frage_groq`; nur der öffentliche Anzeigentext geht hin.

## Review Focus

1. Link auf eine Firmenseite, die auf eine interne Adresse weiterleitet (z. B. `https://firma.example/job` → `http://169.254.169.254/`) → Abruf bricht ab, Bewerbung entsteht ohne Abruf mit Hinweis. → Task 1.
2. Nutzer ändert später in der Bewerbung den Link auf ein Jobportal oder eine interne Adresse → der Nachtlauf ruft ihn nicht ab. → Task 4.
3. Seite mit mehreren JSON-LD-Blöcken, `@graph` oder Text vor dem JSON (Porsche) → das `JobPosting` wird trotzdem gefunden. → Task 2.
4. Seite liefert 404 oder robots.txt verbietet → kein Absturz, die bisherigen Schritte 2–4 laufen weiter. → Task 3.
5. Migration 012 ist live noch nicht eingespielt → Anlegen funktioniert wie bisher (ohne Markierung), der Nachtlauf überspringt das Nachrüsten mit Hinweis. → Task 3 und Task 4.

---

### Task 1: Sicherer Einzelabruf einer Firmenseite

**Files:**
- Create: `web/lib/seiten-abruf.ts`, `web/tests/seiten-abruf.test.ts`
- Modify: `web/lib/ats-abruf.ts` (nur `parseRobots` exportieren)

**Interfaces:**
- Produces:
  - `istOeffentlicheIp(ip: string): boolean` – false für 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16, 224/4 und höher, `::`, `::1`, fc00::/7, fe80::/10, `::ffff:`-Formen dieser IPv4-Adressen.
  - `holeFirmenseite(url: string, dep?: { holen?: typeof fetch; aufloesen?: (host: string) => Promise<string[]> }): Promise<string>` – liefert HTML-Text oder wirft `Error` mit kurzem deutschen Grund.
  - `darfAbrufen(nutzer: string, jetzt?: number): boolean` – gleitendes Fenster, 10 je 60 000 ms, Speicher im Modul. `// shortcut: Zähler je Server-Instanz, nicht global; bei Missbrauch auf Datenbank-Zähler umstellen.`

- [ ] **Step 1: Failing tests** in `web/tests/seiten-abruf.test.ts` (Muster `web/tests/ats-abruf.test.ts`, alles mit eingespritztem `holen`/`aufloesen`, nie echtes Netz):
  - `istOeffentlicheIp`: `"8.8.8.8"` → true; `"10.0.0.1"`, `"127.0.0.1"`, `"169.254.169.254"`, `"192.168.1.1"`, `"::1"`, `"fd00::1"`, `"::ffff:127.0.0.1"` → false.
  - abgelehnt ohne Abruf (Zähler von `holen` bleibt 0): `http://firma.example/job`, `https://firma.example:8443/job`, `https://user:pw@firma.example/job`, `https://www.linkedin.com/jobs/view/1/`, `https://de.indeed.com/viewjob?jk=1`, Host löst nur auf `10.0.0.5` auf.
  - Weiterleitung: Antwort 301 mit `location: http://169.254.169.254/` → Fehler; 4 Weiterleitungen hintereinander → Fehler „zu viele Weiterleitungen“; 1 Weiterleitung auf öffentliche https-Seite → HTML zurück.
  - `robots.txt` mit `Disallow: /jobs` → `https://firma.example/jobs/1` wirft; `robots.txt` 404 → erlaubt.
  - Antwort `content-type: application/pdf` → Fehler; Antwort über 2 MB (Body aus 2 097 153 Zeichen) → Fehler.
  - `darfAbrufen("u1", t)` zehnmal true, elftes Mal false, bei `t + 60_001` wieder true; anderer Nutzer unabhängig.
- [ ] **Step 2:** `cd web && npm test` → neue Tests FAIL (Modul fehlt).
- [ ] **Step 3:** Implementieren. `holen` mit `redirect: "manual"`, `signal: AbortSignal.timeout(10000)`, Header `User-Agent: USER_AGENT`; vor **jedem** Abruf (auch robots.txt und jede Weiterleitung): Adressregeln, `istPortal`, `aufloesen` (Standard: `dns.lookup(host, { all: true })`), alle IPs öffentlich. `// shortcut: Auflösung und Abruf sind zwei Schritte (DNS-Rebinding theoretisch möglich); bei öffentlichem Start Abruf über die geprüfte IP mit Host-Header.` Body stückweise lesen und bei > 2 097 152 Bytes abbrechen.
- [ ] **Step 4:** `cd web && npm test && npx tsc --noEmit` → grün.
- [ ] **Step 5: Commit** `git add web/lib/seiten-abruf.ts web/tests/seiten-abruf.test.ts web/lib/ats-abruf.ts` · `git commit -m "Website: sicherer Einzelabruf von Firmenseiten" -m "Agent: Codex"`

### Task 2: JobPosting aus HTML lesen

**Files:**
- Create: `web/lib/jobposting.ts`, `web/tests/jobposting.test.ts`

**Interfaces:**
- Consumes: `htmlZuText` aus `web/lib/link-import.ts`.
- Produces: `leseJobPosting(html: string): { titel: string; firma: string | null; ort: string | null; text: string } | null` – erstes Objekt mit `@type` `"JobPosting"` (auch in Arrays, `@graph`, oder wenn `@type` ein Array ist, das `"JobPosting"` enthält); Text vor dem JSON im Script-Block wird übersprungen (wie `_jobposting` in `scraper/ats/sitemap.py`); `firma` aus `hiringOrganization.name`; `ort` aus `jobLocation[0].address.addressLocality` (Objekt oder Array); `text` = `htmlZuText(description)`; ohne `title` oder ohne `description` → `null`.

- [ ] **Step 1: Failing tests**: (a) einfacher Block → alle vier Felder; (b) `@graph` mit `Organization` und `JobPosting`; (c) Script-Inhalt `"/* x */ {…}"` mit Text davor; (d) zwei Blöcke, erster kaputtes JSON, zweiter gültig → zweiter; (e) `"@type": ["JobPosting"]`; (f) kein JobPosting → `null`; (g) `description` mit `<li>`-HTML → Text ohne Tags.
- [ ] **Step 2:** `cd web && npm test` → FAIL.
- [ ] **Step 3:** Implementieren (nur Regex auf `<script[^>]+application/ld\+json[^>]*>…</script>`, `JSON.parse` ab erstem `{`/`[`).
- [ ] **Step 4:** `npm test` → grün.
- [ ] **Step 5: Commit** `git add web/lib/jobposting.ts web/tests/jobposting.test.ts` · `git commit -m "Website: JobPosting aus Firmenseiten lesen" -m "Agent: Codex"`

### Task 3: Migration 012 und Schritt 1d im Link-Import

**Files:**
- Create: `supabase/migrations/012_nachruesten.sql`
- Modify: `web/app/bewerbungen/actions.ts` (`bewerbungAusLink`, Typ `Ergebnis`), `web/app/bewerbungen/knoepfe.tsx` (Meldung)
- Test: `web/tests/link-schnellstart.test.ts`

**Interfaces:**
- Consumes: Task 1 (`holeFirmenseite`, `darfAbrufen`), Task 2 (`leseJobPosting`).
- Produces: Spalten `applications.nachruesten boolean not null default false`, `applications.snapshot_steckbrief jsonb`, `applications.snapshot_ki jsonb` (Muster `005_abschnitte_land.sql`, `add column if not exists`, Kopfkommentar „Nur als Datei vorbereitet …“); `Ergebnis` erweitert um `{ brauchtEingabe: true; grund: "kein_jobposting" }`; neue reine Funktion `zielAusFirmenseite(url: string, eingabe: { firma?: string; titel?: string }, dep): Promise<{ firma?: string; titel?: string; ort?: string; text?: string; abgerufen: boolean }>` in `web/lib/jobposting.ts` (damit testbar ohne Server Action).

- [ ] **Step 1: Failing tests** `web/tests/link-schnellstart.test.ts` mit eingespritztem Abruf:
  - Firmenseite mit JobPosting, Nutzer hat nichts eingetragen → `{ firma, titel, ort, text, abgerufen: true }` aus der Seite.
  - Nutzer hat Firma „Eigene GmbH“ eingetragen → `firma === "Eigene GmbH"`, Titel aus der Seite.
  - Abruf wirft (404/robots/intern) → `{ abgerufen: false }`, Eingaben unverändert, kein Fehler nach außen.
  - Seite ohne JobPosting → `{ abgerufen: true }` ohne `titel`.
- [ ] **Step 2:** `cd web && npm test` → FAIL.
- [ ] **Step 3:** `zielAusFirmenseite` implementieren. In `bewerbungAusLink` nach Schritt 1c einfügen: Schritt 1d nur wenn `!ziel && !a.ats && !istPortal(u.hostname) && darfAbrufen(claims.claims.sub)`. Ergebnis mit Titel → `ziel = { firma, titel, ort, text, link, quelle: a.quelle }` und beim Insert zusätzlich `nachruesten: true`. Fehlt die Spalte (Insert-Fehler mit `nachruesten` im Text oder Code `PGRST204`): einmal ohne `nachruesten` erneut einfügen. Abgerufen, aber kein Titel und Nutzer hat weder Firma noch Titel → `return { brauchtEingabe: true, grund: "kein_jobposting" }`. In `knoepfe.tsx` bei `grund === "kein_jobposting"` die Meldung aus den Global Constraints statt „Aus dem Link ist nichts erkennbar …“.
- [ ] **Step 4:** `cd web && npm test && npx tsc --noEmit && npm run build` → grün.
- [ ] **Step 5: Commit** `git add supabase/migrations/012_nachruesten.sql web/app/bewerbungen/actions.ts web/app/bewerbungen/knoepfe.tsx web/lib/jobposting.ts web/tests/link-schnellstart.test.ts` · `git commit -m "Link-Import: Firmenseiten mit JobPosting (Schritt 1d), Migration 012" -m "Agent: Codex"`

### Task 4: Nachtlauf rüstet Bewerbungen nach

**Files:**
- Create: `scraper/nachruesten.py`, `tests/test_nachruesten.py`
- Modify: `scraper/run.py` (Aufruf nach `_ki`), `scraper/db.py` (zwei Funktionen), `tests/fakedb.py`

**Interfaces:**
- Consumes: `http.hole(url)`, `_jobposting(seite)` aus `scraper/ats/sitemap.py` (ohne Unterstrich-Alias exportieren: `jobposting = _jobposting`), `abschnitte.abschnitte(html)`, `steckbrief.steckbrief(abschnitte, text)`, `ki.kuerze_fuer_ki`, `ki.frage_groq(text, ki.GROSS)`.
- Produces:
  - `db.bewerbungen_zum_nachruesten(limit: int = 50) -> list[dict]` (Felder `id, link`; Filter `nachruesten=eq.true`); bei fehlender Spalte (400 mit `nachruesten`) → `[]` und einmal `print("Hinweis: Migration 012 offen, Nachrüsten übersprungen.")`.
  - `db.setze_nachgeruestet(app_id: str, patch: dict) -> None` (PATCH `applications`, setzt immer `nachruesten: False`).
  - `nachruesten.lauf(frage=ki.frage_groq, hole=http.hole) -> dict` mit Zählern `{"nachgeruestet": n, "uebersprungen": m}`.
- Regeln je Bewerbung: Link erneut prüfen (nur https, kein Portal laut derselben Liste wie `PORTALE`, alle aufgelösten IPs öffentlich per `ipaddress.ip_address(...).is_global`); sonst nur `nachruesten: False`. Seite holen, `jobposting`, `abschnitte(description)`, `steckbrief`, Groq mit `kuerze_fuer_ki`; Patch `snapshot_abschnitte`, `snapshot_steckbrief`, `snapshot_ki` (ohne `studium`/`taetigkeit` wie in `db.speichere_ki`). Groq-Fehler (`GroqWeg`, Tageslimit) → Bewerbung bleibt markiert, Lauf endet für heute. Andere Fehler → `nachruesten: False`, Zähler „übersprungen“. Ohne `GROQ_API_KEY`: Gliederung und Steckbrief trotzdem, `snapshot_ki` bleibt leer, Markierung bleibt nicht stehen.

- [ ] **Step 1: Failing tests** `tests/test_nachruesten.py` mit FakeDB und eingespritzten `hole`/`frage`: (a) gültige Seite → Patch enthält alle drei Snapshot-Felder und `nachruesten: False`; (b) Link `https://www.linkedin.com/jobs/view/1/` → `hole` nie aufgerufen, nur `nachruesten: False`; (c) Host löst auf `127.0.0.1` auf → `hole` nie aufgerufen; (d) `frage` wirft `ki.GroqWeg` → kein Patch, Lauf bricht nach dieser Bewerbung ab; (e) Seite ohne JobPosting → `nachruesten: False`, `uebersprungen == 1`; (f) FakeDB `ohne_nachruesten = True` → `lauf()` liefert Nullen, kein Fehler.
- [ ] **Step 2:** `py -B -m pruefe_offline tests/test_nachruesten.py` → FAIL.
- [ ] **Step 3:** Implementieren; in `run.py` nach dem KI-Schritt `nachruesten.lauf()` in `try/except` (darf den Lauf nie kippen, Muster `_ki`), Ergebnis in den Bericht.
- [ ] **Step 4:** `py -B -m pruefe_offline` → alle PASS.
- [ ] **Step 5: Commit** `git add scraper/nachruesten.py scraper/run.py scraper/db.py scraper/ats/sitemap.py tests/test_nachruesten.py tests/fakedb.py` · `git commit -m "Nachtlauf: Bewerbungen aus Firmenseiten nachrüsten (Gliederung, Steckbrief, Groq)" -m "Agent: Codex"`

### Task 5: Anzeige in der Bewerbung

**Files:**
- Modify: `web/app/bewerbung/[id]/inhalt.tsx` (Abschnitt um Zeile ~298), ggf. `web/app/stil/utilitaer.css`
- Test: `web/tests/link-schnellstart.test.ts` (Lesefunktion)

**Interfaces:**
- Consumes: `leseKi`, `voraussetzungen` aus `web/lib/zusammenfassung.ts`; Steckbrief-Darstellung wie auf `web/app/stellen/[id]/page.tsx`.
- Produces: Über dem Snapshot erscheinen, wenn vorhanden, der Kasten „Auf einen Blick“ aus `snapshot_ki` und der Steckbrief aus `snapshot_steckbrief`, in derselben Darstellung wie auf der Stellenseite (bestehende Komponenten wiederverwenden, nicht kopieren). Ist `nachruesten` true: Hinweis „Gliederung und Zusammenfassung folgen nach dem nächsten Nachtlauf.“

- [ ] **Step 1: Failing test:** `leseKi(snapshot_ki)` mit einem gespeicherten Beispiel (ohne `studium`/`taetigkeit`) liefert ein Objekt; `leseKi(null)` → `null`.
- [ ] **Step 2–4:** Umsetzen; `cd web && npm test && npx tsc --noEmit && npm run build` → grün.
- [ ] **Step 5: Commit** `git add web/app/bewerbung/[id]/inhalt.tsx web/tests/link-schnellstart.test.ts web/app/stil/utilitaer.css` · `git commit -m "Bewerbung: Zusammenfassung und Steckbrief aus nachgerüstetem Snapshot" -m "Agent: Codex"`

### Task 6: Doku und Übergabe

- [ ] STATUS (gebaut, Migration 012 offen), ENTSCHEIDUNGEN (Ruling-Zeilen aus dem Ledger), Agentenprotokoll; Commit `docs: Link-Schnellstart übergeben` mit `Agent: Codex`.

🛑 **Halte-Punkt (nicht Codex):**
1. Nutzer spielt `012_nachruesten.sql` im Supabase SQL Editor ein.
2. Claude probiert 10 echte Links von Firmenseiten außerhalb der 12 jobradar-Firmen (zählt, wie viele ein JobPosting haben) und prüft am Morgen danach die nachgerüsteten Bewerbungen.
3. Hochladen nur nach „Ja, hochladen“.
