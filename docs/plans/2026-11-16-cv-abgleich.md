# CV-Abgleich (Phase 6): Fragen, Anforderungen, Entwurf und Vorarbeit

Stand: 2026-11-17. **Laufende Anforderungsklärung, kein freigegebener Bauplan.** Zusammengeführt am 2026-11-17 aus `2026-11-16-cv-abgleich-fragen.md` (Fragenprotokoll), `2026-11-16-cv-abgleich-klaerung.md` (Anforderungen/Entwurf), dem CV-Teil von `2026-11-16-browser-cv-abnahme.md` (Paket 22) und dem Phase-6-Teil von `docs/vorarbeit-spaetere-phasen.md`; alte Fassungen in Git. Ursprüngliche Bestandsbasis `c2a0592`. Reihenfolge laut Q20: erst Groq-Paket und Hochladen abschließen, **dann die offenen CV-Fragen klären** (Abschnitt „Offene Zweige“). Es wurde noch kein CV-Abgleich implementiert oder freigegeben; keine CVs gelesen oder versendet.

## Kontingent und Abo-Bedingungen (geprüft 2026-11-19, erledigt den offenen Auftrag aus Q15)

### Bedingungen (nur offizielle Quellen, Prüftag 2026-11-19)

- **Verbraucher-AGB** ([Consumer Terms](https://www.anthropic.com/legal/consumer-terms), gültig seit 8. Okt. 2025, Abschnitt 3 Nr. 7): verboten ist Zugriff „through automated or non-human means, whether through a bot, script, or otherwise“, **außer** mit API-Key „or where we otherwise explicitly permit it“.
- **Ausdrücklich erlaubt** ist der Abo-Token für Skripte: `claude setup-token` erzeugt einen ein Jahr gültigen Token für CI und Skripte, der über das eigene Abo abrechnet ([Authentication](https://code.claude.com/docs/en/authentication), [GitHub Actions](https://code.claude.com/docs/en/github-actions)).
- **Grenzen** ([Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)): Abo-Anmeldung ist für „ordinary use of Claude Code and other native Anthropic applications“ gedacht; Produkte mit dem **Agent SDK** sollen einen API-Key nutzen; verboten ist, Anfragen „through Free, Pro, Max, or Ultra plan credentials on behalf of their users“ zu leiten. Erlaubt bleibt, dass sich ein Nutzer im **unveränderten Claude-Code-Programm** mit dem eigenen Abo anmeldet. Die beworbenen Grenzen gehen von „ordinary, individual usage“ aus.
- **Kontodaten** (Consumer Terms, Abschnitt 2): Zugangsdaten nicht weitergeben, Konto niemandem sonst verfügbar machen.
- **Training und Aufbewahrung** ([Ankündigung](https://www.anthropic.com/news/updates-to-our-consumer-terms), [Aufbewahrung](https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data)): Pro-Daten (auch Claude Code) dienen nur zum Training, wenn die Einstellung „Modell verbessern“ an ist; dann bis 5 Jahre Aufbewahrung, sonst 30 Tage.
- **Grenzen des Abos** ([Nutzungsgrenzen](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work), [Claude Code mit Pro](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)): 5-Stunden-Fenster ab der ersten Anfrage plus Wochengrenze über alle Modelle; Claude Code, claude.ai und Desktop teilen dasselbe Kontingent. Mit eingeschalteten **Usage Credits** wird nach Erreichen der Grenze kostenpflichtig weitergerechnet. Grenzen in Tokens veröffentlicht Anthropic nicht; Stand unter Settings → Usage.

### Folgen für den Bau (Claudes Ableitung, keine Rechtsberatung)

1. Der Nachtlauf ruft das **unveränderte Claude-Code-Programm** (`claude -p`, Modell Haiku) oder die offizielle `claude-code-action` auf – **nicht** das Agent SDK und keine eigenen API-Aufrufe mit dem Abo-Token.
2. Nur für den Admin und nur mit seinen eigenen Daten (wie Q32–Q38). Andere Nutzer nie über den Abo-Token (bleibt: kostenloser Abgleich im Browser).
3. Der Workflow läuft im **privaten Repo** `jobradar-privat`: Logs öffentlicher Repos sind öffentlich; CV-Text, Anzeigentext und Ergebnisse werden nie ins Log geschrieben.
4. Am Abo-Limit (Fehlermeldung von Claude Code) bricht der Lauf geordnet ab; der Rest wartet auf die nächste Nacht.
5. Nutzer-To-dos vor dem ersten Lauf: in claude.ai **Settings → Privacy** „Modell verbessern“ aus; **Settings → Usage** prüfen, dass Usage Credits aus sind (sonst würde am Limit bezahlt).

### Mengenschätzung (Q101/Q102, Nutzer 2026-11-19: 10–30 gemerkte Stellen pro Woche, 5 oder mehr CV-Versionen)

Annahmen (Claude, grob): Anzeige ≈ 2.500 Tokens, CV-Version ≈ 1.500 Tokens Text (Scans werden einmal beim Hochladen ausgelesen und als korrigierbarer Text gespeichert, A12), Anleitung ≈ 1.000, Antwort je Stelle ≈ 1.500 (je Anforderung Farbe, Beleg und beste Version – nicht je Version getrennt). **Fester Aufschlag je Claude-Code-Aufruf** (Systemanweisung, Werkzeuge) geschätzt 15.000–20.000 Tokens, teils aus dem Zwischenspeicher.

| Fall | Stellen | Tokens etwa |
|---|---|---|
| Ein Aufruf je Stelle | 1 | 20.000 + 9.000 (6 CVs) + 4.000 ≈ **33.000** |
| Fünf Stellen je Aufruf (CVs einmal) | 5 | 20.000 + 9.000 + 5 × 4.000 ≈ 49.000 → **≈ 10.000 je Stelle** |
| Normale Woche (≈ 20 gemerkte + Stichwort-Treffer, ≈ 40) | 40 | **≈ 0,4 Mio.** |
| Schlimmster Fall (50 pro Nacht, 7 Nächte) | 350 | **≈ 3,5 Mio.** |

Dank A11 werden nur neue oder geänderte Stellen gerechnet. **Entscheidung für den Plan:** mehrere Stellen pro Aufruf bündeln (Aufschlag und CVs nur einmal). Wie viel Prozent der Wochengrenze das ist, lässt sich ohne veröffentlichte Zahlen nicht berechnen: **Halte-Punkt im Plan** – mit künstlichem CV 5 Abgleiche laufen lassen und die Anzeige unter Settings → Usage vorher/nachher ablesen; danach Grenze pro Nacht (heute 50, Q30) bestätigen oder senken.

## Neu am 2026-11-17 (vorrangig vor älteren Abschnitten)

- **Q15 (Nutzerantwort „a). Analysiere aber, inwieweit das mein Kontingent aufbrauchen wird.“):** CV-Daten laufen **nur über Claude**; Mistral wird **nicht** für CVs genutzt. Damit sind A1 (Mistral-Option), A8/Q5 und der Mistral-Zweig unten überholt; die Mistral-Anbieterfakten bleiben nur als Material für die Phase-4-Prüfung (öffentliche Anzeigentexte, `docs/phasen-vorarbeit.md`). Wortlaut-Zeile in `docs/fragen-und-antworten.md`.
- **Offener Auftrag aus Q15 (erledigt 2026-11-19, siehe oben):** Analysieren, wie stark der nächtliche CV-Abgleich das Claude-Pro-Kontingent verbraucht (Zahl gemerkter Stellen × CV-Versionen, Wiederverwendung nach A11, Haiku laut CLAUDE.md 6). Noch nicht erledigt.
- **Farben in CLAUDE.md 6 (Entscheidung 2026-11-17, an Q3 angeglichen):** Grün = belegt, Gelb = teilweise oder noch nicht belegt, Rot = nachweislich nicht erfüllt; jeweils mit Beleg oder Begründung. Die zunächst abweichende Kurzfassung „Rot = nicht belegt“ wurde am 2026-11-17 korrigiert.

- **Q24–Q27 (2026-11-17, Wortlaut in `docs/fragen-und-antworten.md`):** Scans liest Claude (Q24); Teilbeleg = Gelb, ähnliche statt geforderter Fähigkeit = Rot (Q25, Rückfrage Q28 wegen Q3 offen); ungekennzeichnete Anforderungen zählen als Muss (Q26); Gleichstand mit Umschalter, zuerst Standard-CV aus „Dokumente“ (Q27). Damit erledigt: Offene Zweige 1 (Ausleseweg nur noch technisch), 2, 3.
- **Q28–Q31 (2026-11-17):** Q3 bleibt – ähnliche statt geforderter Fähigkeit = Gelb mit Begründung (Q28 „Doch gelb“, ersetzt Q25-Teil „Ähnliches rot“); Nachtlauf 03:00 deutscher Zeit (Q29); höchstens 50 Abgleiche pro Nacht (Q30); nur aktuelle Ergebnisse behalten, veraltete löschen statt markieren (Q31, ändert A11). Damit sind alle Fragen der „Offenen Zweige“ beantwortet. Offen ohne Nutzerfrage: Kontingent-Analyse (Q15, inkl. Scans aus Q24 und 50/Nacht), technischer Ausleseweg, Kostenstopp-Nachweis mit künstlichen Daten, Trainings-/Aufbewahrungsbedingungen Claude prüfen.

- **Q32/Q33 (2026-11-17):** Q15 auf Nutzerwunsch neu bewertet (Vergleich Claude-Abo / Mistral bezahlt / Mistral gratis / lokal). Ergebnis: jetzt Claude-Abo, aber **belastbare Alternative für den Live-Betrieb nötig**, weil das private Abo dann ausscheidet → CV-KI hinter einer austauschbaren Anbieter-Schnittstelle bauen. Kandidaten für die Alternative (zu prüfen): Anthropic-API (kommerzielle Bedingungen), Claude über AWS Bedrock/Google Vertex in EU-Region, Mistral-API mit EU-Region; jeweils Auftragsverarbeitungsvertrag, kein Training, Kosten pro Nutzer. Q33: CV wird pro Version einmal gelesen und als strukturiertes Profil mit wörtlichen Belegstellen gespeichert; Abgleiche nutzen nur das Profil.

- **Q34 (2026-11-17):** Live-Betrieb gratis: Bedeutungsvergleich im Browser + Chrome-eigenes Modell für Grenzfälle; vorher Wegwerf-Test mit künstlichem CV. Ersetzt für den Live-Fall die kostenpflichtigen Kandidaten aus Q32 als Standard.

- **Q35–Q37 (2026-11-17):** Automatischer Abgleich zusätzlich für offene Stellen mit Stichwort im Titel (eigene Liste „Automatisch abgleichen bei“ je Nutzer; gemerkte Stellen zuerst). Admin nutzt das Claude-Abo nachts, alle anderen Nutzer den kostenlosen Browser-Abgleich, ereignisgesteuert. Wegwerf-Test Stufe 1 (2026-11-17, erfundener CV, 8 Anforderungen): 6/8 richtig; Lehre: Fachbegriffe der Anforderung müssen im Belegsatz wörtlich vorkommen, sonst kein Grün. Stufe 2 (Chrome-Modell, Nutzer im eigenen Chrome, 2026-11-17): „Der Browser Test ist durch. Es sieht gut aus“ (Einzelergebnisse nicht übermittelt). Q38: Claude-Abo nur für den Admin.

- **Q39/Q40 (2026-11-17):** Vorauswahl: Stufe 1 (Bedeutungsvergleich) prüft alle CV-Versionen, Stufe 2 nur den besten (knapp: zwei) und nur Grenzfälle; gilt für Browser und Admin-Claude-Weg. Datenschutz-Pflichten für das CV-Design: Einwilligung mit Art.-9-Hinweis beim ersten CV-Upload; Datenschutzerklärung (CV, Profil, Browser-Abgleich, Modellherkunft); Bedeutungsmodell selbst ausliefern statt von Hugging Face; **CV-Dateien, -Texte, -Profile und Abgleich-Ergebnisse nicht ins GitHub-Backup**; AVV Supabase/Vercel/GitHub prüfen; Löschen von CV entfernt Datei, Profil, Ergebnisse. Anwaltliche Prüfung vor öffentlichem Start bleibt.

## Antwortstand

| Frage | Stand | Konsequenz |
|---|---|---|
| Q1 | Beantwortet | Belege, offene Nachweise und CV-Empfehlung zuerst; Prozentwert später. |
| Q2 | Zunächst mit Darstellungswunsch beantwortet; Bedeutung anschließend durch Q3 geklärt | Übereinstimmungen und offene/nicht erfüllte Anforderungen direkt in der Stellenanzeige markieren. Q2 allein bestätigte die vorgeschlagene Behandlung fehlender Nachweise noch nicht. |
| Q3 | Beantwortet | Grün = belegt, Gelb = teilweise oder noch nicht belegt, Rot = nachweislich nicht erfüllt. Ganze Anforderung markieren; Klick zeigt Beleg oder Begründung. |
| Q4 | Mit eigener Präzisierung beantwortet | Alle CVs abgleichen, besten passenden CV als Grundlage des angezeigten Vergleichs verwenden und benennen. Kein Gesamtprofil aus zusammengelegten CV-Belegen. Eine manuelle Auswahl zum Wechseln wurde nicht ausdrücklich bestätigt. |
| Q5 | Auf Nutzerwunsch zurückgestellt; **durch Q15 am 2026-11-17 entschieden** | Ursprünglich: Mistral als offenes To-do später klären. Jetzt: kein Mistral für CVs. |
| Q8 | Beantwortet am 2026-11-17 | Nachts alle eigenen gemerkten Stellen abgleichen. Diese Auswahl allein entschied Wiederverwendung noch nicht; anschließend durch Q11 bestätigt. |
| Q9 | Beantwortet am 2026-11-17 | Muss vor Soll, Gleichstand offen zeigen; weiterhin ohne Prozentwert. Keine Teilbeleg- oder Gewichtungsformel daraus ableiten. |
| Q11 | Beantwortet am 2026-11-17 | Nachts nur fehlende oder veraltete Ergebnisse neu berechnen; unveränderte Ergebnisse wiederverwenden. |
| Q12 | Beantwortet am 2026-11-17 | Textvorschau und Auslesekorrektur ermöglichen; Originaldatei erhalten. |
| Q15 | Beantwortet am 2026-11-17 | CV nur über Claude, kein Mistral; Kontingent-Analyse offen. |

Die Importfragen Q6/Q7 und Q14/Q16 stehen in [2026-11-16-ein-klick-import.md](2026-11-16-ein-klick-import.md), die Portalfragen Q10/Q13 in [2026-11-15-firmenportal-erkennung.md](2026-11-15-firmenportal-erkennung.md), Q17–Q21 in `docs/fragen-und-antworten.md`. Nächste freie Nummer: Q22.

## Fragenprotokoll im Wortlaut

### Dokumentationsauftrag und Fortschreibung

Nutzerauftrag im Wortlaut:

> Alle Fragen, die du gestellt hast, müssen dokumentiert werden, damit Claude Code das nachvollziehen kann

Für die Fortsetzung: Jede tatsächlich gestellte Frage mit stabiler Nummer, Runde, vollständigem Wortlaut, Empfehlung und angebotenen Optionen protokollieren. Antworten im Wortlaut ergänzen und daraus abgeleitete Entscheidungen gesondert kennzeichnen. Frühere Formulierungen oder Antworten bei Änderungen erhalten; spätere Präzisierungen ergänzen. Unbeantwortete, zurückgestellte und beantwortete Fragen unterscheiden. Eine Empfehlung oder vorausgewählte Option ist keine Nutzerantwort. Vorbereitete Themen sind noch keine gestellten Fragen.

Der genaue Sendezeitpunkt der einzelnen Chatnachrichten ist hier nicht verfügbar; die Reihenfolge ist dokumentiert. Keine Antworten aus anderen, älteren Interviews ergänzen oder erfinden.

### Runde 1

#### Q1 – Erste Ausbaustufe

Gestellte Frage einschließlich Empfehlung, im Wortlaut:

> ❓ Q1 – Erste Ausbaustufe: Soll der CV-Abgleich zunächst jede Stellenanforderung mit passenden CV-Belegen, offenen Nachweisen und einer Empfehlung für die beste CV-Version erklären? ➡️ Meine Empfehlung: diese nachvollziehbare Prüfung zuerst; einen Prozentwert erst ergänzen, wenn seine Bedeutung und Gewichtung feststehen.

Angebotene Antworten im Wortlaut:

1. Ja: Belege, offene Nachweise und CV-Empfehlung zuerst
2. Zusätzlich sofort einen Passungswert von 0–100

Nutzerantwort im Wortlaut:

> Ja: Belege, offene Nachweise und CV-Empfehlung zuerst

Ableitung: Nachvollziehbare Prüfung und CV-Empfehlung gehören in die erste Version. Bedeutung und Gewichtung eines späteren Prozentwerts sind nicht festgelegt; kein dauerhafter Ausschluss eines Scores.

#### Q2 – Fehlender Nachweis

Gestellte Frage einschließlich Empfehlung, im Wortlaut:

> ❓ Q2 – Fehlender Nachweis: Wenn eine Anforderung in deinem CV nicht erwähnt wird, soll das als „nicht belegt“ erscheinen und von einer tatsächlich nicht erfüllten Anforderung unterschieden werden? ➡️ Meine Empfehlung: ja; du kannst fehlende Erfahrung anschließend bestätigen oder ergänzen, ohne dass die KI dir Fähigkeiten abspricht.

Angebotene Antworten im Wortlaut:

1. Ja: „nicht belegt“, mit Korrekturmöglichkeit
2. „Nicht belegt“ soll bereits die Bewertung verschlechtern

Freie Nutzerantwort im Wortlaut; keine der angebotenen Optionen gewählt:

> Das soll farblich markiert werden in der Stellenanzeige, genau wie dinge, die mit meinem CV übereinstimmen

Ableitung zum damaligen Stand: Farbliche Markierungen direkt in der Stellenanzeige sind gewünscht. Farben, Unterscheidung fehlender Nachweise/nicht erfüllter Anforderungen, Bewertungsfolgen und eine Korrekturmöglichkeit waren dadurch allein nicht entschieden. Die Farblegende und Beleganzeige wurden deshalb als Q3 nachgefragt und anschließend bestätigt. Eine Korrekturfunktion bleibt gesondert zu klären.

### Runde 2

Q3–Q5 wurden zunächst gemeinsam gestellt. Danach folgte der Dokumentationsauftrag, anschließend gingen die folgenden Antworten zu allen drei Fragen ein. Die frühere Kennzeichnung „Antworten stehen aus“ ist damit für Q3/Q4 überholt; Q5 ist ausdrücklich zurückgestellt (seit Q15 entschieden).

#### Q3 – Farben direkt in der Anzeige

Gestellte Frage einschließlich Empfehlung, im Wortlaut:

> ❓ Q3 – Farben direkt in der Anzeige: Soll jeweils die ganze Anforderung im unveränderten Anzeigentext markiert werden und ein Klick den CV-Beleg bzw. die Begründung zeigen? ➡️ Meine Empfehlung: Grün = belegt, Gelb = teilweise oder noch nicht belegt, Rot = nachweislich nicht erfüllt. So wird eine fehlende Erwähnung nicht als fehlende Fähigkeit ausgegeben.

Angebotene Antworten im Wortlaut:

1. Ja: Grün/Gelb/Rot mit Beleg oder Begründung
2. Nur Grün/Rot; Rot bedeutet auch „nicht belegt“

Nutzerantwort im Wortlaut:

> Ja: Grün/Gelb/Rot mit Beleg oder Begründung

Ableitung: Empfohlene Markierung, Farblegende und Beleganzeige bestätigt. „Teilweise belegt“ und „noch nicht belegt“ teilen die gelbe Farbe; der jeweilige Grund muss verständlich erkennbar bleiben. Eine fehlende CV-Erwähnung rechtfertigt kein Rot. Wie echte Nichterfüllung zuverlässig nachgewiesen bzw. vom Nutzer bestätigt wird, muss im Entwurf behandelt werden.

#### Q4 – Grundlage der Markierungen

Gestellte Frage einschließlich Empfehlung, im Wortlaut:

> ❓ Q4 – Grundlage der Markierungen: Sollen sich die Farben immer auf eine konkrete CV-Version beziehen, zunächst auf die empfohlene beste Version, mit einer Auswahl zum Wechseln? ➡️ Meine Empfehlung: ja; Erfahrungen aus mehreren CVs werden dann nicht zu einem scheinbar vollständigen einzelnen CV vermischt.

Angebotene Antworten im Wortlaut:

1. Ja: je CV getrennt, beste Version vorausgewählt
2. Alle CV-Versionen gemeinsam als Gesamtprofil

Freie Nutzerantwort im Wortlaut; keine der angebotenen Optionen gewählt:

> Alle CVs sollen abgeglichen werden. Der der am besten passt soll im Vergleich verwendet werden. Es soll erwähnt werden, auf welchem CV die Vergleiche beruhen

Ableitung: Alle CVs einzeln prüfen, den am besten passenden bestimmen, den angezeigten Vergleich auf diesen CV beziehen und ihn ausdrücklich benennen. Das ist keine Zustimmung zum Vermischen aller CVs zu einem Gesamtprofil. Die Auswahl zum manuellen Wechseln war Teil der Empfehlung, wurde in der freien Antwort aber nicht ausdrücklich entschieden. Ebenso bleiben Auswahlregeln und Umgang mit gleich gut passenden CVs zu klären.

#### Q5 – Mistral und persönliche Daten

Gestellte Frage einschließlich Empfehlung, im Wortlaut:

> ❓ Q5 – Mistral und persönliche Daten: Wie soll die zusätzliche Mistral-Option verwendet werden? Der native kostenlose Zugang ist begrenzt und noch mit deinem Konto zu prüfen; eine kostenlose allgemeine Website-API kann ich derzeit nicht zusagen. ➡️ Meine Empfehlung: Mistral nur nach bewusster Auswahl, mit vorher deaktiviertem Training und geprüftem Kostenstopp; kein stiller Wechsel bei einem Claude-Limit.

Angebotene Antworten im Wortlaut:

1. Cloud nur bewusst auswählen, Training vorher aus
2. Mistral ausschließlich lokal auf meinem PC
3. Automatischer Wechsel nach einmaliger Freigabe

Freie Nutzerantwort im Wortlaut; keine der angebotenen Optionen gewählt:

> Das als offenes To Do aufnehmen, was später zu klären ist

Ableitung (damals): Mistral bleibt als gewünschte zusätzliche Option im offenen Backlog. Betriebsart, tatsächlicher kostenfreier Zugang, Datenverwendung/Training, Aufbewahrung und Kostenstopp später gemeinsam klären. Kein automatischer Wechsel und keine Verarbeitung persönlicher Daten durch Mistral freigegeben. Die ursprüngliche Claude-Pro-Priorität bleibt bestehen. **Nachtrag 2026-11-17:** Durch Q15 erledigt – kein Mistral für CVs.

#### Erneute Kurzfassung derselben Fragen im Chat

Vor Eingang der Antworten wurde Runde 2 im abschließenden Chattext noch einmal kürzer formuliert. Diese Fassung hat dieselben IDs und erzeugt keine weiteren Fragen oder abweichenden Entscheidungen. Wortlaut der Fragen und Empfehlungen:

> ❓ Q3 – Farben und Belege
>
> Soll ein Klick auf eine markierte Anforderung den passenden CV-Beleg oder die Begründung zeigen?
>
> ➡️ Empfehlung: Grün = belegt, Gelb = teilweise/noch nicht belegt, Rot = nachweislich nicht erfüllt. Alternativ nur Grün/Rot, wobei Rot ausdrücklich auch „nicht belegt“ bedeutet.

> ❓ Q4 – Welche CV-Version bestimmt die Farben?
>
> ➡️ Empfehlung: Eine konkrete CV-Version, zunächst die empfohlene beste Version. Du kannst zwischen deinen CVs wechseln. Alternativ vergleichen wir mit einem Gesamtprofil aus allen CVs.

> ❓ Q5 – Wie möchtest du Mistral einsetzen?
>
> ➡️ Empfehlung: Cloud nur nach bewusster Auswahl, vorher Training deaktivieren und den kostenfreien Zugang prüfen. Alternativen: ausschließlich lokal auf deinem PC oder automatischer Wechsel nach einmaliger Freigabe.

Die verbindlichen Nutzerantworten stehen unter Q3–Q5. Insbesondere ist der hier empfohlene manuelle CV-Wechsel dadurch nicht zusätzlich bestätigt, und keine Mistral-Alternative wurde gewählt.

### Runde 4 – CV-Bauplan, Antworten am 2026-11-17 eingegangen

#### Q8 – Start und Wiederverwendung

> ❓ Q8 – CV-Abgleich starten: Soll der Abgleich zunächst über einen Knopf pro Stellenanzeige starten und das Ergebnis gespeichert werden? ➡️ Meine Empfehlung: ja; nach einer Änderung an Anzeige oder CV als veraltet kennzeichnen und bei Bedarf neu starten. Das spart dein Abo-Kontingent und vermeidet eine Neuberechnung bei jedem Öffnen.

Angebotene Antworten:

1. Ja: Knopf pro Stelle, Ergebnis wiederverwenden
2. Automatisch beim Öffnen einer Anzeige
3. Nachts alle gemerkten Stellen abgleichen

Nutzerantwort im Wortlaut:

> Nachts alle gemerkten Stellen abgleichen

Ableitung: Nächtlicher Abgleich aller eigenen gemerkten Stellen, nicht nur ein Knopf pro Anzeige. Alle CV-Versionen bleiben gemäß Q4 Vergleichsgrundlage; beste Version benennen. Wiederverwendung, Veraltet-Markierung und zusätzliche manuelle Auslösung waren Teil der angebotenen Empfehlung, wurden durch Auswahl der dritten Option aber nicht ausdrücklich bestätigt. Ausbleibende neue Analyse bei Abo-Limit darf keinen Erfolg vortäuschen.

#### Q9 – Auswahl der besten CV-Version

> ❓ Q9 – Beste CV-Version: Soll die Empfehlung zuerst belegte Muss-Anforderungen und danach belegte Soll-Anforderungen berücksichtigen und bei Gleichstand mehrere gleich gute CVs nennen? ➡️ Meine Empfehlung: ja, mit Begründung und weiterhin ohne Prozentwert. Die genaue Behandlung von Teilbelegen wird anschließend im Entwurf transparent beschrieben.

Angebotene Antworten:

1. Ja: Muss vor Soll, Gleichstand offen zeigen
2. Alle Anforderungen gleich behandeln

Nutzerantwort im Wortlaut:

> Ja: Muss vor Soll, Gleichstand offen zeigen

Ableitung: Belegte Muss-Anforderungen vor belegten Soll-Anforderungen berücksichtigen; bei Gleichstand mehrere gleich gute CVs transparent nennen, weiterhin ohne Prozentwert. Keine numerischen Gewichte, Rangfolge zwischen unterschiedlichen Teilbelegen oder verdeckte Auswahl eines einzigen Gleichstandsgewinners bestätigt.

### Runde 5 – Nachtlauf und Auslesung, Antworten am 2026-11-17 eingegangen

#### Q11 – Nächtliche Wiederverwendung

> ❓ Q11 – Nächtliche Wiederverwendung: Soll der Nachtlauf alle gemerkten Stellen prüfen, aber nur fehlende oder durch Änderungen an Anzeige/CV veraltete Abgleiche neu berechnen? ➡️ Meine Empfehlung: ja; unveränderte Ergebnisse wiederverwenden, damit dein Claude-Pro-Kontingent für neue Fälle reicht.

Angebotene Antworten:

1. Ja: nur fehlende oder veraltete Ergebnisse neu berechnen
2. Jede Nacht alle Abgleiche neu berechnen

Nutzerantwort im Wortlaut:

> Ja: nur fehlende oder veraltete Ergebnisse neu berechnen

Ableitung: Nachtlauf prüft weiterhin alle eigenen gemerkten Stellen, verwendet unveränderte Ergebnisse erneut und berechnet nur fehlende oder durch Änderungen an Anzeige/CV veraltete Abgleiche neu. Q8 allein hatte Wiederverwendung noch nicht bestätigt; Q11 entscheidet diesen Punkt jetzt. Technische Versionszuordnung darf korrigierten Auslesetext nicht als unveränderte Grundlage behandeln.

#### Q12 – CV-Auslesung prüfen

> ❓ Q12 – CV-Auslesung prüfen: Sollst du den aus PDF/Word erkannten Text ansehen und bei Auslesefehlern korrigieren können, ohne die Originaldatei zu ändern? ➡️ Meine Empfehlung: ja; ein leerer oder fehlerhafter Text darf nicht zu scheinbar fehlenden Fähigkeiten führen.

Angebotene Antworten:

1. Ja: Textvorschau und Korrektur ermöglichen
2. Kein Korrektureditor; bei Fehlern den Abgleich stoppen

Nutzerantwort im Wortlaut:

> Ja: Textvorschau und Korrektur ermöglichen

Ableitung: Aus PDF/Word gewonnenen Text ansehen und bei Auslesefehlern korrigieren können, ohne die Originaldatei zu ändern. Keine Pflicht zur manuellen Bestätigung jedes Nachtlaufs. Korrigierte Grundlage nachvollziehbar von Original und früheren Ergebnissen unterscheiden. Neue Parserinstallation oder echte CV-Verarbeitung dadurch noch nicht freigegeben.

### Runde 6 – Q15 am 2026-11-17 (von Claude gestellt)

Der Fragewortlaut liegt im Repo nicht vor (im Chat mit Claude gestellt; Lücke ausdrücklich benannt). Inhalt laut Übergabe: Option a) = keine Mistral-Nutzung für CVs, CV nur über Claude. Nutzerantwort im Wortlaut:

> a). Analysiere aber, inwieweit das mein Kontingent aufbrauchen wird.

## Anforderungen

| ID | Stand | Anforderung / Quelle |
|---|---|---|
| A1 | Nutzerwunsch (N3); **Mistral-Teil durch Q15 überholt** | Primär Claude Pro, keine zusätzlichen API-Kosten. Ursprünglich zusätzliche Mistral-Option ohne API-Kosten – seit Q15 nicht mehr für CVs. Kein stiller kostenpflichtiger Ersatzweg. |
| A2 | Antwort Q1 bestätigt | Erste Version: nachvollziehbare Belege, offene Nachweise und Empfehlung der besten CV-Version. Prozentwert/Score wird zurückgestellt, bis Bedeutung und Gewichtung feststehen. |
| A3 | Q2: Darstellungswunsch bestätigt; Bedeutung später durch Q3 geklärt | Übereinstimmungen und offene/nicht erfüllte Anforderungen farblich **direkt in der Stellenanzeige** markieren. |
| A4 | Bestehende Projektanforderung | PDF und Word, mehrere eigene CV-Versionen, begründete CV-Empfehlung, private Daten/Ergebnisse pro Nutzer. Kein Zugriff durch Gäste/andere Nutzer. Vorerst persönliche Nutzung; kein gemeinsames Abo für fremde Nutzer vorsehen. |
| A5 | Bestehende Qualitätsgrenze | Keine Fähigkeiten erfinden oder aus bloßer Nichterwähnung sicher auf Unfähigkeit schließen. Ergebnisse müssen anhand tatsächlicher CV-/Anzeigenpassagen nachvollziehbar sein. |
| A6 | Antwort Q3 bestätigt (CLAUDE.md 6 angeglichen) | Ganze Anforderung im unveränderten Anzeigentext markieren; Klick zeigt CV-Beleg bzw. Begründung. Grün = belegt, Gelb = teilweise oder noch nicht belegt (beide Gründe im Text unterscheidbar), Rot = nachweislich nicht erfüllt. Fehlende Erwähnung allein ist kein Rot. |
| A7 | Freie Antwort Q4; durch Q9 ergänzt | Alle CVs einzeln abgleichen, besten passenden CV für den angezeigten Vergleich verwenden und ausdrücklich benennen. Keine Belege mehrerer CVs zu einem scheinbar vollständigen Einzel-CV zusammenführen. Bei Gleichstand mehrere gleich gute CVs nennen; manueller Wechsel und Voreinstellung der angezeigten Version bei Gleichstand bleiben unentschieden. |
| A8 | Antwort Q5 zurückgestellt; **durch Q15 entschieden** | Kein Mistral für CVs. |
| A9 | Antwort Q8; durch Q11 ergänzt | „Nachts alle gemerkten Stellen abgleichen“. Zielumfang sind alle eigenen Stellen im Status Gemerkt; alle eigenen CV-Versionen gemäß Q4 einzeln. Knopf pro Stelle oder Start bei jedem Öffnen sind nicht der bestätigte Auslöser. Genaue Nachtzeit, Laufumgebung und Reihenfolge bei knappem Kontingent offen. |
| A10 | Antwort Q9 | „Ja: Muss vor Soll, Gleichstand offen zeigen“. Bei Gleichstand mehrere gleich gute CVs mit Begründung, ohne Prozentwert und ohne stillen Sieger anhand von Dateiname, Datum oder Reihenfolge. Keine Gewichte oder Teilbeleg-Formel daraus ableiten. |
| A11 | Antwort Q11 | „Ja: nur fehlende oder veraltete Ergebnisse neu berechnen“. Gleiche Anzeigen- und CV-Grundlagen verwenden das vorhandene Ergebnis erneut. Änderungen an Anzeige oder CV einschließlich korrigierter Auslesefassung machen die betroffenen Ergebnisse veraltet; sie dürfen nicht als aktuell erscheinen. |
| A12 | Antwort Q12 | „Ja: Textvorschau und Korrektur ermöglichen“. Aus PDF/Word erkannten Text ansehen und Auslesefehler korrigieren, ohne die Originaldatei zu verändern. Die Korrekturfassung gehört zur CV-Version und ist Teil der Vergleichsgrundlage gemäß A11; Belege beziehen sich auf die konkret verwendete Fassung. Keine Pflicht zur Bestätigung jedes Nachtlaufs. |
| A13 | Antwort Q15 | CV-Daten nur über Claude (Abo-Token, CLAUDE.md 3.2); Mistral nicht für CVs. Kontingentverbrauch vorab analysieren. |

## Ablaufentwurf für den nächtlichen Claude-Pro-Abgleich

Macht die bestätigte Richtung konkret. Noch offene Vergleichs- und Betriebsfragen sind als solche bezeichnet; keine Freigabe für Modellaufrufe, echte CVs oder Datenbankschreiben.

1. **Eigene gemerkte Stellen bestimmen.** Der Nachtlauf umfasst die eigenen Einträge im Status Gemerkt. Bereits beworbene Stellen, andere Nutzer und bloß geöffnete, nicht gemerkte Anzeigen gehören nicht automatisch dazu. Uhrzeit oder Bindung an einen laufenden PC noch nicht gewählt.
2. **Anzeigentext und überprüfbaren CV-Text bereitstellen.** Vollständigen Original-Anzeigentext bzw. vorhandenen Snapshot und alle eigenen CV-Versionen getrennt verwenden. Die Kurzfassung mit wenigen Muss-Punkten reicht nicht. Ausgelesenen PDF-/Word-Text als Vorschau anbieten und korrigierbar machen; Originaldatei bleibt unverändert. Verwendete Auslese- oder Korrekturfassung ihrer CV-Version zuordnen. Fehlender oder fehlerhaft ausgelesener Text ist ein Ausleseproblem; daraus keine roten Anforderungen oder scheinbar vollständigen Ergebnisse erzeugen. Technischer Ausleseweg und Scans offen.
3. **Aktuelle Ergebnisse wiederverwenden, fehlende oder veraltete neu prüfen.** Andernfalls jede betroffene CV-Version getrennt prüfen und tatsächliche Anzeigenpassagen/CV-Belege zuordnen. Grün, die beiden erklärten gelben Fälle und Rot gemäß Q3. Rot verlangt einen belastbaren Nachweis der Nichterfüllung. Fehlende Erwähnung, Auslesefehler und übertragbare Erfahrung nicht still gleichsetzen. Belege einer anderen CV-Version schließen keine Lücke der gerade geprüften Version.
4. **Die Empfehlung nach Muss vor Soll erklären.** Noch keine freigegebene Gewichtung oder Formel für Teilbelege. Sind mehrere Versionen gleich gut, alle nennen und den Gleichstand erklären. Keinen angeblich eindeutigen Sieger oder Prozentwert erfinden.
5. **Markierungen auf eine benannte Version beziehen.** Ganze Anforderungen im unveränderten Anzeigentext markieren; Öffnen zeigt Beleg oder Begründung; der Vergleich nennt seinen CV. Bei Gleichstand bleiben Ergebnisse pro CV getrennt; welche Version zunächst die Farben bestimmt und ob ein manueller Wechsel angeboten wird, ist offen. Keine gemeinsame Farbfläche aus Belegen mehrerer CVs.
6. **Am Abo-Limit geordnet pausieren.** „Alle gemerkten Stellen“ ist keine Zusage, dass alles in einer Nacht ins Kontingent passt. Rest wartet bei erschöpftem Claude-Kontingent auf einen späteren Lauf. Kein kostenpflichtiger API-Schlüssel, keine Zusatznutzung, kein Anbieterwechsel (Q15). Kostenstopp und Limit-Erkennung vor Betriebsfreigabe mit künstlichen Daten nachweisen; Reihenfolge und Fortschrittsanzeige offen.
7. **Ergebnisse an ihre tatsächlichen Grundlagen binden.** Ergebnisse bleiben der konkreten Anzeige, CV-Version und Auslese-/Korrekturfassung zugeordnet. Eine Änderung macht betroffene Ergebnisse veraltet; auch eine geänderte Menge berücksichtigter CV-Versionen kann die Empfehlung verändern. Während eines Laufs entstehende Änderungen dürfen nicht dazu führen, dass ein Ergebnis zu älteren Grundlagen als aktuell erscheint. Eigentümergrenzen, Export und Kontolöschung müssen Ergebnisse und Korrekturfassungen einbeziehen. Keine Tabellen, Fristen oder Formate hier vorgeben.

## Offene Zweige (noch keine gestellten Fragen)

1. **Ausleseweg und Scans:** Technische Gewinnung aus PDF/Word; Scans im ersten Bauabschnitt unterstützen oder mit verständlichem Hinweis abweisen? Bestehenden Dokumentbereich verwenden; keine Parser-/OCR-Lösung vorgeben.
2. **Teilbelege und unklare Anforderungen:** Behandlung von Teilbelegen/übertragbarer Erfahrung und unklaren Muss-/Soll-Angaben. Keine Gewichte oder Formel erfinden.
3. **Darstellung bei Gleichstand:** Welche Version zunächst die Markierungen bestimmt; manueller Wechsel ja/nein.
4. **Laufumgebung und Authentifizierung:** Privater Claude-Pro-Ausführungsweg, Anmeldung, Nachtzeit, Reihenfolge bei knappen Quoten. Regelmäßige manuelle Terminalstarts sind kein gewünschter Nutzerablauf.
5. **Kostengrenzen und Betriebsfreigabe:** Claude-Konto-/Modellverfügbarkeit (CLAUDE.md 6: Haiku zuerst) und Kostenstopp ohne bezahltes Fallback mit künstlichen Daten nachweisen; Trainings-/Aufbewahrungsbedingungen prüfen; Kontingent-Analyse aus Q15. Erst nach Freigabe echte CVs verarbeiten.
6. **Farbbedeutung Rot:** Abweichung CLAUDE.md 6 gegenüber Q3 klären (siehe oben).
7. Aufbewahrung, Export und Löschung hinzukommender Ergebnisse/Korrekturfassungen.

Nicht erneut fragen (bereits entschieden): alle CVs getrennt, Farben gemäß Q3, Muss vor Soll/offene Gleichstände, Nachtlauf mit Wiederverwendung, Textvorschau/Korrektur bei unverändertem Original, kein Mistral.

## Verifizierte Anbieterfakten (Prüftag 2026-11-16, nur offizielle Quellen)

Öffentliche Dokumentation gelesen, keine Kontoeinstellungen oder Zugangsdaten.

### Claude Pro

- Der native Claude-Code-Weg unterstützt Pro-Anmeldung und einen Abo-Token für CI/Skripte. Die offizielle GitHub Action dokumentiert geplante Läufe und Abo-Abrechnung statt API-Abrechnung bei OAuth. [Authentifizierung](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token), [GitHub Action und Kosten](https://code.claude.com/docs/en/github-actions#manage-costs).
- Abo-Analyse verbraucht das gemeinsame Claude-/Code-Kontingent. Kostenpflichtige Zusatznutzung und mögliche API-Authentifizierung müssen ausgeschlossen sein; bei Erschöpfung pausieren. [Pro mit Claude Code](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-max-or-ultra-plan), [Usage Credits](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans).
- Native persönliche Automatisierung ist von einem allgemeinen Website-Proxy oder der Vermittlung von Abo-Nutzung für andere Menschen zu unterscheiden. Der private CV-Workflow ist eine Architektur-Ableitung, keine ausdrückliche anwendungsbezogene Anbieterfreigabe. [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance). Keine Sitzungstokens als Ersatz-API verwenden, kein unverifiziertes Modell festlegen.

### Mistral (für CVs seit Q15 nicht mehr relevant; Material für die Phase-4-Prüfung öffentlicher Anzeigentexte)

- Eine kostenlose allgemeine Modell-API kann aktuell nicht belastbar zugesagt werden. Die aktuelle Usage-Doku verlangt für API-Zugang Billing/PAYG; ein älterer Help-Artikel beschreibt noch Gratis-Prototyping. Widerspruch am tatsächlichen Konto klären. PAYG mit Guthaben ist keine Garantie für Kosten null. [Usage-Dokumentation](https://docs.mistral.ai/admin/billing-usage/usage-limits#plan-usage-and-limits), [abweichender Help-Artikel](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them).
- Vibe Code dokumentiert nativen Free-Zugang, Browseranmeldung und Stoppen nach enthaltenem Budget bei ausgeschaltetem PAYG; Programmatic Mode und MCP existieren. Daraus ergibt sich ein **zu prüfender** nativer Worker-Weg, kein Beleg für eine kostenlose allgemeine Website-API. [Plan-/Kontonutzung](https://docs.mistral.ai/vibe/code/cli/api-keys-profiles#plan-and-billing-notes), [Programmatic Mode](https://docs.mistral.ai/vibe/code/cli/work-with-cli#programmatic-mode), [MCP](https://docs.mistral.ai/vibe/code/cli/mcp-servers).
- Training ist laut aktueller Hilfe auch im Free-Kontext abwählbar; Vibe- und API-Einstellungen sind getrennt. Opt-out bedeutet keine sofortige Löschung/Nullspeicherung. [Training-Einstellungen](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training), [ZDR-Grenzen](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr). Ältere Projektangaben zum Experiment-Tarif nicht ungeprüft übernehmen.
- Der globale API-Endpunkt garantiert keine bestimmte Inferenzregion; nicht automatisch „Mistral = ausschließlich EU“ zusagen. [Regional Inference](https://docs.mistral.ai/inference/regional-inference).
- Lokale offene Mistral-Modelle wären eine weitere Option ohne API-Gebühren; Hardware, Qualität, Einrichtung offen. Nichts heruntergeladen oder installiert.

## Abnahmefälle (Vorschlag, kein freigegebenes Ergebnisschema)

- Originalanzeige bleibt byte-/textgleich rekonstruierbar; Markierung verändert keinen Wortlaut und erzeugt keine fremden HTML-Inhalte.
- Jeder als belegt markierte Teil verweist auf eine tatsächlich vorhandene Passage der zugrunde liegenden CV-Version; eine erfundene Referenz wird verworfen bzw. als Prüfproblem gezeigt.
- Fehlende Erwähnung und Teilbeleg sind gelb, nachweisliche Nichterfüllung rot (gemäß Q3; Abweichung CLAUDE.md 6 klären); Gründe getrennt erklärt, Farben mit lesbaren Statushinweisen.
- CV A belegt SQL, CV B Projektleitung: alle CVs prüfen, beste Version benennen, nur deren Belege anzeigen. Keine vollständige Abdeckung aus gemischten Belegen behaupten.
- Nachtumfang = alle eigenen gemerkten Stellen; fremde Daten und fortgeschrittene Status nicht übernehmen. Fehlende Kapazität führt zu Pause, nicht zu Kosten oder Anbieterwechsel.
- Empfehlung erklärt Vorrang Muss vor Soll; bei Gleichstand mehrere CVs, kein Prozentwert, kein willkürlicher Sieger.
- Vorschau zeigt die verwendete Auslesefassung; Korrektur ändert nicht die Originaldatei; leere/fehlerhafte Auslesung → Hinweis und Korrekturmöglichkeit. Nachtlauf verlangt nicht jedes Mal eine Bestätigung.
- Unveränderte Grundlagen → vorhandenes Ergebnis; Änderung an Anzeige, CV oder Korrektur verhindert Ausgabe als aktuell. Eigentümergrenze, Export, Löschung gelten auch für Ergebnisse/Korrekturen.
- Keine persönlichen Inhalte an Mistral oder Groq. Kontingentende startet keine kostenpflichtige Anfrage.
- CV-Inhalte, Prompts, Antworten und Resultate erscheinen nicht im öffentlichen Repo, in öffentlichen GitHub-Logs, Issues oder Artefakten; ein späterer CI-Weg ist daran zu messen.

### Künstlicher Gesamtfall (Paket 22, 2026-11-16)

[Beispiel und Vergleichsmatrix](../beispiele/cv-abgleich.md), [JSON mit Originaltexten und Belegpositionen](../beispiele/cv-abgleich.json): drei getrennte CV-Versionen, sechs Anforderungen, 18 Zuordnungen, sieben Abnahmefälle; alle Farben enthalten. Beste Version durch eindeutige Abdeckungsdominanz erkennbar, ohne allgemeine Gewichtung oder Gleichstandsregel. Exakte Zitate/Positionen, eindeutige IDs, unveränderte Anzeige und getrennte Versionen mechanisch geprüft. Kein ausgeführter KI-Abgleich, Parser oder Modellaufruf; keine echte CV-KI daraus ableiten.

### Kleiner früherer Beispielfall (aus `docs/beispiele/spaetere-phasen.json`, 2026-11-15)

```json
"cv_fall": {
  "hinweis": "Frei erfundener Klartext, keine echte Datei und keine Bewertungsvorgabe.",
  "cv_text": "Drei Jahre fiktive Tätigkeit in der Datenanalyse. Regelmäßige SQL-Abfragen und Dokumentation von Kennzahlen.",
  "anforderungen": ["SQL-Kenntnisse", "Personalverantwortung"],
  "offen": "Wie fehlende Erwähnung gegenüber belegter fehlender Fähigkeit dargestellt werden soll, muss vor Umsetzung geklärt werden."
}
```

## Vorarbeit im Code (Bestandsaufnahme 2026-11-15/16, Quellcode/Migrationen, nicht Live-Datenbank)

- **Vorhanden:** `documents` enthält Dokumentart, Versionsname, Datum und Storage-Pfad; Bewerbungen verweisen über `cv_dokument_id` und `anschreiben_dokument_id` auf Versionen. Migration 004 schützt verwendete Versionen vor Löschung. `web/app/dokumente/upload.tsx` lädt Dateien direkt in den Speicher; `actions.ts` erstellt kurzlebige Download-Links. Paket 2 prüft Dokument-Metadaten zentral (`web/lib/dokumente.ts`).
- **Noch nicht vorhanden:** Textgewinnung aus PDF/Word, strukturierte Lebenslauf-Fähigkeiten, Abgleichläufe, begründete Treffer/Lücken, nachvollziehbare Modell-/Dokumentversionen und Passungsgewichte. Ein Upload ist noch kein gelesener oder ausgewerteter Lebenslauf.
- **Wiederverwendbar:** `jobs.abschnitte`, `jobs.ki`, `voraussetzungen`, `web/lib/anzeige.ts`, `web/lib/stellendaten.ts`, `zusammenfassung.ts` (Pakete 1, 6, 8 sichern diese Eingänge ab). Die Kurzfassung enthält höchstens drei Muss-Punkte und ist keine vollständige Anforderungsliste. Die bisherige Hervorhebung „Wichtige Punkte“ ist ein Wortvergleich, kein semantischer CV-Abgleich.
- **Verbindliche Datenregel:** Persönliche Daten ausschließlich über den Claude-Abo-Weg. Nie echte Lebensläufe an Groq, Mistral oder andere Anbieter senden oder als Testfixture ablegen. Auch Mail-/Kalendertexte sind persönliche Daten.
- **Methode der Klärung:** `grill-me`/`grilling` für Fragenrunden; Fakten selbst prüfen, Empfehlungen anbieten, Antworten festhalten. PDF-/DOCX-Skills existieren, beweisen aber keine installierte Parserumgebung und sind keine Freigabe, echte CVs zu öffnen.

Nächster Schritt (nach Groq-Paket und Hochladen, Q20): offene Zweige 1–7 als Fragen ab Q22 stellen und hier protokollieren, Kontingent-Analyse vorlegen, dann konsolidierten Entwurf gemeinsam bestätigen. Erst danach implementieren.
