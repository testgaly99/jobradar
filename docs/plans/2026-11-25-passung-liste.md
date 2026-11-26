# Passung in der Stellenliste, Sortierung, Merk-Kategorien, „Anzeige offline“ – Bauplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stellen in der Liste aufklappen mit farbigen Anforderungen, Sortierung nach Passung und nach Rangliste, Merk-Kategorien, Offline-Schild mit weicher Bewerben-Sperre (To-do 49).

**Architecture:** Fünf Pakete, jedes für sich nutzbar und einzeln hochladbar: (1) Offline, (2) Merk-Kategorien, (3) Sortierung sichtbar und Aufklappen, (4) Schätzung im Nachtlauf und Sortierung „Passung“, (5) Listen-Ansicht. Datenbankänderungen als Migrationen 026/027 (vom Nutzer im SQL-Editor eingespielt), Website in `web/`, Nachtlauf in `scraper/cv_abgleich.py` (läuft im privaten Repo).

**Tech Stack:** Next.js 16 (`web/`, Tests mit `node --test` über `npm test`), Supabase/PostgREST, Python 3.12 (`py -m pytest`), SQL-Proben in `tests/sql/`.

**Spec:** `docs/superpowers/specs/2026-11-25-passung-liste-design.md` (Entscheidungen Q313–Q324 in `docs/fragen-und-antworten.md`).

## Global Constraints

- Keine Zahlen zur Passung in der Oberfläche; keine zusätzlichen Farbzeilen. Erlaubt sind nur die Farben im Anzeigentext und „n Stellen“ auf Firmen-Kacheln (Q314-Korrektur, Q317, Q321).
- Farben: grün = belegt, gelb = teilweise/ähnlich/nicht prüfbar, rot = nachweislich nicht erfüllt (Q3). Geschätzt: nur grün/gelb, blasser, Wort „geschätzt“ beim Anforderungsabschnitt.
- Kanban-Animationen bleiben unverändert (Nutzerregel). Keine neuen Board-Spalten, keine geänderten Spalten-IDs.
- CV-Daten nie ins öffentliche Repo, nie ins GitHub-Backup; neue CV-Tabellen in `jobradar-privat/.github/workflows/backup.yml` mit `--exclude-table-data` ausschließen.
- Keine Live-Abrufe vom Computer des Nutzers (CLAUDE.md 3.8). Tests nur mit Fixtures und Wegwerf-Konten `…@example.com`.
- „Passung“ nur für Konten, für die gerechnet wird (Admin-Konto mit Admin-Einwilligung der aktuellen Fassung und mindestens einem CV); Gäste sehen weder Aufklappen noch Ränge.
- Jede Migration ist mehrfach ausführbar (`if not exists`, `create or replace`).
- Kein Datenbank-Trigger, der vom Nutzer gesetzte Felder sperrt (die Website schreibt mit dem Login des Nutzers).

## Review Focus

1. Stelle wird zwischen Laden der Seite und Klick „Bewerben“ offline → Server lehnt ab (nicht nur die Oberfläche); Test in Task 2.
2. Konto A versucht `merk_stufe` oder `cv_ergebnisse` von Konto B zu ändern/lesen → RLS verweigert; SQL-Probe in Task 4 und Task 8.
3. CV gelöscht oder geändert → alle Ergebnisse weg (Trigger aus 018), Sortierung „Passung“ zeigt dann alles „ohne Ergebnis“ am Ende nach Datum, keine Fehlermeldung; Test in Task 10.
4. Schätzung trifft auf vorhandenes Claude-Ergebnis → überschreibt es nie; Test in Task 9.
5. Liste mit Filter „Liste = DAX“ und Ansicht-Kategorie „Große Unternehmen“ → leere Listen erscheinen nicht, kein Fehler; Test in Task 11.

---

## Paket 1: „Anzeige offline“

### Task 1: Offline-Regeln als reine Funktionen

**Files:**
- Create: `web/lib/offline.ts`
- Test: `web/tests/offline.test.ts`

