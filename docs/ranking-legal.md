# jobradar – Rankings legal beschaffen (strenger Maßstab „100 % wasserdicht“)

Stand: 10. November 2026. **Keine Rechtsberatung**, sondern eine sorgfältige Recherche. „100 %“ kann am Ende nur eine schriftliche Antwort des Herausgebers oder ein Anwalt bestätigen.

**Maßstab (vom Besitzer festgelegt):** Eine Liste gilt nur als nutzbar, wenn
- (a) die Bedingungen des Herausgebers die Weiternutzung der Ranking-Daten **ausdrücklich erlauben** (Klausel wörtlich mit Link), oder
- (b) die Daten aus einer Quelle mit **ausdrücklich freier Lizenz** stammen (z. B. Wikipedia CC BY-SA, Wikidata CC0, offizielles Open-Data-Portal), oder
- (c) eine **schriftliche Erlaubnis** des Herausgebers vorliegt.

„Unklar“, „wahrscheinlich ok“, „robots.txt erlaubt es“, „sind ja nur Fakten“ oder „die TDM-Schranke greift wohl“ reichen **nicht**. Solche Listen heißen hier **„nur nach schriftlicher Erlaubnis“** oder **„weglassen“**.

Prüfstatus: **V** = auf der Seite des Herausgebers selbst gelesen · **T** = teilweise (Herausgeber-Seite plus Zweitquelle oder nur Suchtreffer) · **A** = abgeleitet / Erfahrungswissen.
Für mich gesperrt (Abruf verweigert): stern.de, zeit.de, ft.com, focus.de, sifted.eu (403), levels.fyi/terms (403; stattdessen levels.fyi/about/terms.html gelesen). Für zeit.de, ft.com, focus.de und linkedin.com gelten die Befunde aus `docs/ranking-katalog.md`.

Fachbegriffe: **robots.txt** = Datei, in der eine Website Programmen sagt, was sie lesen dürfen. **TDM** (Text und Data Mining) = automatisches Auswerten von Inhalten durch Programme. **AGB/ToS** = Nutzungsbedingungen. **CC BY-SA** = freie Lizenz: Weiternutzung (auch auf Websites) erlaubt, wenn man die Quelle nennt, die Lizenz angibt und Änderungen unter derselben Lizenz weitergibt.

---

## 1. Übersicht je Liste

