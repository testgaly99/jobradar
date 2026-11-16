# Paket 9: Abrufresultate vor dem Datenabgleich prüfen

Stand: 2026-11-16. Nach Paket 8 ausschließlich Paket 9; anschließend Paket 10 bereits autorisiert.

Vor Filterung/Steckbriefberechnung und db.schreibe das gesamte Adapterresultat prüfen: vorhandene Adapter liefern Listen aus Objekten; vollständige Stellen benötigen nichtleere Textfelder ext_id, titel und url. Fehlende Pflichtschlüssel bleiben als Fehler erkennbar. Keine doppelten IDs oder falsch typisierten unveraendert-Markierungen; reine Kurzmeldungen nur mit bekannter ID. Keine Texte, URLs oder IDs normalisieren, keine neuen Fachfilter/Quellenregeln.

Kaputte Antworten müssen die gesamte Firma ohne Stellen-Schreiben abbrechen, andere Firmen laufen weiter. Eine echte leere Liste bleibt ein erfolgreicher Abruf mit bisheriger Schließlogik. Mengen-/Historienregeln, automatische Sperren und Selbstreparatur bleiben außerhalb.

- [x] Tests zuerst: schlechte Antwortformen, IDs/Titel/Links, Kurzmeldungen, Teilergebnisse; vorhandener Bestand bleibt unangetastet.
- [x] Kleine zentrale Vorprüfung unmittelbar im Firmenlauf einsetzen.
- [x] Gezielte und vollständige Python-Offline-Suite, eigener Review.
- [x] Dokumentieren, eigener lokaler Commit; danach Paket 10.

Nur künstliche Adapter/Datenbankantworten, keine Live-Anfragen oder Zugangsdaten. Offline-Schutz unverändert. Keine Migration, Installation oder Veröffentlichung.

## Ergebnis und Nachweise

Gesamtes Ergebnis vor Filterung und db.schreibe geprüft; ungültige Firma verändert keine Stellen, andere Firmen laufen weiter. Bekannte unveränderte Kurzmeldungen sowie echte leere Listen behalten bisheriges Verhalten. JSON-Adapter prüfen gemeinsame Objektlisten/Quell-IDs, damit leere Objekte oder str(None) nicht unbemerkt weitergehen. Personio-/Sitemap-Wurzelformen und Sitemap-Links geprüft; gemeinsame JSON-Hilfe sofort von drei Adaptern genutzt. Keine neuen Fachfilter, Mengenregeln oder Schließpolitik.

18 zusätzliche Laufprüfungen zuerst elf rot/22 grün; 38 zusätzliche Adapterprüfungen zuerst 33 rot/fünf grün. Danach gesamter Python-Offline-Lauf: 536 bestanden, mit lokalen temporären Testdateien und unveränderten Sperren für Umgebungsdateien/Live-Module/Netzwerk/Prozessstarts. Bestandsschutz bei schlechten/teilweise guten Antworten, fortgesetzter Abruf anderer Firmen, Kurzmeldungen und echte leere Ergebnisse geprüft; vorhandene Adapter-Fixtures grün. Eigener Review und git diff --check ohne Befunde. Website unverändert, Webtests/Build nicht erneut ausgeführt; letzter Stand aus Paket 8: 243 Webtests, Typprüfung und isolierter Build bestanden.

Keine Live-Karriereseite oder Datenbank abgefragt, keine echten Daten/Zugangsdaten. Bestehende Detailseiten-Ausfallbehandlung im Sitemap-Adapter nicht neu entworfen; Mengen-/Historienüberwachung und Selbstreparatur außerhalb. Keine Migration, Installation oder Veröffentlichung. Paket 10 folgt, 11–14 separat.

Prüfung an den vorhandenen JSON-/XML-Adaptergrenzen mit ergänzt, weil falsche leere Behälter sonst vor der zentralen Prüfung zu [] werden konnten; innerhalb des Paketumfangs und mit roten Tests belegt. Python direkt mit installiertem Interpreter und lokalem PYTEST_DEBUG_TEMPROOT wie zuvor. Eigener Review, unabhängige Claude-Prüfung separat.
