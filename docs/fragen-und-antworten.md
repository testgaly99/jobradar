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
| Firmenportal-Erkennung, dasselbe Gespräch | Q10 zum ersten Umfang beantwortet. **Q13 zur überarbeiteten Planfreigabe ist weiterhin unbeantwortet.** Die allgemeine Dokumentationsanweisung beantwortet Q13 nicht. | [Portalplan und Fragenprotokoll](plans/2026-11-15-firmenportal-erkennung.md) |

In dieser aktuellen Gesprächsfolge ist die nächste freie Fragennummer **Q22**. Der genaue Sendezeitpunkt einzelner älterer Nachrichten ist nicht verfügbar; vorhandene Datums-/Reihenfolgeangaben erhalten und keine Uhrzeiten erfinden. Fachliche Anforderungen stehen zusätzlich im [CV-Plan](plans/2026-11-16-cv-abgleich.md), der aktuelle Arbeits-/Übergabestand in [STATUS](STATUS.md).

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
