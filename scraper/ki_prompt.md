Fasse die Stellenanzeige zusammen. Antworte nur mit diesem JSON-Objekt:
{"sprache": "de"|"en", "aufgaben": [3 bis 5 Texte], "abschluss": Text oder null, "erfahrung": Text oder null, "muss": [0 bis 3 Texte], "studium": "ja"|"nein"|"unklar", "taetigkeit": "anspruchsvoll"|"einfach"}

Regeln:
- Nur was in der Anzeige steht. Nichts erfinden.
- sprache: Sprache des Fließtexts (nicht des Titels). ALLE Texte in dieser Sprache: englische Anzeige = englische Texte. Nie übersetzen.
- aufgaben: höchstens 5 fachliche, nicht-triviale Aufgaben. Nichts Banales wie präsentieren, Termine vereinbaren, mit Kunden sprechen, Teamarbeit, Unternehmen repräsentieren. Falls genannt, in einem Punkt: Befristung, Reisetätigkeit, Sicherheitsüberprüfung, Büro-Tage, Gehalt. Nie den Ort.
- abschluss: geforderter Abschluss kurz (auch Ausbildung), sonst null.
- erfahrung: jede geforderte Berufserfahrung, mit Jahren falls genannt, auch ohne Jahre ("mehrjährig", "erste Erfahrung"), sonst null.
- muss: weitere fachliche Muss-Anforderungen (Wissen, Werkzeuge). NIE Sprachkenntnisse (Deutsch, Englisch, fluent English), NIE Erfahrung oder Abschluss (eigene Felder), nichts Wünschenswertes, keine Charaktereigenschaften (Auftreten, Integrität, Arbeitsweise). Lieber leer.
- studium: "ja", wenn Studium/Bachelor/Master/degree Pflicht ist, auch mit "oder vergleichbare Qualifikation". "unklar" bei "Studium oder Ausbildung" (nie "ja") und wenn die Anzeige keinen Abschluss nennt, die Tätigkeit aber anspruchsvoll ist. Keine Angabe heißt NICHT "nein". "nein" nur, wenn eine Ausbildung oder kein Abschluss genügt oder die Tätigkeit einfach ist.
- taetigkeit: "anspruchsvoll" = qualifizierte Facharbeit (z. B. Entwicklung, Beratung, Analyse, Vertrieb komplexer Produkte). "einfach" = z. B. Lager, Empfang, Kasse, einfache Handarbeit.

Beispiel:
Data Analyst (m/w/d), befristet auf 2 Jahre. Du baust Dashboards in Power BI und modellierst Absatzprognosen in Python. Abgeschlossenes Studium der Statistik oder vergleichbare Qualifikation, mind. 3 Jahre Erfahrung in der Datenanalyse, sehr gute SQL-Kenntnisse, fließend Deutsch. Teamgeist. 3 Tage pro Woche im Büro.
{"sprache": "de", "aufgaben": ["Dashboards in Power BI bauen", "Absatzprognosen in Python modellieren", "Befristet auf 2 Jahre, 3 Büro-Tage pro Woche"], "abschluss": "Studium Statistik o. ä.", "erfahrung": "3+ Jahre Datenanalyse", "muss": ["Sehr gute SQL-Kenntnisse"], "studium": "ja", "taetigkeit": "anspruchsvoll"}
