# Meine Bewerbungen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/bewerbungen` zeigt Board und darunter Liste mit Detailspalte (Master-Detail); Formular auf eigenem Reiter.

**Architecture:** Eine Abfrage (`ladeKarten`) speist Board und Liste. Die gewählte Bewerbung steht als `?id=` in der Adresse; nur für sie lädt `ladeDetail` Ort, Link, Personen und Interviews. Detail ist eine Server-Komponente, zweimal gerendert (Spalte breit, unter der Zeile schmal), CSS blendet je nach Breite eine aus.

**Tech Stack:** Next.js 16 App Router (Server Components), Supabase, node:test, Python Playwright für Klicktests.

**Spec:** `docs/superpowers/specs/2026-11-12-meine-bewerbungen-design.md`

## Global Constraints

- Kanban-Animationen, Drag-and-drop, Archiv-Dialog und Seitenfenster nicht verändern (`board.tsx`, `karte.tsx`, `archiv-dialog.tsx`, `fenster.tsx` bleiben inhaltlich gleich).
- Keine Migration, keine neuen Spalten.
- Detailspalte nur zum Ansehen; „Bearbeiten“ = Link `/bewerbung/<id>` (öffnet das Seitenfenster).
- Umbruch auf eine Spalte unter `52rem`.
- Reiter-Texte exakt: `Meine Bewerbungen`, `+ Bewerbung hinzufügen`, `Auswertung`.
- Beim Testen: Screenshots nur bei fehlgeschlagenen Prüfungen; nur `test-…@example.com`-Konten.

## Review Focus

- `?id=` einer Bewerbung, die durch Filter oder Archiv nicht in der Liste ist (oder fremde/ungültige id): Vorauswahl greift, kein Fehler.
- Liste leer (keine Bewerbungen oder Filter ohne Treffer): keine Detailspalte, nur der Leertext.
- Bewerbung ohne Personen/Interviews/Gehalt/Ort: Kacheln zeigen „–“ bzw. „noch keine“, kein Absturz.
- Archivierte Bewerbung gewählt: statt Fortschrittsleiste das Ergebnis (z. B. „Archiv · Absage“).
- Klick auf eine Zeile springt nicht nach oben (`scroll={false}`), Zurück stellt die vorige Wahl her.

---

### Task 1: Vorauswahl und Sortier-Richtung (reine Logik)

**Files:**
- Modify: `web/lib/tracker-karte.ts` (neue Funktion am Ende)
- Modify: `web/lib/bewerbung.ts:89-110` (`leseTabelle`, `tabelleZuUrl`)
- Test: `web/tests/meine.test.ts`

**Interfaces:**
- Produces: `vorauswahl(karten: Karte[], gewuenscht: string | undefined): Karte | null` und `standardRichtung(sort: SortSpalte): "asc" | "desc"`.

- [ ] **Step 1: Tests schreiben** (`web/tests/meine.test.ts`)

```ts
test("vorauswahl: gewünschte id gewinnt, wenn sie in der Liste ist", () => {
  assert.equal(vorauswahl([k("a"), k("b")], "b")?.id, "b");
});
test("vorauswahl: sonst frühester nächster Termin, bei Gleichstand die obere", () => {
  const l = [k("a", "2026-11-20"), k("b", "2026-11-14"), k("c", "2026-11-14")];
  assert.equal(vorauswahl(l, "fremd")?.id, "b");
});
test("vorauswahl: ohne Termine die oberste, leere Liste null", () => {
  assert.equal(vorauswahl([k("a"), k("b")], undefined)?.id, "a");
  assert.equal(vorauswahl([], "a"), null);
});
test("standardRichtung und leseTabelle ohne dir", () => {
  assert.equal(standardRichtung("firma"), "asc");
  assert.equal(standardRichtung("naechster_schritt_faellig"), "asc");
  assert.equal(standardRichtung("geaendert_am"), "desc");
  assert.equal(leseTabelle({ sort: "firma" }).dir, "asc");
  assert.equal(leseTabelle({ sort: "firma", dir: "desc" }).dir, "desc");
});
```
(`k(id, datum?)` baut eine `Karte` mit `naechsterTermin: datum ? { datum, text: "x" } : null`.)