**Interfaces:**
- Produces: `offlineSeit(job: { status?: string | null; zuletzt_gesehen?: string | null } | null | undefined): string | null` (ISO-Datum = Tag nach `zuletzt_gesehen`, nur wenn `status === "geschlossen"`); `bewerbenGesperrt(status: Status, offline: boolean, trotzdem: boolean): boolean`; `OFFLINE_GESPERRT: string`.

- [ ] **Step 1: Failing test**

```ts
test("offline nur bei geschlossener Stelle, Datum = Tag nach zuletzt gesehen", () => {
  assert.equal(offlineSeit({ status: "geschlossen", zuletzt_gesehen: "2026-11-24" }), "2026-11-25");
  assert.equal(offlineSeit({ status: "offen", zuletzt_gesehen: "2026-11-24" }), null);
  assert.equal(offlineSeit(null), null);
});
test("Sperre nur für gemerkte, offline, ohne trotzdem", () => {
  assert.equal(bewerbenGesperrt("gemerkt", true, false), true);
  assert.equal(bewerbenGesperrt("gemerkt", true, true), false);
  assert.equal(bewerbenGesperrt("beworben", true, false), false);
  assert.equal(bewerbenGesperrt("gemerkt", false, false), false);
});
```

- [ ] **Step 2:** `cd web; npm test` → FAIL (Modul fehlt).
- [ ] **Step 3:** Implementieren. `OFFLINE_GESPERRT = "Die Anzeige ist offline. Schon beworben? Dann „Trotzdem eintragen“."`; Datumsrechnung mit vorhandenem `tagePlus` aus `web/lib/filter.ts`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `web/lib/offline.ts web/tests/offline.test.ts`.

### Task 2: Sperre auf dem Server an allen drei Wegen nach „Beworben“

**Files:**
- Modify: `web/lib/tracker-daten.ts` (`ladeZugZeile`: zusätzlich `jobs(status)` lesen, Rückgabe `offline: boolean`)
- Modify: `web/app/bewerbungen/zug-actions.ts` (`zugAusfuehren(id, vonStatus, ziel, trotzdem = false)`)
- Modify: `web/app/bewerbungen/detail-actions.ts` (`abschnittSpeichern`: Formularfeld `trotzdem=1`)
- Modify: `web/app/stellen/actions.ts` (`beworben(jobId, trotzdem = false)`)
- Test: `web/tests/offline-sperre.test.ts`

**Interfaces:**
- Consumes: `bewerbenGesperrt`, `OFFLINE_GESPERRT` (Task 1).
- Produces: `ladeZugZeile(...)` → `{ alt, ohne006, fehler, offline: boolean }`; `zugAusfuehren(id, vonStatus, ziel, trotzdem?: boolean)`.

- [ ] **Step 1: Failing tests** mit dem vorhandenen Supabase-Attrappen-Muster aus `web/tests/bewerbung-schutz.test.ts`: `zugAusfuehren` auf gemerkte Bewerbung mit geschlossener Stelle → `{ ok: false, fehler: OFFLINE_GESPERRT }` und kein PATCH; mit `trotzdem = true` → PATCH mit `status: "beworben"`; Bewerbung ohne `job_id` → nie gesperrt.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Prüfung jeweils direkt nach dem Lesen der Zeile und vor dem Update; gilt nur, wenn das Ziel ≥ „beworben“ ist. `bewerbungAusLink`/`aufBeworben` (Link-Import) bleibt unberührt: Wer einen Link als beworben einträgt, erklärt das ausdrücklich (Ruling, im Agentenprotokoll vermerken).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit.

### Task 3: Schild und „Trotzdem eintragen“ in der Oberfläche

