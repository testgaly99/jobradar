# CV-Abgleich: Fragen und Anforderungen

Stand: 2026-11-16, Bestandsbasis `c2a0592`. **Laufende Anforderungsklärung, kein freigegebener Bauplan.** Nutzer möchte zuerst sein bestehendes Claude-Pro-Abo nutzen und zusätzlich einen Mistral-Weg ohne API-Kosten. Die bisherige Claude-only-Regel für persönliche Daten muss nach Klärung des optionalen Mistral-Wegs ausdrücklich konsistent nachgeführt werden; dieses Dokument aktiviert keinen Anbieter und verarbeitet keine persönlichen Daten.

## Methode und vorhandene Grundlagen

`find-skills` zur Auswahl und die installierte `grill-me`/`grilling`-Anleitung für Fragenrunden nach Abhängigkeiten: Fakten selbst prüfen, Empfehlungen anbieten, Antworten festhalten, daraus Anforderungen/Abnahmen entwickeln. Keine stillen Entscheidungen aus ausbleibenden Antworten ableiten. Keine neue Skill-/Parserinstallation. PDF-/DOCX-Skills sind für spätere Dokumentarbeit vorhanden; ihre Existenz beweist keine installierte Parserumgebung und ist keine Freigabe, echte CVs zu öffnen. Unpassende Skills wie Bildgenerierung, Reisen oder neue Seitengestaltung werden nicht allein wegen Verfügbarkeit angewendet.

Bestand: PDF/Word-Dokumentversionen und Eigentümerschutz sind bereits vorgesehen; Upload/Metadaten existieren. Textauslesung, strukturierte CV-Profile und Abgleichläufe/Ergebnisse sind noch nicht implementiert. `web/lib/stellendaten.ts`, `zusammenfassung.ts`, `anzeige.ts` und die bestehenden Anzeigenabschnitte wiederverwenden. Die Kurzfassung enthält höchstens drei weitere Muss-Punkte und ist keine vollständige Anforderungsliste. Passagenbezug verlangt den unveränderten Original-Anzeigentext als Grundlage.

## Bereits festgehalten

| ID | Stand | Anforderung / Quelle |
|---|---|---|
| A1 | Nutzerwunsch | Primär Claude Pro, keine zusätzlichen API-Kosten. Zusätzliche Mistral-Option ebenfalls ohne API-Kosten. Kein stiller kostenpflichtiger Ersatzweg. |
| A2 | Antwort Q1 bestätigt | Erste Version: nachvollziehbare Belege, offene Nachweise und Empfehlung der besten CV-Version. Prozentwert/Score wird zurückgestellt, bis Bedeutung und Gewichtung feststehen. |
| A3 | Antwort Q2 bestätigt | Übereinstimmungen und nicht übereinstimmende Stellen farblich **direkt in der Stellenanzeige** markieren. Antwort im Wortlaut: „Das soll farblich markiert werden in der Stellenanzeige, genau wie dinge, die mit meinem CV übereinstimmen“. Farben und Bedeutung „nicht belegt“ versus „nicht erfüllt“ dadurch noch nicht abschließend entschieden. |
| A4 | Bestehende Projektanforderung | PDF und Word, mehrere eigene CV-Versionen, begründete CV-Empfehlung, private Daten/Ergebnisse pro Nutzer. Kein Zugriff durch Gäste/andere Nutzer. Vorerst persönliche Nutzung; kein gemeinsames Abo für fremde Nutzer vorsehen. |
| A5 | Bestehende Qualitätsgrenze | Keine Fähigkeiten erfinden oder aus bloßer Nichterwähnung sicher auf Unfähigkeit schließen. Ergebnisse müssen anhand tatsächlicher CV-/Anzeigenpassagen nachvollziehbar sein. |

## Runde 2: Antworten stehen aus

**Q3 – Farblegende und Interaktion.** Ganze Anforderung im unveränderten Text markieren; Klick zeigt CV-Beleg bzw. Begründung? Empfehlung: Grün belegt, Gelb teilweise/noch nicht belegt, Rot nachweislich nicht erfüllt. Alternative: nur Grün/Rot, wobei Rot ausdrücklich auch „nicht belegt“ bedeutet. Keine Palette oder Statuszusammenlegung als bereits entschieden behandeln.

