# Runde 1 Bewerbungsunterlagen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reiter „Unterlagen“ (Briefkopf, Anschreiben-Vorlagen, CVs, Anlagen) und in jeder Bewerbung ein Anschreiben aus Vorlage als PDF/Word, „Mit Claude bearbeiten“, „Endfassung hochladen“ und Anlagen-Haken.

**Architecture:** Neue Tabellen per Migration 023 mit RLS je Nutzer. Platzhalter, Anrede, Quelle, Dateiname und Claude-Auftrag sind reine Funktionen in `web/lib/anschreiben.ts`. PDF/Word/Docx-Text entstehen im Browser in `web/lib/brief-datei.ts` (Pakete per `import()` erst beim Klick); Speichern läuft über die bestehenden Upload- und Server-Action-Muster von `web/app/dokumente/`.

**Tech Stack:** Next.js 16, Supabase (Postgres, Storage-Bucket `dokumente`), `node --test`, neu `docx`, `pdfmake`, `mammoth`.

**Spec:** `docs/superpowers/specs/2026-11-19-runde1-bewerbungsunterlagen-design.md`

## Global Constraints

- Ausführung durch Codex nach `AGENTS.md`: kein `.env`, keine Live-Datenbank, kein Push, Migration **nicht** einspielen; jede Sitzung in `docs/agenten-protokoll.md`; Commits deutsch, letzte Zeile `Agent: Codex`; nie `git add -A`/`-a`/`-f`.
- Anschreiben, Briefkopf, Anlagen gehen an keinen Dienst außer dem Bucket `dokumente` des Nutzers; kein Erzeugen auf dem Server (Q166).
- Neue Pakete genau drei, Version fest (ohne `^`): `docx`, `pdfmake`, `mammoth`; nur per `await import(...)` in Klick-Handlern geladen, nie im Seiten-Import.
- Platzhalter: `{{firma}}`, `{{stelle}}`, `{{ansprechpartner}}`, `{{anrede}}`, `{{quelle}}`, `{{datum}}`; Groß/Klein egal, Leerzeichen innen erlaubt (`{{ Firma }}`).
- Anrede: „Sehr geehrte Frau <Nachname>“ / „Sehr geehrter Herr <Nachname>“ / „Sehr geehrte Damen und Herren“, ohne Komma.
- Claude-Auftrag-Text wörtlich: „Passe dieses Anschreiben an die folgende Stelle an. Bleib bei meinem Stil, erfinde nichts über mich. Erstelle das Ergebnis als Word-Datei und als PDF im deutschen Briefformat (DIN 5008).“; Link `https://claude.ai/new?q=`; über 6 000 Zeichen URL-Länge → Zwischenablage + `https://claude.ai/new` + Hinweis „Auftrag kopiert – in Claude mit Strg+V einfügen“; Hinweis unter dem Knopf „Öffnet dein eigenes Claude-Konto; dein Text geht an Claude. claude.ai zeigt dabei einen Warnhinweis, weil der Text über einen Link kommt – prüfe ihn kurz und sende ihn dann ab.“
- Grenzen: Vorlagentext ≤ 20 000 Zeichen, `.docx`-Import ≤ 5 MB (nur `.docx`; bei `.doc`: „Bitte in Word als .docx speichern“), Endfassung PDF/Word ≤ 10 MB.
- Layout: A4, Rand links 25 mm, rechts 20 mm, 11 pt; Absenderzeile, Empfänger „Firma“ + „z. Hd. <Ansprechpartner>“, rechtsbündig „<Ort>, <Datum>“, Betreff fett, Absätze; Dateiname `Anschreiben_<Firma>_<JJJJ-MM-TT>.pdf|.docx`.
- Aussehen nur über `web/app/stil/utilitaer.css`; Kanban-Animationen nicht anfassen.
- Öffentliches Repo: keine persönlichen Daten in Tests (nur erfundene Namen, `…@example.com`).

## Review Focus

1. Vorlage mit `{{ Firma }}` oder `{{FIRMA}}` → wird ersetzt wie `{{firma}}` (Test in Task 2).
2. Firma „A/B & Co. Müller“ im Dateinamen → keine Schrägstriche, Umlaute bleiben lesbar oder werden ae/oe/ue (Test in Task 2).
3. Langes Wort ohne Leerzeichen (URL im Text) im PDF → kein Absturz, PDF nicht leer (Test in Task 3).
4. Zweimal kurz nacheinander „PDF herunterladen“ → genau ein Anschreiben bleibt verknüpft, das vorige ist gelöscht (Test in Task 5).
5. Angehakte Anlage soll in „Unterlagen“ gelöscht werden → Meldung „Dokument wird noch in einer Bewerbung verwendet.“ statt Fehler (Test in Task 6).

