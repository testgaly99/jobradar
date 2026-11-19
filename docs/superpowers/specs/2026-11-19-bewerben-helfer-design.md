# Bewerben-Helfer – Design

Stand 2026-11-19 · Fragen Q160, Q173–Q190 (`docs/fragen-und-antworten.md`) · Vorab-Prüfung Recht und Phasen: `docs/phasen-vorarbeit.md` „Bewerben-Helfer: Vorab-Prüfung“ · Bau durch Codex **nach Phase 6** (Q179), Migration **024**, setzt Runde 1 (Migration 023) voraus.

## Wozu

Bewerben mit möglichst wenigen Klicks, ohne Abtippen. Wörtlich: „Ich klicke auf Bebwerbung anlegen (unter merken). Dann wird der passende CV bereits ausgewählt und alle Zeugnisse sind per Default ausgewählt. Dann werde ich gefragt, ob ich ein Anschreiben einfügen möche. Dann kann ich auf bewerben klicken. Dafür braucht es eine sehr übersichtliche und seamless Benutzeroberfläche, damit das mit der minimalen Anzahl an Klicks geht“ (Q178). Auf der Karriereseite ist dann „alles, was möglich ist, bereits vorausgefüllt“ (Q160). Prüfen und Absenden macht immer der Nutzer: „mir ist ganz wichtig, dass ich jede Bewerbung auf der Karriereseite reviewen kann bevor sie final eingereicht wird“ (Q183).

## Ziele

| Ziel | Quelle |
|---|---|
| Knopf **„Bewerbung anlegen“** unter „Merken“ (Stellenliste und Stellenseite) und in jeder gemerkten Bewerbung | Q178 |
| Fenster **„Bewerbung vorbereiten“**: empfohlener CV vorausgewählt, alle Anlagen angehakt, Frage „Anschreiben?“, dann **„Bewerben“** | Q178, Q180 |
| Kein Abgleich-Ergebnis → Browser-Abgleich (6b) startet sofort; bei zwei Empfehlungen die erste, die zweite als Alternative | Q189 |
| **Profil-Standardwerte** in „Unterlagen“: Gehaltswunsch, Kündigungsfrist (Dauer + Endtermin); **frühester Start täglich neu berechnet** | Q188, Q190 |
| Erweiterung füllt die Karriereseite **automatisch** beim Öffnen aus jobradar | Q173, Q175 |
| Eingetragen werden Kontaktdaten, Gehalt + Termine, CV + Anschreiben, Anlagen (Anlagen nur in passende Felder nach Art) | Q174, Q180 |
| Felder erkennen: je ein **Adapter** für Greenhouse, Personio, Workday, SmartRecruiters, Lever, sonst **allgemein** über Beschriftungen | Q181 |
| Nach dem Ausfüllen: Kasten „Abgeschickt? → Als beworben markieren“ | Q176 |
| **Registrierung vorausfüllen** + **Konto-Merker** je Seite (ohne Passwort) | Q185, Q186 |

## Nicht-Ziele und Anti-Ziele

- **Nie absenden**, nie „Weiter“/„Next“ klicken, nie automatisch erkennen, ob abgeschickt wurde (Q176, Q183).
- **Keine Tarnung:** keine Zufalls-Verzögerungen, kein vorgetäuschtes Tippen; normales Autofill-Tempo (Q184, CLAUDE.md 3.5, Q69).
- Keine Häkchen für Einwilligung/Datenschutz/AGB, keine Captchas, keine Bestätigungsmails öffnen (Q185/Q186, CLAUDE.md 3.5).
- **Nie Passwörter** in jobradar oder in der Erweiterung; Passwörter schlägt Chromes Passwort-Manager vor (CLAUDE.md 3.6).
- **Auf allen Jobportalen aus** (`PORTALE` in `kern.mjs`: LinkedIn, StepStone, Indeed, XING, Glassdoor, Monster, kununu; Q187, Q137).
- Keine Massen-Registrierung, keine Bewerbung ohne Klick des Nutzers.
- Nicht für Firefox/Safari/Smartphone (Reihenfolge CLAUDE.md 4.4; später).

## Bauweise (Q181: A)

