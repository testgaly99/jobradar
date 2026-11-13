Fasse die Stellenanzeige zusammen. Antworte nur mit diesem JSON-Objekt:
{"sprache": "de"|"en", "aufgaben": [3 bis 5 Texte], "abschluss": Text oder null, "erfahrung": Text oder null, "muss": [0 bis 3 Texte], "studium": "ja"|"nein"|"unklar", "taetigkeit": "anspruchsvoll"|"einfach"}

Regeln:
- Nur was in der Anzeige steht. Nichts erfinden.
- sprache: Sprache des Fließtexts (nicht des Titels). ALLE Texte in dieser Sprache: englische Anzeige = englische Texte. Nie übersetzen.
- aufgaben: fachliche Aufgaben aus dem Arbeitsalltag. Nichts Banales wie präsentieren, Termine vereinbaren, mit Kunden sprechen, Teamarbeit. Rahmen = Reisen, Sicherheitsüberprüfung, Befristung, Büro-Tage/Hybrid, Gehalt. Nennt die Anzeige irgendwo Rahmen, dann höchstens 4 Aufgaben plus ein letzter Punkt mit dem Rahmen. Nie einen Ort oder eine Stadt.
- abschluss: geforderter Abschluss kurz (auch Ausbildung), sonst null.
- erfahrung: geforderte Berufserfahrung kurz (Rolle oder Bereich), mit Jahren falls genannt, auch ohne Jahre ("mehrjährig", "erste Erfahrung"). Nur wünschenswert oder nicht genannt: null.
- muss: bis zu 3 weitere fachliche PFLICHT-Kenntnisse (Wissen, Werkzeuge, Führerschein). Nie hinein: alles mit nice to have, ideally, a plus, preferred, wünschenswert, von Vorteil, vorteilhaft, idealerweise; Sprachkenntnisse; Abschluss; Berufserfahrung; Rahmen; Soft Skills und Charakter (Auftreten, Verhandlungsgeschick, Kommunikation, Teamgeist, Arbeitsweise, Mindset). Lieber leer.
- studium: "ja", sobald die Anzeige ein Studium/Bachelor/Master/degree nennt, auch mit "oder vergleichbare Qualifikation" oder "oder Ausbildung". "unklar", wenn die Anzeige nichts zum Abschluss sagt und die Tätigkeit anspruchsvoll ist. "nein" nur, wenn ausschließlich eine Ausbildung oder kein Abschluss verlangt wird oder die Tätigkeit einfach ist. Keine Angabe ist NIE "nein".
- taetigkeit: "anspruchsvoll" = qualifizierte Facharbeit (z. B. Entwicklung, Beratung, Analyse, Vertrieb komplexer Produkte). "einfach" = z. B. Lager, Empfang, Kasse, einfache Handarbeit.

Beispiel 1:
Data Analyst (m/w/d), befristet auf 2 Jahre. Du baust Dashboards in Power BI, modellierst Absatzprognosen in Python und bereinigst Vertriebsdaten. Studium der Statistik oder kaufmännische Ausbildung, mind. 3 Jahre Erfahrung in der Datenanalyse, sehr gute SQL-Kenntnisse, fließend Deutsch, Verhandlungsgeschick. Wünschenswert: Tableau. 3 Tage pro Woche im Büro.
{"sprache": "de", "aufgaben": ["Dashboards in Power BI bauen", "Absatzprognosen in Python modellieren", "Vertriebsdaten bereinigen", "Befristet auf 2 Jahre, 3 Büro-Tage pro Woche"], "abschluss": "Studium Statistik oder kaufm. Ausbildung", "erfahrung": "3+ Jahre Datenanalyse", "muss": ["Sehr gute SQL-Kenntnisse"], "studium": "ja", "taetigkeit": "anspruchsvoll"}

Beispiel 2:
Backend Engineer. You will design REST APIs in Go, run PostgreSQL on AWS, build CI pipelines, own on-call rotations and present at demo days. You have 5+ years of backend experience, strong Kubernetes skills, fluent English, an ownership mindset, and can travel and obtain security clearance. Nice to have: Rust. Hybrid, 2 days a week in our Munich office.
{"sprache": "en", "aufgaben": ["Design REST APIs in Go", "Run PostgreSQL on AWS", "Build CI pipelines", "Own on-call rotations", "Travel, security clearance, 2 office days per week"], "abschluss": null, "erfahrung": "5+ years backend development", "muss": ["Strong Kubernetes skills"], "studium": "unklar", "taetigkeit": "anspruchsvoll"}
