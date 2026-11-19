# Projektweite Fragen und Antworten

Stand: 2026-11-17. Einstieg für Claude Code und alle anderen Agenten. Zu Beginn jeder Sitzung und vor weiteren Rückfragen lesen. Die verbindliche Arbeitsregel steht in [CLAUDE.md, Abschnitt 7](../CLAUDE.md#7-arbeitsweise); [AGENTS.md](../AGENTS.md) verpflichtet weitere Agenten ebenso.

## Allgemeiner Nutzerauftrag

Erste ausdrückliche Anweisung im bisherigen Gespräch:

> Alle Fragen, die du gestellt hast, müssen dokumentiert werden, damit Claude Code das nachvollziehen kann

Projektweite Bekräftigung am 2026-11-17 im Wortlaut:

> Vergiss nicht, generell alle Fragen und Antworten in diesem Projekt in Projektdateien festzuhalten, damit Claude das sieht

Das gilt für das gesamte Projekt, alle Phasen und alle Agenten, nicht nur für den CV-Abgleich. Nutzerfragen und Antworten der Agenten gehören ebenso dazu wie Agentenfragen und Nutzerantworten. Auch Statusfragen und Freigaben dokumentieren. Fragenprotokolle sind ein Teil des Projekt-Gedächtnisses und bleiben nicht ausschließlich im Chat.

## Protokolle des aktuellen Gesprächs

Der vollständige Wortlaut liegt jeweils im Fachdokument; diese Übersicht verweist darauf, statt Antworten zu duplizieren. Neue Protokolle hier ergänzen. Kennungen immer zusammen mit dem Gespräch/Thema lesen; ältere Gespräche haben eigene Nummernkreise.

| Thema / Gespräch | Fragen und Antworten | Quelle |
|---|---|---|
| CV-Abgleich, Gespräch 2026-11-16/17 | Q1–Q5, Q8/Q9, Q11/Q12 und Q15 mit Wortlaut, Empfehlungen, Optionen, Antworten und Präzisierungen. Q5/Mistral durch Q15 erledigt: kein Mistral für CVs. | [CV-Fragenprotokoll](plans/2026-11-16-cv-abgleich.md) |
| Ein-Klick-Import fremder Anzeigen, dasselbe Gespräch | Q6/Q7 beantwortet: Reihenfolge Chrome → Edge → Safari → Smartphone → Firefox; Gemerkt ohne Bewerbungsdatum. Q14/Q16 (2026-11-17): Erweiterung statt Lesezeichen; auf Portalen nur Adresse und Titel. | [Importplan und Fragenprotokoll](plans/2026-11-16-ein-klick-import.md) |
| Firmenportal-Erkennung, dasselbe Gespräch | Q10 zum ersten Umfang beantwortet. **Q13 am 2026-11-17 beantwortet: „Ja, bauen (Empfohlen)“.** Die allgemeine Dokumentationsanweisung beantwortet Q13 nicht. | [Portalplan und Fragenprotokoll](plans/2026-11-15-firmenportal-erkennung.md) |

In dieser aktuellen Gesprächsfolge ist die nächste freie Fragennummer **Q71**. Der genaue Sendezeitpunkt einzelner älterer Nachrichten ist nicht verfügbar; vorhandene Datums-/Reihenfolgeangaben erhalten und keine Uhrzeiten erfinden. Fachliche Anforderungen stehen zusätzlich im [CV-Plan](plans/2026-11-16-cv-abgleich.md), der aktuelle Arbeits-/Übergabestand in [STATUS](STATUS.md).

## Runde 2026-11-17 mit Claude Code (Q14–Q21)

Fragen von Claude im Chat gestellt; Fragetext, Optionen und Empfehlung unten im Kern-Wortlaut von Claude nachgetragen (2026-11-17). Die Spalte „Bedeutung“ gibt die Übergabe an den dokumentierenden Helfer wieder. Antworten im Wortlaut.

| Kennung | Thema | Nutzerantwort im Wortlaut | Bedeutung / Folge | Status |
|---|---|---|---|---|
| Q14 | Ein-Klick-Import: Erweiterung oder Lesezeichen | „a)“ | Chrome-Erweiterung behalten statt Lesezeichen. CLAUDE.md 4.4/Backlog angepasst, [Importplan](plans/2026-11-16-ein-klick-import.md). | entschieden |
| Q15 | Mistral für CVs | „a). Analysiere aber, inwieweit das mein Kontingent aufbrauchen wird.“ | Kein Mistral für CVs, CV nur über Claude; Mistral bleibt nur Phase-4-Kandidat für öffentliche Anzeigentexte. CLAUDE.md 3.2/4.2 angepasst, [CV-Plan](plans/2026-11-16-cv-abgleich.md). | entschieden; Kontingent-Analyse **offen** |
| Q16 | Was die Erweiterung auf Jobportalen übernimmt | „b) Prüfe aber, ob das sicher unbedenklich ist. Prüfe auch die exakten aktuellen Nutzungsbedingungen“ | Auf Portalen (LinkedIn, StepStone, Indeed, XING …) nur Adresse und Titel; Jobradar öffnet Portale nie selbst. CLAUDE.md 4.4. | entschieden; Prüfung Nutzungsbedingungen **offen** |
| Q17 | Fragen-/Antwortregel behalten | „Ja.“ | Regel bleibt, in CLAUDE.md 7 und AGENTS.md 4.7 auf rund drei Sätze gekürzt, Bedeutung unverändert. | erledigt |
| Q18 | Dokumentation verschlanken | „Essenziell dabei ist, dass du alle nötigen Infos hast, die du brauchst. Es sollen keine Infos verloren gehen.“ (Bedingung zur Verschlankung) | STATUS gekürzt, Codex-Pläne in [codex-pakete.md](plans/2026-11-16-codex-pakete.md) zusammengeführt (Verbleibtabelle dort), Testzahlen nur im Agentenprotokoll. | erledigt 2026-11-17 |
| Q19 | Nutzungskreis | „Erstmal starten wir ihn komplett privat und für Freunde. Wir brauchen aber zusätzlich einen Umbau-Plan, wenn er jemals kommerziell genutzt werden sollte“ | Privat und für Freunde; Umbau-Plan als Backlog-Punkt in CLAUDE.md 6. | entschieden; Umbau-Plan offen (erst vor kommerzieller Nutzung) |
| Q20 | Reihenfolge der Arbeit | „Jetzt das Groq-Paket und Hochladen abschließen, dann die offenen CV Fragen klären“ | STATUS „Nächster Schritt“ A → B → C. Beendet die Verschiebung der Groq-Probe vom 2026-11-15. | entschieden |
| Q21 | Ablauf des Hochladens | „Passt“ | Zweig pushen für Linux-CI → Nutzer spielt Migration 010 ein → erneut testen → „Ja, hochladen“ nach `main`. Halte-Punkte bleiben (Groq „passt“, erstes Live-Schreiben, „Ja, hochladen“). | entschieden |

| Q22 | Wünschenswertes („idealerweise“, „nice to have“) in „Das musst du mitbringen“ | „A“ (vorher: „Warum sollten muss punkte rausfliegen, sie sind doch essenziell. Idealerweise ist potenziell auch wichtig“) | Wünschenswertes erscheint im Feld `muss`, gekennzeichnet „(wünschenswert)“ bzw. „(nice to have)“; Pflicht-Punkte zuerst, höchstens 3 insgesamt. Ersetzt im Groq-Design Punkt 5 „ohne ‚wünschenswert‘“. | entschieden |

| Q23 | Teilzeit/Wochenstunden | Vorab: „32h sollte nicht vorkommen. Alles ab 35 Stunden sollte vorkommen“; auf Rückfrage: „Stelle ausblenden (Empfohlen)“ | Stellen unter 35 Wochenstunden werden im Vorfilter ausgeblendet (Titel: „Teilzeit“/„part-time“ ohne Vollzeit-Option oder Wochenstunden < 35); ab 35 Stunden bleiben sie. `scraper/filter.py`. | entschieden |

Präzisierungen zur Probe (Nutzer, 2026-11-17, ohne Q-Nummer): Sprachmix in einer Zusammenfassung „Das könnte auch okay sein. Hauptsache es ist in der Originalsprache der Anzeige“; „Muss“-Punkt wiederholt die Erfahrung wörtlich: „Das ist auch okay“. Ebenfalls „Das ist okay“: verlorenes „optional“ bei der Erfahrung (wirkt dann wie Pflicht) und Kleinigkeiten wie „Terminvereinbarung“ als Aufgabe oder „Hybrid“ im Rahmen. Alles das zählt in der Probe nicht mehr als Fehler.

| Q24 | CV: gescannte PDFs | „Claude liest das Bild“ | Scans werden von Claude (Abo) gelesen; Ergebnis in der Textvorschau korrigierbar. Mehrverbrauch in die Kontingent-Analyse (Q15) aufnehmen. | entschieden |
| Q25 | CV: Teilbelege und Ähnliches | „Teilbeleg gelb, Ähnliches rot“ | 3 statt 5 Jahre = Gelb. „Go statt Rust“ = Rot – Widerspruch zu Q3, durch Q28 („Doch gelb“) aufgelöst. | durch Q28 präzisiert |
| Q26 | CV: Muss/Soll unklar | „Als Muss (Empfohlen)“ | Alles ohne ausdrückliche Kennzeichnung als wünschenswert/idealerweise/von Vorteil zählt als Muss. | entschieden |
| Q27 | CV: Gleichstand | „Umschalter + Standard-CV (Empfohlen)“ | Hinweis „Gleich gut: CV A und CV B“ mit Umschalter; zuerst der in „Dokumente“ als Standard markierte CV, ohne Standard der erste der Liste, deutlich als Gleichstand gekennzeichnet. | entschieden |

| Q28 | CV: Rot bei „Go statt Rust“ (Widerspruch Q25/Q3) | „Doch gelb“ | Q3 bleibt: Rot nur, wenn der CV das Gegenteil belegt. Ähnliches statt Gefordertem = Gelb mit Begründung („Go statt Rust“). Teilbeleg (3 statt 5 Jahre) = Gelb. | entschieden |
| Q29 | CV: Zeitpunkt Nachtlauf | „Um 3:00 Nachts“ (eigene Antwort statt Optionen) | CV-Abgleich startet 03:00 deutscher Zeit (getrennt vom Stellen-Lauf ca. 05:00); nutzt die Anzeigen des Vortags. | entschieden |
| Q30 | CV: Grenze pro Nacht | „50 pro Nacht“ | Höchstens 50 Abgleiche (Stelle × CV-Version) pro Nacht, Rest in der nächsten Nacht; zusätzlich geordnete Pause am Abo-Limit. | entschieden |
| Q31 | CV: Aufbewahrung | „Nur aktuelle behalten“ | Veraltete Ergebnisse und überholte Korrekturfassungen werden gelöscht statt markiert; bis zur Neuberechnung erscheint kein Ergebnis („wird neu geprüft“). Ändert A11 („veraltet kennzeichnen“). | entschieden |

