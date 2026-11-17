# Vorbereitung: Bewerbungsportal einer Firma erkennen

Ursprünglicher Entwurf: 2026-11-15. Überarbeitet: **2026-11-17 nach Antwort Q10**. **Der kleine erste Umfang ist bestätigt; diese überarbeitete Fassung ist noch gemeinsam zu bestätigen, bevor daraus Anwendungscode entsteht.** Der Baustein ergänzt Phase 4; Ranking-Auswahl und tatsächliche Firmenanbindung gehören nicht zu seiner Freigabe.

**Verbindlicher Hinweis des Nutzers (2026-11-15): Dieser Plan ist vorläufig und darf nicht direkt übernommen oder umgesetzt werden.** Vor einer Freigabe sind passende Fragen zu klären, die Antworten einzuarbeiten und die überarbeitete Fassung ausdrücklich freizugeben. Q10 beantwortet inzwischen die Frage nach dem ersten Bauabschnitt. Die unten konkretisierten technischen Festlegungen und Abnahmefälle bleiben bis zur Bestätigung dieser Fassung ein prüfbarer Vorschlag. Auch ein anderer Agent darf den ursprünglichen Entwurf nicht ungeprüft als freigegebenen Arbeitsauftrag übernehmen.

## Nutzen und kleiner erster Schritt

### Gestellte Frage Q10 – erster Bauabschnitt

Fortsetzung der Nutzerklärung am 2026-11-16 nach „Setz das um“ zu den weiteren Vorschlägen. Die ausdrückliche Vorläufigkeit bleibt bis Klärung und gemeinsamer Bestätigung erhalten. Vollständiger Fragewortlaut:

> ❓ Q10 – Firmenportal-Erkennung: Soll der erste Baustein aus einem eingegebenen Karriere-Link zunächst das verwendete Bewerbungssystem erkennen, ohne die Firma schon automatisch anzubinden? ➡️ Meine Empfehlung: ja, zuerst Greenhouse, Ashby und Personio; unklare Ergebnisse zur Auswahl zeigen. Die vollständige Anbindung mit privater Sichtbarkeit folgt als eigener Schritt.

Angebotene Antworten:

1. Ja: Portal aus Karriere-Link zuerst erkennen
2. Gleich vollständige Firmenanbindung planen

**Nutzerantwort am 2026-11-17 im Wortlaut:**

> Ja: Portal aus Karriere-Link zuerst erkennen

**Bestätigte Ableitung:** Zuerst aus einem eingegebenen Karriere-Link das Portal erkennen; Greenhouse, Ashby und Personio gemäß Empfehlung zuerst. Keine automatische Anbindung oder Quellenaktivierung. Diese Antwort gibt nicht pauschal alle technischen Vorschläge des alten Entwurfs frei. Kein Anwendungscode für diesen Baustein implementiert. CV-Fragen Q8/Q9 und Q11/Q12 stehen im [CV-Fragenprotokoll](2026-11-16-cv-abgleich.md). Weitere tatsächlich gestellte Fragen dort bzw. im passenden Fachdokument vollständig dokumentieren; neue IDs ab Q22 (Q14–Q21 am 2026-11-17 vergeben, siehe docs/fragen-und-antworten.md).

### Gestellte Frage Q13 – überarbeitete Fassung bestätigen

Gestellt am 2026-11-17 nach Überarbeitung und Prüfung des vollständigen Plans. Wortlaut:

> ❓ Q13 – Überarbeiteten Portalplan freigeben: Soll ich den jetzt konkretisierten Baustein bauen: einen Karriere-Link prüfen, Greenhouse/Ashby/Personio mit Portal-Kennung erkennen und unbekannte Links verständlich melden? ➡️ Meine Empfehlung: ja; ohne Seitenabruf, automatische Firmenanbindung oder neue Pakete. Der vollständige überarbeitete Plan ist dokumentiert.

Angebotene Antworten:

1. Ja: überarbeiteten Portalplan jetzt umsetzen
2. Den Plan vorher noch anpassen

Antwort: ausstehend. Grund der gesonderten Frage ist der ausdrückliche Nutzer-Haltepunkt zum vorläufigen Plan: erst Fragen/Antworten einarbeiten und „die überarbeitete Fassung ausdrücklich freizugeben“. Q10 bestätigt den ersten Umfang; Q13 betrifft die nun konkrete überarbeitete Fassung. Keine stillschweigende Freigabe aus der Empfehlung ableiten.

### Konkretes Ergebnis des ersten Bausteins