**Files:**
- Modify: `web/lib/tracker-karte.ts` (`Karte.offlineSeit: string | null`, `baueKarte` liest `a.jobs?.status`, `a.jobs?.zuletzt_gesehen`)
- Modify: `web/lib/tracker-daten.ts` (`VOLL`/`OHNE`: `jobs(steckbrief,status,zuletzt_gesehen,…)`)
- Modify: `web/app/bewerbungen/kanban/karte.tsx`, `web/app/bewerbungen/liste.tsx`, `web/app/bewerbungen/detail.tsx`, `web/app/bewerbung/[id]/inhalt.tsx`, `web/app/stellen/[id]/page.tsx`
- Modify: `web/app/stil/utilitaer.css` (Klasse `chip-offline`)
- Test: `web/tests/tracker-daten.test.ts`

- [ ] **Step 1: Failing test:** `baueKarte({… jobs: { status: "geschlossen", zuletzt_gesehen: "2026-11-24" } }, [], [], "2026-11-25").offlineSeit === "2026-11-25"`.
- [ ] **Step 2–4:** Implementieren, `npm test` grün. Schild-Text: `Offline seit {datumDe(offlineSeit)}`. Bei gemerkt + offline: Bewerben-Knöpfe und Option „Beworben“ im Auswahlfeld deaktiviert, darunter kleiner Knopf „Schon beworben? Trotzdem eintragen“ mit `confirm`-freier Rückfrage (zweiter Klick „Ja, eintragen“, wie `LoeschForm` in `web/app/bewerbungen/knoepfe.tsx`). Board: Fehler aus `zugAusfuehren` wird wie heute angezeigt, Karte springt zurück; keine Änderung an Animationen.
- [ ] **Step 5:** Klicktest (webapp-testing, Wegwerf-Konto, künstliche geschlossene Stelle in der Datenbank anlegen und danach löschen): Schild sichtbar, Ziehen nach „Beworben“ abgelehnt, „Trotzdem eintragen“ setzt „Beworben“. Commit.

---

## Paket 2: Merk-Kategorien

### Task 4: Migration 026 `merk_stufe`

**Files:**
- Create: `supabase/migrations/026_merk_stufe.sql`
- Create: `tests/sql/merk_stufe.sql`

- [ ] **Step 1:** SQL-Probe schreiben: nach der Migration haben bestehende Zeilen `merk_stufe = 'gemerkt'`, neue Zeilen `'neu'`; Wert `'xyz'` scheitert am Check; Konto B kann die Zeile von Konto A nicht ändern (RLS).
- [ ] **Step 2:** Probe gegen Wegwerf-PostgreSQL (wie bei 020) → FAIL.
- [ ] **Step 3:** Migration: Spalte zuerst mit Default `'gemerkt'` anlegen (füllt Bestand), dann Default auf `'neu'` umstellen; Check `merk_stufe in ('neu','gemerkt','spaeter')`. Keine neue Policy nötig (bestehende Update-Policy auf `applications`).
- [ ] **Step 4:** Probe zweimal hintereinander → PASS (mehrfach ausführbar).
- [ ] **Step 5:** Commit; Nutzer-To-do „Migration 026 einspielen“ in STATUS und Checkliste.

### Task 5: Unterteilung, Schild und Knöpfe

**Files:**
- Modify: `web/lib/tracker-karte.ts` (`Karte.merkStufe: "neu" | "gemerkt" | "spaeter"`, `MERK_STUFEN`, `nachMerkStufe(karten: Karte[]): Record<MerkStufe, Karte[]>`)
- Modify: `web/lib/tracker-daten.ts` (`BASIS` + `merk_stufe`; ohne Spalte → alle `"gemerkt"`, über `spaltenFehlen`)
- Modify: `web/app/bewerbungen/zug-actions.ts` (`merkStufeSetzen(id: string, stufe: MerkStufe): Promise<{ ok: true } | Fehler>`, Update nur mit `.eq("status", "gemerkt")`)
- Modify: `web/app/bewerbungen/kanban/karte.tsx` (Schild „Neu“/„Später“, kein Schild bei „gemerkt“), `web/app/bewerbungen/liste.tsx` (drei Gruppen „Neu gemerkt“, „Gemerkt“, „Für später“ innerhalb von Status „Gemerkt“, je Zeile Knöpfe „Gemerkt“ / „Für später“), `web/app/bewerbungen/detail.tsx` (dieselben Knöpfe)
- Test: `web/tests/board.test.ts`, `web/tests/tracker-daten.test.ts`

