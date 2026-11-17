# Anzeige mit dem Chrome-Knopf merken

Lokale erste Version für Chrome. Edge, Safari, Smartphone und Firefox folgen gemäß Nutzerpriorität später. Kein Browser wurde durch Codex eingerichtet, keine Erweiterung installiert und nichts veröffentlicht.

Unsichtbar für Webseiten: keine Inhaltsskripte und keine freigegebenen Dateien; ein Test sichert das ab.

## Einmal einrichten

**Was:**

1. In Chrome `chrome://extensions` öffnen und **Entwicklermodus** einschalten.
2. **Entpackte Erweiterung laden** wählen und diesen Ordner `browser-erweiterung/chrome` auswählen.
3. Bei **Jobradar – Anzeige merken** die **Erweiterungsoptionen** öffnen.
4. Die Adresse der eigenen Jobradar-Website ohne Unterseite eintragen und **Verbinden** drücken. Chrome fragt den Zugriff auf genau diese Website ab. Für die lokale Prüfung ausschließlich `http://localhost:3002` verwenden.
5. Bei Jobradar wie gewohnt anmelden. Über Chromes Erweiterungssymbol den Jobradar-Knopf **anheften**.

**Warum:** Der Knopf braucht einmal die Zieladresse und die Erlaubnis für Jobradar. Die bestehende Anmeldung wird im Jobradar-Tab verwendet; keine Schlüssel, Passwörter oder Abo-Tokens werden kopiert.

**Erfolg:** Die Optionen melden „Verbunden“. Der angeheftete Knopf heißt „Anzeige in Jobradar merken“. Eine laufende kompatible Jobradar-Version mit Importseite und Import-Endpunkt ist Voraussetzung; die Erweiterung allein aktualisiert keine Website.

## Eine Anzeige übernehmen

**Was:**

1. Die einzelne Stellenanzeige im Browser öffnen. Bei Bedarf vorher den gewünschten Anzeigentext markieren.
2. Einmal den Jobradar-Knopf drücken.
3. Der Jobradar-Tab öffnet anschließend das Board mit der gespeicherten oder bereits vorhandenen Karte. Neue Karten stehen unter **Gemerkt**, ohne Bewerbungsdatum. Bereits vorhandene Karten werden einschließlich Archiv sichtbar geöffnet; ihr Status bleibt erhalten.

**Warum:** Die Erweiterung übernimmt die aktuelle Adresse und eine passende Überschrift. Firma und Beschreibung kommen nur aus einem eindeutig erkannten `JobPosting`-Datensatz der Seite; eine bewusste Textauswahl hat Vorrang. Auswahl in Eingabefeldern oder bearbeitbaren Bereichen wird vor dem Auslesen ausgeschlossen. Sie liest weder die gesamte Seite noch Formularwerte oder Cookies. Ohne eindeutige Firmendaten bleibt die Firma unbekannt.

**Jobportale (LinkedIn, StepStone, Indeed, XING, Glassdoor, Monster, kununu):** Dort wird kein Skript in die Seite eingeschleust; übernommen werden nur Adresse und Titel aus den Tab-Angaben des Browsers, nie Anzeigentext, Firma oder markierter Text. Warum: Die Nutzungsbedingungen der Portale verbieten das Kopieren von Inhalten per Erweiterung. Den Anzeigentext fügst du bei Bedarf selbst in Jobradar ein. Die Website verwirft Text und Firma für diese Adressen zusätzlich selbst. Erkannt wird die Domain samt Subdomains (z. B. `de.linkedin.com`), nicht ähnlich klingende Adressen. Die Liste steht in `kern.mjs` (`PORTALE`) und in `web/lib/stellen-import.ts`; ein Test prüft, dass beide gleich sind.

**Erfolg:** Der Knopf zeigt ein Häkchen und das Board wählt die Karte aus. Ein Häkchen erscheint erst nach bestätigter Speicherung. Ist die Anmeldung abgelaufen, zuerst im geöffneten Jobradar-Tab anmelden; der begrenzte Entwurf wartet höchstens zehn Minuten und setzt danach auf der Importseite fort.

