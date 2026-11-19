# Phase 4: Firmen und Ranglisten – Design

Stand 2026-11-17. Geklärt mit dem Nutzer (Q13, Q41–Q51, Q55–Q61, Wortlaut in `docs/fragen-und-antworten.md`). Ausführung durch Codex nach Teilplänen in `docs/superpowers/plans/`; Reihenfolge der Phasen 4 → 6 → 5 → 3 (Q55).

## Absicht

Heute hat jobradar 13 Firmen aus `data/companies.csv`. Ziel sind rund 1.000 Firmen, und zwar solche, bei denen **erkennbar ist, warum sie dabei sind**: Sie stehen auf einer Rangliste („Top N“), sind also groß, sehr gut oder beliebt (Q56). Jede Firma wird einmal eingerichtet (Karriereseite, Portal, Größe, Branche) und danach nur noch täglich abgerufen (Q58). Dazu: Whitelist, Remote weltweit, Ranglisten-Anzeige, Zusatzfirmen je Nutzer, Überwachung mit Telegram.

## Ziele

1. Alle Firmen aus den offenen Ranglisten (Q57) automatisch übernehmen, einmalig einrichten und täglich abrufen, sofern sie Stellen in Deutschland oder remote (auch weltweit, Q44) haben.
2. Bei jeder Firma sichtbar: auf welcher Liste, mit Rang, soweit die Lizenz der Quelle das für den jeweiligen Nutzerkreis erlaubt (Q41).
3. Filter „Liste“ als erster Filter, Sortierung nach Rang (CLAUDE.md 4.8).
4. Admin kann zusätzliche Listen von Hand einfügen (Freitext/HTML/PDF), Nutzer können eigene Zusatzfirmen anlegen.
5. Kaputte Firmen werden erkannt und gemeldet; täglicher Digest per Telegram.

## Nicht-Ziele

- Kein automatischer Abruf von Ranglisten-Seiten, deren Lizenz das nicht erlaubt; solche Listen nur über das Admin-Formular (Q41).
- Kein Browser (Playwright) im Nachtlauf (Q49); Firmen, deren Stellen nur per JavaScript erscheinen, bleiben vorerst draußen.
- Keine „Ähnlichen Stellen“, keine Gehaltsschätzung, keine Suchprofile (Phase 5).
- Mistral-Prüfung (Q50) gehört nicht in die Codex-Pläne; sie braucht ein Nutzerkonto und Live-Proben und läuft mit Claude.

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Eine Firma landet unter falschem Namen oder mit fremdem Portal in der Liste (falsche Zuordnung).
- Das öffentliche Repo zeigt eine Herkunft, die nicht aus einer offenen Quelle stammt (Q61). Öffentlich einsehbar ist eine Herkunft nur bei offenen Quellen.
- Private Zusatzfirmen eines Nutzers werden für andere sichtbar (auch nicht über `laeufe`, Facetten oder Berichte).
- Der Nachtlauf wird so lang, dass er das GitHub-Zeitlimit reißt, oder eine Firma wird öfter als 1×/Sekunde abgefragt.

## Feste Rahmenbedingungen

- CLAUDE.md 3 (kostenlos, legal scrapen: robots.txt, ≤ 1 Anfrage/s je Domain, eigener User-Agent, keine Logins), 9 (Reihenfolge ATS-API → HTML → Playwright nur nach Zustimmung), 10 (wenige Abhängigkeiten).
- Groq nur für öffentliche Texte, nur `openai/gpt-oss-120b` (CLAUDE.md 3.2). Claude-Abo nur für den Admin (Q38).
- Codex-Grenzen (AGENTS.md): keine `.env`, keine Live-DB, keine Migration einspielen, kein Push, keine Live-Proben. Jeder Teilplan hat dafür **Halte-Punkte** (siehe unten).
- Im öffentlichen Repo nur Quellen mit offener Lizenz namentlich (AGENTS.md).

## Bauweise (Q61, Weg 1)