- [ ] **Step 1: Failing tests:** `nachMerkStufe` gruppiert und erhält die Reihenfolge; `baueKarte` übernimmt `merk_stufe`, fehlt sie → `"gemerkt"`.
- [ ] **Step 2–4:** Implementieren, `npm test` grün. „Rückgängig“ (`zugRueckgaengig`) fasst `merk_stufe` nicht an (Ruling: Design nannte `zurueckZuGemerkt`, der Weg ist aber schon gesperrt).
- [ ] **Step 5:** Klicktest: Stelle in der Stellenliste merken → erscheint unter „Neu gemerkt“ mit Schild „Neu“ auf der Karte; „Für später“ → Gruppe wechselt, Schild „Später“; Board-Animationen unverändert (Ziehen wie vorher). Commit.

---

## Paket 3: Sortierung sichtbar, Aufklappen

### Task 6: Sortierung über der Liste, Wahl merken

**Files:**
- Modify: `web/lib/filter.ts` (`SORTIERUNG = ["passung", "neu", "firma", "titel", "groesse", "rangliste"]`; alter Wert `rang` aus Adressen wird zu `rangliste`; `Filter.ansicht_kategorie: string` aus Adressparameter `kat`; Cookie `stellen_sort` speichert `sort` und `kat`)
- Create: `web/app/stellen/sortierung.tsx` (Client-Komponente: Auswahlfeld, navigiert zu `filterZuUrl({...f, sort, seite: 1})`, schreibt Cookie `stellen_sort`)
- Modify: `web/app/stellen/page.tsx` (Auswahl aus dem Filterkasten entfernen, `<Sortierung>` über `#stellenliste`; ohne `sort`-Parameter Cookie lesen, sonst Standard)
- Modify: `web/lib/stellen.ts` (bis Paket 4: `passung` und `rangliste` sortieren wie `neu`)
- Test: `web/tests/filter.test.ts`

**Interfaces:**
- Produces: `standardSortierung(passungVerfuegbar: boolean, cookie: string | undefined): Sortierung` in `web/lib/filter.ts`.

- [ ] **Step 1: Failing tests:** `leseFilter({ sort: "rang" }).sort === "rangliste"`; `standardSortierung(true, undefined) === "passung"`; `standardSortierung(false, undefined) === "neu"`; `standardSortierung(false, "passung") === "neu"` (Option nicht verfügbar); `standardSortierung(true, "firma") === "firma"`.
- [ ] **Step 2–4:** Implementieren, `npm test` grün. „Passung“ und „Nach Rangliste“ erscheinen im Auswahlfeld nur, wenn verfügbar (Passung: siehe Global Constraints; Rangliste: angemeldet und Katalog verfügbar). Bis Paket 4 ist `passungVerfuegbar` immer `false`.
- [ ] **Step 5:** Klicktest Handy-Breite (390 px): Auswahl sichtbar ohne Aufklappen des Filterkastens. Commit.

### Task 7: Anzeige in der Liste aufklappen

**Files:**
- Create: `web/app/stellen/anzeige-aufklappen.tsx` (Client: `<details>`; beim ersten Öffnen `anzeigeLaden(jobId)`, dann `<Abschnitte … spalten={…} />` aus `web/app/abschnitte.tsx`, ohne `AbgleichKopf`)
- Modify: `web/app/stellen/actions.ts` (`anzeigeLaden(jobId: string): Promise<{ abschnitte: Anzeigenteil[] | null; text: string | null; begriffe: string[]; spalten: Spalte[]; geschaetzt: boolean } | { fehler: string }>`)
- Modify: `web/app/stellen/page.tsx` (je Stelle `<AnzeigeAufklappen jobId>` nur für angemeldete Nutzer)
- Test: `web/tests/anzeige-aufklappen.test.ts`