Bei **!** den Mauszeiger über den Knopf halten und die Meldung auf der Importseite lesen. Bei einem unklaren Netzfehler zuerst das Board prüfen: Es wird nicht automatisch noch einmal gespeichert. Nach zehn Minuten startet ein noch wartender Entwurf keine Übernahme mehr. Seine flüchtigen Daten werden beim nächsten geprüften Ereignis, Schließen des Ziel-Tabs oder Browserneustart/Deaktivieren/Neuladen der Erweiterung entfernt; keine minutengenaue automatische Löschung im ruhenden Browser. Falls Text gekürzt werden muss, steht am Ende `[Auszug gekürzt]`.

## Technische Grenze und Prüfung

- Manifest V3, mindestens Chrome 102; verwendet ausschließlich `activeTab`, `scripting`, `storage`. Fremdseitenzugriff entsteht nur durch den bewussten Knopfdruck.
- `https://*/*` steht als **optionaler** Berechtigungsrahmen im Manifest, weil die eigene Website-Adresse nicht im öffentlichen Repository steht. Angefordert und verwendet wird ausschließlich die konfigurierte einzelne Origin. HTTP ist nur für `localhost:3002` vorgesehen.
- Der Hintergrund hält maximal zehn wartende Aufträge in `chrome.storage.session`, gebunden an den selbst geöffneten Zieltab. Inhalte werden nicht synchronisiert. Es gibt keine `postMessage`-Brücke, kein `externally_connectable`, keine Nutzdaten in URL/Fragment und keine externen Modellaufrufe.
- Ein isoliertes Skript auf der geprüften Jobradar-Importseite sendet nur `POST /api/stellen-import` mit begrenztem JSON. Vorhandene Cookies bleiben beim Browser; Anmeldung, Origin-Prüfung und Eigentümerschutz werden zusätzlich vom Server erzwungen.
- Die Rückgabe muss eine gültige UUID enthalten. Navigation erfolgt ausschließlich zur festen Boardadresse mit dieser UUID. Eine Adresse aus der Serverantwort wird nie als Weiterleitungsziel verwendet.
- Mehrdeutige strukturierte Anzeigen werden nicht vermischt. Ganze Suchseiten, gesperrte Browserseiten und beliebige Seitenformate sind nicht als vollständig automatisch auslesbar abgenommen. Die Erweiterung umgeht keine Zugangssperren.
- Der Browser verhindert parallele Wiederholung desselben noch wartenden Auftrags. Das ersetzt keine atomare Datenbankregel für zwei unterschiedliche gleichzeitige Importe derselben Fremd-URL.

**Wiederholbare Prüfung:** Im Repository-Ordner `node --test browser-erweiterung/chrome/vertrag.test.mjs` ausführen. Die Tests verwenden den tatsächlichen Erfassungs-, Übertragungs- und Ablaufcode mit künstlichem DOM und Chrome-/HTTP-Antworten. Keine neue Bibliothek erforderlich.

**Nicht geprüft:** Tatsächlich installierte Chrome-Erweiterung, echte Chrome-Berechtigungsdialoge, reale Login-Cookies und echte Datenbankrechte. Diese Abnahme vor der persönlichen Verwendung mit künstlicher Anzeige gesondert durchführen. Die isolierten Prüfungen ersetzen sie nicht. Der lokale Prüfserver arbeitet ausschließlich mit künstlichen Daten und ist kein Ziel zum Speichern echter Anzeigen. Die Website wurde durch diese lokale Umsetzung nicht veröffentlicht.

## Offizielle Grundlagen

- [Chrome: activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) – vorübergehender Zugriff nach Nutzeraktion.
- [Chrome: isolierte Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) und [Netzwerkanfragen](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) – isolierte Ausführung und Anfragen im Web-Origin des App-Tabs.
- [Chrome: optionale Berechtigungen](https://developer.chrome.com/docs/extensions/reference/api/permissions) – einzelne Zieladresse erst bei Einrichtung freigeben.
- [Chrome: Storage](https://developer.chrome.com/docs/extensions/reference/api/storage) – flüchtige Aufträge, standardmäßig kein Zugriff aus Content Scripts auf Session-Daten.
- [MDN: Request credentials](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials) und [Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin) – Cookies nur für dieselbe Origin und serverseitige Herkunftsprüfung.

Quellen geprüft am 2026-11-16. Die konkrete Verbindung wurde aus diesen dokumentierten Bausteinen implementiert und isoliert geprüft; eine echte Browser-/Betriebsabnahme steht aus.
