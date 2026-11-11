# jobradar – Ranking-Recherche v2 (Neustart, Maßstab „privat“)

Stand: 10. November 2026. Nur Web-Recherche, keine Projektdatei geändert. **Keine Rechtsberatung.**

**Maßstab dieser Runde (privat, nur der Besitzer nutzt jobradar):** Eine Quelle gilt als nutzbar, wenn mindestens eins zutrifft:
(1) freie Lizenz (CC0, CC BY, CC BY-SA, ODbL, MIT …) · (2) die Bedingungen des Herausgebers erlauben private/nicht-kommerzielle Nutzung · (3) nichts verbietet automatisches Lesen (keine AGB-Klausel, kein robots.txt-Verbot, kein maschinenlesbarer TDM-Vorbehalt) → dann greift die Text-und-Data-Mining-Schranke § 44b UrhG · (4) offizielle API/Download, dessen Bedingungen das erlauben.
**Nicht nutzbar:** ausdrückliches Scraping-/TDM-Verbot oder Bot-Schutz.

**Prüfstatus:** **V** = selbst auf der Seite des Herausgebers gelesen (Zitat von dort) · **T** = teilweise (Herausgeber-Seite + Zweitquelle oder Suchauszug) · **A** = abgeleitet/Erfahrungswissen, vor Nutzung prüfen.

**Begriffe:** *robots.txt* = Datei, in der eine Website Programmen sagt, was sie lesen dürfen. *TDM* = Text und Data Mining, also automatisches Auswerten. *SPARQL* = Abfragesprache für Wikidata (wie eine Suchmaske für Programme). *CC0* = „gemeinfrei“, keinerlei Bedingungen. *CC BY* = frei, aber Quelle nennen. *CC BY-SA* = frei, Quelle nennen, Änderungen unter gleicher Lizenz. *CC BY-ND* = frei, Quelle nennen, das Werk (z. B. Grafik) nicht verändern. *Public Domain* = US-Regierungswerke, ohne Urheberrecht.

**Wichtigste Erkenntnis vorweg:** Die bisherigen Runden haben nur nach *Arbeitgeber-Rankings von Medien* gesucht – und die sind fast alle gesperrt. Die große, legale Menge an „Top-Firmen“ steckt in **amtlichen und offen lizenzierten Datensätzen**, die gar nicht als „Arbeitgeber-Ranking“ gedacht sind: EU-Forschungsranking (R&D Scoreboard), Patentranglisten (EPA, DPMA), EU-Förderung für Startups (EIC/CORDIS), Börsenindizes über Wikidata, Unicorn-Liste der Wikipedia und US-Gehaltsdaten des Arbeitsministeriums. Diese sind **nicht** „Größe aus Wikipedia“, sondern messen Innovation, Wachstum, Prestige und Gehalt.

---

## 1. Nutzbare Quellen (Maßstab „privat“)

Spalte „Auto“: **ja** = Programm kann es lesen (API/Download) · **halb** = Programm möglich, aber umständlich oder jährlich von Hand prüfen · **nein** = nur von Hand.

### 1a. Neu entdeckt – offene/amtliche Daten (Kern der Lösung)