| Q32 | CV-KI: Anbieter (Neubewertung von Q15 auf Nutzerwunsch „Lass uns das nochmal detailliert bewerten“) | „Erstmal setzen wir A um, aber ich brauche eine belastbare Alternativlösung. Vor allem für den Fall, dass die Website mal live gehen sollte, ist mein eigenes Claude Konto natürlich keine Option“ | Jetzt Claude-Abo (A). Zusätzlich eine belastbare Alternative für den Live-Betrieb ausarbeiten (kommerzielle API mit Auftragsverarbeitungsvertrag, kein Training, möglichst EU); CV-KI anbieterunabhängig bauen, damit der Wechsel nur Konfiguration ist. Teil des Umbau-Plans (Q19). | entschieden; Alternative offen |
| Q33 | CV einmal strukturiert einlesen (Vorschlag des Nutzers) | „Nachdem ein CV hochgeladen wird, wird in der ersten Nacht der CV vom LLM eingelesen und die Infos strukturiert festgehalten. Beim Abgleich wird dann nicht wieder der CV aufgerufen, sondern nur dieser Text aus dem CV. Dadurch sparen wir Token weil wir nicht täglich die PDF lesen müssen.“ | Übernommen: pro CV-Version einmal Text gewinnen (Text-PDF/Word ohne KI, Scan per Claude, Q24) und einmal ein strukturiertes Profil mit wörtlichen Belegstellen erzeugen; Abgleiche nutzen nur das Profil. Neu bei geänderter Version/Korrektur. | übernommen |

| Q34 | CV-KI im Live-Betrieb: Nutzer-eigenes Abo? | Vorschlag: „Jeder Nutzer kann sein eigenes Claude oder GPT oder Gemini Abo für seine eigenen CV Abgleiche nutzen. Ist das umsetzbar?“ – auf Claudes Antwort (Abo-Weiterleitung von Anthropic verboten; Alternativen eigener API-Schlüssel / MCP-Anschluss im eigenen Assistenten / Kopieren-Einfügen): „Alle 3 Optionen sind absolute No Gos. Sei kreativ. Finde eine Lösung, wie wir das gratis umsetzen können.“ | Ausgeschlossen: Nutzer-API-Schlüssel, MCP-Anschluss, Kopieren/Einfügen. Gesucht: kostenlose Lösung ohne Aufwand für Nutzer. Claudes Vorschläge: (1) eingebautes Chrome-Modell (Prompt API, Gemini Nano, auf dem Gerät), (2) Bedeutungsvergleich mit kleinem Embedding-Modell + Regeln, (3) Oracle-Gratis-Server mit offenem Modell; Empfehlung 1+2 kombiniert. Antwort: „Deine Empfehlung klingt gut“. | entschieden: 1+2 für Live-Betrieb, vorher Wegwerf-Test |

| Q35 | Stichwörter für automatischen CV-Abgleich: Quelle | „Eigene neue Liste (Empfohlen)“ (Anlass, Nutzerfrage: „Was, wenn ich den Abgleich bei Stellen will, die bestimmte Stichwörter beinhalten? Nicht nur bei denen, die ich als gemerkt markiere?“) | Neue Liste „Automatisch abgleichen bei“ auf der Konto-Seite, je Nutzer, getrennt von „Wichtige Punkte“. | entschieden |
| Q36 | Stichwort-Treffer: wo | „Nur im Titel (Empfohlen)“ | Eine offene Stelle wird automatisch abgeglichen, wenn ein Stichwort im Titel steht. Gemerkte Stellen haben Vorrang (privat: Grenze 50/Nacht). | entschieden |
| Q37 | Wer nutzt welche CV-KI | Nutzeranweisung: „Baue diese Variante für jeden ein, der nicht Admin der Seite ist“ | Admin: Claude-Abo, nächtlich 03:00 (Q32). Alle anderen Nutzer: kostenloser Abgleich im Browser (Bedeutungsvergleich + Chrome-Modell, Q34), ereignisgesteuert (beim Merken, CV-Upload, Seitenöffnen). | entschieden |

| Q38 | Admin gibt Claude-Abgleich für einzelne Nutzer frei? | Wunsch: „Bzw. ich möchte lieber selbst manuell freigeben können, bei wem ein CV Abgleich über mein Claude Konto geht und bei wem nicht“ – nach Claudes Hinweis (Anthropic verbietet Anfragen über Abo-Zugangsdaten im Auftrag anderer Nutzer): „A“ | Nur der Admin nutzt das Claude-Abo; alle anderen Nutzer ausschließlich den Browser-Abgleich. Keine Freigabe-Liste, keine manuell angestoßenen Abgleiche für andere. Bestätigt Q37. | entschieden |

| Q39 | Vorauswahl des CVs per Bedeutungsvergleich (Vorschlag des Nutzers) | „Wird das nicht zu viel für das Kontingent meiner Freunde werden? Macht es vllt. Sinn, dass der CV, der verglichen werden soll für die Stelle in einer Vorauswahl durch den Bedeutungsvergleich ausgesucht wird?“ | Übernommen (Browser hat kein Kontingent, spart aber Rechenzeit): Stufe 1 prüft alle CV-Versionen, Stufe 2 nur den besten (bei knappem Abstand die zwei besten) und nur Grenzfälle. Gilt auch für den Claude-Weg des Admins. | übernommen |
| Q40 | Datenschutz: CV auf dem Server, Hinweis bei Registrierung? | „Prüfe außerdem, ob ich im Bezug auf deutsche Gesetze rund um Datenschutz den CV auf dem Server lassen darf? Muss dafür eine Art disclaimer erscheinen, dem Nutzer bei der Registrierung zustimmen müssen?“ | Claudes Einordnung (keine Rechtsberatung): Speichern über Art. 6 Abs. 1 lit. b zulässig; wegen möglicher Art.-9-Daten ausdrückliche Einwilligung beim ersten CV-Upload empfohlen, bei Registrierung nur Link zur Datenschutzerklärung. To-dos: Datenschutzerklärung ergänzen, Bedeutungsmodell selbst ausliefern, CV-Daten aus dem GitHub-Backup ausschließen, AVV mit Supabase/Vercel/GitHub prüfen, Löschen vollständig. | Einordnung gegeben; Umsetzung im CV-Design |

| Q13 | Portal-Erkennung freigeben (Wiedervorlage) | „Ja, bauen (Empfohlen)“ | Baustein laut Portalplan bauen: Karriere-Link prüfen, Greenhouse/Ashby/Personio erkennen, unbekannte Links verständlich melden; ohne Seitenabruf und automatische Anbindung. Nach dem Groq-Abschluss. | entschieden |
| Q41 | Grundsatz Firmenauswahl und Ranglisten (nach Rechte-Audit) | per Auswahl entschieden (Rückfragen im Gespräch geklärt) | Firmenauswahl auf Basis offener Quellen (EU-Scoreboard, Wikidata, EPA, CORDIS, offen lizenzierte Listen). Angezeigte Ränge nur, wo die Lizenz es für den jeweiligen Nutzerkreis erlaubt; jeder Rang-Eintrag hat eine Sichtbarkeit (Admin / angemeldet / öffentlich), per RLS durchgesetzt. Admin kann eine Liste von Hand einfügen (Freitext, HTML oder PDF; Groq extrahiert Firma, Rang, Jahr; Vorschau vor dem Speichern). | entschieden |
| Q42 | Behörden und Forschungseinrichtungen als Firmen | „Ja, mitzählen (Empfohlen)“ | Bundeswehr, Charité, Fraunhofer, Max-Planck u. ä. gehören zur Firmenauswahl. | entschieden |
| Q43 | Einheit „Firma“ bei Konzernen | „Je Karriereportal (Empfohlen)“ | Jede Marke mit eigenem Karriereportal ist ein eigener Eintrag (wie bisher). | entschieden |

| Q44 | Was zählt als „Stelle in Deutschland“ | „Auch Remote weltweit“ | Zusätzlich zu Ort in DE und Remote Europa/EMEA auch Remote-Stellen ohne Länderbeschränkung („worldwide“, „anywhere“). Filteränderung in `scraper/filter.py` offen. | entschieden |
| Q45 | Whitelist: für welche Stellen | „Alle Stellen der Firma“ | Bei Whitelist-Firmen wird keine Stelle wegen „Studium: nein“ ausgeblendet, auch einfache Tätigkeiten nicht. | entschieden |
| Q46 | Whitelist: Pflege | „Häkchen, sofort wirksam (Empfohlen)“ | Admin-Häkchen je Firma auf der Konto-Seite, ohne Nachtlauf wirksam. | entschieden |
| Q47 | Prestige-Listen vs. Whitelist | „Prestige ergänzt (Empfohlen)“ | Prestige-Firmen kommen automatisch dazu; Admin-Häkchen haben Vorrang (auch Abwählen). Welche Listen erlaubt sind, hängt an Q41. | entschieden |

| Q48 | KI-Kapazität: Vorrang | „Neue + Filterprofil zuerst (Empfohlen)“ | Nachtlauf fasst zuerst neue Stellen zusammen, dann zu gespeicherten Filtern/Stichwörtern passende, dann den Rest. | entschieden |
| Q49 | TK per Playwright | „Erst bei Bedarf (Empfohlen)“ | Kein Browser im Nachtlauf, bis mehrere wichtige Firmen ihn brauchen. | entschieden |
| Q50 | Mistral-Prüfung | „Ja, wie geplant (Empfohlen)“ | Phase-4-Prüfung laut `docs/phasen-vorarbeit.md` (8 Schritte), nur öffentliche Anzeigentexte. | entschieden |

| Q51 | Linksammlung zu Ranglisten | „Sammelseite mit Links (Empfohlen)“ | Bereich „Rankings zum Stöbern“ mit einfachen Links auf aktuelle Ranglisten, ohne Ränge, Logos oder Einbettung, für alle sichtbar. | entschieden |

Planungsrunde für Codex (Nutzer, 2026-11-17): „Lass uns mal Pläne für alle Phasen festlegen, damit ich mit Codex diese Pläne ausführen kann sobald ich kein Claude Limit mehr habe. Claude nutzt die Skills für Planung und strukturierte Fragen viel besser, daher möchte ich mit dir alle Details klären“.

| Q55 | Reihenfolge der Phasenpläne und des Baus durch Codex (Groq schließen Nutzer und Claude vorher ab) | „4 → 6 → 5 → 3 (Empfohlen)“ | Phase 4 (Firmen/Ranglisten) → Phase 6 (CV-Abgleich) → Phase 5 (KI-Filter) → Phase 3 (Kalender/Gmail; Google-Zugriffsrisiko vorher recherchieren). Ersetzt die Reihenfolge 4 → 3 → 5 → 6 in CLAUDE.md 6. | entschieden |

Fragetext Q55 (Claude, Auswahl): 4 → 6 → 5 → 3 (Empfohlen) / 6 → 4 → 5 → 3 / wie in CLAUDE.md: 4 → 3 → 5 → 6.

| Q56 | Wie werden Firmen aus offenen Quellen aktiv? | Freitext: „Abhängig von den Listen, ich kenne mich nicht aus und weiß nicht, was für Firmen in welcher Liste stehen, bzw. warum sie dort stehen. Mir ist wichtig, dass es sich bei den Listen jeweils um die Top xxx handelt, also eine Art Ranking oder so, damit ich sicher weiß, dass die Firmen groß oder sehr gut oder beliebt sind oder so“ | Firmenquellen müssen Ranglisten bzw. „Top N“ sein (Grund für die Aufnahme erkennbar); ein reines Nachschlagewerk wie Wikidata ist keine Liste, nur Datenquelle. Claude erklärte daraufhin, welche offenen Quellen echte Ranglisten sind (siehe Q57). | beantwortet |
| Q57 | Welche Listen bestimmen die Firmenauswahl? | Freitext: „Ich verstehe die Frage nicht. Die Firmennamen sollen jeweils aus jeder der Listen übernommen werden. Dafür sind die Listen ja da“ | Alle erklärten offenen Listen liefern Firmen: EU R&D Scoreboard (World 2000/EU 800), DAX/MDAX/SDAX/TecDAX (über Wikidata), „Top 20 je Branche nach Mitarbeitenden“ (aus Wikidata berechnet), größte Unternehmen Deutschlands (Wikipedia, Lizenzkette prüfen), Patent-Rangliste des EPA, EIC-geförderte Startups, Behörden/Forschung (Q42). Firmen werden automatisch übernommen; Ränge nur sichtbar, wo die Lizenz es erlaubt (Q41). | entschieden |

