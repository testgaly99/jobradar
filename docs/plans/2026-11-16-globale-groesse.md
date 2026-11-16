# Paket 12: globale Größensortierung vorbereiten

Nutzerauftrag: nächste lokale Schritte nach Paket 11. Code und SQL-Datei vorbereiten; keine Migration ausführen. Echte PostgreSQL-/PostgREST-Abnahme bleibt vor Anwendung zwingend offen.

Technischer Sortierschlüssel auf companies als gespeicherte generierte Spalte: <50 → 0, 50–249 → 1, 250–999 → 2, 1.000+ → 3, unbekannt → 99. Reihenfolge entspricht vorhandenen Klassen. Standardabfrage sortiert top-level über die vorhandene many-to-one-Beziehung; Ranking-RPC übernimmt den Schlüssel in ihr vorhandenes companies-JSON, Rückgabesignatur und Rechte bleiben erhalten. Danach je Klasse wie bisher erstmals_gesehen absteigend und id aufsteigend. Sortierung erfolgt vor range, keine Seitensortierung im Browser.

Offizielle Grundlagen am 2026-11-16 geprüft: [PostgREST Top-level Ordering](https://docs.postgrest.org/en/v13/references/api/resource_embedding.html#top-level-ordering), [JSON Ordering](https://docs.postgrest.org/en/v13/references/api/tables_views.html#json-columns), [PostgreSQL Generated Columns](https://www.postgresql.org/docs/17/ddl-generated-columns.html). Daraus abgeleitete Umsetzung; tatsächlich installierte Zielversion und SQL-Ausführung noch nicht verifiziert.

- [x] HTTP-Vertragstests mit künstlichen mehreren Seiten und bestehender Filter-/Rankinglogik zuerst ergänzen.
- [x] Migration 011 nur als Datei, bestehende RPC um JSON-Schlüssel ergänzen; Webabfrage global ordnen und alte Seitensortierung entfernen.
- [x] Websuite, Typprüfung, isolierter Build und künstliche Browserprobe; SQL-Abnahmefälle für Paket 13 vorbereiten.
- [x] Dokumentieren und eigener lokaler Commit als Vorbereitung, keine Produktivfreigabe.

Gast liest weiterhin nur öffentliche Felder; neue Spalte ist ausschließlich aus bereits öffentlicher Größenklasse berechnet. Keine Quellenaktivierung, neue Kriterien oder Änderung der Klassen. Migration 011 vor jeder echten Nutzung dieses Sortierwegs erforderlich; ohne sie kann der Größensortieraufruf fehlschlagen. Nicht vor Datenbankabnahme hochladen.

## Ergebnis und Nachweise

Generierte gespeicherte companies.groesse_rang-Spalte bildet die vorhandenen Klassen auf 0/1/2/3/99 ab. Standardabfrage ordnet über die Firmenbeziehung, Rankingabfrage über denselben Schlüssel im bestehenden companies-JSON; danach wie bisher neueste zuerst/id. Alte Sortierung nur innerhalb einer Seite entfernt. SQL-Datei erhält bestehende RPC-Signatur, Listenvalidierung und security invoker; Gast erhält ausschließlich den zusätzlichen aus öffentlicher Größe berechneten Schlüssel. Keine Migration ausgeführt.

Zwei neue HTTP-Vertragstests zuerst rot, danach grün: 112 künstliche Treffer über drei Seiten mit/ohne Ranking, Filter/Count/Offset/Reihenfolge. Alte Seitensortierprüfung durch globale Fälle ersetzt. 249 Webtests, Typprüfung und isolierter Webpack-Build bestanden. Chrome 1280/390 Pixel: bisherige acht Fälle sowie jeweils drei Größenseiten mit/ohne Ranking bestanden. Eigener Server beendet. Vorbereitete SQL-Prüfung umfasst fünf Größenklassen, Gastspalte und weiterhin gesperrten Text; nicht ausgeführt. git diff --check und eigener Review bestanden.

Keine PostgreSQL-/PostgREST-Umgebung vorhanden, tatsächliche SQL-Syntax, Zielversion, Rollen und HTTP-Ausführung noch nicht abgenommen. Migration 011 muss vor echter Größensortierung angewendet werden; kein Upload dieses Codes vor Datenbankabnahme. Python unverändert und nicht erneut geprüft. Keine Live-Daten/Umgebungsdateien/Schlüssel gelesen, kein Dienst installiert oder veröffentlicht.

Paket ausdrücklich nur vorbereitet statt vollständig abgenommen, weil isolierte Datenbank fehlt. Für Top-level-Sortierung über many-to-one und JSON offizielle PostgREST-Dokumentation geprüft. Typprüfung erforderte eine explizite Ergebnis-Typangabe im künstlichen Test; danach grün. Eigener Review, Claude-Prüfung separat.
