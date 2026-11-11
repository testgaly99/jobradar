# Tracker-Paket: flüssiges Board nach dem Vorbild Huntr (Design)

Stand: 2026-11-09. Geklärt im Gespräch (Fragen Q29–Q47). Gebaut wird nach Phase 2b, auf dem Stand von Branch `phase-2`.

## Absicht

Der Nutzer hat sich Huntr (huntr.co) angesehen und findet es „richtig professionell“. Jobradar soll keine Kopie werden, sondern eine bessere Version mit weniger KI.

„Professionell“ heißt für ihn vor allem **flüssig** (Q44):
- Karten zieht man mit der Maus hin und her.
- Farben gehen weich ineinander über.
- Bereiche klappen auf, statt dass die Seite neu lädt.

Heute lädt jede Statusänderung die ganze Seite neu (Auswahlliste plus Knopf „Ändern“), und die Karten sind reiner Text.

Jobradars eigene Stärke bleibt: Die Stellen kommen selbst von den Karriereseiten. Huntr lässt sie den Nutzer selbst speichern.

## Ziele

1. **Kanban mit Ziehen und Ablegen (Q29).** Eine Karte in eine andere Spalte ziehen setzt den Status, ohne Neuladen. Das geht auch per Tastatur und am Handy per Finger.
2. **Spalten (Q31, Q45, Q46):**
   - Gemerkt, Beworben, Eingang bestätigt, Im Gespräch, Angebot.
   - **Gesprächsrunden** sind ein Abzeichen auf der Karte in „Im Gespräch“: „R1“ bis „R4“. Der Knopf „+ Runde“ erhöht die Runde (höchstens 4). Ein Klick auf das Abzeichen bietet „Runde zurück“ an.
   - Kommt eine Karte zum ersten Mal nach „Im Gespräch“, ist sie in Runde 1.
3. **Archiv (Q32):** Status „Abgeschlossen“ ist keine sichtbare Spalte mehr.
   - Am Board-Ende gibt es eine Ablagefläche „Archiv“. Wird eine Karte darauf gezogen, fragt ein kleines Menü nach dem Ergebnis: **Zusage, Absage, Abgebrochen, Angebot abgelehnt**.
   - „Abgebrochen“ heißt: Der Nutzer selbst hat aufgehört (Q46). Es ist der bisherige Wert `zurueckgezogen`, nur umbenannt.
   - Ein Schalter „Archiv anzeigen“ blendet die archivierten Karten als eigene Spalte ein.
   - In der Tabelle gilt derselbe Schalter.
4. **Gleicher Stand überall (Q31).** Tabelle, Board, Seitenfenster und „Gemerkt ✓/Beworben ✓“ in der Stellenliste lesen dieselben Daten.
   - Nach einer Änderung zeigt jede Ansicht beim nächsten Anzeigen den neuen Stand, ohne „Neu laden“.
   - Filter der Tabelle (z. B. Firma, Status) gelten auch im Board. Sie stehen in der Adresse und wandern beim Wechsel zwischen „Tabelle“ und „Kanban“ mit.
5. **Seitenfenster (Q30, zur Probe).** Ein Klick auf eine Karte oder Tabellenzeile öffnet die Bewerbung rechts über der Ansicht. Die Ansicht bleibt dahinter sichtbar.
   - Ein direkter Link bzw. Neu laden zeigt die Bewerbung als ganze Seite wie heute.
   - „Zurück“ im Browser und die Esc-Taste schließen das Fenster.
   - **Nachfrage beim Nutzer nach dem Test, ob es ihm gefällt.**
6. **Karteninhalt (Q35):**
   - Firma (mit Logo, siehe 7), Titel.
   - **Gehalt:** das erste vorhandene von `angebot_fix`, `gehalt_wunsch`, `gehalt_spanne_anzeige`, Gehalt aus dem Steckbrief der verknüpften Stelle.
   - **Tage seit dem letzten Schritt:** heute minus Datum des letzten Eintrags im Verlauf (`application_events`), sonst `erstellt_am`.
   - **Nächster Termin:** der früheste noch nicht vergangene Wert aus Interview-`datum`, `aufgabe_frist` und `naechster_schritt_faellig`.
   - **Interesse** als 1–5 Sterne.
   - **Kommentar:** neues kurzes Feld, höchstens 140 Zeichen, direkt auf der Karte änderbar (Klick, tippen, Enter oder Fokus weg speichert). Die langen Notizen bleiben in der Bewerbung.
   - Fehlt ein Wert, entfällt die Zeile still.
