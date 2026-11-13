Fasse die Stellenanzeige zusammen. Antworte nur mit diesem JSON-Objekt:
{"sprache": "de"|"en", "aufgaben": [3 bis 5 Texte], "abschluss": Text oder null, "erfahrung": Text oder null, "muss": [0 bis 3 Texte], "studium": "ja"|"nein"|"unklar", "taetigkeit": "anspruchsvoll"|"einfach"}

Regeln:
- Nur was in der Anzeige steht. Nichts erfinden.
- sprache: Sprache des Fließtexts (nicht des Titels). ALLE Texte (auch abschluss, erfahrung, muss) in dieser Sprache: englische Anzeige = englische Texte. Nie übersetzen.
- aufgaben: 3 bis 5 fachliche Aufgaben aus dem Arbeitsalltag. Nichts Banales wie präsentieren, Termine vereinbaren, mit Kunden sprechen, Teamarbeit, Unternehmen repräsentieren. Nennt die Anzeige irgendwo (auch im Profil) Befristung, Reisen/Reisebereitschaft, Sicherheitsüberprüfung, Büro-Tage oder Gehalt, ist der letzte Punkt genau das. Nie den Ort.
- abschluss: geforderter Abschluss kurz (auch Ausbildung), sonst null.
- erfahrung: geforderte Berufserfahrung kurz (Rolle oder Bereich), mit Jahren falls genannt, auch ohne Jahre ("mehrjährig", "erste Erfahrung"), sonst null.
- muss: bis zu 3 weitere fachliche Pflicht-Anforderungen (Wissen, Werkzeuge, Führerschein). NIE: Sprachkenntnisse, Abschluss, Berufserfahrung, Reisen, Sicherheitsüberprüfung, Wünschenswertes ("nice to have", "ideally", "von Vorteil"), Soft Skills und Charakter (Auftreten, Verhandlungsgeschick, Kommunikation, Teamgeist, Arbeitsweise). Lieber leer.
- studium: "ja", sobald die Anzeige ein Studium/Bachelor/Master/degree nennt, auch mit "oder vergleichbare Qualifikation" oder "oder Ausbildung". "unklar", wenn die Anzeige nichts zum Abschluss sagt und die Tätigkeit anspruchsvoll ist. "nein" nur, wenn ausschließlich eine Ausbildung oder kein Abschluss verlangt wird oder die Tätigkeit einfach ist. Keine Angabe ist NIE "nein".
- taetigkeit: "anspruchsvoll" = qualifizierte Facharbeit (z. B. Entwicklung, Beratung, Analyse, Vertrieb komplexer Produkte). "einfach" = z. B. Lager, Empfang, Kasse, einfache Handarbeit.

Beispiel 1:
Data Analyst (m/w/d), befristet auf 2 Jahre. Du baust Dashboards in Power BI, modellierst Absatzprognosen in Python und bereinigst Vertriebsdaten. Studium der Statistik oder kaufmännische Ausbildung, mind. 3 Jahre Erfahrung in der Datenanalyse, sehr gute SQL-Kenntnisse, fließend Deutsch, Verhandlungsgeschick. 3 Tage pro Woche im Büro.
{"sprache": "de", "aufgaben": ["Dashboards in Power BI bauen", "Absatzprognosen in Python modellieren", "Vertriebsdaten bereinigen", "Befristet auf 2 Jahre, 3 Büro-Tage pro Woche"], "abschluss": "Studium Statistik oder kaufm. Ausbildung", "erfahrung": "3+ Jahre Datenanalyse", "muss": ["Sehr gute SQL-Kenntnisse"], "studium": "ja", "taetigkeit": "anspruchsvoll"}

Beispiel 2:
Backend Engineer. You will design REST APIs in Go, run PostgreSQL on AWS and own on-call rotations. You have 5+ years of backend experience, strong Kubernetes skills, fluent English and German, an ownership mindset, and are willing to travel and obtain security clearance. Nice to have: Rust.
{"sprache": "en", "aufgaben": ["Design REST APIs in Go", "Run PostgreSQL on AWS", "Take part in on-call rotations", "Travel and security clearance required"], "abschluss": null, "erfahrung": "5+ years backend development", "muss": ["Strong Kubernetes skills"], "studium": "unklar", "taetigkeit": "anspruchsvoll"}
