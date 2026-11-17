# Prüfgrundlage für die bestehende Anwendung

Stand: 2026-11-16. Diese Bestandsaufnahme dokumentiert bereits notwendige Prüfungen und den versionierten Offline-Einstieg. Sie legt keine neuen Produktfunktionen, Anbieter oder Rankings fest und ersetzt keine Funktions- oder Veröffentlichungsfreigabe. Aktuelle Ergebnisse stehen zentral in `STATUS.md`; frühere grüne Tests gelten nicht automatisch für spätere Änderungen.

## Vorbereiteter Prüfbestand

| Bereich | Vorhandene Prüfungen | Was sie belegen | Was zusätzlich offen bleibt |
|---|---|---|---|
| Firmenabruf | `tests/test_greenhouse.py`, `test_ashby.py`, `test_personio.py`, `test_recruitee.py`, `test_sitemap.py` | Verarbeitung gespeicherter Beispielantworten, erwartete Felder und Filter | Tatsächliche Erreichbarkeit, neue Seitenformate und aktuelle Abrufbedingungen |
| Abrufregeln | `tests/test_http.py` | Robots-Verbot, unerreichbare Robots-Datei, Abrufpause und User-Agent mit ersetzten HTTP-Antworten | Verhalten echter Zielserver und Schutz bei späteren frei eingegebenen Zieladressen |
| Datenabgleich | `tests/test_db.py`, `test_run.py`, `test_umzug.py`, `tests/fakedb.py` | Neue, unveränderte und geschlossene Stellen; Ablauf und Fehlerbehandlung mit Datenbank-Ersatz | Tatsächliche SQL-Constraints, Rollenrechte und Transaktionen |
| Anzeigenverarbeitung | `tests/test_filter.py`, `test_abschnitte.py`, `test_steckbrief.py` | Vorhandene Regeln, Gliederung und Steckbrief gegen Beispiele | Qualität auf unbekannten Anzeigenformaten |
| KI-Schnittstelle | `tests/test_ki.py`, `web/tests/ki*.test.ts`, `web/tests/zusammenfassung.test.ts` | Formatprüfung, Grenz-/Fehlerfälle und Verarbeitung ersetzter Antworten | Tatsächliche Modellqualität und ausdrücklich freizugebende Groq-Probe |
| Website | `web/tests/*.test.ts` | Vorhandene Filter-, Tracker-, Export- und Hilfsfunktionen; teilweise HTTP-Abfrageverträge | Echte Anmeldung, Datenbankrechte, vollständige Browserabläufe |
| Ranglisten | `tests/test_rankings.py`, `web/tests/rankings.test.ts` | Eingabeprüfung und HTTP-Vertrag mit künstlichen Daten | Echte Datenbankausführung und PostgREST-Zusammenspiel |
| Offline-Testbefehl | `tests/test_pruefe_offline.py` | Feste Ausschlüsse, Pfad-/Aliasprüfung, Importsperre, Pluginumgebung sowie Datei-/Netz-/Prozesssperren mit künstlichen Ereignissen | Keine Sicherheits-Sandbox für beliebigen bösartigen Python-/Native-Code; tatsächliche Ausführung bisher unter Windows geprüft |
| Ranglistenrechte/SQL | `tests/sql/rankings.sql` | Vorbereitet: Gastschutz, Schreibschutz, Ausgabewechsel, Ablauf, Duplikate und Rangfolge | Skript wurde noch nicht ausgeführt; isolierte Datenbank fehlt |
| Bestehende Live-Prüfungen | `tests/test_rls.py`, `test_konto_loeschen.py` | Sind für echte Datenbank-/Kontoprüfungen geschrieben | Für Codex nicht ausführen oder importieren; Live-Datenbank bleibt ausgeschlossen |

Die Tabelle ist eine Zuordnung vorhandener Prüfungen, kein Nachweis vollständiger Testabdeckung. Angegebene Dateien und zentrale Anschlussstellen wurden für diese Vorbereitung gelesen; nicht jede einzelne Assertion erneut bewertet oder ausgeführt.

## Reproduzierbare Offline-Prüfung

### 1. Python ohne lokale Zugangsdaten

**Was:** Im Projektordner `jobradar-entwurf` den versionierten Einstieg ausführen:

```powershell
py -B -m pruefe_offline
```

