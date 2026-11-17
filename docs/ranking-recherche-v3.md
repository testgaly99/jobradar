# Ranking-Recherche v3: Abgleich von drei Deep-Research-Antworten (2026-11-13)

Der Nutzer hat drei Deep-Research-Modelle mit demselben Prompt beauftragt (Stand der Antworten: November 2026). Dieses Dokument fasst sie zusammen und gleicht sie mit `docs/ranking-recherche-v2.md` und `docs/ranking-legal.md` ab. Es ist **Eingang für die Klärung zu Beginn von Phase 4**, keine Entscheidung. Behauptungen der Antworten sind ungeprüft, bis sie in Phase 4 an der Primärquelle verifiziert sind.

## Wo alle drei übereinstimmen
- **Wikidata (CC0)** ist die saubere Grundlage für Identitäten (QID, offizielle Website, Börse, Sitz) und Dubletten.
- **Pay-to-play:** Great Place to Work und Top Employers setzen eine kostenpflichtige Zertifizierung voraus (A3: Top Employers ca. 12.000 €). stern/Statista, Forbes/Statista, FT1000: Aufnahme kostenlos, Siegel kostenpflichtig.
- **LinkedIn** (Top Startups, Top Companies) verbietet automatisiertes Auslesen.
- **Patentlisten** (EPA, DPMA, WIPO, Clarivate) sind seriös, bringen aber überwiegend Firmen, die schon in anderen Listen stehen.
- **Der letzte Filter** ist immer die eigene Karriereseite der Firma: Nur wer dort aktuell Stellen in Deutschland hat, bleibt.
- **Trendence** (Studierende, 2026): Platzierung nicht käuflich, Top-50 als Gratis-Download.

## Widersprüche (in Phase 4 an der Primärquelle prüfen)
| Thema | A1 | A2 | A3 | Bisheriger Stand (v2/legal) |
|---|---|---|---|---|
| Statista: TDM-Vorbehalt § 44b | nicht gefunden, aber Crawler-Verbot in AGB | **ausdrücklicher Vorbehalt + Crawler-Verbot** | „bei keinem Anbieter maschinenlesbarer Vorbehalt“ | Statista nur mit schriftlicher Erlaubnis, auch nicht privat |
| DAX-Familie | STOXX: view-only, Restricted Data, Art. 4(3)-Vorbehalt → über Wikidata | wie A1 | Deutsche Börse robots.txt erlaubt GPTBot → frei | Indexmitglieder über Wikidata (CC0) |
| EU R&D Scoreboard | CC BY 4.0 (Lizenz nur im Report) | CC BY 4.0, XLSX | nicht erwähnt | offen, automatisch |
| EPA-Liste | Excel nicht verifiziert | **Top 100 als freies XLS**, Verarbeitung erlaubt | „Amtsstatistik frei“ | offen, automatisch |
| FOCUS Top-Arbeitgeber | nicht geprüft | ~1.000 Firmen, Pay-to-play nicht belegt | **Siegel ab 990 €**, robots.txt sperrt KI-Crawler | weglassen (focus.de sperrt Crawler) |
| Wikipedia „Größte Unternehmen DE“ | – | – | einzige CC-BY-SA-Liste, Empfehlung #4 | „abgeschriebene Listen auf Wikipedia“: nicht |
| Dealroom Unicorns DE | – | – | 157 Firmen, KI-Crawler ausdrücklich erlaubt | nicht bewertet |

## Neue Kandidaten gegenüber v2
- **Dealroom Unicorns/Thoroughbreds Germany** (A3): Startups, laut A3 KI-freundlich. Nutzungsbedingungen prüfen.
- **FOCUS-Business/FactField Top-Arbeitgeber 2026** (A2, A3): ~1.000 DE-Firmen; Crawler-Sperre und Siegelkosten laut A3.
- **Stiftung Familienunternehmen Top 500** (A3): freies PDF; deckt Familienkonzerne ohne Börsennotierung ab (Aldi, Schwarz, Bosch).
- **FT Europe’s Best Employers 2026** (A2, Statista): 269 Firmen mit DE-Hauptsitz.
- **Randstad Employer Brand Research DE, Potentialpark DE, Caliber DAX-40, Kantar BrandZ DE, Brand Finance, Interbrand, LexisNexis Innovation Momentum, Fortune Most Admired, HRI Top 500, Handelsblatt Wachstums-Mittelständler**: Ergänzungen, meist ohne offene Lizenz.

## Vorgehen, das alle drei nahelegen (passt zu CLAUDE.md 4.8)
1. Rankings nur als **Auswahl-Signal**; gespeichert werden Firmenname, Rang, Liste, Jahr, Quell-Link (Speicherregel 2026-11-10).
2. Automatisch nur offene/amtliche Quellen (Wikidata, EU-Scoreboard, EPA, DPMA, WIPO; ggf. Dealroom nach Prüfung).
3. Proprietäre Listen ohne Erlaubnis: höchstens von Hand und nur zur Eigennutzung, sofern die Rechtsprüfung das zulässt; für Freunde/öffentlich gilt weiter „nur mit ausdrücklicher Erlaubnis“.
4. Longlist 1.500–2.000 → Dubletten über QID/Domain → Filter „Stellen in DE auf der eigenen Karriereseite“ → ~1.000.

