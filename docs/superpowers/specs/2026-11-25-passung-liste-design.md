# Design: Passung in der Stellenliste, Sortierung, Merk-Kategorien, „Anzeige offline“ (To-do 49)

Stand 2026-11-25. Entscheidungen Q313–Q322 (Wortlaut in `docs/fragen-und-antworten.md`). Vorläufer: Q278 (Liste ohne Seitenwechsel), Q279/Q280 (sofortige Farben beim Merken, zwei Merk-Kategorien), Phase 6a (`docs/plans/2026-11-16-cv-abgleich.md`).

## Warum

Der Nutzer will im Alltag schnell sehen, welche Stelle zu ihm passt, ohne zwei Klicks und Seitenwechsel (Q278: „Das wird im Alltag zu lange dauern, um rauszufinden, welche Stelle etwas für mich sein könnte“). Er will neu Gemerktes sofort erkennen (Q280) und sich nicht auf Anzeigen bewerben, die offline sind. Er will außerdem Stellen entlang der Ranglisten durchgehen (Q319).

## Ziele

1. **Anzeige in der Liste aufklappen.** Jede Stelle der Stellenliste lässt sich ohne Seitenwechsel aufklappen. Aufgeklappt erscheint die gegliederte Anzeige. Die Anforderungen darin sind **im Text farbig**, genau wie heute auf der Detailseite (`web/app/cv-abgleich.tsx`, Q3): grün = belegt, gelb = teilweise/ähnlich/nicht prüfbar, rot = nachweislich nicht erfüllt.
2. **Farben für alle Stellen (Q313, Q318).**
   - **Genau:** gemerkte Stellen und Stichwort-Treffer, wie heute über Claude, morgens 08:00, höchstens 50 je Tag und Konto.
   - **Geschätzt:** alle übrigen offenen, sichtbaren Stellen nachts über den kostenlosen Bedeutungsvergleich (Stufe 1, e5-small, `scraper/cv_abgleich.py` `_stufe1`). Nur grün/gelb, nie rot, blasser dargestellt. Dazu ein dezentes Wort „geschätzt“ beim Anforderungsabschnitt, keine eigene Zeile.
   - Ein genaues Ergebnis ersetzt das geschätzte.
   - Folge: Jede Stelle hat schon beim Merken Farben. Das erfüllt den Wunsch nach „sofortigen vorläufigen Farben“ (Q279) für Stellen aus der Liste.
3. **Sortierung sichtbar über der Liste** (Handy und Laptop, nicht im Filterkasten). Auswahl:
   - **Passung**: Standard, sobald das Konto einen CV mit gültiger Einwilligung hat, sonst „Neueste“.
   - Neueste, Firma A–Z, Titel A–Z, Größe (wie heute).
   - **Nach Rangliste** (ersetzt die heutige Option „Rang in der Liste“).
   - Die Seite merkt sich die letzte Wahl samt Kategorie je Konto.
4. **Regel „Passung“ (Q319).**
   - Oben stehen Stellen ohne Rot, darunter die mit wenig Gelb.
   - Rot bei Muss-Anforderungen zieht stärker nach unten als Rot bei „wünschenswert“. Ungekennzeichnete Anforderungen zählen als Muss (Q26).
   - Genau geprüfte und geschätzte Stellen stehen gemischt in einer Reihenfolge.
   - Stellen ohne erkannten Anforderungsteil kommen ans Ende.
   - Bei Gleichstand steht die neuere Stelle oben.
   - Es zählt je Stelle der am besten passende CV (Phase 6a, Q4).
   - **In der Oberfläche erscheinen keine Zahlen zur Passung** (Nutzer: „Ich möchte aber keine Zahlen sehen, das interessiert mich nicht“). Der interne Sortierwert bleibt unsichtbar.