**Interfaces:**
- Consumes: `ladeAbgleich` (`web/app/cv-abgleich.tsx`), `leseAbschnitte` (`web/lib/anzeige`), Wichtige-Punkte-Begriffe wie in `web/app/stellen/[id]/page.tsx`.
- Produces: `anzeigeLaden` (wird in Task 12 wiederverwendet); `geschaetzt` ist bis Paket 4 immer `false`.

- [ ] **Step 1: Failing tests:** ohne Anmeldung → `{ fehler }`; ungültige ID (nicht `ID_FORM`) → `{ fehler }`; mit Attrappe → Abschnitte und Spalten durchgereicht.
- [ ] **Step 2–4:** Implementieren, `npm test` grün; Typprüfung `npx tsc --noEmit`.
- [ ] **Step 5:** Klicktest: Aufklappen lädt erst beim Klick (Netzwerk: eine Anfrage je Öffnen), Farben wie auf der Detailseite, Gast sieht kein Aufklappen. Commit; **Paket 1–3 hochladbar** (Frage an den Nutzer).

---

## Paket 4: Schätzung und Sortierung „Passung“

### Task 8: Migration 027 Schätzung und Sortwert

**Files:**
- Create: `supabase/migrations/027_passung.sql`
- Create: `tests/sql/passung.sql`
- Modify: `jobradar-privat/.github/workflows/backup.yml` nur falls eine neue CV-Tabelle entsteht (Plan sieht keine vor)

- [ ] **Step 0:** Actions-Minuten des privaten Repos prüfen (`gh api` Abrechnung bzw. Laufdauern der letzten 30 Tage aus `gh run list --repo …/jobradar-privat --json`) und Ergebnis in STATUS; reicht das Kontingent nicht für +15 min/Nacht, `SCHAETZ_BUDGET_S` in Task 9 senken.
- [ ] **Step 1:** SQL-Probe: `weg = 'schaetzung'` erlaubt; Spalte `passung_sortwert integer` (null erlaubt); View `stellen_passung` (`security_invoker = true`) liefert je offene Stelle `passung_sortwert` nur aus eigenen Ergebnissen (`owner_id = auth.uid()`), für Konto B null; `ranking_stellen` liefert dieselbe Spalte.
- [ ] **Step 2–4:** Migration schreiben, Probe zweimal → PASS.
- [ ] **Step 5:** Commit; Nutzer-To-do „Migration 027 einspielen“.

### Task 9: Sortwert und Schätzung im Nachtlauf

**Files:**
- Modify: `scraper/cv_abgleich.py` (`passung_sortwert`, `_schaetzen`, `offen`, `_speichere`, `main`)
- Modify: `scraper/db.py` (`stellen_fuer_schaetzung(owner) -> list[dict]`, `speichere_ergebnis(..., passung_sortwert=…)`)
- Test: `tests/test_cv_abgleich.py`

**Interfaces:**
- Produces: `passung_sortwert(anforderungen: list[dict], je_cv: dict[str, dict[str, dict]], empfohlen: list[str]) -> int | None` – kleiner ist besser; je CV `1000 * muss_rot + round(100 * (gelb + 1.5 * soll_rot) / n)`, Minimum über die empfohlenen CVs; `None` bei leerer Anforderungsliste. `SCHAETZ_BUDGET_S = 900`.

- [ ] **Step 1: Failing tests:**
  - `passung_sortwert`: keine Farben außer grün → 0; ein Muss-Rot → ≥ 1000; ein Soll-Rot bei 10 Anforderungen → 15; zwei Gelb bei 10 → 20; leere Liste → `None`.
  - `offen()` behandelt `weg == 'schaetzung'` wie `browser-vorlaeufig` (Claude darf überschreiben).
  - `_schaetzen` speichert `weg='schaetzung'`, Farben nur `gruen`/`gelb` (`stufe == 'sicher'` → grün, sonst gelb), überspringt Stellen mit vorhandenem Claude-Ergebnis, hält das Zeitbudget ein (Attrappe für `time.monotonic`).
  - Ein Fehler in `_schaetzen` bricht `main` nicht ab (Exitcode 0, Hinweis im Protokoll ohne Firmen- oder Stellennamen).