| Ort | Inhalt | Pflege |
|---|---|---|
| Datei im Repo, `data/companies.csv` (erweitert) | Firmen aus offenen Quellen: Name, Karriere-Link, Portal, Kennung, Größe, Branche, Wikidata-ID, Quelle(n) | Programm erzeugt Vorschläge; Claudes Recherche als Pull Request; Nutzer übernimmt |
| Datenbank | alles aus der Datei (Nachtlauf überträgt), dazu Admin-Firmen (von Hand ergänzt), Zusatzfirmen je Nutzer, Ranglisten-Einträge mit Sichtbarkeit | Admin-Formulare, Nutzerformular |

Verworfen: Weg 2 „nur Datenbank“ (Codex könnte die Daten weder sehen noch prüfen; Recherche ginge ohne Prüfung live), Weg 3 „alles im Repo“ (private Daten im öffentlichen Repo).

## Teilpakete

Jedes Teilpaket ist für sich nutzbar und bekommt einen eigenen Plan. Reihenfolge = Bau-Reihenfolge.

### 4a Kleinkram (alles entschieden)
- **Remote weltweit (Q44):** `scraper/filter.py` `ist_relevant` lässt zusätzlich Remote-Stellen ohne Länderbeschränkung („worldwide“, „anywhere“, „global“) durch.
- **Whitelist (Q45–Q47):** neue Spalte an `companies` (Migration), Admin-Häkchen je Firma auf der Konto-Seite, sofort wirksam. `db.nein_ausblenden()` blendet bei Whitelist-Firmen nichts aus, auch einfache Tätigkeiten nicht; wird das Häkchen gesetzt, werden ausgeblendete Stellen der Firma wieder sichtbar. Prestige-Listen ergänzen die Whitelist automatisch, das Häkchen hat Vorrang (auch Abwählen). Welche Listen als „Prestige“ zählen, legt der Admin je Liste fest (Feld an der Liste).

### 4b Portal-Erkennung aus Link (Q13, Plan vorhanden)
`docs/plans/2026-11-15-firmenportal-erkennung.md`, Schritte 2–5, unverändert: reine Funktion `erkenne_portal(url)` für Greenhouse, Ashby, Personio. Erweiterung um weitere Portale (4c-3) als Muster in derselben Funktion.

### 4c Firmen aus Ranglisten (Q56–Q58)
**4c-1 Kandidatenliste.** Ein Skript holt die offenen Listen (höchstens 1× je Quelle und Monat), führt Dubletten über Wikidata-ID bzw. Domain zusammen und ergänzt Stammdaten aus Wikidata (Website, Mitarbeitende, Branche, Sitz). Branchen werden auf `data/kategorien.md` abgebildet (feste Zuordnungstabelle im Repo). Listen (Q57):
- EU Industrial R&D Investment Scoreboard (World 2000, EU 800; XLSX, CC BY; Rang übernehmen)
- Börsenindizes DAX, MDAX, SDAX, TecDAX (Mitgliedschaft über Wikidata; Aktualität prüfen)
- „Top 20 je Branche nach Mitarbeitenden“ (aus Wikidata berechnet, Firmen mit Sitz in Deutschland; Rang = Platz in der Branche)
- Größte Unternehmen Deutschlands (Wikipedia, CC BY-SA; **vor Nutzung Lizenzkette prüfen**, sonst weglassen)
- Patent-Rangliste des EPA (Ränge nur Admin sichtbar, bis die Nutzung für alle geprüft ist)
- EIC-geförderte Startups (CORDIS; „Auswahl“, kein Rang)
- Behörden und Forschungseinrichtungen (Q42; feste Liste im Repo)

