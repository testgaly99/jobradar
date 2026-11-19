# Phase 6: CV-Abgleich – Design

Stand 2026-11-19. Fasst die Entscheidungen Q3–Q40, Q101/Q102 und die Prüfung vom 2026-11-19 zu einem baubaren Entwurf zusammen. Grundlage und Wortlaut: `docs/plans/2026-11-16-cv-abgleich.md` (Anforderungen A1–A13, Abschnitt „Kontingent und Abo-Bedingungen“), `docs/fragen-und-antworten.md`. Bei Widerspruch gilt dieses Dokument, außer es weicht von einer Nutzerantwort ab – dann gilt die Antwort.

## Wozu

Der Nutzer will bei jeder interessanten Stelle auf einen Blick sehen, welche Anforderungen sein Lebenslauf belegt, welche offen sind und welche er nachweislich nicht erfüllt – direkt in der Anzeige, mit Beleg – und welche seiner CV-Versionen am besten passt. Das spart das manuelle Abgleichen vor jeder Bewerbung. Freunde sollen später dasselbe bekommen, kostenlos und ohne Aufwand (Q34).

## Ziele

- Farben direkt im unveränderten Anzeigentext: ganze Anforderung markiert; Grün = belegt, Gelb = teilweise oder noch nicht belegt (beide Gründe unterscheidbar), Rot = nachweislich nicht erfüllt; Klick zeigt CV-Beleg bzw. Begründung (Q3, A6, Q28: ähnliche statt geforderter Fähigkeit = Gelb mit Begründung).
- Empfehlung der besten CV-Version nach „Muss vor Soll“; Gleichstand offen zeigen mit Umschalter, zuerst der Standard-CV (A10, Q27). Kein Prozentwert (A2).
- Admin: automatisch nachts 03:00 deutscher Zeit über das Claude-Abo (Q29, Q32, Q37); dazu sofort vorläufige Farben aus Stufe 1 im Browser, die der Nachtlauf ersetzt (Q103).
- Alle anderen Angemeldeten: kostenlos im eigenen Browser, ausgelöst beim Merken, beim CV-Upload und beim Öffnen einer Stelle (Q34, Q37).
- „Wichtige Punkte“ (Konto-Seite) treffen auch nach Bedeutung, nicht nur nach Wortanfang – kostenlos im Browser mit demselben Bedeutungsmodell, für alle Angemeldeten (CLAUDE.md 6, Q106; kommt mit 6b).
- Umfang: eigene gemerkte Stellen, dazu offene Stellen mit einem Stichwort aus „Automatisch abgleichen bei“ im Titel; gemerkte zuerst (A9, Q35, Q36).

## Nicht-Ziele

- Kein Passungs-Score in Prozent, keine Gewichte (A2, A10).
- Kein Anschreiben, keine Skill-Lücken-Übersicht, kein Gehaltsbenchmark (spätere Teile von CLAUDE.md Phase 6).
- Kein Abgleich für Gäste. Kein Claude-Abgleich für andere Nutzer, auch nicht auf Freigabe (Q38).

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Ein Grün ohne echten Beleg im CV, oder ein Rot nur weil etwas nicht erwähnt ist (A5).
- Belege aus mehreren CV-Versionen zu einem scheinbar vollständigen Ergebnis gemischt (A7).
- CV-Inhalte in einem öffentlichen Repo, einem öffentlichen GitHub-Log, im GitHub-Backup, bei Groq oder Mistral (A13, Q40).
- Am Abo-Limit eine kostenpflichtige Anfrage (A1, Q15).
- Ein veraltetes Ergebnis, das als aktuell erscheint (A11, Q31).

## Bindende Bedingungen

- **Abo-Weg (Prüfung 2026-11-19):** nur das unveränderte Claude-Code-Programm (`claude -p`) mit `CLAUDE_CODE_OAUTH_TOKEN`; kein Agent SDK, keine eigenen API-Aufrufe mit dem Token; nur Daten des Admins.
- **Modell:** Haiku zuerst (CLAUDE.md 6); größeres Modell nur nach Stichprobe und Nutzerentscheidung.
- **Ort des Nachtlaufs:** Workflow im privaten Repo `jobradar-privat`; der Code liegt im öffentlichen Repo und wird dort ausgecheckt. Kein CV-Text, Anzeigentext, Prompt oder Ergebnis im Log.
- **Grenze:** höchstens 50 Stellen pro Nacht (Q30); am Abo-Limit geordnet aufhören, Rest in der nächsten Nacht.
- **Datenschutz (Q40):** ausdrückliche Einwilligung mit Hinweis auf besondere Kategorien (Art. 9 DSGVO) beim ersten CV-Upload; Datenschutzerklärung ergänzen; Bedeutungsmodell selbst ausliefern (nicht zur Laufzeit von Hugging Face); CV-Tabellen nicht ins GitHub-Backup; Export und Kontolöschung schließen alles Neue ein; Löschen eines CV entfernt Datei, Text, Profil und Ergebnisse.
- **Migrationen** nur als Datei, der Nutzer spielt sie ein; nächste freie Nummern 018 (6a) und 019 (6b).