- [ ] **Step 2:** `py -m pytest tests/test_cv_abgleich.py -q` → FAIL.
- [ ] **Step 3:** `_schaetzen` läuft je Admin-Konto nach dem Claude-Teil in eigenem `try` und nutzt denselben Einbettungs-Cache; `db.stellen_fuer_schaetzung`: offene, sichtbare Stellen sichtbarer Firmen mit `anforderungs_hash`, ohne Ergebnis oder mit veralteter Schätzung; neueste zuerst.
- [ ] **Step 4:** `py -m pytest -q` → alle grün.
- [ ] **Step 5:** Commit.

### Task 10: Sortierung „Passung“ und blasse Farben in der Website

**Files:**
- Modify: `web/lib/stellen.ts` (`sort === "passung"`: `from("stellen_passung")` bzw. `ranking_stellen`, `.order("passung_sortwert", { nullsFirst: false }).order("erstmals_gesehen", { ascending: false }).order("id")`)
- Create: `web/lib/passung.ts` (`passungVerfuegbar(sb: SupabaseClient, nutzer): Promise<boolean>`: Admin + aktuelle Admin-Einwilligung aus `web/lib/cv-einwilligung.json` + mindestens ein CV)
- Modify: `web/app/stellen/page.tsx`, `web/app/stellen/actions.ts` (`anzeigeLaden` setzt `geschaetzt` aus `weg`), `web/app/abschnitte.tsx` / `web/app/cv-marke.tsx` (Klasse `geschaetzt` = blasser, Wort „geschätzt“ an der Überschrift „Anforderungen“), `web/app/stil/utilitaer.css`
- Modify: `web/app/datenschutz/page.tsx` (Satz zum täglichen Abgleich um „auch eine kostenlose Vorab-Schätzung ohne KI-Dienst“ ergänzen)
- Test: `web/tests/stellen.test.ts`, `web/tests/passung.test.ts`

- [ ] **Step 1: Failing tests:** Abfrage für `sort=passung` nutzt die View und ordnet nach `passung_sortwert` mit `nullsFirst: false`; `passungVerfuegbar` ist `false` ohne Einwilligung, ohne CV und für Nicht-Admins; Stellen ohne Ergebnis erscheinen am Ende (Review Focus 3).
- [ ] **Step 2–4:** Implementieren, `npm test`, `npx tsc --noEmit` grün.
- [ ] **Step 5:** Nach Einspielen von 027 und einem Nachtlauf: Klicktest mit Wegwerf-Admin-Konto und künstlichem CV (danach aufräumen). Erster echter Lauf auf GitHub: Laufzeit und Zahl geschätzter Stellen ablesen. Commit; **Paket 4 hochladbar** (Frage an den Nutzer; Änderung an `scraper/` → zweite Prüfung, CLAUDE.md 4.3).

---

## Nachträge 2026-11-26 (Q330–Q332), vor Paket 5 auszuführen

### Task 13: Sortier-Menü neu (Empfohlen, Richtung, Ranglisten-Untermenü)