| Liste | Erfüllt der Weg den strengen Maßstab? | Weg / Befund mit Zitat | Automatisierbar? | Was der Besitzer tun muss | Quellen (Status) |
|---|---|---|---|---|---|
| **#32 DAX 40** | **ja, über (b) Wikipedia** | Wikipedia-Artikel „DAX“, Abschnitt „Zusammensetzung“: 40 Firmen mit Indexgewicht, „Stand: 7. November 2026“, Fußzeile: CC BY-SA 4.0. Wikipedia: Text *„can be used free of charge for any purpose so long as licensing terms are met“*, auch *„in your own books/articles/web sites“*; Pflicht: Link als Namensnennung und Lizenzhinweis. **Die offizielle Quelle STOXX scheidet aus:** DAX Conditions of Use Ziff. 3.2: *„The fact that Unrestricted Data is publicly available does not grant you any license to copy, redistribute or commercially exploit it.“* Ziff. 3.4 zählt *„composition lists, component level data“* zu den „Restricted Data“ (nur mit Lizenzvertrag); Ziff. 3.5 verbietet *„any crawler, robot, spider, scraper, bot…“* ohne schriftliche Erlaubnis. | **ja** (Wikipedia-API, eigener User-Agent mit Kontakt-E-Mail laut Wikimedia-Regeln) | Nichts anfragen. Auf der Seite: „Quelle: Wikipedia, Artikel ‚DAX‘, CC BY-SA 4.0“ + Link. Ehrlicher Restpunkt: Die CC-Lizenz kann nur Rechte vergeben, die die Wikipedia-Autoren haben; eine 40er-Mitgliederliste ist aber eine allgemein bekannte Tatsache, die Deutsche Börse selbst per Pressemitteilung bekannt gibt. | https://de.wikipedia.org/wiki/DAX (V) · https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content (V) · https://stoxx.com/legal/dax-conditions-of-use/ (V) |
| **#1 stern/Statista Beste Arbeitgeber DE**, **#2 Berufseinsteiger**, **#4 Forbes World's Best Employers**, **#6 FT 1000** (auch #3, #5, #7) | **nein → nur nach schriftlicher Erlaubnis** | Statista-AGB (laut Impressum für die Ranking-Seiten gültig), Ziff. 3: *„You are also not allowed to access our web pages with the aid of crawlers or comparable technology.“* Ziff. 2 erlaubt Weitergabe nur, *„insofar as we recognisably offer material for free redistribution“* – die Ranking-Seite bietet weder Download, Einbettung noch Freigabe an (V). Lizenzangebot gibt es **nur für ausgezeichnete Firmen** (Siegel): FAQ *„Only official awardees featured in a ranking or rating can access and use the award logo.“* Das zeigt: Statista vermarktet die Nutzung der Auszeichnung aktiv → Dritte haben **keine** Freigabe. Medienpartner sind kein Ausweg: Forbes-AGB Ziff. 1.3 erlauben nur *„personal, non-commercial, and informational/entertainment use“*, Ziff. 2 verbietet *„incorporate into a database any Content“*, Ziff. 1.1 zählt *„directories, lists“* ausdrücklich zum geschützten Inhalt; ft.com verbietet KI-/ML-Nutzung (Katalog); stern.de nicht prüfbar. | **ja**, nach Erlaubnis | **1 E-Mail an Statista** (für alle Statista-Listen; Statista bitten zu bestätigen, dass ihre Erlaubnis auch für die Partnermedien gilt). | https://rankings.statista.com/de/impressum (V) · https://cdn.statista-rankings.com/legal/agb-global.pdf (V, Stand Feb. 2025) · https://rankings.statista.com/en/faq/ (V) · https://rankings.statista.com/de/kontakt (V) · https://www.forbes.com/terms-and-conditions/ (V) |
| **#9–#11 Great Place to Work** (DE, Bayern, Young Talents) | **nein → nur nach schriftlicher Erlaubnis** | Kein Verbot gefunden, aber auch **keine Erlaubnis**: Impressum nur *„©2025 Great Place To Work® Institute Inc. All Rights Reserved.“*, keine Nutzungsbedingungen, Presseseite ohne Regeln zur Nutzung der Ergebnisse. robots.txt offen (zählt nach Maßstab nicht). Gewinner erwerben das Siegel; Regeln für Dritte nicht veröffentlicht. Hinweis: **keine Rangplätze** auf den Hauptlisten, nur „ausgezeichnet“. | **ja**, nach Erlaubnis | **1 E-Mail an presse@greatplacetowork.de** | https://greatplacetowork.de/impressum/ (V) · https://greatplacetowork.de/presse/ (V) · https://greatplacetowork.de/robots.txt (V) |
| **#25 Hurun Germany Unicorn Index** | **nein → nur nach schriftlicher Erlaubnis** | hurun.net: Copyright-Vermerk, *„This report is meant for information purposes only“*, keine Nutzungsbedingungen, keine Freigabe. Tabellen sind Bilder. **Ersatz nach (b):** Wikipedia „List of unicorn startup companies“ (CC BY-SA, Spalte Land, z. B. Helsing, Celonis) – das ist aber **nicht** das Hurun-Ranking, sondern eine eigene Sammlung (CB Insights u. a.), Bewertungsdaten teils älter. | Hurun: **halb** (jährlich 38 Zeilen von Hand) nach Erlaubnis · Wikipedia-Ersatz: **ja** | **1 E-Mail an Kontaktseite hurun.net (Adresse in der lokalen Fassung)** (laut Seite „For media inquiries“). Alternativ sofort den Wikipedia-Ersatz nutzen. | https://www.hurun.net/en-us/info/detail?num=N5C7D1KGTE8G (V) · https://en.wikipedia.org/wiki/List_of_unicorn_startup_companies (V) |
| **#29 Levels.fyi Top Paying Companies DE** | **nein → nur nach schriftlicher Erlaubnis** | Nutzungsbedingungen Ziff. 2(b)(c): kein Lesen *„by any automated means, including robots, scrapers, headless browsers, extensions and artificial intelligence agents“*; Ziff. 2(b)(a): kein *„reproduce, distribute, host“*; Ziff. 1(d): Programmzugriff nur mit *„signed written agreement“*. Korrektur zum Katalog: Die freundliche robots.txt (`ai-input=yes`) ändert daran nichts. | **ja**, nach schriftlicher Vereinbarung | **1 E-Mail an team@levels.fyi**. Bis dahin nur einen Link auf das Leaderboard zeigen. | https://levels.fyi/about/terms.html (V, Stand 22.08.2023) · https://www.levels.fyi/robots.txt (V) |
| **#18 trendence Top 50** | **nein → nur nach schriftlicher Erlaubnis** | Nutzungsbedingungen § 1: *„Es ist daher nicht gestattet, die Website im Ganzen oder einzelne Teile davon herunterzuladen“*; erlaubt nur Browsing-Kopien und Kopien zum nicht-kommerziellen privaten Gebrauch (das deckt keine Anzeige für andere). Download hinter Anfrage-Bereich (`#ra_anfr`) → Formular nie automatisieren. | **halb** (PDF jährlich von Hand) nach Erlaubnis | **1 E-Mail an info@trendence.com** | https://www.trendence.com/nutzungsbedingungen (V) · https://www.trendence.com/arbeitgeber-rankings-2025 (V) · https://www.trendence.com/kontakt (V) |
| **#16/#17 Universum** | **nein → nur nach schriftlicher Erlaubnis** | Keine Nutzungsbedingungen auffindbar (404), Bot-Schutz („Security check“) auf Ranking-Seiten, Ausgabe 2026 DE nicht gefunden. Keine Freigabe. | **halb** (jährlich von Hand) nach Erlaubnis | **1 E-Mail** über die Kontaktseite von universumglobal.com bzw. die StepStone-Presse (konkrete Adresse nicht verifiziert). | https://universumglobal.com/robots.txt (V) · https://www.stepstone.de/e-recruiting/hr-wissen/recruiting/universum-arbeitgeberranking-studierende (T) |
| **#13 kununu/ZEIT Most Wanted Employer** | **nein → Top 15 nur nach schriftlicher Erlaubnis; Gesamtliste weglassen** | Gesamtliste nur auf zeit.de, das automatisches Lesen ausdrücklich verbietet (robots + § 44b-Vorbehalt, Katalog V). news.kununu.com zeigt Top 15 + 25 Branchensieger, ohne Nutzungsfreigabe; kununu-AGB für mich nicht lesbar. | **halb** nach Erlaubnis | **1 E-Mail an press@kununu.com** | https://news.kununu.com/beste-arbeitgeber-deutschland/ (V) · https://news.kununu.com/presseinformationen/ (V) |
| **#12 Top Employers Deutschland** | **nein → nur nach schriftlicher Erlaubnis (optional)** | Keine Nutzungsbedingungen lesbar, nur *„© 2026 Top Employers Institute. All rights reserved“*. Laut Branding-Regeln (Suchtreffer) dürfen sogar Medien das Logo nur *„upon permission of Top Employers Institute“* in einer Liste verwenden → Institut kontrolliert die Nutzung aktiv. Zertifikat, **kein Rang**. | **halb** nach Erlaubnis | Optional **1 E-Mail** über https://www.top-employers.com/contact/ | https://www.top-employers.com/en/terms-of-use/ (V) · https://top-employers.com/?p=49813 (T) |
| **#22/#23 LinkedIn Top Companies / Top Startups** | **weglassen** | robots.txt `Disallow: /`, Nutzervereinbarung verbietet Scraping (Katalog). Keine offizielle 2026-Pressemitteilung mit Gesamtliste gefunden. | **nein** | Höchstens Link auf LinkedIn. | https://www.linkedin.com/robots.txt (Katalog V) |
| **#24 Sifted 100 DACH & CEE** | **weglassen** | Gesamtliste hinter Abo, Seiten antworten mit 403, AGB nicht abrufbar; FT-Tochter. | **nein** | – | https://sifted.eu (403) |
| **FOCUS-Listen** (#8 Wachstumschampions, #15 Top-Arbeitgeber) | **weglassen** (außer Statista erlaubt #8 mit) | focus.de sperrt Crawler; keine Freigabe gefunden. | **nein** | Zusatzfrage in der Statista-Mail. | Katalog (A) |
| **#27 Deloitte Technology Fast 50 Germany** | **weglassen** | Keine Ausgabe nach 2022 gefunden. | **nein** | – | https://www2.deloitte.com/de/de/pages/technology-media-and-telecommunications/articles/fast-50-2021-germany-winners.html (T) |

---

## 2. Haben die Herausgeber Lizenz- oder Daten-Angebote?

| Herausgeber | Gefunden | Was das für jobradar heißt |
|---|---|---|
| Statista | Siegel-Lizenzen **nur für ausgezeichnete Firmen** (FAQ, V); Kontaktformular nennt „Rankings, Logo-Lizenzen“ (V); Pressekontakt press@statista.com nur für Presse (T). Kein Daten-/Open-Data-Angebot für Ranking-Listen gefunden. | Nutzung ist ein Produkt, für Dritte nicht freigegeben → fragen. |
| Great Place to Work | Siegel für Gewinner; keine veröffentlichten Regeln für Dritte (T). | fragen |
| Top Employers Institute | Siegel-Regeln; selbst Medien brauchen Erlaubnis für Logo in Listen (T). | fragen oder weglassen |
| Universum / trendence / kununu / Hurun | kein Lizenz- oder Datenangebot gefunden; nur Pressekontakte. | fragen |
| Levels.fyi | schriftliche Vereinbarung für Programmzugriff ausdrücklich vorgesehen (V). | fragen |
| Forbes | Ziff. 1.4: Anfragen für andere Nutzung „as directed on the Website“; webmaster@forbes.com (V). | nicht nötig, Statista ist die Quelle |
| FT / stern | nicht prüfbar (Abruf gesperrt). | nicht nötig, Statista ist die Quelle |

**Folgerung (A):** Wer Siegel und Nutzungsrechte an die Gewinner verkauft, betrachtet die Ergebnisse als eigenes, vermarktetes Gut. Für Dritte gibt es deshalb keine stillschweigende Freigabe.

---

## 3. Eigene Angaben der ausgezeichneten Firmen – ein Ausweg?

**Befund (T):** Ja, Firmen veröffentlichen ihre Platzierung selbst, z. B. Kolping (PM 06.02.2026: Platz 18 in „Gesundheit und Soziales“ bei „Deutschlands beste Arbeitgeber 2026“), dm (newsroom, ohne konkreten Rang), Schmersal (GPTW: Platz 6 „Beste Arbeitgeber NRW“, Platz 4 Branchenranking), Adyen (GPTW-Auszeichnung ohne Rang).
- https://www.kolping.de/fileadmin/user_upload/kolpingde/PM/260206_KD_PM_Bester_Arbeitgeber_2026.pdf
- https://newsroom.dm.de/news/dm-ist-laut-stern-und-statista-beliebtester-arbeitgeber-im-einzelhandel-505576.pdf
- https://www.schmersal.com/fileadmin/content/deutschland/pics/Presse/Press_releases/2026/DE_PM_GPTW_Schmersal_2026.docx

**Bewertung:**
- **Machbar?** Nein, nicht in der Breite. Die Angaben sind uneinheitlich (mal Gesamtrang, mal Branchenrang, oft gar kein Rang), viele Firmen melden nichts, und man müsste Hunderte Firmen-Websites einzeln suchen.
- **Wasserdicht?** Nein. Pressebereiche erlauben meist nur **redaktionelle** Nutzung (Beispiele: Telekom, Porsche, presseportal.ch – *„Jede darüber hinausgehende Nutzung … bedarf der schriftlichen Zustimmung“*, sinngemäß, T). Jede Firmen-Website hat eigene Bedingungen. Und wer die Einzelangaben vieler Firmen systematisch zusammenträgt, baut am Ende die Liste des Herausgebers nach; das Datenbankrecht schützt laut EuGH auch gegen solche „indirekte“ Entnahme (A, EuGH C-203/02).
- **Sinnvolle Nutzung:** Nur als **Link** („Firma X meldet: Platz 18, Quelle“) auf einzelnen Firmenseiten in jobradar, nicht als Datenquelle für Filter und Sortierung.

---

## 4. Der rechtliche Rahmen (einfach erklärt)

**a) Einzelne Fakten sind frei.** „Siemens steht auf Platz 3 der Liste X“ ist eine Tatsache und kein urheberrechtlich geschütztes Werk (§ 2 UrhG). Eine nach Punktzahl sortierte Liste ist auch kein „Datenbankwerk“ (§ 4 UrhG), weil Auswahl und Reihenfolge nicht kreativ sind. *(A)*