**Q4 – Vergleichsbasis.** Empfehlung: Farben beziehen sich auf eine konkrete CV-Version, beste empfohlene Version zunächst vorausgewählt, manuell umschaltbar. Alternative: alle CVs gemeinsam als Gesamtprofil. Belege verschiedener Versionen nicht still zu einem scheinbar passenden einzelnen CV vermischen.

**Q5 – Mistral und Datenfreigabe.** Empfehlung: Cloudverarbeitung nur nach bewusster Anbieterwahl, vorher ausgeschlossenem Training und geprüftem Kostenstopp. Alternativen: ausschließlich lokal auf eigenem Rechner, oder automatischer Wechsel nach einmaliger ausdrücklicher Freigabe. Noch keine Einwilligung zur echten Übertragung, keine Quoten-/Kontoprüfung und keine Installation vorgenommen.

## Weitere Zweige nach diesen Antworten

1. **Dokumente/Auslesung:** tatsächlich verwendete Varianten (Text-PDF/DOCX/Scans), aktiv/archiviert, Auslesevorschau und Korrektur, zusätzliche bestätigte Fähigkeiten außerhalb des CVs. Bestehenden Dokumentbereich als Einstieg verwenden oder konkreten CV-Einstieg planen; kein zweites Verwaltungssystem auf Vorrat.
2. **Empfehlung/Nachweise:** explizite versus übertragbare Erfahrung, teilweise belegte Anforderungen, Umgang mit Sprach-/Erfahrungsangaben, Muss/Soll und Gleichstand mehrerer CVs. Beste Version hinsichtlich belegter Abdeckung und Darstellung unterscheiden; keine Gewichtungsformel erfinden.
3. **Auslösung/Betrieb:** je Stelle auf Knopfdruck, beim Öffnen oder für ausgewählte Stapel; erwartete Menge/Wartezeit. PC-abhängiger persönlicher Worker oder Cloudweg erst nach Anbieter-/Datenschutzentscheidung bewerten. Regelmäßige manuelle Terminalstarts sind kein gewünschter Nutzerablauf.
4. **Wiederverwendung/Korrektur:** Ergebnis speichern, nach CV-/Anzeigen-/Vorgabenänderung als veraltet behandeln, neue Berechnung; Nutzerkorrektur und deren Gültigkeit, manuelle Ergänzung statt erfundener CV-Belege. Export/Löschen um neue private Daten ergänzen.
5. **Betriebsfreigabe:** konkrete Konto-/Modellverfügbarkeit mit künstlichen Daten nachweisen, Kostenstopp ohne bezahltes Fallback, Trainings-/Aufbewahrungsbedingungen prüfen, Qualität beider Anbieter getrennt abnehmen. Erst danach echte CVs über freigegebenen Weg.

## Verifizierte Anbieterfakten und verbleibende Grenzen

Prüftag 2026-11-16, ausschließlich offizielle Quellen. Öffentliche Dokumentation wurde gelesen, keine Kontoeinstellungen oder Zugangsdaten. Fakten, Ableitungen und ausstehende Abnahme getrennt halten.

### Claude Pro