| # | Quelle | Herausgeber | Umfang (#Firmen) | Rang? | Kategorie | Rechtsgrundlage (Zitat/Beleg) | Status | Auto | URL |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **EU Industrial R&D Investment Scoreboard – World 2000** | EU-Kommission, Joint Research Centre (JRC) | 2.000 Firmen weltweit mit den höchsten Forschungsausgaben (Ausgabe 2025, Geschäftsjahr 2024) | **ja** (nach F&E-Ausgaben) | Innovation, Prestige | Berichte: *„Creative Commons Attribution 4.0 International (CC BY 4.0)“*, Grundlage *„Commission Decision 2011/833/EU“* (in Ausgaben 2020, 2021, 2024 belegt). Daten: „Download All Data“ (Excel) auf der Datenseite. Datenseite selbst antwortete mit HTTP 429 (zu viele Anfragen), Lizenztext dort nicht gelesen. | T | **ja** (1 Datei/Jahr, Dezember) | https://knowledge-for-policy.ec.europa.eu/iri/data_en · https://iri.jrc.ec.europa.eu/scoreboard |
| 2 | **R&D Scoreboard – EU 800** | wie #1 | 800 EU-Firmen (darunter rund 100+ deutsche) | ja | Innovation | wie #1 | T | ja | wie #1 |
| 3 | **Börsenindizes über Wikidata** (S&P 500, Nasdaq-100, FTSE 100, Euro Stoxx 50, DAX, MDAX, SDAX, TecDAX, CDAX, CAC 40, SMI/SMIM, IBEX 35, AEX …) | Wikidata (Gemeinschaft) | **selbst abgefragt (V):** aktuelle Mitglieder ohne Enddatum: S&P 500 = 500, CDAX = 381, FTSE 100 = 95, Nasdaq-100 = 84, SDAX = 71, MDAX = 50, Euro Stoxx 50 = 48, DAX = 41, CAC 40 = 40, SMIM = 40, IBEX = 34, TecDAX = 30, SMI = 28 → **ca. 950–1.050 verschiedene Firmen** | nein (nur „Mitglied“) | Prestige | Wikidata-Daten stehen unter **CC0**. Abfrage über offiziellen SPARQL-Dienst query.wikidata.org (eigener User-Agent). | V (Zahlen), A (Datenqualität: einzelne Altmitglieder ohne Enddatum, z. B. DAX 41 statt 40) | **ja** | https://query.wikidata.org/ |
| 4 | Wikipedia-Artikel zu denselben Indizes (Gegenprobe) | Wikipedia | DAX 40, MDAX 50, SDAX 70, TecDAX 30, S&P 500 (504 Zeilen), Euro Stoxx 50, FTSE 100, CAC 40, SMI … | nein | Prestige | **CC BY-SA 4.0**, *„can be used free of charge for any purpose so long as licensing terms are met“* | V | ja (Wikipedia-API) | https://en.wikipedia.org/wiki/List_of_S%26P_500_companies |
| 5 | **List of unicorn startup companies** | Wikipedia | ca. 900 Zeilen weltweit (Wikitext gezählt: 938 Tabellenzeilen), davon ca. 20 mit Deutschland-Bezug | nein (Bewertung in $ vorhanden → sortierbar) | Startup, Prestige | CC BY-SA 4.0 | V | ja | https://en.wikipedia.org/wiki/List_of_unicorn_startup_companies |
| 6 | **EPO Technology Dashboard 2025** (früher „Patent Index“): Top-100-Anmelder, Top 25 je Technikfeld, Top-50-Patentinhaber | Europäisches Patentamt | 100 + 25 × ca. 35 Felder (viele Doppelungen) → **ca. 300–500 verschiedene Firmen** | **ja** | Innovation | Website-Bedingungen Ziff. 6.2: Informationen *„online abrufen und anzeigen … für private und kommerzielle Zwecke“*, auch herunterladen, drucken, verarbeiten; Ziff. 6.4: *„cite the website as your source“*. Einschränkung Ziff. 6.4: kein *„data mining, robots or similar tools“* – **aber** die Excel-Dateien werden ausdrücklich zum Download angeboten, also kein Robot-Abgreifen nötig. | V | **ja** (4 Excel-Dateien/Jahr, April) | https://www.epo.org/en/about-us/statistics/data-download (z. B. https://link.epo.org/web/about-us/statistics/top-100-applicants-epo-technology-dashboard-2025.xlsx) |
| 7 | DPMA-Jahresbericht: Top-50-Patentanmelder in Deutschland | Deutsches Patent- und Markenamt | 50 (2025: 1. Bosch 4.109, 2. Mercedes-Benz, 3. BMW) | ja | Innovation | Keine Nutzungsbeschränkung gefunden, robots.txt sperrt nur /cgi-bin/ → § 44b. Amtliche Veröffentlichung. | T | halb (Tabelle 1.14 im Jahresbericht) | https://www.dpma.de/digitaler_jahresbericht/2025/jb25_de/statistik.html |
| 8 | **EIC Accelerator / Horizon-Europe-Geförderte (CORDIS)** | EU-Kommission (CORDIS / data.europa.eu) | EIC Accelerator seit 2021: grob 1.000+ Firmen EU-weit, Deutschland geschätzt 150–300 (A) | nein (Auswahl = „vom EU-Gremium als förderwürdig ausgewählt“) | Startup, vielversprechend | CORDIS: *„metadata CC0 + CC BY 4.0 text“*; *„Editorial content owned by the EU is licensed under … (CC BY 4.0) per Commission Decision 2011/833/EU“*. Bulk-Download als CSV/JSON/XML auf data.europa.eu. | V (Lizenz), A (Zahlen) | **ja** (Filter auf Programmcode „HORIZON-EIC-…ACCELERATOR“) | https://cordis.europa.eu/llms.txt · https://data.europa.eu/data/datasets?query=CORDIS |
| 9 | **US-Arbeitsministerium – LCA-Daten (H-1B)**: angebotene Gehälter je Arbeitgeber und Beruf | U.S. Department of Labor (OFLC) | zehntausende Arbeitgeber; relevant: internationale Tech-/Pharma-/Beratungsfirmen mit Deutschland-Standort | **ja** (Median-Gehalt je Firma selbst berechenbar) | **Gehalt** | US-Regierungswerk = Public Domain (17 U.S.C. § 105, A). Dateien öffentlich: *„LCA_Disclosure_Data_FY2026_Q3.xlsx“* | V (Dateien), A (Rechtsstatus) | **ja** (vierteljährlich Excel) | https://www.dol.gov/agencies/eta/foreign-labor/performance |
| 10 | SEC EDGAR – „Pay Ratio“: Median-Gehalt der Beschäftigten je US-Börsenfirma | US-Börsenaufsicht | ca. 3.000 US-Börsenfirmen | ja (sortierbar) | Gehalt | Public Domain (A); Zugriffsregel der SEC: *„Current max request rate: 10 requests/second“*, User-Agent mit Kontakt angeben | V (Zugriffsregel) | halb (Zahl steht im Fließtext der Proxy-Erklärung, nicht als Datenfeld) | https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data |
| 11 | UK Gender Pay Gap Service | britische Regierung | alle UK-Arbeitgeber ≥ 250 Beschäftigte | nein (nur Lohnlücke/Quartile, kein Gehaltsniveau) | Gehalt (schwach) | *„All content is available under the Open Government Licence v3.0“* | V | ja (CSV) | https://gender-pay-gap.service.gov.uk/viewing/download |
| 12 | Wikidata-Auszeichnungen (P166 „award received“), z. B. Innovationspreis der deutschen Wirtschaft | Wikidata | klein: z. B. 27 deutsche Firmen mit „Innovationspreis der deutschen Wirtschaft“ (V, abgefragt) | nein | Innovation | CC0 | V | ja | https://query.wikidata.org/ |
| 13 | de.wikipedia „Liste der größten Unternehmen in Deutschland (Forbes 2000)“ | Wikipedia | 50 Zeilen | ja | Prestige | CC BY-SA. **Achtung:** Inhalt stammt aus Forbes → siehe Risiko „Lizenzkette“ (Abschnitt 6) | V | ja | https://de.wikipedia.org/wiki/Liste_der_gr%C3%B6%C3%9Ften_Unternehmen_in_Deutschland_(Forbes_2000) |