## Ansätze (betrachtet)

1. **Zwei Stufen, gemeinsamer Kern (gewählt, Q39):** Stufe 1 Bedeutungsvergleich mit einem kleinen Embedding-Modell (ein Modell, das Sätze in Zahlen übersetzt, sodass ähnliche Bedeutung ähnliche Zahlen ergibt) prüft alle CV-Versionen und wählt die beste (bei knappem Abstand zwei); Stufe 2 bewertet nur Grenzfälle – beim Admin Claude, bei Freunden Chromes eingebautes Modell. Dasselbe Modell und dieselben Regeln in Python (Nachtlauf) und im Browser, damit beide Wege gleich entscheiden.
2. **Nur Claude, alle CVs je Aufruf:** einfacher, aber bei 5+ CV-Versionen etwa doppelter Kontingentverbrauch und für Freunde unbrauchbar. Verworfen.
3. **Nur Bedeutungsvergleich, kein Stufe-2-Modell:** gratis und schnell, aber Rot ist ohne Sprachmodell nicht belastbar (A5); Wegwerf-Test Stufe 1 lag bei 6/8. Verworfen als alleiniger Weg; bleibt Rückfall, wenn Chromes Modell fehlt.

## Entwurf

### Gemeinsamer Kern (Teil von 6a, von 6b wiederverwendet)

**Anforderungsliste je Stelle.** Der Scraper zerlegt beim Einlesen die Abschnitte „Anforderungen/Profil“ aus `jobs.abschnitte` in einzelne Anforderungen und speichert sie als `jobs.anforderungsliste` (jsonb: `[{id, text, muss}]`, `text` wörtlich aus der Anzeige). `muss` ist wahr, außer die Zeile ist ausdrücklich als wünschenswert gekennzeichnet („wünschenswert“, „idealerweise“, „von Vorteil“, „nice to have“, „plus“ – Q26). Eine Stelle ohne erkennbaren Anforderungsabschnitt bekommt eine leere Liste und keinen Abgleich (Hinweis in der Anzeige). Offene Bestandsstellen erhalten die Liste beim nächsten Nachtlauf des Scrapers; eine geänderte Liste macht vorhandene Ergebnisse dieser Stelle veraltet. Claudes Entscheidung: eine einzige Quelle für beide Wege, damit Browser und Nachtlauf dieselben Anforderungen markieren.

**CV-Text.** Je CV-Version ein gespeicherter Text mit Herkunft „ausgelesen“ oder „korrigiert“ (A12). Der Nutzer sieht ihn auf der Seite „Dokumente“ als Vorschau und kann ihn korrigieren; die Originaldatei bleibt unverändert. Ein leerer Text (z. B. Scan) zeigt den Hinweis „Kein Text erkannt“ und erzeugt nie Rot.

**CV-Profil (Q33).** Je CV-Version eine Liste von Aussagen mit wörtlichem Beleg aus dem CV-Text (`[{aussage, beleg}]`). Jeder Beleg muss buchstabengetreu im CV-Text vorkommen; sonst wird die Aussage verworfen (mechanische Prüfung, A5).

**Stufe 1 (Bedeutungsvergleich).** Modell `intfloat/multilingual-e5-small` (Deutsch und Englisch; Lizenz und Größe prüft der Plan in Task 0), quantisierte ONNX-Datei, selbst ausgeliefert. Für jede Anforderung und jede CV-Version: höchste Ähnlichkeit zu einem Profil-Beleg. Regeln: „sicher belegt“ nur, wenn die Ähnlichkeit über der oberen Schwelle liegt **und** jeder Fachbegriff der Anforderung (Wörter mit Großbuchstaben/Ziffern/Sonderzeichen wie „SQL“, „C++“, „SAP S/4HANA“) wörtlich im Beleg steht (Lehre aus dem Wegwerf-Test); unter der unteren Schwelle „nicht belegt“ (Gelb, nie Rot); dazwischen Grenzfall. Die Schwellen legt der Plan mit dem künstlichen Gesamtfall `docs/beispiele/cv-abgleich.json` fest. Beste CV-Version: mehr sicher belegte Muss-, dann Soll-Anforderungen; liegt die zweite gleichauf oder höchstens eine Muss-Anforderung dahinter, gehen beide in Stufe 2.