7. **Logos (Q34, Variante a, zur Probe):**
   - Für Firmen aus `companies` merkt sich der tägliche Lauf ein Symbol von der **eigenen Website der Firma** (`apple-touch-icon`, sonst `icon` aus dem HTML der Karriereseite) als URL.
   - Für alle anderen gibt es einen Kreis mit dem Anfangsbuchstaben in der Firmenfarbe (`firmenFarbe`, gibt es schon).
   - Kein fremder Logo-Dienst.
   - **Nachfrage beim Nutzer, ob Logos nötig sind.**
8. **„Diese Woche“ (Q36, Q47 = ein nächster Schritt pro Bewerbung):**
   - Ein aufklappbarer Kasten oben auf „Bewerbungen“, über Tabelle und Board.
   - Er listet alles mit Datum von heute bis heute + 7 Tage, dazu alles Überfällige (rot):
     - Interview-Termine mit Uhrzeit
     - Aufgaben-Fristen
     - nächste Schritte
   - Nach Datum sortiert, je Zeile Firma und Text. Ein Klick öffnet die Bewerbung im Seitenfenster.
   - Bei einem nächsten Schritt gibt es ein Häkchen „erledigt“. Es leert `naechster_schritt` und `naechster_schritt_faellig`, schreibt „Erledigt: <Text>“ als Notiz in den Verlauf und bietet sofort ein Feld für den nächsten Schritt an.
   - Erinnerungen per Telegram oder Kalender kommen später (Phase 3).
9. **Auswertung (Q39):** ein neuer Reiter „Auswertung“ neben „Tabelle“ und „Kanban“, nur eigene Daten.
   - **Gesprächsquote:** Anteil der Bewerbungen mit `beworben_am`, die je „Im Gespräch“ oder später erreicht haben (laut Verlauf oder aktuellem Status).
   - **Angebotsquote:** dasselbe für „Angebot“ bzw. Ergebnis „Zusage“/„Angebot abgelehnt“.
   - **Bewerbungen pro Woche:** nach `beworben_am`, letzte 12 Wochen, leere Wochen als 0.
   - **Antwortzeit:** Median der Tage von `beworben_am` bis zum ersten späteren Verlaufseintrag mit Status „Eingang bestätigt“, „Im Gespräch“ oder „Abgeschlossen“.
   - Unter 5 Bewerbungen steht statt Prozenten „Noch zu wenig Daten“.
10. **Flüssige Übergänge (Q44):** weiche Übergänge bei Hover, Fokus, Aufklappen, Seitenfenster und Kartenbewegung. Mit `prefers-reduced-motion: reduce` ohne Bewegung.

## Ergänzungen aus dem Klicktest vom 2026-11-10 (Nutzerwünsche)

11. **Filter ohne Knopf, ohne Neuladen.** In der Stellenliste und in den Bewerbungen wirkt jeder Klick auf einen Filter sofort. Der Knopf „Filtern“ entfällt. Mehrere Filter lassen sich nacheinander setzen, ohne dass die Seite sichtbar neu lädt (Client-Navigation mit `useTransition`, die Liste bleibt stehen und zeigt nur einen dezenten Ladezustand). Die Filter bleiben in der Adresse, damit Links und „Zurück“ funktionieren.
12. **Suche mit Knopf.** Das Suchfeld bekommt einen Knopf „Suchen“ (und Enter). Live-Suche beim Tippen nur, wenn sie ohne spürbaren Mehraufwand geht (Entprellung 300 ms); sonst bleibt der Knopf.
13. **Sortieren in der Stellenliste.** Auswahl „Sortieren nach“: Online seit (neueste zuerst, Standard), Firma A–Z, Titel A–Z, Größe. Die Wahl steht in der Adresse.
14. **Kanban nutzt die ganze Breite** unter der Navigation (keine schmale Spaltenbox); Spalten teilen sich den Platz, unter 900 px Breite horizontales Scrollen.
15. **Statuswechsel ohne „Ändern“.** Neben dem Ziehen wirkt auch eine Auswahl auf der Karte sofort (Fallback für Tastatur und Touch).
16. **Begriffe im Board:** Die Spalte „Abgeschlossen“ gibt es nicht mehr (siehe Ziel 3, Archiv). Beim Archivieren wird das Ergebnis gewählt: **Zusage, Absage, Abgebrochen, Angebot abgelehnt**. „Abgebrochen“ ersetzt überall die Anzeige „Zurückgezogen“.
17. **Kästen einklappbar** in der Bewerbung (kommt schon mit 2b, Task 10).