### 1b. Arbeitgeber- und Startup-Listen, die unter dem Privat-Maßstab jetzt gehen

| # | Quelle | Herausgeber | Umfang | Rang? | Kategorie | Rechtsgrundlage | Status | Auto | URL |
|---|---|---|---|---|---|---|---|---|---|
| 14 | **Great Place to Work Deutschland – alle 15 Listen 2026** (Deutschland, Bayern, ITK, Consulting, Young Talents, Frauen, Kleiner Mittelstand, NRW, BW, Hessen …) | Great Place to Work Deutschland | **selbst gezählt (V): 199 verschiedene Firmen** (Bayern 58, ITK 60, Deutschland 99, Young Talents 49 …) | nein (nur „ausgezeichnet“, Größenklasse) | Arbeitgeber | Keine Nutzungsbedingungen, nur Impressum; robots.txt sperrt nur PDFs/Admin → § 44b. Firmen stehen sauber im HTML (`company-name`). Achtung: Die **internationale** Seite greatplacetowork.com verbietet Robots (siehe Tabelle 2). | V | **ja** (Sitemap `beste-arbeitgeber-li-sitemap.xml`) | https://greatplacetowork.de/beste-arbeitgeber-ranking/bayern-2026/ |
| 15 | Top Employers Deutschland (Zertifikat) | Top Employers Institute | ca. 160 in DE (T), weltweit mehrere Tausend (A) | nein | Arbeitgeber (HR-Prozesse) | Keine robots.txt (404), Website nur *„© 2026 Top Employers Institute. All rights reserved“*, kein Scraping-Verbot gefunden → § 44b | T | halb (Suchmaske lädt per Skript) | https://www.top-employers.com/search-top-employers/?_employer_country=germany |
| 16 | **TOP 100 – Innovatoren des Mittelstands** | compamedia | bis zu 100 je Größenklasse, real ca. 250–300 pro Jahr (T) | nein | Innovation | Impressum: Verwertung *„außerhalb der Grenzen des Urheberrechtes“* braucht Zustimmung → **innerhalb** der Grenzen (also § 44b) ist sie erlaubt; robots.txt offen | V | halb | https://www.top100.de/die-top-innovatoren/ |
| 17 | **High-Tech Gründerfonds – Portfolio** | HTGF (Bund + Industrie) | *„Mehr als 800 Unternehmen“* | nein | Startup, vielversprechend | Impressum ohne Nutzungsverbot; robots.txt: `Content-Signal: ai-train=no, search=yes, ai-input=no` – das ist ein maschinenlesbarer Vorbehalt **gegen KI**, jobradar ist keine KI → § 44b vertretbar (Risiko, s. Abschnitt 6) | V | ja | https://www.htgf.de/portfolio/ |
| 18 | Munich Startup – Startup-Verzeichnis | offizielles Startup-Portal München (Münchner Gewerbehof- und Technologiezentrum GmbH, T) | *„+1.500 Startups aus München“* | nein | Startup (Markierung „Münchner Startup“, **kein** Qualitätsranking) | Impressum ohne Nutzungsverbot, robots.txt offen → § 44b | V | halb | https://www.munich-startup.de/startups-and-ecosystem |
| 19 | Bayerns Best 50 | Bayer. Wirtschaftsministerium | 50/Jahr | nein | vielversprechend | staatliche Pressemitteilung (Pressetexte sind zur Weiterverbreitung gedacht, A) | T | nein (1×/Jahr von Hand) | https://www.bayern-innovativ.de/en/emagazine/detail/awards-ceremony-bavarias-best-50-2026 |
| 20 | trendence Arbeitgeber-Ranking (Top 50 je Zielgruppe/Fach) | Trendence Institut | 50 je Liste, mehrere Fächer | **ja** | Beliebtheit (Akademiker!) | Nutzungsbedingungen § 1 erlauben **Kopien zum nicht-kommerziellen privaten Gebrauch** (vorige Runde V); Download nur über Anfrage-Formular → nie automatisieren | V | nein (PDF jährlich von Hand) | https://www.trendence.com/nutzungsbedingungen |
| 21 | Hurun Germany / Global Unicorn Index | Hurun Research Institute | DE 38 (2026), weltweit > 1.000 | ja | Startup, Prestige | keine Nutzungsbedingungen, kein Verbot → § 44b; Tabellen sind Bilder | T | nein (von Hand) | https://www.hurun.net/en-us/info/detail?num=N5C7D1KGTE8G |
| 22 | kununu „Most Wanted Employer“ – Top 15 + Branchensieger | kununu (New Work SE) | ca. 40 | ja | Arbeitgeber | news.kununu.com: robots offen, keine eigene Klausel gelesen → § 44b (Gesamtliste nur auf zeit.de, dort verboten) | T | halb | https://news.kununu.com/beste-arbeitgeber-deutschland/ |
| 23 | Universum – Pressemitteilungen (nicht das Ranking-Portal) | Universum (StepStone) | Top 10–20 je Fach | ja | Beliebtheit (Studierende) | Ranking-Portal hat Bot-Schutz → nur Pressemitteilungen lesen, von Hand | T | nein | https://universumglobal.com/resources/news-press/ |
| 24 | LinkedIn Top Companies / Top Startups – **Pressemitteilungen auf Mynewsdesk** | LinkedIn Deutschland | 20–25 je Liste | ja | Arbeitgeber, Startup | linkedin.com selbst ist gesperrt (*„Disallow: /“*, Nutzervereinbarung verbietet *„crawlers … to scrape“*, V). Die Pressemitteilungen liegen aber auf mynewsdesk.com (robots offen, keine Klausel gefunden) – z. B. „LinkedIn Top Startups 2025“ (V) | V | nein (1×/Jahr von Hand) | https://www.mynewsdesk.com/de/linkedin-deutschland/pressreleases |
| 25 | presseportal.de (Pressemitteilungen zu Rankings und Siegeln) | news aktuell (dpa-Tochter) | Fundstelle, keine eigene Liste | – | alle | *„Der im Presseportal veröffentlichte Content dient der persönlichen Information der Nutzenden“* (V) → private Lektüre gedeckt; Weiterverwendung *„für eigene Geschäftszwecke“* braucht Genehmigung (betrifft jobradar nicht) | V | nein (Suche von Hand) | https://www.presseportal.de/nutzungsbedingungen |
| 26 | **Statista „Daily Data“-Infografiken** | Statista | jeweils Top 5–15 (z. B. „beliebteste Arbeitgeber“) | ja | je nach Grafik | *„Attribution-NoDerivatives 4.0 International“*, *„royalty-free … license to use and publish the infographics“*; nur unveränderte Grafik (V). Fakten daraus abzulesen ist keine Veränderung der Grafik. | V | nein (von Hand) | https://statista.com/getting-started/publishing-statista-content-daily-data---creative-commons |
| 27 | Randstad Employer Brand Research – Top 10 DE | Randstad | 10 | ja | Beliebtheit | Nutzungsbedingungen ohne Scraping-Klausel (Stichwortsuche, V) → § 44b | T | nein | https://www.randstad.de/ |
| 28 | GitHub: tech_companies_munich | Community | 115 Münchner Tech-Firmen | nein | Startup/Tech (Markierung) | **MIT-Lizenz** (V, GitHub-API); letzte Änderung 2023 | V | ja | https://github.com/rmellojunior/tech_companies_munich |
| 29 | GitHub: hiring-without-whiteboards | Community | ca. 765 Firmen weltweit | nein | „faire Bewerbung“ (Zusatzmerkmal) | MIT (V), aktiv gepflegt (Sept. 2026) | V | ja | https://github.com/poteto/hiring-without-whiteboards |
| 30 | GitHub: remote-jobs-germany | Community | Remote-freundliche Tech-Firmen DE | nein | Zusatzmerkmal | MIT (V), März 2026 | V | ja | https://github.com/danielbayerlein/remote-jobs-germany |