- [ ] **Step 2:** `npm test` → FAIL (Funktionen fehlen).
- [ ] **Step 3:** `vorauswahl` in `tracker-karte.ts`; `standardRichtung` in `bewerbung.ts` (asc für `firma`, `titel`, `status`, `naechster_schritt_faellig`; sonst desc); `leseTabelle` nimmt `standardRichtung(sort)`, wenn `dir` fehlt oder ungültig; `tabelleZuUrl` schreibt `dir` nur, wenn es von `standardRichtung` abweicht.
- [ ] **Step 4:** `npm test` → alle grün (vorhandene Tests zu `tabelleZuUrl` ggf. auf die neue Regel anpassen).
- [ ] **Step 5:** Commit `Meine Bewerbungen: Vorauswahl und Standard-Sortierrichtung`.

### Task 2: Detail laden und anzeigen

**Files:**
- Modify: `web/lib/tracker-daten.ts` (neue Funktion `ladeDetail`)
- Create: `web/app/bewerbungen/detail.tsx` (Server-Komponente)
- Modify: `web/app/globals.css` (Abschnitt „Meine Bewerbungen“)

**Interfaces:**
- Consumes: `Karte` (`tracker-karte.ts`), `FirmenLogo` (`app/firmenlogo.tsx`), `STATUS_LABEL`, `ERGEBNIS_LABEL`, `datumDe`, `BOARD_SPALTEN`.
- Produces: `type Detail = { standort: string | null; praesenzmodell: string | null; link: string | null; job_id: string | null; naechster_schritt: string | null; naechster_schritt_faellig: string | null; personen: { name: string | null; rolle: string | null }[]; interviews: { datum: string | null; format: string | null }[] }`; `ladeDetail(sb, id: string): Promise<Detail | null>` (eine Abfrage: `applications` mit `contacts(name,rolle)` und `interviews(datum,format)`; Fehler → `null` und `console.error`); `<DetailAnsicht karte={Karte} detail={Detail | null} />`.

- [ ] **Step 1:** `ladeDetail` schreiben (Interviews nach Datum aufsteigend sortieren, im Code statt per `order`).
- [ ] **Step 2:** `DetailAnsicht`: Kopf (Logo groß, Firma als `h2`, Titel); Fortschritt als `<ol class="stufen">` über `BOARD_SPALTEN` (bis einschließlich aktuellem Status markiert, „Beworben“ mit `datumDe(beworben_am)`), bei `abgeschlossen` stattdessen `Archiv · <ERGEBNIS_LABEL>`; Kacheln in dieser Reihenfolge: Nächster Schritt (`naechster_schritt` + Fälligkeit), Gehalt (`karte.gehalt`), Ort (`standort` · `praesenzmodell`), Interesse (Sterne, `aria-label`), Personen, Interviews; fehlende Werte als `–` bzw. „noch keine“; Kommentar in Anführungszeichen, wenn vorhanden; Links `Bearbeiten` (`/bewerbung/<id>`) und `Zur Anzeige` (`/stellen/<job_id>` wenn `job_id`, sonst `link` extern, sonst weglassen). `detail === null` → Kacheln aus `Karte` allein, Personen/Interviews als „konnte nicht geladen werden“.
- [ ] **Step 3:** CSS: `.stufen`, `.fakten` (auto-fit, min 170px), `.fakt` nach dem Klick-Entwurf; nur bestehende Tokens.
- [ ] **Step 4:** `npx tsc --noEmit` → keine Fehler.
- [ ] **Step 5:** Commit `Meine Bewerbungen: Detailansicht`.

### Task 3: Seite umbauen, Reiter, alte Adressen

**Files:**
- Create: `web/app/bewerbungen/liste.tsx` (Server-Komponente)
- Modify: `web/app/bewerbungen/page.tsx` (komplett neu aufgebaut), `web/app/bewerbungen/neu/page.tsx`, `web/app/bewerbungen/kanban/page.tsx`, `web/app/bewerbungen/unternav.tsx`, `web/app/bewerbungen/zug-actions.ts:29`, `web/app/bewerbungen/detail-actions.ts:57`, `web/app/globals.css`

**Interfaces:**
- Consumes: Task 1 (`vorauswahl`, `standardRichtung`), Task 2 (`ladeDetail`, `DetailAnsicht`), `ladeKarten`, `Board`, `Woche`, `LinkFormular`, `FilterClient`.
- Produces: `<Liste karten={Karte[]} gewaehlt={Karte | null} detail={Detail | null} sp={SP} />`.

