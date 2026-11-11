# Restliche Firmen anbinden – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8 der 9 noch nicht angebundenen Firmen aus `data/companies.csv` liefern ihre Stellen in den täglichen Lauf: Proxima Fusion, Plato, Quantum Systems, Neura Robotics, Controlware, Porsche, Bundesbank und dm. TK bleibt vorerst aus.

**Architecture:**
- Zwei neue Schnittstellen-Adapter (Stufe 1 der Scraping-Strategie): Personio als XML, Recruitee als JSON.
- Ein allgemeiner Adapter „Sitemap + JSON-LD `JobPosting`“ (Stufe 2) für fünf Firmen.
- Damit große Firmen nicht täglich jede Anzeige neu laden, bekommen Adapter die Liste der schon bekannten offenen Stellen. Bekannte Stellen meldet der Sitemap-Adapter nur noch als „unverändert“.

**Tech Stack:**
- Python 3.12 (Aufruf über `py`), `requests` über `scraper.http.hole`.
- Aus der Standardbibliothek: `xml.etree.ElementTree`, `json`, `html.parser`.
- Tests mit `pytest` und Fixtures in `tests/fixtures/`.

**Spec:**
- `CLAUDE.md`, Abschnitt 9 „Scraping-Strategie“.
- Die Erkundung vom 2026-11-09 liegt unter `.superpowers/sdd/2026-11-09-firmen-anbinden/ats-recon.md` (vom Controller dorthin kopiert).

## Global Constraints

- Reihenfolge laut CLAUDE.md 9, wörtlich:
  - „1. Öffentliche Schnittstelle des Bewerbermanagement-Systems (ATS) … Pro ATS-Typ gibt es **einen** wiederverwendbaren Adapter. `ats_typ` und `ats_id` stehen in `data/companies.csv`.“
  - „2. Statisches HTML parsen.“
  - „3. Playwright, nur wenn die Stellen erst nach JavaScript erscheinen.“
  - „4. Firecrawl, nur als letzter Ausweg und nur nach meiner Zustimmung.“
- **In diesem Plan:** kein Playwright, kein Firecrawl, keine neue Abhängigkeit in `requirements.txt`.
- **Jeder Abruf** läuft über `scraper.http.hole(url)`. Das beachtet robots.txt und hält höchstens 1 Anfrage pro Sekunde und Domain ein.
  - Gesperrte Pfade nie aufrufen: Controlware `/api/` und `/_/`, dm `*/apply/` und `/profile/`, Recruitee `/v/`.
- Aus CLAUDE.md 9, wörtlich:
  - „Für **offene Stellen** wird der vollständige Anzeigentext gespeichert.“
  - „Jeder neue Adapter wird an mindestens 2 echten Firmen getestet. Du zeigst mir die Anzahl der Stellen und 3 Beispieltitel.“
- **Rückgabe jedes Adapters:** eine Liste von Dicts mit genau den Schlüsseln des Ashby-Adapters: `ext_id, titel, ort, remote, url, beschreibung_kurz, text, abteilung, arbeitsmodell, vertragsart, abschnitte`.
  - `text` ist Klartext ohne HTML, Leerraum zusammengefasst.
  - `beschreibung_kurz` = `text[:300]`.
  - `abschnitte` = `scraper.abschnitte.abschnitte(html)`.
  - `arbeitsmodell` ist „Remote“, „Hybrid“, „Vor Ort“ oder „“.
  - `vertragsart` ist „Vollzeit“, „Teilzeit“, „Befristet“ oder „“.
