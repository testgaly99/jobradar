# Pendelzeit (Phase 6 Teil 2) – Design

Stand 2026-11-19 · Fragen Q203–Q210 · Bau durch Codex nach Phase 5 (Filter), Migration **026**.

## Wozu

Je Stelle die ÖPNV-Fahrzeit ab der eigenen Haltestelle sehen und danach filtern („höchstens 45 Min.“) – für München und, weil Freunde woanders wohnen (Q208), für jede deutsche Stadt. Von Phase 6 Teil 2 wollte der Nutzer nur diesen Baustein (Q204, Q205).

## Ziele

| Ziel | Quelle |
|---|---|
| Start: eigene **Haltestelle** + Minuten Fußweg dorthin, in den Konto-Einstellungen; Wohnadresse nie | Q207 |
| Ziel: **Büroadresse** je Firma und Stadt, gesucht beim Anlegen der Firma (und einmalig für bestehende): Anzeige → OpenStreetMap → Impressum (gleiche Stadt) → Wikidata-Hauptsitz (gleiche Stadt) → von Hand | Q206 |
| Rechnung selbst im Nachtlauf mit dem **Deutschland-Fahrplan von DELFI** (GTFS, CC BY 4.0), je Nutzer-Region (80 km um die Start-Haltestelle) | Q208 |
| Werktag (Dienstag), Ankunft bis 9:00; Anzeige „35 Min. · 1 Umstieg“ | Q209 |
| Filter „höchstens … Min.“; Unbekanntes bleibt sichtbar mit „Pendelzeit unbekannt“, Häkchen „nur mit bekannter Pendelzeit“ | Q210 |

## Nicht-Ziele (Backlog)

Passungs-Score, Skill-Lücken, Gehaltsbenchmark (Q204); Sofort-Alarm, monatliche Übersicht (Q205); Auto/Fahrrad; Echtzeit-Verspätungen; Transitous oder andere fremde Routen-Dienste (Q208); Pendelzeit für Remote-Stellen (dort steht „Remote“).

## Anti-Ziele

- Wohnadresse geht in keine Berechnung (Q207).
- Keine Jobportale, keine kununu/Glassdoor-Adressen; Impressum nur von der offiziellen Firmen-Website mit `robots.txt`, 1 Anfrage/s, eigener User-Agent (CLAUDE.md 3.5).
- Nominatim höchstens 1 Anfrage/s, Ergebnisse dauerhaft zwischengespeichert, eigener User-Agent (Nominatim-Nutzungsregeln).
- Logs des öffentlichen Workflows nur mit Zahlen (keine Haltestellen, keine Nutzer).

## Bauweise (Q208)

| Weg | Bewertung |
|---|---|
| **Eigene Rechnung mit DELFI-Fahrplan** (gewählt) | kein fremder Dienst, dauerhaft, ganz Deutschland; Rechnung je Region hält den Nachtlauf schlank. |
| Eigene Rechnung nur MVV | einfacher, aber nur München (Freunde woanders). |
| Transitous | wenig Code, aber ohne Garantie, Haltestelle geht an fremden Dienst. |

## Entwurf

### 1. Daten (Migration 026)

- `firmen_standorte(id, firma text references companies(name) on delete cascade, stadt text, adresse text, lat double precision, lon double precision, quelle text check in ('anzeige','osm','impressum','wikidata','hand'), quelle_url text, gefunden_am date, unique (firma, stadt, adresse))`; lesbar für Angemeldete (Firmendaten sind gemeinsam, CLAUDE.md 4.6), schreiben nur Nachtlauf und Admin.
- `firmen_standort_suche(firma, stadt, versucht_am date, ergebnis text check in ('gefunden','nicht_gefunden'), primary key (firma, stadt))` – damit nichts täglich neu gesucht wird (erneut nach 90 Tagen).
- `pendel_haltestellen(id, name, ort, lat, lon)` aus dem Fahrplan, lesbar für Angemeldete (Haltestellensuche).
- `pendel_start(owner_id pk → auth.users on delete cascade, haltestelle_id text, haltestelle_name text, lat, lon, fussweg_min integer check between 0 and 60)`; RLS nur eigene Zeile.
- `pendelzeiten(owner_id → auth.users on delete cascade, job_id text → jobs on delete cascade, minuten integer, umstiege integer, standort_id → firmen_standorte, ungefaehr boolean, berechnet_am date, primary key (owner_id, job_id))`; RLS nur eigene Zeilen. `minuten null` = unbekannt.
- Büroadressen von Hand (`quelle 'hand'`) trägt nur der Admin ein (Firmendaten sind gemeinsam, Claude-Entscheidung 3).

### 2. Büro finden (Nachtlauf, `scraper/standorte.py`)

Für jede Kombination (Firma, Stadt) mit offenen Stellen innerhalb von 80 km um irgendeine Start-Haltestelle, ohne Eintrag und ohne Suchversuch in den letzten 90 Tagen, der Reihe nach:
1. **Anzeige:** schema.org `streetAddress` + `postalCode` (Adapter `sitemap`, künftig weitere) oder Standortname mit Straßenmuster („…straße 19“, „…str. 19“, „…weg 3“, „…platz 1“); Koordinaten per Nominatim.
2. **OpenStreetMap:** Nominatim-Suche „<Firma>, <Stadt>“, nur Treffer der Klassen `office`, `building`, `amenity`, `shop` mit Namensähnlichkeit ≥ 0,8 (ohne Rechtsform-Zusätze).
3. **Impressum:** Host von `careers_url` → `/impressum` bzw. Link „Impressum“ der Startseite (robots.txt), Adresse per Muster „Straße Nr., PLZ Ort“; nur wenn Ort == Stadt.
4. **Wikidata:** Hauptsitz (P159) mit Koordinaten (P625) bzw. Straße (P6375); nur wenn gleiche Stadt.
5. Sonst `nicht_gefunden`.