**b) Das Datenbankherstellerrecht (§§ 87a ff. UrhG).** § 87b Abs. 1: Der Hersteller hat das ausschließliche Recht, *„die Datenbank insgesamt oder einen nach Art oder Umfang wesentlichen Teil der Datenbank zu vervielfältigen, zu verbreiten und öffentlich wiederzugeben“*. Auch *„wiederholte und systematische“* Entnahme kleiner Teile zählt. *(V, Gesetzestext)*
- Eine komplette Rangliste ist ein „wesentlicher Teil“. *(A)*
- Ob Ranglisten aus eigenen Umfragen überhaupt geschützt sind, ist umstritten (EuGH C-203/02: nur Investitionen ins Beschaffen/Prüfen, nicht ins Erzeugen von Daten zählen). Unter dem 100-%-Maßstab darf man sich darauf **nicht** verlassen. *(A)*
- Die Privatkopie-Ausnahme hilft nicht: § 87c Abs. 1 Nr. 1 gilt *„nicht für eine Datenbank, deren Elemente einzeln mit Hilfe elektronischer Mittel zugänglich sind“* – also nicht für Websites. *(V)*

**c) Text-und-Data-Mining-Schranke (§ 44b UrhG; für Datenbanken über § 87c Abs. 1 Nr. 4).** Erlaubt sind *„Vervielfältigungen von rechtmäßig zugänglichen Werken für das Text und Data Mining“*; sie *„sind zu löschen, wenn sie für das Text und Data Mining nicht mehr erforderlich sind“*. Ein Vorbehalt bei Online-Inhalten wirkt *„nur dann …, wenn er in maschinenlesbarer Form erfolgt“*. *(V)* Die Schranke erlaubt das **Auswerten**, nicht das **dauerhafte Speichern und Wiederanzeigen** der ganzen Liste. Unter dem strengen Maßstab ist sie deshalb **kein** ausreichender Weg. *(A)*

