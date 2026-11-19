# Bewerben-Helfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „Bewerbung anlegen“ → „Bewerbung vorbereiten“ (CV, Anlagen, Anschreiben, Eckdaten) → „Bewerben“ öffnet die Karriereseite, die Chrome-Erweiterung füllt sie aus, der Nutzer prüft und schickt selbst ab, jobradar erfährt davon auf vier Wegen.

**Architecture:** Migration 024 (Profilwerte, Konto-Merker, `helfer_geoeffnet_am`, `abgeschickt_quelle`). Die jobradar-Seite holt das Paket über `GET /api/bewerben/<id>` und reicht es per `window.postMessage` an das Inhalts-Skript der Erweiterung auf der jobradar-Origin; der Hintergrund öffnet den Tab, merkt sich Tab → Bewerbung, lädt die Dateien (signierte Links) und gibt Paket + Dateien an das Inhalts-Skript im Ziel-Tab. Dort füllen Adapter (5 Systeme) oder die allgemeine Erkennung; Rückmeldungen gehen über einen jobradar-Tab wie beim heutigen Import (`uebertrageImAppTab`).

**Tech Stack:** Next.js 16, Supabase, Chrome-Erweiterung MV3 (`browser-erweiterung/chrome/`), `node --test`, neu als Test-Abhängigkeit `jsdom` (nur `web/` devDependencies).

**Spec:** `docs/superpowers/specs/2026-11-19-bewerben-helfer-design.md` (dazu `docs/phasen-vorarbeit.md` „Bewerben-Helfer: Vorab-Prüfung“)

## Global Constraints

- Voraussetzungen: Runde 1 (Migration 023, `documents.anlage_art`, Anschreiben-Bausteine), Phase 6a/6b (`cv_ergebnisse`, Browser-Abgleich), Phase 4g-1 (`applications.link` = Originalseite).
- Codex nach `AGENTS.md`: kein `.env`, keine Live-DB, kein Push, Migration nicht einspielen; Protokoll; Commits deutsch mit `Agent: Codex`; nie `git add -A`/`-a`/`-f`.
- **Nie** absenden, nie „Weiter/Next/Submit/Absenden/Bewerben“ auf der Karriereseite klicken; nie Einwilligungs-/Datenschutz-/AGB-Häkchen setzen; nie Passwortfelder füllen; keine Captchas; keine künstlichen Verzögerungen oder Tipp-Simulation (Q184).
- Ausfüllen **nur** in Tabs, die über jobradars „Bewerben“ geöffnet wurden, dort auch Folgeseiten derselben registrierbaren Domain, höchstens 2 Stunden; **nie** auf Hosts aus `PORTALE` (`kern.mjs`).
- Bereits gefüllte Felder nie überschreiben; unklare Felder leer lassen.
- Texte wörtlich: Kasten „Jobradar hat {n} Felder ausgefüllt · {m} Pflichtfelder leer · Bitte prüfen und selbst absenden“; Knopf „Abgeschickt → als beworben markieren“; „Als beworben gespeichert (automatisch erkannt) · Rückgängig“; „Hast du bei {Firma} abgeschickt?“ mit „Ja“/„Nein“; „Auf Jobportalen füllt Jobradar nicht aus.“; „Konto vorhanden ({E-Mail}, seit {Datum}) – Chrome füllt dein Passwort“; „Hast du hier ein Konto?“ mit „Ja, merken“/„Nein, registrieren“; „Konto angelegt?“ mit „Ja“.
- Status nur über `aufBeworben` (`web/lib/bewerbung-schutz.ts`); zusätzlich nur wenn leer: `bewerbungsweg` = „Karriereseite“, `starttermin` = `fruehesterStart(...)`.
- Danke-Erkennung nur nach Absenden-Klick des Nutzers und innerhalb von 60 s; Nachfrage ab 30 min nach `helfer_geoeffnet_am`.
- Dateien nur über kurzlebige signierte Links (≤ 10 min); Paket nie in `chrome.storage.local`, nur `storage.session` (Zugriff `TRUSTED_CONTEXTS`, wie heute).
- Test-Formulare sind nachgebaut und gekürzt, keine Kopien fremder Seiten; keine echten persönlichen Daten in Tests.

## Review Focus