**Files:**
- Modify: `web/lib/filter.ts` (`SORTIERUNG = ["passung", "neu", "groesse", "rangliste"]` – `firma`/`titel` entfallen, alte Adressen mit `sort=firma|titel` → Standard; `Filter.richtung: "auf" | "ab"` aus Adressparameter `dir`; `Filter.rangliste: string` aus Adressparameter `rl` = `"alle"` oder eine Listen-ID, ersetzt `ansicht_kategorie`/`kat`; Cookie `stellen_sort` speichert `sort`, `dir`, `rl`)
- Modify: `web/lib/stellen.ts` (Richtung je Sortierung umkehren; Standardrichtung: Empfohlen = beste zuerst, Online seit = neueste zuerst, Größe = größte zuerst, Rangliste = Platz 1 zuerst; `passung_sortwert` bleibt `nullsFirst: false` in beiden Richtungen)
- Modify: `web/app/stellen/sortierung.tsx` (eigenes Aufklapp-Menü statt `<select>`: Einträge „Empfohlen“ (Anzeigename für `passung`), „Online seit“, „Größe“, „Nach Rangliste ▸“; Untermenü öffnet bei Mauszeiger darüber und per Antippen/Tastatur (Enter, Pfeiltasten, Esc), Einträge „Alle Ranglisten“ + jede für das Konto sichtbare Liste; daneben Knopf ↑/↓ mit `aria-label` „Richtung umkehren“)
- Modify: `web/app/stellen/page.tsx`, `web/app/stil/utilitaer.css`
- Test: `web/tests/filter.test.ts`, `web/tests/stellen.test.ts`

- [ ] **Step 1: Failing tests:** `leseFilter({ sort: "firma" }).sort` ist der Standard, nicht `firma`; `leseFilter({ dir: "auf" }).richtung === "auf"`, ungültig → `"ab"`; `leseFilter({ rl: "dax" }).rangliste === "dax"`, leer → `"alle"`; Abfrage `sort=neu, dir=auf` ordnet `erstmals_gesehen` aufsteigend; `sort=passung, dir=auf` ordnet `passung_sortwert` absteigend mit `nullsFirst: false`.
- [ ] **Step 2–4:** Implementieren, `npm test`, `npx tsc --noEmit` grün. Keine Zahlen zur Passung, Anzeigename „Empfohlen“ überall (auch Klickfragen-Texte in der Oberfläche).
- [ ] **Step 5:** Klicktest (Controller, gebündelt): Menü per Maus, Tastatur und 390 px. Commit.

### Task 14: Seitenbreite und Feinschliff Stellenliste (Q330, Nutzer-Bildschirmfoto)

**Files:**
- Modify: `web/app/stil/utilitaer.css` (`--container` auf `1600px`; Kopfzeile volle Breite bleibt; Fließtext `.anzeige`/`.prosa` bleibt bei `70ch`)
- Modify: `web/app/globals.css` nur falls nötig
- Test: kein Unit-Test (reines CSS); Prüfung im Klicktest

- [ ] **Step 1:** Breite umsetzen; Stellenliste nutzt die Breite (Filterleiste links, Liste rechts).
- [ ] **Step 2:** Feinschliff aus dem Bildschirmfoto (1.912 px): Beschriftung der Sortierung bricht nicht um; Filterleiste ohne eigenen inneren Scrollbalken (scrollt mit der Seite); Kategorie-Etikett (z. B. „Große Unternehmen“) als Etikett in Textbreite statt vollbreitem Balken.
- [ ] **Step 3:** Klicktest (Controller) bei 1.920 px und 390 px mit Bildschirmfoto zum Vergleich. Commit.

**Auswirkung auf Paket 5:** Statt „Kategorie“ (Q321) wählt Task 13 `rl` = „Alle Ranglisten“ oder eine einzelne Liste. Task 11/12 zeigen bei `alle` alle sichtbaren Listen untereinander in fester Reihenfolge (`LISTEN_REIHENFOLGE`, Kategorien nur noch als Ordnungshilfe), bei einer einzelnen Liste nur deren Firmen nach Platz; `kat`/`ansicht_kategorie` entfällt.

## Paket 5: Listen-Ansicht „Nach Rangliste“

### Task 11: Daten der Listen-Ansicht

**Files:**
- Create: `web/lib/listen-ansicht.ts`
- Test: `web/tests/listen-ansicht.test.ts`