**Hilfsquellen (keine Rankings, aber nützlich, offen):** GLEIF-LEI-Datenbank (CC0, eindeutige Firmen-IDs für Namensabgleich, A) · Bundesagentur „Entgeltatlas“ (Gehalt **je Beruf**, nicht je Firma → nur als Vergleichswert) · Wikidata-Eigenschaften „Sitz“, „Branche“, „Website“ für Zuordnung (CC0).

**Ergebnis Tabelle 1: 30 nutzbare Quellen**, davon **14 voll automatisierbar** (#1–6, 8, 9, 11, 12, 14, 17, 28–30), 6 halbautomatisch, 10 nur von Hand.

---

## 2. Geprüft, aber nicht nutzbar

| Quelle | Grund (Zitat/Beleg) | Status |
|---|---|---|
| Statista-Ranking-Seiten (stern Beste Arbeitgeber, Forbes World's Best Employers, FT Europe's Best Employers, FT 1000, FOCUS Wachstumschampions …) | Statista-AGB Ziff. 3: *„not allowed to access our web pages with the aid of crawlers or comparable technology“*; robots.txt von statista.com: *„Automated data collection, data mining or mirroring (scraping) … without explicit authorization is strictly prohibited“* | V |
| Statista über Bibliothek/Campuszugang | Campus-AGB: *„Das automatisierte Auslesen unserer Daten ist unzulässig“*; Lizenz nur für Lehre/Forschung der Einrichtung | V (vorige Runde) |
| stern.de | robots: `User-agent: __usage_ai-training Disallow: /` (Vorbehalt gegen KI-Training); AGB für uns nicht abrufbar; Inhalte sind ohnehin Statista-Daten | V/T |
| forbes.com (Global 2000, Best Employers) | AGB Ziff. 1.3 erlaubt nur *„personal, non-commercial … use“*, Ziff. 2 verbietet *„incorporate into a database any Content“*, Ziff. 1.1 nennt *„directories, lists“* | V (vorige Runde) |
| ft.com | verbietet KI-/ML-Nutzung und automatisches Lesen | V (vorige Runde) |
| Fortune (Global 500, Fortune 500 Europe) | Abo-Schranke; Bedingungen nicht verifiziert; Wikipedia zeigt nur Top 10 je Jahr | A |
| TIME World's Best Companies | time.com antwortet Programmen mit HTTP 406 (Bot-Abwehr) | V |
| Fast Company Most Innovative, Inc. 5000 Europe | HTTP 403 (Bot-Abwehr) | V |
| LinkedIn (Seiten auf linkedin.com) | robots `Disallow: /`; Nutzervereinbarung verbietet Crawler | V |
| zeit.de (kununu-Gesamtliste) | robots + ausdrücklicher § 44b-Vorbehalt | V (vorige Runde) |
| faz.net (u. a. „Deutschlands begehrteste Arbeitgeber“-Artikel) | robots: *„faz.net expressly reserves the right … for commercial text and data mining (§44 b UrhG)“* und *„use of robots … strictly prohibited“* | V |
| focus.de (Top-Arbeitgeber, Wachstumschampions) | sperrt Crawler | V (vorige Runde) |
| capital.de | HTTP 403 | V |
| Handelsblatt, WirtschaftsWoche (u. a. Weltmarktführer-Champions) | Bezahlschranke; keine freie Gesamtliste gefunden | A |
| Sifted 100 | Abo, HTTP 403 | V (vorige Runde) |
| Levels.fyi | AGB 2(b)(c): kein Lesen *„by any automated means“*; Programmzugriff nur mit *„signed written agreement“* | V (vorige Runde) |
| Glassdoor Best Places to Work (UK 50, US 100) | robots erlaubt `/Award/`, aber AGB: kein *„software or automated agents … scraping, stripping, or mining data“* ohne Erlaubnis | T (AGB-Fassung 2019 + Zweitquelle) |
| Indeed, Comparably, Built In, TeamBlind, Fishbowl, Vault | Bewertungs-/Karriereportale mit Scraping-Verbot (Indeed/Fishbowl = Glassdoor-Konzern); Comparably HTTP 400 | A |
| kununu (Portal selbst, Top-Company-Siegel) | keine veröffentlichte Gesamtliste; Bewertungsportal | A |
| Great Place to Work **international** (greatplacetowork.com: World's Best Workplaces 25, Fortune 100 Best in Europe …) | Bedingungen: *„you will not use any spider, robot or any other automated mechanism“* und Inhalte dürfen nicht *„stored in a retrieval system“* werden | V |
| Brand Finance Global 500 (inkl. kostenlose PDFs) | AGB 15.1.7 *„reproduce, duplicate or copy any part“* verboten; 15.1.8 kein Speichern *„in a database or digital retrieval system“* ohne Erlaubnis (private Nutzung erlaubt nur das Lesen) | V |
| Interbrand Best Global Brands | Bedingungen unter /best-global-brands-terms-and-conditions/ leiten auf Ranking-Seite um, Text nicht lesbar → unklar, daher nicht nutzen | T |
| Kantar BrandZ | Nutzungsbedingungen nicht auffindbar (404) → unklar | T |
| BCG Most Innovative Companies | bcg.com antwortet mit 403 (auch robots.txt) | V |
| Clarivate Top 100 Global Innovators | HTTP 403 | V |
| LexisNexis „Innovation Momentum Top 100“ | Seite lesbar, Bedingungen nicht gefunden → unklar | T |
| MIT Technology Review, CB Insights (AI 100, Fintech 250) | Bedingungen nicht verifiziert; CB Insights ist Bezahl-Datenbank | A |
| Crunchbase | Bezahl-Datenbank, AGB verbieten Scraping | A |
| Dealroom (auch Stadt-Ökosystem-Seiten) | AGB: *„You may not access, query or extract data from the Platform by any automated means, including scraping“*; Daten nur *„for your personal and/or internal business purposes“* im Account | V |
| Y Combinator Company Directory / Top Companies | *„you will not engage in or use any data mining, robots, scraping“* | V |
| PR Newswire | nur *„a single copy … solely for your personal, noncommercial use“*; *„database storage and retrieval“* und Robots verboten | V |
| Business Wire | Bedingungen-URL 404, nicht geprüft → nicht nutzen | T |
| EU-Startups | HTTP 403 | V |
| Leading Employers (Meta-Studie, „Top 1 %“) | Website bricht Verbindung ab (TLS-Reset), Methode laut Firmenmeldungen: Auswertung frei verfügbarer Sekundärdaten; keine Gesamtliste/Bedingungen prüfbar | T |
| Weltmarktführer-Index (Uni St. Gallen) | Daten nur nach Registrierung *„unter Einhaltung gewisser Spielregeln“* → Erlaubnis nötig | V |
| Deloitte Technology Fast 50 Germany | keine Ausgabe nach 2022 gefunden | T |
| Business Punk Start-up-Arbeitgeber | nur Logo-Bilder | V (vorige Runde) |
| Universum Ranking-Portal | Bot-Schutz („Security check“) | V (vorige Runde) |
| Potentialpark | Bedingungen 404; bewertet Karriereseiten, nicht Arbeitgeber | T |
| YouGov/SZ Arbeitgeber-Ranking, F.A.Z.-Institut/ServiceValue | Bedingungen nicht geprüft; YouGov nur Top 10; ServiceValue sehr breit (169 Branchen) → niedriger Nutzen | A |
| Kaggle/Hugging Face „Forbes 2000“/„Fortune 500“-Datensätze | Lizenz des Hochladers kann Forbes-/Fortune-Rechte nicht freigeben (abgeleitete Daten) | A |
| Wikidata als Quelle für Fortune/Forbes-Ränge | **selbst geprüft (V):** Ranking-Angaben (P1352) in Wikidata betreffen fast nur Hochschulen, Sport, Filme; Fortune/Forbes-Ränge für Firmen fehlen praktisch | V |
| StartupBlink, Startup Genome, Deutscher Startup Monitor, Bitkom | ranken Städte/Ökosysteme bzw. sind Umfragen, keine Firmenlisten | A |
| Top 50 Start-ups (Passion4Business) | eingestellt (2021) | V (vorige Runde) |

**Gesamt geprüft:** 30 nutzbar + ca. 45 nicht nutzbar = **rund 75 Quellen**.

---

## 3. Statista-Workarounds – Ergebnis

| Weg | Bewertung |
|---|---|
| (1) Artikel/PDF der Medienpartner (stern, Forbes, FT, TIME, Fortune, Capital, FOCUS, Handelsblatt) | **Nein.** Jeder einzeln geprüft: stern (KI-Vorbehalt, AGB nicht lesbar), Forbes (Datenbank-Verbot), FT (Verbot), TIME (406), Capital/FOCUS (403/gesperrt), Handelsblatt/Fortune (Bezahlschranke). |
| (2) Pressemitteilungen | **Teilweise.** presseportal.de erlaubt Lektüre zur *„persönlichen Information“*. Statista/stern veröffentlichen dort aber nur Sieger/Top-Branchen, nicht die 650 Firmen. Nur Zusatzinfo von Hand. |
| (3) Eigene Meldungen der Ausgezeichneten (z. B. Klosterfrau: Platz 277 von 650) | **Einzeln ja, systematisch nein.** Ein einzelner Fakt ist frei. Wer aber hunderte Meldungen sammelt, baut die Statista-Liste nach; laut EuGH (C-203/02) schützt das Datenbankrecht auch gegen solche *indirekte* Entnahme. Nur als Link auf einzelnen Firmenseiten sinnvoll. |
| (4) Bibliothek/Campus-Zugang | **Nein.** Campus-AGB verbieten automatisches Auslesen; Lizenz gilt für Lehre/Forschung, nicht für eigene Datenbanken. |
| (5) Wikidata/Wikipedia mit Rangangaben | **Kaum.** Wikidata hat (selbst geprüft) praktisch keine Firmen-Ränge aus Statista/Forbes/Fortune. Wikipedia-Fließtexte („Platz 12 bei …“) sind verstreut und zitieren selbst die geschützte Liste. |
| (6) Statista-Gratis-Infografiken | **Ja, klein.** „Daily Data“-Grafiken stehen unter CC BY-ND 4.0 (V). Wenn eine Grafik z. B. „Top 10 Arbeitgeber 2026“ zeigt, darf man die Namen ablesen und mit Quelle nennen. Deckt nur Spitzenplätze ab, von Hand. |
| (7) Private Lizenz kaufen | Statista bietet Siegel-Lizenzen nur **ausgezeichneten Firmen** an (*„Only official awardees … can access and use the award logo“*, V vorige Runde); für Privatleute gibt es nur das Statista-Abo (Preis nicht geprüft, Besitzer will nicht zahlen) – und selbst das Abo verbietet automatisches Auslesen. |
| (8) Kostenlos fragen | Bleibt der einzige saubere Weg zur **ganzen** Liste: eine E-Mail an Statista (Entwurf liegt in `ranking-legal.md`). |
| (9) Ersatz statt Workaround | **Empfohlen.** Was Statista abdeckt, liefern andere legal: Arbeitgeberqualität → Great Place to Work DE (199 Firmen) + Top Employers; Wachstum (FT 1000) → EIC-Geförderte + HTGF + Unicorns; Prestige (Forbes 2000) → R&D Scoreboard 2000 + Börsenindizes. |

---

## 4. Wie viele verschiedene Firmen sind legal erreichbar?

Grobe Schätzung (A), Doppelungen abgezogen:

| Block | Quellen | verschiedene Firmen |
|---|---|---|
| International Prestige/Innovation | R&D Scoreboard 2000 (#1) ∪ Indizes über Wikidata (~1.000, #3) ∪ EPO (~400, #6) ∪ Unicorns (~900, #5) | ca. **3.200–3.600** (Überschneidung Scoreboard/Indizes ca. 600) |
| Deutschland Arbeitgeber/Innovation/Startup | GPTW DE (199, V) ∪ Top Employers DE (~160) ∪ TOP 100 (~280) ∪ CDAX (381) ∪ DPMA Top 50 ∪ EIC DE (~150–300) ∪ HTGF (~800) ∪ Bayerns Best 50 | ca. **1.800–2.200** |
| Von Hand (jährlich) | trendence, Universum, kununu Top 15, LinkedIn, Hurun, Randstad, Statista-Infografiken | ca. 200–300, meist bekannte Großfirmen (überwiegend schon oben enthalten) |
| **Summe** | | **ca. 4.500–5.500** |
| davon realistisch mit Akademiker-Stellen in München/Deutschland | jobradar filtert ohnehin danach, ob die Karriereseite Stellen in DE hat; Annahme 30–45 % der internationalen, 60–80 % der deutschen Firmen | **ca. 2.000–2.800** |

**Fazit:** **Deutlich über 1.000 ist realistisch**, auch konservativ (≥ 1.500). „Größe aus Wikipedia“ wird nicht gebraucht: Die Indexlisten (#3/#4) sind nur ein Baustein von ca. 20 %; den Hauptteil liefern F&E-Ausgaben (Scoreboard), Patente (EPA/DPMA), Förderung/Investoren (EIC, HTGF), Unicorn-Status und Arbeitgeber-Siegel (GPTW, Top Employers, TOP 100).
**Ehrliche Lücke:** Für „Beliebtheit bei Studierenden“ (Universum/trendence) und „Arbeitgeberqualität laut großer Befragung“ (Statista/kununu) gibt es weiterhin **keine** automatisch und legal lesbare Gesamtliste – nur Top 10–50 von Hand.

---

## 5. Empfohlenes Set (13 Quellen) und wie man sie liest

| # | Quelle | Kategorie in jobradar | So lesen | Rhythmus |
|---|---|---|---|---|
| 1 | R&D Scoreboard World 2000 + EU 800 | Innovation (mit Rang) | Excel-Download „Download All Data“, Spalten Firma, Land, Rang, F&E-Ausgaben | 1×/Jahr (Dez.) |
| 2 | EPO Technology Dashboard (Top 100 + Top 25 je Feld) | Innovation (mit Rang) | 2–4 Excel-Dateien, feste URL-Muster `…-epo-technology-dashboard-JJJJ.xlsx` | 1×/Jahr (April) |
| 3 | Wikidata-Indexmitglieder (DAX-Familie, Euro Stoxx 50, S&P 500, Nasdaq-100, FTSE 100, SMI) | Prestige | eine SPARQL-Abfrage, P361 „Teil von“ ohne Enddatum; Gegenprobe Wikipedia | 1×/Quartal |
| 4 | Wikipedia-Unicorn-Liste | Startup/Prestige (Bewertung) | Wikipedia-API (`action=raw`), Tabelle parsen | 1×/Monat |
| 5 | EIC Accelerator via CORDIS | vielversprechende Startups | Bulk-CSV von data.europa.eu, filtern auf EIC-Accelerator-Programmcodes + Land DE | 2×/Jahr |
| 6 | HTGF-Portfolio | Startups (Investor-geprüft) | Portfolio-Seite, höflich 1 Abruf/Monat, eigener User-Agent | 1×/Monat |
| 7 | Great Place to Work DE (15 Listen) | Arbeitgeber | Sitemap `beste-arbeitgeber-li-sitemap.xml` → Seiten → `company-name` | 1×/Monat prüfen, neue Listen im Frühjahr |
| 8 | Top Employers DE | Arbeitgeber | Suchmaske (Skript lädt nach) → halbautomatisch oder 1×/Jahr von Hand | Januar |
| 9 | TOP 100 Innovatoren | Innovation Mittelstand | Seite „Top-Innovatoren JJJJ“ | Juni |
| 10 | US-DOL-LCA-Daten | **Gehalt** (Median je Firma, nur US-Stellen als Indikator) | Excel, nach Arbeitgeber gruppieren, Median nur für Akademiker-Berufe (SOC-Codes) | 1×/Jahr |
| 11 | DPMA Top 50 | Innovation DE | Tabelle 1.14 Jahresbericht | 1×/Jahr (Mai) |
| 12 | trendence + Universum + LinkedIn (Pressemitteilungen) | Beliebtheit | von Hand, Name + Rang + Quelle | 1×/Jahr (Juni/Juli) |
| 13 | Statista-Infografiken (CC BY-ND) | Spitzenplätze großer Statista-Listen | von Hand ablesen | bei Erscheinen |

**Regeln für den Abruf-Code:** eigener User-Agent mit Kontakt-E-Mail · robots.txt vor jedem Abruf prüfen · höchstens 1 Abruf je Quelle und Monat · Rohdaten (heruntergeladene Seiten) nach dem Auslesen löschen (§ 44b Abs. 2) · nur Firmenname, Rang, Listenname, Jahr, Quell-Link speichern · Quelle und Lizenz (CC BY / CC BY-SA) sichtbar anzeigen · Login vor der Website.

---

## 6. Rechtlicher Rahmen (einfach erklärt, keine Rechtsberatung)

**a) Einzelne Fakten sind frei.** „Siemens ist im DAX“ oder „Bosch ist Patent-Anmelder Nr. 1“ ist eine Tatsache. Tatsachen schützt das Urheberrecht nicht.

**b) Die Liste als Ganzes kann geschützt sein – über das Datenbankrecht (§§ 87a ff. UrhG).** Wer viel Geld in das Sammeln und Prüfen von Daten steckt, darf bestimmen, ob andere einen „nach Art oder Umfang wesentlichen Teil“ übernehmen (§ 87b). Auch viele kleine Entnahmen zählen, wenn sie *„wiederholt und systematisch“* sind. Eine komplette Rangliste ist meist ein wesentlicher Teil.

**c) Warum „privat“ allein nicht reicht (§ 87c Abs. 1 Nr. 1).** Die Privatkopie-Ausnahme gilt ausdrücklich *„nicht für eine Datenbank, deren Elemente einzeln mit Hilfe elektronischer Mittel zugänglich sind“* – also nicht für Websites (V, Gesetzestext). Auch eine nur für den Besitzer sichtbare Seite mit Login *speichert* die Daten dauerhaft – das ist eine Vervielfältigung. Der Vorteil „nur ich nutze es“: Es gibt **keine öffentliche Wiedergabe** (§ 15 Abs. 3), das senkt das Risiko deutlich, macht die Speicherung aber nicht automatisch erlaubt.

**d) Text und Data Mining (§ 44b UrhG, für Datenbanken über § 87c Abs. 1 Nr. 4).** Erlaubt sind Kopien *„von rechtmäßig zugänglichen Werken für das Text und Data Mining“*. Die Kopien *„sind zu löschen, wenn sie … nicht mehr erforderlich sind“*. Ein Vorbehalt des Anbieters wirkt bei Online-Inhalten *„nur dann …, wenn er in maschinenlesbarer Form erfolgt“* (V).
- **Was zählt als maschinenlesbar?** Klar: Einträge in robots.txt, TDMRep-Angaben (ein W3C-Vorschlag für TDM-Vorbehalte), Meta-Tags. Strittig: ein Verbot nur in den AGB (natürliche Sprache). **OLG Hamburg, 10.12.2025, 5 U 104/24 (LAION):** Ein AGB-Verbot in natürlicher Sprache war im Fall (Download 2021) **kein** wirksamer maschinenlesbarer Vorbehalt; Revision zum BGH zugelassen, also nicht endgültig (T, über heise/CMS; Urteilstext nicht gelesen).
- **Für jobradar heißt das:** Wo eine AGB das Crawlen verbietet (Statista, Forbes, YC, Dealroom, GPTW international), kann § 44b *vielleicht* trotzdem greifen – aber die AGB kann zusätzlich als **Vertrag** gelten, und der Besitzer will kein Risiko. Deshalb sind diese Quellen hier als „nicht nutzbar“ eingestuft.
- **Offene Frage:** § 44b erlaubt das *Auswerten*. Ob man das *Ergebnis* (Name + Rang einer ganzen Liste) dauerhaft speichern darf, ist ungeklärt. Bei offen lizenzierten Quellen (Tabelle 1a) stellt sich die Frage nicht; bei Quellen nur über § 44b (GPTW DE, TOP 100, HTGF) schon.

