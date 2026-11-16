# Drei Befunde aus der Paketnachprüfung beheben

Nutzerauftrag vom 2026-11-16: „Behebe die offenen Punkte“. Gemeint sind die drei konkreten Code-/Prüfbefunde aus `docs/pruefung-arbeitspakete-2026-11-16.md`. Keine Installation, Migrationausführung, Live-Abfrage oder Veröffentlichung daraus ableiten. Echte SQL-/PostgREST-/GitHub-Abnahme bleibt separat offen.

- [x] Bestandsschutz zuerst rot prüfen: tatsächliche Ashby-/Recruitee-Adapter, Firmenlauf und FakeDB; kaputte Sichtbarkeitsfelder dürfen auch teilweise gültige Antworten nicht zum Bestandsabgleich durchlassen. Gültige nicht veröffentlichte Stellen und leere Listen beibehalten. Kleine Typ-/Formprüfung vor dem Überspringen ergänzen.
- [x] Alle Start-/Abnahmeprüfungen im vorbereiteten HTTP-Prüfer müssen unabhängig von Python-Optimierung ausgeführt werden. Optimiert kompilierte Variante mit rein künstlichen Antworten prüfen: falsche Kennung stoppt vor weiteren Anfragen; Rechte-/Count-/Seitentests bleiben wirksam.
- [x] Größen-Fixture in der SQL-Datei nach Klasse und Datum mischen; keine SQL-Datei ausführen. 1005 Firmen/Stellen beibehalten, Klasse zyklisch und ErstDatum current_date minus i modulo 3. Erwartete Reihenfolge unabhängig durch feste Startgruppen bestimmen; Filter- und Rangerwartung separat erhalten.
- [x] Vollständigen künstlichen HTTP-Abnahmelauf positiv und mit absichtlich ignorierter/falscher Größen-/Datums-/ID-Sortierung negativ prüfen. Frühere rote Review-Repros in reguläre Regressionen überführen; keine doppelten Tests nur für Dateien/Implementierungsform.
- [x] Geschützte gesamte Python-Suite ausführen, unabhängigen Diff-Review abschließen, Bericht/STATUS/Katalog/Entscheidungen/Protokoll aktualisieren und lokal committen.

Parallel getrennte Dateien: Helfer bearbeitet ausschließlich Adapter und deren neue Tests, Root bearbeitet HTTP-Prüfer/Fixture/Tests und Dokumentation. Ein weiterer Helfer prüft die HTTP-Korrektur unabhängig. Bestehende Webanwendung wird nicht verändert; letzte 249 Webtests, Typprüfung, isolierter Build und aktuelle Browserprobe aus der unmittelbar vorangehenden Nachprüfung bleiben benannt, nicht als neue Läufe ausgeben.

## Ergebnis und Nachweise

Alle drei Befunde im autorisierten lokalen Umfang behoben. Ashby verlangt boolesches isListed, Recruitee einen nichtleeren String bei vorhandenem Status; fehlender Status behält published. Ungültige Antworten einschließlich teilweise gültiger Listen erreichen keinen Bestandsabgleich. Bestehende Regeln für wirklich leere/ausdrücklich unveröffentlichte Stellen bleiben bestehen.

HTTP-Prüfer verwendet explizite Laufzeitbedingungen und führt alle notwendigen Seitenanfragen auch optimiert aus. Korrigierte SQL-Fixture nur als Datei: fünf zyklische Klassen und drei Erstdaten. Unabhängige Startgruppen liefern 1005 eindeutige erwartete IDs, gefilterte Erwartung anhand gerader Original-ID, Rangfolge separat. Negativfälle erkennen ignorierte Größenordnung in beiden Abfragewegen, falsche Größen-/Datum-/ID-Richtung sowie falsche Rechte/Count/doppelte Seiten.

Tests zuerst: ATS 34 rot/6 grün, HTTP-Prüfer 35 rot/27 grün. Danach 117 gezielte ATS-/Lauftests und 62 SQL-Prüferfälle bestanden. Vollständiger geschützter Python-Lauf 655 bestanden. Optimierung 0/1/2 rein künstlich via compile geprüft, kein Prozess-/Netzstart; beide 1005er-Abfragen führen jeweils 21 Seiten aus. Unabhängiger Diff-Review ohne konkrete Restbefunde und unabhängig nachgerechnete Fixture-Reihenfolge. git diff --check und Commit-Inhaltsprüfung.

Keine SQL-/PostgREST-Ausführung, keine Installation, keine echten Daten/Zugangsdaten/Umgebungsdateien, Migrationen oder Veröffentlichung. Web unverändert und nicht erneut getestet; vorherige grüne Webnachweise nicht als neue Läufe ausgegeben. Frühere ignorierte Review-Repros erhalten; ihr Verhalten ist jetzt in regulären Regressionen abgedeckt. Keine Abweichung vom beauftragten Umfang.
