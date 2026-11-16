# Paket 4: vorhandene Filter als gemeinsamen Abfragevertrag prüfen

Stand: 2026-11-16, Paket 4 lokal abgeschlossen. Nutzer beauftragt Pakete 4, 5 und 6 ausdrücklich nacheinander. Dieser Plan betrifft ausschließlich Paket 4; danach folgen 5 und 6 mit eigenen Abschlüssen.

## Umfang

Tabellengetriebene Regressionstests mit echtem Supabase-Abfrageobjekt und vollständig ersetzten HTTP-Antworten. Alle bestehenden Gruppen: Liste, Größe, Branche, Level, Modell, Vertrag, Funktion, Firma, Stadt/Remote und Land. Bestehende ODER-Verknüpfung innerhalb einer Gruppe und UND zwischen Gruppen am PostgREST-Abfrageformat prüfen, einschließlich mehrerer getrennter OR-Bedingungen für Ort/Suche/Ausschluss. Suche/Ausschluss mit und ohne Volltext, Gastbeschränkungen, Sortierung, Pagination, Online-seit-Werte sowie Formularwechsel/Rücksetzen prüfen.

Keine neue Filterlogik oder SQL-Nachbildung im Test. Nur bei konkret nachgewiesenem Fehler kleinste Korrektur. Größenreihenfolge bleibt auf geladene Seite begrenzt (Paket 12 offen); echte SQL-/RLS-Ausführung weiterhin separat.

## Schritte

- [x] Tests ergänzen und gegen bisherigen Code ausführen; konkrete Fehler korrigieren, sofern gefunden.
- [x] Websuite, Typprüfung und isolierten Build ausführen; Diff auf Umfang und Testaussagen prüfen.
- [x] STATUS, Entscheidungen, Katalog und Agentenprotokoll aktualisieren; eigener lokaler Commit. Danach Paket 5 beginnen.

## Ergebnis

29 neue Tests in `web/tests/filter-vertrag.test.ts` bestehen gegen den bisherigen Anwendungscode; keine fehlende Verzweigung oder Regression nachgewiesen, deshalb kein Anwendungscode geändert. Echte SDK-Abfrageobjekte mit ersetzten fetch-Antworten prüfen die erwarteten Parameter/Operatoren, gebundene Listenparameter, exakte Zählung, getrennte UND-/ODER-Gruppen, alle Sortierungen, Seitenbildung, Datum sowie Formular-/Gastverhalten. Kein zweites Filterframework und keine SQL-Auswertung nachgebaut.

`npm.cmd test`: **211 bestanden**. Typprüfung `.\node_modules\.bin\tsc.cmd --noEmit --incremental false` in `web/` ohne Fehler. Isolierter `next build --webpack` bestanden (ausgewählte Quellen ohne Umgebungsdateien, bereinigte Umgebung, künstliche Einstellungen, HTTP gesperrt); Helfer lokal unter `.superpowers/sdd/2026-11-16-filter-vertrag/`. Kein neuer Browserlauf, weil nur Tests/Dokumentation geändert; Anwendung identisch mit dem in Paket 3 geprüften Stand. Python unverändert, keine erneute Python-Suite.

Eigener Abschlussreview ohne materielle Befunde. Die Tests prüfen den HTTP-Vertrag und ersetzen keine echte SQL-/RLS-Abnahme. Abweichung vom üblichen Rot-Grün-Zyklus: keine roten Tests erzwungen, weil dieses Paket bestehendes Verhalten absichert und alle neuen Erwartungen schon erfüllt sind. Keine Veröffentlichung oder Nutzeraktion.

Keine echten Daten, Zugangsdaten, Live-Abfragen, neuen Pakete, Migrationen oder Veröffentlichung. Kein unabhängiger Helfer gemäß aktueller Sitzungsregel; eigener Abschlussreview, Claudes spätere Prüfung separat.