**d) LAION-Fall: Was ist „maschinenlesbar“?**
- LG Hamburg, 27.09.2024, Az. 310 O 227/23: Klage gegen LAION abgewiesen; nebenbei erwogen, ein Vorbehalt in natürlicher Sprache könne genügen (nicht tragend). *(T, über CMS/LTO/Noerr)*
- OLG Hamburg, 10.12.2025, Az. 5 U 104/24: Berufung zurückgewiesen; ein Verbot nur in natürlicher Sprache in den Nutzungsbedingungen war im Fall (Download 2021) **kein** wirksamer maschinenlesbarer Vorbehalt. **Revision zum BGH zugelassen** → nicht endgültig. *(T, über heise und CMS; Urteilstext nicht gelesen)*
- Bedeutung hier: Selbst wenn ein AGB-Satz wie bei Statista rechtlich vielleicht kein TDM-Vorbehalt ist, bleibt er eine klare Bitte und möglicherweise eine Vertragsbedingung. Der Besitzer will es wasserdicht → **fragen**.

**e) Website für Freunde.** Nach § 15 Abs. 3 UrhG ist eine Wiedergabe nicht öffentlich, wenn die Nutzer **durch persönliche Beziehungen** verbunden sind; eine Seite mit Login nur für echte Freunde fällt wahrscheinlich darunter. *(A)* Das dauerhafte Speichern bleibt aber eine Vervielfältigung. „Wahrscheinlich nicht öffentlich“ genügt dem 100-%-Maßstab nicht. Login trotzdem einbauen, weil er die Risiken weiter senkt. Nicht-kommerziell zu sein ist **keine** gesetzliche Erlaubnis.