Diese Funktionen hat der Nutzer abgelehnt oder vertagt:
- mehrere Boards (Q33)
- Nachfass-Hinweis (Q37)
- zentrale Kontaktliste (Q38)
- Kartenansicht (Q40)
- Lebenslauf-Werkzeuge (Q41)
- Teilen des Boards (Q43)
- Formulare automatisch ausfüllen (Q42, später erneut fragen)
- Vorlagen und Textbausteine (späteres Paket)
- Erinnerungen per Telegram oder Kalender (Phase 3)
- eigene Spalten (Q31: feste Spalten)
- jede KI in diesem Paket

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Eine Statusänderung lädt die Seite neu oder flackert.
- Zwei Ansichten zeigen unterschiedliche Stände.
- Ein versehentliches Ziehen lässt sich nicht einfach rückgängig machen.
  - Nach jedem Ziehen erscheint deshalb für einige Sekunden eine Meldung mit **„Rückgängig“**.
  - Ziehen ins Archiv ist erst nach der Ergebnis-Auswahl wirksam. „Abbrechen“ lässt die Karte, wo sie war.
- Ziehen geht nur mit der Maus. Tastatur und Touch müssen auch gehen.
- Ein Speicherfehler bleibt unbemerkt. Die Karte springt dann mit Meldung zurück.

## Rahmen

- Next.js 16 App Router, React 19, TypeScript, schlichtes CSS. Das Aussehen steckt nur in `web/app/stil/utilitaer.css` (Tokens), `globals.css` hat den Aufbau. Design-Regeln aus dem Skill Hallmark: Kontrast AA, sichtbarer Fokus, Bedienbarkeit per Tastatur.
- Server-Actions:
  - Sitzung zuerst prüfen.
  - `redirect()` außerhalb von try/catch.
  - Nur der Nutzer-Client (RLS), nie der Service-Key.
  - Statuswechsel nur über eine Action, die auch den Verlauf schreibt (Trigger `log_status_wechsel` gibt es).
- Schreibbedingungen wie in Phase 2b: Die Bedingung gehört in den Schreibbefehl selbst (kein Prüfen-dann-Schreiben).
- Keine persönlichen Daten an Dritte.
- Neue Datenbank-Felder nur per neuer, mehrfach ausführbarer Migration `006_…`. Die Website muss weiterlaufen, solange 006 noch nicht ausgeführt ist (wie bei 005): Ohne die Felder gibt es keine Runde, keinen Kommentar und keine Logos.
- Tests mit `node --test` für die reine Logik:
  - Kartenfelder, „Diese Woche“-Auswahl, Kennzahlen, Rundenregeln.
  - Python-Tests für das Logo-Auslesen im Scraper.

## Ansätze (gewählt im Gespräch; der Nutzer hat das Technische Claude überlassen)

