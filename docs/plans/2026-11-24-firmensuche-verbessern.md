# Plan: Firmensuche verbessern (Einrichtung)

Stand 2026-11-24, Anlass Q284: Der erste echte Einrichtungslauf (Vorschlag #2, geschlossen) band 0 von 155 Firmen an; 140 × „Karriereseite nicht gefunden“, auch Volkswagen, Bosch, Siemens, Deutsche Bahn.

**Ziel:** Der Einrichtungslauf findet die Karriereseiten großer Firmen und bindet Workday-Firmen über deren erlaubte Sitemap an; Fehlschläge werden nach einer Verbesserung erneut versucht.

**Regeln (CLAUDE.md 3.5, 9):** nur offizielle Karriereseiten/ATS, robots.txt vor jedem Abruf, höchstens 1 Anfrage/Sekunde je Domain, ehrlicher User-Agent, nie Jobportale. Keine neuen Abhängigkeiten.

## Befunde (2026-11-24)

| Befund | Beleg |
|---|---|
| Suche prüft nur Pfade derselben Adresse (`PFADE`, [einrichtung.py:25](../../scraper/einrichtung.py)) und folgt nur Links auf denselben Host | `jobs.siemens.com` existiert, robots.txt erlaubt `/externaljobs`, Sitemap vorhanden – nicht gefunden |
| Workday erlaubt nur den Mandantenpfad (`Allow: /External/`), die Prüfung fragt `/<host>/job/` | 5 Workday-Firmen „portal_nicht_unterstuetzt“ |
| Workday-Probe scheitert an Ratenbegrenzung bzw. Laufzeitfehler | Gilead HTTP 429, Pfizer RuntimeError |
| SuccessFactors-Hosts (`career5.successfactors.eu`) verbieten alles (`Disallow: /`) | bleibt gesperrt |
| `einrichtung_stand.json` markiert jeden Versuch dauerhaft als erledigt | Fehlschläge würden nie wiederholt |
| 211 von 599 Firmen ohne Website | Nicht-Ziel dieses Plans |

## Tasks

### Task 1: Karriere-Unteradressen
- In `_finde_portal`: nach den Pfaden der Website zusätzlich `https://{jobs,karriere,careers,career}.<registrierbare Domain>/` probieren (z. B. `siemens.com` → `jobs.siemens.com`; `www.` und Länderpfade abschneiden).
- Links auf **andere** Hosts folgen, wenn deren erstes Label `jobs|karriere|careers|career` ist **und** die registrierbare Domain gleich bleibt (keine fremden Seiten, keine Portale über `ist_portal`).
- Gefundene Karrierehosts gehen durch dieselbe Sitemap-Erkennung (`_sitemap_portal`) mit dem Stellenpfad aus der robots.txt (`Allow:`-Pfade, die `job` enthalten), nicht fest `/job/`.
- Tests (gespeicherte Antworten, kein Internet): Siemens-ähnlicher Fall (Website ohne Karrierelink, `jobs.<domain>` mit robots/Sitemap) → Kandidat `sitemap`; fremde Domain `jobs.andere.de` wird nicht besucht; Jobportal-Host nie abgerufen.

### Task 2: Workday über die erlaubte Sitemap
- `_sitemap_portal`: Für Workday-URLs den Stellenpfad aus dem Mandanten ableiten (`/External/` → `/External/job/`) und nur diese Sitemap des eigenen Hosts nutzen.
- Probe in `richte_ein` liest höchstens 20 Stellen (Grenze nur für die Probe); bei 429 die Firma als „später erneut“ markieren statt als Fehlschlag.
- Pfizer-RuntimeError mit gespeicherter Antwort nachstellen, Ursache beheben, Test dazu.
- Tests: Intel-robots.txt (`Allow: /External/`) → Kandidat `sitemap` mit `#/External/job/`; 429 in der Probe → Status bleibt `offen`, Grund „Ratenbegrenzung, später erneut“.

### Task 3: Fehlschläge erneut versuchen
- `einrichtung_stand.json` speichert je Firma `{"datum": …, "suche": SUCHVERSION}`; alte Einträge (nur Datum) gelten als Version 0.
- Erneut versucht wird, wer nicht `aktiv` ist **und** (kleinere `SUCHVERSION` **oder** älter als 30 Tage). Diese Änderung setzt `SUCHVERSION = 1`.
- Tests: alter Eintrag wird wiederholt; aktiver nie; Versuch von heute mit aktueller Version nicht.

### Task 4: Abnahme mit echten Firmen (Claude, nicht automatisch)
- Lokal, nur Erkennung + Probe, ohne Schreiben in Datenbank oder `companies.csv`: Volkswagen, Bosch, Siemens, Deutsche Bahn, REWE, Intel, Samsung, Heidelberg Materials, Lidl, EDEKA.
- Ziel: mindestens 6 von 10 mit gefundenem Portal; Nutzer sieht Anzahl Stellen und 3 Beispieltitel je neu angebundenem System (CLAUDE.md 9).
- Danach: Einrichtung von Hand starten, Vorschlag gemeinsam prüfen.

## Nicht-Ziele
- SuccessFactors-Hosts abrufen (robots.txt verbietet es); Firmen dort nur, wenn sie eine eigene erlaubte Karriereseite haben.
- Websites für die 211 Firmen ohne Website ergänzen (eigenes To-do; heute über `firmen_korrekturen.csv`).
- Playwright oder Firecrawl.

## Review Focus
1. Kein Abruf fremder Domains oder Jobportale durch die neuen Unteradressen.
2. robots.txt wird für jeden neuen Host vor dem ersten Seitenabruf gelesen.
3. Probe-Grenze 20 gilt nur in der Einrichtung, nicht im Täglichen Lauf.
4. Öffentliche Logs und `companies.csv` zeigen keine Herkunft geschlossener Listen (Q61).