| Weg | Bewertung |
|---|---|
| **A: Adapter + allgemein** (gewählt) | Je Bewerbungssystem ein Adapter mit bekannten Feldern, sonst Beschriftungen (de/en). Wie die Scraper-Regel „ein Adapter je ATS“ (CLAUDE.md 9). Höchste Trefferquote. |
| B: nur allgemein | Weniger Code; bei Workday & Co. mehr leere oder falsch belegte Felder. |
| KI liest das Formular | ausgeschlossen: persönliche Daten an eine KI-Schnittstelle, eigene API-Aufrufe verboten. |

## Entwurf

### 1. Daten (Migration 024, Nutzer spielt ein)

- `briefkopf` (aus 023) bekommt: `gehalt_wunsch integer` (Jahresbrutto €), `kuendigung_menge integer`, `kuendigung_einheit text check in ('wochen','monate')`, `kuendigung_termin text check in ('beliebig','monatsende','quartalsende','sofort')`.
- `applications` bekommt: `helfer_geoeffnet_am timestamptz` (gesetzt beim Klick auf „Bewerben“) und `abgeschickt_quelle text check in ('knopf','erkannt','nachfrage','hand','mail')` (wer „Beworben“ gesetzt hat; Grundlage für „Rückgängig“ und die Nachfrage, Q192).
- `bewerberkonten(owner_id → auth.users on delete cascade, host text, email text, angelegt_am date, quelle text check in ('helfer','hand'), primary key (owner_id, host))`, RLS nur eigene Zeilen. Kein Passwortfeld.
- Anlagen-Art kommt schon mit Runde 1 (`documents.anlage_art`, Q182).

### 2. Frühester Start (reine Funktion)

`fruehesterStart(heute: Date, menge: number, einheit: "wochen"|"monate", termin: "beliebig"|"monatsende"|"quartalsende"|"sofort"): Date` — Fristende = heute + Dauer; bei Monats-/Quartalsende auf das nächste solche Ende ab Fristende; Start = Tag danach; `sofort` = heute. Beispiele (heute 19.11.2026, 3 Monate): beliebig → 20.02.2027, monatsende → 01.03.2027, quartalsende → 01.04.2027, sofort → 19.11.2026. Angezeigt in „Unterlagen“ („Frühester Start heute gerechnet: …“) und immer frisch beim Ausfüllen.

### 3. „Bewerbung anlegen“ und „Bewerbung vorbereiten“

- Klick legt (falls nötig) die Bewerbung mit Status „Gemerkt“ an und öffnet das Fenster. Gemerkte Bewerbungen zeigen denselben Knopf.
- Inhalt, von oben nach unten, so kurz wie möglich:
  - **CV:** vorausgewählt aus `cv_ergebnisse.empfohlen[0]`, daneben „empfohlen“ und ggf. „Alternative: …“; fehlt das Ergebnis, „Wird abgeglichen …“ (6b), danach Auswahl.
  - **Anlagen:** alle eigenen Anlagen angehakt, nach Art gruppiert.
  - **Anschreiben?** Knöpfe „Ohne“ · Vorlagen-Auswahl mit „Übernehmen“ · „Mit Claude bearbeiten“ · „Endfassung hochladen“ (Bausteine aus Runde 1 wiederverwendet).
  - **Eckdaten** (einklappbar, vorausgefüllt aus dem Profil): Gehaltswunsch, Kündigungsfrist, frühester Start.
  - **„Bewerben →“**.
- Bester Fall: „Bewerbung anlegen“ → „Ohne“ (oder Vorlage + „Übernehmen“) → „Bewerben“ = 3–4 Klicks.
- „Bewerben“ speichert die Auswahl an der Bewerbung (CV, Anschreiben, Anlagen-Haken, Eckdaten) und öffnet `applications.link` im neuen Tab. Phase 4g-1 setzt dort die gefundene Originalseite ein (der Portal-Link steht dann in `portal_link`). Ist `link` noch ein Jobportal: Hinweis „Auf Jobportalen füllt Jobradar nicht aus.“
- Ohne installierte Erweiterung: Link öffnet sich normal, Hinweis mit Link zur Anleitung.

### 4. Erweiterung

