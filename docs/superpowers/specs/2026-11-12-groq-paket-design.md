# Groq-Paket: Zusammenfassung, Studium-Einstufung, Firma/Titel aus Text (Design)

Stand 2026-11-12. Mit dem Nutzer in drei Fragerunden geklärt; die Zusammenfassung des Verständnisses hat er bestätigt („Zusammenfassung passt“).

## Warum
Anzeigen sind lange Textwände (Median rund 4.700 Zeichen). Der Nutzer will auf einen Blick sehen, was man in der Stelle täglich wirklich tut und was man zwingend mitbringen muss. Außerdem sollen nur Stellen bleiben, die ein Studium voraussetzen (CLAUDE.md, Stufe 2 des Filters). Beim Anlegen einer Bewerbung aus eingefügtem Text sollen Firma und Titel nicht mehr von Hand nötig sein.

## Rahmen (CLAUDE.md, unverändert)
- An Groq gehen **nur öffentliche Anzeigentexte**, nie persönliche Daten. Kein Ausweichen auf Claude.
- Gratis-Tarif, kein kostenpflichtiger Schlüssel. Ist das Kontingent erschöpft, folgt der Rest später.
- CV-Abgleich ist **nicht** Teil dieses Pakets (Phase 6, über den Claude-Abo-Token).

## Fakten (geprüft 2026-11-12)
- Llama 70B gibt es bei Groq nicht mehr. Verfügbar u. a. `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`.
- Grenzen laut Antwort-Headern: 1.000 Anfragen/Tag, 8.000 Tokens/Minute je Modell; laut Groq-Doku ca. 200.000 Tokens/Tag je Modell.
- Rund 2.000 Tokens pro Anzeige → etwa 100 Anzeigen/Tag mit dem großen Modell. 838 offene Stellen → einmalig ca. 9 Tage.

## Festlegungen des Nutzers
1. **Modell:** `gpt-oss-120b`. Reicht dessen Tageskontingent nicht, fasst `gpt-oss-20b` vorläufig zusammen; am Folgetag fasst das große Modell diese Anzeigen neu zusammen, sodass am Ende alle vom großen Modell stammen.
2. **Reihenfolge pro Lauf:** (1) neue Anzeigen, (2) vorläufige vom kleinen Modell neu mit dem großen, (3) Altbestand. Das kleine Modell springt nur ein, wenn das große erschöpft ist.
3. **Anleitung (System-Prompt)** als Datei im Repo, mit Regeln, Definitionen, 2–3 Beispielen und festem JSON-Antwortformat.
4. **Probe zuerst:** 20 gemischte Anzeigen (verschiedene Firmen, Deutsch/Englisch, Grenzfälle wie Werkstudent, Assistenz, Vertrieb). Claude prüft jede Antwort gegen den Originaltext und legt dem Nutzer eine Übersicht mit markierten Fehlern vor. Erst nach „passt“ werden alle Anzeigen ausgewertet.
5. **Zusammenfassung** (Detailseite, oben, nur für Angemeldete, in der Sprache der Anzeige; Überschriften deutsch):
   - **Zusammenfassung:** 3–5 Stichpunkte zu den **nicht-trivialen** Aufgaben im Arbeitsalltag. Nichts Banales wie „Präsentationen erstellen“, „mit Kunden sprechen“. Besonders Relevantes kommt mit hinein, wenn es in der Anzeige steht: Befristung, Reisetätigkeit, Sicherheitsüberprüfung, Anzahl Büro-Tage, Gehalt.
   - Nicht wiederholen: Ort, Arbeitsmodell (außer Büro-Tagen), Erfahrungsjahre. Gehalt wird wiederholt, wenn es in der Anzeige steht.
   - **Das musst du mitbringen:** die 3 wichtigsten **Muss**-Anforderungen, ohne „wünschenswert“ und **ohne Sprachkenntnisse**.
   - Kein eigener Bereich „Auffällig“.
   - Noch nicht ausgewertet: „Zusammenfassung folgt“.
6. **Einstufung:** Studium `ja` / `nein` / `unklar` und Tätigkeit `anspruchsvoll` / `einfach`.
   - `nein` wird **ausgeblendet, nicht gelöscht** (Prestige-Firmen ohne Studiumsangabe werden im nächsten Schritt bewertet).
   - Tätigkeit wird gespeichert, aber erst mit den Prestige-Listen angewendet.
   - Die Einstufung erscheint **nicht** im Steckbrief; kein Filter dafür.
7. **Wann:** im täglichen Lauf nach dem Abrufen. Ändert sich der Anzeigentext, wird neu zusammengefasst; sonst nie.
8. **Teil C (eigener kleiner Schritt nach A+B):** Wird eine Bewerbung ohne Link, aber mit eingefügtem Anzeigentext angelegt, schlägt Groq Firma und Titel vor; der Nutzer kann sie ändern. Hinweis am Feld: „Nur den Anzeigentext einfügen, keine eigenen Daten.“ Der Text wird wie heute als `snapshot_text` gespeichert.
   - Großes Modell erschöpft → anderes Groq-Modell.
   - Groq gar nicht erreichbar → Bewerbung wird so gespeichert, wie sie ist (Firma/Titel leer, wenn nicht eingetragen); der tägliche Lauf füllt sie nach, sobald Groq wieder geht. *(vom Nutzer bestätigt 2026-11-12)*
