# Plan: Karriereseiten zuverlässig finden und abrufen

Stand 2026-11-24 (Q284–Q286; Nutzerziel: „Unser Ziel sind 9/10. Es gelten natürlich ausnahmen für Firmen, die das automatische Auslesen verbieten“). Umsetzung: Claude (Q286).

**Ziel:** Mindestens 9 von 10 Firmen, deren Karriereseite das Abrufen erlaubt, werden automatisch gefunden und angebunden.

**Regeln (CLAUDE.md 3.5, 9):** nur offizielle Karriereseiten/ATS, robots.txt vor jedem Abruf, höchstens 1 Anfrage/Sekunde je Domain, ehrlicher User-Agent, nie Jobportale (`ist_portal`). Keine neuen Abhängigkeiten. Wer per robots.txt verbietet oder unseren ehrlichen User-Agent mit 403 abweist, „will erkennbar nicht“ → Ausnahme, wird markiert und übersprungen.

## Befunde (Erkundung 2026-11-24, nur über `scraper.http`)

1. **Der erste Lauf scheiterte am Finden, nicht am Abrufen.** Er prüfte nur Pfade derselben Adresse; Konzerne haben ihre Stellen auf eigenen Adressen (`careers.dhl.com`, `jobs.volkswagen-group.com`, `verbund.edeka`, `jobs.schwarz-produktion.com`, `jobsearch.createyourowncareer.com`).
2. **Ein Weg für fast alle Systeme:** Für Google for Jobs veröffentlichen Firmen eine Sitemap und beschreiben jede Stelle im schema.org-Format `JobPosting` – als JSON-LD (Phenom: DHL, Allianz; Beesite: Mercedes; Workday; REWE; EDEKA; Fresenius; rexx) oder als Microdata (SuccessFactors-Karriereseiten der Firmen: VW, Aldi Süd, BASF, Schwarz, Bertelsmann, Traton). Der vorhandene Sitemap-Adapter liest nur JSON-LD.
3. **Prototyp** (allgemeine Suche: Karriere-Links über Adressen hinweg bis Tiefe 3, Unteradressen `jobs./karriere./careers./career.`, robots-Sitemaps, zwei Stellenseiten probelesen): **17 von 25** zuvor „nicht gefundenen“ Firmen gefunden.
4. **Restliche 8:** Bosch (robots.txt verbietet), Telekom, Lufthansa (403) = Ausnahmen. Mercedes (Stellenadressen ohne `/job/`, Erkennung zu eng), Siemens und Deutsche Bahn (Avature: Stellenseiten ohne JobPosting, aber erlaubter RSS-Feed; DB-Sitemap ist `.gz`), Sparkassen-Finanzgruppe (Website-Eintrag führt ins Leere; kein einzelner Arbeitgeber) = behebbar bzw. Datenkorrektur. Hochgerechnet: **21 von 22 erlaubten ≈ 95 %**.
5. **Menge:** EDEKA ≈ 9.500, REWE ≈ 10.000, Aldi Süd ≈ 5.500 Stellen; eine Anfrage je Stelle bei 1/s. Ohne Tagesgrenze sprengt das den Täglichen Lauf (180 min).
6. **Workday:** Sitemap erlaubt, Stellenseiten mit JSON-LD; Detailseiten antworten bei schneller Folge mit 429 (Ursache der Pfizer/Gilead-Fehlschläge).

## Tasks

### Task 1: Allgemeine Karriereseiten-Suche (`scraper/einrichtung.py`)
- Breitensuche ab Website: Startseite, Unteradressen `jobs|karriere|careers|career.<registrierbare Domain>`, dann Links, deren Host oder Pfad nach Karriere aussieht (`karriere|career|jobs|stellen|…`), **auch auf andere Hosts**, bis Tiefe 3 und höchstens 25 Seiten je Firma; nie Jobportale, soziale Netzwerke, Shop-Apps.
- Jeder neue Host: robots.txt lesen → Sitemaps (auch `.xml.gz`, Sitemap-Index; Teil-Sitemaps mit `job|stelle|position|career|de` zuerst) → Stellenadressen; zusätzlich Stellenlinks auf besuchten Seiten.
- Angebunden ist ein Host erst, wenn **zwei** Stellenseiten `JobPosting` (JSON-LD oder Microdata) tragen. Stellenadressen werden nicht nur per Muster erkannt: Fehlt `/job/`, werden bis zu 3 Adressen aus Teil-Sitemaps mit Stellen-Namen probegelesen (Fall Mercedes).
- Mehrere Karrierehosts (Schwarz: Lidl, Kaufland, Produktion …): alle gefundenen mit JobPosting werden je eigener Eintrag vorgeschlagen (Q43: eine Firma je Karriereportal).
- Ergebnisgründe sauber: „robots.txt verbietet“, „lehnt Abruf ab (403)“, „Website nicht erreichbar“, „keine Stellenquelle gefunden“.
- Tests mit gespeicherten Antworten: Fälle DHL (anderer Host), VW (Unteradresse über Link), Mercedes (Adressen ohne `/job/`), Bosch (robots), Telekom (403), Portal-Link wird nie abgerufen, Tiefe/Seitenzahl-Grenze.

