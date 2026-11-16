# Paket 3: Filterparameter und Seitenbereiche absichern

Stand: 2026-11-16, lokal umgesetzt und geprüft. Nutzerauftrag „Weiter mit 3“ aus `docs/arbeitspakete-codex.md`; ausschließlich Paket 3 umsetzen.

## Umfang

Eine gemeinsame reine Berechnung im bestehenden Filtermodul prüft Seitenzahl sowie inklusive Start-/Endposition mit `Number.isSafeInteger`. Ungültige Werte fallen auf Seite 1 zurück, wie bereits bei negativen/gebrochenen/ungültigen Seitenangaben. Die vorhandenen 50 Treffer pro Seite bleiben unverändert; die Konstante bleibt über `stellen.ts` verfügbar und wird im Filtermodul für den gemeinsamen Bereich genutzt.

URL-Leser, URL-Schreiber und Abfrage verwenden diese Berechnung, damit auch programmatisch gebaute Filter keine unsicheren Bereiche an PostgREST geben. Gültige Zahlenformate, der erste bereinigte Mehrfachwert, andere Filter, Sortierung und Suchregeln unverändert. Keine Grenze anhand von Trefferzahl oder frei gewähltem Maximalwert: allein die technische sichere Ganzzahldarstellung entscheidet. Ranking-/Standardabfrage beide prüfen; keine globale Größensortierung oder neue fachliche Regel.

## Umsetzung und Prüfung

- [x] Tests zuerst: ungültige, unendliche, zu große Zahlen, größte vollständige sichere Seite und erste unsichere Endposition; gültige Formate/Mehrfachwerte und URL-Ausgabe erhalten.
- [x] Gemeinsame Seitenbereichsprüfung in vorhandene Filter- und Abfragefunktionen einsetzen; bisherigen Export von PRO_SEITE erhalten.
- [x] Websuite, Typprüfung, isolierter Build, Browserprobe mit künstlichen mehrseitigen Daten und kontrollierten Abfrageparametern. Eigener Abschlussreview.
- [x] Katalog, STATUS, Entscheidungen und Agentenprotokoll aktualisieren; lokaler Commit, kein Upload. Weitere Pakete bleiben offen.

## Ergebnis und Nachweise

`seitenBereich` wird unmittelbar von `leseFilter`, `filterZuUrl` und `stellenAbfrage` verwendet. Für 50 Treffer ist Seite 180143985094819 noch vollständig sicher (Start 9007199254740900, Ende 9007199254740949); auf der nächsten Seite ist zwar der Start noch sicher, das Ende aber nicht mehr. Es gibt keine willkürliche Treffer-/Seitengrenze und keine Anpassung an die tatsächliche Trefferzahl. `PRO_SEITE` bleibt über `stellen.ts` importierbar, keine Kreisabhängigkeit.

Sechs neue Verhaltenstests: vier zu Parameterlesen/-schreiben und zwei zu echten Supabase-Abfrageobjekten mit ersetztem fetch, jeweils Standard-/Rankingweg. Zunächst `node --test tests/filter.test.ts tests/stellen.test.ts`: 25 grün, drei rot (unsichere Seite akzeptiert, ungültige URL-Seite ausgegeben, negativer Datenbankoffset aus direktem Filter). Nach Korrektur gesamte Suite `npm.cmd test`: **182 bestanden**. Typprüfung in `web/` mit `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`: Exit 0.

Isolierter Produktions-Build `next build --webpack` bestanden: frische ausgewählte Quellen, keine Umgebungsdateien, bereinigte Umgebung, künstliche Einstellungen und gesperrte HTTP-Aufrufe. Lokale Hilfen unter `.superpowers/sdd/2026-11-16-filter-seitenzahlen/`, nicht versioniert.

Chrome auf localhost:3002 mit 151 vollständig künstlichen Stellen: **21 Fälle bestanden**. Je Laptop-/Handygröße und Standard-/Rankingweg vier ungültige Zahlen geprüft (Infinity, Bruchzahl, unsichere Ganzzahl, sichere Seite mit unsicherem Bereichsende); angezeigte Seite 1 und tatsächlicher Abfragebereich 0–49 bestätigt. Je Kombination weiter auf Seite 2/3/4, letzte Seite mit einem Treffer und Zurück geprüft; Sortierung/Ranking bleiben in Links erhalten. Zusätzlich Gastfall bestanden. Künstlicher Server weist jeden unsicheren Start-/Endwert ab; externe Browseranfragen gesperrt. Keine Browserfehler, Testserver beendet, Portschließung geprüft.

Eigener Abschlussreview ohne materielle Befunde; kein anderes Filterverhalten verändert. Keine Python-Anwendungsänderung, Python-Suite daher nicht erneut ausgeführt. Browserprobe wie in Paketen 1/2 direkt mit vorhandenem Python 3.12, weil py-Launcher die Installation nicht erkennt. Kein unabhängiger Helfer wegen aktueller Sitzungsregel gegen unaufgeforderte Delegation; Claudes Prüfung anhand des Agentenprotokolls bleibt separat. Keine Live-Abfrage, Migration, Installation oder Veröffentlichung.

Prüfgrenze: JavaScript-Zahlen, Navigation und HTTP-Abfragevertrag mit künstlichen Antworten; keine echte SQL-/PostgREST-/RLS-Abnahme. Keine Zugangsdaten, Live-Datenbank, Groq-Anfrage, neue Bibliothek oder Migration.
