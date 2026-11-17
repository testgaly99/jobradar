# Vorbereitete Datenbankabnahme – noch nicht ausgeführt

Entwickleranleitung für Paket 12/13. Der Nutzer startet keine regelmäßigen Prüfungen von Hand. Die folgenden Verbindungs-/Einrichtungsschritte sind **nicht freigegeben oder ausgeführt**. Kein Werkzeug wurde installiert. Echte Supabase-Verbindung, lokale Zugangsdaten und Sicherungen echter Nutzerdaten bleiben ausgeschlossen.

Korrektur vom 2026-11-16: Start-/Rechte-/Ergebnisprüfungen bleiben auch unter Python `-O`/`-OO` aktiv. Die vorbereitete HTTP-Fixture mischt jetzt alle fünf Größenklassen zyklisch über die IDs und verteilt die Stellen auf drei Erstdaten. Je Klasse entstehen 201, je Größen-/Datumsgruppe 67 Treffer. Der Prüfer erwartet diese Reihenfolge unabhängig durch feste Startgruppen; reine ID-/Datumssortierung reicht nicht mehr. Die vorhandenen 1005 Treffer, zwei Listen und 502 Senior-/Berlin-Treffer bleiben erhalten. Eine ältere künstliche Fixture nicht weiterverwenden; für die spätere Abnahme die korrigierte Datei im leeren isolierten Testschema anwenden. Noch kein SQL-/PostgREST-Lauf durchgeführt.

## Was ohne Verbindung geprüft werden kann

1. Im Projektordner `python -B tests/sql/pruefe.py` ausführen (unter Windows gegebenenfalls den vorhandenen Interpreter direkt).
2. Ergebnis lesen: Exit 2 benennt fehlende Werkzeuge, Exit 0 bedeutet ausschließlich „Werkzeuge gefunden“.

Warum: Der Standardweg prüft nur, ob `psql` und `postgrest` im Suchpfad liegen. Er öffnet keine Verbindung und startet keinen Prozess/Dienst. Er belegt weder ein eingerichtetes Schema noch Rechte.

## Nach Freigabe einzurichtende Voraussetzungen

1. Ausschließlich lokales, neues Wegwerf-System mit PostgreSQL und PostgREST einrichten. PostgreSQL nur auf `127.0.0.1:5433`, Datenbank `jobradar_ranking_test`. Keine Portweiterleitung zu einem bestehenden Server, keine echte Sicherung. Die Website benutzt weiterhin 3002; 3003 ist nur die Test-API.
2. Supabase-kompatibles Basisschema mit `auth.users`, `auth.uid()`, `storage.buckets`, `storage.objects`, `storage.foldername()` und den Rollen `anon`, `authenticated`, `service_role` bereitstellen. Bestehende Supabase-Standardgrants auf Schema/Tabellen müssen auch im Test gelten. Ein nackter PostgreSQL-Server genügt nicht. Herkunft und Version des Basisschemas protokollieren; Platzhalter für Auth/Storage wären keine vollständige Supabase-Abnahme.
3. Lokale Testrollen: `jobradar_test_admin` als Besitzer/Administrator, `jobradar_test_http` als Login ohne Superuser/Bypass-RLS, Mitglied von `anon` und `authenticated` ausschließlich zum `SET ROLE`. HTTP-Login erhält keine eigenen Datenrechte. Nur für diese Wegwerf-Instanz lokale kennwortfreie Anmeldung der zwei Testrollen zulassen; keine globale Authentifizierungsregel ändern.
4. Nutzer/Operator wendet Migrationen 001–010 in Reihenfolge auf dieses leere Testschema an. Codex führt keine Migration aus. Schema enthält keine Firmen, Stellen, Ranglisten oder Nutzerdaten. Persistente Kennung mit `ALTER DATABASE jobradar_ranking_test SET jobradar.testdatenbank = 'nur-kuenstliche-daten';` setzen, anschließend neue Verbindung öffnen. SQL-Sitzungskennung `jobradar.offline_test=rankings` kommt zusätzlich vom Prüfeinstieg.