5. **Listen-Ansicht „Nach Rangliste“ (Q319–Q321).**
   - Daneben ein zweites Feld „Kategorie“ mit den sieben Kategorien aus `RANKING_KATEGORIEN`. Angeboten werden nur Kategorien mit mindestens einer für das Konto sichtbaren Liste.
   - Darunter die Listen der Kategorie in fester Reihenfolge von groß nach klein. Börsennotiert: DAX → MDAX → SDAX → TecDAX; später kommen neue Listen aus P18 (z. B. Nasdaq) dazu. Die Reihenfolge steht als feste Tabelle im Code.
   - Jede Liste ist anfangs offen und einzeln zuklappbar.
   - Je Liste stehen **alle Firmen mit mindestens einer Stelle, die zu den aktuellen Filtern passt**, als Kacheln.
     - Kachel: Logo, Name, Platz (nur bei Listen mit echter Platzierung und nur, wenn die Sichtbarkeit der Ausgabe es für das Konto erlaubt, Q73/Q96) und „n Stellen“.
     - Reihenfolge: Listen mit Platz nach Platz, Listen ohne Platz (Indizes) nach Firmengröße (Mitarbeitende), dann Name.
   - Eine Firma erscheint in jeder ihrer Listen.
   - Klick auf eine Kachel klappt ihre passenden Stellen auf, nach Passung sortiert. Klick auf eine Stelle klappt die Anzeige mit Farben auf (Ziel 1). Mehrere Firmen dürfen gleichzeitig offen sein.
   - Keine Seitenzahlen. Die Stellen einer Firma lädt die Seite erst beim Aufklappen.
   - Nur angemeldet; Gäste sehen keine Ränge (Q73).
6. **Merk-Kategorien (Q315).**
   - Neu gemerkte Stellen landen unter **„Neu gemerkt“**. Je Stelle schiebt ein Klick sie nach **„Gemerkt“** oder **„Für später“**.
   - Sichtbar im Reiter „Bewerbungen“ als Unterteilung des Status „Gemerkt“. In der Stellenliste bleibt der Knopf „Gemerkt ✓“ wie heute.
   - Alle drei bekommen den Abgleich wie heute.
   - Bestehende gemerkte Bewerbungen gelten beim Einführen als „Gemerkt“, nicht als neu.
7. **„Anzeige offline“ (Q316).**
   - Bewerbungen, deren verknüpfte Stelle geschlossen ist (`jobs.status = 'geschlossen'`), zeigen ein Schild „Offline seit …“. Das gilt im Reiter Bewerbungen, im Seitenfenster und auf der Bewerbungsseite; in der Stellenliste erscheinen geschlossene Stellen ohnehin nicht.
   - Ist die Bewerbung noch „Gemerkt“, ist **Bewerben gesperrt**: Kein Wechsel nach „Beworben“ per Knopf, Auswahlfeld oder Ziehen auf dem Board. Eine kurze Meldung nennt den Grund. Die Stelle bleibt, bis der Nutzer sie entfernt.
   - Taucht die Stelle wieder auf (`status = 'offen'`), verschwinden Schild und Sperre von selbst.
   - Bewerbungen ab „Beworben“ zeigen nur das Schild.

## Nicht-Ziele

- Keine Zahlen, Prozentwerte, Zähler oder zusätzlichen Farbzeilen zur Passung (Q314-Korrektur, Q317).
- Keine Passung für Gäste. Keine Listen-Ansicht für Gäste.
- Kein „Offline“ für Bewerbungen ohne verknüpfte Stelle (Link-Bewerbungen ohne Treffer in der Stellenliste): Für sie gibt es keine Beobachtung.
- Kein automatisches Archivieren offline gegangener Stellen (Q316 gegen „nach 14 Tagen weg“).
- Kein geschätzter Abgleich für Freunde-Konten in diesem Paket (Claude- und Nachtlauf-Abgleich sind heute nur für Admin-Konten). Freunde bekommen später den Browser-Weg (Q37).
- Neue Ranglisten (Nasdaq usw.) kommen nicht hier, sondern mit P18.

## Anti-Ziele (wäre trotz Funktion ein Fehlschlag)

- Die Liste wird spürbar langsamer: Aufklappen darf nicht alle Anzeigen vorab laden.
- Die Animationen des Kanban-Boards ändern sich (Nutzerregel: „Die Animationen vom Kanban Board dürfen nicht verändert werden.“). Die Offline-Sperre lässt die Karte zurückspringen wie bei einem abgelehnten Ziehen, ohne neue Animation.
- Der geschätzte Abgleich verbraucht Claude-Kontingent oder schickt den CV an einen KI-Dienst.
- Geschätzte Farben sehen aus wie geprüfte (blasser plus „geschätzt“ sind Pflicht).

## Rahmenbedingungen