- `ext_id` enthält keine Leerzeichen und ist höchstens 200 Zeichen lang. Die Website prüft Stellen-IDs mit `/^[^:]{1,100}:\S{1,200}$/`.
- **Fehlerverhalten:** Eine kaputte Einzelanzeige (404, kein JSON-LD, ungültiges JSON) wird übersprungen und gezählt. Sie darf nie die ganze Firma kippen. Ein Fehler beim Abruf der Liste selbst (Sitemap, API) kippt die Firma wie bisher, dann landet er im Bericht.
- **Tests laufen offline** mit Fixtures, kein Netz in `pytest`. Echte Abrufe gibt es nur im Prüfschritt am Ende jedes Adapter-Tasks, direkt gegen den Adapter. Es wird **nichts in die Datenbank** geschrieben.
- **Git:**
  - Dateien einzeln `git add`, nie `-A`, `-a` oder `-f`. Nichts aus `.superpowers/`.
  - Commit-Nachricht mit einer Leerzeile, dann `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Nicht pushen.

## Review Focus

1. **Eine Sitemap-URL liefert 404, oder die Seite hat kein JobPosting.** Die Anzeige wird übersprungen, die Firma läuft weiter. Test in Task 4.
2. **`validThrough` liegt in der Vergangenheit, zum Beispiel bei Porsche.** Die Stelle gilt als nicht offen und wird nicht geliefert. Test in Task 4.
3. **Erster Lauf einer großen Firma (dm, 4.720 URLs).** Was der Titel-Vorfilter schon an der URL erkennt, etwa „filiale“, „verkaeufer“ oder „ausbildung“, wird gar nicht erst abgerufen. Ab dem zweiten Lauf werden bekannte Stellen nicht neu geladen. Tests in Task 1 und Task 4.
4. **Doppelte URLs in einer Sitemap oder doppelte Kennungen.** Jede Stelle erscheint genau einmal. Test in Task 4.
5. **HTML und Entities in Beschreibungen (Personio-CDATA, JSON-LD `description`).** `text` ist sauberer Klartext, und `abschnitte` zerlegt das HTML. Tests in Task 2, 3 und 4.

---

### Task 1: Bekannte Stellen nicht neu laden

**Files:**
- Modify: `scraper/run.py` (Funktion `_firma`)
- Modify: `scraper/db.py` (Funktion `schreibe`)
- Modify: `scraper/ats/greenhouse.py`, `scraper/ats/ashby.py` (nur die Signatur)
- Test: `tests/test_run.py`, `tests/test_db.py` (vorhandenen Stil und `tests/fakedb.py` nutzen)

**Interfaces:**
- Produces:
  - Jeder Adapter hat die Signatur `hole_stellen(ats_id: str, bekannte: frozenset[str] = frozenset()) -> list[dict]`. `bekannte` sind die `ext_id`s der offenen Stellen dieser Firma in der Datenbank.
  - Ein Adapter darf für eine bekannte Stelle statt des vollen Dicts `{"ext_id": <id>, "unveraendert": True}` liefern.
  - `db.schreibe(firma, neue, heute, unveraendert: list[str] = ())` gibt weiter `(neu, geschlossen)` zurück. Die `ext_id`s in `unveraendert` zählen als gesehen und bekommen nur `zuletzt_gesehen = heute` per PATCH. Ihr Text, Steckbrief usw. bleiben unangetastet.
- Consumes: `db.lade_offene(firma)` (IDs der Form `"<firma>:<ext_id>"`).

- [ ] **Step 1: Failing tests**
  - `test_unveraendert_bleibt_offen` (test_db): Bestand mit `A:1` offen. Aufruf `schreibe("A", [], heute, unveraendert=["1"])` ergibt `(0, 0)`. `A:1` bleibt offen, `zuletzt_gesehen == heute`, `text` unverändert.
  - `test_unveraendert_fehlt_wird_geschlossen` (test_db): Bestand `A:1`, `A:2` offen. `unveraendert=["1"]`, `neue=[]`: `A:2` wird geschlossen, `A:1` nicht.
  - `test_firma_reicht_bekannte_durch` (test_run): Ein Fake-Adapter bekommt `bekannte == frozenset({"1"})`, wenn der Bestand `A:1` offen hat. Er liefert `{"ext_id": "1", "unveraendert": True}` und ein neues volles Dict. Erwartung: Nur das neue durchläuft `ist_relevant` und `steckbrief`, der Bericht zählt `gefunden == 2`.
- [ ] **Step 2:** `py -m pytest tests/test_run.py tests/test_db.py -q` muss scheitern.
- [ ] **Step 3:** Umsetzung.
  - `_firma` lädt `lade_offene(name)`, schneidet `"<name>:"` ab, ruft `adapter(f["ats_id"], bekannte=…)` auf und trennt die „unverändert“-Einträge ab.
  - Greenhouse und Ashby nehmen `bekannte` an und ignorieren es.
- [ ] **Step 4:** `py -m pytest -q`: alles grün (bis auf die Live-Tests ohne Netz/`.env`).
- [ ] **Step 5:** Commit `Scraper: bekannte Stellen nicht neu laden`

### Task 2: Personio-Adapter (Plato) und Proxima Fusion

**Files:**
- Create: `scraper/ats/personio.py`, `tests/test_personio.py`
- Create: `tests/fixtures/personio_plato.xml`, gekürzt auf 3 echte `<position>` plus ein Fall mit 2 `office`
- Modify: `scraper/ats/__init__.py` (`ADAPTER["personio"]`), `data/companies.csv`

**Interfaces:**
- Produces: `personio.hole_stellen(ats_id: str, bekannte=frozenset()) -> list[dict]`
  - `ats_id` ist die Subdomain, z. B. `platoapp`.
  - Quelle: `https://{ats_id}.jobs.personio.de/xml`.
  - Felder: `ext_id` = `<id>`, `titel` = `<name>`, `ort` = alle `<office>` und `<additionalOffices>` durch „, “ verbunden.
  - `url` = `https://{ats_id}.jobs.personio.de/job/{id}`, `abteilung` = `<department>`.
  - `text` und `abschnitte` aus allen `<jobDescription>` (`<name>` als `<h3>`, `<value>` als HTML).
  - `vertragsart` aus `<schedule>` (`full-time` → Vollzeit, `part-time` → Teilzeit) und `<employmentType>` (`temporary` → Befristet).
  - `remote`: wahr, wenn ein Office „Remote“ heißt.

