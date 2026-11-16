# Nachprüfung der Arbeitspakete 1–14

Stand: 2026-11-16. Geprüfter Code: `658696d`, Paketbasis `eeced3f`. Auftrag: Umsetzung aller bisherigen Katalogpakete prüfen. Dies ist ein Review, keine Umsetzung der gefundenen Korrekturen und keine Datenbank-/Installationsfreigabe.

## Aktueller Stand nach beauftragter Korrektur

**Alle drei konkreten Befunde lokal behoben**, Nutzerauftrag „Behebe die offenen Punkte“. Plan: [Reviewkorrekturen](plans/2026-11-16-reviewkorrekturen.md). Die nachfolgenden ursprünglichen Befunde und roten Repros dokumentieren den Zustand vor der Korrektur.

- Paket 9 prüft Ashbys `isListed` als Boolean sowie Recruitees vorhandenen Status als nichtleeren String vor dem Überspringen. Fehlender Recruitee-Status behält den bisherigen Default. 40 reguläre Ende-zu-Ende-Tests belegen vollständigen Bestandsschutz einschließlich Text bei vollständig/teilweise kaputten Antworten und erhalten die gültige Leer-/Unveröffentlicht-Regel.
- Paket 13 nutzt explizite Laufzeitprüfungen statt entfernbarer Assertions. Kennung stoppt vor weiteren Anfragen, Rechte-/Seiten-/Count-Prüfungen bleiben unter Optimierung 0/1/2 aktiv. Beide 1005er-Größenabfragen werden nachweislich mit jeweils 21 Seiten ausgeführt.
- Die SQL-Fixture ist nach Größe und Datum gemischt. Unabhängige Startgruppen bestimmen die Erwartung; Filter- und Rangfolge sind separat korrigiert. Tests lehnen ignorierte Größenordnung, falsche Größenrichtung, falsche Datums- oder ID-Reihenfolge ab.

Zuerst 34 neue Bestandsschutzfälle rot/6 grün sowie 35 HTTP-Prüferfälle rot/27 grün. Nach Korrektur **655 reguläre Python-Offline-Tests bestanden**, darunter 40 neue Bestandsschutzfälle und insgesamt 62 SQL-Prüferfälle. Die früheren zehn Review-Gegenproben sind durch reguläre Regressionen abgedeckt. Unabhängiger Quellreview ohne konkrete Restbefunde. Web unverändert; die zuletzt hier dokumentierten 249 Webtests, Typprüfung, Build und Browserprobe wurden in der Korrektursitzung nicht erneut ausgeführt. Echte SQL-/PostgREST-/GitHub-Abnahme bleibt offen, keine Installation oder Veröffentlichung.

## Ursprüngliches Ergebnis vor Korrektur

Drei konkrete offene Befunde: ein Bestandsschutzfehler in Paket 9, zwei Fehler im vorbereiteten Abnahmeweg von Paket 13. Die regulären Offline-Tests sind grün, decken diese Fälle aber nicht ab. Vor Veröffentlichung Paket 9 nachbessern; vor tatsächlicher Datenbankabnahme Paket 13 korrigieren. Pakete 12–14 bleiben vorbereitet, nicht im Zielsystem abgenommen.

### 1. Hohe Priorität: beschädigte Sichtbarkeitsfelder können Stellen schließen (Paket 9)