---

### Task 0 (Claude, vor Codex): Vorab-Prüfungen

- [x] **Step 1:** Im eigenen Browser `https://claude.ai/new?q=Hallo%20Test` öffnen. Expected: Eingabefeld enthält „Hallo Test“. **Erledigt 2026-11-19 (Nutzer, Bildschirmfoto): Text steht im Feld; claude.ai zeigt darüber den Warnhinweis „Sei vorsichtig, bevor du diesen Prompt ausführst…“** → Link-Weg gilt; Hinweis unter dem Knopf erweitert (Global Constraints).
- [x] **Step 2:** Aktuelle Versionen und Lizenzen von `docx`, `pdfmake`, `mammoth` auf npm prüfen (gepflegt, MIT/BSD), Versionen hier eintragen: `docx@9.15.2` (MIT), `pdfmake@0.3.13` (MIT), `mammoth@1.13.0` (BSD-2-Clause). **Erledigt 2026-11-19 (Claude):** jeweils neueste Version, die mindestens 2 Wochen alt ist (docx 9.16.0 erschien am 19.11., pdfmake 0.3.14 am 08.11. – zu frisch); alle drei gepflegt.
- [x] **Step 3:** Ergebnis vermerkt (dieser Plan, `docs/fragen-und-antworten.md` Q226). Task 0 erledigt.

### Task 1: Migration 023

**Files:**
- Create: `supabase/migrations/023_unterlagen.sql`
- Test: `web/tests/unterlagen-migration.test.ts`

**Interfaces:**
- Produces: Tabellen `briefkopf(owner_id uuid pk default auth.uid() → auth.users on delete cascade, name, strasse, plz_ort, telefon, email, linkedin text, geaendert_am timestamptz default now())`, `anschreiben_vorlagen(id uuid pk, owner_id default auth.uid() → auth.users on delete cascade, name text not null, betreff text not null default 'Bewerbung als {{stelle}}', text text not null check (char_length(text) <= 20000), geaendert_am timestamptz default now())`, `bewerbung_anlagen(owner_id default auth.uid() → auth.users on delete cascade, application_id → applications on delete cascade, document_id → documents on delete restrict, primary key (application_id, document_id))`, Spalte `contacts.anrede text check (anrede in ('frau','herr','ohne'))`, Spalte `documents.anlage_art text check (anlage_art in ('zeugnis','zertifikat','sonstiges'))` (nur bei `art='anlage'` gesetzt, Q182: der spätere Bewerben-Helfer lädt Anlagen nach Art in die passenden Felder).

- [ ] **Step 1: Failing test** `web/tests/unterlagen-migration.test.ts` liest die SQL-Datei und prüft per Regex: `enable row level security` für alle drei Tabellen; je eine Policy `for all to authenticated` mit `owner_id = auth.uid()`; bei `bewerbung_anlagen` zusätzlich `with check` mit `exists (select 1 from public.applications a where a.id = application_id and a.owner_id = auth.uid())` und dasselbe für `public.documents d`; `revoke all ... from anon` für alle drei; `on delete restrict` bei `document_id`; Datei enthält kein `drop table`.
- [ ] **Step 2:** `cd web && node --test tests/unterlagen-migration.test.ts` → FAIL (Datei fehlt).
- [ ] **Step 3:** Migration schreiben, wiederholbar wie `004_dokumente.sql` (`if not exists`, `drop policy if exists`), Kopfkommentar „Im Supabase SQL Editor ausführen“.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `Migration 023: Briefkopf, Anschreiben-Vorlagen, Anlagen je Bewerbung, Anrede`.

### Task 2: Reine Anschreiben-Funktionen

**Files:**
- Create: `web/lib/anschreiben.ts`
- Test: `web/tests/anschreiben.test.ts`

**Interfaces:**
- Produces:
  - `type Werte = { firma: string; stelle: string; ansprechpartner: string; anrede: string; quelle: string; datum: string }`
  - `fuelleVorlage(text: string, werte: Partial<Werte>): { text: string; ohneWert: string[]; unbekannt: string[] }` — fehlender/leerer Wert → leer ersetzt, Name in `ohneWert` (je einmal); unbekannter Platzhalter bleibt stehen, Name in `unbekannt`.
  - `anredeText(anrede: string | null, name: string | null): string`
  - `quelleText(quelle: string | null): string` — leer → `""`.
  - `datumText(d: Date): string` → „19. November 2026“.
  - `platzhalterWerte(app: { firma: string | null; titel: string | null; quelle: string | null }, kontakt: { name: string | null; anrede: string | null } | null, heute: Date): Werte`
  - `dateiname(firma: string | null, heute: Date, endung: "pdf" | "docx"): string`
  - `claudeAuftrag(o: { briefkopf: string; anschreiben: string; anzeige: string }): { art: "link"; url: string } | { art: "zwischenablage"; text: string; url: "https://claude.ai/new" }`