- [ ] **Step 1: Failing tests**
  - `test_personio_fixture`: 3 bzw. 4 Stellen, genau die Global-Constraints-Schlüssel, `url` beginnt mit `https://platoapp.jobs.personio.de/job/`.
  - `test_personio_html_wird_text`: `text` enthält kein `<` und kein `&amp;`.
  - `test_personio_abschnitte`: `abschnitte` ist nicht leer.
  - `test_personio_url`: genau eine Anfrage an `https://platoapp.jobs.personio.de/xml`.
- [ ] **Step 2:** Test scheitert.
- [ ] **Step 3:** Adapter mit `ElementTree` umsetzen. HTML zu Text wie in den anderen Adaptern (vorhandene Hilfen in `scraper/` nutzen, keine neue Bibliothek).
- [ ] **Step 4:** Tests grün. Dann die **echte Probe** an 2 Firmen: `platoapp` und eine zweite echte Personio-Firma (selbst suchen, z. B. über `https://<name>.jobs.personio.de/xml`).
  - Für beide `len(stellen)` und 3 Titel in den Bericht schreiben.
  - Die zweite Firma kommt **nicht** in die CSV.
- [ ] **Step 5:** `data/companies.csv`:
  - Plato: `ats_typ=personio`, `ats_id=platoapp`, `aktiv=ja`.
  - Proxima Fusion: `ats_typ=ashby`, `ats_id=proxima-fusion`, `aktiv=ja`.
  - Echte Probe Proxima mit dem vorhandenen Ashby-Adapter, Anzahl und 3 Titel in den Bericht.
  - `py -m pytest tests/test_companies.py -q` grün.
- [ ] **Step 6:** Commit `Personio-Adapter (Plato), Proxima Fusion über Ashby`

### Task 3: Recruitee-Adapter (Quantum Systems)

**Files:**
- Create: `scraper/ats/recruitee.py`, `tests/test_recruitee.py`
- Create: `tests/fixtures/recruitee_quantum.json`, 3 echte `offers`, davon eine außerhalb Deutschlands
- Modify: `scraper/ats/__init__.py`, `data/companies.csv`

**Interfaces:**
- Produces: `recruitee.hole_stellen(ats_id: str, bekannte=frozenset()) -> list[dict]`
  - `ats_id` ist der Host, z. B. `career.quantum-systems.com` oder `<firma>.recruitee.com`.
  - Quelle: `https://{ats_id}/api/offers/`.
  - Felder: `ext_id` = `id`, `titel` = `title`, `ort` = `city` + `country` (bzw. `country_code`), `url` = `careers_url`, `abteilung` = `department`.
  - `text` und `abschnitte` aus `description` + `requirements` (HTML).
  - `remote` aus `remote`, `arbeitsmodell` aus `remote`/`hybrid`/`on_site`, falls vorhanden. `vertragsart` aus `employment_type_code`.
  - Nur `status == "published"`, falls das Feld existiert.