**4c-2 Einmalige Einrichtung (Q58).** Für jede neue Firma:
1. Programm: Website → Karriereseite suchen (Startseite und übliche Pfade wie `/karriere`, `/careers`, `/jobs`; robots.txt, 1/s) → Portal-Links im HTML mit `erkenne_portal` prüfen → Probeabruf über den Adapter: Gibt es Stellen in DE/remote?
2. Für den Rest (erwartet ~10 %): Liste „Karriereseite nicht gefunden“ mit Grund, sortiert nach bestem Rang. Admin und Claude Code gehen sie am nächsten Morgen gemeinsam in einer Sitzung durch (Q62); Ergebnisse mit Quelle landen als Änderung in der Firmendatei, der Nutzer gibt sie frei. Kein nächtlicher Claude-Workflow.
3. Ergebnis steht fest. Neu gesucht wird nur für neue Firmen einer neuen Listen-Ausgabe oder bei defektem Portal (4f).
4. Firmen ohne lesbares Portal oder ohne Stellen in DE/remote bekommen einen Status mit Grund (`kein_portal`, `portal_nicht_unterstuetzt`, `keine_stellen_de`) und werden nicht abgerufen.

Erweitert die Q13-Grenze bewusst: Für 1.000 Firmen muss das Programm Karriereseiten im HTML lesen (nur offizielle Firmenseiten, CLAUDE.md 9.2).

**4c-3 Weitere Portale.** Erst messen (Häufigkeit der Portal-Arten unter den Kandidaten, Bericht für den Nutzer), dann Adapter für die häufigsten bauen. Erwartet: Workday und SAP SuccessFactors (offizielle Bewerbersysteme, CLAUDE.md 9.1). Je Adapter Test an mindestens 2 echten Firmen (Halte-Punkt, CLAUDE.md 9).

**4c-4 Aufnahme und Austritt.** Firmen auf mindestens einer Liste sind aktiv. Fällt eine Firma von allen Listen, verschwinden ihre Stellen beim nächsten Lauf; Bewerbungen bleiben (CLAUDE.md 4.8). Admin-Firmen und Zusatzfirmen sind davon nicht betroffen.

**KI-Kapazität:** Erstbestand geschätzt ~10.000 Stellen gegen ~100–200 Groq-Auswertungen/Tag. Reihenfolge nach Q48 (neue + zum Filter passende zuerst). Nicht auswerten heißt nur: ohne Zusammenfassung, Stelle bleibt sichtbar.

### 4d Ranglisten-Anzeige (Q41, Q51)
- Migration: Sichtbarkeit je Rang-Eintrag (`admin` / `angemeldet` / `oeffentlich`) auf Basis von Migration 010; RLS liefert jedem nur erlaubte Einträge. Herkunft einer Firma ist öffentlich nur bei offenen Quellen (Q61).
- Filter „Liste“ zuerst, Mehrfachauswahl, Sortierung nach Rang einer gewählten Liste; Anzeige „Liste Jahr: Platz N“ an der Firma.
- **Admin-Formular „Liste von Hand einfügen“:** Name, Jahr, Quell-Link, Sichtbarkeit; Freitextfeld (kopierte Liste oder HTML) oder PDF-Upload; Groq extrahiert Firma, Rang, Jahr; Vorschau-Tabelle mit Zuordnung zu bestehenden Firmen (neue Firmen markiert); erst „Speichern“ schreibt. Neue Ausgabe ersetzt die alte. Neue Firmen daraus werden Admin-Firmen (nur DB) und laufen durch 4c-2.
- **„Rankings zum Stöbern“:** einfache Links, gepflegt in der Datenbank über ein Admin-Formular, keine Ränge, Logos oder Einbettung.
- Speicherregeln CLAUDE.md 4.8: nur Firmenname, Rang, Listenname, Jahr, Quell-Link; höchstens 13 Monate.