- [ ] **Step 1: Failing tests:**
```ts
fuelleVorlage("Bei {{firma}} als {{ Stelle }}", { firma: "Beispiel AG", stelle: "Analyst" }).text === "Bei Beispiel AG als Analyst"
fuelleVorlage("{{FIRMA}} {{firma}}", { firma: "X" }).text === "X X"
deepEqual(fuelleVorlage("Hallo {{ansprechpartner}}", {}).ohneWert, ["ansprechpartner"])
deepEqual(fuelleVorlage("{{gehalt}}", {}), { text: "{{gehalt}}", ohneWert: [], unbekannt: ["gehalt"] })
anredeText("frau", "Anna Maria Müller") === "Sehr geehrte Frau Müller"
anredeText("herr", "Schmidt") === "Sehr geehrter Herr Schmidt"
anredeText("ohne", "Anna Müller") === "Sehr geehrte Damen und Herren"
anredeText("frau", "") === "Sehr geehrte Damen und Herren"
anredeText(null, null) === "Sehr geehrte Damen und Herren"
quelleText("https://www.linkedin.com/jobs/view/1/") === "LinkedIn"
quelleText("de.indeed.com") === "Indeed"
quelleText("stepstone.de") === "StepStone"; quelleText("xing.com") === "XING"; quelleText("glassdoor.de") === "Glassdoor"
quelleText("boards.greenhouse.io") === "Ihre Karriereseite"
quelleText(null) === ""
datumText(new Date(2026, 10, 19)) === "19. November 2026"
dateiname("A/B & Co. Müller", new Date(2026, 10, 19), "pdf") === "Anschreiben_A-B_Co_Mueller_2026-11-19.pdf"
dateiname(null, new Date(2026, 10, 19), "docx") === "Anschreiben_2026-11-19.docx"
claudeAuftrag({ briefkopf: "B", anschreiben: "A", anzeige: "Z" }).art === "link"  // url beginnt mit "https://claude.ai/new?q=" und enthält den Auftragstext encodiert
claudeAuftrag({ briefkopf: "B", anschreiben: "x".repeat(7000), anzeige: "" }).art === "zwischenablage"  // text beginnt mit dem Auftragstext
```
- [ ] **Step 2:** `node --test tests/anschreiben.test.ts` → FAIL.
- [ ] **Step 3:** Implementieren; Auftrag = fester Satz + `\n\nBriefkopf:\n` + briefkopf + `\n\nMein Anschreiben:\n` + anschreiben + `\n\nDie Stelle:\n` + anzeige; Grenze: Länge der fertigen URL > 6000.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `Anschreiben: Platzhalter, Anrede, Quelle, Dateiname, Claude-Auftrag`.

### Task 3: Dateien im Browser erzeugen

**Files:**
- Modify: `web/package.json` (drei Pakete, Versionen aus Task 0)
- Create: `web/lib/brief-datei.ts`
- Test: `web/tests/brief-datei.test.ts`

**Interfaces:**
- Consumes: Werte aus Task 2.
- Produces:
  - `type Brief = { absender: string; empfaenger: string[]; ortDatum: string; betreff: string; text: string }`
  - `briefPdf(b: Brief): Promise<Uint8Array>` (pdfmake, Standardschrift, Layout aus Global Constraints)
  - `briefDocx(b: Brief): Promise<Uint8Array>` (docx, gleiche Maße)
  - `textAusDocx(daten: ArrayBuffer): Promise<string>` (mammoth `extractRawText`)
  - `briefAus(kopf: { name; strasse; plz_ort; telefon; email; linkedin }, ausgefuellt: { betreff: string; text: string }, werte: Werte): Brief` — Ort = `plz_ort` ohne führende PLZ; `empfaenger` = [firma] plus „z. Hd. <ansprechpartner>“ wenn vorhanden.
