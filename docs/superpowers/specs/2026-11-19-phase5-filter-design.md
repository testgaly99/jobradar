# Phase 5: Filter, Sperrliste und gespeicherte Suchen – Design

Stand 2026-11-19. Fasst Q79 und Q116–Q132 zu einem baubaren Entwurf zusammen. Wortlaut der Antworten: `docs/fragen-und-antworten.md`. Datenlage: `docs/phasen-vorarbeit.md` Abschnitt „Phase 5“. Bei Widerspruch gilt eine Nutzerantwort vor diesem Dokument.

## Wozu

Der Nutzer will die Stellenliste so eng schneiden können, wie es Jobportale nicht erlauben: nach Gehalt, Bürotagen, Vertriebsanteil, Führung, Abschluss, Firmengröße und -art – und Firmen, die ihn nicht interessieren, dauerhaft loswerden. Suchen, die er oft braucht, will er mit einem Klick wieder öffnen.

## Ziele (Umfang laut Nutzerauswahl)

| Bereich | Filter / Funktion | Herkunft der Angabe |
|---|---|---|
| Unternehmen | Firmen ausschließen: im Filter (Teil der Suche) **und** dauerhafte Sperrliste (Q123) | Nutzer |
| | Mitarbeiterzahl als frei wählbare Spanne (Q116) | `companies.mitarbeitende_ca` |
| | Eigentümer: börsennotiert, Konzerntochter, öffentliche Hand, Familienunternehmen (Q116) | Wikidata (Börse, Mutterfirma, Eigentümer Staat); „Familienunternehmen“ nur, wenn eine Anzeige der Firma es ausdrücklich sagt (Groq) |
| | Geschäftsmodell: Hersteller, Zulieferer, Dienstleister, Beratung, Handel, Software/Plattform, Finanzdienstleister (Q131, Q132) | Groq je Anzeige aus dem Firmenteil; je Firma der häufigste Wert; Korrekturdatei geht vor |
| | Kundenbranche bei Beratungen und Dienstleistern (Q131) | Groq je Anzeige; Werte aus `data/kategorien.md` |
| Rolle | Jahre Berufserfahrung: „höchstens X Jahre gefordert“ (Q117) | Steckbrief (Regel, vorhanden) |
| | Personalverantwortung: mit / ohne (Q117) | Groq |
| | Vertriebsanteil: kein / etwas / überwiegend (Q128) | Groq |
| | Mein Abschluss: Stellen, deren **niedrigste akzeptierte Alternative** höchstens meinem Abschluss entspricht; „Master oder Promotion“ = Master (Q120, Q125) | Regel auf dem Groq-Feld `abschluss` (keine neuen Tokens) |
| Gehalt, Vertrag, Ort | Mindestgehalt (Jahresbrutto): Stelle erscheint, wenn die **obere** Grenze der Spanne den Wert erreicht; Spanne daneben (Q129) | Steckbrief, Umrechnung wie `proJahr` (Monat × 12, Stunde × 2.080); nur EUR |
| | Vertragsdetails: befristet/unbefristet, Urlaubstage ab X, variable Vergütung (Q118) | Befristung und Urlaubstage per Regel; variabel per Groq |
| | Bürotage „höchstens X pro Woche“, Remote-Gebiet Deutschland / EU / weltweit (Q118) | Groq |
| | Workation möglich (Q131) | Groq |
| Qualität, Suche | Ghost-Job-Ampel: länger als 60 Tage online; gleiche Firma + gleicher Titel verschwand und erscheint neu (Q126) | aus gespeicherten Daten, ohne KI |
| | Vermittler kennzeichnen, sichtbar; Filter blendet sie aus (Q127) | Groq („für unseren Kunden“) |
| | Synonymgruppen je Nutzer: Suchbegriff trifft alle Wörter seiner Gruppe (Q119) | Nutzer, Konto-Seite |
| | Dubletten zusammenführen (Q131) | Regel |
| | Suchen speichern, ohne Benachrichtigung (Q79, Q124) | Nutzer |