1. Greenhouse-Formular als iframe in der Firmenseite → wird gefüllt (Inhalts-Skript in allen Frames; Frames bekannter Bewerbungssysteme im gebundenen Tab erlaubt) (Test in Task 6).
2. Formular mit nur einem Datei-Feld „Dokumente“ (mehrfach) → CV, Anschreiben, alle Anlagen dort; einfach (nicht mehrfach) → nur CV, Hinweis (Test in Task 7).
3. Nutzer klickt „Absenden“, Seite zeigt Fehlermeldung statt Danke → kein Status (Test in Task 7).
4. Nutzer öffnet im gebundenen Tab eine fremde Website (anderer Host) → nichts wird gefüllt (Test in Task 6).
5. „Rückgängig“ nach Erkennung, aber Nutzer hat inzwischen selbst den Status auf „Im Gespräch“ gesetzt → nichts zurücksetzen (Test in Task 3).

---

### Task 0 (Claude, vor Codex): Bedingungen und Merkmale echter Seiten

- [ ] Je System 2 echte Karriereseiten (Greenhouse, Personio, Workday, SmartRecruiters, Lever): verlinkte Bedingungen lesen (Workday: Verweis auf die Workday-Website-Bedingungen?), Ergebnis je System „Adapter bauen: ja/nein“ hier eintragen.
- [ ] Je System notieren (ohne Absenden): Feldnamen/Beschriftungen, Datei-Felder, Absenden-Knopf, Merkmal der Danke-Seite (Adresse/Text, aus Hilfeseiten des Systems). Daraus die nachgebauten Fixtures in Task 7 vorgeben.
- [ ] Ergebnis in `docs/agenten-protokoll.md` und diesem Plan.

### Task 1: Migration 024

**Files:** Create `supabase/migrations/024_bewerben_helfer.sql`; Test `web/tests/bewerben-migration.test.ts`

**Interfaces — Produces:** `briefkopf` + `gehalt_wunsch integer check (gehalt_wunsch between 1 and 10000000)`, `kuendigung_menge integer check (kuendigung_menge between 0 and 24)`, `kuendigung_einheit text check in ('wochen','monate')`, `kuendigung_termin text check in ('beliebig','monatsende','quartalsende','sofort')`; `applications` + `helfer_geoeffnet_am timestamptz`, `abgeschickt_quelle text check in ('knopf','erkannt','nachfrage','hand','mail')`; `bewerberkonten(owner_id uuid default auth.uid() → auth.users on delete cascade, host text not null, email text, angelegt_am date not null default current_date, quelle text not null check in ('helfer','hand'), primary key (owner_id, host))`, RLS `owner_id = auth.uid()`, `revoke all … from anon`.

- [ ] Step 1: Failing test liest die SQL-Datei (Regex wie `unterlagen-migration.test.ts`): alle Spalten/Checks oben, RLS + Policy + revoke für `bewerberkonten`, kein `drop table`, kein Passwortfeld (`/passw/i` kommt nicht vor).
- [ ] Step 2: FAIL → Step 3: Migration (wiederholbar) → Step 4: PASS → Step 5: Commit `Migration 024: Profilwerte, Konto-Merker, Abschick-Quelle`.

### Task 2: Reine Funktionen

**Files:** Create `web/lib/bewerben.ts`; Test `web/tests/bewerben.test.ts`