- [ ] **Step 1: Failing tests:** `briefPdf` mit 3 Absätzen und dem Wort `"https://example.invalid/" + "a".repeat(300)` → Ergebnis beginnt mit `%PDF`, Länge > 1000; `briefDocx` → beginnt mit `PK`, und `textAusDocx` darauf enthält den Betreff; `briefAus({…, plz_ort: "80331 München"}, …).ortDatum === "München, 19. November 2026"`; ohne Ansprechpartner `empfaenger.length === 1`.
- [ ] **Step 2:** → FAIL. **Step 3:** Pakete installieren (`npm install --save-exact`), implementieren; alle drei Pakete nur per `await import()` innerhalb der Funktionen. **Step 4:** → PASS; `npm run build` ohne Fehler.
- [ ] **Step 5:** Commit `Anschreiben: PDF und Word im Browser erzeugen`.

### Task 4: Reiter „Unterlagen“ mit Briefkopf und Vorlagen

**Files:**
- Move: `web/app/dokumente/*` → `web/app/unterlagen/*`; Create `web/app/dokumente/page.tsx` mit `redirect("/unterlagen")`
- Modify: `web/app/kopf.tsx` (Link „Unterlagen“ zwischen „Bewerbungen“ und „Konto“), alle `revalidatePath("/dokumente")` → `/unterlagen`
- Create: `web/lib/unterlagen.ts`, `web/app/unterlagen/briefkopf.tsx`, `web/app/unterlagen/vorlagen.tsx`
- Test: `web/tests/unterlagen.test.ts`

**Interfaces:**
- Produces: `pruefeBriefkopf(f: FormData): { daten: BriefkopfDaten } | { fehler: string }` (E-Mail-Format, alles getrimmt, Name Pflicht); `pruefeVorlage(name: string, betreff: string, text: string): { daten } | { fehler: string }` (Name und Text Pflicht, Text ≤ 20 000 → sonst „Vorlage ist zu lang (höchstens 20 000 Zeichen).“); Server Actions `briefkopfSpeichern(f: FormData)`, `vorlageSpeichern(id: string | null, f: FormData)`, `vorlageLoeschen(id: string)` in `web/app/unterlagen/actions.ts`, je `{ fehler?: string }`.
- [ ] **Step 1: Failing tests** für `pruefeBriefkopf` (fehlender Name → fehler; `email: "x"` → fehler; gültig → getrimmte Daten) und `pruefeVorlage` (20 001 Zeichen → genau die Meldung oben; leerer Text → fehler).
- [ ] **Step 2:** → FAIL. **Step 3:** Implementieren. Seite in Reihenfolge Briefkopf, Anschreiben-Vorlagen, CV-Versionen, Anlagen. „Aus Word-Datei übernehmen“: `accept=".docx"`, > 5 MB oder Endung ≠ `.docx` → Meldung aus Global Constraints, sonst `textAusDocx` füllt das Textfeld (nichts wird hochgeladen). Klickbare Platzhalter-Liste fügt an der Cursorposition ein. **Step 4:** → PASS, `npm test` komplett grün.
- [ ] **Step 5:** Commit `Reiter Unterlagen: Briefkopf und Anschreiben-Vorlagen`.

### Task 5: Anschreiben in der Bewerbung

**Files:**
- Create: `web/app/bewerbung/[id]/anschreiben.tsx` (Client), `web/app/bewerbung/[id]/anschreiben-actions.ts`
- Modify: `web/app/bewerbung/[id]/inhalt.tsx` (Block im Abschnitt „Ablauf und Bewerbung“ statt der bisherigen Anschreiben-Auswahl)
- Test: `web/tests/anschreiben-setzen.test.ts`

