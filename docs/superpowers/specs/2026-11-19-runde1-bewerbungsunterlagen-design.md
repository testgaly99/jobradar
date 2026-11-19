# Runde 1: Bewerbungsunterlagen – Design

Stand 2026-11-19 · Fragen Q157–Q169 (`docs/fragen-und-antworten.md`) · Umsetzung durch Codex (Warteschlange), Migration **023**.

## Wozu

Der Nutzer bewirbt sich auf Karriereseiten und braucht je Bewerbung schnell ein sauberes Anschreiben. Wörtlich: „Ich werde mehrere Vorlagen für Anschreiben hochladen und möchte dann zwei buttons haben, entweder Anschreiben übernehmen, dann wird einfach Firma etc eingetragen und ein Download button (download pdf und download word), oder Anschreiben edit with Claude, dann öffnet sich einfach Claude im neuen Tab“.

Damit beantwortet sich auch der Backlog-Punkt „Dokumente klären“: Hochgeladene Unterlagen sind die Quelle für Anschreiben, für die Anlagen je Bewerbung und später für den Bewerben-Helfer (Q160).

## Ziele

| Ziel | Quelle |
|---|---|
| Reiter **„Unterlagen“** kommt zurück: Briefkopf, Anschreiben-Vorlagen, CV-Versionen, Anlagen an einem Ort | Q164 |
| **Briefkopf** einmal je Nutzer: Name, Straße, PLZ + Ort, Telefon, E-Mail, LinkedIn (optional) | Q157 |
| **Mehrere Anschreiben-Vorlagen** je Nutzer, privat; jeder Nutzer (auch Freunde) kann eigene anlegen. Anlegen per Text einfügen oder `.docx` hochladen; nur der Text wird übernommen | Q157, Q169 |
| Platzhalter `{{firma}}`, `{{stelle}}`, `{{ansprechpartner}}`, `{{anrede}}`, `{{quelle}}` | CLAUDE.md 4.5 |
| In der Bewerbung: Vorlage wählen, Vorschau, **„PDF herunterladen“**, **„Word herunterladen“**, beides im gleichen Brief-Layout (DIN 5008) | Nutzerwunsch, Q157 |
| Beim Herunterladen wird das PDF als **Anschreiben der Bewerbung** gespeichert (`applications.anschreiben_dokument_id`) | Q158 |
| **„Mit Claude bearbeiten“** öffnet claude.ai im neuen Tab mit fertigem Auftrag (ausgefüllte Vorlage, Briefkopf, Anzeigentext); Claude erstellt die Datei selbst | Q159 |
| **„Endfassung hochladen“** in der Bewerbung: ersetzt das gespeicherte Anschreiben | Q161 |
| **Anlagen** einmal hochladen, je Bewerbung anhaken | Q163, CLAUDE.md 4.5 |
| Anrede-Feld **Frau / Herr / ohne** am Kontakt | Q167 |
| PDF und Word entstehen **im Browser** (`docx`, `pdfmake`, `mammoth`, erst beim Klick geladen) | Q166 |

## Nicht-Ziele (Backlog)

| Was | Quelle |
|---|---|
| Textbausteine | Q162 |
| Vorlagen zwischen Konten teilen | Q169 |
| Bewerben-Helfer: Erweiterung füllt Karriereseiten vor; **eigene Runde direkt danach**, mit Prüfung der Nutzungsbedingungen der Bewerbermanagement-Systeme | Q160 |
| Bewerbungsformular neu definieren: **eigene Runde** nach dem Bewerben-Helfer | Q165 |
| Eigenes Word-Design der Vorlage (Schrift, Farben, Linien) | Q157 |
| KI-Entwurf innerhalb von jobradar über den Abo-Token (CLAUDE.md 4.5 „optional“); ersetzt durch den Claude-Knopf | Q159 |
| Firmenanschrift im Empfängerfeld; jobradar kennt sie nicht, der Empfänger ist „Firma, z. Hd. Ansprechpartner“ | Claude |

## Anti-Ziele

