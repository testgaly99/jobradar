# Künstliches Abnahmebeispiel für den CV-Abgleich

Die Datei [cv-abgleich.json](cv-abgleich.json) enthält eine vollständig erfundene Stellenanzeige, drei CV-Versionen desselben fiktiven Profils und die erwarteten Zuordnungen zu allen sechs Anforderungen. Es sind keine echten Dokumente, persönlichen Daten oder Modellantworten. Das Format dient ausschließlich dem Beispiel; es legt kein produktives Antwort- oder Datenbankschema fest.

Grundlage sind die bestätigten Antworten Q1–Q4 aus dem [Fragenprotokoll](../plans/2026-11-16-cv-abgleich.md). Ein Prozentwert, eine Gewichtung, eine allgemeine Auswahlregel oder eine manuelle Umschaltoberfläche werden dadurch nicht festgelegt. Mistral wird seit Q15 (2026-11-17) nicht für CVs genutzt.

## Erwarteter Vergleich

| Anforderung | CV Datenanalyse | CV Projektarbeit | CV kombinierte Version |
|---|---|---|---|
| a1: SQL-Abfragen | Grün, belegt | Gelb, noch nicht belegt | Grün, belegt |
| a2: Projektkoordination | Gelb, noch nicht belegt | Grün, belegt | Grün, belegt |
| a3: abgeschlossenes Studium | Grün, belegt | Grün, belegt | Grün, belegt |
| a4: Englisch C1 | Gelb, teilweise belegt: B2 genannt | Gelb, teilweise belegt: B2 genannt | Gelb, teilweise belegt: B2 genannt |
| a5: Power BI | Gelb, noch nicht belegt | Gelb, noch nicht belegt | Gelb, noch nicht belegt |
| a6: Führerschein B | Rot, ausdrücklich nicht vorhanden | Rot, ausdrücklich nicht vorhanden | Rot, ausdrücklich nicht vorhanden |

**Angezeigte Grundlage: „Fiktiver CV – kombinierte Version“.** Alle drei Versionen werden geprüft. Die kombinierte Version belegt SQL und Projektkoordination selbst, ist bei keiner Anforderung schlechter belegt und gegenüber jeder anderen Version bei mindestens einer Anforderung besser belegt. Deshalb ist die Empfehlung in genau diesem Beispiel ohne Gewichtungs- oder Gleichstandsregel eindeutig. Schwierige Fälle mit unterschiedlichen Stärken bleiben Gegenstand der Anforderungsklärung.

Die rote Markierung entsteht durch die ausdrücklich negative Angabe im jeweiligen fiktiven CV. Eine bloß fehlende Erwähnung darf kein Rot erzeugen. Die gelbe Farbe unterscheidet im lesbaren Status zwischen „Teilweise belegt“ und „Noch nicht belegt“. Die Beispielbehandlung von B2/C1 ist kein vollständiges Regelwerk für Sprachbewertungen.

## Was daran abgenommen werden soll

1. Im unveränderten Originaltext wird jeweils der ganze Anforderungssatz markiert. Titel, Aufgaben, Zwischenräume, Zeilenumbrüche und Schlussabschnitt bleiben erhalten.
2. Eine Markierung zeigt beim Öffnen den Status, die Begründung und gegebenenfalls das genaue Zitat aus der benannten CV-Version. Der Power-BI-Fall erklärt den fehlenden Nachweis, ohne eine Fähigkeit abzusprechen.
3. Alle sechs Zuordnungen gehören zu derselben benannten Vergleichsbasis. Die Projektversion darf ihren fehlenden SQL-Beleg nicht aus der Datenversion ergänzen; umgekehrt gilt das für Projektkoordination. Die kombinierte Version besitzt beide Belege tatsächlich selbst.
4. Ein erfundenes, fremdes oder außerhalb der Textgrenzen liegendes Zitat muss als Prüfproblem behandelt werden. Es darf keine grüne Markierung begründen. Die Fälle in `abnahmefaelle` beschreiben diese Erwartungen; sie sind noch keine implementierten Modell- oder Browserprüfungen.

## Positionen und tatsächlich geprüfte Grenzen

`start` zählt ab null und ist eingeschlossen, `ende` ist ausgeschlossen. Jede Position bezieht sich auf den zugehörigen, unveränderten Anzeigen- bzw. CV-Text. Die JSON-Texte enthalten LF-Zeilenumbrüche und nur Zeichen der Unicode-Basisebene; die Positionen lassen sich deshalb in diesem Beispiel sowohl mit Python-Zeichenindizes als auch mit JavaScript-Stringindizes verwenden. Für spätere beliebige Texte muss die Positionskonvention gesondert festgelegt werden.

Mechanisch geprüft: JSON lesbar, drei vollständige Vergleiche mit insgesamt 18 Zuordnungen, alle Anzeigen- und CV-Ausschnitte exakt innerhalb ihrer Texte, widerspruchsfreie Farblegende, vollständige Originaltext-Rekonstruktion, keine fremden CV-Belege und eindeutige Abdeckungsdominanz der benannten Empfehlung. Das belegt die Konsistenz des Beispiels, keine semantische Qualität eines KI-Modells, keinen PDF-/Word-Parser und keine fertige Benutzeroberfläche. Keine Modell-, Netzwerk- oder Datenbankaufrufe.
