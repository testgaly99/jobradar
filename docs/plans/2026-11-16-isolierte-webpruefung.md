# Paket 11: vorhandene isolierte Webprüfung versionieren

Nutzerauftrag: nächste Schritte nach 1–10. Zuerst 11 lokal umsetzen, danach Code/Prüfdateien für 12/13 und Workflow 14 vorbereiten. Keine Installation, Migrationausführung, Live-Daten oder Veröffentlichung freigegeben.

- [x] Vorhandenen Build-/Browserweg als kleine Projektwerkzeuge übernehmen: ausgewählte Quellen, keine Umgebungsdateien oder Symlinks aus Quellen, bereinigte Kindprozessumgebung, künstliche Antworten, gesperrte externe Verbindungen.
- [x] Sicherer Serverstart nur auf localhost:3002 mit Prüfung auf freien Port; eigenes Kind nach Browserprüfung/Fehler beenden. Keine fremden Server stoppen.
- [x] Schutztests, Websuite, Typprüfung, tatsächlicher isolierter Build und Browserlauf. Python-Anwendung unverändert.
- [x] Dokumentation/Arbeitskatalog/Agentenprotokoll, eigener lokaler Commit. Keine .superpowers-Artefakte versionieren.

Browser benötigt die bereits vorhandene Python-/Chrome-/Playwright-Installation; kein neues Paket installieren. CI 14 kann ohne Browserinstallation den isolierten Build nutzen. Eigener Review, unabhängige Claude-Prüfung separat.

## Ergebnis und Nachweise

Vier ausgewählte Helfer unter web/scripts/offline versioniert, keine Arbeitsprotokolle kopiert. Nur app/lib/public und bekannte Konfigurationen werden ohne Umgebungsdateien, Caches und Quell-Symlinks in ignorierte .pruefung kopiert. Kindprozesse erhalten nur ausgewählte Betriebssystemwerte/künstliche Einstellungen. Netzwerk und externe DNS-Abfragen gesperrt; numerische Loopback-Auflösung ermöglicht lokales Listening. Eigener Server nur auf freiem Port 3002, nach Erfolg/Fehler beendet; vorhandene Server unangetastet. Browser beschränkt auf localhost, synthetische Daten, keine reguläre Nutzeraufgabe.

Fünf Schutztests, zuerst fehlendes Modul rot. Ganze Suite 248 Webtests und Typprüfung bestanden. Tatsächlicher isolierter Webpack-Build mit Netzsperre bestanden. Browserprüfung: je 1280/390 Pixel Gast, Listenfilter, Detailseite mit 0 Jahren und ungültige Auswahl, acht Fälle bestanden; keine Browserfehler, keine Gast-Rankingabfragen. Server nach Erfolg und nach vorangegangenen fehlgeschlagenen Browserläufen beendet. git diff --check und eigener Review ohne materielle Befunde.

Keine Live-Daten, Umgebungsdateien oder Schlüssel, keine echten Datenbankrechte geprüft. Python-Anwendung unverändert, Suite nicht erneut ausgeführt. Linux-/GitHub-Lauf noch offen. PostgreSQL/Docker nicht vorhanden; kein Werkzeug installiert. Keine Veröffentlichung.

Netzsperre zunächst auch für das lokale Listening zu streng; nur numerische Loopback-DNS-Auflösung erlaubt und dafür eigener Schutztest ergänzt. Browser-Locatoren auf tatsächlichen Steckbrief und mobilen Filter-Klickweg präzisiert; danach kompletter Browserlauf grün. Kein Produktcode geändert. Browser mit vorhandenem Python 3.12 direkt wegen Launcher-Erkennung. Eigener Review gemäß Sitzungsregel, Claude-Prüfung separat.