- Anschreiben, Briefkopf oder Anlagen gehen nie an Groq, Mistral oder einen anderen Dienst. Ausnahme ist der Claude-Knopf, und der öffnet nur das **eigene** claude.ai-Konto des Nutzers im Browser (CLAUDE.md 3.2).
- Kein Erzeugen auf dem Server (Q166). Kein automatisches Absenden irgendwohin.
- Keine Datei eines Nutzers ist für einen anderen sichtbar (RLS, Bucket-Pfad je Nutzer wie heute).

## Bauweise (Q166: A, im Browser)

| Weg | Bewertung |
|---|---|
| **A: im Browser** (gewählt) | Daten bleiben im Browser bzw. im eigenen Speicher; PDF lässt sich direkt an der Bewerbung speichern; beim ersten Klick werden ca. 1–2 MB nachgeladen. |
| B: auf dem Server (Vercel) | gleiche Pakete; Daten liefen durch Vercel (bis To-do 30 in den USA), ohne Vorteil. |
| C: Druckfunktion des Browsers | kein PDF-Paket; mehr Klicks, Kopf- und Fußzeilen des Browsers stören; jobradar bekommt die Datei nicht und kann sie nicht speichern (widerspricht Q158). |

Pakete (neu in `web/package.json`, Versionen fest, per `import()` erst beim Klick):
- `docx` (MIT) erzeugt die Word-Datei.
- `pdfmake` (MIT) erzeugt das PDF und bricht den Text um.
- `mammoth` (BSD-2) liest den Rohtext aus einer hochgeladenen `.docx`.

## Entwurf

### 1. Datenbank (Migration 023, Nutzer spielt ein)

- `briefkopf(owner_id pk → auth.users on delete cascade, name, strasse, plz_ort, telefon, email, linkedin, geaendert_am)`
- `anschreiben_vorlagen(id, owner_id → auth.users on delete cascade, name, betreff default 'Bewerbung als {{stelle}}', text, geaendert_am)`; `text` höchstens 20 000 Zeichen
- `bewerbung_anlagen(application_id → applications on delete cascade, document_id → documents on delete restrict, primary key (application_id, document_id))`
- `contacts.anrede text check (anrede in ('frau','herr','ohne'))`, darf leer sein
- RLS auf allen drei neuen Tabellen: nur `owner_id = auth.uid()`. Bei `bewerbung_anlagen` gilt das über die Bewerbung **und** das Dokument; beide müssen dem Nutzer gehören.
- Konto löschen räumt über `cascade` mit ab. Die Dateien im Bucket entfernt die bestehende Löschlogik (`web/lib/nutzer-loeschen-kern.ts` löscht alles unter `<uid>/`, geprüft 2026-11-19).

### 2. Reiter „Unterlagen“ (`/unterlagen`)

- Die heutige Seite `/dokumente` wird zu `/unterlagen`; `/dokumente` leitet um. Der Navigationsreiter heißt „Unterlagen“.
- Abschnitte in dieser Reihenfolge:
  1. **Briefkopf:** ein Formular.
  2. **Anschreiben-Vorlagen:** Liste mit „Neue Vorlage“. Felder Name, Betreff, Text; „Aus Word-Datei übernehmen“ nimmt nur `.docx` bis 5 MB. Bei `.doc` erscheint der Hinweis „Bitte in Word als .docx speichern“. Unter dem Text steht eine Platzhalter-Liste zum Anklicken.
  3. **CV-Versionen**.
  4. **Anlagen**.
- 3 und 4 nutzen den bestehenden Upload (`documents`, Arten `cv`/`anlage`) unverändert.

### 3. In der Bewerbung (Abschnitt „Ablauf und Bewerbung“)

- **Anschreiben-Block:**
  - Auswahl der Vorlage, darunter eine Vorschau des ausgefüllten Texts.
  - Fehlt ein Wert, erscheint der Hinweis „Ohne Wert: {{ansprechpartner}}“. Der Platzhalter wird dann leer ersetzt. Ein Herunterladen bleibt möglich.
  - Unbekannte `{{…}}` bleiben stehen und werden genauso gemeldet.
  - Knöpfe: **PDF herunterladen** · **Word herunterladen** · **Mit Claude bearbeiten** · **Endfassung hochladen**.