- Berechtigung „alle Websites“ (Q175) mit Inhalts-Skript; **ausgefüllt wird nur** in Tabs, die jobradar über „Bewerben“ geöffnet hat (Tab-Nummer → Bewerbung, im Sitzungsspeicher der Erweiterung), dort auch auf Folgeseiten derselben Website (mehrseitige Formulare), höchstens 2 Stunden, nie auf `PORTALE`-Hosts.
- Daten holt die Erweiterung über einen neuen Weg `GET /api/bewerben/<id>` derselben Anmeldung wie der heutige Import: Profil, Eckdaten (frühester Start frisch berechnet), Dateien als kurzlebige signierte Links mit Art (`cv`, `anschreiben`, `zeugnis`, `zertifikat`, `sonstiges`).
- **Ausfüllen:** Adapter nach Host (`*.greenhouse.io`, `*.personio.de`/`*.jobs.personio.de`, `*.myworkdayjobs.com`, `*.smartrecruiters.com`, `jobs.lever.co`), sonst allgemein. Werte so setzen, dass die Seite sie übernimmt (Eingabe-/Änderungs-Ereignisse). Unklare Felder bleiben leer. Bereits ausgefüllte Felder werden nicht überschrieben.
- **Dateien nach Feld:** Lebenslauf/CV/Resume → CV; Anschreiben/Cover letter/Motivationsschreiben → Anschreiben; Zeugnis/Arbeitszeugnis/References → Zeugnisse; Zertifikat/Certificate → Zertifikate; „Weitere Dokumente/Anlagen/Additional/Other“ → alle übrigen angehakten Anlagen, wenn das Feld mehrere Dateien annimmt, sonst leer mit Hinweis.
- **Markieren:** Jedes ausgefüllte Feld bekommt einen farbigen Rand; leere Pflichtfelder einen anderen. Kasten unten rechts: „Jobradar hat 9 Felder ausgefüllt · 2 Pflichtfelder leer · Bitte prüfen und selbst absenden“ und Knopf **„Abgeschickt → als beworben markieren“**: ruft dieselbe Funktion `aufBeworben` (`web/lib/bewerbung-schutz.ts`) wie „Ich habe mich beworben“ – Status „Beworben“ nur aus „Gemerkt“, `beworben_am` = heute nur wenn leer, Verlaufseintrag per bestehendem Datenbank-Trigger; zusätzlich, nur wenn leer: `bewerbungsweg` = „Karriereseite“, `starttermin` = berechneter Start. Danach zeigt jobradar überall „Beworben ✓“ (Stellenliste, Stellenseite, Board). Schließt den Tab nicht. Der Knopf „Ich habe mich beworben“ bleibt für Bewerbungen ohne Helfer (`abgeschickt_quelle 'hand'`).
- **Wie jobradar vom Absenden erfährt (Q192, alle vier Wege):**
  1. Knopf „Abgeschickt“ (`'knopf'`).
  2. **Danke-Seite erkennen** (`'erkannt'`): Die Erweiterung merkt sich den Klick des Nutzers auf den Absenden-Knopf des Formulars (Adapter kennt ihn; allgemein: `type=submit` bzw. Beschriftung „Absenden/Bewerbung senden/Submit/Apply“). Zeigt der Tab danach innerhalb von 60 Sekunden eine Bestätigung (Adapter-Merkmal; allgemein Adresse mit `thank`, `danke`, `confirmation`, `success` oder Text „Vielen Dank für Ihre Bewerbung“, „Ihre Bewerbung ist eingegangen“, „Thank you for applying“, „application has been submitted“), setzt jobradar „Beworben“ über `aufBeworben`. Kasten: „Als beworben gespeichert (automatisch erkannt) · Rückgängig“. Rückgängig setzt Status „Gemerkt“ und leert `beworben_am`, `abgeschickt_quelle` – nur wenn beides von der Erkennung kam.
  3. **Nachfrage** (`'nachfrage'`): Bewerbung im Status „Gemerkt“ mit `helfer_geoeffnet_am` älter als 30 Minuten → oben in der Bewerbung und im Fenster „Bewerbung vorbereiten“: „Hast du bei <Firma> abgeschickt?“ – „Ja“ (`aufBeworben`) / „Nein“ (leert `helfer_geoeffnet_am`).
  4. **Eingangsbestätigung per Mail** (`'mail'`, nur Admin, kommt mit Phase 3): siehe Phase-3-Plan Task 6.