**Für alle neuen Filter:** Stellen ohne Angabe bleiben sichtbar mit „<Feld>: nicht angegeben“; ein Häkchen „nur mit Angabe“ blendet sie aus (Q121). Nur für Angemeldete (Q130). Jeder Filter wirkt gleich, ob eine Rangliste gewählt ist oder nicht.

## Nicht-Ziele

Unternehmensalter, eigene Firmenbewertung, Umkreis um München, Muss-/Soll-Kriterien, Ansprechpartner/Bewerbungsweg (Backlog, Q116–Q119, Q131). Marktposition („Marktführer“) – keine verlässliche Quelle (Q132). Benachrichtigung zu gespeicherten Suchen (Q124). Gehaltsschätzung (Backlog). Andere Währungen als EUR im Gehaltsfilter (zählen als „nicht angegeben“, bis AT/CH kommen).

## Anti-Ziele

- Eine Stelle verschwindet still, weil eine Angabe fehlt oder Groq sie noch nicht ausgewertet hat.
- Ein Filter liefert mit gewählter Rangliste andere Treffer als ohne.
- Gäste sehen neue Felder oder können über sie filtern (Migration 007 sperrt Spalten einzeln).
- Sperrliste, Synonyme oder gespeicherte Suchen eines Nutzers sind für andere sichtbar.
- Werbeaussagen einer Firma werden als Tatsache gezeigt (CLAUDE.md 2b: kein Firmen-Werbetext).
- Groq-Tageslimit wird durch das Nachholen alter Stellen so belegt, dass neue Stellen liegen bleiben.

## Ansätze (betrachtet)

1. **Feste Filterspalten, nachts berechnet (gewählt, Claudes Entscheidung):** Der Nachtlauf schreibt jede Angabe einmal in eine eigene, typisierte Spalte an `jobs` bzw. `companies` (z. B. Jahresgehalt-Obergrenze als Zahl). Die Website filtert nur noch auf diese Spalten; die Ranglisten-Funktion `ranking_stellen` liefert sie mit. Vorteil: einfache, schnelle Abfragen, eine Stelle der Wahrheit für Umrechnungen, Facetten möglich. Nachteil: eine Migration und Nachrechnen des Bestands.
2. **Direkt auf den JSON-Feldern filtern** (`steckbrief->gehalt->>max`): keine neuen Spalten, aber Umrechnungen (Monat → Jahr, niedrigste Alternative) müssten in jeder Abfrage und in der Ranglisten-Funktion wiederholt werden; schwer testbar. Verworfen.
3. **Filtern im Browser nach dem Laden:** würde Zählen und Seitenaufteilung brechen (50 je Seite) und alle Stellen laden. Verworfen.

## Entwurf

**Groq-Erweiterung (ein Prompt, eine Probe).** `scraper/ki_prompt.md` bekommt neue Felder: `fuehrung` (ja/nein/null), `vertrieb` (kein/etwas/ueberwiegend/null), `buerotage` (0–5/null), `remote_gebiet` (de/eu/welt/null), `workation` (true/null), `variabel` (true/null), `vermittler` (true/false), `familienunternehmen` (true/null, nur bei ausdrücklicher Aussage), `geschaeftsmodell` (feste Werte/null), `kundenbranche` (Werte aus `data/kategorien.md`, nur bei Beratung/Dienstleistung). Regel wie bisher: nichts erfinden, ohne Angabe null. Eine Versionsnummer der Anleitung markiert, welche Stellen neu ausgewertet werden müssen (Q122): neue Stellen zuerst, dann mit Rest-Tageskontingent offene Bestandsstellen, gemerkte zuerst; höchstens so viele, dass am nächsten Tag Platz für neue bleibt. **Halte-Punkt:** Probe an 20 Anzeigen, der Nutzer prüft wie bei Q21, bevor die neue Anleitung live geht.

**Regeln ohne KI.** Abschluss-Stufe aus dem Groq-Text (`keine Angabe < Ausbildung < Bachelor < Master < Promotion`; bei Alternativen die niedrigste; „oder vergleichbar/Berufserfahrung“ senkt nicht unter die genannte Ausbildungsstufe); Urlaubstage, Befristung per Regex; Jahresgehalt-Unter- und -Obergrenze wie `proJahr`; Ghost-Gründe; Dubletten.