**Warum:** `tests/test_rls.py` lädt lokale Zugangsdaten schon beim Import. `test_konto_loeschen.py` importiert dieses Modul. Ein bloßes Abwählen über `-m "not supabase"` verhindert diesen Import nicht. Der neue Einstieg prüft die Auswahl vor pytest-Import, schließt beide Dateien fest von der Sammlung aus und sperrt auch indirekte gewöhnliche Imports. HTTP-Aufrufe über `requests`, Python-Socket-/DNS-Zugriffe, Python-Prozessstarts und das Öffnen von `*.env*` sind während des Laufs gesperrt; der vorhandene Zugangsdaten-Lader ist deaktiviert. Geerbte pytest-Optionen und externes Plugin-Autoload werden für diesen Lauf deaktiviert.

**Erfolg:** Exit-Code 0, keine fehlgeschlagenen Tests. Ein gesperrter Zugriff ist ein Fehler zum Untersuchen; dafür weder Netzwerk freigeben noch Zugangsdaten nachladen. Der Befehl schützt gegen versehentliche Zugriffe der vorhandenen Tests und ist keine Sandbox für beliebigen bösartigen Python-/Native-Code. Bei neuen Testarten deren Zugriffe erneut prüfen.

Gezielte Auswahl ist möglich; alle Schutzregeln bleiben dabei aktiv:

```powershell
py -B -m pruefe_offline tests/test_rankings.py
py -B -m pruefe_offline -k rankings
py -B -m pruefe_offline --collect-only
```

Erlaubt sind nur vorhandene Testpfade innerhalb `tests/`, optional mit `::Testname`, `-k` und `--collect-only`. Direkte Auswahl der Live-Module, Pfade außerhalb des Testordners sowie frei durchgereichte pytest-Optionen werden abgewiesen. Pfade werden vor der Auswahl aufgelöst; Hardlink-Aliase auf die bekannten Live-Dateien werden ebenfalls erkannt. Der alte lokale Helfer bleibt unverändert erhalten, ist wegen seiner ersetzbaren Standardargumente jedoch kein empfohlener Einstieg mehr.

### 2. Website-Logik und Typprüfung

**Was:** Im Unterordner `web`:

```powershell
npm.cmd test
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
```

**Warum:** Das prüft vorhandene Logik sowie passende Datentypen, ohne die Website mit ihren lokalen Einstellungen zu starten. Unter dieser Windows-Umgebung vermeidet `npm.cmd` die gesperrte PowerShell-Datei `npm.ps1`. Bestehende Abhängigkeiten verwenden, nichts nachinstallieren.

**Erfolg:** Beide Befehle enden mit Exit-Code 0. Daraus folgt noch keine geprüfte Anmeldung, Browserbedienung oder Datenbankabschirmung.

### 3. Produktions-Build und Browserprobe

**Was:** Im Unterordner `web/` steht der bisherige isolierte Weg jetzt als versioniertes Entwicklerwerkzeug bereit:

```powershell
npm.cmd run pruefe:build
npm.cmd run pruefe:browser
```

Der Browserlauf erstellt zuerst den isolierten Build und verwendet die bereits vorhandenen Chrome-/Python-/Playwright-Werkzeuge. Falls der Windows-Launcher die vorhandene Python-Installation nicht erkennt, kann der Entwickler `-- --python <Interpreterpfad>` anhängen. Nichts nachinstallieren. Das sind Entwicklerprüfungen, keine regelmäßigen Nutzeraufgaben.

**Erweiterung 2026-11-16:** Zusätzlich zu Stellen-/Rankingabläufen prüft derselbe Einstieg auf 1280/390 Pixeln durchgehende Tracker-, Dokument-, CSV-Export- und Kontoabläufe einschließlich Fehlerfällen. Export enthält tatsächlich 1001 Bewerbungen und Beziehungen; Löschfälle betreffen ausschließlich künstliche Ersatzdaten. `persoenlich.py`/`.cjs` halten diese Fälle getrennt. Feste künstliche Admin-/Servicewerte werden ausschließlich im isolierten Prozess gesetzt; geerbte Werte werden verworfen. Die neue Import-API wird über einen echten Browser-Fetch mit künstlicher Anmeldung/DB geprüft. Eine installierte Erweiterung und tatsächliche Datenbankrechte sind damit nicht abgenommen. Umfang/Ergebnisse im [Abnahmeplan](plans/2026-11-16-browser-cv-abnahme.md).

**Warum:** Ein normaler Next.js-Build lädt lokale Umgebungsdateien automatisch. Die vorhandene sichere Probe wurde deshalb in einer frischen Kopie durchgeführt. Eine Browserprobe mit Ersatzdaten belegt Bedienabläufe, aber keine echte Datenbankabschirmung.