### 4e Zusatzfirmen je Nutzer (Q59)
- Formular: Firmenname plus Link zur Karriereseite oder einer Stellenanzeige. Das Programm erkennt das Portal (4b/4c-2 Schritt 1). Klappt das nicht: Hinweis „Diese Seite kann jobradar nicht lesen“. Keine Claude-Recherche für Freunde (Q38); für den Admin darf 4c-2 Schritt 2 greifen.
- Sichtbar nur für den Nutzer (RLS auf Firma und Stellen, auch Facetten). Private Firmen erscheinen nicht in `laeufe` oder öffentlichen Berichten.
- **Meldung an den Admin (Q62):** Jede neue Zusatzfirma erscheint in einer Admin-Liste (Firmenname, Link, Portal, wie viele Nutzer sie eingetragen haben; ohne Namen der Nutzer). Der Admin kann sie **für sich selbst** (zusätzlich für den Admin sichtbar) oder **für alle** freigeben. Das Formular und die Datenschutzerklärung sagen: „Der Admin sieht den Firmennamen und kann die Firma für alle freigeben.“ Bewusste Ausnahme von CLAUDE.md 4.6 („auch für mich als Admin“) nur für Firmenname und Link.

### 4f Überwachung und Digest (CLAUDE.md 4.3, Q60)
- **Gesundheitscheck** nach jedem Lauf, ohne KI (Kriterien CLAUDE.md 4.3) → GitHub-Issue mit Log, HTML-Schnappschuss und Zahlen der letzten Tage, Label `scraper-defekt` → Claude Code Action repariert, Pull Request, Nutzer übernimmt selbst.
- **Telegram-Bot** (Nutzer legt ihn an; Secrets `TELEGRAM_BOT_TOKEN`, Chat-ID).
- **Täglicher Digest (Q60):** neue Stellen, die zu Wunscharbeitgebern oder zur Titel-Stichwortliste passen (eine Liste, gemeinsam mit „Automatisch abgleichen bei“ aus Q35; ab Phase 5 auch gespeicherte Filter), je Stelle eine Zeile mit Link, dazu „X weitere neue Stellen“ als Link. Zunächst nur für den Admin.
- **Wunscharbeitgeber:** Stern je Firma, je Nutzer.

### 4g Stelle aus Link vollständig erkennen (Q69–Q71, 2026-11-18)
Baut auf 4b, 4c-2 und 4c-3 auf; der Schnellstart (JobPosting von beliebigen Firmenseiten) ist vorgezogen (`docs/superpowers/specs/2026-11-18-link-schnellstart-design.md`).
- **Firmen-Karriereseiten mit Workday/SuccessFactors:** Link erkennen und die Stelle über die Bausteine aus 4c-3 holen.
- **Jobportal-Links (LinkedIn, StepStone, Indeed, XING):** Das Portal wird **nie** aufgerufen (Q16; Nutzer: „ohne linkedin aufzurufen“). Firma und Titel kommen aus der Adresse (StepStone/Indeed enthalten sie oft) oder aus dem Tab-Titel, den die Chrome-Erweiterung mitschickt. Dann Suche auf der Originalquelle: Firma in jobradar → deren Stellen nach Titel durchsuchen; Firma neu → Website über Wikidata, Portal erkennen (4b/4c-2), dort nach Titel suchen. Ein eindeutiger Treffer → komplette Stelle aus der Originalquelle, Bewerbung verweist zusätzlich auf den Portal-Link; mehrere → Auswahl für den Nutzer; keiner → Bewerbung mit Firma/Titel, Hinweis „Original nicht gefunden“.
- **Grenze:** Ein von Hand eingefügter LinkedIn-Link enthält nur eine Nummer; ohne Erweiterung fragt das Formular nach Firma und Titel.
- **Titelvergleich:** ohne KI (Normalisierung von Geschlechtszusätzen wie „(m/w/d)“, Groß/klein, Satzzeichen); „eindeutig“ nur bei genau einem Treffer mit gleichem Titel und passendem Ort (Ort nur, wenn beide bekannt).
- **Ergänzung 2026-11-19 (Q107–Q110):** Bekannte Firma: sofort in den jobradar-Stellen suchen; unbekannte Firma: Suche im Nachtlauf (Q107). Eine gefundene Stelle einer unbekannten Firma wird nur in die Bewerbung übernommen, nie in die gemeinsame Stellenliste; daneben Knopf „Firma dauerhaft beobachten“ (wird Zusatzfirma nach 4e, Q108). Kein gleicher Titel: bis zu 5 ähnliche Stellen der Firma zur Auswahl, „Keine davon“ behält Firma/Titel (Q109). Firma ohne eindeutigen Wikidata-Eintrag mit Website: nur Hinweis „Original nicht gefunden“ (Q110). Indeed-/XING-Adressen enthalten meist keine Firma: ohne Erweiterung fragt das Formular. **Aufteilung (Claude):** Plan 4g-1 deckt Portal-Links ab; Workday-/SuccessFactors-Links kommen in den Adapterplan nach der Portal-Messung (4c-3).