9. **Admin auf der Konto-Seite:** „Noch X Anzeigen warten auf Auswertung“, Anzahl vorläufiger Zusammenfassungen, Liste der wegen „Studium: nein“ ausgeblendeten Stellen zum Gegenprüfen.

## Änderungen nach der Probe (Nutzer, 2026-11-13)
Gehen Punkt 5 oben vor, wo sie widersprechen.
1. **Antwortformat zum Überfliegen:** `aufgaben` (3–5), `abschluss` (geforderter Abschluss als eigener Stichpunkt, z. B. „Studium Informatik o. ä.“, sonst null), `erfahrung` (geforderte Berufserfahrung **mit Jahreszahl, wenn die Anzeige sie nennt**, sonst null), `muss` (0–3 weitere Muss-Anforderungen ohne Abschluss, Erfahrung und Sprachen), `studium`, `taetigkeit`, `sprache`. Erfahrungsjahre werden also doch wiederholt.
2. **„Studium: unklar“ bleibt sichtbar** (nur „nein“ wird ausgeblendet; bestätigt).
3. **Studium „ja“, sobald die Anzeige ein Studium ausdrücklich fordert**, auch wenn „oder vergleichbare Qualifikation“ folgt. Probe-Fehler: „Presales Solution Engineer“ und „Account Manager IT“ wurden trotz ausdrücklicher Studiumsforderung „unklar“.
4. **„Ungültig“ erscheint nie auf der Website.** Ist eine Antwort ungültig, wird Groq einmal mit dem konkreten Fehler zurückgefragt („6 statt höchstens 5 Punkte“), dann das nächste Modell; erst danach gilt die Anzeige als nicht auswertbar und zeigt „Zusammenfassung folgt“-ähnlichen neutralen Text, nie das Wort „ungültig“.
5. **System-Prompt so kompakt wie möglich**, weil das Modell schwächer ist als Claude: kurze Regeln, ein Beispiel statt zwei, keine Wiederholungen.
6. **Darstellung:** Aufgaben und Voraussetzungen (Abschluss, Erfahrung, Muss) **nebeneinander**, kompakt, einklappbar, modern nach aktuellen UI/UX-Vorbildern („sieht aus wie von einem Profi gebaut“). Vor dem Bau ein Klick-Entwurf zur Freigabe.

## Nicht-Ziele
CV-Abgleich, Filter nach Studium, Zusammenfassung für Gäste, Löschen von „nein“-Stellen, Prestige-Ausnahme anwenden, Zusammenfassung in der Stellenliste.

## Anti-Ziele
- Erfundene Angaben: Was nicht in der Anzeige steht, darf nicht in der Zusammenfassung stehen.
- Banale Stichpunkte, die auf jede Stelle passen.
- Stellen verschwinden durch einen KI-Irrtum endgültig.
- Persönliche Daten bei Groq.

## Ansätze
- **A, eine Anfrage pro Anzeige für Zusammenfassung und Einstufung (gewählt):** halbiert den Verbrauch gegenüber getrennten Anfragen.
- **B, getrennte Anfragen:** einfacher zu prüfen, aber doppeltes Kontingent; verworfen.
- **C, Groq Batch-API:** zählt laut Doku nicht gegen die normalen Grenzen, ist aber im Gratis-Tarif nicht sicher verfügbar; verworfen, kann später geprüft werden.

## Dem Bauenden überlassen
Spaltennamen und Migration, Pausen bei 429 (Retry-After beachten), Kürzen sehr langer Anzeigen, Erkennen einer Textänderung (z. B. Prüfsumme), Aufbau der Probe-Übersicht, wo der Groq-Aufruf für Teil C liegt (Server-Action; braucht `GROQ_API_KEY` in Vercel, trägt der Nutzer selbst ein).

## Was der Nutzer tun muss
`GROQ_API_KEY` als GitHub-Secret (für den täglichen Lauf) und in Vercel (für Teil C) eintragen; Migration im SQL Editor ausführen. Claude sagt rechtzeitig Bescheid.

## Folgeänderungen an CLAUDE.md (nach Freigabe dieses Dokuments)
- Abschnitt 3.2 und 5: „großes Llama-Modell“ / „Llama 70B“ → `gpt-oss-120b`, Überlauf auf `gpt-oss-20b` mit Nachbesserung.
- Abschnitt 2, Stufe 2: „Gespeichert wird bei ja und unklar“ → „nein“ wird vorerst ausgeblendet statt nicht gespeichert, bis die Prestige-Bewertung steht.
- Abschnitt 6, Phase 2b: „Kurz gesagt, Top-3-Anforderungen und Auffällig“ → Zusammenfassung (Aufgaben-Stichpunkte) und „Das musst du mitbringen“; „Auffällig“ entfällt.