**Stufe 2 (Grenzfälle).** Bekommt nur die Grenzfälle der 1–2 gewählten Versionen mit den passenden Profil-Belegen und liefert je Anforderung Farbe, Beleg (wörtlich) oder Begründung. Rot nur mit Begründung, die sich auf eine CV-Stelle stützt. Ein Beleg, der nicht wörtlich im CV steht, macht die Antwort ungültig → Gelb „konnte nicht geprüft werden“.

**Ergebnis.** Je (Nutzer, Stelle) ein gespeichertes Ergebnis: geprüfte CV-Versionen, empfohlene Version(en), je Anforderung Farbe/Grund/Beleg/CV-Version, Weg („claude“ oder „browser“), Prüfsummen der Anforderungsliste und der CV-Texte. Weicht eine Prüfsumme ab, wird das Ergebnis gelöscht (Q31) und neu berechnet; es wird nie als aktuell gezeigt.

**Anzeige.** Auf der Stellenseite markiert die Anzeige jede Anforderung farbig; Farbe immer zusammen mit Text („belegt“, „teilweise“, „noch nicht belegt“, „nicht erfüllt“), damit sie ohne Farbsehen lesbar ist. Klick oder Tastatur öffnet Beleg/Begründung und nennt die CV-Version. Oben: „Am besten passt: CV X“ bzw. „Gleich gut: CV A und CV B“ mit Umschalter, zuerst der Standard-CV (neue Markierung „Standard“ auf der Seite „Dokumente“, ohne Standard der erste der Liste). Ohne Ergebnis: „Noch nicht abgeglichen“. Vorläufiges Ergebnis des Admins (Q103): Grenzfälle grau mit „wird heute Nacht genauer geprüft“, oben der Hinweis „vorläufig“.

**Daten (Migration 018).** Neue Tabellen mit Zeilen nur für den Eigentümer (RLS), Gäste ohne Zugriff: CV-Text, CV-Profil, Ergebnisse, Einwilligung. `documents` bekommt die Markierung „Standard“; `jobs` die Anforderungsliste. Export und Kontolöschung umfassen alles; das Backup im privaten Repo schließt die CV-Tabellen aus.

### 6a: Nachtlauf für den Admin

1. Workflow „CV-Abgleich“ im privaten Repo, täglich 03:00 deutscher Zeit (Sommer-/Winterzeit beachten). Secrets: Supabase-Zugang und `CLAUDE_CODE_OAUTH_TOKEN`.
2. Admin bestimmen (`admins`, Phase 4d). Ohne Admin oder ohne Einwilligung: nichts tun.
3. Neue oder geänderte CV-Versionen: Text auslesen (PDF-Textebene, Word-Text); ist er leer, liest Claude die PDF-Seiten als Bild (Q24). Dann Profil durch Claude. Beides speichern.
4. Stellen wählen: gemerkte zuerst, dann Titel-Treffer aus „Automatisch abgleichen bei“; nur ohne aktuelles Ergebnis; höchstens 50.
5. Stufe 1 in Python mit derselben Modelldatei und denselben Regeln wie im Browser.
6. Stufe 2: bis zu 5 Stellen je `claude -p`-Aufruf (Haiku, Ausgabe als JSON), damit fester Aufschlag und Profile nur einmal zählen.
7. Antwort prüfen (Belege wörtlich, gültige Farben), speichern. Bei Abo-Limit oder Fehler von Claude Code: aufhören, nichts wiederholen, Rest in der nächsten Nacht. Das Log enthält nur Zahlen (z. B. „12 Stellen, 3 Aufrufe, Abbruch: Limit“).

**Halte-Punkte:** (a) Nutzer spielt Migration 018 ein und hat Nutzer-To-dos 27/28 erledigt; (b) Lauf mit künstlichem CV über 5 Stellen, Nutzer liest Settings → Usage vorher/nachher ab; danach Grenze 50 bestätigen oder senken; (c) erst dann echter CV; Nutzer prüft 10 Ergebnisse und sagt „passt“ oder nennt Fehler.

### 6b: Browser-Abgleich für alle anderen

