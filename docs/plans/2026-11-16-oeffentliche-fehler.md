# Paket 10: öffentliche Fehler auf technische Diagnose begrenzen

Stand: 2026-11-16. Letztes Paket des autorisierten Auftrags 7 → 8 → 9 → 10.

Sichere gemeinsame Fehlerdarstellung für vorhandene öffentliche Laufberichte/Konsolenausgaben: Klasse, HTTP-Status, begrenzte bekannte Fehlercodes und vorhandener Verarbeitungsschritt. Keine Rohantwort, Header, URL-Parameter oder beliebigen Ausnahmetexte ausgeben. Datenbankfehler bereits an _req-Grenze bereinigen, Netzwerk-/JSON-Fehler ebenfalls; bestehende Migrations-Fallbacks müssen weiter funktionieren. Öffentlich protokollierte KI-Fehler analog bereinigen, keine Prompt-/Modelländerung.

- [x] Künstliche Fehlerantworten und End-to-End-Ausgaben zuerst testen: Diagnose erhalten, markierte geheime Testwerte fehlen überall.
- [x] Kleine Fehlerhilfe sofort in db/run/ki einsetzen; Datenbank-Status und bekannte Codes bewahren.
- [x] Gezielte und gesamte Python-Offline-Suite, eigener Review mit allen öffentlichen Ausgabestellen.
- [x] Dokumentation aktualisieren, eigener lokaler Commit; Gesamtauftrag abschließen.

Keine echten Geheimnisse als Testdaten, keine neue Log-Datenbank oder private Firmenquelle, keine Live-Abfrage, Zugangsdaten, Migration, Installation oder Veröffentlichung. Bekannte öffentliche Firmenberichte bleiben erhalten; private Zusatzfirmen weiterhin separates späteres Paket.

## Ergebnis und Nachweise

Gemeinsame Fehlerhilfe unmittelbar in db/run/ki eingesetzt. _req gibt kontrollierte RuntimeError-Unterklasse mit bekanntem Ziel/HTTP-Methode/Status und geprüftem SQLSTATE-/PostgREST-Code aus; Netzwerk- und JSON-Fehler ohne rohe Ursache verkettet. Firmenlauf nennt den betroffenen Schritt. Öffentliche Hinweise nutzen keine beliebigen Ausnahmetexte und keine Bewerbungs-/Stellen-IDs. Bekannte KI-Codes und sichere Statusinformationen aus Ursachen sowie Robots-Fehlern bleiben erhalten; Migrations-Fallbacks unverändert funktionsfähig.

17 zusätzliche synthetische Fehlerprüfungen; erste elf vor Korrektur rot. Nach Korrektur gesamte Python-Offline-Suite: 553 bestanden, mit lokalem Test-Tempordner und gesperrten Live-Modulen/Umgebungsdateien/Netzwerk/Prozessstarts. Rohe Testmarker fehlen in DB-Ausnahmen, Konsolenhinweisen und JSON-/Markdown-Berichten; Status/Codes/Schritte erhalten. Nicht-JSON-Antworten, Timeouts, Ursachenketten, KI-Stopps und Migrationen geprüft. Drei alte Erwartungen an rohe Meldungstexte auf konkrete neue sichere Ausgabe umgestellt. Eigener Review aller betroffenen öffentlichen Ausgabestellen und git diff --check ohne Befunde. Website seit Paket 8 unverändert: zuletzt 243 Webtests, Typprüfung und isolierter Build bestanden, keine erneute Webprüfung nötig.

Keine echten Geheimnisse, Anzeigen, Bewerbungen oder privaten Wunschfirmen verarbeitet; nur künstlicher Marker als Testwert. Keine Live-/Groq-Anfragen, neue Logdatenbank, Installation, Migration oder Veröffentlichung. Tatsächliche Anbieter-/SQL-/RLS-Abnahme offen. Pakete 11–14 nicht beauftragt; keine Nutzeraktion nötig.

Python direkt mit vorhandenem Interpreter und lokalem PYTEST_DEBUG_TEMPROOT wie zuvor; Sicherheitsregeln unverändert. Eigener Review gemäß Sitzungsregel, Claude-Prüfung separat. Verlust beliebiger Freitext-Fehlerdetails ist ausdrücklich beabsichtigte Anforderung von Paket 10; technische Klasse/Status/Code/Schritt gezielt abgesichert.