Mehrere Büros einer Firma in einer Stadt: Stelle nutzt das, dessen Straße im Anzeigentext vorkommt, sonst das erste mit `ungefaehr = true` („ca.“).

### 3. Fahrzeit rechnen (Nachtlauf, `scraper/pendeln.py`)

- Fahrplan: DELFI-Nahverkehrsfahrplan über den direkten Download `https://download.gtfs.de/germany/nv_free/latest.zip` (gtfs.de, Daten von DELFI e.V.; opendata-oepnv.de selbst verlangt ein Konto). Lizenz und Download ohne Konto prüft Claude vor dem Bau (Plan Task 0); verlangt er doch ein Konto, entscheidet der Nutzer (CLAUDE.md 10). Monatlich laden (Zwischenspeicher im Actions-Cache), daraus je Region (80 km um jede Start-Haltestelle, Regionen mit Überlappung zusammengelegt) einen kleinen Auszug für einen Dienstag bauen.
- RAPTOR rückwärts (späteste Abfahrt für Ankunft bis 9:00) bzw. vorwärts ab 7:00 mit Ankunft ≤ 9:00, eine Rechnung je Start-Haltestelle zu allen Haltestellen; Fußwege Haltestelle → Büro über Luftlinie × 1,3 bei 4,5 km/h, höchstens 15 Min.; Umstiege zwischen Haltestellen ≤ 400 m zu Fuß.
- Pendelzeit = Fußweg zur Start-Haltestelle + Fahrt + Fußweg zum Büro; höchstens 180 Min., sonst unbekannt. Hat eine Stelle mehrere Städte (`jobs.staedte`), zählt die kürzeste Pendelzeit; angezeigt mit der Stadt („35 Min. nach Garching“).
- Neu gerechnet, wenn sich Start-Haltestelle, Büro oder Fahrplan ändert; sonst Ergebnis behalten.

### 4. Oberfläche

- **Konto → „Pendeln“:** Haltestelle suchen (Liste aus dem Fahrplan, Name + Ort), Minuten zu Fuß dorthin; Hinweis „Gerechnet für Dienstag, Ankunft bis 9:00; neue Werte ab der nächsten Nacht“.
- **Stellenliste und Stellenseite:** „🚆 35 Min. · 1 Umstieg“, „ca. 35 Min.“ oder „Pendelzeit unbekannt“; bei Remote nichts. Stellenseite zusätzlich Büroadresse mit Quelle.
- **Filter:** „Pendelzeit höchstens [15/30/45/60/90] Min.“ + Häkchen „nur mit bekannter Pendelzeit“; nur für Angemeldete mit Start-Haltestelle.
- **Admin:** auf der Stellenseite „Büroadresse eintragen/ändern“ (`quelle 'hand'`, hat Vorrang).
- Quellenangabe auf der Datenschutz-/Quellenseite: „Fahrplandaten: DELFI e.V. via opendata-oepnv.de, CC BY 4.0“; „Kartendaten © OpenStreetMap-Mitwirkende (ODbL)“.

## Tests (Vorgabe für den Plan)

- RAPTOR an einem kleinen erfundenen Fahrplan (3 Linien, 1 Umstieg): erwartete Minuten und Umstiege; Ankunft nach 9:00 → nicht erreichbar.
- Fußweg- und Gesamtformel; 180-Min.-Grenze.
- Büro-Suche je Quelle mit gespeicherten Antworten (Nominatim, Impressum-HTML, Wikidata), Reihenfolge und „gleiche Stadt“-Regel; Namensähnlichkeit; Wiederholungssperre 90 Tage.
- Regionsauszug: Haltestellen außerhalb 80 km fallen weg.
- RLS: Nutzer B sieht weder `pendel_start` noch `pendelzeiten` von A.
- Filter: unbekannt durchgelassen, mit Häkchen ausgeblendet.

## Dem Bauenden überlassen

RAPTOR-Umsetzung (reines Python mit `pandas`/`numpy` oder ohne, nach Messung), Format des Regionsauszugs, Aufteilung der Module.

## Entscheidungen von Claude (zum Gegenlesen)

1. Region = 80 km um die Start-Haltestelle; Fahrten über 180 Min. gelten als unbekannt.
2. Büro-Suche nur für (Firma, Stadt) innerhalb einer Nutzer-Region; erneuter Versuch nach 90 Tagen.
3. Büroadressen von Hand nur durch den Admin (Firmendaten sind gemeinsam); Nutzer sehen „Büro unbekannt“.
4. Fußweg Haltestelle → Büro aus Luftlinie (× 1,3, 4,5 km/h, höchstens 15 Min.), keine Fußwege-Routenberechnung.
5. Start-Haltestelle und Fußweg auf der Konto-Seite (nicht in „Unterlagen“), damit das Paket nicht von Runde 1 abhängt.
6. Bau nach Phase 5, weil der Filter in die neue Filterleiste von Phase 5 gehört.
7. Mehrere Städte je Stelle: die kürzeste Pendelzeit zählt.
8. Fahrplan über den direkten Download von gtfs.de statt opendata-oepnv.de (dort Konto nötig).