**Erfolg:** Build und gegebenenfalls Browserprüfung enden mit Exit 0. Quellenkopie, Build und synthetische Anfragen liegen ausschließlich unter dem ignorierten Ordner `.pruefung/`. Symlinks in Quellen werden abgewiesen, Umgebungsdateien/Caches nicht kopiert. Ausgehende Verbindungen sind im Kindprozess gesperrt; numerische Loopback-Adressen dürfen für das Server-Listening aufgelöst werden. Der Browser ruft nur localhost:3002 auf. Ein vorhandener Server wird nicht gestoppt; der eigene Prüfserver wird nach Erfolg oder Fehler beendet. Keine echten Anbieter-/Datenbankaufrufe und keine Schlüssel nötig.

## Bereits vorbereitete Datenbankabnahme

Für `tests/sql/rankings.sql` sind unabhängig von jeder Ranking-Auswahl folgende Nachweise nötig:

- isolierte Testdatenbank mit ausschließlich künstlichen Daten, ausdrücklich als solche gekennzeichnet;
- benötigte Schemaelemente und Rollen `anon`, `authenticated`, `service_role`, passend zu den vorhandenen Migrationen;
- Kontrolle: Gäste lesen keine Ranglistentabellen und rufen keine Ranglistenfunktionen auf; angemeldete Nutzer schreiben keine Zuordnungen;
- Ausgabewechsel, Entwurf/Zukunft, Abschaltung und Ablauf ohne Wiederaufleben alter Ausgaben;
- ODER über Listen ohne doppelte Stellen, weitere Filter mit UND, stabile globale Rangfolge und mehr als 1.000 Zuordnungen;
- zusätzlicher Nachweis über echtes PostgREST für Gesamtzahl, Filter, Sortierung und Seiteneinteilung. Das SQL-Skript allein deckt diese HTTP-Schicht nicht ab.

Das Skript prüft vor seinen Testschritten den Datenbanknamen `jobradar_ranking_test` und die ausdrückliche Testkennung; Testdaten liegen in einer zurückgerollten Transaktion. Diese Schutzprüfung ersetzt keine vorherige Kontrolle des Verbindungsziels. Keine bestehende Live-Verbindung oder Sicherung echter Nutzerdaten verwenden.

Eine passende lokale Umgebung ist noch nicht vorhanden. Dafür wurden weder Werkzeuge installiert noch ein Dienst oder Konto angelegt. Paket 13 ergänzt den verbindungsfreien Werkzeugvorcheck `python -B tests/sql/pruefe.py`, feste lokale Testziele und einen vorbereiteten SQL-/HTTP-Abnahmepfad. Einrichtung und tatsächliche Ausführung bleiben gesondert offen. Reihenfolge, Voraussetzungen, persistente Testkennung, künstliche HTTP-Fixture und Grenzen stehen in [tests/sql/README.md](../tests/sql/README.md). `groesse.sql` ergänzt die globale Größenabnahme nach Migration 011. Keine Datei wurde gegen PostgreSQL/PostgREST ausgeführt.

## Übergabe bei jeder tatsächlichen Prüfung

Paket 14 bereitet `.github/workflows/codepruefung.yml` vor: separate Python-/Webprüfungen unter Ubuntu, ausschließlich Repository-Leserechte, ohne Anbieter-Secrets. Python nutzt den geschützten Offline-Einstieg; Web nutzt Node 24, bestehende Tests, Typprüfung und den isolierten Build mit Netzsperre. Bestehende Abhängigkeiten würden erst im zukünftigen GitHub-Runner eingerichtet. Kein Browser-/Datenbankdienst und keine Veröffentlichung durch diesen Workflow. Der tägliche Abruf bleibt unverändert. Lokal nur Datei vorbereitet und bestehende Befehle geprüft; echter GitHub-/Linux-Lauf und Aktivierung erst nach gesondertem Upload. Größen-Code aus Paket 12 vorher isoliert mit Datenbank/PostgREST abnehmen.

Ergebnis immer mit Code-Stand, Datum, genauen Befehlen, Ersatz-/Offline-Grenzen, bestandenen und offenen Prüfungen dokumentieren. Geprüfte Anzeigeabläufe, Datenbankrechte und KI-Qualität getrennt benennen. Neue Tests sollen beobachtbares Verhalten und Fehlerfälle prüfen; keine Tests allein für diese Dokumentation hinzufügen.

Die Prüfwerkzeuge und ihre Schutztests verwenden ausschließlich künstliche Daten. `pytest.ini`, täglicher Workflow und Live-Testmodule bleiben unverändert. Vorläufigkeit des Firmenportal-Plans sowie sämtliche bestehenden Live-/Groq-/Veröffentlichungsgrenzen bleiben bestehen.