| Baustein | Gewählt | Verworfen, weil |
|---|---|---|
| Ziehen und Ablegen | Bibliothek **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`): weich, Touch, Tastatur, Bildschirmleser-Ansagen | Browser-eigenes Ziehen: ruckelig, kein Touch, keine Tastatur |
| Ohne Neuladen | Sofortige Anzeige im Browser (React `useOptimistic`), Server-Action speichert, danach `revalidatePath` für `/bewerbungen`, `/bewerbungen/kanban`, `/stellen` | Live-Verbindung (Supabase Realtime): für eine Person zu viel Aufwand |
| Seitenfenster | Next.js „abfangende Routen“ (intercepting + parallel routes) für `/bewerbungen/[id]` | Fenster ohne eigene Adresse: Zurück-Knopf und Teilen gehen nicht |
| Übergänge | CSS-Übergänge über Tokens | eine Animations-Bibliothek: unnötig |
| Logos | Symbol von der eigenen Firmenseite, sonst Anfangsbuchstabe | Logo-Dienst: erfährt, welche Firmen der Nutzer ansieht |
| Kennzahlen | beim Aufruf aus Bewerbungen und Verlauf berechnen | vorberechnete Tabelle: bei wenigen hundert Zeilen unnötig |

## Datenbank (Migration 006)

- `applications.runde smallint check (runde between 1 and 4)`, leer, bis die Bewerbung zum ersten Mal „Im Gespräch“ erreicht (Regeln siehe unten).
- `applications.kommentar text check (char_length(kommentar) <= 140)`.
- `companies.logo_url text`.
- Keine Änderung an `ergebnis`: Der Wert `zurueckgezogen` bleibt, nur die Anzeige heißt „Abgebrochen“.

## Regeln im Detail (Claudes Entscheidungen nach der Bauenden-Prüfung)

1. **Ziehen nach „Beworben“ oder später** setzt `beworben_am = heute`, aber nur wenn es leer ist (wie der Knopf „Ich habe mich beworben“ aus 2b).
   - Für die Auswertung gilt als Bewerbungsdatum: `beworben_am`, sonst das Datum des ersten Verlaufseintrags mit Status „Beworben“ oder später, sonst `erstellt_am`, falls der Status heute „Beworben“ oder später ist.
2. **Rückgängig** stellt Status, `runde`, `ergebnis` und `beworben_am` auf den Stand vor dem Zug zurück und **löscht die Verlaufseinträge dieses Zugs**.
   - Ein zurückgenommener Fehlzug zählt also nirgends, weder in den Quoten noch bei „Tage seit dem letzten Schritt“ oder der Antwortzeit.
   - Die Zug-Action gibt die IDs der neuen Verlaufseinträge zurück. Die Rückgängig-Action löscht nur diese, nur eigene, und nur wenn sie jünger als 10 Minuten sind.
   - Fehlt dafür eine RLS-Regel zum Löschen eigener Verlaufseinträge, kommt sie in 006.
3. **Archiv in der Datenbank** = `status = 'abgeschlossen'` plus `ergebnis`, geschrieben in **einem** Update.
   - Alte Zeilen mit `abgeschlossen` und leerem `ergebnis` erscheinen im Archiv als „ohne Ergebnis“ und zählen in der Auswertung als abgeschlossen ohne Angebot.
   - Eine Karte darf aus dem eingeblendeten Archiv in eine normale Spalte gezogen werden. Dann wird `ergebnis` geleert. `absagegrund`, `rueckzug_grund` und `feedback` bleiben stehen.
   - Das Ergebnis-Feld im Formular der Bewerbung bleibt wie es ist.
4. **Zugregeln:** Jeder Zug zwischen Spalten ist erlaubt, auch zurück und über Spalten hinweg.
   - `runde` wird beim ersten Erreichen von „Im Gespräch“ auf 1 gesetzt, falls leer, und danach nie automatisch geleert. Verlässt die Karte die Spalte und kommt zurück, behält sie ihre Runde.
   - Das Abzeichen erscheint nur in „Im Gespräch“.
5. **„Diese Woche“:**
   - Archivierte Bewerbungen zählen nicht.
   - Interview-Termine und Aufgaben-Fristen erscheinen nur von heute bis heute + 7 Tage. Sie haben kein „erledigt“ und werden deshalb nie als überfällig gezeigt.
   - Überfällig (rot) können nur nächste Schritte sein.
   - Tagesgrenzen gelten in Ortszeit Europe/Berlin (Hilfsfunktionen in `web/lib/filter.ts`).
6. **Gehalt auf der Karte:** Leere oder nur aus Leerzeichen bestehende Texte gelten als fehlend.
   - Die Steckbrief-Spanne wird zu „70.000–85.000 € / Jahr“: Tausenderpunkte, Währungszeichen €/CHF, „/ Jahr“ oder „/ Monat“ je nach `zeitraum`. Ein einzelner Wert erscheint ohne Strich.
7. **Ausgangsstand:** Gebaut wird auf Branch `phase-2` mit allen 2b-Änderungen (Migrationen bis 005 sind in der Live-Datenbank ausgeführt).

## Dem Bauenden überlassen

- genaue Dauer und Kurven der Übergänge (im Rahmen der Tokens)
- wie dnd-kit konkret eingebunden wird
- Aussehen von Abzeichen, Sternen und Archiv-Fläche (Hallmark-Regeln, Variante „utilitär“)
- Reihenfolge der Karten innerhalb einer Spalte: zuletzt geändert oben, wie heute; kein Umsortieren per Ziehen innerhalb einer Spalte
- Aufteilung in Aufgaben im Plan

## Nachfragen beim Nutzer nach dem Bau

- Gefällt das Seitenfenster (Q30)?
- Sind die Logos nötig (Q34)?
