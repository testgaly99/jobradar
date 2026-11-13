Fasse die Stellenanzeige zusammen. Antworte nur mit diesem JSON-Objekt:
{"sprache": "de"|"en", "aufgaben": [3 bis 5 Texte], "rahmen": [0 bis 4 Texte], "abschluss": Text oder null, "erfahrung": Text oder null, "muss": [0 bis 3 Texte], "benefits": [0 bis 2 Texte], "studium": "ja"|"nein"|"unklar", "taetigkeit": "anspruchsvoll"|"einfach"}

Regeln:
- Nur was in der Anzeige steht. Nichts erfinden. Nie einen Ort oder eine Stadt, in keinem Feld.
- sprache: Sprache des Fließtexts (nicht des Titels). ALLE Texte in dieser Sprache. Nie übersetzen.
- aufgaben: 3 bis 5 fachliche Aufgaben aus dem Arbeitsalltag. Nichts Banales (präsentieren, Termine, Teamarbeit, Seminare besuchen).
- rahmen: NUR diese Arten, wenn genannt: befristet, Reisen, Sicherheitsüberprüfung, feste Zahl Büro-Tage, Gehalt. Nie: hybrid ohne Tageszahl, Vollzeit, unbefristet, Urlaubstage, Flexibilität, Hintergrundprüfung (background check), Ort. Sonst leer.
- abschluss: geforderter Abschluss kurz, auch Berufsausbildung, sonst null.
- erfahrung: jede geforderte Berufserfahrung in einer Rolle oder einem Fachgebiet, mit Jahren falls genannt, auch ohne Jahre ("Have delivered…", "Berufserfahrung im Vertrieb"). Nur das Pflicht-Teil, ohne "idealerweise …". null, wenn keine gefordert.
- muss: bis zu 3 fachliche PFLICHT-Kenntnisse: Wissen, Werkzeuge, Technologien, Führerschein. Lieber leer als falsch. NIE in muss:
  - Sprachen (Deutsch, Englisch, fluent, Sprachkenntnisse, C1) – auch nicht, wenn Pflicht
  - Soft Skills und Charakter (Kommunikation, Auftreten, Verhandlung, business sense, Mindset, Arbeitsweise)
  - Erfolge und Erfahrung (track record, Quote, Rollen-Erfahrung) – die gehören in erfahrung
  - alles mit nice to have, ideally, a plus, preferred, wünschenswert, von Vorteil, idealerweise; bei "X, idealerweise Y" nur X nennen
  - Abschluss, Rahmen
- benefits: höchstens 2, NUR: 4-Tage-Woche, Sabbatical, Mitarbeiterbeteiligung (equity, VSOP), mehr als 30 Urlaubstage, außergewöhnlich lange bezahlte Elternzeit. Alles andere nie. Sonst leer.
- studium: "ja", sobald ein Studium/Bachelor/Master/degree genannt ist, auch "oder Ausbildung". "unklar", wenn die Anzeige nichts zum Abschluss sagt und die Tätigkeit anspruchsvoll ist. "nein" NUR, wenn ausschließlich Ausbildung oder kein Abschluss verlangt wird oder die Tätigkeit einfach ist. Steht nichts zum Abschluss da: NIE "nein".
- taetigkeit: "anspruchsvoll" = qualifizierte Facharbeit (Entwicklung, Beratung, Analyse, Vertrieb). "einfach" = Lager, Empfang, Kasse, einfache Handarbeit.

Beispiel 1:
Data Analyst (m/w/d), befristet auf 2 Jahre, Vollzeit, unbefristet verlängerbar. Du baust Dashboards in Power BI, modellierst Absatzprognosen in Python und bereinigst Vertriebsdaten. Studium der Statistik oder kaufmännische Ausbildung, mind. 3 Jahre Erfahrung in der Datenanalyse, sehr gute SQL-Kenntnisse, idealerweise dbt, fließend Deutsch (C1), Verhandlungsgeschick. 3 Tage pro Woche im Büro in Köln. Wir bieten Obst, Jobrad und 40 Urlaubstage.
{"sprache": "de", "aufgaben": ["Dashboards in Power BI bauen", "Absatzprognosen in Python modellieren", "Vertriebsdaten bereinigen"], "rahmen": ["Befristet auf 2 Jahre", "3 Büro-Tage pro Woche"], "abschluss": "Studium Statistik oder kaufm. Ausbildung", "erfahrung": "3+ Jahre Datenanalyse", "muss": ["Sehr gute SQL-Kenntnisse"], "benefits": ["40 Urlaubstage"], "studium": "ja", "taetigkeit": "anspruchsvoll"}

Beispiel 2:
Account Executive. You will run enterprise sales cycles, build business cases for CFOs and forecast pipeline in Salesforce. 5+ years of B2B SaaS sales, a track record of exceeding quota, hands-on MEDDICC, fluent German and English, strong business sense and communication skills. Hybrid work, background check required, travel to customers. Perks: competitive salary, pension plan, team events, equity.
{"sprache": "en", "aufgaben": ["Run enterprise sales cycles", "Build business cases for CFOs", "Forecast pipeline in Salesforce"], "rahmen": ["Travel to customers"], "abschluss": null, "erfahrung": "5+ years B2B SaaS sales with quota overachievement", "muss": ["Hands-on MEDDICC"], "benefits": ["Equity"], "studium": "unklar", "taetigkeit": "anspruchsvoll"}

Beispiel 3:
Production Technician. Assemble and test drones and document each production step. Completed vocational training in electronics. Good soldering skills, some initial experience in production. Benefits: company pension, bike leasing.
{"sprache": "en", "aufgaben": ["Assemble drones", "Test drones", "Document production steps"], "rahmen": [], "abschluss": "Vocational training in electronics", "erfahrung": "Initial experience in production", "muss": ["Good soldering skills"], "benefits": [], "studium": "nein", "taetigkeit": "einfach"}
