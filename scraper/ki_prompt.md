Fasse die Stellenanzeige zusammen. Antworte nur mit diesem JSON-Objekt:
{"sprache": "de"|"en", "aufgaben": [3 bis 5 Texte], "rahmen": [0 bis 4 Texte], "abschluss": Text oder null, "erfahrung": Text oder null, "muss": [0 bis 3 Texte], "benefits": [0 bis 2 Texte], "studium": "ja"|"nein"|"unklar", "taetigkeit": "anspruchsvoll"|"einfach"}

Regeln:
- Nur was in der Anzeige steht. Nichts erfinden. Nie einen Ort oder eine Stadt, in keinem Feld.
- sprache: Sprache des Fließtexts (nicht des Titels). ALLE Texte in dieser Sprache: englische Anzeige = englische Texte. Nie übersetzen.
- aufgaben: fachliche Aufgaben aus dem Arbeitsalltag. Nichts Banales wie präsentieren, Termine vereinbaren, mit Kunden sprechen, Teamarbeit. Kein Rahmen.
- rahmen: kurz, nur wenn genannt (auch im Profil): Befristung, Reisetätigkeit, Sicherheitsüberprüfung, Büro-Tage/Präsenz, Gehalt. Sonst leer.
- abschluss: geforderter Abschluss kurz (auch Ausbildung), sonst null.
- erfahrung: geforderte Berufserfahrung kurz (Rolle oder Bereich), mit Jahren falls genannt, auch ohne Jahre ("mehrjährig", "erste Erfahrung"). Nur wünschenswert oder nicht genannt: null.
- muss: bis zu 3 weitere fachliche PFLICHT-Kenntnisse (Wissen, Werkzeuge, Führerschein). Nie hinein: alles mit nice to have, ideally, a plus, preferred, wünschenswert, von Vorteil, vorteilhaft, idealerweise; Sprachkenntnisse; Abschluss; Berufserfahrung; Rahmen; Soft Skills und Charakter (Auftreten, Verhandlungsgeschick, Kommunikation, Teamgeist, Arbeitsweise, Mindset). Lieber leer.
- benefits: höchstens 2 herausragende Vorteile, z. B. 4-Tage-Woche, Sabbatical, Mitarbeiterbeteiligung, deutlich mehr als 30 Urlaubstage. Nie Standard wie Obst, Laptop, Team-Events, Weiterbildung, flexible Zeiten. Lieber leer.
- studium: "ja", sobald die Anzeige ein Studium/Bachelor/Master/degree nennt, auch mit "oder vergleichbare Qualifikation" oder "oder Ausbildung". "unklar", wenn die Anzeige nichts zum Abschluss sagt und die Tätigkeit anspruchsvoll ist. "nein" nur, wenn ausschließlich eine Ausbildung oder kein Abschluss verlangt wird oder die Tätigkeit einfach ist. Keine Angabe ist NIE "nein".
- taetigkeit: "anspruchsvoll" = qualifizierte Facharbeit (z. B. Entwicklung, Beratung, Analyse, Vertrieb komplexer Produkte). "einfach" = z. B. Lager, Empfang, Kasse, einfache Handarbeit.

Beispiel 1:
Data Analyst (m/w/d), befristet auf 2 Jahre. Du baust Dashboards in Power BI, modellierst Absatzprognosen in Python und bereinigst Vertriebsdaten. Studium der Statistik oder kaufmännische Ausbildung, mind. 3 Jahre Erfahrung in der Datenanalyse, sehr gute SQL-Kenntnisse, fließend Deutsch, Verhandlungsgeschick. Wünschenswert: Tableau. 3 Tage pro Woche im Büro. Wir bieten Obst, Laptop und 40 Urlaubstage.
{"sprache": "de", "aufgaben": ["Dashboards in Power BI bauen", "Absatzprognosen in Python modellieren", "Vertriebsdaten bereinigen"], "rahmen": ["Befristet auf 2 Jahre", "3 Büro-Tage pro Woche"], "abschluss": "Studium Statistik oder kaufm. Ausbildung", "erfahrung": "3+ Jahre Datenanalyse", "muss": ["Sehr gute SQL-Kenntnisse"], "benefits": ["40 Urlaubstage"], "studium": "ja", "taetigkeit": "anspruchsvoll"}

Beispiel 2:
Backend Engineer. You will design REST APIs in Go, run PostgreSQL on AWS, build CI pipelines, own on-call rotations and present at demo days. You have 5+ years of backend experience, strong Kubernetes skills, fluent English, an ownership mindset, and can travel and obtain security clearance. Nice to have: Rust. Hybrid, 2 days a week in our office. Perks: team events, 4-day week.
{"sprache": "en", "aufgaben": ["Design REST APIs in Go", "Run PostgreSQL on AWS", "Build CI pipelines", "Own on-call rotations"], "rahmen": ["Travel", "Security clearance", "2 office days per week"], "abschluss": null, "erfahrung": "5+ years backend development", "muss": ["Strong Kubernetes skills"], "benefits": ["4-day week"], "studium": "unklar", "taetigkeit": "anspruchsvoll"}