1. Auslöser: Merken einer Stelle, Hochladen oder Korrigieren eines CV, Öffnen einer Stelle ohne aktuelles Ergebnis (Q37). Läuft im Hintergrund der Seite, blockiert nichts.
2. CV-Text beim Upload im Browser auslesen (PDF und Word). Scans kann der Browser nicht lesen: Hinweis „Kein Text erkannt – bitte in der Vorschau einfügen“ (Claudes Entscheidung, weil Freunde kein Claude haben, Q38).
3. Profil ohne Sprachmodell: Sätze und Stichpunkte des CV-Texts sind die Belege (Aussage = Beleg).
4. Stufe 1 mit derselben Modelldatei (im Browser über ein ONNX-Laufzeitpaket), beim ersten Mal geladen und vom Browser zwischengespeichert.
5. Stufe 2 nur, wenn Chromes eingebautes Modell verfügbar ist; sonst bleiben Grenzfälle Gelb mit dem Grund „nicht automatisch prüfbar“. Muss Chrome das Modell erst herunterladen, zeigt die Seite einen Hinweis mit Größe und Knopf „Genauer prüfen: Chrome-KI einmalig laden“; nur dieser Klick startet den Download (Q105).
6. Ergebnis wird gespeichert (gleiche Tabelle, Weg „browser“), damit es auf anderen Geräten sichtbar ist.
7. Das CV verlässt das Gerät nur zur eigenen Datenbank; nie zu einem KI-Anbieter.
9. **Wichtige Punkte nach Bedeutung (Q106):** Jeder Begriff der Konto-Seite wird mit den Stichpunkten der Anzeige verglichen (Stufe-1-Modell, eigene Schwelle); ein Treffer wird wie heute hervorgehoben, zusätzlich mit dem Hinweis „ähnlich: <Begriff>“. Wortanfang-Treffer bleiben unverändert.
8. **Admin (Q103):** Dieselben Auslöser starten beim Admin nur Stufe 1 (kein Chrome-Modell). Das Ergebnis wird als vorläufig gespeichert (Weg „browser-vorlaeufig“); der Nachtlauf behandelt Stellen mit nur vorläufigem Ergebnis wie Stellen ohne Ergebnis und ersetzt es. Kein zusätzliches Abo-Kontingent. Damit kommen die Sofort-Farben für den Admin erst mit 6b.

**Halte-Punkte:** (a) Migration 019, falls nötig; (b) Test mit Wegwerf-Konto `…@example.com` und künstlichem CV in Chrome mit und ohne eingebautes Modell; Nutzer sieht sich das Ergebnis an.

### Einwilligung und Datenschutzerklärung (in 6a, gilt für alle)

Vor dem ersten CV-Upload: Kasten mit Häkchen „Ich willige ein, dass jobradar meinen Lebenslauf speichert und mit Stellenanzeigen abgleicht. Er kann Angaben über Gesundheit, Religion o. Ä. enthalten (besondere Kategorien, Art. 9 DSGVO). Widerruf jederzeit durch Löschen des CV.“ Ohne Häkchen kein Upload. Datenschutzerklärung: Abschnitt Lebenslauf (Speicherort, Zweck, Abgleich beim Admin über Claude, bei allen anderen nur im Browser, Herkunft des Bedeutungsmodells, Löschung). Der genaue Wortlaut ist kein Rechtsrat; anwaltliche Prüfung vor öffentlichem Start bleibt (Q40).

## Beim Bauen frei (Builder entscheidet, nennt die Wahl)

Bibliotheken für PDF/Word in Python und im Browser; Spaltennamen; genaue Prompt-Formulierung (eigene Datei `scraper/cv_prompt.md`); Speicherort der Modelldatei (eigener Speicher, nicht Hugging Face zur Laufzeit); wie das Abo-Limit an der Ausgabe von Claude Code erkannt wird (mit Test belegen).

## Claudes Entscheidungen in diesem Entwurf (vom Nutzer zu prüfen)

1. Gemeinsame Anforderungsliste vom Scraper statt getrennter Zerlegung in Browser und Nachtlauf.
2. Fachbegriffe müssen für „sicher belegt“ wörtlich im Beleg stehen.
3. Zwei CV-Versionen in Stufe 2, wenn die zweite höchstens eine Muss-Anforderung dahinter liegt.
4. Freunde: Scans nicht automatisch lesbar, Hinweis statt Ausweg über Claude.
5. Ohne Chromes eingebautes Modell kein Rot für Freunde, nur Grün/Gelb.
6. Einwilligung gilt für alle, auch den Admin.
7. Sofort-Farben des Admins nutzen nur Stufe 1, nicht Chromes Modell – der Nachtlauf mit Claude ist für ihn die genauere Prüfung.
