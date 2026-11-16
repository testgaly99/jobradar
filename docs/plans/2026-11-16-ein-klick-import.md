# Ein-Klick-Import einer fremden Stellenanzeige

Stand: 2026-11-16. Nutzerwunsch im Wortlaut:

> Außerdem sollte in offenen To Dos in den zukünftigen Phasen auch etwas drin sein, womit ich eine random Anzeige auf einer anderen Seite durch einen einfachen klick in mein Kanban Board übernehmen kann. Das könntest du doch auch schon bauen, oder?

## Ziel und vorhandener Anschluss

Von einer gerade im eigenen Browser geöffneten Stellenanzeige einen privaten Eintrag im eigenen Kanban-Board anlegen. Bestehenden Link-/Dublettenimport und Eigentümerschutz wiederverwenden, keine zweite Bewerbungsverwaltung. Keine API-Kosten. Fremde Jobportale werden nicht vom Server abgerufen und Logins/CAPTCHAs nicht umgangen. Die Anfrage ist keine Freigabe für automatisiertes Scraping beliebiger Websites.

Vorhanden: `web/app/bewerbungen/actions.ts` (`bewerbungAusLink`), `knoepfe.tsx` und `web/lib/link-import.ts`. Der manuelle Import setzt auf Beworben mit Bewerbungsdatum; ungeprüfte Wiederverwendung für das bloße Sammeln wäre fachlich falsch. Ursprünglicher Lesezeichen-Knopf wurde am 2026-11-09 wegen Bedienaufwand entfernt; neuen Weg nicht still als Wiederherstellung desselben Ablaufs festlegen.

Ein beliebiger URL-Aufruf/Fragment ist kein Nachweis eines vom Nutzer gewollten Imports. Echter Ein-Klick-Import braucht einen vertrauenswürdigen Auslöser, Anmeldung und Schutz vor ungewollten Fremdeinträgen. Technischen Weg nach Browserentscheidung prüfen; für unbekannte Seiten keine zuverlässige Firma-/Titelerkennung versprechen. Fehler, fehlende Angaben und Dubletten müssen verständlich behandelt werden.

## Gestellte Fragen – Runde 3, Antworten eingegangen

Die Nummerierung setzt das [CV-Fragenprotokoll Q1–Q5](2026-11-16-cv-abgleich-fragen.md) fort. Neue Fragen und Antworten vollständig dokumentieren; Empfehlungen sind keine Freigabe.

### Q6 – Browser für den Ein-Klick-Import

> ❓ Q6 – Browser-Knopf: Soll ich den Ein-Klick-Import zuerst für Chrome und Edge am PC bauen? ➡️ Meine Empfehlung: ein Knopf als Browser-Erweiterung, einmal eingerichtet; danach übernimmst du die gerade geöffnete Anzeige per Klick. Für Firefox oder das Smartphone wäre der technische Weg anders.

Angebotene Antworten:

1. Ja: Chrome/Edge am PC zuerst
2. Firefox am PC zuerst
3. Smartphone zuerst

Freie Nutzerantwort im Wortlaut:

> Zuerst Chrome, dann edge, dann safari, dann smartphone, dann firefox

Ableitung: Chrome zuerst umsetzen. Weitere Reihenfolge Edge → Safari → Smartphone → Firefox als künftige Schritte festhalten; daraus noch keine getestete Kompatibilität oder ein bestimmtes Smartphone-Betriebssystem ableiten. Keine Erweiterung installiert und keine Browserberechtigung angefordert.

### Q7 – Zielspalte im Kanban-Board

> ❓ Q7 – Status beim Übernehmen: Soll eine so gespeicherte Anzeige zunächst in „Gemerkt“ landen, ohne Bewerbungsdatum? ➡️ Meine Empfehlung: ja; das Speichern einer interessanten Anzeige bedeutet noch nicht, dass du dich beworben hast. Der bisherige Weg „Manuell anlegen“ bleibt beim Status „Beworben“.

Angebotene Antworten:

1. Ja: Gemerkt, ohne Bewerbungsdatum
2. Beworben, mit heutigem Bewerbungsdatum

Nutzerantwort im Wortlaut:

> Ja: Gemerkt, ohne Bewerbungsdatum

Ableitung: Neuer Fremdseiten-Sammelweg startet mit Status Gemerkt und leerem Bewerbungsdatum. Bereits vorhandene Einträge öffnen, ihren Status und Inhalt erhalten. Bestehender manueller Bewerbungsweg bleibt Beworben.

## Beschlossener erster Bauabschnitt: Chrome