### Task 2: Sitemap-Adapter liest Microdata, `.gz` und hält eine Tagesgrenze (`scraper/ats/sitemap.py`)
- `JobPosting` aus Microdata (`itemtype=…/JobPosting`, `itemprop` title/description/jobLocation/datePosted/validThrough) mit denselben Feldern wie JSON-LD.
- Gezippte Sitemaps entpacken (Standardbibliothek `gzip`, Größengrenze wie bisher).
- Vorfilter auf die Adresse (vorhanden: Titel-Ausschlussliste, Ausland) auch für Slugs ohne `/job/`.
- **Höchstens 300 neue Stellenseiten je Firma und Tag**; der Rest folgt an den nächsten Tagen (bekannte Stellen kosten keine Anfrage). Bei 429: Firma für heute beenden, nicht als defekt melden.
- Tests: Microdata-Seite (gespeichert, SuccessFactors-Karriereseite), `.gz`-Sitemap, Grenze 300, 429-Verhalten.

### Task 3: Avature-Adapter (`scraper/ats/avature.py`)
- Quelle: erlaubter RSS-Feed `…/SearchJobs/feed/` (Titel, Link, Ort), Anzeigentext von der Stellenseite (`JobDetail/<id>`, erlaubt laut robots.txt); dieselbe Tagesgrenze.
- Erkennung in Task 1: Host mit `/externaljobs` bzw. `avature` und Feed vorhanden.
- Tests mit gespeichertem Feed und Stellenseite (Siemens-ähnlich).

### Task 4: Wiederholen und Laufzeit
- `einrichtung_stand.json` speichert je Firma `{"datum", "suche": SUCHVERSION}`; nicht aktive Firmen werden erneut versucht, wenn die Version steigt oder 30 Tage vergangen sind. Diese Änderung: `SUCHVERSION = 1` (alle 155 vom 24.11. kommen erneut dran).
- Täglicher Lauf: Laufzeit je Firma messen; überschreitet der Lauf 150 min, Firmen auf mehrere parallele Jobs verteilen (öffentliches Repo, Minuten frei) – erst nach Messung entscheiden.

### Task 5: Abnahme (Claude, gemeinsam mit dem Nutzer)
- Neue Suche lokal (ohne Schreiben) auf **50** Firmen: die 25 der Erkundung + 25 weitere aus der Liste. **Ziel: ≥ 90 % der erlaubten Firmen.** Bericht: gefunden / Ausnahme (Grund) / nicht gefunden (Grund).
- Je neuem Weg (Sitemap-JSON-LD, Sitemap-Microdata, Avature) eine Firma vollständig: Anzahl Stellen, 3 Beispieltitel, Ort und Text vorhanden (CLAUDE.md 9).
- Danach Einrichtung von Hand starten, Vorschlag gemeinsam prüfen, dann übernehmen.

## Nicht-Ziele
- Was robots.txt verbietet oder uns mit 403 abweist (Bosch, Telekom, Lufthansa, SuccessFactors-Server, `basf.jobs`-Stellenseiten soweit verboten).
- Websites für die 211 Firmen ohne Website (eigenes To-do; Korrektur über `firmen_korrekturen.csv`), Sparkassen-Eintrag als Datenkorrektur.
- Playwright, Firecrawl, kostenpflichtige Dienste.

## Review Focus
1. Kein Abruf von Jobportalen, auch nicht über Weiterleitungen oder Links tiefer Ebenen.
2. robots.txt je neuem Host vor dem ersten Seitenabruf; 1/s je Domain gilt auch über mehrere Unteradressen derselben Firma.
3. Fremde Hosts: Links auf andere Hosts nur von Seiten der Firma aus und nur mit Karriere-Merkmal; kein Abdriften auf Agenturen, Presseportale, soziale Netzwerke.
4. Tagesgrenze verhindert, dass eine Großfirma den Täglichen Lauf sprengt; bekannte Stellen kosten keine Anfrage.
5. Öffentliche Logs und `companies.csv` zeigen keine Herkunft geschlossener Listen (Q61).