Später soll eine Firma per Karriere-Link angebunden werden können. Heute stammen aktive Firmen aus `data/companies.csv`, einschließlich Portaltyp und Kennung. Der erste Baustein erhält **genau einen absoluten Link als Text** und liefert einen begründeten Portal-Kandidaten oder eine kontrollierte Ablehnung. Er führt keine Netzwerkanfrage aus und speichert nichts.

Künstliches Beispiel: `https://jobs.ashbyhq.com/demo-fiktiv` ergibt den Kandidaten `ats_typ=ashby`, `ats_id=demo-fiktiv`, Herkunft „direktes URL-Muster“. Das beweist weder die Firmenidentität noch die Existenz des Boards oder offener Stellen. Erst gesonderte Prüfung und Zuordnung dürfen daraus eine aktive Quelle machen.

**Nicht im ersten Bauabschnitt:** HTML-Auswertung, Linklisten, relative Links, Verfolgen einer fremden Karriereseite oder deren Weiterleitungen, Internet-Namenssuche, Erkennung neuer Anbieter, Oberfläche, CSV-/Datenbankschreiben, private Zusatzfirmen und täglicher Abruf. Die früher vorgeschlagene optionale HTML-Suche ist ausdrücklich zurückgestellt; Q10 bestätigt einen Karriere-Link als Eingang, keinen HTML-Import.

## Geprüfter Bestand im Repository

| Anschlussstelle | Was bereits vorhanden ist | Konsequenz |
|---|---|---|
| `scraper/ats/__init__.py` | `ADAPTER` registriert Greenhouse, Ashby, Personio, Recruitee und Sitemap; Lever fehlt. Paketimport lädt bereits die Adaptermodule. | Keine Adapter ändern, ergänzen oder ausführen. Reinen Erkenner neben diesem Paket anlegen, damit er dessen HTTP-Importe nicht benötigt. |
| `scraper/ats/greenhouse.py` | `hole_stellen(ats_id)` setzt die Kennung in den Board-API-Pfad ein. | Ergebnis darf nur eine geprüfte Boardkennung enthalten, keine vollständige URL oder Jobnummer. |
| `scraper/ats/ashby.py` | `hole_stellen(ats_id)` setzt die Kennung in den Posting-API-Pfad ein. | Boardkennung aus direktem Host-/Pfadmuster, nicht aus Firmenname oder Suchparameter erraten. |
| `scraper/ats/personio.py` | `hole_stellen(ats_id)` verwendet `<kennung>.jobs.personio.de/xml`. | Nur das tatsächlich vorhandene `.jobs.personio.de`-Muster vorschlagen; keine anderen Personio-Domains als schon angeschlossen ausgeben. |
| `scraper/ats/recruitee.py` | `ats_id` ist ein vollständiger Host; vorhandener Test nutzt eine eigene Firmendomain | Recruitee nicht aus einem beliebigen Domainnamen erraten. Sonderdomains brauchen gesonderten Nachweis. |
| `web/lib/link-import.ts` | `analysiereLink` kennt `boards.greenhouse.io`/`job-boards.greenhouse.io`, `jobs.ashbyhq.com` und `<kennung>.jobs.personio.de` für einzelne Stellen; außerdem Lever und fremde Links. | Bestehende Hostmuster als Vergleichsgrundlage nutzen. Bewerbungs-Linkimport nicht umbauen und dessen zusätzliche Anbieter nicht als Firmenadapter ausgeben. `gh_jid` allein enthält keine Boardkennung. |
| `web/app/api/stellen-import/route.ts`, `web/lib/stellen-import.ts` und `browser-erweiterung/chrome/` | Getrennter bewusster Import einer einzelnen Fremdanzeige ins private Board. | Diese Firmenportal-Erkennung ist kein weiterer Kanban-Import und ersetzt dessen Anmeldung/Datentrennung nicht. |
| `scraper/http.py` | Seit Paket 18 kontrollierte Weiterleitungen mit Robots-/Pausenprüfung; `MAX_REDIRECTS` ist vorhanden. | Der frühere Befund „automatische unbeschränkte Weiterleitungen“ ist überholt. Dieser reine URL-Erkenner braucht keinen HTTP-Zugang; Schutz beliebiger späterer Ziele gesondert abnehmen. |
| `scraper/run.py`, `scraper/companies.py` | Aktive Firmen kommen aus der gemeinsamen CSV; Berichte enthalten Firmennamen. | Private Wunschfirmen nicht einfach dort eintragen oder durch diesen Berichtspfad schicken. |

