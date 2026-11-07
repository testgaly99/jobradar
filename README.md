# jobradar

jobradar holt jeden Tag die offenen Stellen von ausgewählten Unternehmen und zeigt sie auf einer Website, die du auf Handy und Laptop öffnen kannst.

- Website (wenn eingerichtet): https://testgaly99.github.io/jobradar/
- Code und Daten: https://github.com/testgaly99/jobradar

**Kurz erklärt:** *GitHub* ist die Webseite, auf der alle Dateien dieses Projekts liegen. Das Projekt dort heißt *Repo*. *GitHub Actions* ist der Dienst dort, der jeden Tag automatisch das Programm startet. *GitHub Pages* macht aus den Dateien die Website.

## Wie es funktioniert

1. Jeden Tag um 04:00 UTC (5 Uhr im Winter, 6 Uhr im Sommer) startet der Lauf „Täglicher Lauf“. GitHub kann sich um bis zu etwa 1 Stunde verspäten.
2. Das Programm ruft für jedes Unternehmen in `data/companies.csv` die Stellen ab.
3. Es behält nur Stellen in Deutschland und Remote-Stellen. Ausbildung, Duales Studium, Praktikum, Werkstudent, Abschlussarbeit, Minijob/Aushilfe sowie Filial- und Verkaufsjobs werden aussortiert (Details: CLAUDE.md, Abschnitt 4). Wie viele aussortiert wurden, steht im Bericht.
4. Die Stellen landen in `data/jobs.json`. Stellen, die nicht mehr online sind, werden als „geschlossen“ markiert und nicht gelöscht.
5. Die Website wird neu veröffentlicht.

## Ein Unternehmen hinzufügen

Die Liste steht in `data/companies.csv` (*CSV* ist eine einfache Tabelle als Textdatei; jede Zeile ist ein Unternehmen).

1. Öffne https://github.com/testgaly99/jobradar und klicke auf den Ordner `data`, dann auf `companies.csv`.
2. Klicke oben rechts auf das Stift-Symbol (Bearbeiten).
3. Kopiere eine bestehende Zeile, hänge sie unten an und ändere die Werte.
4. Klicke auf „Commit changes“ (speichern) und bestätige mit „Commit changes“.
5. Der Eintrag gilt ab dem nächsten Lauf. Du kannst den Lauf auch sofort starten (siehe unten).

Alternativ kannst du die Datei in Excel bearbeiten. Speichere sie dann als „CSV UTF-8“, sonst gehen Umlaute kaputt, und lade sie auf GitHub wieder hoch.

Die Spalten:

| Spalte | Bedeutung |
|---|---|
| `name` | Name des Unternehmens |
| `careers_url` | Link zur Karriereseite |
| `ats_typ` | Das Bewerbungssystem der Firma (*ATS*). Aktuell möglich: `greenhouse` oder `ashby`. Alles andere: setze `aktiv` auf `nein` und bitte Claude, einen Adapter zu bauen (ein kleines Programmstück für dieses System). |
| `ats_id` | Der letzte Teil der Stellenseiten-Adresse, z. B. `helsing` bei `boards.greenhouse.io/helsing` oder `the-exploration-company` bei `jobs.ashbyhq.com/the-exploration-company`. Du findest ihn, indem du auf der Karriereseite eine Stelle öffnest und in die Adresszeile schaust. |
| `groesse_klasse` | Eine von `<50`, `50–249`, `250–999`, `1.000+` (Größe der ganzen Unternehmensgruppe) |
| `mitarbeitende_ca` | Ungefähre Zahl der Mitarbeitenden |
| `kategorie` | Eine oder mehrere Kategorien aus `data/kategorien.md`, getrennt durch `;` |
| `hauptsitz` | Stadt des Hauptsitzes |
| `aktiv` | `ja` = wird abgerufen, `nein` = wird übersprungen |
| `notiz` | Freitext für dich |

## Einen Lauf manuell starten

1. Öffne https://github.com/testgaly99/jobradar und klicke oben auf „Actions“.
2. Klicke links auf „Täglicher Lauf“.
3. Klicke rechts auf „Run workflow“ und dann im Fenster auf den grünen Knopf „Run workflow“.
4. Warte ein paar Minuten, bis vorne ein grüner Haken steht. Danach ist die Website aktuell.

## Wenn etwas kaputt ist

**Bericht lesen:** Öffne auf GitHub `data/bericht.md`. Es zeigt pro Unternehmen eine Zeile mit: gefunden, gefiltert, neu, geschlossen, Fehler. Steht bei einem Unternehmen ein Fehler, ist meist dessen Karriereseite umgezogen oder die `ats_id` ist falsch. Die anderen Unternehmen laufen trotzdem weiter.

**Roter Warnhinweis auf der Website** („letzter Lauf mehr als 2 Tage her“): Wahrscheinlich hat GitHub den Zeitplan abgeschaltet, weil 60 Tage lang nichts im Repo passiert ist (das gilt für öffentliche Repos). So schaltest du ihn wieder ein:

1. Öffne den Reiter „Actions“.
2. Klicke links auf „Täglicher Lauf“.
3. Klicke auf „Enable workflow“.
4. Starte einmal von Hand (siehe oben).

Hilft das nicht, schau im Reiter „Actions“ in den letzten Lauf (rotes Kreuz) und gib Claude die Fehlermeldung.

## Backup

Alle Daten liegen zusammen mit ihrer ganzen Geschichte im Repo, jede Änderung ist gespeichert. Als zusätzliche Sicherung: Auf der Startseite des Repos „Code“ → „Download ZIP“ klicken und die Datei an einem sicheren Ort ablegen, zum Beispiel einmal im Monat.

## Wiederherstellen

**Alten Stand von `data/jobs.json` zurückholen:**

1. Öffne auf GitHub `data/jobs.json` und klicke oben rechts auf „History“.
2. Wähle den Eintrag mit dem gewünschten Datum und klicke auf die Dateiversion (`<>`-Symbol).
3. Kopiere den Inhalt (Knopf „Raw“, dann alles markieren und kopieren).
4. Gehe zurück zur aktuellen `data/jobs.json`, klicke auf das Stift-Symbol, ersetze den ganzen Inhalt durch das Kopierte und speichere mit „Commit changes“.

Oder sag Claude: „Stelle `data/jobs.json` vom <Datum> wieder her.“

**Aus der ZIP-Datei:** Entpacke die ZIP, kopiere die gewünschten Dateien in deinen lokalen Projektordner und lade sie hoch (Claude kann dir dabei helfen).

## Für Fortgeschrittene (lokal auf Windows)

Einrichten:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Lauf starten: `py -m scraper.run`

Tests: `py -m pytest` und `node --test tests/test_app.js`

Die Projektregeln stehen in [CLAUDE.md](CLAUDE.md).
