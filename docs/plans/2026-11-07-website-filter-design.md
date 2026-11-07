# Website 1.1 – mehr Filter, neues Design, Scroll-Fix: Implementation Plan

> **Status: PAUSIERT (2026-11-08).** Dieser Plan wartet, bis die Architektur geklärt ist (CLAUDE.md Abschnitt 5).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Filter für Erfahrungslevel, Arbeitsmodell, Vertragsart, Bereich, Unternehmen und Stadt, ein modernes und farbiges Design mit Hell- und Dunkelmodus, und eine Filterleiste, die sich scrollen lässt.

**Architecture:** Die neuen Merkmale werden **in Python beim Abruf** ermittelt und mit jeder Stelle gespeichert. Die Website filtert sie dann nur noch. Die Adapter liefern zusätzlich `abteilung`, `arbeitsmodell` und `vertragsart`. `filter.py` leitet `erfahrungslevel` und `staedte` aus Titel und Ort ab. `app.js` bekommt neue Filtergruppen, ohne dass sich die Logik grundlegend ändert.

**Tech Stack:** Python 3.12 (Standardbibliothek), JavaScript und CSS ohne Framework.

**Spec:** Nutzerfeedback vom 2026-11-07 (Filterleiste schwer scrollbar, Oberfläche langweilig, zu wenige Filter), die Antworten auf die Rückfragen, `CLAUDE.md` und der Plan `2026-11-07-version-1.md`, dessen Global Constraints weiter gelten.

## Global Constraints

- Alle Constraints aus `docs/plans/2026-11-07-version-1.md` gelten weiter: höfliches Abrufen, `beschreibung_kurz` mit höchstens 300 Zeichen, kein Löschen von Stellen, Fehler pro Firma, keine Geheimnisse, deutsche Commits.
- Neue Felder einer Stelle, zusätzlich zu den bisherigen 10:
  - `abteilung` (str, `""` wenn unbekannt)
  - `arbeitsmodell` ∈ {`Remote`, `Hybrid`, `Vor Ort`, `""`}
  - `vertragsart` ∈ {`Vollzeit`, `Teilzeit`, `Befristet`, `""`}
  - `erfahrungslevel` ∈ {`Junior`, `Mid`, `Senior`, `Lead`}
  - `staedte` (`list[str]`, deutsche Städte in deutscher Schreibweise, z. B. `München`, `Köln`)
- Bereits gespeicherte Stellen bekommen die neuen Felder beim nächsten Lauf. `abgleichen` aktualisiert die Felder ohnehin. Stellen, die geschlossen bleiben, behalten fehlende Felder, und die Website muss das aushalten (fehlendes Feld = `""` bzw. `[]`).
- Die Website bleibt ohne Framework, ohne CDN und ohne Build-Schritt. Daten werden nur über `textContent` angezeigt. Mindestkontrast nach WCAG AA, in Hell und Dunkel.
- Leere Filtergruppe = keine Einschränkung. Alle Filter stehen in der URL.

## Review Focus

1. **Titel mit mehreren Signalen** („Senior Engineering Manager“, „Head of Junior Talent“): Es zählt die höchste Stufe, also Lead vor Senior vor Junior. → Test in Task 1.
2. **Ortsangaben mit vielen Städten** („Berlin; London; Munich; Paris“): `staedte = ["Berlin", "München"]`. → Test in Task 1.
3. **Alte Datensätze ohne neue Felder** in `daten.json`: Die Website stürzt nicht ab, und diese Stellen erscheinen nur, wenn die jeweilige Filtergruppe leer ist. → Test in Task 3.
4. **Viele Filtergruppen auf dem Handy**: Jede Gruppe ist einzeln aufklappbar, damit die Leiste kurz bleibt. Am Laptop scrollt die Leiste selbst (`max-height` + `overflow-y: auto`). → Task 4.
5. **Dunkelmodus**: Er folgt der Systemeinstellung und hat genügend Kontrast. → Task 4.

---

### Task 1: Erfahrungslevel und Städte ableiten

**Files:** Modify `scraper/filter.py`, Test `tests/test_filter.py`

**Interfaces:**
- Produces: `erfahrungslevel(titel: str) -> str`
  - `Lead`: head of, lead, principal, staff, director, vp, vice president, chief, leiter, leitung
  - `Senior`: senior, sr.
  - `Junior`: junior, jr., trainee, graduate, entry, berufseinsteiger
  - sonst `Mid`
  - Ganze Wörter, Groß-/Kleinschreibung egal, Reihenfolge der Prüfung: Lead → Senior → Junior.
- Produces: `deutsche_staedte(ort_text: str) -> list[str]`
  - nutzt die vorhandene Städteliste
  - ordnet englische Namen und Umschreibungen ohne Umlaute einer deutschen Schreibweise zu (Munich/Muenchen → München, Cologne → Köln, Nuremberg → Nürnberg, Duesseldorf → Düsseldorf, Frankfurt am Main → Frankfurt)
  - keine Duplikate, Reihenfolge wie im Text

- [ ] Tests:
  - „Senior Engineering Manager“ → `Senior`
  - „Head of Junior Talent“ → `Lead`
  - „Trainee Finance“ → `Junior`
  - „Backend Engineer“ → `Mid`
  - „Teamleiter Controlling“ → `Mid` („Teamleiter“ ist ein anderes Wort als „Leiter“)
  - „Leiter Controlling“ → `Lead`
  - `deutsche_staedte("Berlin; London; Munich; Paris")` → `["Berlin", "München"]`
  - `deutsche_staedte("Remote - Europe")` → `[]`
- [ ] Rot → Code → Grün → Commit: `Erfahrungslevel und Städte aus Titel und Ort ableiten`

