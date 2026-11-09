# jobradar

jobradar holt jeden Tag die offenen Stellen von ausgewählten Unternehmen und zeigt sie auf einer privaten Website. Dort behältst du auch deine Bewerbungen im Blick.

**Kurz erklärt:** *GitHub* ist die Seite, auf der die Dateien dieses Projekts liegen (das *Repo*). *GitHub Actions* startet dort jeden Tag das Programm. *Supabase* ist die Datenbank mit Login. *Vercel* zeigt die Website im Netz.

## Was die Website kann

- **Stellen:** Alle offenen Stellen der Firmen aus `data/companies.csv`, mit Filtern und Suche. Jede Stelle hat eine Detailseite mit Steckbrief und der ganzen Anzeige.
- **Bewerbungen:** Du legst Bewerbungen aus einer Stelle an, per Link oder von Hand, und setzt den Stand (gemerkt, beworben, Gespräch …).
- **Dokumente:** Lebenslauf und Anschreiben hochladen, jede Bewerbung merkt sich die benutzte Version.
- **Konto:** Deine Daten, deine Bewerbungen nach Stand, „Wichtige Punkte“ und Einstellungen für die Stellenliste.

## Stellenliste und Detailseite

- **Begriffe:** *Branche* ist die Art der Firma (z. B. Tech). *Funktion* ist die Rolle der Stelle (z. B. Engineering). *Online seit* filtert nach dem Tag, an dem die Stelle zum ersten Mal bei uns aufgetaucht ist. „Neu“ steht an Stellen, die höchstens 3 Tage alt sind. Die Größe ist nach Mitarbeitenden sortiert, das Level nennt die Jahre (z. B. „Junior (0–2 Jahre)“). Den Land-Filter gibt es erst nach Migration 005.
- **Merken:** Der Knopf „Merken“ legt aus einer Stelle direkt eine Bewerbung im Stand „gemerkt“ an, in der Liste und auf der Detailseite.
- **Steckbrief:** Oben auf der Detailseite stehen Erfahrung, Gehalt, Sprachen und Sicherheitsüberprüfung. Sie werden mit festen Regeln aus dem Anzeigentext gelesen, ohne KI, und können daher auch mal fehlen. Darunter folgt „Ganze Anzeige lesen“ in Abschnitten, dazu „Original-Anzeige“ und „Ich habe mich beworben“.
- **Kurzbeschreibung:** Die Zeile unter jeder Stelle in der Liste zeigt Angaben aus dem Steckbrief. Unter „Konto“ setzt du Häkchen, welche Angaben das sind (Sprachen sind standardmäßig aus).
- **Wichtige Punkte:** Unter „Konto“ trägst du bis zu 50 Begriffe ein. Sie werden in allen Anzeigen gelb markiert (ganze Wörter und Wortanfänge). *Warum:* So siehst du Dinge, die dir wichtig sind, sofort. Bei Bewerbungen bleibt die Anzeige gegliedert als Kopie erhalten, auch wenn die Stelle schließt.

## Login

Du meldest dich mit Google oder mit E-Mail und Passwort an. *Warum:* Deine Bewerbungen sind privat. Jeder Nutzer sieht nur seine eigenen Daten (das erzwingt die Datenbank selbst).

## Link einfügen

Klicke auf „Bewerbung anlegen“ und füge den Link einer Stellenanzeige ein. Die Seite erkennt Firma und Titel allein aus dem Link. Seiten wie LinkedIn oder Stepstone werden nie abgerufen (das wäre gegen deren Regeln). Wird nichts erkannt, trägst du Firma und Titel in zwei Feldern selbst ein.

Ins Feld „Anzeigentext (optional)“ kannst du den Text der Anzeige einfügen, z. B. am Handy. Er wird mit der Bewerbung gespeichert (höchstens 50.000 Zeichen). Das geht auch unter „Manuell anlegen“.

**LinkedIn:** Dort darf Jobradar die Anzeige nicht selbst abrufen. Drücke auf der LinkedIn-Anzeige Strg+A (alles markieren) und Strg+C (kopieren). Füge in Jobradar den Link ein und den kopierten Text in das Feld „Anzeigentext (optional)“. Trage Firma und Titel ein, wenn danach gefragt wird.

## Dokumente und Export

- Unter „Dokumente“ lädst du PDFs hoch. Sie liegen in Supabase Storage.
- Der Export-Knopf lädt alle deine Bewerbungen als eine CSV-Tabelle herunter, mit Kontakten und Interviews in der jeweiligen Zeile und klickbaren Links. Excel öffnet sie direkt. *Warum:* So hast du jederzeit eine eigene Kopie, ohne ein Programm zu brauchen.

