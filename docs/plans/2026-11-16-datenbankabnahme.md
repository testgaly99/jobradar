# Paket 13: isolierte Datenbankabnahme vorbereiten

Nutzerauftrag: nächste Schritte nacheinander. Vorhandene Ranglisten- und neue Größen-SQL-Tests nutzbar ergänzen, keine Installation, Migration, Datenbankverbindung oder Live-Abfrage ausführen.

- [x] Schutztests zuerst: feste lokale Ziele, bereinigte psql-Umgebung, fehlende Testkennung, fehlerhafte Gesamtzahl, doppelte/fehlende Seiten und verbotene Weiterleitung.
- [x] Kleiner Entwickler-Einstieg mit verbindungsfreiem Standard-Vorcheck; SQL nur explizit gegen festes isoliertes Ziel, HTTP nur nach Testkennung.
- [x] Künstliche HTTP-Fixture und genaue Einrichtungsvoraussetzungen als Dateien; bestehende Transaktions-/Rollentests wiederverwenden.
- [x] Geschützte Python-Suite und verbindungsfreien Vorcheck ausführen, Grenzen dokumentieren und separat committen.

Voraussetzungen für spätere echte Abnahme: PostgreSQL mit Supabase-kompatiblen auth/storage-Schemata, Rollen/Grants aus dem bestehenden Schema, Migrationen 001–010 vom Nutzer angewendet, ausschließlich künstliche Daten. Keine echte Sicherung verwenden. Datenbankname jobradar_ranking_test, SQL-Port 5433, HTTP-Port 3003, ausschließlich 127.0.0.1. Diese Ports sind Test-Backend-Endpunkte; Website bleibt 3002. Persistente Datenbankkennung zusätzlich zur bisherigen SQL-Sitzungskennung nötig. Einrichtung und Ausführung bleiben gesondert freizugeben.

HTTP-Fixture: 1005 Firmen/Stellen, zwei sich überlappende Listen, alle fünf Größenklassen. Echte HTTP-Abnahme prüft Gastrechte, Schreibschutz, Filter, Count und alle Seiten ohne Dubletten; keine Behauptung echter Rechteprüfung aufgrund von Ersatzantworten. Keine neue Bibliothek, keine Quellenaktivierung und keine Live-Testmodule importieren.

## Ergebnis und Nachweise

tests/sql/pruefe.py prüft standardmäßig nur vorhandene Werkzeuge. Explizite SQL-Probe nutzt ausschließlich 127.0.0.1:5433/jobradar_ranking_test, bereinigte psql-Umgebung, keine Passwort-/Servicedateien und drei feste Testskripte. Vorcheck verlangt persistente Kennung, leeres Schema und generierte Größenspalte. HTTP auf 127.0.0.1:3003 verlangt zuerst Testkennung; keine Proxys/Redirects. Vorbereitete Prüfung von Gast-/Schreibschutz, Katalog, 1005 eindeutigen Treffern über alle Seiten, Größen-/Rangsortierung und UND-Filtern. SQL-Tests rollen zurück; separate HTTP-Fixture committet ausdrücklich nur künstliche Daten und verweigert vorhandenen Bestand. PostgREST-Konfiguration und genaue Voraussetzungen dokumentiert; keine Installation/Verbindung/Ausführung.

Zuerst fehlender Prüfeinstieg rot, danach 17 Schutztests grün. Ganze geschützte Python-Suite: 570 bestanden. Werkzeugvorcheck tatsächlich verbindungsfrei ausgeführt: psql und postgrest fehlen, vorgesehener Fehlerstatus. git diff --check und eigener Quellreview bestanden. Keine Webänderung in Paket 13; zuletzt Paket 12: 249 Webtests, Typprüfung, isolierter Build und Browserprüfung grün.

Kein SQL-/RLS-/PostgREST-Test tatsächlich ausgeführt. Supabase-kompatibles auth/storage-Basisschema und Rollen werden vorausgesetzt, nicht durch Platzhalter ersetzt; konkrete Zielversion offen. Neue Umgebung/Installation und migrationsseitige Ausführung nicht freigegeben. Testkonfiguration enthält ausschließlich eine absichtlich öffentliche synthetische Signatur. Keine Live-/Umgebungsdatei gelesen, kein Konto/Server eingerichtet, kein Push/Merge.

Ausführungsweg und Abnahmebestand vorbereitet statt echten DB-Lauf vorzutäuschen. SQL-Transaktion kann keine Daten für separate HTTP-Verbindungen liefern: deshalb ausdrücklich getrennte commitende künstliche Fixture, anschließend SQL-Probe erst wieder im neu leeren Testschema. Eigener Review, Claude-Prüfung separat.

## Nachkorrektur nach Review am 2026-11-16

Entfernbare Laufzeitasserts durch explizite Prüfungen ersetzt; notwendige Anfragen außerhalb von Assertions. Gemischte Größen-/Datums-Fixture als Datei, unabhängige feste Startgruppen für die erwartete Folge, Senior-/Berlin-Auswahl und Rangfolge separat erhalten. 62 reguläre Offline-Schutz-/Abnahmefälle prüfen normalen und optimiert kompilierten Code, tatsächliche Seitenaufrufe und absichtlich falsche Sortierung/Rechte/Count/Duplikate. Zuerst 35 rot/27 grün, nach Korrektur alle grün; Gesamtsuite 655 bestanden. Unabhängiger Review ohne Restbefunde, Plan `2026-11-16-reviewkorrekturen.md`. Kein SQL/PostgREST ausgeführt, ursprüngliche Umgebungs-/Freigabegrenzen gelten weiter.