| Q58 | Firmen, deren Karriereseite/Portal das Programm nicht findet | Freitext: „Was heißt, dass das Programm etwas nicht finden kann. Ich dachte Programm und Claude suchen gemeinsam nach der Karriereseite einmalig für jede Firma, dann ist das für jede Firma ja festgelegt. Die Liste der Firmen ändert sich ja nur jedes halbe Jahr oder Jahr oder so, also nicht monatlich“ | Einmalige Ersteinrichtung je Firma: erst das Programm (Website aus Wikidata → Karriereseite → Portal erkennen), für den Rest recherchiert Claude (CLAUDE.md 4.3, öffentliche Firmendaten) Karriere-Link, Größe und Branche mit Quelle. Ergebnis wird fest gespeichert; neu gesucht nur für neue Firmen einer neuen Listen-Ausgabe oder bei defektem Portal (4f). | entschieden |

Fragetext Q58 (Claude, Auswahl, frei beantwortet): Admin-Liste zum Nachtragen (Empfohlen) / einfach weglassen / Liste + Claude-Vorschlag.

| Q59 | Zusatzfirma eines Freundes, Portal nicht gefunden (Claude darf für Freunde nicht suchen, Q38) | „Freund gibt Karriere-Link (Empfohlen)“ | Formular fragt nach Link zur Karriereseite oder einer Stellenanzeige; das Programm erkennt daraus das Portal; sonst Hinweis „diese Seite kann jobradar nicht lesen“. Keine Claude-Recherche für Freunde. | entschieden |

Fragetext Q59 (Claude, Auswahl): Freund gibt Karriere-Link (Empfohlen) / Admin bekommt Bescheid / Zusatzfirmen erst später.

| Q60 | Inhalt des täglichen Telegram-Digests | „Nur passende + Wunschfirmen (Empfohlen)“ | Neue Stellen, die zu gespeicherten Filtern/Stichwörtern passen, plus alle neuen Stellen der Wunscharbeitgeber; je Stelle eine Zeile mit Link, dazu „X weitere neue Stellen“ als Link zur Website. | entschieden |

Fragetext Q60 (Claude, Auswahl): nur passende + Wunschfirmen (Empfohlen) / nur Zahlen + Link / alles Neue.

| Q61 | Wo liegen die Firmendaten? | „Weg 1“ mit Zusatzbedingung zur Herkunftsanzeige (Wortlaut nicht im öffentlichen Repo) | Firmen aus offenen Quellen als Datei im Repo (Name, Karriere-Link, Portal, Größe, Branche, Quelle; Änderungen per Pull Request), Nachtlauf überträgt in die Datenbank. Alle übrigen Firmen (Zusatzfirmen, vom Admin von Hand ergänzte) nur in der Datenbank; ihre Herkunft sieht nur der Admin, Firma und Stellen sehen alle (bzw. bei Zusatzfirmen nur der Nutzer). Öffentlich einsehbar ist eine Herkunft nur bei offenen Quellen. | entschieden |

Fragetext Q61 (Claude, Auswahl): Weg 1: Repo + DB (Empfohlen) / Weg 2: nur Datenbank.

| Q62 | Rückmeldung zum Phase-4-Design (Nutzer, frei) | „zusatzfirmen werden dem Admin ebenfalls gemeldet. Der Admin kann die Zusatzfirmen auch für sich selbst oder alle freigeben. […] 4. Warum immer nur 100 Firmen pro Nacht? Das kann doch zu 90% durch reinen code geregelt werden. Alles, wo durch reinen Code nicht die Karriereseite gefunden werden kann, kann gemeinsam am näcshten morgen mittels Claude Code geprüft werden.“ | Neue Zusatzfirmen erscheinen in einer Admin-Liste (Firmenname, Link, Anzahl Nutzer, ohne Nutzernamen); Admin gibt für sich oder für alle frei; Formular und Datenschutzerklärung nennen das (Ausnahme von CLAUDE.md 4.6 nur für Firmenname/Link). Einrichtungslauf für alle Kandidaten auf einmal (Fortsetzung in der nächsten Nacht nur bei Zeitlimit); Rest gemeinsam am Morgen in einer Claude-Code-Sitzung, kein nächtlicher Claude-Workflow. | entschieden |

| Q63 | Wie nutzen alle Nutzer die Chrome-Erweiterung, sobald die Seite live ist? (Nutzerfrage) | Claudes Empfehlung: jetzt Download von der Konto-Seite (ZIP, „Entpackte Erweiterung laden“, Anleitung mit eigener Adresse zum Kopieren); Chrome Web Store „nicht gelistet“ erst bei mehr Freunden oder öffentlichem Start (kostet einmalig Gebühr, ausdrückliche Zustimmung nötig). Antwort: „Der von dir genannte Plan passt“ | Paket „Erweiterung verteilen“ (Weg A) für Codex; Store-Veröffentlichung später als eigene Entscheidung (CLAUDE.md 3.1). | entschieden |

| Q64 | Anzeige ohne Abschluss (Groq `abschluss = null`) auf der Stellenseite (Anlass, Nutzerfrage 2026-11-18: „Wenn bei Abschluss "null" steht, wie wird das am Ende auf meiner Seite angezeigt?“) | „Nichts anzeigen (wie heute)“ | Leere Felder bleiben in „Das bringst du mit“ weggelassen; keine Zeile „nicht genannt“. | entschieden |

Fragetext Q64 (Claude, Auswahl): „Abschluss: nicht genannt“ (Empfohlen) / nichts anzeigen (wie heute).

Nutzer 2026-11-18 zur Groq-Probe v13 (A und B je 20 Anzeigen): „Das passt alles für mich als Admin.“ Dazu: „Lass für andere Leute, die die Website nutzen das Sprachniveau drin. Meine Freundin soll eine der testerinnen sein. Deutsch ist nicht ihre Muttersprache. Bei ihren soll einerseits die erforderlichen Sprachkenntnisse in der Zusammenfassung angezeigt werden, andererseits soll sie einen Filter setzen können, der ihr nur Stellen anzeigt mit Deutsch B1, B2, C1, Muttersprache, damit sie das vorab entscheiden kann. Für andere meiner Freunde ist das aber vielleicht nicht relevant, daher sollen meine aktuellen Ausschlusskriterien bei der Zusammenfassung zusätzlich für jeden Nutzer auswählbar sein, damit jemand sagen kann, dass z.B. die Sprache doch in der Zusammenfassung auftaucht“ (personenbezogene Angabe zur Testerin hier nur sinngemäß nötig; Wortlaut ohne Namen).

| Q65 | Filter „Mein Deutschniveau“: Stellen ohne Niveau-Angabe | „Zeigen mit Hinweis (Empfohlen)“ | Sichtbar mit Markierung „Deutsch: Niveau nicht angegeben“. | entschieden |
| Q66 | Welche Ausschlussregeln sind je Nutzer wieder einschaltbar? | „Sprachkenntnisse“ | Nur Sprachen (aus dem Steckbrief, ohne KI) sind wählbar; Standard aus für den Admin, an für alle anderen. Vollzeit/Befristung und Qualitätsregeln bleiben fest. | entschieden |

Präzisierung zu Q65 (Nutzer 2026-11-18): „„Deutsch von Vorteil“: Die Stelle bleibt immer sichtbar.“ sollte aber trotzdem genau so angegeben werden“ → Hinweis „Deutsch von Vorteil“ wird immer ausdrücklich angezeigt (Design ergänzt).

Fragetexte Q65/Q66 (Claude, Auswahl): Q65 zeigen mit Hinweis (Empfohlen) / ausblenden / eigenes Häkchen im Filter. Q66 Mehrfachauswahl Sprachkenntnisse / Vollzeit-Befristung / Qualitätsregeln (Empfehlung: nicht wählbar).

Prüfung 2026-11-18 (Nutzerfrage „Hast du das mit den Sprachkenntnissen schon geprüft?“): Steckbrief-Regel an den 40 Probe-Anzeigen: 24 erwähnen Deutsch; 3 richtig mit Niveau, 1 falsch, 6 verpasst trotz Niveau, 9 nur vage Worte, 5 nur „von Vorteil“.

| Q67 | Wie wird das verlangte Deutschniveau zuverlässig erkannt? | „Bessere Regeln (Empfohlen)“ | Steckbrief-Regel ausbauen und an den 40 Anzeigen als Testfälle messen; keine Groq-Änderung. | entschieden |
| Q68 | Vage Worte ohne Stufe | „Übersetzen (Empfohlen)“ | „gute“ = B2; „sehr gute“, „fließend/fluent/fluency“, „business-level“, „excellent“ = C1; „verhandlungssicher“ = C2; „Muttersprache/native“ = Muttersprache; im Filter mit „≈“ als geschätzt markiert. | entschieden |

Fragetexte Q67/Q68 (Claude, Auswahl): Q67 bessere Regeln (Empfohlen) / Groq zusätzlich fragen. Q68 übersetzen (Empfohlen) / als „nicht angegeben“.

Nutzer 2026-11-18 nach erfolgreichem Vercel-Test der Groq-Erkennung aus Text: „Es hat geklappt. Die Funktionalität ist mir aber ehrlich gesagt nicht so wichtig. Mir ist wichtiger, dass die Seite aus einem Link direkt die Stelle erkennt“.

| Q69 | Bei welchen Links klappt die Erkennung heute nicht? (Mehrfachauswahl: LinkedIn / StepStone, Indeed, XING / Karriereseiten großer Firmen / andere Karriereseiten) | „All das. Stell aber sicher, dass du nichts verbotenes machst!!! Wenn du das mit Linkedin und StepStone regeln willst, musst du wirklich die Stelle auf der originalquelle finden, ohne linkedin aufzurufen“ | Alle vier Arten verbessern. Jobportale werden nie aufgerufen (Q16 bleibt); bei Portal-Links wird die Stelle auf der Karriereseite der Firma gesucht. | entschieden |
| Q70 | Was heißt „direkt erkennen“? | „Komplette Stelle (Empfohlen)“ | Firma, Titel, ganzer Anzeigentext, Steckbrief und Groq-Zusammenfassung wie bei Stellen der Stellenliste. | entschieden |