- **Speichern (Q158):**
  - Bei jedem Herunterladen wird das PDF in den Bucket geladen, als `documents` mit `art='anschreiben'` und dem Namen `Anschreiben <Firma> <TT.MM.JJJJ>`, und als `anschreiben_dokument_id` gesetzt.
  - Das gilt auch beim Word-Herunterladen, damit immer ein PDF gespeichert ist.
- **Endfassung hochladen (Q161):**
  - Nimmt PDF oder Word bis 10 MB, legt es als `documents` mit `art='anschreiben'` an und setzt die Verknüpfung um.
- **Ersetzen (gilt für Speichern und Endfassung):**
  - Erst wird die Verknüpfung umgesetzt. Danach wird das alte Anschreiben gelöscht, wenn keine andere Bewerbung mehr darauf zeigt.
  - Dieselbe Prüfung gilt für einen von Hand hochgeladenen Anschreiben-Entwurf. Ein altes Anschreiben ohne Verweis bleibt also nicht liegen.
- **Anlagen:** Häkchen-Liste aller eigenen Anlagen; ein Haken legt eine Zeile in `bewerbung_anlagen` an, ein entfernter Haken löscht sie.
- **Kontakt:** Beim Ansprechpartner gibt es neu die Auswahl Frau / Herr / ohne.

### 4. Platzhalter (reine Funktion, ohne Browser testbar)

`fuelleVorlage(text: string, werte: Record<string,string>) -> { text: string, ohneWert: string[], unbekannt: string[] }`

| Platzhalter | Wert |
|---|---|
| `{{firma}}` | `applications.firma` |
| `{{stelle}}` | `applications.titel` |
| `{{ansprechpartner}}` | Name des ersten Kontakts mit `art='ansprechpartner'` |
| `{{anrede}}` | `frau` → „Sehr geehrte Frau <Nachname>“, `herr` → „Sehr geehrter Herr <Nachname>“, sonst (auch ohne Kontakt) „Sehr geehrte Damen und Herren“; ohne Komma, das Komma steht in der Vorlage. Nachname ist das letzte Wort des Namens. |
| `{{quelle}}` | aus `applications.quelle`: enthält es linkedin/stepstone/indeed/xing/glassdoor → „LinkedIn“, „StepStone“, „Indeed“, „XING“, „Glassdoor“; leer → Hinweis „Ohne Wert“; sonst (Firmenseite, Bewerbermanagement-System wie `boards.greenhouse.io`) → „Ihre Karriereseite“. Das Feld „Quelle“ bleibt in der Bewerbung editierbar. |
| `{{datum}}` | heutiges Datum, z. B. „19. November 2026“ (Claude ergänzt) |

### 5. Brief-Layout (gleich in PDF und Word)

- A4, Ränder links 25 mm, rechts 20 mm, Schrift 11 pt.
- Reihenfolge von oben:
  1. Absenderzeile aus dem Briefkopf.
  2. Empfänger: Firma, darunter „z. Hd. <Ansprechpartner>“, falls vorhanden.
  3. Rechtsbündig „<Ort>, <Datum>“. Der Ort ist der Teil von `plz_ort` nach der PLZ.
  4. Betreff fett.
  5. Text der Vorlage mit Absätzen.
- Keine Silbentrennung.
- Dateiname: `Anschreiben_<Firma>_<JJJJ-MM-TT>.pdf` bzw. `.docx`, Sonderzeichen ersetzt.

### 6. „Mit Claude bearbeiten“ (Q159)