### Task 2: Adapter liefern Bereich, Arbeitsmodell und Vertragsart; Lauf speichert alle neuen Felder

**Files:** Modify `scraper/ats/greenhouse.py`, `scraper/ats/ashby.py`, `scraper/bestand.py` (FELDER), `scraper/run.py`. Tests: `tests/test_greenhouse.py`, `tests/test_ashby.py`, `tests/test_bestand.py`, `tests/test_run.py`.

**Interfaces:**
- Beide Adapter geben zusätzlich `abteilung`, `arbeitsmodell` und `vertragsart` zurück.
  - Greenhouse:
    - `abteilung` = `departments[0].name`, Leerzeichen am Rand entfernt
    - `arbeitsmodell` = `Remote`, wenn „remote“ in `ort` steht; `Hybrid`, wenn „hybrid“ darin steht; sonst `""`
    - `vertragsart` = `""`
  - Ashby:
    - `abteilung` = `department`, Leerzeichen am Rand entfernt
    - `arbeitsmodell`: `workplaceType` Remote → `Remote`, Hybrid → `Hybrid`, OnSite → `Vor Ort`, sonst `""`
    - `vertragsart`: `employmentType` FullTime → `Vollzeit`, PartTime → `Teilzeit`, Contract/Temporary → `Befristet`, sonst `""`
- `run.py` ergänzt jede Stelle **vor** `abgleichen` um `erfahrungslevel(titel)` und `staedte = deutsche_staedte(ort)`.
- `bestand.FELDER` umfasst alle neuen Felder, damit sie auch bei bekannten Stellen aktualisiert werden.

- [ ] Fixture-Tests der Adapter erweitern. Test in `test_run.py`: Eine gespeicherte Stelle enthält `erfahrungslevel` und `staedte`.
- [ ] Rot → Code → Grün
- [ ] Echter Lauf `py -m scraper.run`, danach Verteilung je Feld zeigen (z. B. Anzahl pro Erfahrungslevel)
- [ ] Commit: `Neue Merkmale: Bereich, Arbeitsmodell, Vertragsart, Level, Städte`

### Task 3: Neue Filter in der Website-Logik

**Files:** Modify `site/app.js` (`filtere` und Aufbau der Filter), `site/index.html`, Test `tests/test_app.js`

**Interfaces:**
- `f` wird erweitert um `level: [], modell: [], vertrag: [], bereich: [], firmen: [], staedte: []`.
- Eine Stelle passt, wenn ihr Wert in der Auswahl liegt. Bei `staedte` reicht es, wenn **eine** ihrer Städte gewählt ist. Bei `staedte` gilt außerdem: Ist `Remote` gewählt, passen auch Stellen mit `remote=true`.
- Das alte Freitextfeld „Ort“ entfällt, weil die Stadt-Auswahl es ersetzt. Das Freitextfeld „Stichwort“ bleibt.
- Die Auswahlmöglichkeiten werden aus den vorhandenen Daten gebaut, sortiert und mit Anzahl angezeigt, z. B. „Berlin (42)“. „Unbekannt“ wird nicht als Option angezeigt.
- URL-Parameter: `level`, `modell`, `vertrag`, `bereich`, `firma`, `stadt`.
- Ein Knopf „Filter zurücksetzen“.

- [ ] Tests:
  - jede neue Gruppe einzeln
  - Stadt + Remote
  - eine alte Stelle ohne neue Felder: Sie erscheint bei leeren Filtern und verursacht keinen Fehler (Review Focus 3)
  - Kombination aus zwei Gruppen
- [ ] Rot → Code → Grün → Commit: `Website: neue Filter`

### Task 4: Neues Design und Scroll-Fix

**Files:** Modify `site/style.css`, `site/index.html`, und in `site/app.js` nur die Darstellung der Karten

- Stil „Modern & farbig“:
  - CSS-Variablen für Farben, Hell- und Dunkelmodus über `prefers-color-scheme`
  - Karten mit Schatten und abgerundeten Ecken
  - farbiger Akzentstreifen pro Firma, die Farbe wird aus dem Firmennamen per Hash abgeleitet, damit sie stabil bleibt
  - Abzeichen („Chips“) für neu, Größe, Level, Arbeitsmodell und Vertragsart
  - Kopfzeile mit Titel „Jobradar“, Stand und Trefferzahl
  - Systemschrift, keine externen Schriften
- Filterleiste:
  - am Laptop `position: sticky`, `max-height: calc(100vh - 2rem)` und `overflow-y: auto` (der Scroll-Fix)
  - jede Gruppe ein eigenes `<details>`, Größe und Kategorie standardmäßig offen
  - auf dem Handy wie bisher die gesamte Leiste einklappbar
- Barrierefreiheit: Fokus sichtbar, Kontrast WCAG AA in beiden Modi, Chips nicht nur über Farbe unterscheidbar (sie enthalten Text).
- [ ] Prüfen:
  - `node --test` ist grün
  - Seite lokal mit `py -m http.server -d site 8000` bereitstellen
  - der Nutzer schaut sie nach dem Hochladen auf Handy und Laptop an
- [ ] Commit: `Website: modernes Design, Dunkelmodus, scrollbare Filterleiste`

### Task 5: Abschluss

- [ ] `CLAUDE.md` Abschnitt 4 (Felder einer Stelle) und `README.md` (neue Filter in 2 Sätzen) aktualisieren
- [ ] `docs/STATUS.md` und `docs/ENTSCHEIDUNGEN.md` aktualisieren (Filter und Stil vom 2026-11-07)
- [ ] Commit: `Doku: neue Filter und Design`
- [ ] Nach Freigabe des Nutzers: auf GitHub hochladen und einen Lauf starten