- Kleine lokale Manifest-V3-Erweiterung mit bewusstem Browser-Klick und einmaliger Einrichtung der eigenen Website-Adresse. `activeTab`/`scripting` für den gerade ausgewählten Tab, Zugriff auf die eigene Website nur nach gezielter Berechtigungsanfrage. Keine dauerhafte Leseberechtigung für alle Fremdseiten.
- Nur aktuelle URL, Titel/Firma aus eindeutigen Anzeigen-Metadaten und begrenzten Anzeigentext aus einer eindeutigen JobPosting-Struktur oder bewussten Textauswahl erfassen. Keine gesamte Seite, Cookies, Formulare oder privaten Seitenbereiche übertragen. Bei fehlender Firmenangabe Link/Titel erhalten und spätere Ergänzung ermöglichen; keine KI-Erkennung.
- Erweiterung hält den Auftrag intern mit Zeitgrenze und öffnet festen App-Tab `/bewerbungen/import`. Nach Prüfung von Tab-ID, eigener Herkunft und Pfad erfolgt ein isoliert injizierter gleichursprünglicher POST an `/api/stellen-import` mit bestehender Anmeldung. Keine Anzeigedaten in URL/Fragment, keine frei zugängliche Nachrichtenbrücke und keine kopierten Sitzungstokens.
- Anmeldung bei Bedarf abwarten und innerhalb des begrenzten Auftragsfensters fortsetzen. Kein automatisches erneutes Schreiben nach unklarem Netzwerkfehler. Nur bestätigten Erfolg anzeigen und anschließend eigenes Board öffnen.
- API prüft eigene Herkunft, JSON, Sitzung und begrenzten Klartext. Nur private eigene Bewerbungen verwenden, vorhandene Link-Normalisierung wiederverwenden; kein Abruf der Quellseite oder eines ATS und keine KI. Neue Karte Gemerkt ohne Datum, bestehende Karte erhalten.
- Keine neue Tabelle/Migration oder kostenpflichtige Schnittstelle. Bestehende Datenbank hat keine eindeutige URL-Regel pro Eigentümer: gleichzeitige unabhängige Importe sind damit noch nicht atomar gegen Dubletten geschützt. Kein falsches Versprechen daraus ableiten; normale Doppelbetätigung im Erweiterungsablauf sperren und Lesefehler vor Schreiben abbrechen.
- Mit künstlichen Daten Route/Kern, Erweiterungsablauf, Fehler-/Login-/Dublettenfälle und vorhandene Webabläufe prüfen. Paket/Anleitung lokal bereitstellen; Installation, tatsächliche Plattformprüfung und Veröffentlichung gesondert behandeln.

## Offene technische Abnahme

- Vertrauenswürdiger Sender und sichere Kopplung an das eigene Konto, minimale Rechte und klare Abmeldung.
- Herkunftslink und Dubletten beibehalten; bestehende Bewerbung nicht überschreiben oder zurückstufen.
- Keine fremde Seite darf durch einen bloßen Aufruf Daten ins Board schreiben.
- Nur vom Nutzer bewusst übernommene Anzeigeninhalte, keine Cookies, Formularwerte, Kontodaten oder Seiten im Hintergrund übertragen.
- Fehlende Erkennung/Anmeldung und Übertragungsfehler ohne falsche Erfolgsmeldung behandeln.
- Mit künstlichen Seiten und getrennten Nutzern prüfen; keine automatische Portal-/Firmenfreigabe, keine echten Daten/Schlüssel oder Veröffentlichung.

## Lokaler Abschluss und verbleibende Schritte

- [x] Chrome-Erweiterung unter `browser-erweiterung/chrome/` mit [Einrichtungsanleitung](../../browser-erweiterung/chrome/README.md) erstellt; eigene App wird nicht erneut importiert, doppelte Quellklicks teilen einen wartenden Auftrag. Formular-/Editorauswahl wird vor Auslesen ausgeschlossen.
- [x] Geschützte Importseite und selbst authentifizierende POST-API umgesetzt. Origin/JSON/Größen/Eigentümer prüfen, neue Karte Gemerkt ohne Datum, bestehende Einträge unverändert. Kein Quellseiten-/ATS-/KI-Aufruf.
- [x] Login-Unterbrechung, einzelne Tabbindung, zeitschrankenbehafteter Entwurf, feste UUID-Navigation, keine automatische Wiederholung eines unklaren Schreibvorgangs. Bestehende Karten mit eingeblendetem Archiv öffnen, damit auch abgeschlossene Karten sichtbar bleiben.
- [x] 16 Erweiterungs-Vertragstests mit tatsächlichem Kerncode und künstlichen Chrome-/DOM-/HTTP-Antworten bestanden; 15 App-Importtests sowie gesamte 288 Webtests und Typprüfung bestanden. Verlorenes Tab-Fertig-Ereignis und Formularauswahl mit roten Regressionen nachgewiesen und behoben; unabhängige Nachprüfung bestanden.
- [x] Isolierter aktueller Build und Browserabnahme auf 1280/390 Pixeln bestanden: echter gleichursprünglicher POST, neue Karte/Dublette, Status-/Inhaltserhalt, Gast/Herkunftsschutz, GET/Fragment ohne Schreibvorgang. Abgenommene App-Dateien per Hash mit aktuellem Quellstand verglichen.
- [ ] Erweiterung tatsächlich in Chrome installieren und Berechtigungsdialog, native Injektion, vorhandene Login-Cookies und echten privaten Datenbankzugriff mit künstlicher Anzeige gesondert abnehmen. Isolierte Tests ersetzen diese Plattform-/RLS-Abnahme nicht. Keine Installation oder Veröffentlichung ausgeführt.
- [ ] Danach Edge → Safari → Smartphone → Firefox gemäß Q6. Plattformvoraussetzungen und Smartphone-Betriebssystem noch klären; keine Kompatibilität oder Kostenfreiheit einer späteren Verteilung vorwegnehmen.

Die Zehn-Minuten-Grenze sperrt verspätete Ausführung; ruhende Sessiondaten werden beim nächsten relevanten Ereignis bzw. Sitzungsende entfernt, nicht garantiert minutengenau. Keine neue Tabelle/Migration, kein zusätzlicher Dienst und keine neue Bibliothek. Der künstliche lokale Prüfserver ist kein Ziel für echte Importe. Vor persönlicher Verwendung muss die kompatible Website-Version verfügbar und die gesonderte Plattformabnahme erfolgt sein.