| Q71 | Wann wird die bessere Link-Erkennung gebaut? | „Schnellstart + Rest in Phase 4 (Empfohlen)“ | Paket Link-Schnellstart (JobPosting von beliebigen Firmenseiten) vor Phase 4, Design `docs/superpowers/specs/2026-11-18-link-schnellstart-design.md`; Workday/SuccessFactors und Suche zu Jobportal-Links als Teil 4g nach 4c. | entschieden |
| Q72 | Linksammlung „Rankings zum Stöbern“: wo läuft die monatliche Pflege durch Claude? (Anlass, Nutzer 2026-11-18: „Ich möchte aber, dass die Links zu den Rankings von Claude erstellt werden und einmal pro Monat aktualisiert werden“) | „Privates Repo (Empfohlen)“ | Monatlicher Claude-Ablauf im privaten Repo schreibt nur Titel und Link in die Datenbank (wie Q51). Kein Admin-Formular für die Links in 4d. | entschieden |
| Q73 | Sollen Gäste ohne Konto Ränge sehen? (Nutzerfrage: „Warum ist das der Fall?“) | Nutzer: „Rände nur für Angemeldete!!! Falls ich das jemals kommerziell machen wollen würde, müssen wir nochmal bewerten, was wer sehen kann. Schreibe das in den Backlog mit dem Hinweis“ | Ränge nie für Gäste; Sichtbarkeitswerte nur `admin`/`angemeldet`. Backlog-Hinweis beim Umbau-Plan für kommerzielle Nutzung. | entschieden |
| Q74 | Wie viele neue Reparaturen durch Claude pro Nacht? (Nutzerfrage: „Reparatur Issues die behoben werden, oder die gespeichert/festgehalten werden?“) | „3 pro Nacht (Empfohlen)“ | Höchstens 3 neue Issues mit Reparatur je Nacht; alle Probleme werden immer im Laufbericht gespeichert und per Telegram gemeldet. | entschieden |
| Q75 | Wie viele eigene Firmen je Nutzer? (Nutzerfrage: „Woher kommt diese Regel?“ – die 20 war Claudes Vorschlag) | „50 je Nutzer (Empfohlen)“ | Grenze 50 je Nutzer; Portale: alle, die der Nachtlauf lesen kann (Greenhouse, Ashby, Personio, Recruitee; später Adapter aus 4c-3). | entschieden |
| Q76 | Workday-Karriereseiten: wie abrufen? (Workday-Bedingungen verbieten Auslesen von workday.com und Workday-Schnittstellen; Firmen-Karriereseiten erlauben laut robots.txt das Lesen und bieten eine Sitemap) | „Nur Sitemap + Stellenseite (Empfohlen)“ | Workday/SuccessFactors nur über die angebotene Sitemap und die Stellenseiten (vorhandener Sitemap-Adapter), nie `/wday/cxs/`; `career*.successfactors.*` gesperrt (robots.txt). | entschieden |
| Q77 | Wikipedia-Liste „Größte Unternehmen Deutschlands“ nutzen? (geprüft: zwei Teile aus Quellen ohne offene Lizenz, einer mit Zahlen von 2020) | „Weglassen (Empfohlen)“ | Keine Wikipedia-Liste; große Firmen über Top 20 je Branche und Börsenindizes. | entschieden |
| Q78 | EIC-Startups: CORDIS-Lizenz offen, robots.txt verbietet Programmen den Download-Ordner | „Einmal im Jahr von Hand (Empfohlen)“ | Nutzer lädt die CORDIS-Datei jährlich im Browser; Programm liest sie lokal; Parser als Nachtrag nach dem ersten Download. | entschieden |
| Q79 | Wann kommen „Firmen im Filter ausschließen“ und „frühere Suchen speichern“? (Nutzerwunsch 2026-11-19: „Ich möchte auf der Website in den Filtern auch Firmen ausschließen können. Außerdem möchte ich frühere Suchen speichern können“) | „In Phase 5 lassen“ | Beides in Phase 5 (Sperrliste für Firmen, gespeicherte Suchprofile, CLAUDE.md 4.1); vermerkt in `docs/phasen-vorarbeit.md`. | entschieden |
| Q80 | „Top 20 je Branche“ aus Wikidata laut Probe unzuverlässig – wie weiter? | „Durch „Top 300 Arbeitgeber“ ersetzen“ | Liste „Top 300 Arbeitgeber“ (größte deutsche Arbeitgeber laut Wikidata, mit Reparaturen) statt Top 20 je Branche. | entschieden |
| Q81 | EU-Scoreboard: wie viele Firmen? | Nutzer: „Nur Top 250 weitweit, ohne alle 800 EU Firmen dazu zu nehmen“ | Nur Rang 1–250 der World-2000-Liste, keine EU-800. | entschieden |
| Q82 | Quellen ohne Rang (EIC, Behörden/Forschung, heutige 13 Firmen): welche bleiben? | „EIC-Startups“ | Nur EIC bleibt; Behörden-/Forschungsliste entfällt (ersetzt Q42). Nutzer zusätzlich: „Das brauche ich nicht: Wohlfahrtsverbände, Unis, Polizei und Bundeswehr“. | entschieden |
| Q83 | Was passiert mit den 10 heutigen Firmen ohne Listenplatz? | Nutzer: „Gibt es keine Liste, die Top Defence Startups oder wertvollste Startups aufnimmt? Da wäre Helsing und Quantum Systems doch safe dabei... Ansonsten im Zweifel alle 13 behalten als meine eigene Auswahl“ | Keine offene Liste dafür gefunden (Wikidata kennt weltweit nur 48 „Unicorns“, ohne diese Firmen) → alle 13 bleiben als Auswahl des Admins (Sichtbarkeit Q93). | entschieden |
| Q84 | Wie wird „Top 300“ aktiv? | „Automatisch, Fehler später“ | Liste geht automatisch live; Fehler streicht der Nutzer über `data/firmen_korrekturen.csv`. | entschieden |
| Q85 | Welche Arbeitgeber nicht in „Top 300“? | „Kliniken und Pflegeheime“, Nutzer: „Keine Landesministerien“ | Ausschluss Kliniken, Pflegeheime, Landesministerien (dazu Q82-Zusatz); öffentliche Banken und Krankenkassen bleiben. | entschieden |
| Q86 | Börsenindizes: SDAX und TecDAX auch? | „Alle vier (Empfohlen)“ | DAX, MDAX, SDAX, TecDAX vollständig. | entschieden |
| Q87 | Scoreboard Top 250 weltweit, egal wo der Sitz ist? | „Ja, so (Empfohlen)“ | Wie Q81, Sitz egal; aktiv nur mit Stellen in DE/remote. | entschieden |
| Q88 | EPA Top 100: Firmen für alle, Rang nur Admin? | „Ja, so (Empfohlen)“ | Wie gefragt. | entschieden |
| Q89 | Welche EIC-Startups? | „Accelerator, ganz Europa“ | EIC-Accelerator-Geförderte aus ganz Europa; aktiv nur mit Stellen in DE/remote. | entschieden |
| Q90 | Firma fällt von allen Listen – was dann? | „Stellen verschwinden (Empfohlen)“ | Wie CLAUDE.md 4.8; Bewerbungen bleiben. | entschieden |
| Q91 | Behörden in „Top 300“? | Nutzer: „Alle Behörden außer Auswärtiges Amt und BND raus“ | Behörden und Verwaltungen raus, Ausnahmen Auswärtiges Amt und BND; Bundesbank bleibt als öffentliche Bank. | entschieden |
| Q92 | Unicorns (wertvolle Startups) als Quelle? | Nutzer wünscht deutsche und europäische Unicorns | Keine Liste mit offener Lizenz vorhanden; keine automatische Quelle. | entschieden |
| Q93 | Die 13 heutigen Firmen: für wen sichtbar? | „Nur für mich“ | Werden mit 4e private Firmen des Admins; Zusatzfirmen-Limit 50 gilt nicht für den Admin (Nutzer: „Es soll außerdem zwar für alle ein Limit von 50 eigenen Firmen gelten, für den Admin gilt das aber nicht“). | entschieden |
| Q94 | Wie viele Firmen je Liste? (Nutzer 2026-11-19: „Als zweites möchte ich festlegen, dass wir aus jeder Liste, auch die, bei denen ich gesagt habe top 300, doch nur die top 200 Companies nehmen. Wie viele Firmen haben wir dann etwa in Summe?“) | Nutzerfestlegung | Aus jeder Liste höchstens Top 200 (Arbeitgeber-Liste 200 statt 300, Scoreboard 200 statt 250). Schätzung Claude: roh ~3.100, ohne Doppelte ~1.500–2.000, aktiv ~900–1.300. | entschieden |
| Q95 | Listen ohne Rang (EIC) und Listen unter 200 Firmen? | Nutzer: „Ausnahme von der 200 Grenze, wenn eine Liste weniger als 200 Firmen hat“ | Kleinere Listen ganz. Für EIC (mehr als 200, ohne Rang) Claudes Vorschlag bis zur Gegenrede: die 200 zuletzt geförderten; ersetzt durch Q97. | entschieden (Q97) |
| Q96 | Nutzer sehen Kategorien statt Einzellisten? Vorschlag: Top-Arbeitgeber · Beliebt bei Studierenden · Große Unternehmen · Börsennotiert · Innovation · Wachstum & Startups · Top-Gehalt Tech | Nutzer: „Das passt so. … Ich möchte für mich aber nicht nur den Rang sehen, sondern auch nach Rang sortieren können“ | Sieben Kategorien als Filter; wer eine Liste sehen darf, sieht Rang und sortiert nach Rang. | entschieden |
| Q97 | EIC Accelerator ohne Rang, mehr als 200 Firmen: welche 200? | Nutzer: „200 mit höchster Förderung“ | Die 200 Firmen mit der höchsten EU-Förderung (ersetzt Claudes Vorschlag aus Q95). | entschieden |
| Q98 | Eine Kategorie, zu der nur eine einzige Quelle beiträgt: trotzdem für alle Angemeldeten zeigen? | Nutzer: „So lassen“ | Alle sieben Kategorien bleiben wie in Q96 festgelegt. | entschieden |
| Q99 | Weitere Listen zur Auswahl vom 2026-11-19 ergänzen? | Nutzer: „Nichts, war ein Versehen“ | Es bleibt bei der getroffenen Auswahl. | entschieden |
| Q100 | Für welche Phase als Nächstes Fragen klären bzw. den Plan schreiben? | Nutzer: „Phase 6 CV-Abgleich (Empfohlen)“ | Als Nächstes Phase 6: Claude prüft Abo-Kontingent und Abo-Bedingungen, dann Design und Plan. | entschieden |
| Q101 | Wie viele Stellen merkst du dir pro Woche ungefähr vor? (für die Kontingent-Schätzung Phase 6) | Nutzer: „10–30“ | Normale Woche ≈ 40 Abgleiche inkl. Stichwort-Treffer, ≈ 0,4 Mio. Tokens (Schätzung, `docs/plans/2026-11-16-cv-abgleich.md`). | beantwortet |
| Q102 | Wie viele CV-Versionen wirst du hochladen? | Nutzer: „5 oder mehr“ | Mit 6 Versionen gerechnet; mehrere Stellen je Aufruf bündeln, damit die CVs nur einmal mitgelesen werden. | beantwortet |
| Q103 | Admin: sofort vorläufige Farben aus dem kostenlosen Bedeutungsvergleich im Browser, Grenzfälle nachts durch Claude? (Anlass, Nutzer: „Aber die Farben werden ja auch erstellt beim gratis Modell ohne Claude, oder?“) | Nutzer: „Ja, sofort + nachts genauer (Empfohlen)“ | Admin bekommt beim Merken sofort Grün/Gelb aus Stufe 1, Grenzfälle als „wird heute Nacht geprüft“; der Nachtlauf ersetzt das vorläufige Ergebnis. Kein zusätzliches Kontingent. Ergänzt Q37. | entschieden |
| Q104 | Welchen Bereich als Nächstes klären und planen? | Nutzer: „Phase 4g Stelle aus Link“ | Nächster Plan: 4g (Stelle aus Portal-Link auf der Originalquelle finden); Codex baut es erst nach 4b/4c. | entschieden |
| Q105 | Freunde: Chromes eingebautes Modell muss erst heruntergeladen werden (mehrere GB, Klick nötig). Wie umgehen? (Anlass, Nutzer: „Hast du für Phase 6 keine Fragen an mich? Ist alles endgültig geklärt?“) | Nutzer: „Knopf anbieten (Empfohlen)“ | Hinweis mit Größe und Knopf „Genauer prüfen: Chrome-KI einmalig laden“; ohne Klick bleibt es bei Grün/Gelb. Ersetzt „kein Download auslösen“ im Plan 6b. | entschieden |
| Q106 | „Wichtige Punkte“ nach Bedeutung (CLAUDE.md 6) fehlte im Konzept. Was damit tun? | Nutzer: „In 6b mitnehmen (Empfohlen)“ | Neuer Task 5 in Plan 6b: gleicher Bedeutungsvergleich im Browser, für alle, kein Claude-Kontingent. | entschieden |
| Q107 | 4g: Wann die Originalstelle zu einem Portal-Link suchen? | Nutzer: „Sofort + neue Firmen nachts (Empfohlen)“ | Bekannte Firma sofort in den jobradar-Stellen; unbekannte Firma (Website, Portal, Stelle) im Nachtlauf. | entschieden |
| Q108 | 4g: Was passiert mit einer unbekannten Firma, deren Stelle gefunden wurde? | Nutzer: „Nur Stelle + Knopf (Empfohlen)“ | Nur diese Stelle wird übernommen; Knopf „Firma dauerhaft beobachten“ macht sie zur Zusatzfirma (4e, zählt zur Grenze 50). | entschieden |
| Q109 | 4g: Kein Treffer mit gleichem Titel auf der Firmenseite? | Nutzer: „Ähnliche zur Auswahl (Empfohlen)“ | Bis zu 5 ähnliche Stellen (ohne KI, gemeinsame Wörter) zur Auswahl; „Keine davon“ behält Firma/Titel mit Hinweis. | entschieden |
| Q110 | 4g: Firma ohne Website in Wikidata? | Nutzer: „Nur Hinweis“ | Hinweis „Original nicht gefunden“, kein Website-Feld. | entschieden |
| Q111 | Phase 6: Bewerbungen ohne Stelle in jobradar auch abgleichen? (Fund der Kontrollfrage beim 4g-Plan) | Nutzer: „Ja, auch abgleichen (Empfohlen)“ | Anforderungen aus der gespeicherten Anzeige der Bewerbung; 6a/6b und Migration 018 ergänzt. | entschieden |
| Q112 | Firmendaten falsch (z. B. Mitarbeiterzahl): soll Claude auf Wunsch recherchieren und eine Korrektur mit Quelle vorschlagen? (Fund der Kontrollfrage vor dem Hochladen; erste Fassung mit Label/Pull Request – Nutzer: „Ich verstehe die Frage nicht“) | Nutzer: „Ja, auf Klick (Empfohlen)“ | Knopf „Firmendaten prüfen lassen“ für den Admin; Claude recherchiert, Pull Request auf die Korrekturdatei, Nutzer bestätigt. Neuer Task 2b in 4f. | entschieden |
| Q113 | Wöchentlicher Kurzbericht (CLAUDE.md 4.3) fehlt in den Plänen. Was tun? | Nutzer: „Streichen“ | Entfällt; CLAUDE.md 4.3 angepasst. | entschieden |
| Q114 | Firmendaten anreichern (Rolle im Markt, Eigentümer, Gründungsjahr)? | Nutzer: „Mit Phase 5 Filtern (Empfohlen)“ | Felder und Quellen werden mit den Filtern in Phase 5 geklärt. | entschieden |
| Q115 | TK nur per „Mehr laden“: Playwright-Entscheidung? | Nutzer: „Nach Portal-Messung 4c (Empfohlen)“ | Entscheidung, wenn die Messung zeigt, wie viele Firmen nur per Browser gehen. | entschieden |
| Q116 | Phase 5, Unternehmen: welche Filter wirklich nutzen? (Mehrfachauswahl) | Nutzer: „Mitarbeiterzahl als Spanne, Eigentümer“ | Beide in Phase 5; Unternehmensalter und eigene Firmenbewertung in den Backlog. | entschieden |
| Q117 | Phase 5, Rolle: welche Filter? (Mehrfachauswahl) | Nutzer: „Jahre Berufserfahrung, Personalverantwortung, Vertriebsanteil“ | Alle drei in Phase 5; Abschluss siehe Q120. | entschieden |
| Q118 | Phase 5, Gehalt, Vertrag und Ort: welche Filter? (Mehrfachauswahl) | Nutzer: „Mindestgehalt, Vertragsdetails, Präsenztage / Remote-Gebiet“ | Alle drei in Phase 5; Umkreis um München in den Backlog. | entschieden |
| Q119 | Phase 5, Qualität und Suche: welche Funktionen? (Mehrfachauswahl) | Nutzer: „Ghost-Job-Ampel, Vermittler erkennen, Synonymgruppen“ | Alle drei in Phase 5; Muss-/Soll-Kriterien in den Backlog. | entschieden |
| Q120 | Nachtrag des Nutzers zu Q117 | Nutzer: „Ich habe ausversehen "Geforderter Abschluss" nicht angeklickt. Das soll aber auch filterbar sein“ | Geforderter Abschluss in Phase 5 (Text kommt schon von Groq, Regel übersetzt in Stufen). | entschieden |
| Q121 | Stellen ohne Angabe bei gesetztem Filter? | Nutzer: „Zeigen mit Hinweis (Empfohlen)“ | Sichtbar mit „nicht angegeben“; Häkchen „nur mit Angabe“ blendet sie aus (wie Q65). | entschieden |
| Q122 | Neue Groq-Felder für Bestandsstellen? | Nutzer: „Nach und nach (Empfohlen)“ | Neue Stellen zuerst, Bestand mit Rest-Kontingent je Nacht, gemerkte zuerst. | entschieden |
| Q123 | Firmen ausschließen: wie wirken? | Nutzer: „Beides (Empfohlen)“ | Ausschluss im Filter (Teil der gespeicherten Suche) und dauerhafte Sperrliste auf der Konto-Seite. | entschieden |
| Q124 | Gespeicherte Suchen mit Benachrichtigung? | Nutzer: „Nein, nur speichern“ | Nur speichern und wieder öffnen, keine Nachrichten. | entschieden |
| Q125 | Filter „Geforderter Abschluss“: wie funktionieren? | Nutzer: „Promotion soll nur wegfallen, wenn in der Anzeige ausdrücklich steht, dass Promotion benötigt wird, nicht so etwas wie Master oder Promotion. Diese Stelle müsste definitiv bleibem“ | „Mein Abschluss“ wie Deutschniveau; maßgeblich ist die niedrigste akzeptierte Alternative („Master oder Promotion“ = Master). | entschieden |
| Q126 | Ghost-Job-Ampel: Kriterien? (Mehrfachauswahl) | Nutzer: „Taucht immer wieder auf, Lange online“ | Mehr als 60 Tage online; gleiche Firma und gleicher Titel verschwindet und erscheint neu. Keine Groq-Bewertung. | entschieden |
| Q127 | Vermittler standardmäßig? | Nutzer: „Kennzeichnen, sichtbar (Empfohlen)“ | Markierung „Vermittler“, Filter zum Ausblenden. | entschieden |
| Q128 | Vertriebsanteil: Stufen? | Nutzer: „Kein / etwas / überwiegend (Empfohlen)“ | Drei Stufen durch Groq. | entschieden |
| Q129 | Mindestgehalt bei Spanne 60–75 k und Filter 70 k? | Nutzer: „Ja, obere Grenze zählt (Empfohlen)“ | Stelle erscheint; Spanne wird daneben angezeigt. | entschieden |
| Q130 | Neue Filter auch für Gäste? | Nutzer: „Nur für Angemeldete (Empfohlen)“ | Gäste behalten die bisherigen Filter; neue Spalten bleiben für Gäste gesperrt (Migration 007). | entschieden |
| Q131 | Kontrollfrage Phase 5: weitere Punkte aus CLAUDE.md 4.1? (Mehrfachauswahl) | Nutzer: „Dubletten zusammenführen, Workation, Rolle im Markt / Kundenbranche“ | Alle drei in Phase 5; Ansprechpartner/Bewerbungsweg in den Backlog. | entschieden |
| Q132 | Was ist mit „Rolle im Markt“ gemeint? (Geschäftsmodell / Marktposition / Beides) | Nutzer: „Geschäftsmodell (Empfohlen)“ | Hersteller, Zulieferer, Dienstleister, Beratung, Handel, Software/Plattform, Finanzdienstleister; Groq aus dem Firmenteil der Anzeigen. Marktposition entfällt (keine verlässliche Quelle). | entschieden |
| Q133 | Gehaltsschätzung für Stellen ohne Angabe – wohin? (Anlass, Nutzer: „Haben wir irgendwo im Plan noch festgelegt, dass du Gehälter schätzen sollst?“ – war zwischen Phase 4 und 5 hin- und hergeschoben, ohne Rückfrage) | Nutzer: „Phase 5, mit Filter (Empfohlen)“ | Schätzung aus Daten ohne KI (Firma → ähnliche Titel → Entgeltatlas nach Prüfung), markiert „geschätzt aus …“, Häkchen „Schätzung beim Filtern mitzählen“. Plan Phase 5 Task 0 und 3b. | entschieden |
| Q134 | Gehaltsschätzung Stufe 3: Entgeltatlas ohne offizielle Schnittstelle – was tun, wenn weder Angabe noch genug ähnliche Anzeigen? (Anlass, Nutzer: „Warum ist das nicht geprüft?“) | Nutzer: „Keine Schätzung (Empfohlen)“ | Stufe 3 entfällt; Stelle zeigt „Gehalt: nicht angegeben“. | entschieden |
| Q135 | LinkedIn verbietet Browser-Erweiterungen, die Inhalte kopieren – was soll die Erweiterung auf LinkedIn tun? | Nutzer: „LinkedIn ganz raus“ | Erweiterung übernimmt auf LinkedIn nichts; Link fügt der Nutzer selbst ein. | entschieden |
| Q136 | e5-small ist 118 MB statt ≤ 50 MB – wie für die Website lösen? | Nutzer: „Modell verkleinern (Empfohlen)“ | Codex kürzt den Wortschatz auf Deutsch/Englisch (6a Task 0b), Prüfung Ähnlichkeit ≥ 0,99. | entschieden |
| Q137 | Nachtrag des Nutzers zu Q135 | Nutzer: „XING uns Stepstone darfst du nicht auslesen“ / „Ich möchte mein LinkedIn Konto auf gar keinem Fall riskieren!“ | Erweiterung übernimmt auf LinkedIn, StepStone und XING nichts; keine Anleitung mehr, LinkedIn-Texte zu kopieren (Klicktest A10 geändert). | entschieden |
| Q138 | Phase 3 (Gmail/Kalender): für wen? | Nutzer: „Erst ich, Freunde später“ | Nur Admin, aber so gebaut, dass Freunde später dazukommen können (kein Persönlicher Modus). | entschieden |
| Q139 | Phase 3: welche Teile? (Mehrfachauswahl) | Nutzer: „Interview-Briefing, Mailverlauf an Bewerbung, Alle Mails von der Firma sollen ausgelesen werden und basierend darauf sollen Status, next steps etc. gesetzt werden“ | Briefing, Mailverlauf, Auswertung aller Firmenmails; Nachfass-Erinnerung in den Backlog. | entschieden |
| Q140 | Termine im Google Kalender anlegen? | Nutzer: „Eigener Kalender (Empfohlen)“ | Eigener Kalender „Jobradar“ (`calendar.app.created`), andere Kalender nur lesen. | entschieden |
| Q141 | Kanal für Briefing und Erinnerungen? | Nutzer: „Telegram (Empfohlen)“ | Telegram (Bot aus 4f). | entschieden |
| Q142 | Mail mit Einladung: setzen oder vorschlagen? | Nutzer: „Setzen, mit Hinweis (Empfohlen)“ | Automatisch setzen mit „Automatisch aus Mail vom …“ und „Rückgängig“; Einladung/Absage/Angebot zusätzlich per Telegram. Ersetzt CLAUDE.md 4.7 „nur vorgeschlagen“. | entschieden |
| Q143 | Welche Mails lesen? | Nutzer: „Firma + Bewerbungssysteme (Empfohlen)“ | Firmen-Domains und bekannte Bewerbungssysteme, wenn der Firmenname einer laufenden Bewerbung vorkommt. | entschieden |
| Q144 | Wie viel einer Mail speichern? | Nutzer: „Volltext (Empfohlen)“ | Absender, Betreff, Datum, Text ohne Anhänge, Link zu Gmail. | entschieden |
| Q145 | Briefing in Telegram / Vorbereitungsfragen | Nutzer: „Kurz + Link (Empfohlen)“ / „Claude erstellt sie (Empfohlen)“ | Telegram nur kurz mit Link; Briefing-Seite in jobradar; Claude erstellt Fragen. | entschieden |
| Q146 | Bauweise Phase 3 | Nutzer: „B: Knopf auf der Website“ | Knopf „Google verbinden“, Token verschlüsselt in der Datenbank (Claude hatte A empfohlen). | entschieden |
| Q147 | Website nur verschließen, nur stündlicher Lauf öffnet? | Nutzer: „Ja, so bauen (Empfohlen)“ | Öffentlicher Schlüssel in Vercel, privater nur im privaten Repo; Trennen im nächsten Lauf. | entschieden |
| Q148 | Welches Postfach? | Nutzer: „Entscheide ich noch“ | Entscheidung beim Verbinden; Anleitung empfiehlt eigene Bewerbungs-Adresse. | entschieden |
| Q149 | Nachtrag zur Pünktlichkeit des 1-Stunden-Briefings | Nutzer: „Dann stellen wir hier lieber 1,5std ein sicherheitshalber“ | Kurznachricht ab 2,5 h vorher → kommt etwa 1,5–2,5 h vorher. | entschieden |
| Q150 | Wie schnell Status nach Mail? | Nutzer: „Stündlich (Empfohlen)“ | Stündlicher Lauf im privaten Repo. | entschieden |
| Q151 | Mail-Texte und Gmail-Schlüssel im GitHub-Backup? | Nutzer: „Nicht sichern (Empfohlen)“ | Nicht im Backup; Mails neu aus Gmail holbar. | entschieden |
| Q152 | Telegram mit oder ohne Firmennamen? | Nutzer: „Mit Firma (Empfohlen)“ | Firma, Stelle, Uhrzeit, Art; nie Mailtext oder Personen. | entschieden |
| Q153 | Wie lange Mail-Texte aufbewahren? | Nutzer: „Solange die Bewerbung (Empfohlen)“ | Bis Bewerbung/Konto gelöscht oder per Knopf. | entschieden |
| Q154 | Gespeicherte Mails beim Trennen? | Nutzer: „Behalten (Empfohlen)“ | Bleiben; Knopf „Gespeicherte Mails löschen“. | entschieden |
| Q155 | Erinnerung für jährliche Hand-Quellen der Rankings mit Phase 3? | Nutzer: „Ja, per Telegram (Empfohlen)“ | Telegram, wenn Quelle älter als 12 Monate. | entschieden |
| Q156 | Markierung „Anzeige offline“ mitnehmen? | Nutzer: „Ja, mit Phase 3 (Empfohlen)“ | Hinweis in der Bewerbung plus Telegram. | entschieden |
| Q157 | Runde 1: In welcher Form liegen Anschreiben-Vorlagen in jobradar? | Nutzer: „Text + Briefkopf (Empfohlen)“ | Word-Datei hochladen oder Text einfügen, jobradar übernimmt nur den Text; Briefkopf einmal eintragen; PDF und Word im gleichen DIN-5008-Layout. | entschieden |
| Q158 | Fertiges Anschreiben an der Bewerbung speichern? | Nutzer: „Ja, an der Bewerbung (Empfohlen)“ | Wird als Anschreiben der Bewerbung abgelegt (bestehendes Feld). | entschieden |
| Q159 | „Mit Claude bearbeiten“: Rückweg des Texts? | Nutzer: „Claude macht die Datei“ | jobradar öffnet claude.ai mit Vorlage + Anzeige; Claude erstellt das Dokument selbst, kein Rückweg in jobradar (Claude hatte „Zurück einfügen“ empfohlen). | entschieden |
| Q160 | „Über meine Seite bewerben“ (Erweiterung füllt Karriereseite vor, Nutzer schickt selbst ab): wann planen? | Nutzer: „Eigene Runde danach (Empfohlen)“ | Eigene Runde „Bewerben-Helfer“ direkt nach Runde 1, mit Prüfung der Nutzungsbedingungen der ATS; nie auf LinkedIn/StepStone/XING. | entschieden |
| Q161 | Knopf „Endfassung hochladen“ nach Claude? | Nutzer: „Ja, Knopf (Empfohlen)“ | Hochgeladene Endfassung ersetzt das gespeicherte Anschreiben der Bewerbung. | entschieden |
| Q162 | Textbausteine noch nötig? | Nutzer: „Weglassen (Empfohlen)“ | Nicht bauen; Backlog. Vorlagen + Claude decken es ab. | entschieden |
| Q163 | Anlagen einmal hochladen und je Bewerbung anhaken? | Nutzer: „Ja (Empfohlen)“ | Ja; Grundlage für den Bewerben-Helfer. | entschieden |
| Q164 | Wo Vorlagen, Briefkopf, CVs, Anlagen verwalten? | Nutzer: „Reiter „Unterlagen“ (Empfohlen)“ | Reiter kommt als „Unterlagen“ zurück (beantwortet Backlog „Dokumente klären“). | entschieden |
| Q165 | Bewerbungsformular neu definieren: wann? | Nutzer: „Eigene Runde (Empfohlen)“ | Eigene Runde nach dem Bewerben-Helfer. | entschieden |
| Q166 | Runde 1: Wie entstehen PDF und Word des Anschreibens? | Nutzer: „A: Im Browser (Empfohlen)“ | Im Browser mit docx, pdfmake, mammoth (dynamisch geladen); PDF wird direkt an der Bewerbung gespeichert. | entschieden |
| Q167 | Platzhalter {{anrede}}: woher? | Nutzer: „Feld am Kontakt (Empfohlen)“ | Feld Frau/Herr/ohne am Ansprechpartner; sonst „Sehr geehrte Damen und Herren,“. | entschieden |
| Q168 | Wann baut Codex Runde 1? | Nutzer: „Als Nächstes (Empfohlen)“ | Direkt nach dem laufenden Paket in der Codex-Warteschlange. | entschieden |
| Q169 | Vorlagen für andere freigeben? | Nutzer: „Vorerst privat, aber Freunde sollen auch Vorlagen einfügen können“ | Jeder Nutzer hat eigene private Vorlagen; Teilen zwischen Konten in den Backlog. | entschieden |