Warum: Originalmigrationen benötigen Auth-/Storage-Bestandteile und Rollen. Der feste lokale Endpunkt allein beweist keine Trennung; Datenbankname, persistente Kennung und leere Tabellen bilden zusätzliche Startprüfungen. Erfolg: Basisschema/Migrationen bestätigt, keine realen Daten, beide Ports gehören dem ausdrücklich eingerichteten Testsystem.

## Reihenfolge der tatsächlichen Abnahme nach gesonderter Freigabe

1. `python -B tests/sql/pruefe.py --sql`: prüft zuerst Kennung/leeres Schema/generierte Spalte, dann `rankings.sql` und `groesse.sql`. Beide legen ausschließlich künstliche Daten in Transaktionen an und rollen sie vollständig zurück. `psql -X -w` lädt keine Startdatei und fragt kein Passwort ab; geerbte PG-Einstellungen werden verworfen, Passwort-/Servicedateien auf das Nullgerät gelegt. Der Einstieg führt keine Migration und keine beliebig wählbare SQL-Datei aus.
2. Nach grüner SQL-Probe wendet der Operator `tests/sql/http_daten.sql` mit derselben festen Testverbindung und Sitzungskennung an. Diese Fixture **committet absichtlich** 1005 künstliche Firmen/Stellen und zwei Listen; HTTP-Verbindungen könnten zurückgerollte Daten nicht sehen. Bei vorhandenen Daten bricht sie ab. Keine Lösch-/Überschreibautomatik. Ab diesem Schritt ist `--sql` gesperrt, bis der Operator wieder ein neues leeres Testschema bereitgestellt hat.
3. PostgREST mit `tests/sql/postgrest.conf` ausschließlich in bereinigter Prozessumgebung starten: keine geerbten `PGRST_*`/`PG*`-Werte, keine Passwort-/Servicedateien, kein Proxy. `db-config=false` verhindert abweichende Datenbankkonfiguration. Testrollen und feste DB-Verbindung wie oben. Enthaltene JWT-Signatur ist absichtlich öffentlich und nur für diese lokale künstliche Umgebung; kein echter Schlüssel/Testkonto nötig.
4. `python -B tests/sql/pruefe.py --http`: ruft zuerst ausschließlich `/rpc/offline_testkennung` auf. Bei falscher/fehlender Kennung keine weiteren Abfragen. Danach Gast-/Schreibschutz, Katalogzahlen, 1005 Treffer ohne 1000-Kappung, alle 50er-Seiten, globale Größenfolge als Gast/angemeldet, UND-Filter und globale Rangfolge. Weiterleitungen und Systemproxies sind ausgeschaltet. Ein unerwartet erfolgreicher Schreibversuch wird als Fehler erkannt; betroffen wäre ausschließlich die künstliche Fixture.
5. Exit-Codes, Versionen und Code-Commit in `docs/STATUS.md`/Agentenprotokoll festhalten. Testdienst anschließend durch seinen Betreiber beenden. Keine Testfunktion/Fixture in produktive Migrationen übernehmen.

Warum: SQL prüft die ursprünglichen Rollen-/Ausgabewechselregeln, HTTP zusätzlich deren tatsächliche Verarbeitung durch PostgREST. Erfolg ist ausschließlich ein echter grüner Lauf beider Stufen; grüne Offline-Schutztests ersetzen ihn nicht. Produktives Hochladen des Größen-Codes erst nach dieser Abnahme und Migration 010 (Spalte groesse_rang) in der späteren Zielumgebung.

Offizielle Grundlagen, am 2026-11-16 gelesen: [PostgREST-Konfiguration](https://docs.postgrest.org/en/stable/references/configuration.html), [psql-Optionen](https://www.postgresql.org/docs/current/app-psql.html), [libpq-Umgebung](https://www.postgresql.org/docs/16/libpq-envars.html). Die Testdateien sind daraus abgeleitet; konkrete Zielversion und Kompatibilität bleiben bis zur Ausführung offen.