- Öffnet `https://claude.ai/new?q=<Auftrag>` in einem neuen Tab.
- **Auftrag (Text fest):** „Passe dieses Anschreiben an die folgende Stelle an. Bleib bei meinem Stil, erfinde nichts über mich. Erstelle das Ergebnis als Word-Datei und als PDF im deutschen Briefformat (DIN 5008).“ Danach folgen Briefkopf, ausgefüllte Vorlage und der Anzeigentext der Bewerbung (Aufgaben/Anforderungen aus dem Snapshot). Gibt es keinen Snapshot, steht dort nur der Link.
- **Länge:** Ist die Adresse länger als 6 000 Zeichen, kopiert jobradar den Auftrag in die Zwischenablage, öffnet `https://claude.ai/new` und zeigt „Auftrag kopiert – in Claude mit Strg+V einfügen“.
- **Hinweis unter dem Knopf:** „Öffnet dein eigenes Claude-Konto; dein Text geht an Claude.“
- Die Endfassung kommt über „Endfassung hochladen“ zurück.

### 7. Datenschutz

- Die Datenschutzseite bekommt einen Satz: Briefkopf und Vorlagen liegen wie die Bewerbungen in Supabase Frankfurt. Der Claude-Knopf öffnet das eigene Claude-Konto.
- Neue Tabellen landen automatisch im täglichen Backup des privaten Repos, so wie die übrigen persönlichen Daten.
- Beim CSV-Export erscheinen die Anlagen als Namen (wie die Dokumente heute, CLAUDE.md 4.6).
- **Nutzer-To-do 22 (Claude-Training ausschalten)** wird Pflicht vor der ersten Nutzung des Claude-Knopfs.

## Tests (Vorgabe für den Plan)

- Einheitstests:
  - `fuelleVorlage`: alle Platzhalter, fehlender Wert, unbekannter Platzhalter, mehrfach vorkommender Platzhalter.
  - Anrede: Frau, Herr, ohne, kein Kontakt.
  - Claude-Auftrag: kurz ergibt einen Link mit `q`, über 6 000 Zeichen ergibt den Weg über die Zwischenablage.
  - Dateiname mit Umlauten und Schrägstrich.
- Erzeugungstest in Node: `pdfmake` erzeugt ein PDF mit einem langen deutschen Text, `docx` eine Datei; beide sind nicht leer und lassen sich öffnen.
- RLS-Test mit zwei Wegwerf-Konten `…@example.com`: B sieht weder Briefkopf noch Vorlagen noch Anlagen-Haken von A.
- Klicktest (webapp-testing): Vorlage per `.docx` anlegen, in der Bewerbung PDF herunterladen, Anschreiben ist gespeichert, Endfassung ersetzt es, die alte Datei ist weg.

## Dem Bauenden überlassen

- Aufteilung der Komponenten und Dateinamen unter `web/app/unterlagen/` und `web/lib/`; Aussehen nach `web/app/stil/utilitaer.css`.
- Ob die Vorschau bei jeder Eingabe oder erst nach Auswahl der Vorlage aktualisiert wird.

## Entscheidungen von Claude (zum Gegenlesen)

1. `{{datum}}` als sechster Platzhalter.
2. Betreff als eigenes Feld der Vorlage, Standard „Bewerbung als {{stelle}}“.
3. Fehlende Werte blockieren das Herunterladen nicht, sie werden nur angezeigt.
4. Auch beim Word-Herunterladen wird das PDF gespeichert.
5. Ein altes Anschreiben wird beim Ersetzen gelöscht, wenn keine Bewerbung mehr darauf zeigt.
6. Empfänger ohne Firmenanschrift.
7. Grenze für den Claude-Link 6 000 Zeichen, sonst Zwischenablage.
8. `/dokumente` wird zu `/unterlagen` mit Umleitung.
9. Grenzen: Vorlage 20 000 Zeichen, `.docx` 5 MB, Endfassung 10 MB.
10. `{{quelle}}` übersetzt Portal-Adressen in Namen, alles andere wird „Ihre Karriereseite“ (heute steht dort oft nur der Host).
11. Vor dem Bau prüft Claude selbst (Plan, Task 0), dass `claude.ai/new?q=` den Text wirklich vorausfüllt und dass `pdfmake` lange deutsche Wörter sauber umbricht.