Fragetexte Q69–Q71 (Claude, Auswahl): Q69 Mehrfachauswahl (siehe Tabelle). Q70 komplette Stelle (Empfohlen) / Firma und Titel reichen. Q71 Schnellstart + Rest in Phase 4 (Empfohlen) / alles in Phase 4 / alles vor Phase 4.

Fragetexte Q72–Q75 (Claude, 2026-11-18, Auswahl): Q72 privates Repo (Empfohlen) / Morgensitzung mit Claude. Q73 so lassen (Empfohlen) / offene Quellen für Gäste. Q74 3 pro Nacht (Empfohlen) / unbegrenzt / keine automatisch. Q75 50 je Nutzer (Empfohlen) / 20 / unbegrenzt.

Fragetexte Q76–Q79 (Claude, 2026-11-19, Auswahl): Q76 nur Sitemap + Stellenseite (Empfohlen) / Workday ganz auslassen. Q77 weglassen (Empfohlen) / Monopolkommission direkt. Q78 einmal im Jahr von Hand (Empfohlen) / weglassen. Q79 vorziehen, eigenes Paket (Empfohlen) / in Phase 5 lassen. Nutzerfrage dazwischen: „Wie viele Top xx sind hier gerade festgelegt je Branche?“ – Antwort Claude: Top 20 je Branche nach Mitarbeitenden (Wunsch 2026-11-17), je jobradar-Kategorie statt je Wikidata-Branche (471 Branchen wären zu fein), höchstens 560 Firmen.

