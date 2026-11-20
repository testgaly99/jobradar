# Bewerbungsformular neu – Design (kurz)

Stand 2026-11-19 · Fragen Q196–Q200 · Backlog „Bewerbungsformular neu definieren“ (CLAUDE.md 6) · Bau durch Codex nach Runde 1 (Nr. 0) und Bewerben-Helfer (Nr. 11a), weil alle drei `web/app/bewerbung/[id]/inhalt.tsx` ändern · Migration **025**.

## Wozu

Die Bewerbung zeigt heute immer alle 7 Kästen mit rund 40 Feldern, auch bei einer gerade gemerkten Stelle. Ziel: nur zeigen, was in der aktuellen Phase zählt (Q199), bekannte Stellendaten nicht abtippen und nicht versehentlich ändern (Q200), überflüssige Felder streichen (Q198).

## Entscheidungen

| Was | Quelle |
|---|---|
| Kästen erscheinen nach Status; was gefüllt ist, bleibt immer sichtbar; Link „Alle Felder zeigen“ | Q199 |
| Stellendaten (Firma, Titel, Link, Quelle, Standort, Präsenzmodell, Gehalt laut Anzeige) bei bekannter Stelle als Text mit ✎; bei Bewerbungen ohne Stelle Eingabefelder | Q200 |
| „Portal-Hinweis“ und „Vergleich aktuelles Gehalt“ entfallen; der Konto-Merker des Bewerben-Helfers ersetzt den Portal-Hinweis | Q198 |
| „+ Bewerbung hinzufügen“ bleibt wie heute: nur Link (Firma/Titel automatisch, sonst zwei Felder) | CLAUDE.md 4.4, heute schon so |

## Sichtbarkeit (reine Funktion `sichtbareKaesten(status, ergebnis, zeile, alle): Kasten[]`)

| Kasten | sichtbar ab Status | Felder |
|---|---|---|
| Kopf (Stelle) | immer | Stellendaten (Text mit ✎ bzw. Eingabe) |
| Ablauf | immer | Status, nächster Schritt, Fälligkeit |
| Bewerbung vorbereiten (Knopf) | nur `gemerkt` | aus dem Bewerben-Helfer |
| Einschätzung | immer | Interesse, Tags, Notizen |
| Kontakte | immer (eingeklappt, wenn leer) | wie heute + Anrede (Runde 1) |
| Bewerbung | `beworben` | Datum, Weg, Referenznummer, CV, Anschreiben, Anlagen, Gehaltswunsch |
| Interviews und Aufgaben | `im_gespraech` | wie heute |
| Angebot und Rahmen | `angebot` | Angebot fix/variabel/Urlaub/Benefits, Starttermin, Kündigungsfrist, Referenzen |
| Ergebnis | `abgeschlossen` | Ergebnis; bei Absage Absagegrund + Feedback; bei zurückgezogen Rückzugsgrund; sonst nur Feedback |
| Verlauf | immer | wie heute |

Regeln: „ab Status“ heißt dieser und jeder spätere in der Reihenfolge Gemerkt → Beworben → Im Gespräch → Angebot → Abgeschlossen. Ein Kasten erscheint außerdem, sobald eines seiner Felder gefüllt ist, und bei „Alle Felder zeigen“ (nur für diese Ansicht, nicht gespeichert).

## Wegfallende Felder (Migration 025)

`portal_hinweis` und `gehalt_aktuell_vergleich`: Vorhandene Inhalte werden zuerst ans Ende von `notizen` angehängt („Portal-Hinweis: …“, „Vergleich aktuelles Gehalt: …“), danach werden die Spalten gelöscht. Export, Formular, `FELDER` in `web/lib/bewerbung.ts` und Tests ohne die beiden Felder.

## Nicht-Ziele

Neue Felder; Änderungen an Kanban (Animationen unverändert), Liste oder Auswertung; Umbau von Kontakten und Interviews.

## Tests

- `sichtbareKaesten` für jeden Status, mit gefülltem Feld eines späteren Kastens, mit `alle = true`, für jedes Ergebnis.
- Migration: Text in `notizen` angehängt, auch wenn `notizen` leer ist; Spalten danach weg (Regex-Test der SQL-Datei wie bei 023/024).
- Klicktest: gemerkte Bewerbung zeigt nur Kopf, Ablauf, Vorbereiten, Einschätzung, Kontakte, Verlauf; Statuswechsel auf „Angebot“ blendet „Angebot und Rahmen“ ein; ✎ ändert den Titel.

## Entscheidungen von Claude (zum Gegenlesen)

1. Kontakte und „nächster Schritt“ sind immer da (Empfehlungsgeber und „bis Freitag bewerben“ gibt es schon vor dem Bewerben).
2. Gehaltswunsch steht im Kasten „Bewerbung“ (vorausgefüllt aus dem Profil, Helfer).
3. Im Ergebnis-Kasten nur die zum Ergebnis passenden Felder.
4. „Alle Felder zeigen“ wird nicht gespeichert.
5. Die zwei wegfallenden Spalten werden gelöscht, nachdem ihr Inhalt in die Notizen kopiert wurde. Das ist unumkehrbar und passiert erst, wenn du Migration 025 einspielst.