**f) Was nie geht:** Login, Bezahlschranke oder Bot-Schutz umgehen (Sifted, Universum), Formulare automatisch ausfüllen (trendence), robots.txt missachten (LinkedIn, zeit.de).

---

## 5. Entwürfe für die Erlaubnis-E-Mails

### Vorlage

> **Betreff:** Bitte um Erlaubnis: Nutzung Ihres Rankings „[LISTENNAME]“ in einem privaten, nicht-kommerziellen Projekt
>
> Sehr geehrte Damen und Herren,
>
> ich baue privat eine kleine Jobsuche-Website („jobradar“), die nur ich und einige Freunde nutzen (Zugang nur per Login, nicht öffentlich, keine Werbung, keine Einnahmen).
>
> Ich würde gern bei Unternehmen anzeigen, ob und auf welchem Platz sie in Ihrem Ranking „[LISTENNAME, JAHR]“ stehen, und danach filtern und sortieren. Gespeichert würden nur **Firmenname, Rang und Name der Liste**, keine Punktwerte, Texte, Grafiken oder Logos. Bei jedem Eintrag nenne ich Sie als Quelle und verlinke Ihre Originalseite.
>
> [VARIANTE A – automatisch:] Dafür würde ein kleines Programm Ihre öffentliche Ranking-Seite höchstens **einmal im Monat** abrufen (mit eindeutiger Kennung und meiner Kontaktadresse).
> [VARIANTE B – von Hand:] Ich würde die Liste einmal im Jahr von Hand übernehmen.
>
> Darf ich das so machen? Für eine kurze **schriftliche Zustimmung** per E-Mail wäre ich dankbar. Falls Sie eine bestimmte Quellenangabe, eine Lizenz oder einen anderen Weg (z. B. eine Datei) bevorzugen, richte ich mich gern danach. Wenn Sie nicht einverstanden sind, verzichte ich selbstverständlich darauf.
>
> Vielen Dank und freundliche Grüße
> [Name] · [E-Mail]