## Der tägliche Lauf

Jeden Tag um 04:00 UTC (5 Uhr im Winter, 6 Uhr im Sommer) startet in GitHub Actions „Täglicher Lauf“. Er ruft die Stellen ab, schreibt sie in Supabase und legt `data/bericht.md` ab (pro Firma: gefunden, gefiltert, neu, geschlossen, Fehler). Dieser tägliche Bericht-Commit hält das Repo aktiv, sonst schaltet GitHub nach 60 Tagen den Zeitplan ab.

Von Hand starten: GitHub → Reiter „Actions“ → „Täglicher Lauf“ → „Run workflow“. Erfolg: nach ein paar Minuten steht ein grüner Haken da.

Stellen, die nicht mehr online sind, werden „geschlossen“. Gibt es dazu keine Bewerbung, wird der Text gelöscht und die Stelle ausgeblendet (es bleibt eine Mini-Notiz mit dem Erstdatum).

## Ein Unternehmen hinzufügen

Die Liste steht in `data/companies.csv` (eine Tabelle als Textdatei). Bearbeite sie nur direkt auf GitHub (Stift-Symbol), nicht in Excel: Excel macht aus dem Trennzeichen ein `;` und zerstört die Datei.

1. Öffne `data/companies.csv` auf GitHub und klicke auf das Stift-Symbol.
2. Kopiere eine Zeile, hänge sie unten an, ändere die Werte.
3. „Commit changes“. Der Eintrag gilt ab dem nächsten Lauf.

| Spalte | Bedeutung |
|---|---|
| `name` | Name des Unternehmens |
| `careers_url` | Link zur Karriereseite |
| `ats_typ` | Bewerbungssystem: `greenhouse`, `ashby`, `personio`, `recruitee` oder `sitemap`. Alles andere: `aktiv` auf `nein` setzen und Claude um einen Adapter bitten. |
| `ats_id` | Letzter Teil der Stellenseiten-Adresse, z. B. `helsing` bei `boards.greenhouse.io/helsing`. Bei `personio` der Teil vor `.jobs.personio.de` (z. B. `platoapp`), bei `recruitee` die ganze Adresse der Karriereseite ohne `https://` (z. B. `career.quantum-systems.com`), bei `sitemap` die Adresse der Sitemap, optional mit `#` und dem Pfad der Stellenseiten (z. B. `https://jobs.neura-robotics.com/sitemap.xml#/offer/`). `sitemap` ist für Firmen mit eigener Karriereseite ohne ATS: der Abruf liest die Sitemap und dann jede Stellenseite einzeln. |
| `groesse_klasse` | `<50`, `50–249`, `250–999` oder `1.000+` |
| `mitarbeitende_ca` | Ungefähre Zahl der Mitarbeitenden |
| `kategorie` | Kategorien aus `data/kategorien.md`, getrennt durch `;` |
| `hauptsitz` | Stadt |
| `aktiv` | `ja` = wird abgerufen, `nein` = übersprungen |
| `notiz` | Freitext |

## Datenbank einrichten (Migrationen 001–005)

Die Dateien in `supabase/migrations/` bauen die Tabellen und den Zugriffsschutz auf: `001_schema.sql` (Tabellen und Schutz), `002_facetten.sql` (Filterwerte), `003_bewerbung_eindeutig.sql` (keine doppelten Bewerbungen), `004_dokumente.sql` (Dokumente und Storage), `005_abschnitte_land.sql` (gegliederte Anzeige, Steckbrief, Land, Wichtige Punkte, Listen-Einstellungen, Admin-Kennzahlen). Ohne 005 fehlen diese Teile.

1. Öffne Supabase → dein Projekt → „SQL Editor“.
2. Öffne die Datei auf deinem Rechner, kopiere den ganzen Inhalt, füge ihn ein und klicke „Run“. Immer in der Reihenfolge 001, 002, 003, 004, 005.
3. Erfolg: unten steht „Success“. Die Dateien lassen sich ohne Schaden mehrfach ausführen.

## Backup und Wiederherstellung

Eine tägliche Kopie aller Daten liegt im privaten Repo `jobradar-privat` (*warum privat:* die Kopie enthält deine persönlichen Daten, dieses Repo ist öffentlich). Einrichtung und Wiederherstellung stehen in dessen `README.md`. Dokumente (PDFs) sind nicht im Backup: Behalte die Originale deiner Dokumente bei dir: Weder Export noch Backup enthalten die Dateien selbst, nur ihre Namen.

## Lokal starten