## Offene Entscheidungen für den Nutzer (Phase-4-Klärung)
1. Pay-to-play-Listen (GPTW, Top Employers) aufnehmen oder nicht?
2. Behörden und Forschungseinrichtungen (Bundeswehr, Charité, Fraunhofer, Max-Planck) mitzählen?
3. Einheit: Konzern, Marke oder Karriereportal (z. B. Siemens vs. Siemens Healthineers)?
4. Was gilt als „Stelle in Deutschland“ (Remote-DE, Graduate-Programme ohne Ort)?
5. Statista-Listen: bei „nur mit Erlaubnis“ bleiben (bisherige Entscheidung) oder Erlaubnis anfragen?
6. Wikipedia-Listen: bisherige Ablehnung bestätigen oder CC-BY-SA-Liste zulassen?

## Nachtrag: Rechte-Audit (vierte Deep Research, vom Nutzer eingefügt am 2026-11-17, Stand der Quelle 13.11.2026)
Maßstab: Darf eine Liste für eine **öffentliche, ggf. kommerzielle** Jobsuche automatisiert erfasst (E), gespeichert (S), zu einer eigenen Auswahl verarbeitet (T), veröffentlicht (P) und ihr Name/Logo genutzt werden (M)? Kein Verbot ≠ Erlaubnis; robots.txt ist kein Rechtsnachweis. Zwei getrennte Ampeln: **Stammdaten** (Firmenname, Website) vs. **Ranking** („Platz 7 bei Liste Y“, Score).

Kernaussagen:
- **§ 44b UrhG reicht nicht:** TDM-Kopien müssen gelöscht werden, sobald sie nicht mehr nötig sind; das **Datenbankherstellerrecht (§§ 87a, 87b UrhG)** schützt fremde Ranglisten auch gegen wiederholte systematische Entnahme kleiner Teile. Auch „einmal von Hand abschreiben“ ist keine eigene Liste.
- **Grün (ausdrückliche Lizenz):** EU Industrial R&D Scoreboard (World 2000 + EU 800, XLSX, CC BY 4.0 – Quelle nennen, Änderungen kennzeichnen, kein EU-Logo; vorher prüfen, ob die XLSX einen abweichenden Drittanbieter-Hinweis enthält, Teile stammen aus Orbis); Wikidata (CC0) für Stammdaten und Abgleich, aber keine Ersatzlizenz für fremde Rankings.
- **Grün/Gelb:** EPO Top 100 Applicants und Top 25 je Technologiefeld (offizieller XLS-Download, Verarbeitung privat und kommerziell erlaubt, Quelle nennen; vor Launch klären, ob § 6.5 – Lizenzpflicht für kommerzielle Such-/Informationsdienste – greift; kein EPO-Logo). PATSTAT: kommerziell nur mit Genehmigung.
- **Gelb (keine Freigabe gefunden, schriftlich anfragen):** DPMA aktivste Anmelder (CSV; Freigabe nach § 5 UrhG gilt nur für Patentdokumente, nicht sicher für die Statistik), Great Place to Work (Teilnahme setzt bezahlte Zertifizierung voraus), Trendence (Siegel 2.490 €, Daten nicht offen), Randstad, Sifted 100, FT1000/Statista, TIME/Statista, Fortune Most Admired/Global 500, Clarivate, BCG.
- **Rot (ausdrückliche Verbote):** LinkedIn (Scraping/Kopieren verboten), Levels.fyi (seit 23.09.2026 auch öffentliche Seiten), Forbes/Statista (kein Speichern in Datenbanken, kein Data Mining; Listendaten nur gegen Lizenz), RepTrak, Dealroom (Stand Okt. 2026: nicht kommerzialisieren/kopieren/extrahieren – **widerspricht der „KI-freundlich“-Aussage von A3 oben**), Universum („ranking lists“ bleiben Eigentum), Deloitte Fast 50 (nur nicht-kommerziell), STOXX/DAX und S&P (Indexzusammensetzungen nur mit Lizenz; Firmen über Wikidata unabhängig ermitteln).
- **Empfohlene Architektur:** drei Ebenen – (1) Firmenstammdaten nur aus offenen/eigenen Quellen (Wikidata, eigene Karriereseiten-Prüfung), (2) Quellenzuordnung nur mit Lizenz/Genehmigung, (3) Rang/Score/Rankingname öffentlich nur bei eindeutig lizenzierten Quellen. Ohne Lizenz: Ranking höchstens als manuelle Inspiration, dann aber **nicht** speichern oder anzeigen, dass Firma X „aus Ranking Y“ stammt.
- **Sicherer Kern für die ~1.000 Firmen:** EU-Scoreboard (2.000) → Filter „hat aktuell Stellen in Deutschland“ über die eigenen Karriereseiten (eigene Erhebung) → ergänzt um EPO-Signale und Wikidata.
- **Vor einem öffentlichen Launch:** Datenherkunft von einer auf Urheber-, Datenbank- und Lizenzrecht spezialisierten Kanzlei prüfen lassen; Marken/Logos getrennt behandeln.

Folgen für dieses Projekt (für die Phase-4-Klärung): Der vorbereitete Ranking-Unterbau (Migration 010, `scraper/rankings.py`, Filter „Liste“) zeigt Rang und Listennamen öffentlich bzw. für Angemeldete an; für fast alle bisher geplanten Listen wäre das nach diesem Audit nur mit Lizenz zulässig. Die Speicherregel aus CLAUDE.md 4.8 („Firmenname, Rang, Listenname, Jahr, Quell-Link“) und der Weg „§ 44b automatisch“ müssen in Phase 4 neu bewertet werden.