Fragetexte Q80–Q93 (Claude, 2026-11-19, Auswahl; Anlass Nutzerfragen: „Helf mir nochmal zu verstehen, was für Firmen wir genau verwenden? … Das übergeordnete Ziel meiner Seite ist, dass alle Firmen irgendwie Top xx in verschiedenen Kategorien sind. Es geht nicht nur darum die Seite mit irgendwelchen Firmen zu füllen. Sind wir immernoch on track …?“ und „Was für weitere Fragen zu den Listen können wir klären bzw. validieren, damit ich zu 100% weiß, was von wo reinkommt“): Q80 reparieren + Prüfung (Empfohlen) / Top 300 / streichen. Q81 alle 2.000 + 800 (Empfohlen) / Top 500 / Top 1.000. Q82 Mehrfachauswahl EIC / Behörden und Forschung / 13 Firmen. Q83 eigene Firmen (Empfohlen) / wegfallen / alle 13 behalten. Q84 erst nach Durchsicht (Empfohlen) / automatisch. Q85 Mehrfachauswahl Kliniken und Pflegeheime / öffentliche Banken / Krankenkassen / Behörden und Ministerien. Q86 alle vier (Empfohlen) / ohne SDAX. Q87 ja (Empfohlen) / Sitz Europa / weglassen. Q88 ja (Empfohlen) / weglassen. Q89 Accelerator DE (Empfohlen) / Accelerator Europa / alle EIC DE. Q90 Stellen verschwinden (Empfohlen) / bleibt bis Entfernen. Q91 Behörden raus (Empfohlen) / drin lassen. Q93 für alle (Empfohlen) / nur für mich.

Fragetexte Q95–Q96 (Claude, 2026-11-19, Auswahl): Q95 die 200 neuesten (Empfohlen) / die 200 mit höchster Förderung / alle. Q96 passt so (Empfohlen) / weniger Kategorien.

Fragetexte Q97–Q100 (Claude, 2026-11-19, Auswahl): Q97 200 zuletzt geförderte (Empfohlen) / 200 mit höchster Förderung / nur DACH, dafür alle. Q98 erst ab 2 Listen zeigen (Empfohlen) / in Top-Arbeitgeber aufgehen / so lassen. Q99 nichts, war ein Versehen / schlag mir weitere vor. Q100 Phase 6 CV-Abgleich (Empfohlen) / Phase 5 Zusatzfilter / Phase 3 Google / Chrome-Erweiterung verteilen.

Fragetexte Q101–Q102 (Claude, 2026-11-19, Auswahl): Q101 bis 10 / 10–30 / 30–70 / weiß ich noch nicht. Q102 1–2 / 3–4 / 5 oder mehr.

Fragetexte Q104–Q106 (Claude, 2026-11-19, Auswahl): Q104 Phase 5 Filter (Empfohlen) / Phase 4g Stelle aus Link / Phase 3 Kalender/Gmail / Chrome-Erweiterung verteilen. Q105 Knopf anbieten (Empfohlen) / Nie laden / Stufe 2 bei Freunden weglassen. Q106 In 6b mitnehmen (Empfohlen) / Eigenes kleines Paket danach / Streichen.

