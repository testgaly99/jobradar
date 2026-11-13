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