Anschlusspfade am 2026-11-17 im lokalen Quellcode geprüft. Kein privater Datenbestand und keine Firmen-CSV eingelesen. Die Hostmuster sind ein enges lokales Erkennungsangebot, keine Behauptung vollständiger aktueller Anbieterunterstützung. Anbieterbedingungen und echte Erreichbarkeit wurden für diese reine Planung nicht extern geprüft. Kein vorhandener Test gilt dadurch als neue Live-Abnahme.

## Vorgeschlagener Eingangs- und Ergebnisvertrag

Kleine reine Python-Funktion, vorgeschlagen `erkenne_portal(url)` in `scraper/ats_erkennung.py`. Nur Standardbibliothek, insbesondere URL-Zerlegung und explizite Muster. Keine Importabhängigkeit von `scraper.ats`, `http`, `db`, `ki` oder `run`. Der gegenüber dem alten Entwurf geänderte Ablageort vermeidet die automatischen Adapterimporte aus `scraper/ats/__init__.py`.

**Eingabe:** Ein String bis 4096 Zeichen, genau eine absolute HTTPS-URL. Gewöhnliche Leerzeichen am Anfang/Ende dürfen entfernt werden. Bereits vor der URL-Zerlegung Steuerzeichen, innere Leerzeichen, Backslashes und Zugangsdaten ablehnen. Nur Standardport bzw. explizit 443; keine DNS-Abfrage. Rohpfad auf `.`/`..` und kodierte Trenn-/Steuerzeichen prüfen; Kennungen nicht durch Dekodieren oder Pfadnormalisierung „reparieren“. Relative URLs und HTML gehören nicht zum Vertrag.

**Ergebnis:** Kleines Datenobjekt mit Status, lesbarem Grund und bei Erkennung genau einem Kandidaten (`ats_typ`, `ats_id`, Herkunft „direktes URL-Muster“). Kein Feld wie „aktiv“, „Firma verifiziert“ oder „Abruf erfolgreich“.

| Status / Fall | Bedeutung und Folge |
|---|---|
| `erkannt` | Ein direkt unterstütztes Muster liefert genau eine sichere Kennung. Ein Kandidat zur späteren Zuordnung, keine Anbindung. |
| `nicht_erkannt` | Syntaktisch brauchbarer Link, aber kein unterstütztes vollständiges Muster; Kandidaten leer. Grund unterscheidet unbekannte Domain, nicht unterstützten Anbieter/Pfad und fehlende Boardkennung. |
| `ungueltig` | Eingang für diesen Baustein nicht verwendbar, etwa HTML, relative URL, Zugangsdaten, verbotener Port oder unsichere Pfadkennung. Kandidaten leer. Das sagt nicht, dass jede solche Adresse im Internet grundsätzlich ungültig wäre. |
| Mehrdeutigkeit | Niemals automatisch einen Kandidaten auswählen. Die drei disjunkten Hostmuster für genau eine URL liefern in diesem Abschnitt höchstens einen Kandidaten. Linklisten, HTML und Query-Hinweise werden nicht ergänzt, nur um einen `mehrdeutig`-Status zu erzeugen. Sollte eine Erweiterung später mehrere gültige Kandidaten liefern, sind ein ausdrücklich beschriebenes `mehrdeutig`-Ergebnis und Nutzerwahl Voraussetzung; diese Erweiterung gehört in einen neuen Umfang. |

Keine Firmenkennung aus dem Firmennamen, Seitentitel, Query oder Fragment ableiten. Query/Fragment können am gültigen direkten Link vorhanden sein, beeinflussen aber nie `ats_typ`/`ats_id` und werden nicht als weitere Linkquellen durchsucht. Ein fremder Karriere-Link, der nur zu Ashby weiterleiten würde, bleibt ohne Netzabruf `nicht_erkannt`.

### Die drei direkten Muster

| Portal | Im ersten Abschnitt vorgeschlagene URLs | Kennung und Grenze |
|---|---|---|
| Greenhouse | `https://boards.greenhouse.io/<board>` bzw. `https://job-boards.greenhouse.io/<board>`, jeweils auch `/<board>/jobs/<job-id>` | Erstes vollständiges Pfadsegment als Boardkennung; Jobnummer nicht übernehmen. Keine `embed`-/Query-Sonderform, kein `gh_jid` auf fremder Domain. |
| Ashby | `https://jobs.ashbyhq.com/<board>`, auch `/<board>/<job-id>` | Erstes vollständiges Pfadsegment als Boardkennung. Host exakt, kein Subdomain-/Suffix-Raten. |
| Personio | `https://<kennung>.jobs.personio.de/`, auch `/job/<job-id>` | Genau ein nichtleeres DNS-Label vor `.jobs.personio.de`. Keine `.com`-/Sonderdomains oder mehrstufigen Mandantenhosts ableiten. |

