# Paket 6: unveränderte Belegtexte und Hervorhebung absichern

Stand: 2026-11-16, lokal abgeschlossen. Autorisierter Folgeauftrag nach abgeschlossenen Paketen 4/5; ausschließlich Paket 6.

## Umfang

Für `markiere` nachweisen, dass Zusammenfügen sämtlicher Segmenttexte exakt den übergebenen String ergibt: Unicode einschließlich kombinierender Zeichen/Emoji, Umlaute, CR/LF, Leerraum, Steuerzeichen und als Text gemeinte HTML-/Regex-Zeichen. Bestehende Wortanfangs-/Großkleinregeln erhalten. Gültige Titel/Punkte durch `leseAbschnitte` unverändert erhalten; kaputte Abschnitte kontrolliert verwerfen bzw. bestehenden Rückfall nutzen, Eingaben nicht verändern.

Vorhandenen Verbraucher `web/app/abschnitte.tsx` im Browser mit künstlichen Daten prüfen: gültige Titel/Punkte, markierte Textstücke, als Text dargestellte HTML-Zeichen, beschädigte/fehlende Abschnitte und Gastansicht. Bestehende Absatzaufteilung für unstrukturierten Rückfalltext bleibt erhalten; exakte Stringrekonstruktion wird für den Segmentierer geprüft, nicht als Umkehrbarkeit dieser Absatzformatierung behauptet. Keine neuen Beleg-IDs, Matching-/Farbregeln oder semantische Textänderungen.

- [x] Verhaltenstests ergänzen, nur bei nachgewiesenem Fehler kleinste Korrektur.
- [x] Websuite, Typprüfung, isolierter Build und Browserprobe; eigener Abschlussreview.
- [x] Katalog, STATUS, Entscheidungen und Agentenprotokoll aktualisieren; eigener lokaler Commit. Auftrag 4/5/6 abschließen.

## Ergebnis

Sieben zusätzliche Tests bestehen bereits gegen bisherigen Code; kein Korrekturbedarf nachgewiesen, Anwendung unverändert. 112 Kombinationen aus 14 Texten und acht Begriffslisten prüfen exakte Segmentrekonstruktion, einschließlich CR/LF, kombinierender Zeichen, Emoji, astraler Zeichen, Kontrollzeichen und einzelner Surrogate. Zusätzlich wörtliche Regex-Zeichen, unveränderte gültige Abschnitte, beschädigte/gemischte/lückenhafte Listen und schreibgeschützte Eingaben abgesichert. Bestehende Markierungs- und Rückfallregeln erhalten.

Gezielt 15 Anzeigetests grün, gesamte Websuite `npm.cmd test`: **222 bestanden**. Typprüfung `.\node_modules\.bin\tsc.cmd --noEmit --incremental false` in `web/` ohne Fehler. Isolierter `next build --webpack` bestanden: frische ausgewählte Quellen ohne Umgebungsdateien, bereinigte Umgebung, künstliche Einstellungen, HTTP gesperrt. Lokale Hilfen unter `.superpowers/sdd/2026-11-16-belegtexte/`.

Chrome am tatsächlichen Verbraucher auf localhost:3002 bei 1280/390 Pixel: jeweils gültige Abschnitte mit/ohne Markierung, gemischt kaputte Abschnitte, vollständig kaputte Abschnitte mit Text-Rückfall, fehlender Text und Gastansicht – **zwölf Fälle bestanden**. Titel/Punkte per textContent zeichengetreu mit künstlichen Vorgaben verglichen, richtige markierte Teiltexte geprüft. Scheinbarer script-Inhalt bleibt Text, kein DOM-Script und keine Ausführung. Die vorhandene Absatzformatierung des Rückfalls separat geprüft; daraus keine Umkehrbarkeit auf den Original-Fließtext abgeleitet. Keine Browserfehler, externe Anfragen blockiert. Testserver beendet, Portschließung bestätigt.

Eigener Abschlussreview ohne materielle Befunde. Keine Python-Anwendungsänderung, keine erneute Python-Suite. Wie Paket 4 keine roten Tests erzwungen, da bestehendes Verhalten die Erwartungen bereits erfüllt. Browserprobe mit installiertem Python 3.12 direkt wegen nicht erkennender py-Launcher-Umgebung. Kein Helfer gemäß Sitzungsregel, unabhängige Claude-Prüfung separat. Keine echten Daten, Live-Abfragen oder Veröffentlichung; Auftrag 4/5/6 lokal vollständig abgeschlossen.

Keine echten Stellen/CVs, Zugangsdaten oder Live-Abfragen, keine neuen Pakete, Migration oder Veröffentlichung. Eigener Review gemäß aktueller Sitzungsregel, Claudes unabhängige Prüfung separat.
