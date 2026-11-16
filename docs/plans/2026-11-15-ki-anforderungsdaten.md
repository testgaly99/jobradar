# Paket 1: vorhandene KI-Anforderungsdaten robust lesen

Stand: 2026-11-16, lokal umgesetzt. Nutzerfreigabe ausdrücklich ausschließlich für Paket 1 aus `docs/arbeitspakete-codex.md`. Keine anderen Pakete umsetzen.

## Festgelegter Umfang

`web/lib/zusammenfassung.ts:leseKi` soll gültige Daten als unabhängige Kopien der Listen aufgaben/rahmen/muss/benefits zurückgeben. Bestehende Textwerte einschließlich Reihenfolge, Wiederholungen und Leerraum erhalten. Grenzen unverändert: aufgaben 3–5, rahmen 0–4, muss 0–3, benefits 0–2; Abschluss/Erfahrung nichtleerer Text oder null, Sprache de/en. Ungültige Eingaben bleiben null; lückenhafte Arrays sind keine gültigen Stringlisten.

`voraussetzungen` und bestehende Anzeige weiterverwenden. Kein neues Modul, Schema, KI-Aufruf, Modell-/Promptwechsel, CV-Matching, Filter oder Verhalten aus Paketen 2–14. Keine neuen Pakete/Konten, Zugangsdaten, Live-Datenbank, Migration oder Veröffentlichung.

## Umsetzung

- [x] Verhaltenstests zuerst: Ergebnis von Eingabe und weiteren Leseergebnissen entkoppeln; Arrays verschiedener Felder unabhängig halten; vorhandene Formate/Reihenfolgen/Grenzen erhalten; lückenhafte Listen ablehnen.
- [x] Validierte Listenkopien im bestehenden Leser erzeugen, ohne fremde Felder zu übernehmen; keine semantische Textänderung. Bestehende Funktionen/Importe erhalten.
- [x] Websuite, Typprüfung und isolierter Build; gezielte Browserprobe mit künstlicher Zusammenfassung für den vorhandenen Verbraucher. Abschlussprüfung des Diffs für Paket 1.
- [x] Arbeitskatalog/Plan/STATUS/Entscheidungen/Agentenprotokoll aktualisieren. Nur Paket 1 als umgesetzt markieren, andere Pakete offen lassen.

## Ergebnis und Nachweise

Vorbereitete Tests und Dokumentation im Arbeitsordner fortgeführt. Zunächst gezielt `node --test tests/zusammenfassung.test.ts`: vier Fehler bei geteilten Listen und Array-Lücken, fünf Tests bestanden. Nach der Korrektur alle neun Tests grün. Sechs zusätzliche Verhaltenstests decken unabhängige Rückgaben in beide Änderungsrichtungen, gemeinsam verwendete Eingabearrays, unveränderte Textwerte/Reihenfolge/Grenzen, Lücken und schreibgeschützte Eingaben ab.

`npm.cmd test`: 169 bestanden. In `web/` die Typprüfung `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`: ohne Fehler. Isolierter Produktions-Build mit `next build --webpack` bestanden: frische Kopie ausgewählter Quellen, künstliche Einstellungen, keine Umgebungsdateien, gesperrte HTTP-Aufrufe. Chrome-Probe auf `localhost:3002`: zwölf Fälle (1280/390 Pixel, jeweils de/en, ungültig/fehlend/Fehler und Gast) bestanden, Reihenfolge der Voraussetzungen sowie Aufgaben/Chips und Sprachkennzeichnung geprüft, keine Browserfehler. Externe Browseranfragen blockiert, Testserver danach beendet.

Lokale Reproduktionshilfen: `.superpowers/sdd/2026-11-16-ki-anforderungsdaten/`, ausschließlich lokale Prüfartefakte. Keine Python-Anwendungsänderung, daher keine erneute Python-Suite. Der Aufruf `py -B .../browser-check.py` scheiterte am Launcher mit „No installed Python found!“; derselbe Browsertest lief mit dem bereits installierten Python-3.12-Interpreter direkt erfolgreich, ohne Installation.

Abweichung: Kein unabhängiger Helfer eingesetzt; die aktuelle Sitzungsregel erlaubt keine unaufgeforderte Delegation. Stattdessen abschließende eigene Prüfung von Diff, Verbraucher und Regressionstests; Claudes unabhängige Prüfung anhand des Agentenprotokolls bleibt separat. Keine Änderung der Projektanforderungen oder des Groq-Designs.

Prüfgrenze: Datenformen und bestehende Darstellung, keine tatsächliche Modellqualität oder CV-/Stellenbewertung. Bestehende Groq-/Ranking-Freigabegrenzen unverändert.