Ein abschließender Slash ist zulässig. Hostvergleich ohne Beachtung der Groß-/Kleinschreibung; Boardkennungen aus Pfaden unverändert lassen. Konservativer Vorschlag für Greenhouse-/Ashby-Boardkennungen: 1–100 ASCII-Buchstaben/Ziffern, Bindestrich oder Unterstrich, Beginn mit Buchstabe/Ziffer. Personio-Kennung als DNS-Label mit 1–63 Kleinbuchstaben/Ziffern/Bindestrichen, kein Bindestrich am Rand. Grenzen dienen dem kleinen sicheren Eingang und sind keine Behauptung sämtlicher vom Anbieter zugelassener Kennungen. Abweichende Formen kontrolliert als nicht unterstützt erklären.

**Nicht als unterstützte Firmenquelle ausgeben:** Lever (nur Einzelstellen-Linkimport vorhanden), Recruitee (Adapter vorhanden, aber keine sichere Erkennungsregel in diesem Abschnitt), Sitemap (Adapter vorhanden, aber eine beliebige Karrieredomain beweist keine passende Sitemap). Keine Probe-API-Aufrufe auf geratenen Hosts.

## Umsetzung nach Planfreigabe

- [x] **0. Umfang klären und Entwurf nachführen:** Q10-Antwort vom 2026-11-17 samt Wortlaut festgehalten; Link zuerst, drei direkte Muster, HTML zurückgestellt. Aktuelle Anschlusspfade geprüft; keine Anwendung implementiert.
- [ ] **1. Überarbeitete Fassung gemeinsam bestätigen:** Eingang, unterstützte Muster, Ablehnungsgründe und Offline-Grenze dieses Dokuments bestätigen. Zustimmung zum alten ungeklärten HTML-Entwurf daraus nicht ableiten.
- [ ] **2. Vertrag und Fehlfälle zuerst:** `tests/test_ats_erkennung.py` mit künstlichen absoluten URLs, HTML nur als abzulehnender Eingabe. Die unten genannten beobachtbaren Ergebnisse und Begründungen prüfen; gezielte Tests zunächst rot sehen.
- [ ] **3. Kleine URL-Erkennung:** `scraper/ats_erkennung.py` ohne neue Pakete implementieren. Eingang prüfen, genau die drei Host-/Pfadmuster auswerten, keine automatische Adapterausführung oder Seitensuche. Kein zweites Linkimport-System und keine allgemeine Crawler-Bibliothek.
- [ ] **4. Offline-Abnahme und unabhängiger Review:** Geschützten vorhandenen Einstieg verwenden, etwa `py -B -m pruefe_offline tests/test_ats_erkennung.py`, danach reguläre Offline-Suite. Netzwerk und Zugangsdaten bleiben gesperrt. Hosttäuschung, sichere Kennungen und tatsächliche Importabhängigkeiten unabhängig prüfen. Keine Live-Testmodule importieren.
- [ ] **5. Abgabe:** STATUS, Entscheidungen und Agentenprotokoll mit lokalem Commit, Ergebnissen und offenen Grenzen aktualisieren. Ergebnis zunächst als abgegrenzten Baustein abgeben; spätere Website-/Privatfirmenanbindung ist ein gesonderter Auftrag.

## Konkrete Abnahmefälle