Anschlüsse: [ashby.py:14](../scraper/ats/ashby.py#L14), [recruitee.py:12](../scraper/ats/recruitee.py#L12).

Ashby überspringt Objekte vor jeder Pflichtfeldprüfung mit `if not j.get("isListed")`. Beispielsweise wird `{"jobs":[{}]}` zu einer erfolgreichen leeren Liste. Auch eine ansonsten vollständige Stelle ohne `isListed` oder mit `isListed=null` verschwindet. Recruitee überspringt eine vorhandene Stelle bei `status=null`, `0`, `false`, `{}` oder `[]` ebenfalls ohne Fehler. Die zentrale Prüfung sieht danach nur `[]` und akzeptiert den Abruf.

Acht künstliche Ende-zu-Ende-Fälle mit den tatsächlichen Adaptern, `run._firma` und `FakeDB` bestätigt: Nach einem gültigen Erstabruf schließt die beschädigte Folgeantwort die gespeicherte offene Stelle; der Bericht enthält `fehler=''`, `geschlossen=1`, und der gespeicherte Text wird `None`. Bei einem ganzen fehlerhaften Firmenabruf betrifft das entsprechend den Bestand. Keine echte Stelle wurde berührt.

Die überspringende Adapterlogik bestand bereits vor Paket 9. Der mit Paket 9 zugesagte Schutz gegen kaputte Antworten ist damit unvollständig; dies ist keine neu eingeführte Schließregel. Korrekturrichtung: Sichtbarkeits-/Statusfelder vor fachlichem Überspringen auf gültige Form prüfen und kaputte Antworten als Fehler abbrechen. Ausdrücklich gültige nicht veröffentlichte Stellen und tatsächlich leere Listen müssen weiter möglich bleiben. Bestandsschutz hierfür mit echten Adapterketten testen.

### 2. Mittlere Priorität: Python-Optimierung entfernt Schutz und Prüfungen (Paket 13)

Anschluss: [pruefe.py:91](../tests/sql/pruefe.py#L91), außerdem Zeilen 107 und 111.

Testkennung, Rechte, Count und Ergebnisprüfungen verwenden `assert`. Python entfernt diese Anweisungen bei `-O` oder `PYTHONOPTIMIZE=1`. Bei den beiden Größenprüfungen stehen sogar die Aufrufe von `seiten(...)` innerhalb von `assert`; diese Anfragen entfallen dann vollständig.

Mit `compile(..., optimize=1)` und ausschließlich künstlichem Anfrageersatz nachgestellt: Eine falsche Kennung beendet den Prüfer nicht. Weitere Anfragen einschließlich des vorbereiteten PATCH-Schreibschutzversuchs werden erreicht und anschließend wird trotzdem „bestanden“ ausgegeben. Es fand keine Verbindung statt. Der dokumentierte Standardaufruf ohne Optimierung weist die falsche Kennung korrekt ab; betroffen sind optimierte Ausführungen.

Korrekturrichtung: Die Laufzeit-Startbedingungen und Abnahmeprüfungen durch explizite Bedingungen mit Fehlerabbruch erzwingen; notwendige Aufrufe nicht nur als Seiteneffekt einer Assertion ausführen. Den optimierten Fall rein künstlich als Regression aufnehmen.

### 3. Mittlere Priorität: Größen-Fixture unterscheidet falsche Sortierung nicht (Paket 13)

Anschlüsse: [http_daten.sql:8](../tests/sql/http_daten.sql#L8), [pruefe.py:105](../tests/sql/pruefe.py#L105).

Die Fixture ordnet die Größenklassen bereits aufsteigend nach den fortlaufenden IDs an; alle Stellen haben dasselbe Erstdatum. Erwartet wird genau diese ID-Reihenfolge. Eine API, die die angeforderte Größensortierung ignoriert und lediglich nach ID aufsteigend liefert, erfüllt damit beide Größenprüfungen über alle Seiten.

Rein künstlich bestätigt: Ein Anfrageersatz, der beide Größen-ORDER-Ausdrücke absichtlich ignoriert, jedoch Rechte, Count, Filter und Rangfolge korrekt beantwortet, lässt `http_pruefen` vollständig erfolgreich enden. Das belegt einen Fehler im Prüfnachweis, keinen nachgewiesenen Fehler der Migration 011. Die tatsächliche SQL-/PostgREST-Ausführung bleibt offen.

Korrekturrichtung: Größenklassen über IDs und Erstdaten mischen, sodass die Größenfolge deutlich von ID-/Datumssortierung abweicht. Erwartete Reihenfolge unabhängig bestimmen und einen Fall mit absichtlich ignorierter Größenordnung nachweislich ablehnen.

## Paketweise Einordnung

| Paket | Geprüfter Bereich | Ergebnis / Grenze |
|---|---|---|
| 1 | KI-Listen, Kopien, kaputte Arrays, Verbraucher | Kein konkreter Befund. |
| 2 | Dokument-Metadaten und Serveraktion | Kein konkreter Befund; echte Speicherrechte offen. |
| 3 | URL-Leser/-Schreiber und sichere Seitenbereiche | Kein konkreter Befund; zusätzlich 2000 Grenzwerte unabhängig mit BigInt geprüft. |
| 4 | Bestehende Filtergruppen und HTTP-Abfrageverträge | Kein konkreter Befund; Ersatzantworten belegen kein SQL. |
| 5 | Stunden-/Monats-/Jahreslabels und Kartenverbraucher | Kein konkreter Befund. |
| 6 | Textrekonstruktion, Markierungen und React-Verbraucher | Kein konkreter Befund; Paket verändert nur Tests. |
| 7 | Kalenderprüfung, Berlin-Umrechnung und Formularanschluss | Kein konkreter Befund; Frühlingslücke/Herbstwahl geprüft. |
| 8 | Gemeinsame Python-/TypeScript-Fixture und bewusste Teilprojektion | Kein konkreter Befund. |
| 9 | Adaptergrenzen, zentrale Prüfung und Datenabgleich | Bestandsschutz unvollständig, Befund 1. |
| 10 | Bereinigte DB-/KI-/Laufdiagnosen und Migrations-Fallbacks | Kein weiterer konkreter Befund bei Quell-/Testprüfung. |
| 11 | Quellenkopie, Umgebung, Netzsperre und Server-Lebensdauer | Aktuelle Schutztests, isolierter Build und Browserlauf bestanden; Prüfserver beendet. |
| 12 | Globale Größenabfrage, SQL-Datei und Seiteneinteilung | Lokal kein weiterer konkreter Codebefund; tatsächliche Migration/SQL/PostgREST ungeprüft. |
| 13 | SQL-/HTTP-Prüfeinstieg, Startschutz und Fixtures | Befunde 2 und 3; keine echte Datenbankprüfung. |
| 14 | Workflow, Rechte, Befehle und Trennung vom täglichen Abruf | Kein konkreter Quellbefund; YAML-/Actions-Validierung und echter GitHub-/Linux-Lauf offen. |

## Neu ausgeführte Nachweise

- Geschützter Einstieg `python -B -m pruefe_offline`: **570 bestanden**. Vorhandener Python-3.12-Interpreter direkt, lokaler ignorierter pytest-Tempordner; Live-Module, Umgebungsdateien, Netz und Prozessstarts gesperrt.
- `npm.cmd test` in `web`: **249 bestanden**.
- Bestehendes `tsc --noEmit --incremental false`: Exit 0.
- Versionierter isolierter Build-/Browserweg mit vorhandenem Python/Chrome: Exit 0. Laptop 1280 px und Handy 390 px, Gast, Rankingfilter, Detailseite mit 0 Jahren, ungültige Auswahl sowie jeweils drei Größenseiten mit/ohne Ranking. Keine Behauptung, alle historischen paketweisen Browserfälle erneut durchlaufen zu haben.
- Zusätzliche Review-Repros im geschützten Runner: **zehn fehlgeschlagene Schutz-Erwartungen**, die die drei Befunde nachweisen (Ashby 3, Recruitee 5, Optimierung 1, Größen-Negativprobe 1). Sie sind bewusst nicht als grüne reguläre Regressionen ausgegeben und nicht versioniert.
- `git diff --check`: bestanden. Kein Anwendungscode verändert, keine Pakete installiert, keine Migration, Live-/Groq-Abfrage, Veröffentlichung oder GitHub-Ausführung.

Die zusätzlichen Repros liegen lokal ignoriert unter `tests/.pruefung/review-9-10/ashby_repro.py` und `tests/.pruefung/review-gesamt/repros.py`, Ergebnisse unter `.pruefung/review-*.log`. Der Offline-Einstieg sammelt auch ignorierte Unterordner: Ein Zwischenlauf mit den zusätzlichen Testnamen ergab entsprechend 570 bestanden/10 fehlgeschlagen. Anschließend wurden ausschließlich diese neuen Review-Dateien ohne automatischen `test_`-Präfix abgelegt; die unveränderte reguläre Suite ist erneut mit 570 bestanden bestätigt. Die Fehler sind offen. Zur Behebung die Repros als gezielte Regressionen übernehmen; dieser Review-Commit hält nur Ergebnisse und Übergabestand fest. Historische Paketpläne behalten ihre damaligen Ergebnisse; diese Nachprüfung ergänzt und korrigiert deren Bewertung.
