# Paket 14: automatische Codeprüfung vorbereiten

Nutzerauftrag: nächste Schritte lokal fortsetzen. Nur Workflow-Datei vorbereiten, kein Upload/Start auf GitHub. Paket 12 bleibt vor einem Upload an die Datenbankabnahme gebunden.

- [x] Eigenen Workflow mit ausschließlich Leserechten und ohne Anbieter-Secrets vorbereiten: Python 3.12/Offline-Einstieg, Node 24/Webtests/Typprüfung/isolierter Build.
- [x] Bestehenden täglichen Live-Abruf unverändert lassen; keine Datenbank-/Groq-Probe, Browserinstallation oder automatische Veröffentlichung ergänzen.
- [x] Lokale vorhandene Prüfergebnisse den Workflow-Befehlen zuordnen und Datei prüfen; echte GitHub-/Linux-Ausführung ausdrücklich offen lassen.
- [x] STATUS, Entscheidungen, Arbeitskatalog und Protokoll aktualisieren, eigener lokaler Commit.

Installationsschritte im zukünftigen GitHub-Runner verwenden ausschließlich bereits deklarierte requirements.txt/package-lock.json. Lokal keine Pakete installieren. Push/pull_request/workflow_dispatch werden erst nach späterem ausdrücklich freigegebenem Upload relevant. Keine Tests, die nur die Workflow-Datei nachbauen; vorhandene Prüfungen verwenden. YAML-/Actions-Prüfer hier nicht installiert, nichts nachinstallieren.

Offizielle Grundlagen am 2026-11-16 gelesen: [Workflow-Syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [setup-node](https://github.com/actions/setup-node), [setup-python v6](https://github.com/actions/setup-python/tree/v6), [checkout v7](https://github.com/actions/checkout/tree/v7). Tatsächliche Auflösung der Action-Tags und Ausführung auf GitHub bleiben offen.

## Ergebnis und Nachweise

.github/workflows/codepruefung.yml enthält getrennte Ubuntu-Jobs für vorhandene Python-/Webprüfungen. Python 3.12, Node 24, bestehende deklarierte Abhängigkeiten, geschützter Offline-Einstieg und Build-Netzsperre. Nur contents:read, keine gespeicherten Checkout-Zugangsdaten und kein Cache nötig. Kein Scraper-/Groq-/SQL-/Browserdienst oder Deployment; täglicher Workflow unverändert. Erst zukünftiger freigegebener Upload aktiviert Ereignisse. Alle 14 Katalogpakete jetzt lokal bearbeitet: 1–11 fertig, 12–14 vorbereitet und mit offenen Abnahmen gekennzeichnet.

Workflow-Datei und offizielle Action-/Syntaxdokumentation geprüft, Befehle gegen vorhandene Einstiege abgeglichen; täglicher Workflow ohne Diff. Bestehende unveränderte Prüfungen zuletzt in Paket 13: 570 Python-Offline-Tests, in Paket 12: 249 Webtests/Typprüfung/isolierter Produktions-Build und Chrome-Mehrseitenprobe mit künstlichen Daten grün. Keine zusätzlichen Tests nur für eine Konfigurationsdatei; keine unveränderten Prüfungen wiederholt. git diff --check und Commit-Inhaltsprüfung bestanden.

Kein tatsächlicher GitHub-/Linux-Lauf. YAML-/Actions-Prüfer lokal nicht vorhanden, keine maschinelle Workflow-Schemavalidierung behauptet und nichts nachinstalliert. Action-Tags anhand offizieller Dokumentation geprüft, tatsächliche Auflösung beim GitHub-Lauf offen. SQL-/PostgREST-Abnahme bleibt mangels Umgebung ausstehend; Code aus Paket 12 vor Upload abnehmen. Kein Push/Merge, keine Installation, keine echten Daten/Schlüssel/Umgebungsdateien gelesen.

Nur lokale Workflow-Vorbereitung entsprechend Kataloggrenze, keine Aktivierung. Bestehende Prüfergebnisse wiederverwendet, da weder Anwendung noch Tests verändert wurden. Eigener Review, Claude-Prüfung separat.