**Interfaces — Produces:**
- `fruehesterStart(heute: Date, menge: number, einheit: "wochen"|"monate", termin: "beliebig"|"monatsende"|"quartalsende"|"sofort"): Date`
- `vorauswahl(empfohlen: string[] | null, cvIds: string[], anlagen: {id: string}[]): { cv: string | null; alternative: string | null; anlagen: string[]; mussAbgleichen: boolean }` — `empfohlen` nur mit IDs aus `cvIds`; `null` → `mussAbgleichen: true`.
- `nachfrageNoetig(a: { status: string; helfer_geoeffnet_am: string | null }, jetzt: Date): boolean`
- `darfRueckgaengig(a: { status: string; abgeschickt_quelle: string | null }): boolean` — nur `status === "beworben" && abgeschickt_quelle === "erkannt"`.
- `istDankeSeite(url: string, text: string): boolean` (allgemeine Merkmale aus dem Design; von Task 7 importiert, deshalb als `.mjs`-taugliches reines Modul ohne Next-Imports, Datei `browser-erweiterung/chrome/danke.mjs`, in `web/lib/bewerben.ts` re-exportiert).
- [ ] Step 1: Failing tests:
```ts
fruehesterStart(new Date(2026,10,19), 3, "monate", "beliebig") → 2027-02-20
fruehesterStart(new Date(2026,10,19), 3, "monate", "monatsende") → 2027-03-01
fruehesterStart(new Date(2026,10,19), 3, "monate", "quartalsende") → 2027-04-01
fruehesterStart(new Date(2026,10,19), 3, "monate", "sofort") → 2026-11-19
fruehesterStart(new Date(2026,11,20), 4, "wochen", "beliebig") → 2027-01-18
fruehesterStart(new Date(2027,0,31), 1, "monate", "beliebig") → 2027-03-01   // Fristende 28.02.
vorauswahl(["b","a"], ["a","b"], [{id:"z"}]) → { cv:"b", alternative:"a", anlagen:["z"], mussAbgleichen:false }
vorauswahl(null, ["a"], []) → { cv:null, alternative:null, anlagen:[], mussAbgleichen:true }
vorauswahl(["fremd"], ["a"], []).cv === null
nachfrageNoetig({status:"gemerkt", helfer_geoeffnet_am: <jetzt-31min>}, jetzt) === true; <jetzt-29min> → false; status "beworben" → false; null → false
darfRueckgaengig({status:"im_gespraech", abgeschickt_quelle:"erkannt"}) === false   // Review Focus 5
istDankeSeite("https://x.example/jobs/1/thank-you", "") === true
istDankeSeite("https://x.example/apply", "Vielen Dank für Ihre Bewerbung") === true
istDankeSeite("https://x.example/apply", "Bitte füllen Sie alle Pflichtfelder aus") === false   // Review Focus 3
```
- [ ] Step 2: FAIL → Step 3: implementieren → Step 4: PASS → Step 5: Commit `Bewerben: Startdatum, Vorauswahl, Nachfrage, Danke-Erkennung`.

### Task 3: Schnittstellen

**Files:** Create `web/app/api/bewerben/[id]/route.ts` (GET), `web/app/api/bewerben/[id]/abgeschickt/route.ts` (POST), `web/app/api/bewerben/[id]/rueckgaengig/route.ts` (POST), `web/app/api/bewerberkonten/route.ts` (POST, DELETE), `web/lib/bewerben-api.ts`; Test `web/tests/bewerben-api.test.ts`

**Interfaces — Produces:**
- GET → `{ bewerbung: {id, firma, titel, link}, profil: {vorname, nachname, strasse, plz, ort, telefon, email, linkedin, gehalt_wunsch, kuendigungsfrist_text, fruehester_start: "YYYY-MM-DD"}, dateien: [{art: "cv"|"anschreiben"|"zeugnis"|"zertifikat"|"sonstiges", name, url}], konto: {email, angelegt_am} | null }`; setzt `helfer_geoeffnet_am = now()`. Vorname/Nachname aus `briefkopf.name` (letztes Wort = Nachname). Dateien: CV, Anschreiben, angehakte Anlagen (`bewerbung_anlagen`); signierte Links 600 s.
- POST abgeschickt `{quelle: "knopf"|"erkannt"|"nachfrage"}` → `aufBeworben` + Felder aus Global Constraints + `abgeschickt_quelle` (nur wenn Status vorher `gemerkt`); Antwort `{ok: true, status}`.
- POST rueckgaengig → nur wenn `darfRueckgaengig`; setzt `status='gemerkt'`, `beworben_am=null`, `abgeschickt_quelle=null` mit Bedingung auf unveränderten Status.
- POST bewerberkonten `{host, email, quelle}`; DELETE `?host=`.
- Alle: Anmeldung wie `/api/stellen-import` (gleiche Origin-/Sitzungsprüfung), fremde ID → 404.
- [ ] Step 1: Failing tests mit Fetch-Attrappen-Muster aus `tests/stellen-import.test.ts`: GET fremde Bewerbung → 404; GET setzt `helfer_geoeffnet_am`; Dateien mit Art und `expiresIn 600`; abgeschickt bei `gemerkt` → `abgeschickt_quelle` gesetzt; bei `im_gespraech` → unverändert, `ok`; rueckgaengig bei `im_gespraech` → 409, nichts geschrieben (Review Focus 5); fremde Origin → 403.
- [ ] Step 2: FAIL → Step 3 → Step 4: PASS → Step 5: Commit `Bewerben: Schnittstellen für Paket, Abgeschickt, Rückgängig, Konto-Merker`.

### Task 4: „Unterlagen“: Profilwerte und Konto-Merker