- [ ] **Step 1:** `unternav.tsx`: `LINKS = [["meine","/bewerbungen","Meine Bewerbungen"],["neu","/bewerbungen/neu","+ Bewerbung hinzufügen"],["auswertung","/bewerbungen/auswertung","Auswertung"]]`; Suchparameter nur an „meine“ weitergeben.
- [ ] **Step 2:** `page.tsx`: `h1`, `Woche`, `UnterNav aktiv="meine"`, Archiv-Schalter + `Board` (aus der bisherigen Kanban-Seite, Schalter-Link auf `/bewerbungen`), dann Filterkarte wie bisher, aber Sortierung als `<select name="sort">` mit den Texten Zuletzt geändert / Firma A bis Z / Titel A bis Z / Status / Interesse / Beworben am / Nächster Schritt fällig (kein verstecktes `sort`/`dir`), dann `Liste`. Daten: einmal `ladeKarten(sb, { ...leseTabelle(sp), archiv })`; `gewaehlt = vorauswahl(karten, eins(sp.id))`; `detail = gewaehlt ? await ladeDetail(sb, gewaehlt.id) : null`. Tabelle und `NUR_BREIT`/`SPALTEN` löschen.
- [ ] **Step 3:** `liste.tsx`: `div.meine` (Grid `minmax(0,1fr) minmax(0,1.1fr)`, unter 52rem eine Spalte); links `ul.meine-liste`, je Zeile ein `Link` (`href` = aktuelle Suchparameter + `id`, `scroll={false}`, `aria-current="true"` bei Wahl) mit `FirmenLogo`, Firma, Titel, Status-Chip (`data-status` wie bisher); nach der gewählten Zeile `div.detail-unter` mit `DetailAnsicht` (nur schmal sichtbar); rechts `aside.detail-spalte` (sticky, nur breit sichtbar). Leere Liste → bisheriger Leertext, kein `aside`.
- [ ] **Step 4:** `neu/page.tsx`: `h1`, `Woche`, `UnterNav aktiv="neu"`, Karte mit `LinkFormular`. `kanban/page.tsx`: `redirect` auf `/bewerbungen` mit denselben Suchparametern (`RedirectType.replace`). `revalidatePath("/bewerbungen/kanban")` → `/bewerbungen`; in `detail-actions.ts` `/bewerbungen/kanban` aus der Liste streichen.
- [ ] **Step 5:** `npx tsc --noEmit`, `npm test`, `npm run build` → grün.
- [ ] **Step 6:** Commit `Meine Bewerbungen: Board und Liste auf einer Seite, Formular eigener Reiter`.

### Task 4: Prüfen und Dokumentation

**Files:**
- Create: Scratchpad-Skript `meine.py` (nicht im Repo)
- Modify: `CLAUDE.md` (Abschnitt Tracker/Reiter), `docs/STATUS.md`, `docs/ENTSCHEIDUNGEN.md`

- [ ] **Step 1:** `meine.py` (Wegwerf-Konto, 4 Bewerbungen, eine mit Person + Interview, eine archiviert): (a) `/bewerbungen` zeigt Board und Liste; ohne `?id=` ist die Bewerbung mit frühester Fälligkeit gewählt; (b) Klick auf andere Zeile → URL enthält `id=`, Spalte zeigt deren Firma, `window.scrollY` unverändert; (c) Zurück → vorige Firma; (d) „Bearbeiten“ öffnet `dialog.fenster`; (e) `?id=<fremd>` → Vorauswahl, kein Fehler; (f) Breite 390: Detail unter der Zeile, kein waagerechtes Scrollen; (g) `/bewerbungen/kanban` → `/bewerbungen`; (h) `/bewerbungen/neu` zeigt das Formular; (i) Archiv an + archivierte gewählt → „Archiv · …“.
- [ ] **Step 2:** Bestehenden `klicktest.py` (25 Prüfungen) und `dunkel.py dark|light` laufen lassen; Pfade ggf. anpassen. Erwartet: alles OK.
- [ ] **Step 3:** Doku: Reiter und Master-Detail in CLAUDE.md, ENTSCHEIDUNGEN-Zeile, STATUS „Nächster Schritt“; Checkliste aktualisieren.
- [ ] **Step 4:** Commit `Doku: Meine Bewerbungen`.
