# Vorbereitung: Bewerbungsportal einer Firma erkennen

Stand: 2026-11-15. **Planvorschlag, noch keine Freigabe zur Implementierung.** Der Nutzer beauftragt die Vorbereitung eines weiteren sinnvollen Arbeitsteils. Dieser Vorschlag ergänzt Phase 4; die Ranking-Auswahl bleibt bei Nutzer und Claude.

**Verbindlicher Hinweis des Nutzers (2026-11-15): Dieser Plan ist vorläufig und darf nicht direkt übernommen oder umgesetzt werden.** Vor einer Freigabe sind dem Nutzer passende, konkrete Fragen zu Zielen, Umfang, Prioritäten, unterstützten Portalen und offenen Annahmen zu stellen. Die Antworten müssen in den Plan eingearbeitet werden; erst danach kann der Nutzer die überarbeitete Fassung ausdrücklich freigeben. Sämtliche Empfehlungen, technischen Festlegungen, Umsetzungsschritte und Abnahmefälle unten sind bis dahin Vorschläge, keine beschlossenen Anforderungen. Auch ein anderer Agent darf diesen Entwurf nicht ungeprüft als freigegebenen Arbeitsauftrag übernehmen.

## Nutzen und kleiner erster Schritt

### Gestellte Frage Q10 – erster Bauabschnitt

Fortsetzung der Nutzerklärung am 2026-11-16 nach „Setz das um“ zu den weiteren Vorschlägen. Die ausdrückliche Vorläufigkeit bleibt bis Klärung und gemeinsamer Bestätigung erhalten. Vollständiger Fragewortlaut:

> ❓ Q10 – Firmenportal-Erkennung: Soll der erste Baustein aus einem eingegebenen Karriere-Link zunächst das verwendete Bewerbungssystem erkennen, ohne die Firma schon automatisch anzubinden? ➡️ Meine Empfehlung: ja, zuerst Greenhouse, Ashby und Personio; unklare Ergebnisse zur Auswahl zeigen. Die vollständige Anbindung mit privater Sichtbarkeit folgt als eigener Schritt.

Angebotene Antworten:

1. Ja: Portal aus Karriere-Link zuerst erkennen
2. Gleich vollständige Firmenanbindung planen

Antwort: ausstehend. Empfehlung und unterstützte Portale dadurch noch nicht freigegeben; kein Anwendungscode für diesen Entwurf implementiert. CV-Fragen Q8/Q9 stehen im [CV-Fragenprotokoll](2026-11-16-cv-abgleich-fragen.md). Neue Fragen ab Q11 nummerieren.

### Bisheriger Vorschlag

Später soll eine Firma per Karriere-Link angebunden werden können. Heute muss in `data/companies.csv` von Hand stehen, welches Bewerbungsportal sie nutzt und welche Kennung dazu gehört. Der erste Baustein erkennt diese Angaben aus übergebenen URLs und optional bereits vorliegendem HTML. Er führt selbst keine Netzwerkanfrage aus und speichert nichts.

Künstliches Beispiel: `https://jobs.ashbyhq.com/testfirma` ergibt einen Kandidaten mit `ats_typ=ashby` und `ats_id=testfirma`. Das beweist weder die Identität der Firma noch das Vorhandensein offener Stellen. Erst spätere Prüfung und ausdrückliche Zuordnung dürfen daraus eine aktive Quelle machen.

Empfehlung: Mit diesem kleinen Offline-Baustein beginnen. Ein vollständiges Formular für eigene Wunschfirmen wäre die Alternative; dafür fehlen noch die Klärung der privaten Sichtbarkeit und deren Durchsetzung in Stellen, Facetten, Detailseiten und Berichten.

## Geprüfter Bestand im Repository