Fragetexte Q107–Q111 (Claude, 2026-11-19, Auswahl): Q107 Sofort + neue Firmen nachts (Empfohlen) / Alles sofort / Alles nachts. Q108 Nur Stelle + Knopf (Empfohlen) / Automatisch Zusatzfirma / Nur die Stelle. Q109 Ähnliche zur Auswahl (Empfohlen) / Nur exakter Treffer. Q110 Nach Website fragen (Empfohlen) / Nur Hinweis. Q111 Ja, auch abgleichen (Empfohlen) / Nein, nur Stellenliste.

Fragetexte Q112–Q115 (Claude, 2026-11-19, Auswahl): Q112 erste Fassung In 4f ergänzen (Empfohlen) / Später, eigenes Paket / Streichen; zweite Fassung Ja, auf Klick (Empfohlen) / Später entscheiden / Nein, ich korrigiere selbst. Q113 In 4f per Telegram (Empfohlen) / Streichen. Q114 Mit Phase 5 Filtern (Empfohlen) / Gründungsjahr jetzt in 4c / Streichen. Q115 Nach Portal-Messung 4c (Empfohlen) / TK weglassen / Playwright jetzt planen.

Fragetexte Q116–Q131 (Claude, 2026-11-19, Auswahl): Q116 Mitarbeiterzahl als Spanne / Unternehmensalter / Eigentümer / Eigene Firmenbewertung. Q117 Jahre Berufserfahrung / Personalverantwortung / Vertriebsanteil / Geforderter Abschluss. Q118 Mindestgehalt / Vertragsdetails / Präsenztage / Remote-Gebiet / Umkreis um München. Q119 Ghost-Job-Ampel / Vermittler erkennen / Synonymgruppen / Muss-/Soll-Kriterien. Q121 Zeigen mit Hinweis (Empfohlen) / Ausblenden. Q122 Nach und nach (Empfohlen) / Nur neue Stellen. Q123 Beides (Empfohlen) / Nur im Filter / Nur dauerhafte Sperrliste. Q124 Ja, im täglichen Digest (Empfohlen) / Nein, nur speichern. Q125 Mein Abschluss (Empfohlen) / Stufen ankreuzen (Antwort als freier Text). Q126 Lange online / Taucht immer wieder auf / Mehrfach gleichzeitig / Vage Anzeige. Q127 Kennzeichnen, sichtbar (Empfohlen) / Standardmäßig ausblenden. Q128 Kein / etwas / überwiegend (Empfohlen) / Nur ja/nein. Q129 Ja, obere Grenze zählt (Empfohlen) / Nein, untere Grenze zählt. Q130 Nur für Angemeldete (Empfohlen) / Auch für Gäste. Q131 Dubletten zusammenführen / Workation / Rolle im Markt / Kundenbranche / Ansprechpartner / Bewerbungsweg.

Fragetexte Q132–Q133 (Claude, 2026-11-19, Auswahl): Q132 Geschäftsmodell (Empfohlen) / Marktposition / Beides. Q133 Phase 5, mit Filter (Empfohlen) / Phase 6, mit Gehaltsbenchmark / Backlog lassen.

Fragetexte Q134 (Claude, 2026-11-19, Auswahl): „Gehaltsschätzung, Stufe 3: Den Entgeltatlas der Arbeitsagentur dürfen wir nicht automatisch auslesen, weil es keine offizielle Schnittstelle gibt. Was soll passieren, wenn eine Stelle weder ein Gehalt nennt noch genug ähnliche Anzeigen mit Gehalt hat?“ Optionen: Keine Schätzung (Empfohlen) / Jährliche Tabelle von dir / Später entscheiden.

Fragetexte Q135–Q136 (Claude, 2026-11-19, Auswahl): Q135 „LinkedIn verbietet in seinen Nutzungsbedingungen (Stand 3.11.2025) ausdrücklich Browser-Erweiterungen, die Inhalte „kopieren“. Unsere jobradar-Erweiterung übernimmt auf LinkedIn per Klick nur Adresse und Titel der geöffneten Anzeige. […] Was soll die Erweiterung auf LinkedIn tun?“ Optionen: Nur Adresse (Empfohlen) / Wie bisher lassen / LinkedIn ganz raus. Q136 „Das Sprachmodell für den CV-Abgleich (e5-small) ist 118 MB groß, geplant waren höchstens 50 MB. […] Wie lösen wir das für die Website?“ Optionen: Modell verkleinern (Empfohlen) / Von Hugging Face laden / Ohne Modell im Browser.

Fragetexte Q138–Q150 (Claude, 2026-11-19, Auswahl): Q138 Nur für mich (Empfohlen) / Auch für Freunde / Erst ich, Freunde später. Q139 Interview-Briefing / Status-Vorschläge aus Gmail / Nachfass-Erinnerung / Mailverlauf an Bewerbung (Antwort mit freiem Zusatz). Q140 Eigener Kalender (Empfohlen) / Nur lesen. Q141 Telegram (Empfohlen) / E-Mail / Beides. Q142 Setzen, mit Hinweis (Empfohlen) / Alles automatisch, still / Nur vorschlagen. Q143 Firma + Bewerbungssysteme (Empfohlen) / Nur Firmen-Domain / Alles mit Firmennamen. Q144 Volltext (Empfohlen) / Nur Kopfzeile + Link. Q145 Kurz + Link (Empfohlen) / Alles in Telegram; Claude erstellt sie (Empfohlen) / Nur meine Notizen. Q146 A: GitHub-Secret (Empfohlen) / B: Knopf auf der Website. Q147 Ja, so bauen (Empfohlen) / Nein, wie im Konzept. Q148 Mein heutiges Postfach / Eigene Bewerbungs-Adresse / Entscheide ich noch. Q149 freier Nachtrag. Q150 Stündlich (Empfohlen) / Einmal täglich / Alle 15 Minuten.

Fragetexte Q151–Q156 (Claude, 2026-11-19, Auswahl): Q151 Nicht sichern (Empfohlen) / Mitsichern. Q152 Mit Firma (Empfohlen) / Ohne Firma. Q153 Solange die Bewerbung (Empfohlen) / 12 Monate nach Abschluss / 3 Monate nach Abschluss. Q154 Behalten (Empfohlen) / Mit löschen. Q155 Ja, per Telegram (Empfohlen) / Backlog. Q156 Ja, mit Phase 3 (Empfohlen) / Ja, ohne Telegram / Backlog. Nutzerauftrag dazu: „Prüfe alles rund um Datenschutz, was zu prüfen ist“ und „Wie würde das aber für mich laufen? Also die Google Verbindung. Bewerte generell alles rund um die Google Verbindung und gib mir eine Analyse dazu“.

Fragetexte Q157–Q159 (Claude, 2026-11-19, Runde 1 Bewerbungsunterlagen, Auswahl): Q157 Text + Briefkopf (Empfohlen) / Eigene Word-Datei / Nur Word, kein PDF. Q158 Ja, an der Bewerbung (Empfohlen) / Nur merken, welche Vorlage / Nichts speichern. Q159 Zurück einfügen (Empfohlen) / Claude macht die Datei. Nutzerwunsch dazu: „Ich werde mehrere Vorlagen für Anschreiben hochladen und möchte dann zwei buttons haben, entweder Anschreiben übernehmen, dann wird einfach Firma etc eingetragen und ein Download button (download pdf und download word), oder Anschreiben edit with Claude, dann öffnet sich einfach Claude im neuen Tab“. Nachtrag (offen, Q160): „Können wir zusätzlich einbauen, dass ich mich über meine Seite bewerben kann? Dass also alles, was möglich ist, bereits auf den Karriereseiten vorausgefüllt wird, sobald ich auf "Bewerben" klicke“.

Fragetexte Q160–Q161 (Claude, 2026-11-19, Auswahl): Q160 Eigene Runde danach (Empfohlen) / In Runde 1 mit dazu / Backlog. Q161 Ja, Knopf (Empfohlen) / Beide behalten / Nein.

Fragetexte Q162–Q165 (Claude, 2026-11-19, Auswahl): Q162 Weglassen (Empfohlen) / Ja, einbauen. Q163 Ja (Empfohlen) / Nein. Q164 Reiter „Unterlagen“ (Empfohlen) / Auf der Konto-Seite. Q165 Eigene Runde (Empfohlen) / In Runde 1 mit dazu.

Fragetexte Q166 (Claude, 2026-11-19, Auswahl): A: Im Browser (Empfohlen) / B: Auf dem Server / C: Druckfunktion. Zuvor als Textfrage gestellt; Nutzer daraufhin: „Alle Fragen sollen immer klickbar sein. Speicher diese Regel ab“ (gespeichert im Claude-Gedächtnis).

Fragetexte Q167–Q169 (Claude, 2026-11-19, Auswahl): Q167 Feld am Kontakt (Empfohlen) / Immer neutral / Selbst eintippen. Q168 Als Nächstes (Empfohlen) / Hinten anstellen. Q169 Backlog (Empfohlen) / Jetzt mitbauen (Antwort frei formuliert).

Fragetext Q103 (Claude, 2026-11-19, Auswahl): Ja, sofort + nachts genauer (Empfohlen) / Nein, nur nachts.

Fragetexte Q56/Q57 (Claude, Auswahl, jeweils frei beantwortet): Q56 Vorschlag + Häkchen des Admins (Empfohlen) / vollautomatisch / automatisch mit Wochen-Stichprobe. Q57 Mehrfachauswahl EU R&D Scoreboard / Börsenindizes / Top 20 je Branche (Wikidata) / EIC-Startups + Behörden/Forschung.

Zusatzanforderung (Nutzer, 2026-11-17, ohne Q-Nummer): „Ich brauche auch startups und Mittelstand bzw. zumindest die top 20 firmen pro Branche“.

Fragetexte Q48–Q50: Q48 neue + Filterprofil zuerst (Empfohlen) / beim Öffnen / nur neue. Q49 erst bei Bedarf (Empfohlen) / ja, jetzt / TK streichen. Q50 ja, wie geplant (Empfohlen) / erst weitere Groq-Modelle / nein.

Fragetexte Q44–Q47 (Claude, 2026-11-17, Auswahlfragen): Q44 Ort in DE oder Remote-DE/Europa (Empfohlen) / nur fester Ort in DE / auch Remote weltweit. Q45 nur anspruchsvolle (Empfohlen) / alle Stellen der Firma. Q46 Häkchen, sofort wirksam (Empfohlen) / Liste in Datei. Q47 Prestige ergänzt (Empfohlen) / nur deine Whitelist / nach Q41 entscheiden. Q13, Q41–Q43 analog als Auswahlfragen gestellt (Optionen in der Tabelle).

Fragetext Q38 (Claude, 2026-11-17): A Freunde nutzen den Browser-Abgleich / B Admin stößt einzelne Abgleiche selbst in seiner Claude-Code-Sitzung an (Grauzone) / C Freigabe-Liste, aber nur Admin auf „Claude“. Empfehlung: A + B.

Fragetexte Q35/Q36 (Claude, 2026-11-17, Auswahlfragen): Q35 eigene neue Liste (Empfohlen) / „Wichtige Punkte“ mitbenutzen. Q36 nur im Titel (Empfohlen) / Titel oder Anzeigentext / wie gespeicherte Suche.

Fragetext Q32 (Claude, 2026-11-17): Optionen A Claude-Abo mit Neubewertung nach Kontingent-Analyse (Empfohlen) / B Mistral-API bezahlt mit Probe / D lokales Modell. Q33 war ein Vorschlag des Nutzers, keine Frage.

