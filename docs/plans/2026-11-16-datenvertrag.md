# Paket 8: gemeinsame synthetische Datenverträge

Stand: 2026-11-16. Nach Paket 7 ausschließlich Paket 8, danach 9/10 bereits autorisiert.

Gemeinsame JSON-Fixture in `tests/fixtures/stellendaten_vertrag.json`, direkt aus Python- und TypeScript-Tests gelesen. Vorhandenen regelbasierten Steckbrief-Schreiber gegen explizite erwartete Rohdaten prüfen und diese Rohdaten durch den Website-Leser prüfen; ergänzend kaputte Leserwerte. Vollständige KI-Antworten gegen Python-Prüfung und deren vorhandene Website-Projektion prüfen. Unterschiedliche Aufgaben bewusst erhalten: Python verlangt vollständige Schlüssel und normalisiert Text, UI liest nur Anzeigefelder und bewahrt empfangene Texte. Keine vollständige Objektgleichheit zwischen diesen verschiedenen Ausgaben erzwingen.

- [x] Gemeinsame gültige/kaputte Beispiele und beide Testseiten ergänzen; nur konkrete Vertragsfehler korrigieren.
- [x] Sicherer Python-Offline-Lauf, Websuite, Typprüfung und isolierter Build; eigener Review.
- [x] Dokumentieren, eigener lokaler Commit; danach Paket 9.

Keine echten Anzeigen, CVs oder Modellaufrufe. Keine neue Schema-Bibliothek, KI-Struktur oder Modellwahl. Python ausschließlich über vorhandenen Offline-Einstieg ohne Umgebungsdateien/Live-Imports/Netzwerk. Ersatzprüfungen belegen Datenverarbeitung, keine Modellqualität.

## Ergebnis und Nachweise

Eine gemeinsame Fixture wird unmittelbar von zwölf Python- und 15 TypeScript-Prüfungen genutzt. Explizite Steckbrief-Rohdaten und Website-Projektion, 0/Unbekannt, Einheiten, kaputte Werte sowie neun gültige/ungültige KI-Fälle geprüft. Bewusste Unterschiede bei vollständiger Python-Schlüsselprüfung, Texttrimmen und Website-Teilprojektion erhalten; keine neue Schema-Bibliothek oder Datenstruktur im Produkt.

Gezielt zwölf Python- und 15 Webtests grün. Vollständig 480 Python-Offline-Tests über pruefe_offline mit gesperrten Live-Modulen/Umgebungsdateien/Netzwerk/Prozessstarts; 243 Webtests, Typprüfung und isolierter Webpack-Build bestanden. Build ohne Umgebungsdateien und mit künstlichen Einstellungen/HTTP-Sperre. Eigener Review und git diff --check ohne Befunde. Kein neuer Browserlauf, nur Tests/Fixture/Dokumentation geändert.

Keine Modellqualität oder echte SQL-/RLS-Ausführung geprüft. Keine echten Anzeigen/CVs, Zugangsdaten, Modellaufrufe, Migration oder Veröffentlichung. Pakete 9/10 folgen im erteilten Auftrag, 11–14 separat.

Neue Vertragstests von Anfang an grün; keine unnötige Codeänderung erzwungen. Erster kompletter Python-Lauf: 443 bestanden, 37 Einrichtungsfehler wegen gesperrtem Standard-Tempordner; PYTEST_DEBUG_TEMPROOT ausschließlich für den Prozess auf lokalen Prüf-Unterordner gesetzt, danach alle 480 grün. Schutzregeln unverändert. Vorhandenes Python 3.12 direkt wegen Launcher-Erkennung; eigener Review, Claude-Prüfung separat.