**Firmenangaben.** Eigentümer aus Wikidata für Firmen mit `wikidata_id` (aus 4c), dazu „Familienunternehmen“, sobald eine Anzeige der Firma es sagt. Geschäftsmodell = häufigster Groq-Wert über die Anzeigen der Firma (mindestens 2 Anzeigen, sonst „nicht angegeben“). `data/firmen_korrekturen.csv` geht immer vor (dort und über den Knopf aus Q112 korrigierbar).

**Dubletten.** Gleiche Firma + gleicher Titel nach der Normalisierung aus 4g-1 (Geschlechtszusätze, Groß/klein, Satzzeichen) + beide offen = eine Gruppe. Die Liste zeigt die zuerst gesehene Stelle mit „+N weitere Orte“; Orte und Remote der Gruppe werden für den Stadt-Filter zusammengelegt, damit kein Treffer verloren geht. Die Detailseite listet die übrigen Einträge mit Link.

**Ghost-Ampel.** Gelbe Markierung mit Grund („seit 74 Tagen online“, „schon einmal ausgeschrieben, wieder neu“); Wiederauftauchen = gleiche Firma + gleicher normalisierter Titel war in den letzten 180 Tagen geschlossen (Mini-Notiz). Filter „verdächtige ausblenden“.

**Nutzerdaten (je Nutzer, RLS, im Export und bei Kontolöschung enthalten):** Sperrliste (Firmen), Synonymgruppen, gespeicherte Suchen (Name + Filter als Adresse), „Mein Abschluss“ als gemerkte Voreinstellung (wie „Mein Deutschniveau“). Die Sperrliste wirkt in der Stellenliste und in den Facetten; Firmen erscheinen dort mit „Wieder zeigen“ auf der Konto-Seite. Ein Ausschluss im Filter („ohne Firma X“) gehört zur Adresse und damit zur gespeicherten Suche.

**Oberfläche.** Die neuen Filter stehen in einklappbaren Gruppen „Unternehmen“, „Rolle“, „Gehalt & Vertrag“, „Qualität“ unter den bisherigen. Auswahlfilter (z. B. Vertrieb, Eigentümer) mit Trefferzahlen wie heute; Zahlenfelder (Gehalt, Mitarbeiterzahl, Erfahrung, Bürotage) ohne. Knopf „Suche speichern“ über der Liste; gespeicherte Suchen als Liste auf der Stellenseite und der Konto-Seite (umbenennen, löschen). Markierungen in der Liste: „Vermittler“, Ghost-Ampel, „+N weitere Orte“.

**Daten (Migration 021):** neue Filterspalten an `jobs` und `companies` (für Gäste nicht freigegeben), neue Fassung von `ranking_stellen` und der Facetten-Funktion mit den neuen Spalten, Tabellen für Sperrliste, Synonymgruppen, gespeicherte Suchen. 018–020 sind für Phase 6 und 4g-1 vergeben.

## Beim Bauen frei

Spaltennamen; genaue Regex; Aufteilung in Dateien; Wikidata-Eigenschaften für Eigentümer (mit Test belegen); Grenze für das Nachholen je Nacht (Begründung im Protokoll).

## Claudes Entscheidungen in diesem Entwurf (vom Nutzer zu prüfen)

1. Feste Filterspalten, nachts berechnet (Ansatz 1).
2. „Familienunternehmen“ nur aus ausdrücklicher Aussage in einer Anzeige; Wikidata kennt das kaum.
3. Geschäftsmodell erst ab 2 Anzeigen einer Firma, sonst „nicht angegeben“.
4. Dubletten: Orte der Gruppe zusammengelegt, damit der Stadt-Filter nichts verliert.
5. Ghost „taucht wieder auf“: Fenster 180 Tage.
6. Trefferzahlen nur bei Auswahlfiltern, nicht bei Zahlenfeldern.
7. Gehalt in anderer Währung als EUR zählt im Filter als „nicht angegeben“.
