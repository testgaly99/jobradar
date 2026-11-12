# Meine Bewerbungen: Board und Liste mit Detailspalte (Design)

Stand 2026-11-12. Vom Nutzer freigegeben (Variante B des Klick-Entwurfs, vier Festlegungen bestätigt).

## Warum
Die Angaben einer Bewerbung (nächster Schritt, Gehalt, Personen, Interviews …) stehen nur im Seitenfenster. Um mehrere Bewerbungen zu vergleichen, muss der Nutzer jede einzeln öffnen und wieder schließen: zu viele Klicks. Ziel ist eine Seite, auf der man sich durch alle Bewerbungen klickt und die wichtigsten Angaben sofort sieht. Sie soll modern wirken und nicht überladen sein.

## Ziele
- Reiter unter „Bewerbungen“: **Meine Bewerbungen** · **+ Bewerbung hinzufügen** · **Auswertung**. „Diese Woche“ bleibt über den Reitern.
- **Meine Bewerbungen** (`/bewerbungen`): oben das Kanban-Board wie heute (unverändert, Animationen bleiben), darunter Filter/Sortierung/Archiv-Schalter, darunter **Liste links, Detailspalte rechts** (Master-Detail).
- **+ Bewerbung hinzufügen** (`/bewerbungen/neu`): nur das heutige Formular „Bewerbung anlegen“ (Link, Firma, Titel), offen.
- Listenzeile: Firmenlogo (Baustein `app/firmenlogo.tsx`), Firma, Titel (gekürzt), Status-Pill. Die gewählte Zeile ist markiert.
- Detailspalte zeigt **nur an**: Kopf mit Logo, Firma, Titel; Fortschrittsleiste Gemerkt → Beworben → Im Gespräch → Angebot (Archiv: Ergebnis statt Leiste) mit Bewerbungsdatum; Kacheln Nächster Schritt (mit Fälligkeit), Gehalt, Ort/Arbeitsmodell, Interesse (Sterne), Personen (Name, Rolle), Interviews (Datum, Format); Kommentar; Links **Bearbeiten** (öffnet das bestehende Seitenfenster) und **Zur Anzeige** (wenn eine Stelle/URL verknüpft ist).

## Festlegungen (vom Nutzer bestätigt)
1. Detailspalte nur zum Ansehen; bearbeitet wird im Seitenfenster.
2. Ohne Auswahl ist die Bewerbung mit dem frühesten fälligen nächsten Schritt gewählt (sonst die oberste der Liste); nie eine leere Spalte.
3. Die Auswahl steht in der Adresse (`?id=<uuid>`, mit den übrigen Filtern); Zurück und Neuladen behalten sie.
4. Unter ca. 52rem Breite gibt es keine zweite Spalte: Die Details klappen direkt unter der angetippten Zeile auf (Variante A).

## Nicht-Ziele
- Kein Bearbeiten in der Detailspalte, keine neuen Datenbankfelder, keine Migration.
- Board, Drag-and-drop, Archiv-Dialog und Seitenfenster bleiben unverändert (CLAUDE.md: Kanban-Animationen nicht verändern).
- Auswertung bleibt wie sie ist.

## Anti-Ziele
- Überladen: keine weiteren Kacheln als die oben genannten; leere Angaben zeigen „noch keine“ bzw. „–“ klein, statt Platz zu füllen.
- Seite springt beim Klicken: Die Wahl einer Zeile darf Board und Liste nicht verschieben (Detailspalte haftet oben, `position: sticky`).

## Ansätze
- **A, Zeile klappt auf:** einfach, aber schiebt alles darunter; schlecht zum Vergleichen. Nur für schmale Bildschirme.
- **B, Liste mit Detailspalte (gewählt):** man klickt sich durch, ohne dass sich etwas verschiebt; vom Nutzer gewählt („sieht sehr gut aus“).
- **C, Aufklappen mit Reitern:** kompakt, aber pro Bewerbung zusätzliche Klicks auf Reiter; widerspricht dem Ziel „weniger Klicks“.

## Zuschnitt (Entscheidungen des Bauenden, hier festgehalten)
- Board und Liste auf einer Seite: `/bewerbungen` lädt Karten wie heute die Kanban-Seite (`ladeKarten`) und die Liste wie heute die Tabelle; `/bewerbungen/kanban` leitet auf `/bewerbungen` um (Suchparameter bleiben), damit alte Links funktionieren.
- Die heutige Tabelle (Spalten, Sortierung per Spaltenkopf) wird durch die Liste ersetzt; Sortierung wandert in ein „Sortieren nach“-Feld wie auf `/stellen`.
- Personen und Interviews werden nur für die gewählte Bewerbung geladen (eine Abfrage je Tabelle), nicht für alle.
- Wahl einer Zeile ist ein Link (`?id=`), funktioniert also auch ohne JavaScript und mit Tastatur; der Seitenwechsel scrollt nicht nach oben (`scroll={false}`).
- Farben, Pills, Logo und Abstände aus den bestehenden Tokens (`stil/utilitaer.css`, `globals.css`); Dunkelmodus muss die Kontrastprüfung bestehen.

## Prüfen
- Unit-Test für die Vorauswahl (frühester fälliger Schritt, Gleichstand, keiner fällig, leere Liste).
- Klicktest: Zeile wählen → Detailspalte zeigt die richtige Firma, Adresse enthält `?id=`, Zurück stellt die vorige Wahl her; „Bearbeiten“ öffnet das Seitenfenster; Handybreite 390 px klappt unter der Zeile auf, kein waagerechtes Scrollen; Kanban-Klicktest bleibt 25/25; Kontrastprüfung hell/dunkel.