```powershell
cd web
npm install
npm run dev
```

Dann öffne http://localhost:3000. Dafür braucht `web/.env.local` die Werte `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API). *Warum:* So weiß die Seite, mit welcher Datenbank sie spricht.

Scraper und Tests:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py -m scraper.run      # braucht .env mit SUPABASE_URL und SUPABASE_SERVICE_KEY
py -m pytest
cd web; npm test
```

## Freunde einladen

Solange die Google-App im Testmodus ist, darf sich nur anmelden, wer als Testnutzer eingetragen ist.

1. Google Cloud Console → APIs & Dienste → OAuth-Zustimmungsbildschirm → Zielgruppe → Testnutzer → „Add users“ → die Gmail-Adresse des Freundes eintragen und speichern. *Warum:* Google lässt im Testmodus nur eingetragene Adressen durch. Erfolg: Die Adresse steht in der Liste.
2. Schicke dem Freund den Link zur Website. *Warum:* Er meldet sich dort selbst mit Google an. Seine Daten sind für dich unsichtbar.
3. Erfolg: Der Freund taucht auf der Admin-Seite „Nutzer“ (`/admin/nutzer`) auf. Dort kannst du ihn mit „Entfernen“ samt allen Daten löschen.

Jeder Nutzer kann sein Konto selbst unter „Konto“ löschen. Das Admin-Konto kann nicht gelöscht werden, weder dort noch auf der Admin-Seite. Was gespeichert wird, steht auf `/datenschutz`.

## Vercel einrichten

*Warum:* Vercel stellt die Website unter einer festen Adresse ins Netz.

1. Auf vercel.com anmelden, „Add New → Project“, dieses Repo importieren.
2. Bei „Root Directory“ `web` eintragen (die Website liegt im Unterordner).
3. Unter „Environment Variables“ `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` eintragen. Trage außerdem zwei Server-Variablen ein, beide **ohne** `NEXT_PUBLIC_` am Anfang:
   - `SUPABASE_SERVICE_KEY`: der Secret Key aus Supabase → Project Settings → API Keys. *Warum:* Nur damit kann die Website ein Konto samt Daten löschen. Ohne `NEXT_PUBLIC_` bleibt er auf dem Server und gelangt nie in den Browser.
   - `ADMIN_EMAIL`: deine E-Mail-Adresse (mehrere durch Komma getrennt). *Warum:* Wer hier steht, sieht die Admin-Seite „Nutzer“. Das Admin-Konto lässt sich nicht löschen.

   Dann „Deploy“. Erfolg: Vercel zeigt eine Adresse, die Seite lädt. Dieselben zwei Variablen brauchst du auch in `web/.env.local`, wenn du lokal arbeitest.
4. Supabase → Authentication → URL Configuration: die Vercel-Adresse als „Site URL“ eintragen und unter „Redirect URLs“ `https://<deine-adresse>/**` hinzufügen. *Warum:* Sonst schickt dich der Login auf die falsche Seite zurück.
5. Der Google-Login braucht normalerweise nichts Neues, denn Supabases Rückruf-Adresse bleibt gleich. Nur wenn Google meckert: in der Google Cloud Console beim OAuth-Client prüfen, ob die Supabase-Adresse als „Authorized redirect URI“ steht.

## Wenn etwas nicht klappt

- **Die Seite lädt nicht oder meldet Datenbankfehler:** Supabase Free pausiert Projekte nach 7 Tagen ohne Zugriff. Der tägliche Lauf verhindert das normalerweise. Ist es doch passiert: supabase.com → Projekt → „Restore project“.
- **Nach dem Login landest du auf der falschen Seite oder bekommst einen Fehler:** Die Adresse fehlt in Supabase → Authentication → URL Configuration (Site URL und Redirect URLs, siehe „Vercel einrichten“).
- **Der Lauf ist rot:** GitHub → Actions → den roten Lauf öffnen und die Fehlermeldung lesen. Steht bei einer Firma ein Fehler in `data/bericht.md`, ist meist deren Karriereseite umgezogen oder die `ats_id` falsch. Die anderen Firmen laufen trotzdem. Sind die Zugangsdaten abgelaufen, erneuere die Secrets `SUPABASE_URL` und `SUPABASE_SERVICE_KEY` (GitHub → Settings → Secrets and variables → Actions).
- **Der Lauf startet nicht mehr von selbst:** Nach 60 Tagen ohne Aktivität schaltet GitHub Zeitpläne ab. Actions → „Täglicher Lauf“ → „Enable workflow“.

Die Projektregeln stehen in [CLAUDE.md](CLAUDE.md).
