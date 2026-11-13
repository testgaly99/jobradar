Fasse die Stellenanzeige zusammen. Antworte nur mit diesem JSON-Objekt:
{"aufgaben": [3 bis 5 Texte], "abschluss": Text oder null, "erfahrung": Text oder null, "muss": [0 bis 3 Texte], "studium": "ja"|"nein"|"unklar", "taetigkeit": "anspruchsvoll"|"einfach", "sprache": "de"|"en"}

Regeln:
- Nur was in der Anzeige steht. Nichts erfinden.
- sprache: Sprache des Fließtexts. Alle Texte in dieser Sprache, nie übersetzen.
- aufgaben: höchstens 5 fachliche, nicht-triviale Aufgaben. Nichts Banales wie präsentieren, mit Kunden sprechen, Teamarbeit. Falls genannt, in einem Punkt: Befristung, Reisetätigkeit, Sicherheitsüberprüfung, Büro-Tage, Gehalt. Nie den Ort.
- abschluss: geforderter Abschluss kurz (auch Ausbildung), sonst null.
- erfahrung: geforderte Berufserfahrung, mit Jahren falls genannt, sonst null.
- muss: weitere Muss-Anforderungen. Nicht Abschluss, Erfahrung oder Sprachen (eigene Felder), nichts Wünschenswertes, kein Charakter.
- studium: "ja", wenn Studium/Bachelor/Master/degree gefordert ist, auch mit "oder vergleichbare Qualifikation". "unklar" bei "Studium oder Ausbildung" oder ohne Angabe bei anspruchsvoller Tätigkeit. "nein", wenn Ausbildung oder kein Abschluss genügt oder die Tätigkeit klar nicht akademisch ist.
- taetigkeit: "anspruchsvoll" = qualifizierte Facharbeit (z. B. Entwicklung, Beratung, Analyse, Vertrieb komplexer Produkte). "einfach" = z. B. Lager, Empfang, Kasse, einfache Handarbeit.

Beispiel:
Data Analyst (m/w/d), befristet auf 2 Jahre. Du baust Dashboards in Power BI und modellierst Absatzprognosen in Python. Abgeschlossenes Studium der Statistik oder vergleichbare Qualifikation, mind. 3 Jahre Erfahrung in der Datenanalyse, sehr gute SQL-Kenntnisse, fließend Deutsch. 3 Tage pro Woche im Büro.
{"aufgaben": ["Dashboards in Power BI bauen", "Absatzprognosen in Python modellieren", "Befristet auf 2 Jahre, 3 Büro-Tage pro Woche"], "abschluss": "Studium Statistik o. ä.", "erfahrung": "3+ Jahre Datenanalyse", "muss": ["Sehr gute SQL-Kenntnisse"], "studium": "ja", "taetigkeit": "anspruchsvoll", "sprache": "de"}