**Files:** Modify `web/app/unterlagen/briefkopf.tsx`, `web/lib/unterlagen.ts` (`pruefeBriefkopf` um die neuen Felder), Create `web/app/unterlagen/konten.tsx`; Test `web/tests/unterlagen.test.ts`
- [ ] Step 1: Failing tests: `gehalt_wunsch` „85.000“ → 85000; negativ → fehler; `kuendigung_menge` 25 → fehler; `kuendigung_termin` „irgendwann“ → fehler.
- [ ] Step 2–4: Felder Gehaltswunsch (€/Jahr), Kündigungsfrist (Zahl + Wochen/Monate + Endtermin), darunter „Frühester Start heute gerechnet: {Datum}“ (`fruehesterStart`); Liste „Konten auf Karriereseiten“ (Host, E-Mail, seit, Löschen) und „Konto hinzufügen“.
- [ ] Step 5: Commit `Unterlagen: Gehaltswunsch, Kündigungsfrist, Konten auf Karriereseiten`.

### Task 5: „Bewerbung anlegen“ und „Bewerbung vorbereiten“

**Files:** Create `web/app/bewerbung/[id]/vorbereiten.tsx`; Modify `web/app/stellen/page.tsx`, `web/app/stellen/[id]/page.tsx` (Knopf „Bewerbung anlegen“ unter „Merken“), `web/app/stellen/actions.ts` (`bewerbungAnlegen(jobId)` = `anlegenAusJob` + Weiterleitung `?vorbereiten=1`), `web/app/bewerbung/[id]/inhalt.tsx` (Knopf bei `gemerkt`, Nachfrage-Leiste); Test `web/tests/bewerben-ui.test.ts`
- [ ] Step 1: Failing tests (reine Teile): Nachfrage-Leiste erscheint genau bei `nachfrageNoetig`; Knopf „Bewerben“ deaktiviert, solange `mussAbgleichen` läuft; Link ist Portal → Hinweis „Auf Jobportalen füllt Jobradar nicht aus.“ statt Weitergabe an die Erweiterung.
- [ ] Step 2–4: Fenster in der Reihenfolge des Designs; CV aus `vorauswahl`, bei `mussAbgleichen` startet der 6b-Abgleich (vorhandene Funktion aus 6b) mit „Wird abgeglichen …“; Anschreiben-Bausteine aus Runde 1; Eckdaten einklappbar. „Bewerben“: speichert Auswahl (CV, Anschreiben, Anlagen-Haken, `gehalt_wunsch`, `kuendigungsfrist`), holt `GET /api/bewerben/<id>`, sendet `window.postMessage({jobradar: "bewerben", paket}, location.origin)` und öffnet **nicht** selbst; antwortet die Erweiterung binnen 1 s nicht (`{jobradar: "bewerben-ok"}`), öffnet die Seite `link` selbst mit Hinweis „Jobradar-Erweiterung nicht gefunden – Anleitung“. Kanban-Animationen unverändert.
- [ ] Step 5: Commit `Bewerbung anlegen und vorbereiten`.

### Task 6: Erweiterung: Übergabe und Tab-Bindung

**Files:** Modify `browser-erweiterung/chrome/manifest.json` (`"host_permissions": ["<all_urls>"]`, `content_scripts` mit `matches ["<all_urls>"]`, `all_frames: true`, `run_at: "document_idle"`, Version `0.2.0`), `background.js`, `kern.mjs`; Create `browser-erweiterung/chrome/helfer.mjs` (Hintergrund-Logik), `browser-erweiterung/chrome/inhalt.js` (Inhalts-Skript); Test `browser-erweiterung/chrome/helfer.test.mjs`

**Interfaces — Produces:** `erstelleHelfer(chrome, {jetzt}) → { uebernehmen(paket, absenderTab), paketFuer(tabId, url) → Paket|null, gemeldet(tabId, art, daten) }`. Bindung `storage.session["helfer:"+tabId] = {bewerbungId, host, bis}`; `paketFuer(tabId, url)` liefert nur, wenn `jetzt < bis` (2 h), `!istPortal(host von url)` und entweder die registrierbare Domain von `url` == die des gebundenen Hosts **oder** `url` ein Rahmen (Frame) im gebundenen Tab auf einem Adapter-Host ist (`*.greenhouse.io`, `*.personio.de`, `*.myworkdayjobs.com`, `*.smartrecruiters.com`, `jobs.lever.co`).
- [ ] Step 1: Failing tests (Attrappe `chrome` wie in `vertrag.test.mjs`): Nachricht von jobradar-Origin → Tab geöffnet, Bindung gespeichert; Nachricht von fremder Origin → nichts; `paketFuer` nach 2 h → null; anderer Host im selben Tab → null (Review Focus 4); Subdomain derselben registrierbaren Domain → Paket; Tab gebunden an `www.firma.example`, Frame-URL `boards.greenhouse.io/firma/jobs/1` → Paket (Review Focus 1); dieselbe Frame-URL in einem nicht gebundenen Tab → null; `indeed.com` → null; Tab geschlossen → Bindung gelöscht; Dateien werden im Hintergrund geladen, nie in `storage.local`.
- [ ] Step 2–4: implementieren; bestehende Import-Tests bleiben grün (`node --test vertrag.test.mjs helfer.test.mjs`).
- [ ] Step 5: Commit `Erweiterung: Bewerben-Übergabe und Tab-Bindung`.