## Halte-Punkte für Codex (in jedem Teilplan an der passenden Stelle)

| Halte-Punkt | Wer |
|---|---|
| Migration einspielen | Nutzer im Supabase SQL Editor |
| Erster echter Abruf einer Quelle oder eines neuen Adapters (2 Firmen, Stellenzahl, 3 Beispieltitel) | Claude oder Nutzer |
| Secrets anlegen (Telegram, Claude-Token) | Nutzer |
| Groq-Extraktion im Admin-Formular live prüfen | Claude mit Nutzer |
| Hochladen, Übernehmen in `main` | nur nach „Ja, hochladen“ |

## Festlegungen nach der Bauprüfung (Claudes Wahl, 2026-11-17; Nutzer kann widersprechen)

1. **Schlüssel einer Firma:** bleibt `companies.name` (alle Verweise haben `on update cascade`, Umbenennen ist also sicher). Neue Spalte `wikidata_id` (eindeutig, wo vorhanden) für den Dublettenabgleich. Je Karriereportal ein Eintrag (Q43); haben Marken eines Konzerns getrennte Portale, heißen sie wie die Marke („Siemens Healthineers“); gibt es nur Regionalportale derselben Marke, Zusatz in Klammern („Firma (Portal-Region)“). Zwei Kandidaten mit gleicher Wikidata-ID oder gleicher Domain werden nie automatisch zusammengelegt, wenn ihre Portale verschieden sind; sie erscheinen im Bericht.
2. **Zusatzfirmen:** Tabelle „wer sieht welche private Firma“ (Firma, Nutzer); `companies.fuer_alle` (ja/nein). RLS auf `companies`, `jobs` und den Facetten-Funktionen: sichtbar, wenn `fuer_alle` oder der angemeldete Nutzer in dieser Tabelle steht. „Für mich freigeben“ trägt den Admin dort ein, „für alle freigeben“ setzt `fuer_alle`. Für private Firmen schreibt der Lauf keine Zeile in `laeufe`. Existiert die Firma schon für alle (gleiches Portal und gleiche Kennung), legt das Formular keine Kopie an, sondern meldet „gibt es schon“. Tragen zwei Nutzer dieselbe Firma (gleiches Portal, gleiche Kennung) privat ein, gibt es einen Eintrag, und beide stehen in der Sichtbarkeitstabelle. Taucht die Firma auf einer Liste auf, wird `fuer_alle` gesetzt (Bewerbungen bleiben verknüpft).
3. **Wer welches Feld besitzt:** Stammdaten (Name, Website, Karriere-Link, Portal, Kennung, Größe, Branche, Wikidata-ID, offene Quellen, Status) gehören der Datei; der Nachtlauf überschreibt sie in der Datenbank. Admin-Felder (Whitelist-Häkchen, Wunscharbeitgeber, `besitzer`, Hand-Listen) gehören nur der Datenbank; der Nachtlauf fasst sie nie an. `firmen_korrekturen.csv` bleibt und hat Vorrang: Das Skript aus 4c-1 wendet sie beim Erzeugen der Firmendatei an.
4. **Laufzeit:** Ziel unter 2 Stunden je Nachtlauf, gemessen und im Bericht. Tägliches Abrufen läuft über Portal-Schnittstellen, eine Anfrage je Firma und Sekunde je Domain. Die einmalige Einrichtung (4c-2) läuft als eigener Lauf für **alle** Kandidaten auf einmal (Q62; geschätzt ~5–10 Anfragen je Firma, verschiedene Domains). Droht das GitHub-Zeitlimit (6 h), speichert der Lauf seinen Stand und setzt in der nächsten Nacht fort; schon erledigte Firmen werden nie neu gesucht. Eine Rotation des täglichen Abrufs wird erst gebaut, wenn die Messung das Ziel reißt.
5. **Sichtbarkeit der Ränge:** als Spalte an der Ausgabe (`ranking_ausgaben`), die jedem ihrer Einträge gilt. Die Lizenz hängt an der Quelle, nicht an der einzelnen Zeile; das ist gleichwertig zu „je Rang-Eintrag“ (CLAUDE.md 4.8), aber einfacher. Die Liste selbst ist sichtbar, sobald der Nutzer mindestens eine Ausgabe sehen darf. Die Herkunft in der Datei betrifft nur offene Quellen (Q61).
6. **Branchen:** Zuordnung Wikidata-Branche → Kategorie als Datei im Repo. Nicht zuordenbare Branchen werden „Sonstige“ und stehen im Bericht, damit die Zuordnung ergänzt werden kann.
7. **Claude-Recherche (Q62):** kein nächtlicher Workflow. Der Einrichtungslauf schreibt die Liste „Karriereseite nicht gefunden“ als Datei bzw. in den Bericht; Admin und Claude Code arbeiten sie am Morgen in einer Sitzung ab und ändern `data/companies.csv` (Nutzer gibt frei). Codex baut nur die Liste, nicht die Recherche.
8. **Remote weltweit (4a):** zählt, wenn der Ortstext oder das Remote-Feld „worldwide“, „anywhere“, „global“, „weltweit“ oder „remote“ ohne Ländernamen enthält und kein anderes Land ausdrücklich verlangt wird.