- **Datenschutz:** CV-Texte, Profile und Ergebnisse nie ins öffentliche Repo, nie ins GitHub-Backup (Q39/Q40).
  - Der geschätzte Abgleich läuft im bestehenden Nachtlauf des privaten Repos (`jobradar-privat/.github/workflows/cv-abgleich.yml`), zeitlich vor dem Claude-Teil.
  - Die Einwilligung (Fassung `admin-2026-11-24b`, „mit Stellenanzeigen abgleichen“) deckt das ab; keine neue Fassung nötig.
  - Die Datenschutzseite (`web/app/datenschutz/page.tsx`) ist auf den Satz zum täglichen Abgleich zu prüfen und bei Bedarf um „auch eine kostenlose Vorab-Schätzung ohne KI-Dienst“ zu ergänzen.
- **Kosten/Kontingent:**
  - Private Repos haben ein begrenztes Gratis-Kontingent an Actions-Minuten (Gratis-Tarif: 2.000 Minuten im Monat; vor dem Bau in der offiziellen Doku bestätigen, CLAUDE.md 3.3).
  - Der geschätzte Abgleich rechnet nur Stellen neu, deren `anforderungs_hash` oder CV-Hash sich geändert hat. Ziel: höchstens 15 Minuten pro Nacht.
- **Speicher:** Supabase 500 MB. Geschätzte Ergebnisse speichern nur Farbe je Anforderung, ohne Belegtexte.
- **Sichtbarkeit:** Ränge nur gemäß der Sichtbarkeit der Ausgabe (RLS auf den Ranglisten-Tabellen, Q73/Q96).
- **Keine Live-Abrufe vom Computer des Nutzers** (CLAUDE.md 3.8): Proben nur auf GitHub Actions oder mit Testdaten.
- **Tests:** Kontenprüfung mit Wegwerf-Konten `…@example.com`. RLS-Probe, dass Konto A die Ergebnisse und Merk-Kategorien von Konto B nicht sieht.

## Lösungswege (betrachtet)

| Weg | Was | Abwägung | Wahl |
|---|---|---|---|
| A | Geschätzter Abgleich nachts im privaten Repo, Ergebnisse in `cv_ergebnisse` mit eigenem `weg`, Sortierwert je Konto und Stelle in der Datenbank | Nutzt vorhandenes Modell und vorhandenen Lauf; sortierbar über alle Seiten; braucht eine Migration | **gewählt** (Claude, nach Q313) |
| B | Geschätzter Abgleich im Browser beim Öffnen der Liste | Kein Server-Aufwand, aber Modell-Download auf jedem Gerät und keine Sortierung über alle Seiten | verworfen |
| C | Nur genau geprüfte Stellen färben | Wenig Bau, aber die meisten Stellen ohne Einschätzung | vom Nutzer abgelehnt (Q313) |

## Vom Nutzer entschieden

Q313 alle grob, wichtige genau · Q314 plus Korrektur: keine Zahlen, Farben im Text · Q315 Neu gemerkt → Gemerkt/Für später · Q316 Offline markieren und Bewerben sperren · Q317 nur farbige Anforderungen in der Anzeige · Q318 Zusammenfassung · Q319 Passung = wenig Rot zuerst, gemischt, Standard Passung mit Merken, ohne Anforderungen ans Ende, Listen-Ansicht · Q320 Indizes nach Größe, Listen fest nach Bedeutung, alle Firmen mit passenden Stellen, Firma in jeder Liste · Q321 Aufruf über „Sortieren nach“ + Kategorie, Kachel mit Logo/Name/Platz/Stellenzahl · Q322 Abschluss.

## Dem Bauenden überlassen

- Genaue Formel des internen Sortierwerts (muss Ziel 4 erfüllen; Muss-Rot > Soll-Rot > Gelb). Wo die Gewichtung von „wünschenswert“ herkommt (Abschnittsüberschrift oder Kennzeichnung in der Anforderungsliste).
- Datenmodell: Spalte für die Merk-Kategorie an `applications`, neuer `weg`-Wert, Speicherort des Sortierwerts und Abfrage über alle Seiten (View/RPC), jeweils mit Migration und RLS.
- Wo „Sortierung merken“ gespeichert wird (Konto-Einstellung oder Cookie).
- Schwellen des Bedeutungsvergleichs für grün/gelb in der Schätzung (aus Stufe 1 übernehmen).
- Datum „Offline seit“ aus `zuletzt_gesehen` (Tag danach oder Tag selbst), sprachlich eindeutig.
- Aufteilung in testbare Pakete (Vorschlag: 1 Offline, 2 Merk-Kategorien, 3 Sortierung sichtbar + Aufklappen, 4 geschätzter Abgleich + Passung, 5 Listen-Ansicht).
