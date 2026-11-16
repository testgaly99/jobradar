# Paket 2: vorhandene Dokumentangaben zentral prüfen

Stand: 2026-11-16, lokal umgesetzt und geprüft. Nutzerauftrag „Nun Nummer 2“ aus `docs/arbeitspakete-codex.md` freigegeben; ausschließlich dieses Paket umsetzen.

## Umfang

Bestehende Eingabeprüfung aus `web/app/dokumente/actions.ts:dokumentAnlegen` als reine Funktion nach `web/lib/dokumente.ts` ziehen und unmittelbar dort einsetzen. Dokumentarten cv/anschreiben/anlage, getrimmter Versionsname mit 1–120 Zeichen und nutzereigener Speicherpfad (Präfix uid/; keine zwei aufeinanderfolgenden Punkte) sowie Fehlerreihenfolge und Meldungen bleiben erhalten. Falsch typisierte Argumente kontrolliert abweisen, statt Stringmethoden auf ungeprüften Eingaben aufzurufen.

Die vorhandene UTC-Kalenderprüfung `datumOk` aus `web/lib/bewerbung.ts` exportieren und wiederverwenden; Dokument-Versionsdatum muss exakt YYYY-MM-DD und ein nach dieser bestehenden Prüfung gültiger Kalendertag sein. Keine neue Alters-/Zukunftsgrenze. Bestehendes Trackerverhalten unverändert, weitergehende Datums-/Sommerzeitänderungen aus Paket 7 bleiben offen.

Die Speicheraktion prüft weiter zuerst die Anmeldung und schreibt ausschließlich geprüfte Daten; Datenbankrechte bleiben zusätzlich notwendig. Keine Datei lesen oder hochladen, keine Dateityp-/MIME-Regeln, CV-Felder, neue Bibliothek, Kontokonfiguration, Migration oder Live-Abfrage. Löschen und Download unverändert.

## Umsetzung und Prüfung

- [x] Verhaltenstests zuerst: vorhandene Arten, Namensgrenzen/Trimmen, Eigentümerpräfix/Punkte, echte Tage einschließlich Schaltjahre, falsche Typen und Fehlermeldungen.
- [x] Reinen Prüfer implementieren, bestehende Kalenderprüfung wiederverwenden und Speicheraktion anschließen.
- [x] Websuite, Typprüfung, isolierter Build sowie lokale Browser-/Speicheraktionsprobe mit ausschließlich künstlichen Antworten; keine Dateiübertragung. Abschlussreview des Diffs.
- [x] Katalog, STATUS, Entscheidungen und Agentenprotokoll aktualisieren, lokal committen. Andere Pakete bleiben offen.

## Ergebnis und Nachweise

Sieben neue Tests zunächst wegen fehlenden Moduls rot; nach Übernahme der bisherigen Datumsformprüfung konkreter Fehler: 2026-02-29 wird angenommen (sechs Tests grün, einer rot). Gemeinsame Kalenderprüfung angeschlossen, zusätzlich exakte Länge gegen nachgestellten Zeilenumbruch geprüft: alle sieben Tests grün. Ganze Websuite `npm.cmd test`: **176 bestanden**. Typprüfung in `web/` mit `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`: Exit 0. Keine Python-Anwendung geändert, daher keine erneute Python-Suite.

Isolierter Produktions-Build `next build --webpack` bestanden: frische ausgewählte Quellen ohne Umgebungsdateien, bereinigte Prozessumgebung, künstliche Einstellungen, HTTP gesperrt. Lokale Hilfen unter `.superpowers/sdd/2026-11-16-dokument-metadaten/`, nicht versioniert.

Chrome-Probe am isolierten Build auf `localhost:3002`: jeweils neun Speicheraktionsfälle bei 1280 und 390 Pixel (drei Arten, zwei unmögliche Kalendertage, fremder Pfad, leerer Name, ungültige Art und null statt Name); zusätzlich Speicherfehler und Gastumleitung, insgesamt **20 Fälle bestanden**. Echte gebaute Serveraktion über ihre Aktionskennung aufgerufen, Datenbankantworten vollständig ersetzt. Künstliche Schreibversuche protokolliert: gültige Angaben mit getrimmtem Namen, bei ungültigen Angaben keine Schreibanfrage. UI-Felder/Arten/Grenzen ebenfalls geprüft. Keine Datei gelesen oder übertragen; Speicherendpunkte und externe Browseranfragen gesperrt. Keine Browserfehler in den beiden Ansichtsgrößen. Testserver anschließend beendet, geschlossenen Port kontrolliert.

Eigener Abschlussreview ohne materielle Befunde: Anmeldung bleibt vor Eingabeprüfung, nur geprüfte Daten erreichen insert, bisherige Fehlermeldungen und Reihenfolge erhalten, Löschen/Download unverändert. Keine neue Datumsimplementierung und kein Eingriff in die Sommerzeitlogik. Claudes unabhängiger Review anhand des Agentenprotokolls bleibt separat; kein Helfer eingesetzt, weil die aktuelle Sitzungsregel unaufgeforderte Delegation ausschließt. Browserprobe wie bei Paket 1 direkt mit dem vorhandenen Python-3.12-Interpreter, da der py-Launcher die Installation in dieser Umgebung nicht erkennt. Keine Installation, Live-Abfrage oder Veröffentlichung.

Prüfgrenze: Eingabeformen und Anschluss an die vorhandene Aktion; kein Beleg für tatsächliche Datenbankrechte, Speicherobjekte oder Inhalte echter Dokumente. Bestehende Groq-/Ranking-/Veröffentlichungsgrenzen gelten weiter.