**e) Nur verlinken und „steht auf Liste X“ speichern.** Ein **Link** allein ist keine Übernahme (EuGH, Svensson C-466/12, A). Wer aber für hunderte Firmen „steht auf Liste X, Platz Y“ speichert, hat die Liste inhaltlich übernommen – das hilft rechtlich wenig. Es hilft nur, wenn man **wenige** Einträge speichert oder nur „ausgezeichnet: ja/nein“ ohne Rang (weniger als ein wesentlicher Teil ist aber nicht garantiert).

**f) Lizenzkette.** Eine freie Lizenz (Wikipedia, GitHub, Kaggle) kann nur die Rechte freigeben, die der Autor hat. Übernimmt ein Wikipedia-Artikel die Forbes-Top-50, „wäscht“ CC BY-SA die Forbes-Rechte nicht. Unbedenklich sind deshalb vor allem Daten, die **der Herausgeber selbst** frei lizenziert (EU-Kommission, EPA, US-Regierung) oder allgemein bekannte Tatsachen (Indexmitglieder).

**g) Was nie geht:** Bot-Schutz, Login oder Bezahlschranke umgehen; Formulare automatisch ausfüllen; robots.txt missachten.

---

## 7. Was ich nicht verifizieren konnte

- Lizenztext **auf der Datenseite** des R&D Scoreboard (HTTP 429); CC BY 4.0 ist für die Berichte belegt, für die Excel-Daten nur sehr wahrscheinlich.
- Genaue Zahl der EIC-Accelerator-Firmen in Deutschland (nicht abgefragt) und ob der Programmcode sauber filtert.
- Rechtsstatus „Public Domain“ der US-DOL-Daten (allgemeine Regel 17 U.S.C. § 105, nicht auf der Seite selbst gelesen).
- Top Employers: Gesamtzahl DE 2026 und Bedingungen-Seite im Detail.
- TOP 100: genaue Zahl 2026.
- Leading Employers: Website nicht erreichbar.
- Interbrand, Kantar, LexisNexis, Business Wire, Mynewsdesk, YouGov, ServiceValue: Bedingungen nicht vollständig lesbar.
- OLG-Hamburg-Urteil nur über Sekundärquellen; BGH-Entscheidung steht aus.
- Ob Gerichte die robots.txt-Zeile `Content-Signal: ai-input=no` (HTGF) als allgemeinen TDM-Vorbehalt auslegen würden.
- Die Schätzung in Abschnitt 4 ist überschlagen, nicht gezählt (außer GPTW DE: 199 und Wikidata-Indexzahlen: abgefragt).