- [ ] **Step 1: Failing tests**
  - `test_recruitee_fixture`: Schlüssel und Anzahl stimmen.
  - `test_recruitee_ausland_im_ort`: Die Auslandsstelle hat ihr Land im `ort`, sodass `ist_relevant` sie mit „Ausland“ aussortiert.
  - `test_recruitee_url`: genau eine Anfrage an `https://career.quantum-systems.com/api/offers/`.
- [ ] **Step 2:** Test scheitert.
- [ ] **Step 3:** Umsetzung.
- [ ] **Step 4:** Tests grün. Echte Probe an Quantum Systems und einer zweiten echten Recruitee-Firma (selbst suchen, nicht in die CSV). Anzahl und 3 Titel in den Bericht.
- [ ] **Step 5:** CSV Quantum Systems: `ats_typ=recruitee`, `ats_id=career.quantum-systems.com`, `aktiv=ja`, `careers_url` auf `https://career.quantum-systems.com/` (die alte URL liefert 404).
- [ ] **Step 6:** Commit `Recruitee-Adapter (Quantum Systems)`

### Task 4: Adapter „Sitemap + JSON-LD“ (Neura, Controlware, Porsche, Bundesbank, dm)

**Files:**
- Create: `scraper/ats/sitemap.py`, `tests/test_sitemap.py`
- Create: Fixtures in `tests/fixtures/`:
  - eine kleine `sitemap_*.xml` mit 5 URLs, darunter 1 Duplikat, 1 Nicht-Job-URL und 1 URL mit Titelwort „filiale“
  - 3 echte, gekürzte Detailseiten: eine mit `<script type="application/ld+json">`, die Controlware-Variante mit dem JobPosting escaped im Nuxt-Payload, eine ohne JSON-LD
- Modify: `scraper/ats/__init__.py`, `data/companies.csv`

**Interfaces:**
- Produces: `sitemap.hole_stellen(ats_id: str, bekannte=frozenset()) -> list[dict]`
  - `ats_id` ist die Sitemap-URL, optional mit Fragment als Pfadfilter, z. B. `https://jobs.neura-robotics.com/sitemap.xml#/offer/`. Das Fragment wird nie abgerufen. Nur `<loc>`, die den Filter enthalten, gelten als Stellen. Eine Sitemap-Index-Datei (`<sitemapindex>`) wird eine Ebene tief aufgelöst.
  - `ext_id` = der URL-Pfad samt Query, ohne Host und ohne führenden/abschließenden „/“, Leerzeichen als `%20`. Höchstens 200 Zeichen, sonst `sha256` der URL, die ersten 32 Zeichen.
  - Steht `ext_id` in `bekannte`, wird die Seite **nicht** abgerufen. Es kommt `{"ext_id": …, "unveraendert": True}`.
  - **Vorfilter vor dem Abruf:** Die URL wird zu einem Pseudo-Titel. Dafür werden `-`, `_` und `/` zu Leerzeichen, und `ae/oe/ue` zu `ä/ö/ü` nur für den Abgleich. Trifft `scraper.filter._TITEL_RE`, wird die Seite übersprungen und als `vorgefiltert` gezählt.
  - **Detailseite:** das erste JSON-Objekt mit `@type == "JobPosting"`, auch in einer `@graph`-Liste. Für Controlware zusätzlich das escaped JobPosting im Nuxt-Payload.
  - **Felder:**
    - `titel` = `title`
    - `ort` = alle `jobLocation[].address.addressLocality` + `addressCountry` durch „, “ verbunden
    - `remote` = `jobLocationType == "TELECOMMUTE"`
    - `text`/`abschnitte` aus `description` (HTML, Entities aufgelöst)
    - `vertragsart` aus `employmentType` (`FULL_TIME` → Vollzeit, `PART_TIME` → Teilzeit, `TEMPORARY`/`CONTRACTOR` → Befristet)
    - `abteilung` = „“
  - Liegt `validThrough` vor dem heutigen Datum, wird die Seite übersprungen.
  - Einzelfehler (HTTP-Fehler, kein JobPosting, kaputtes JSON) werden übersprungen. Das passiert nur bei Fehlern der Detailseite, die Sitemap selbst darf scheitern.

