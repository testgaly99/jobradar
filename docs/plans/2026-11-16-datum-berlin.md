# Paket 7: gemeinsame Datumsprüfung und unmögliche Berliner Zeiten

Stand: 2026-11-16. Nutzer beauftragt die nächsten vier Pakete, also 7 → 8 → 9 → 10. Zuerst ausschließlich Paket 7.

Gemeinsame vorhandene Kalenderprüfung für reine Datumswerte erhalten und präzisieren, einschließlich strikter Datumsform und JavaScripts Sonderfall Jahre 0–99. Dokumentdatum und Tracker verwenden weiterhin denselben Prüfer. `berlinZuIso` prüft Datum/Uhrzeit selbst, vergleicht nach Umrechnung die Berliner Uhrzeit mit der Eingabe und weist die im Frühjahr übersprungene Stunde ab. Vorhandene Wahl bei doppelt vorkommender Herbstzeit erhalten; keine neue Auswahlpolitik, Kalenderverbindung oder Erinnerung.

- [x] Tests zuerst: Kalendertage, Datum gegenüber Zeitpunkt, ungültige Uhren und Sommerzeitgrenzen, bisherige Herbstwahl.
- [x] Bestehende Funktionen korrigieren und Interview-Formularprüfung unmittelbar verwenden.
- [x] Websuite, Typprüfung, isolierter Build, künstliche Formular-/Aktionsprobe, eigener Review.
- [x] Dokumentation aktualisieren und eigener lokaler Commit; danach Paket 8.

Keine echten Nutzerdaten, Zugangsdaten, Live-Datenbank, neue Pakete, Migration oder Veröffentlichung. Unabhängige Claude-Prüfung separat; eigener Review gemäß Sitzungsregel.

## Ergebnis und Nachweise

Kalenderdatum strikt geprüft, Jahr-0–99-Sonderfall durch gemeinsame UTC-Hilfe vermieden; Dokumente/Tracker teilen datumOk. berlinZuIso prüft selbst und verlangt passenden Berliner Rückvergleich. parseAbschnitt nutzt diesen Prüfer unmittelbar. Vorherige Wahl der doppelten Herbststunde beibehalten.

Sechs neue Verhaltenstests; zuerst 23 grün/drei rot, nach Korrektur npm.cmd test: 228 bestanden. Typprüfung in web ohne Fehler; isolierter Webpack-Build ohne Umgebungsdateien, mit künstlichen Einstellungen und HTTP-Sperre bestanden. Sechs Chrome-Formularprüfungen bei 1280/390 Pixel: Lücke meldet vorhandenen Fehler ohne Schreibversuch; gültige Zeit und Herbstwahl ergeben erwartetes ISO in ersetztem insert. Externe Anfragen blockiert, keine Browserfehler, Testserver beendet. Lokale Hilfen unter .superpowers/sdd/2026-11-16-datum-berlin/. git diff --check ohne Fehler, eigener Review ohne materielle Befunde.

Keine echte Anmeldung, Interviews oder Datenbankrechte geprüft, keine Live-Abfragen/Dateien/Zugangsdaten. Python-Anwendung unverändert, Python-Suite nicht erneut ausgeführt. Pakete 8–10 bereits beauftragt, 11–14 separat. Keine Veröffentlichung oder Nutzeraktion.

Browser wie zuvor direkt mit vorhandenem Python 3.12 wegen Launcher-Erkennung, keine Installation. Eigener Review statt unaufgeforderter Delegation gemäß Sitzungsregel; Claude-Prüfung separat.

Lokale Prüfhilfe nachgeschärft: Nexts interne Weiterleitung wurde zunächst mitgesperrt; ausschließlich Loopback auf Port 3002 und Bewerbungsroute freigegeben. Danach den Fehler-Locator auf die tatsächliche Formularmeldung eingeschränkt, weil auch Nexts Route-Ansage role=alert trägt. Erneuter vollständiger Lauf mit sechs erfolgreichen Fällen, ohne Serverfehler; kein Anwendungscode dafür geändert.