| Anschlussstelle | Was bereits vorhanden ist | Konsequenz |
|---|---|---|
| `scraper/ats/__init__.py` | Abrufmodule für Greenhouse, Ashby, Personio, Recruitee und Sitemap | Bestehende Module weiterverwenden; keine neuen Anbieter nötig. |
| `scraper/ats/greenhouse.py`, `ashby.py` | Firmenkennung wird in einen festen API-Pfad eingesetzt | Kennungen vor jeder späteren Übergabe auf zulässige Zeichen prüfen. |
| `scraper/ats/personio.py` | Festes Hostmuster `<kennung>.jobs.personio.de` | Nur diese im Code unterstützte Variante als direkt anschließbar melden. |
| `scraper/ats/recruitee.py` | `ats_id` ist ein vollständiger Host; vorhandener Test nutzt eine eigene Firmendomain | Recruitee nicht aus einem beliebigen Domainnamen erraten. Sonderdomains brauchen gesonderten Nachweis. |
| `web/lib/link-import.ts` | Erkennt einzelne Stellenlinks; zusätzlich Lever, jedoch kein Firmenabruf im Python-Scraper | Keine zweite Bewerbungs-Linkfunktion bauen; Erkennung einer Firmenquelle ist eine andere Aufgabe. Lever vorerst nicht als anschließbar ausgeben. |
| `scraper/http.py` | Robots-Prüfung und Abrufpause; `requests.get` ohne ausdrückliche Umleitungsbegrenzung | Für spätere fremde URL-Eingaben erst Abrufschutz prüfen und erweitern; bestehender Zugang ist dafür noch kein Nachweis. |
| `scraper/run.py`, `companies.py` | Aktive Firmen kommen aus der gemeinsamen CSV; Berichte enthalten Firmennamen | Private Wunschfirmen nicht einfach dort eintragen oder durch diesen Berichtspfad schicken. |

Das sind Feststellungen aus lokalem Code und vorhandenen Tests. Aktuelle Anbieter-Dokumentation, Nutzungserlaubnis und tatsächliche Erreichbarkeit wurden für diese Vorbereitung nicht extern geprüft. Kein bestehender Test wird dadurch als neue Live-Abnahme ausgegeben.

## Vorgeschlagener Umfang

1. **Direkte Karriere- und Stellenlinks:** Greenhouse über die bereits bekannte Board-Domain, Ashby über `jobs.ashbyhq.com`, Personio über die unterstützte `.jobs.personio.de`-Domain. Pfadvarianten ausdrücklich aus vorhandenen Beispielen ableiten und testen; keine beliebigen Anbieter-Endpunkte ausprobieren. Zusätzliche Domains erst nach gesonderter Bestätigung.
2. **Bereits vorliegendes HTML:** Nur normale Linkziele und eingebettete Portal-URLs auswerten. Relative Ziele gegen die mitgelieferte Seitenadresse auflösen. Keine Skripte ausführen, keine Linkziele laden, fremde `<base>`-Angaben nicht übernehmen. Anbietername irgendwo im Text reicht nicht als Nachweis.
3. **Eindeutige Ergebnisse:** Wiederholungen desselben Portals zusammenfassen. Mehrere unterschiedliche Firmenkennungen oder Anbieter als mehrdeutig melden und alle Kandidaten zur Prüfung zurückgeben. Auch bei einem direkten Link widersprechende beigefügte Hinweise nicht still übergehen.
4. **Ergebnisvertrag:** Status `erkannt`, `nicht_erkannt`, `mehrdeutig` oder `ungueltig`; Kandidaten mit `ats_typ`, `ats_id` und Herkunft des Hinweises. Bei `erkannt` genau ein Kandidat. Keine automatische Aktivierung, kein Erraten des Firmennamens aus der Kennung, keine Gleichsetzung von Konzern und Marke.
5. **Recruitee und Sonderdomains:** Im ersten Paket als offen behandeln, soweit der Anbieter nicht aus einem belegten Portal-Link hervorgeht. Insbesondere vorhandene Firmendomains nicht automatisch mit `/api/offers/` abfragen. Weitere Erkennungsregeln mit gespeicherten Beispielen und aktueller Anbieterprüfung separat ergänzen.

Keine Namenssuche im Internet, keine neuen Abrufmodule, keine KI, kein Browser-Roboter und keine Bibliothek nötig. Website, Datenbank, Firmen-CSV und täglicher Lauf bleiben außerhalb dieses ersten Vorschlags.

## Umsetzung nach Planfreigabe

- [ ] **1. Vertrag und Fehlfälle zuerst:** Neue `tests/test_ats_erkennung.py` ausschließlich mit künstlichen URLs/HTML-Beispielen. Eindeutigkeit, Kennungen und Ablehnungsfälle festlegen; erst rot sehen, dann Code schreiben.
- [ ] **2. Direkte Erkennung:** Kleine reine Funktion in `scraper/ats/erkennung.py`, passend zur bestehenden Projektstruktur. Nur Python-Standardbibliothek. Keine Importe aus `db`, `ki` oder dem Gesamtlauf; kein automatischer Aufruf eines Adapters.
- [ ] **3. HTML-Hinweise und Mehrdeutigkeit:** Begrenzte Eingabegröße und Zahl untersuchter Ziele ausdrücklich festlegen; lineare Verarbeitung, keine beliebig tiefe Suche. Identische Kandidaten stabil zusammenfassen, widersprüchliche Ergebnisse erhalten.
- [ ] **4. Offline-Abnahme und Review:** Isolierte Python-Suite mit gesperrtem Netzwerk und deaktiviertem Laden lokaler Zugangsdaten; unabhängiger Helfer prüft Hostvergleich, Kennungen und Ausnahmen. Bestehende Abrufmodule und Website nicht umbauen. STATUS und Agentenprotokoll aktualisieren.