### Task 7: Erweiterung: Ausfüllen, Erkennen, Konto

**Files:** Create `browser-erweiterung/chrome/ausfuellen/allgemein.mjs`, `…/greenhouse.mjs`, `…/personio.mjs`, `…/workday.mjs`, `…/smartrecruiters.mjs`, `…/lever.mjs` (nur die in Task 0 freigegebenen), `…/kasten.mjs`; Fixtures `web/tests/fixtures/formulare/*.html`; Test `web/tests/erweiterung-ausfuellen.test.ts` (jsdom); Modify `web/package.json` (devDependency `jsdom`, Version fest)

**Interfaces — Produces:** je Adapter `{ passt(host: string): boolean, felder(doc): Zuordnung[], absendenKnopf(doc): Element|null, istDanke(doc, url): boolean }`; `fuelleAus(doc, paket, dateien, adapter|null) → { gefuellt: number, pflichtLeer: number }`; Werte per nativem `value`-Setter + `input`/`change`-Ereignis, Dateien per `DataTransfer`; Rand-Klassen `jobradar-gefuellt` / `jobradar-pflicht-leer`.
- [ ] Step 1: Failing tests je Fixture: Felder gefüllt wie erwartet; gefülltes Feld nicht überschrieben; Einwilligungs-Checkbox bleibt `checked === false`; Passwortfeld bleibt leer; **kein `click`/`submit` auf Formular oder Knöpfe** (Spy auf `HTMLElement.prototype.click`, `HTMLFormElement.prototype.submit`/`requestSubmit`); Datei-Feld „Zeugnisse“ bekommt nur Art `zeugnis`; Review Focus 2; allgemein: „Vorname“/„First name“/`autocomplete="given-name"`; unbekanntes Feld leer; Danke: nach Nutzer-Klick auf Absenden + Seite mit „Thank you for applying“ → Meldung `erkannt`; ohne vorherigen Klick → keine Meldung; Fehlerseite → keine (Review Focus 3); Registrierungsform → Name/E-Mail gefüllt, Passwort leer, Kasten „Konto angelegt?“ nach Nutzer-Absenden; Anmeldemaske mit `paket.konto` → Hinweistext mit E-Mail.
- [ ] Step 2–4: implementieren; Kasten mit Texten aus Global Constraints; „Abgeschickt“ und „Ja“ melden über den Hintergrund an `POST /api/bewerben/<id>/abgeschickt` bzw. `/api/bewerberkonten` (Weg wie `uebertrageImAppTab`); „Rückgängig“ → `/rueckgaengig`.
- [ ] Step 5: Commit `Erweiterung: Formulare ausfüllen, Absenden erkennen, Konto-Merker`.

### Task 8: Datenschutz, Doku, Halt

**Files:** Modify `web/app/datenschutz/page.tsx` (Satz aus Design Abschnitt 5), `browser-erweiterung/chrome/README.md` (neue Berechtigung, Neu laden, Grenzen), `docs/STATUS.md`, `docs/agenten-protokoll.md`, `docs/codex-warteschlange.md`
- [ ] Step 1: `cd web && npm test`, `node --test browser-erweiterung/chrome/vertrag.test.mjs browser-erweiterung/chrome/helfer.test.mjs`, `npm run build`, `npm run pruefe:build` → alle grün.
- [ ] Step 2: Commit `Bewerben-Helfer: Datenschutz und Doku`.
- [ ] Step 3: 🛑 Halt. Nutzer spielt Migration 024 ein und lädt die Erweiterung neu (Chrome fragt nach „alle Websites“). Claude prüft mit Wegwerf-Konto `…@example.com` und einer lokalen Test-Karriereseite den ganzen Ablauf (anlegen → vorbereiten → bewerben → ausgefüllt → Absenden auf der Testseite → „automatisch erkannt“ → Rückgängig → Nachfrage), dann auf je einer echten Seite der freigegebenen Systeme **nur bis zum Ausfüllen, ohne Absenden**; Wegwerf-Konto löschen.