## Änderungen nach Q94–Q96 (2026-11-19, gehen allem Folgenden vor)

- Aus jeder Liste höchstens die Top 200; Listen mit weniger Firmen ganz; Listen ohne Rang mit mehr als 200 Firmen (EIC): die 200 mit der höchsten EU-Förderung (Q97). Damit: Scoreboard Top 200, „Top 200 Arbeitgeber“ (statt 300), Hand-Listen je höchstens Platz 1–200.
- Kategorien statt Einzellisten für Nutzer: Spalte `kategorie` an `ranking_listen` (sieben feste Werte, siehe CLAUDE.md 4.8); Filter „Kategorie“ für Angemeldete über eine Funktion, die nur (Firma, Kategorie) liefert – auch aus Listen, deren Ränge nur der Admin sieht; einzelne Listen, Ränge und Sortierung nach Rang nur nach Sichtbarkeit.
- Schätzung Firmenzahl: roh ~3.100, ohne Doppelte ~1.500–2.000, aktiv (Stellen in DE/remote) ~900–1.300.

## Änderungen nach Q80–Q93 (2026-11-19, gehen 4c-1 und Q57 vor)

| Quelle | Regel |
|---|---|
| EU R&D Scoreboard | nur Rang 1–250 weltweit (keine EU-800); seit Q94: 1–200 |
| Börsenindizes | DAX, MDAX, SDAX, TecDAX vollständig |
| EPA | Top 100 Patentanmelder, Rang nur Admin |
| Top 300 Arbeitgeber (ersetzt „Top 20 je Branche“; seit Q94: Top 200) | Wikidata, Sitz-Land DE, ≥ 1.000 Mitarbeitende, nicht aufgelöst, Ausschluss nach `data/arbeitgeber_ausschluss.csv` (Typ, Namensteil, Ausnahmen „behalten“), die 300 größten; automatisch live, Fehler über `firmen_korrekturen.csv`. Probe 2026-11-19: 1.156 Kandidaten, 636 nach Ausschluss, Platz 300 hat 3.500 Mitarbeitende |
| EIC | Accelerator, ganz Europa, ohne Rang; Datei 1×/Jahr vom Nutzer |
| entfällt | Wikipedia-Liste (Q77), Behörden/Forschung (Q82 ersetzt Q42), Top 20 je Branche (Q80) |
| heutige 13 Firmen | werden mit 4e private Firmen des Admins (Q93) |

