# Bestehende Offline-Prüfung wiederholbar ausführen

Stand: 2026-11-15. Der Nutzer beauftragt nach der Prüfvorbereitung mit „Okay, fahre fort“ deren Fortsetzung. Umfang ist die technische Absicherung der vorhandenen Tests, keine Übernahme des vorläufigen Firmenportal-Plans.

## Freigegebener technischer Schritt

Einen kleinen, versionierten Einstieg `py -B -m pruefe_offline` für die vorhandene Python-Suite ergänzen. Er muss die beiden bekannten Live-Testmodule vor Sammlung und Import ausschließen, lokale Umgebungsdateien sowie echte Python-Netzwerkzugriffe und Prozessstarts sperren und den bestehenden Datenbank-Zugangsdaten-Lader deaktivieren. Standardbibliothek und vorhandene Testabhängigkeiten genügen.

CLI bewusst klein: Testpfade innerhalb `tests/`, optional `-k` und `--collect-only`. Keine beliebigen pytest-Optionen oder Plugins durchreichen. Live-Ausschlüsse gelten auch bei Zusatzargumenten; explizite oder über Pfad-Aliase aufgelöste Auswahl der Live-Dateien wird vor pytest-Import abgelehnt. Externes Plugin-Autoload und geerbte pytest-Optionen werden für diesen Prüflauf deaktiviert.

Das ist ein Schutz gegen versehentliche Zugriffe durch die vorhandenen Tests, keine Sicherheits-Sandbox für beliebigen bösartigen Python-/Native-Code. Keine Änderung von `pytest.ini`, Live-Tests, täglichem Workflow oder Anwendungscode; keine neuen Pakete, Datenbanken oder Konten. Keine Zugangsdaten lesen, keine Migration ausführen, kein Groq, Push oder Merge.

## Umsetzung und Abnahme

- [x] Schutz-/Vertragstests zuerst: gültige gezielte Auswahl und Ausschlüsse, direkte/aliasierte Live-Auswahl, unerlaubte Optionen, geschützte Dateizugriffe sowie Netzwerk-/Prozessereignisse mit künstlichen Audit-Ereignissen prüfen. Niemals echte geschützte Dateien oder Netzwerkziele als Probe verwenden.
- [x] Reinen Argumentaufbau und Schutzfunktionen implementieren; Schutz erst im eigenen Runner-Prozess aktivieren, keine globalen Hooks beim bloßen Modulimport.
- [x] Gesamte vorhandene Python-Suite und gezielte Teilprüfung über diesen Einstieg ausführen; Reviewer prüft Grenzfälle. Web-Suite/Typprüfung und isolierten Build vor einem lokalen Commit prüfen, ohne lokale Zugangsdaten zu laden.
- [x] Prüfanleitung, STATUS, Entscheidungen und Agentenprotokoll aktualisieren; tatsächliche SQL-/PostgREST-Abnahme bleibt ausdrücklich offen.

## Prüfergebnis

468 Python-Tests bestanden, darunter 38 Schutztests. Gezielter Lauf des tatsächlichen Audit-Schutztests: 1 bestanden, 33 abgewählt (vor Ergänzung der letzten vier Regressionen). Ausdrückliche Auswahl der bekannten Live-Testdatei mit Fehlerstatus vor pytest-Import zurückgewiesen. Keine echte Datei-, Netzwerk- oder Prozessaktion für die Schutzproben; nur künstliche Audit-Ereignisse. Web-Suite 153 bestanden, Typprüfung ohne Fehler und isolierter Produktions-Build (Webpack) mit künstlichen Einstellungen und gesperrtem HTTP bestanden. Wegen unveränderter Website kein neuer Browserlauf.

Unabhängiger Reviewer fand Groß-/Kleinschreibung bei Live-Imports unter Windows sowie fehlende direkte Fork-Ereignisse. Vier zusätzliche Regressionen zuerst rot gesehen, anschließend Importvergleich mit `casefold()` und `os.fork`/`os.forkpty` ergänzt; danach gesamte Suite grün. Anfangs unterschiedliche Klassenidentität bei `__main__`/Modulimport korrigiert; CLI verwendet nun das kanonische Modul. Tatsächliche Ausführung unter Windows geprüft; kein eigener Linux-Lauf. Keine weiteren belegten materiellen Lücken im vereinbarten Schutzumfang im Abschlussreview.

Die frühere lokale Hilfsdatei bleibt erhalten, wird aber nicht mehr als Standardweg empfohlen. Die Firmenportal-Vorläufigkeit, Ranking-Quellenauswahl und Groq-Freigabegrenzen bleiben unverändert.