## Konkrete Abnahmefälle

- Board-Link und einzelner Stellenlink derselben Testfirma ergeben dieselbe Firmenkennung; ein fehlender Boardname bleibt unbekannt.
- Mehrfach derselbe Link und mehrere Stellen derselben Firma ergeben einen Kandidaten. Zwei Firmen auf demselben Anbieter sowie zwei unterschiedliche Anbieter ergeben `mehrdeutig`, unabhängig von Eingabereihenfolge.
- `jobs.ashbyhq.com.evil.example`, `jobs.ashbyhq.com@evil.example` und ein Portalname im Suchparameter oder normalen Fließtext ergeben keinen Anschluss an Ashby.
- Kein Akzeptieren von `javascript:`, `file:`, Zugangsdaten, Steuerzeichen, Backslashes oder fremden Ports. Ein nicht unterstütztes Schema wird abgelehnt; unbekannter sauberer HTTPS-Link bleibt `nicht_erkannt`.
- Leere Kennung, Pfad-Traversierung und kodierte Trennzeichen werden abgewiesen; etwaige Dekodierung darf keine ungeprüften Pfadteile für die Adapter erzeugen.
- Groß-/Kleinschreibung eines DNS-Hosts ändert das Ergebnis nicht. Pfadkennungen werden nicht pauschal kleingeschrieben.
- Relative Links werden anhand der übergebenen Quelle aufgelöst; ein fremdes `<base>` verändert die Vertrauensquelle nicht. Ein leerer oder kaputter HTML-Ausschnitt führt zu einem kontrollierten Ergebnis.
- Ein Link zu Lever wird nicht als vorhandenes Python-Abrufmodul ausgegeben. Eine beliebige eigene Karrieredomain wird weder als Recruitee noch als funktionierende Sitemap eingestuft.
- Nachweislich keine HTTP-Anfrage, DNS-Abfrage, Datei-/Datenbankänderung oder KI-Anfrage. Wiederholter Aufruf verändert weder Eingaben noch Ergebnisreihenfolge.

## Anschließend getrennt klären

- **Welche Anbieter zuerst?** Vorschlag: zunächst die drei unmittelbar passenden Portal-Muster; Recruitee-Sonderdomains und weitere Systeme nach belegten Beispielen. Das ist noch keine Nutzerentscheidung.
- **Echte automatische Anbindung:** Vor jedem tatsächlichen Abruf Anbieterbedingungen, Robots-Regeln und Zugriffsschutz prüfen; Umleitungen, interne Zieladressen und wechselnde DNS-Auflösung berücksichtigen. Ein Offline-Ergebnis ersetzt diese Prüfung nicht. Keine echte Probe im vorliegenden Auftrag.
- **Firmenidentität:** Karriereportal kann mehrere Gesellschaften bedienen. Kein unscharfer Namensabgleich und keine automatische Freigabe allein wegen ähnlicher Namen.
- **Private Wunschfirmen:** Eigener Daten-/Rechteplan erforderlich, einschließlich Gastansicht, Facetten, gemeinsamer Firmenmetadaten, Berichte und Admin-Freigabe. Keine persönlichen Wunschlisten im öffentlichen Repo oder ungeschützten Laufberichten.
- **Ranking-Firmen:** Erst im späteren Importpaket anschließen, wenn Quellenwahl, Nutzungsumfang und Bereinigung geklärt sind. Die offene SQL-Abnahme des Ranking-Unterbaus bleibt separat bestehen.

## Übergabestand

Vorläufigen Entwurf vorbereitet: Anschlussstellen und wesentliche Grenzen geprüft, Vorschläge für Umsetzung und Abnahmefälle liegen vor. Kein Anwendungscode geändert, keine Probe durchgeführt. Nächster Schritt ist eine passende Fragerunde mit dem Nutzer; anschließend Antworten einarbeiten und die überarbeitete Fassung ausdrücklich freigeben lassen. Bis dahin nicht direkt übernehmen oder umsetzen. Diese Vorbereitung erteilt weder eine Anbieter-/Quellenfreigabe noch eine Freigabe für Live-Zugriffe oder Veröffentlichung.