## Quellen-Formate (Task 0, geprüft 2026-11-19)

| Quelle | Abruf | Format | Lizenz | Hinweise |
|---|---|---|---|---|
| EU R&D Scoreboard | `https://knowledge-for-policy.ec.europa.eu/sites/default/files/World2000%282004-2025%29.zip` bzw. `EU800%282004-2025%29.zip` (robots.txt erlaubt; ~11 MB; 1×/Jahr, Ausgabe im Dezember) | ZIP mit einer XLSX je Jahrgang (`SB2025_World2000.xlsx`), ein Blatt, Kopfzeile `Year, World rank, Company, Country, Region, ISO3 Code, ICB3 short, ICB3 long, …` | CC BY 4.0 (Rechtshinweis der Kommission), Quellenangabe nötig | keine Wikidata-ID, keine Website → `name_zu_id` |
| Wikidata | `https://query.wikidata.org/sparql`, Abfragen in `scraper/quellen/sparql/` | SPARQL-JSON | CC0 | eigener User-Agent; Abfragen mit `P279*` über alle deutschen Firmen laufen in Zeitüberschreitung; Indizes: DAX `Q155718`, MDAX `Q595622`, SDAX `Q448445`, TecDAX `Q378967` (Mitgliedschaft `P361` ohne Enddatum `P582`) |
| EPA Technology Dashboard | `https://link.epo.org/web/about-us/statistics/top-100-applicants-epo-technology-dashboard-2025.xlsx` (1×/Jahr, März/April) | XLSX, Blatt „Top 100“, Titelzeile, dann `Rank, Company, Filed, Country` | keine ausdrückliche Wiederverwendungserlaubnis gefunden → Ränge nur Admin (wie bisher) | Kurznamen („SIEMENS“) → `name_zu_id` |
| CORDIS (EIC) | **kein automatischer Abruf**: robots.txt verbietet `/data/` (Q78) | Nutzer lädt `cordis-HORIZONprojects-csv.zip` 1×/Jahr im Browser | Wiederverwendungshinweis der Kommission (CC BY 4.0) | Parser als Nachtrag nach dem ersten Handdownload |
| Wikipedia-Liste | entfällt (Q77) | – | – | – |
| Workday / SuccessFactors | robots.txt der Karriere-Hosts erlauben den Stellenpfad und nennen eine Sitemap; Stellenseiten enthalten JSON-LD `JobPosting` | – | Workday-Bedingungen gelten für workday.com, Seiten mit Verweis darauf und die Workday-Schnittstellen → nur Sitemap + Stellenseite (Q76) | `career*.successfactors.*` verbietet Programme |

## Dem Bauenden überlassen

Spaltennamen, Dateiaufteilung im Scraper, genaue Zuordnungstabelle Wikidata-Branche → Kategorie (als Datei im Repo, prüfbar), Paketgröße der Claude-Recherche (Start 50), Wortlaut der Fehlermeldungen. Bestehende Muster übernehmen (Adapter-Register `scraper/ats/__init__.py`, Prüfung `scraper/rankings.py`, RLS-Tests `tests/test_rls.py`).

## Offene Prüfungen vor dem Bau

- Lizenzkette der Wikipedia-Liste; Aktualität der Index-Mitgliedschaften in Wikidata.
- Nutzungsbedingungen von Workday/SuccessFactors-Karriereseiten (öffentliche Stellenlisten, robots.txt).
- Laufzeit: 1.000 Firmen bei 1 Anfrage/s je Domain im GitHub-Zeitlimit (6 h je Job); ggf. Firmen auf mehrere Läufe verteilen.