**Q28–Q31 – Fragetexte (Claude, 2026-11-17, Auswahlfragen):** Q28 Widerspruch Rot: eigenes Rot „fehlt“ (Empfohlen) / doch gelb / alles Fehlende rot. Q29 Nachtzeit: nach dem Scraper ca. 05:00 (Empfohlen) / früher ca. 02:00 / nur auf Knopfdruck. Q30 Grenze: 20 (Empfohlen) / 50 / ohne Grenze. Q31 Aufbewahrung: solange Stelle/CV existiert (Empfohlen) / nur aktuelle behalten / zeitlich begrenzt.

**Q24–Q27 – Fragetexte (Claude, 2026-11-17, Auswahlfragen):** Q24 Scan-PDF: Hinweis zeigen (Empfohlen) / Claude liest das Bild / Text selbst einfügen. Q25 „5 Jahre Python, CV zeigt 3“ bzw. „Rust verlangt, CV zeigt Go“: Gelb mit Begründung (Empfohlen) / Teilbeleg gelb, Ähnliches rot / beides grün mit Hinweis. Q26 Anforderung ohne Pflicht-/Wunsch-Kennzeichnung: als Muss (Empfohlen) / als Soll / eigene Stufe „unklar“. Q27 Gleichstand: Umschalter + Standard-CV (Empfohlen) / nebeneinander / immer fragen.

**Q23 – Fragetext (Claude, 2026-11-17):** „32h sollte nicht vorkommen, alles ab 35 Stunden sollte vorkommen: Was meinst du genau?“ Optionen: Stelle ausblenden (Empfohlen); nur im Rahmen-Feld (Stunden < 35 nicht zeigen, ab 35 als Rahmen-Punkt); beides.

**Q22 – Fragetext (Claude, 2026-11-17):** Anlass: Groq setzt „idealerweise …“ trotz Verbot immer wieder unter „Muss“; Claude schlug einen Wortfilter vor, der solche Punkte streicht. Optionen: A) im Muss-Feld mit Kennzeichnung „(wünschenswert)“, Pflicht zuerst, max. 3; B) eigene Zeile „Wäre gut“ (bis 2 Punkte, Layout C müsste angepasst werden); C) wie bisher im Design: Wünschenswertes gar nicht zeigen, dann mit Filter. Empfehlung: A.

Ebenfalls am 2026-11-17, ohne Q-Nummer: CV-Farben in CLAUDE.md 6 festgehalten (Grün = belegt, Gelb = teilweise/unklar, Rot = nicht belegt). Diese Kurzfassung weicht von Q3 ab („Rot = nachweislich nicht erfüllt“); vor dem Bau klären (CV-Plan).


### Fragetexte Q14–Q21 (Claude, 2026-11-17)
- **Q14 – Lesezeichen oder Chrome-Erweiterung?** Optionen: a) Erweiterung behalten (fertig, getestet; Chrome/Edge, nicht Safari/Handy); b) zurück zum Lesezeichen (ohne Installation, aber meist nur Adresse, viele Jobseiten blockieren es); c) beides. Empfehlung: a).
- **Q15 – Mistral für den CV-Abgleich?** Hintergrund: CV = persönliche Daten, Regel „nur über Claude-Abo“, Mistral-Gratis-Tarif darf Eingaben zum Training nutzen. Optionen: a) kein Mistral für den CV; b) nur geschwärzter CV; c) nur bezahlter Tarif ohne Training. Empfehlung: a).
- **Q16 – LinkedIn-Seiten mit der Erweiterung lesen?** Hintergrund: LinkedIn verbietet auch Browser-Erweiterungen, die Inhalte kopieren; Risiko Kontosperre. Optionen: a) überall lesen; b) auf Portalen (LinkedIn, StepStone, Indeed, XING …) nur Adresse und Titel; c) dort gar nicht auslösen. Empfehlung: b).
- **Q17 – Neue Fragen-Regel in CLAUDE.md** (von Codex ohne Rückfrage eingetragen): Empfehlung: behalten, auf drei Sätze kürzen.
- **Q18 – Doku verschlanken** (STATUS kurz, Codex-Pläne zusammenfassen, Wiederholungen streichen, „für später“ einordnen, Fragen-Regel kürzen)? Empfehlung: ja.
- **Q19 – Privat oder später öffentlich/kommerziell?** Frage nach dem Ziel in eigenen Worten (bestimmt die Rechtslage der Rankings).
- **Q20 – Q13 und offene CV-Fragen jetzt oder zu Beginn der Phase?** Empfehlung: zu Beginn der jeweiligen Phase.
- **Q21 – Reihenfolge bis zum Hochladen:** Korrekturen → Tests → Zweig hochladen (Linux-Prüfung) → Nutzer spielt 010 ein → Klicktest → „Ja, hochladen“ nach main. Empfehlung: ja.

## Ältere dokumentierte Gespräche

| Thema | Vorhandene Quelle und Aussagegrenze |
|---|---|
| Tracker-Paket, Gespräch vom 2026-11-09 | [Tracker-Design](superpowers/specs/2026-11-09-tracker-paket-design.md) verweist auf Q29–Q47 und hält die daraus entstandenen Festlegungen fest. Es ersetzt kein vollständiges Original-Fragenprotokoll. |
| Öffentlicher Zugang, Gespräch vom 2026-11-11 | [Zugangs-Design](superpowers/specs/2026-11-11-oeffentlicher-zugang-design.md) dokumentiert Entscheidungen zu Q62–Q66. Originalfragen und Antwortoptionen daraus nicht nachträglich erfinden. |

Diese Quellen sind keine Behauptung, dass sämtliche historischen Chatfragen bereits im Originalwortlaut vorliegen. Nachweisbare weitere Fragen/Antworten aus verfügbaren Quellen ergänzen und fehlende Originale als solche kennzeichnen. Bereits dokumentierte Antworten vor einer erneuten Frage prüfen.

## Nachtrag verfügbarer Nutzerfragen

Diese Fragen stammen aus dem verfügbaren bisherigen Gespräch; genaue Sendezeiten wurden nicht übermittelt. `N1`–`N4` sind eigene Rückblick-Kennungen und ändern die aktuelle Q-Nummerierung nicht. Wo die frühere Agentenantwort nicht im verfügbaren Gesprächsausschnitt vorliegt, ersetzt ein heutiges Fachdokument ausdrücklich nicht deren ursprünglichen Wortlaut. Daraus keine erneute Befragung zu inzwischen feststehenden Anforderungen ableiten.

| Kennung | Nutzerfrage im Wortlaut | Vorhandene Antwortquelle / Grenze |
|---|---|---|
| N1 | „Was für Arbeitspakete hast du?“ | Früherer Antwortwortlaut hier nicht verfügbar. Der fortgeschriebene [Codex-Sammelbericht](plans/2026-11-16-codex-pakete.md) dokumentiert Pakete und heutigen Abschlussstand. |
| N2 | „Gibt es noch offene To Dos für dich? Prüfe alles, womit du Claude unterstützen kannst“ | Früherer Antwortwortlaut hier nicht verfügbar. Prüf-/Folgearbeiten und Ergebnisse stehen im [Codex-Sammelbericht](plans/2026-11-16-codex-pakete.md) und [Agentenprotokoll](agenten-protokoll.md). |
| N3 | „Was brauchst du von mir für CV Abgleich? Nutze alle verfügbaren Skills, um die passenden Fragen und daraus entstehenden Anforderungen zu entwickeln. Ich möchte, dass der CV Abgleich erstmal über mein Claude Pro Abbo läuft, ohne API Kosten. Es soll aber zusätzlich eine Option eingebaut werden, das ganze über Mistral zu machen, ohne API Kosten zu zahlen“ | Vollständiger ursprünglicher Antworttext hier nicht verfügbar. Tatsächlich gestellte Folgefragen, Antworten, Anforderungen und Anbietergrenzen sind in den oben verlinkten [CV-Protokollen](plans/2026-11-16-cv-abgleich.md) nachvollziehbar. Die Anforderungsklärung ist noch nicht abgeschlossen. |
| N4 | „Was kannst du sonst noch erledigen?“ | Antwortwortlaut direkt unten. Anschließende Beauftragung und tatsächlicher Abschlussstand in [STATUS](STATUS.md); historische Vorschläge nicht als heutige offene Pakete zählen. |

### N4 – damalige Agentenantwort im Wortlaut

> Vier sinnvolle Aufgaben sind noch möglich:
>
> 1. **Browserprüfungen erweitern:** Bewerbungs-Tracker, Dokumente, Export und Kontolöschung durchgehend mit künstlichen Daten prüfen. Dafür fehlt bisher eine ebenso vollständige, wiederholbare Prüfung wie für die Stellenliste.
>
> 2. **Vollständiges CV-Testbeispiel erstellen:** Eine erfundene Stellenanzeige mit mehreren erfundenen CVs – einschließlich grüner, gelber und roter Markierungen, Belegen und benanntem Vergleichs-CV.
>
> 3. **CV-Bauplan fertigstellen:** Die verbleibenden Entscheidungen zu Auslösung, Korrekturen, Speicherung und Auswahl des besten CVs klären und daraus konkrete Umsetzungsschritte für Claude Code entwickeln. Alle Fragen werden dokumentiert.
>
> 4. **Firmenportal-Erkennung konkretisieren:** Den vorhandenen vorläufigen Entwurf gemeinsam klären, damit neue Arbeitgeber später einfacher angebunden werden können.
>
> **Meine Empfehlung: zuerst 1 und 2.** Das liefert überprüfbare Ergebnisse und entlastet Claude unmittelbar.
>
> Die echten Datenbankprüfungen sind bereits vorbereitet; zur Ausführung fehlen noch die isolierte Testumgebung und die entsprechende Freigabe. Mistral bleibt für später vorgemerkt.

Die weitere im Chat enthaltene Nutzerfrage zur Ein-Klick-Übernahme („Das könntest du doch auch schon bauen, oder?“) ist einschließlich des vollständigen Nutzerauftrags bereits im [Importprotokoll](plans/2026-11-16-ein-klick-import.md) dokumentiert. Ihre Klärung und Antwort ergeben sich aus Q6/Q7 und dem dort festgehaltenen lokalen Abschluss; der damalige Chat-Antwortwortlaut wird dadurch nicht behauptet.

## Fortschreibung bei jeder Frage

1. **Beim Stellen:** Datum, Kennung/Gesprächskontext, Fragesteller, vollständigen Fragewortlaut sowie Empfehlungen und tatsächlich angebotene Antwortoptionen im passenden Projektprotokoll festhalten. Nutzerfragen bei Eingang ebenso aufnehmen; neue Themenprotokolle hier verlinken.
2. **Bei der Antwort:** Antwortenden und Antwortwortlaut ergänzen. Auch freie Antworten erfassen, nicht auf die nächstliegende Auswahloption reduzieren. Agentenantworten auf Nutzerfragen ebenso festhalten.
3. **Status und Folge:** beantwortet, offen, teilweise beantwortet oder zurückgestellt angeben; die daraus abgeleitete Anforderung getrennt notieren. Änderungen/Präzisierungen anhängen, frühere Fassungen erhalten. Wesentliche Entscheidungen in [ENTSCHEIDUNGEN](ENTSCHEIDUNGEN.md), offene Punkte/Übergabe in [STATUS](STATUS.md) nachführen.
4. **Grenzen erhalten:** Eine vorausgewählte Option, Schweigen oder eine Empfehlung ist keine Antwort/Freigabe. Vorbereitete Fragethemen nicht als bereits gestellte Fragen führen. Keine Geheimnisse oder persönlichen Daten ins öffentliche Repo übernehmen; nötige Schwärzungen sichtbar kennzeichnen, ohne einen unfreigegebenen privaten Ablageort anzulegen.