### Empfänger und Zusätze

| Nr. | Empfänger | Adresse | Liste / Zusatz | Variante |
|---|---|---|---|---|
| 1 | **Statista** | Formular https://rankings.statista.com/de/kontakt | Beste Arbeitgeber DE 2026, Beste Arbeitgeber für junge Profis, World's Best Employers, Europe's Best Employers, FT 1000. Zusatz: *„Ihre AGB untersagen den Zugriff mit Crawlern, deshalb frage ich vorher. Gilt Ihre Zustimmung auch gegenüber Ihren Medienpartnern (stern, Forbes, Financial Times)? Und können Sie mir auch die FOCUS-Wachstumschampions erlauben?“* | A |
| 2 | **Great Place to Work** | presse@greatplacetowork.de | Deutschlands Beste Arbeitgeber, Bayern, Young Talents 2026 (statt Rang: „ausgezeichnet“) | A |
| 3 | **Hurun** (Englisch) | Kontaktseite hurun.net (Adresse in der lokalen Fassung) | Hurun Germany Unicorn Index 2026. Kurzfassung: *„private, non-commercial job-search site for me and a few friends (login only); we would store only company name, rank and list name, cite Hurun Research Institute and link to your page. May we do so? A short written OK by e-mail would be great.“* | B |
| 4 | **Levels.fyi** (Englisch) | team@levels.fyi | Top Paying Companies – Germany. Zusatz: *„Your terms require a signed written agreement for automated access; we would fetch one page at most once a month.“* | A |
| 5 | **trendence** | info@trendence.com | Arbeitgeber-Ranking 2026, Top 50 (Akademiker, Wirtschaftswiss., Informatik) | B |
| 6 | **Universum** | Kontaktseite universumglobal.com / StepStone-Presse (Adresse nicht verifiziert) | Germany's Most Attractive Employers (Studierende nach Fach) | B |
| 7 | **kununu** | press@kununu.com | Most Wanted Employer 2026 (Top 15 + Branchensieger). Zusatz: *„Gibt es die Gesamtliste in einer Form, die ich mit Ihrer Erlaubnis nutzen darf? Die Seite der ZEIT schließt automatisches Lesen aus, das respektiere ich.“* | B |
| 8 *(optional)* | **Top Employers Institute** (Englisch) | https://www.top-employers.com/contact/ | Top Employers Germany 2026 (Zertifikat, kein Rang) | B |