**Interfaces:**
- Consumes: Task 2, Task 3, Tabellen aus Task 1.
- Produces: `anschreibenSetzen(sb: SupabaseClient, applicationId: string, neuesDokumentId: string): Promise<{ fehler?: string }>` in `web/lib/anschreiben-setzen.ts` — setzt `applications.anschreiben_dokument_id`, danach: altes Dokument löschen (Zeile, dann Speicherobjekt), wenn keine Bewerbung mehr darauf zeigt; Server Action `anschreibenSpeichern(applicationId, pfad, name)` legt `documents` (`art='anschreiben'`) an und ruft `anschreibenSetzen`.
- [ ] **Step 1: Failing tests** mit dem Fetch-Attrappen-Muster aus `tests/stellen-import.test.ts`: (a) alt verknüpft und sonst unbenutzt → nach Aufruf zeigt Bewerbung auf neu, `documents` delete für alt und Storage remove für dessen Pfad aufgerufen; (b) alt von zweiter Bewerbung genutzt → kein delete; (c) Update schlägt fehl → `{ fehler }`, kein delete; (d) zweimal nacheinander (Review Focus 4) → am Ende nur das letzte verknüpft, beide vorigen gelöscht.
- [ ] **Step 2:** → FAIL. **Step 3:** Implementieren. UI: Vorlagen-Auswahl, Vorschau (`fuelleVorlage` auf Betreff und Text), Hinweise „Ohne Wert: …“ und „Unbekannt: …“, Knöpfe „PDF herunterladen“ (erzeugt PDF, lädt es herunter, lädt es nach `<uid>/<uuid>.pdf` hoch, ruft `anschreibenSpeichern`), „Word herunterladen“ (Word herunter, PDF wie oben speichern), „Mit Claude bearbeiten“ (`claudeAuftrag`; Anzeige = Aufgaben/Anforderungen aus dem Snapshot der Bewerbung, sonst `link`; `window.open(url, "_blank", "noopener")` bzw. `navigator.clipboard.writeText` + Hinweis), „Endfassung hochladen“ (`.pdf`/`.docx` ≤ 10 MB, sonst Meldung „Bitte PDF oder Word bis 10 MB.“; Upload wie bestehender Upload, dann `anschreibenSpeichern`). Ohne Briefkopf: Hinweis mit Link „Briefkopf in Unterlagen eintragen“, Knöpfe außer Endfassung deaktiviert. **Step 4:** → PASS, Build grün.
- [ ] **Step 5:** Commit `Bewerbung: Anschreiben aus Vorlage, Claude-Knopf, Endfassung`.

### Task 6: Anlagen-Haken, Anrede am Kontakt, Export

**Files:**
- Modify: `web/app/bewerbung/[id]/inhalt.tsx` (Häkchen-Liste Anlagen; Auswahl Anrede beim Kontakt mit Optionen „Frau“, „Herr“, „ohne“), `web/lib/bewerbung.ts` (Kontaktfeld `anrede`, erlaubte Werte), `web/lib/export.ts` (Spalte „Anlagen“ mit Namen, `; `-getrennt), `web/app/unterlagen/actions.ts` (Löschen einer angehakten Anlage)
- Test: `web/tests/bewerbung.test.ts`, `web/tests/export.test.ts`, `web/tests/dokumente.test.ts`
- Zusätzlich: Beim Hochladen einer Anlage in „Unterlagen“ Pflichtauswahl „Art“ mit „Zeugnis“, „Zertifikat“, „Sonstiges“; in der Liste der Anlagen sichtbar und änderbar (Q182). `pruefeDokument` lehnt `anlage_art` bei anderen Arten als `anlage` ab.
- [ ] **Step 1: Failing tests:** `pruefeDokument(uid, "anlage", …, anlage_art: "zeugnis")` angenommen, `anlage_art: "foto"` abgewiesen, `art: "cv"` mit `anlage_art` abgewiesen; Kontakt mit `anrede: "divers"` wird abgewiesen, `"frau"` angenommen; Export enthält Spalte „Anlagen“ mit „Zeugnis A; Zertifikat B“; Löschen einer Anlage, deren Delete den Fehler `23503` liefert → `{ fehler: "Dokument wird noch in einer Bewerbung verwendet." }` (Review Focus 5).
- [ ] **Step 2:** → FAIL. **Step 3:** Implementieren; Haken setzen/entfernen per Server Action `anlageUmschalten(applicationId, documentId, an: boolean)`. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `Bewerbung: Anlagen anhaken, Anrede am Kontakt, Anlagen im Export`.

### Task 7: Datenschutz, Doku, Halt

**Files:**
- Modify: `web/app/datenschutz/page.tsx` (Satz: „Briefkopf und Anschreiben-Vorlagen liegen wie deine Bewerbungen in Supabase (Frankfurt). Der Knopf „Mit Claude bearbeiten“ öffnet dein eigenes Claude-Konto; der Text geht dann an Claude.“), `docs/STATUS.md`, `docs/agenten-protokoll.md`, `docs/codex-warteschlange.md` (Status 🛑)
- [ ] **Step 1:** `cd web && npm test` → alle grün; `npm run build` → ohne Fehler; `npm run pruefe:build` → ok.
- [ ] **Step 2:** Commit `Runde 1: Datenschutz und Doku`.
- [ ] **Step 3: 🛑 Halt.** Nutzer spielt `supabase/migrations/023_unterlagen.sql` ein. Claude prüft danach live mit zwei Wegwerf-Konten `…@example.com` (B sieht nichts von A: Briefkopf, Vorlagen, Anlagen-Haken) und klickt mit webapp-testing durch: Vorlage per `.docx` anlegen → PDF herunterladen → Anschreiben gespeichert → Endfassung ersetzt es → alte Datei weg; danach Wegwerf-Konten löschen.
