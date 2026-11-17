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

In dieser aktuellen Gesprächsfolge ist die nächste freie Fragennummer **Q55**. Der genaue Sendezeitpunkt einzelner älterer Nachrichten ist nicht verfügbar; vorhandene Datums-/Reihenfolgeangaben erhalten und keine Uhrzeiten erfinden. Fachliche Anforderungen stehen zusätzlich im [CV-Plan](plans/2026-11-16-cv-abgleich.md), der aktuelle Arbeits-/Übergabestand in [STATUS](STATUS.md).

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