| Künstlicher Fall | Erwartung / Nutzen |
|---|---|
| Greenhouse-Board und Stellenlink derselben fiktiven Kennung, beide bekannten Hosts | Derselbe Greenhouse-Kandidat; `<job-id>` wird nicht zur Firmenkennung. |
| Ashby-Board und zwei verschiedene Stellenlinks desselben Boards | Je Aufruf derselbe Ashby-Kandidat, kein Job-Scraping. |
| Personio-Startseite und `/job/123` desselben fiktiven Mandanten | Derselbe Personio-Kandidat, Kennung nur aus dem passenden Host. |
| Bekannter Host ohne Boardkennung oder mit nicht vorgeschlagenem Pfad | `nicht_erkannt`, verständlicher Grund; kein leeres `ats_id` und keine geratene Firma. |
| `https://jobs.ashbyhq.com.evil.example/demo`, `https://evil.example/?portal=jobs.ashbyhq.com/demo` | `nicht_erkannt`; Domainnamen in Suffix/Query schaffen keinen Anschluss. |
| `https://jobs.ashbyhq.com@evil.example/demo` | `ungueltig` wegen Zugangsdaten; niemals Ashby-Kandidat. |
| Ein fremder sauberer Karriere-Link, dessen Query zwei verschiedene Portal-URLs enthält | `nicht_erkannt`; nicht die erste, vermeintlich beste oder häufigste Kennung wählen. Mehrere Hinweise werden im URL-only-Abschnitt nicht ausgewertet. |
| `javascript:`, `file:`, `http:`, relative URL, HTML, leere oder überlange Eingabe, Steuerzeichen/Backslash, Port 444 | Kontrolliert `ungueltig`; keine Ausnahme nach außen und kein Abruf. |
| Rohpfad mit `.`/`..`, `%2f`, `%5c`, kodiertem Steuerzeichen oder unbrauchbarer Kennung | Kein Kandidat mit ungeprüftem Pfadteil; Ablehnungsgrund unterscheidet unsicher und nicht unterstützt. |
| Großgeschriebener DNS-Host und zulässige gemischte Groß-/Kleinschreibung einer Boardkennung | Host gleich erkannt; Pfadkennung bleibt unverändert. |
| Gültiges direktes Muster mit Tracking-Query/Fragment | Gleicher Kandidat wie ohne Zusatz; keine weiteren Kandidaten aus den Zusätzen. |
| Lever-Link, Recruitee-Link/Sonderdomain, beliebige eigene Karrieredomain, Personio-Sonderdomain | `nicht_erkannt` mit Hinweis auf den engen Umfang; kein als verfügbar behaupteter neuer Firmenadapter. |
| Wiederholter Aufruf unter dem geschützten Offline-Testeinstieg | Gleiche Daten, kein globaler Zustand. Keine HTTP-/DNS-/KI-Anfrage, kein Lesen von Zugangsdaten, keine Datei-/Datenbankänderung. |

Diese Tabelle sind geplante Abnahmen, keine bereits bestandenen Tests. Die Sperren des vorhandenen Offline-Einstiegs und eine Prüfung des tatsächlichen Importpfads belegen die fehlenden Seiteneffekte; kein unnötiges zweites Testframework einführen. Ein grüner URL-Test bestätigt kein existierendes Board, keine Anbieterbedingungen, keine Firmenidentität und keine Rechte einer echten Datenbank.

## Anschließend getrennt klären

- **Weitere Hinweise/Anbieter:** HTML, relative Links, mehrere Portalhinweise, Recruitee-Sonderdomains und weitere Systeme erst als eigenen Umfang klären. Greenhouse/Ashby/Personio als erster Link-Baustein sind durch Q10 bestätigt; diese Entscheidung nicht erneut als ausstehend behandeln.
- **Echte automatische Anbindung:** Vor jedem tatsächlichen Abruf Anbieterbedingungen, Robots-Regeln und Zugriffsschutz prüfen; Umleitungen, interne Zieladressen und wechselnde DNS-Auflösung berücksichtigen. Ein Offline-Ergebnis ersetzt diese Prüfung nicht. Keine echte Probe im vorliegenden Auftrag.
- **Firmenidentität:** Karriereportal kann mehrere Gesellschaften bedienen. Kein unscharfer Namensabgleich und keine automatische Freigabe allein wegen ähnlicher Namen.
- **Private Wunschfirmen:** Eigener Daten-/Rechteplan erforderlich, einschließlich Gastansicht, Facetten, gemeinsamer Firmenmetadaten, Berichte und Admin-Freigabe. Keine persönlichen Wunschlisten im öffentlichen Repo oder ungeschützten Laufberichten.
- **Ranking-Firmen:** Erst im späteren Importpaket anschließen, wenn Quellenwahl, Nutzungsumfang und Bereinigung geklärt sind. Die offene SQL-Abnahme des Ranking-Unterbaus bleibt separat bestehen.

## Übergabestand

Q10 wurde am 2026-11-17 beantwortet und in diese engere Fassung eingearbeitet. Der Plan beschreibt jetzt einen konkret prüfbaren URL-only-Baustein für drei vorhandene Portal-Muster; die alte optionale HTML-Suche ist zurückgestellt. Aktuelle Anschlussstellen und geplante Offline-Abnahmen sind benannt. **Nächster Schritt: diese überarbeitete Fassung gemeinsam bestätigen, dann erst Schritte 2–5 umsetzen.** Kein Anwendungscode für die Firmenportal-Erkennung geändert, keine echte Probe durchgeführt. Keine automatische Anbindung, Anbieter-/Quellenaktivierung, Installation, Live-Verbindung, Migration oder Veröffentlichung freigegeben.