---

## 6. Ehrliche Zusammenfassung

**Heute nutzbar nach dem 100-%-Maßstab (ohne Nachfrage):**
- **DAX 40 über Wikipedia** (CC BY-SA 4.0, Quellenangabe + Lizenzhinweis + Link, Abruf über die Wikipedia-API). **Nicht** über STOXX.
- Als Ersatz für Hurun: **Wikipedia-Liste der Unicorns** (CC BY-SA), deutsche Firmen herausfiltern. Das ist dann aber „Unicorn laut Wikipedia“, nicht der Hurun-Rang.
- Sonst **keine** Liste.

**Erst nach schriftlicher Erlaubnis (7 E-Mails nötig, 1 optional):**
- automatisch: **Statista-Familie** (#1, #2, #4, #6; deckt 4 der 8 empfohlenen Listen), **Great Place to Work** (#9–#11), **Levels.fyi** (#29)
- jährlich von Hand: **Hurun** (#25), **trendence** (#18), **Universum** (#16), **kununu Top 15** (#13), optional **Top Employers** (#12)

**Weglassen:** LinkedIn (#22, #23), Sifted (#24), ZEIT-Gesamtliste, FOCUS-Listen (#8, #15, außer Statista erlaubt #8), Deloitte Fast 50 (#27), STOXX-Dateien.

**Selbstangaben der Firmen:** nur als Link auf einzelnen Firmenseiten, nicht als Datenquelle.

**Wichtig:** „100 % wasserdicht“ kann diese Recherche nicht garantieren. Endgültig bestätigen das nur **die schriftliche Antwort des jeweiligen Herausgebers** (die man aufbewahrt) oder **ein Anwalt**. Auch bei Wikipedia bleibt ein kleiner theoretischer Rest (die Lizenz deckt nur Rechte der Wikipedia-Autoren), der bei einer allgemein bekannten 40er-Indexliste aber praktisch keine Rolle spielt.

**Regeln für den Abruf-Code (gelten auch nach einer Erlaubnis):** eigener User-Agent mit Kontakt-E-Mail, robots.txt vor jedem Abruf prüfen, höchstens 1 Abruf je Liste und Monat, nur Name + Rang + Liste speichern, Quelle mit Link anzeigen, Login vor der Website, Erlaubnis-Mails ablegen, Daten löschen, wenn eine Erlaubnis zurückgezogen wird.

---

## Quellen zum Rechtsrahmen
- § 44b UrhG https://www.gesetze-im-internet.de/urhg/__44b.html · § 87b https://www.gesetze-im-internet.de/urhg/__87b.html · § 87c https://www.gesetze-im-internet.de/urhg/__87c.html (V)
- LG Hamburg 310 O 227/23: https://cms.law/de/deu/legal-updates/erstes-urteil-deutschlands-zur-urheberrechtlichen-zulaessigkeit-des-ki-trainings-ergangen (T)
- OLG Hamburg 5 U 104/24: https://heise.de/-11111575 · https://cms.law/de/deu/legal-updates/vervielfaeltigung-eines-fotos-fuer-erstellung-eines-ki-trainingsdatensatzes-zulaessig (T)
- § 15 Abs. 3 UrhG, EuGH C-203/02 (British Horseracing Board): Erfahrungswissen (A), nicht neu abgerufen.
- Pressebereich-Bedingungen (Beispiele): https://www.presseportal.ch/de/nutzungsbedingungen · https://www.telekom.com/de/allgemein/nutzungsbedingungen-medieninhalte (T, nur Suchtreffer)