## Quellen (Auswahl, selbst aufgerufen)
- https://query.wikidata.org/ (SPARQL-Abfragen am 10.11.2026)
- https://www.epo.org/en/terms-and-conditions-use-website-european-patent-office-0 · https://www.epo.org/en/about-us/statistics/data-download
- https://cordis.europa.eu/llms.txt
- https://www.dol.gov/agencies/eta/foreign-labor/performance · https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data · https://gender-pay-gap.service.gov.uk/viewing/download
- https://greatplacetowork.de/beste-arbeitgeber-li-sitemap.xml · https://www.greatplacetowork.com/terms-and-conditions
- https://brandfinance.com/terms-of-use · https://dealroom.co/terms-and-conditions · https://www.ycombinator.com/legal · https://www.prnewswire.com/terms-of-use/ · https://www.presseportal.de/nutzungsbedingungen
- https://www.statista.com/robots.txt · https://www.faz.net/robots.txt · https://www.stern.de/robots.txt · https://www.htgf.de/robots.txt · https://www.htgf.de/portfolio/
- https://www.top100.de/impressum/ · https://www.weltmarktfuehrerindex.de/forschung · https://www.munich-startup.de/startups-and-ecosystem
- https://www.mynewsdesk.com/de/linkedin-deutschland/pressreleases · https://www.linkedin.com/legal/user-agreement
- https://statista.com/getting-started/publishing-statista-content-daily-data---creative-commons
- GitHub-API: rmellojunior/tech_companies_munich, poteto/hiring-without-whiteboards, danielbayerlein/remote-jobs-germany
- Sekundär (T): JRC-Scoreboard-Berichte (publications.jrc.ec.europa.eu), DPMA-Jahresbericht 2025, Glassdoor-AGB 2019, heise/CMS zu OLG Hamburg 5 U 104/24