- Der native Claude-Code-Weg unterstützt Pro-Anmeldung und einen Abo-Token für CI/Skripte. Die offizielle GitHub Action dokumentiert geplante Läufe und Abo-Abrechnung statt API-Abrechnung bei OAuth. [Authentifizierung](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token), [GitHub Action und Kosten](https://code.claude.com/docs/en/github-actions#manage-costs).
- Abo-Analyse verbraucht das gemeinsame Claude-/Code-Kontingent. Kostenpflichtige Zusatznutzung und mögliche API-Authentifizierung müssen ausgeschlossen sein; bei Erschöpfung pausieren. [Pro mit Claude Code](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-max-or-ultra-plan), [Usage Credits](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans).
- Native persönliche Automatisierung ist von einem allgemeinen Website-Proxy oder der Vermittlung von Abo-Nutzung für andere Menschen zu unterscheiden. Der konkrete private CV-Workflow ist eine Architektur-Ableitung aus den unterstützten Komponenten, keine ausdrückliche anwendungsbezogene Anbieterfreigabe. [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance). Keine Sitzungstokens als Ersatz-API verwenden, kein unverifiziertes Modell festlegen.

### Mistral

- Eine kostenlose allgemeine Modell-API kann aktuell nicht belastbar zugesagt werden. Die aktuelle Usage-Doku verlangt für API-Zugang Billing/PAYG; ein älterer Help-Artikel beschreibt noch Gratis-Prototyping. Dieser Widerspruch muss am tatsächlich verfügbaren Konto geklärt werden. PAYG mit Guthaben ist keine Garantie für Kosten null. [Aktuelle Usage-Dokumentation](https://docs.mistral.ai/admin/billing-usage/usage-limits#plan-usage-and-limits), [abweichender Help-Artikel](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them).
- Vibe Code dokumentiert nativen Free-Zugang, Browseranmeldung und Stoppen nach enthaltenem Budget bei ausgeschaltetem PAYG. Programmatic Mode und MCP existieren. Daraus ergibt sich ein **zu prüfender** nativer Worker-Weg; keine Zusage, dass damit dieser CV-Anwendungsfall bereits technisch/vertraglich/qualitativ abgenommen ist, und kein Beleg für eine kostenlose allgemeine Website-API. [Plan-/Kontonutzung](https://docs.mistral.ai/vibe/code/cli/api-keys-profiles#plan-and-billing-notes), [Programmatic Mode](https://docs.mistral.ai/vibe/code/cli/work-with-cli#programmatic-mode), [MCP](https://docs.mistral.ai/vibe/code/cli/mcp-servers).
- Training ist laut aktueller Hilfe auch im Free-Kontext abwählbar; Vibe- und API-Einstellungen sind getrennt. Opt-out bedeutet keine sofortige Löschung/Nullspeicherung. [Training-Einstellungen](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training), [ZDR-Grenzen](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr). Bisherige ältere Projektangaben zum Experiment-Tarif nicht ungeprüft übernehmen.
- Der globale API-Endpunkt garantiert laut aktueller Doku keine bestimmte Inferenzregion. Regionale APIs und Standort-/Kostenbedingungen gesondert prüfen; nicht automatisch „Mistral = ausschließlich EU“ zusagen. [Regional Inference](https://docs.mistral.ai/inference/regional-inference).
- Lokale offene Mistral-Modelle wären eine weitere Option ohne Anbieter-APIgebühren. Passende vorhandene Hardware, Modellqualität, Einrichtung und Betriebskosten bleiben zu prüfen; kein Download und keine Installation vorgenommen.

## Vorgeschlagene Abnahmefälle – noch kein freigegebenes Ergebnisschema

- Originalanzeige bleibt byte-/textgleich rekonstruierbar; Markierung verändert keinen Wortlaut und erzeugt keine fremden HTML-Inhalte.
- Jeder als belegt markierte Teil verweist auf eine tatsächlich vorhandene Passage der zugrunde liegenden CV-Version; eine erfundene Referenz wird verworfen bzw. als Prüfproblem gezeigt.
- Fehlende Erwähnung, Teilbeleg und nachweislicher Widerspruch werden gemäß Q3 getrennt erklärt; Farben erhalten zusätzlich lesbare Statushinweise.
- CV A belegt SQL, CV B Projektleitung: Empfehlung und Markierungen dürfen ohne gewählte Gesamtprofilregel keine vollständige Abdeckung durch einen einzigen CV behaupten.
- Leere/fehlerhafte Auslesung führt zu einem Hinweis und Korrekturmöglichkeit statt scheinbar vollständigem Ergebnis.
- Eine geänderte CV-/Anzeigenversion zeigt keinen alten Abgleich als aktuell. Eigentümergrenze, Export und Löschung gelten auch für Ergebnisse/Korrekturen.
- Ohne bestätigte Mistral-Nutzung gehen keine persönlichen Inhalte dorthin. Kontingentende startet keine kostenpflichtige Anfrage und keinen ungefragten Anbieterwechsel.
- CV-Inhalte, Prompts, Antworten und private Resultate erscheinen nicht im öffentlichen Repository, öffentlichen GitHub-Logs, Issues oder frei zugänglichen Artefakten. Ein späterer CI-Weg ist daran gesondert abzumessen.

Keine Modellaufrufe, Textextraktion oder Tests eines zukünftigen Abgleichs ausgeführt. Zunächst die Antworten vervollständigen, danach konsolidierte Anforderungen und prüfbaren Entwurf zur gemeinsamen Bestätigung vorlegen. Erst danach implementieren.