- [ ] **Step 1: Failing tests**
  - `test_sitemap_filter_und_duplikat`: Aus der Fixture-Sitemap werden genau die Job-URLs ohne Duplikat abgerufen.
  - `test_vorfilter_spart_abruf`: Die „filiale“-URL wird nie an `http.hole` übergeben.
  - `test_bekannte_werden_nicht_geladen`: Mit `bekannte={<ext_id der ersten>}` wird die erste nicht abgerufen und als `unveraendert` geliefert.
  - `test_jsonld_felder`: Die Fixture mit ld+json ergibt `titel`, `ort` mit Stadt und Land, `vertragsart == "Vollzeit"`, `text` ohne `<`, nicht leere `abschnitte`.
  - `test_nuxt_payload` (Controlware): Die Controlware-Fixture liefert ein JobPosting.
  - `test_ohne_jsonld_und_404_uebersprungen`: Eine Seite ohne JSON-LD und eine URL, für die das Fake-`hole` `requests.HTTPError` wirft, liefern zusammen 0 Stellen und keine Ausnahme.
  - `test_abgelaufen`: Ein JobPosting mit `validThrough` gestern wird übersprungen.
  - `test_ext_id_form`: Jede `ext_id` passt auf `^\S{1,200}$`.
- [ ] **Step 2:** Test scheitert.
- [ ] **Step 3:** Umsetzung in `scraper/ats/sitemap.py`.
- [ ] **Step 4:** Tests grün. **Echte Probe** gegen alle fünf, nur Bundesbank und Controlware vollständig. Bei Neura, Porsche und dm nur die ersten 15 Job-URLs nach dem Vorfilter, über einen Test-Hilfsparameter oder ein kleines Skript im Scratch-Ordner, nicht im Repo.
  - Pro Firma in den Bericht: Anzahl Sitemap-URLs, Anzahl nach Vorfilter, Anzahl geprüfter Seiten mit gültigem JobPosting und 3 Beispieltitel.
  - Dazu die geschätzte Dauer des ersten vollen Laufs bei 1 Anfrage pro Sekunde.
- [ ] **Step 5:** CSV, jeweils `ats_typ=sitemap`, `aktiv=ja`:
  - Neura: `https://jobs.neura-robotics.com/sitemap.xml#/offer/`
  - Controlware: `https://jobs.controlware.de/berufserfahrene/sitemap-jobs.xml#/berufserfahrene/jobs/`
  - Porsche: `https://jobs.porsche.com/sitemap.xml#ac=jobad`
  - Bundesbank: `https://jobportal.bundesbank.de/sitemap.xml#ac=jobad`
  - dm: `https://www.dm-jobs.de/sitemap/jobs.xml#/job/`
  - Die Fragment-Filter in der echten Probe bestätigen und bei Bedarf anpassen.
- [ ] **Step 6:** Commit `Sitemap-Adapter mit JSON-LD (Neura, Controlware, Porsche, Bundesbank, dm)`

### Task 5: Doku und Workflow-Zeitlimit

**Files:**
- Modify: `README.md` (Abschnitt „Ein Unternehmen hinzufügen“: die neuen `ats_typ` `personio`, `recruitee`, `sitemap` mit je einem Beispiel für `ats_id`)
- Modify: `docs/STATUS.md` („Bekannte Probleme“: 12 von 13 Firmen angebunden; TK fehlt)
- Modify: `docs/ENTSCHEIDUNGEN.md` (eine Zeile, 2026-11-09)
- Modify: `.github/workflows/<täglicher Lauf>.yml` (Zeitlimit des Jobs)

**Details:**
- **STATUS:** TK fehlt, weil die Liste nur per JSF-Nachladen erreichbar ist. Stufe 2 wäre wackelig, Stufe 3 (Playwright) braucht eine Entscheidung in Phase 4.
- **ENTSCHEIDUNGEN:**
  - Allgemeiner Sitemap-Adapter statt je ein Adapter pro Firmen-System.
  - Bekannte Stellen werden nicht neu geladen, Änderungen an einer offenen Anzeige bleiben deshalb unbemerkt (`shortcut`).
  - TK vertagt.
- **Workflow:** `timeout-minutes: 180` am Job. Der Grund steht als Kommentar daneben: Der erste Lauf mit dm und Porsche lädt mehrere tausend Seiten mit 1 Anfrage pro Sekunde.

- [ ] **Step 1:** Doku und Workflow ändern.
- [ ] **Step 2:** `py -m pytest -q` grün.
- [ ] **Step 3:** Commit `Doku: neue Adapter, TK vertagt`