- **Registrierung und Konto (Q186):**
  - Zeigt die Seite eine Anmeldemaske und es gibt einen Konto-Merker für den Host: Hinweis „Konto vorhanden (E-Mail …, seit …) – Chrome füllt dein Passwort“.
  - Anmeldemaske ohne Merker: Kasten „Hast du hier ein Konto?“ – „Ja, merken“ / „Nein, registrieren“ (klickt den Registrieren-Link der Seite nicht selbst, zeigt nur, wo er ist).
  - Registrierungsformular: füllt Name, E-Mail, Telefon; Passwortfelder bleiben leer (Chrome schlägt vor); Einwilligungs-Häkchen bleiben leer und werden markiert; nach dem Absenden durch den Nutzer fragt der Kasten „Konto angelegt?“ – „Ja“ legt den Merker an (`quelle 'helfer'`).
  - Merker sind in „Unterlagen“ als Liste sichtbar und löschbar; „Konto hinzufügen“ von Hand (`quelle 'hand'`).

### 5. Datenschutz

- Datenschutzseite: Die Erweiterung hat Zugriff auf alle Websites, füllt aber nur in Tabs, die jobradar geöffnet hat; sie liest dort nur Formularfelder und sendet nichts von der Seite an jobradar außer „Abgeschickt“ und „Konto angelegt“ (Host + E-Mail).
- Dateien verlassen den Speicher nur über kurzlebige signierte Links (CLAUDE.md 4.5).
- Neue Tabelle im Backup automatisch (`--schema=public`), Konto löschen per `cascade`.

## Tests (Vorgabe für den Plan)

- `fruehesterStart` mit den vier Beispielen, dazu Wochen, Jahreswechsel, 31. eines Monats + 1 Monat.
- Adapter: je System ein nachgebautes, gekürztes Formular (keine Kopie fremder Seiten); prüft Felder, Dateien nach Art, Pflichtfeld-Markierung, **dass kein Absenden-/Weiter-Knopf geklickt wird** und Einwilligungs-Häkchen leer bleiben.
- Allgemein: deutsche und englische Beschriftungen, `autocomplete`-Attribute, unbekanntes Feld bleibt leer.
- Sperre: Tab nicht von jobradar geöffnet → nichts passiert; `PORTALE`-Host → nichts passiert.
- `/api/bewerben/<id>`: fremde Bewerbung → 404; signierte Links laufen ab.
- Klicktest mit Wegwerf-Konto und einer lokalen Test-Karriereseite.

## Dem Bauenden überlassen

- Aufteilung der Erweiterungsdateien, Aussehen von Rand und Kasten (dezent, nicht die Seite verdecken).
- Exakte Beschriftungslisten je Sprache, solange die Zuordnung oben gilt.

## Entscheidungen von Claude (zum Gegenlesen)

1. Profil-Standardwerte hängen am Briefkopf (eine Stelle in „Unterlagen“).
2. Status bleibt „Gemerkt“, bis „Abgeschickt“ geklickt wird; dann über `aufBeworben`, dazu (nur wenn leer) Bewerbungsweg „Karriereseite“ und `starttermin` = berechneter Start.
3. Helfer überschreibt keine Felder, die schon etwas enthalten.
4. Ausfüllen nur im von jobradar geöffneten Tab, höchstens 2 Stunden, auch auf Folgeseiten derselben Website.
5. „Nein, registrieren“ klickt nichts, zeigt nur den Weg.
6. „Bewerben“ öffnet immer `applications.link` (nach 4g-1 die Originalseite).
7. Test-Formulare werden nachgebaut, keine Kopien fremder Seiten im öffentlichen Repo.
8. Danke-Seite: Erkennung nur nach Absenden-Klick des Nutzers und innerhalb von 60 Sekunden; Nachfrage nach 30 Minuten (Q192).
9. Vor dem Bau prüft Claude (Plan, Task 0) je System die verlinkten Bedingungen echter Karriereseiten, vor allem Workday-Seiten, ob sie auf die Workday-Bedingungen verweisen; Ergebnis entscheidet je Adapter.
