# Paket 5: ausdrückliche Gehaltseinheiten auf Bewerbungskarten erhalten

Stand: 2026-11-16, Paket 5 lokal abgeschlossen. Autorisierter Folgeauftrag nach Paket 4: ausschließlich Paket 5 abschließen, danach Paket 6.

## Umfang

`web/lib/karte.ts:gehaltText` soll die bereits unterstützten expliziten Zeiträume Jahr/Monat/Stunde korrekt beschriften. Keine Umrechnung, Schätzung oder neue Regel für fehlende Einheiten. Bestehendes lockeres Kartenformat beibehalten: einzelne min-/max-Werte und andere Währungen bleiben darstellbar. Vorrang manueller Angaben Angebot → Wunsch → Anzeige sowie Trimmen und bisheriger Rückfall auf Jahr bleiben erhalten. Nicht auf den strengeren Steckbrief-Leser umstellen.

- [x] Tests zuerst: Stundenbeträge, bestehende Einheiten, manuelle Priorität sowie unvollständige und unbrauchbare Angaben.
- [x] Kleinste Korrektur in bestehender Darstellung.
- [x] Websuite, Typprüfung, isolierter Build und künstliche Browserprobe auf tatsächlichen Bewerbungskarten; eigener Abschlussreview.
- [x] Dokumentation aktualisieren, eigener lokaler Commit. Danach Paket 6.

## Ergebnis

Vier zusätzliche Tests mit tabellarischen Einheiten/Teilwerten und manueller Priorität: zunächst fünf bestehende/neue Fälle grün und drei Tests wegen fälschlichem Jahr bei Stundenlohn rot. Bestehenden Ausgabezweig um explizit Stunde ergänzt, sonst keine Verhaltensänderung. Kein strikter Leser, keine Umrechnung und keine Änderungen an Kanban-Animationen.

`npm.cmd test`: **215 bestanden**. Typprüfung `.\node_modules\.bin\tsc.cmd --noEmit --incremental false` in `web/` ohne Fehler. Isolierter `next build --webpack` bestanden: keine Umgebungsdateien, bereinigte Umgebung, künstliche Einstellungen, HTTP gesperrt. Lokale Hilfen unter `.superpowers/sdd/2026-11-16-karten-gehaltseinheiten/`.

Chrome auf localhost:3002: sechs künstliche Bewerbungskarten bei 1280/390 Pixel mit Stunde/Monat/Jahr, einzelner Obergrenze, manuellem Freitext und fehlendem Gehalt geprüft; zusätzlich ausgewählte Detailansicht auf beiden Größen. **14 Prüfungen bestanden**, keine Browserfehler. Keine Schreibaktion ausgelöst, externe Anfragen blockiert, Testserver danach beendet und Port kontrolliert. Kein Zugriff auf echte Bewerbungen/Dokumente.

Eigener Abschlussreview ohne materielle Befunde, Claudes unabhängige Prüfung separat. Python-Anwendung unverändert, keine erneute Python-Suite. Browserprobe wie zuvor direkt mit vorhandenem Python 3.12, weil py-Launcher die Installation nicht erkennt. Keine weiteren Abweichungen oder Nutzeraktion.

Keine echten Bewerbungen/Dokumente oder Zugangsdaten lesen, keine Live-Datenbank, neuen Pakete oder Veröffentlichung. Animationen unverändert. Prüfung mit künstlichen Daten ersetzt keine echte Datenbank-/RLS-Abnahme.