**Interfaces:**
- Produces:
  - `LISTEN_REIHENFOLGE: Record<string, string[]>` (Kategorie → Listen-IDs, Börsennotiert: `["dax", "mdax", "sdax", "tecdax"]`; unbekannte Listen hinten nach Name).
  - `type Kachel = { firma: string; logo: string | null; rang: number | null; stellen: number }`; `type ListeBlock = { id: string; name: string; kacheln: Kachel[] }`.
  - `gruppiere(zuordnungen: RankingZuordnung[], stellenJeFirma: Map<string, number>, groesseRang: Map<string, number>, logos: Map<string, string>, kategorie: string, listenKategorie: Map<string, string>): ListeBlock[]`
  - `ladeListenAnsicht(sb: SupabaseClient, f: Filter, kategorie: string): Promise<{ bloecke: ListeBlock[]; fehler: string | null }>`

- [ ] **Step 1: Failing tests:** Liste mit Rang sortiert Kacheln nach Rang; Liste ohne Rang nach `groesseRang`, dann Name; Firma ohne passende Stelle fehlt; leere Liste fehlt (Review Focus 5); Firma in DAX und TecDAX erscheint in beiden; Reihenfolge DAX vor MDAX vor SDAX vor TecDAX.
- [ ] **Step 2–4:** `ladeListenAnsicht` zählt passende Stellen je Firma mit derselben Filterlogik wie `stellenAbfrage` (nur Spalte `unternehmen`, seitenweise über `range`, ohne Seitengrenze der Liste); Ränge über `ladeRankingZuordnungen` (Sichtbarkeit bleibt bei RLS). `npm test` grün.
- [ ] **Step 5:** Commit.

### Task 12: Oberfläche der Listen-Ansicht

**Files:**
- Create: `web/app/stellen/listen-ansicht.tsx` (Server-Komponente: Kategorie-Auswahl neben der Sortierung, Blöcke als `<details open>`, Kacheln mit Logo, Name, „Platz n“ nur bei Rang, „n Stellen“)
- Create: `web/app/stellen/firma-aufklappen.tsx` (Client: lädt beim Öffnen `firmenStellen(firma, query)` und zeigt je Stelle Titel + `<AnzeigeAufklappen>`)
- Modify: `web/app/stellen/actions.ts` (`firmenStellen(firma: string, query: string): Promise<{ stellen: { id: string; titel: string; ort: string | null }[] } | { fehler: string }>`, sortiert nach Passung, wenn verfügbar, sonst neueste)
- Modify: `web/app/stellen/page.tsx` (bei `sort === "rangliste"` statt Liste und Seitenleiste die Listen-Ansicht)
- Test: `web/tests/listen-ansicht.test.ts`

- [ ] **Step 1: Failing tests:** `firmenStellen` ohne Anmeldung → `{ fehler }`; Filter aus `query` werden angewendet (Attrappe prüft Parameter); Kategorie aus `f.ansicht_kategorie` (Adresse `kat`), sonst Cookie `stellen_sort` (Task 6 speichert Sortierung und Kategorie zusammen), ungültige Werte → erste verfügbare Kategorie; angeboten werden nur Kategorien mit mindestens einer für das Konto sichtbaren Liste.
- [ ] **Step 2–4:** Implementieren, `npm test`, `npx tsc --noEmit` grün.
- [ ] **Step 5:** Klicktest (Laptop und 390 px): Börsennotiert zeigt DAX vor MDAX, Kacheln ohne Platz nach Größe, Top-200-Liste mit „Platz n“, Firma aufklappen → Stellen nach Passung, Stelle aufklappen → farbige Anforderungen. Commit.

---

## Abschluss (nach jedem hochzuladenden Paket)

- [ ] `py -m pytest -q`, `cd web; npm test; npx tsc --noEmit` grün; `/ponytail-review` über den Paket-Diff.
- [ ] Bei Änderungen an `scraper/`, `.github/` oder Migrationen: zweite Prüfung durch unabhängigen Helfer (CLAUDE.md 4.3).
- [ ] `docs/STATUS.md` (To-do 49, neue Nutzer-To-dos für 026/027), Checkliste, `docs/ENTSCHEIDUNGEN.md` (Rulings dieses Plans).
- [ ] Geheimnis- und Personendaten-Scan der neuen Zeilen; Hochladen und Übernahme in `main` nur nach Nutzerfreigabe.
