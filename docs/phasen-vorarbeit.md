# Spätere Phasen: Vorarbeit und offene Punkte

Stand: 2026-11-17. Sammelt Vorarbeit und offene To-dos für Phase 3, 4 und 5 (Phase 6 / CV-Abgleich: [eigener Plan](plans/2026-11-16-cv-abgleich.md)). Zusammengeführt aus `docs/vorarbeit-spaetere-phasen.md` (Recherche 2026-11-15 auf `601ec4a`, Anschlussstellen 2026-11-16 auf `ae9c463`), `docs/beispiele/spaetere-phasen.json` und dem STATUS-Abschnitt „Offene To-dos für spätere Phasen“.

**Keine Implementierungsfreigabe.** Bestandsaufnahme und Recherche, kein Bauplan. Vor einer Übernahme passende Fragen mit dem Nutzer klären und die Planung ausdrücklich freigeben lassen. Alle Aussagen zum Datenbestand beziehen sich auf Quellcode/Migrationsdateien, nicht auf die Live-Datenbank; keine echten Bewerbungen, Dokumente, E-Mails, Termine oder Zugangsdaten gelesen. Anbieterinformationen bei geänderter Lage erneut prüfen.

## Phase 3: Google-Anbindung, Statusvorschläge, Erinnerungen

**Offenes To-do:** Erinnerungs-Mail an den Admin (`ADMIN_EMAIL`) einrichten, sobald jährlich von Hand gepflegte Listen fällig sind. Bis dahin erinnert die Checkliste.

### Vorhandene Anschlussstellen

| Aufgabe | Stelle | Bedeutung |
|---|---|---|
| Google-Anmeldung | `web/app/login/page.tsx`, `google` | `signInWithOAuth` mit Weiterleitung; keine Gmail-/Kalender-Scopes oder Offline-Parameter. |
| Rückkehr von Google | `web/app/auth/callback/route.ts`, `GET` | Tauscht Code gegen Supabase-Sitzung; keine verschlüsselte Provider-Token-Ablage oder Erneuerung. Weiterleitungsziele beschränkt. |
| Anwendungsdaten | Migration 001: `applications`, `contacts`, `interviews`, `application_events` | Firma, Referenz, Kontakte, Status, nächster Schritt, Interviewzeit (`timestamptz`); Fälligkeit des nächsten Schritts nur `date`. |
| Statusmodell | `web/lib/bewerbung.ts`, `STATUS` | gemerkt/beworben/im_gespraech/angebot/abgeschlossen; `eingang_bestaetigt` aus Migration 001 nicht übernehmen (Migration 008). |
| Zeit | `berlinZuIso`, `zeitDe`, `tagDe`; `web/instrumentation.ts` | Paket 7: Frühlingslücke abgewiesen, Herbstwahl erhalten. Google-Event-Importregeln damit nicht festgelegt. |
| Export/Löschen | `web/app/export/route.ts`, `web/lib/nutzer-loeschen-kern.ts` | Neue Verbindungs-/Mail-/Vorschlagsdaten müssen in Export und Löschung. |
| Namensvergleich | `web/lib/link-import.ts`, `firmaPasst` | Präfixvergleich ist kein Identitätsnachweis für Mail-Absender. |

Das Firmenschema hat keine bestätigte Mail-Domain-Zuordnung; eine ATS-Domain ist keine erlaubte Absenderdomain. Migrationen 001–010 enthalten keine Tabellen für Google-Verbindungen, verschlüsselte Tokens, Sync-Stände, Erinnerungszustellungen oder Event-/Nachrichten-IDs.

### Offizielle Grundlagen (geprüft 2026-11-15)

- **Anmeldung ≠ API-Zugriff:** Google liefert den Provider-Refresh-Token nicht standardmäßig; Supabase dokumentiert zusätzliche OAuth-Parameter. [Supabase: Saving Google tokens](https://supabase.com/docs/guides/auth/social-sign-in/auth-google#saving-google-tokens).
- **Hintergrundzugriff:** `access_type=offline` nötig (Googles Begriff, nichts mit unserer Offline-Testprüfung). [Google: Refresh an access token](https://developers.google.com/identity/protocols/oauth2/web-server#offline).
- **Testmodus:** Refresh-Tokens externer Apps im Status Testing laufen nach sieben Tagen ab; Ausnahme nur für Name/E-Mail/Profil-Scopes. Reinen Login und Mail-Synchronisation nicht gleichsetzen. [Google: Refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).
- **Gmail-Scopes:** `gmail.readonly` und `gmail.metadata` sind Restricted; Metadata enthält keine Texte. [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes).
- **Absender-Suche:** `users.messages.list` erlaubt `q` nicht mit `gmail.metadata`; Listen liefern nur IDs. „Nur Metadaten plus Absendersuche“ ist daher nicht ohne Weiteres möglich. [messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).
- **Verifizierung:** Ausnahme für persönliche Nutzung unter 100 Nutzern; Richtlinien gelten trotzdem, Restricted-Scopes mit Serververarbeitung haben Zusatzanforderungen. [Ausnahmen](https://support.google.com/cloud/answer/13464323?hl=en), [Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).
- **Kalender:** `calendar.events.readonly` liest; `calendar.events.owned` darf alle Termine in eigenen Kalendern ändern (nicht nur von Jobradar angelegte); `calendar.app.created` betrifft von der App erstellte Zweitkalender. Die Regel „nur eigene Termine ändern“ braucht passende Architektur; noch keinen Scope wählen. [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth).

Bereits beschlossen (CLAUDE.md 4.7): Mail nur von Domains laufender Bewerbungen; Status nur vorschlagen; Terminzuordnung über Teilnehmerdomain, Firma im Titel oder Anlage aus Bewerbung; Briefing 24 h und 1 h vorher.

**Vor dem Bau fragen:** Was zuerst – Kalender, Statusvorschläge oder Erinnerungen? Welche Mailinhalte anzeigen/speichern? Welche Kalender, eigene Termine erstellen? Mehrdeutige Zuordnung? Aufbewahrung der Sync-Daten? Automatik läuft im Hintergrund; einmalige Verbindungsfreigabe ist keine tägliche Bedienarbeit, Token-Erneuerung muss geplant werden.

## Phase 4: offene To-dos

- **Rechtslage der Rankings (2026-11-17, entschieden Q41):** Rechte-Audit in `docs/ranking-recherche-v3.md`: öffentlich sauber EU-R&D-Scoreboard (CC BY), Wikidata (CC0), eingeschränkt EPA. Folgen für den Ranking-Unterbau (Migration 010, [Plan](plans/2026-11-15-ranking-grundlage.md)): Sichtbarkeit je Rang-Eintrag ergänzen, Admin-Formular „Liste von Hand einfügen“, Linksammlung.
- **Ein-Klick-Import:** Chrome lokal gebaut; Plattformabnahme und Edge → Safari → Smartphone → Firefox offen. Details und Q6/Q7/Q14/Q16 im [Importplan](plans/2026-11-16-ein-klick-import.md).
- **Firmenportal-Erkennung:** [Plan](plans/2026-11-15-firmenportal-erkennung.md), Q13 am 2026-11-17 freigegeben („Ja, bauen“).
- **Whitelist entschieden 2026-11-17 (Q45–Q47):** alle Stellen der Firma, Admin-Häkchen sofort wirksam, Prestige ergänzt (Häkchen haben Vorrang). Remote weltweit zählt mit (Q44). Ursprünglicher Stand: **Whitelist „Stellen ohne Studium trotzdem zeigen“ (Wunsch 2026-11-14):** Admin pflegt Firmen, bei denen „Studium: nein“ nicht ausblendet. Zu klären: (1) nur Tätigkeit „anspruchsvoll“ oder alle? (Vorschlag: nur anspruchsvoll, wie die Prestige-Regel in CLAUDE.md 2); (2) Pflege per Häkchen auf der Konto-Seite, sofort wirksam?; (3) Prestige-Listen ergänzen die Liste, überschreiben sie nie? Technisch: Feld an `companies` (Migration), `nein_ausblenden` berücksichtigt es; `taetigkeit` wird schon gespeichert.
- **Mistral prüfen (Wunsch 2026-11-13), als Alternative oder Ergänzung zu Groq – nur für öffentliche Anzeigentexte, nie für CVs (Q15, 2026-11-17):**
  1. *Bedingungen an der Quelle prüfen* (offizielle Doku, kein Vorwissen): Gratis-Tarif „Experiment“ noch vorhanden? Echte Grenzen (Anfragen/Sekunde, Tokens/Minute und /Monat) aus dem eigenen Konto. Training, Speicherdauer, Serverstandort, erlaubte Nutzung (automatisiert, privat, nicht-kommerziell), Pausierung, Ablauf von Schlüsseln (CLAUDE.md 3.3). Material: Anbieterfakten vom 2026-11-16 im [CV-Plan](plans/2026-11-16-cv-abgleich.md#verifizierte-anbieterfakten-prüftag-2026-11-16-nur-offizielle-quellen) (API verlangt laut aktueller Doku Billing/PAYG).
  2. *Konto:* legt der Nutzer selbst an (Handynummer nötig, Zustimmung nach CLAUDE.md 10); `MISTRAL_API_KEY` nur in `.env` und als GitHub-Secret.
  3. *Modelle:* Kandidaten (z. B. Mistral Medium/Large/Small), jedes mit eigener Anleitung `ki_prompt_<modell>.md` (Regel 2026-11-13).
  4. *Qualität:* dieselbe Probe wie bei Groq, Stichprobe A und B mit je 20 Anzeigen; bestanden = höchstens 1 echter Fehler je Stichprobe; der Nutzer liest die unveränderten Antworten.
  5. *Durchsatz:* real messen gegen den Bedarf (Erstbestand ~10.000, neue Anzeigen pro Tag).
  6. *Zuverlässigkeit:* eine Woche Probebetrieb neben Groq (Fehlerquote, Ausfälle, Antwortzeit).
  7. *Datenregel:* nur öffentliche Anzeigentexte, **nie** Teil C (vom Nutzer eingefügter Text), solange Eingaben im Gratis-Tarif zum Training dienen dürfen.
  8. *Entscheidung mit dem Nutzer* per Vergleichstabelle Groq vs. Mistral: ersetzen, ergänzen oder nein. Erst dann CLAUDE.md 3.2 und 5 anpassen.
- **Weitere Groq-Modelle prüfen (Auftrag 2026-11-13, sobald Kapazität frei):** dieselbe Probe A/B mit z. B. `qwen/qwen3.8-27b`; nur bestandene Modelle als zusätzliches Kontingent (jedes Modell hat eigenes Tageslimit). Backup-Anleitung `scraper/ki_prompt_qwen.md` ist nicht freigegeben.
- **KI-Durchsatz (Frage 2026-11-13):** Bei ~10.000 Stellen reicht Groq gratis (≈ 100 Anzeigen/Tag mit `gpt-oss-120b`) nicht für den Erstbestand. Zu Beginn von Phase 4 klären: nur relevante Abschnitte, Vorrang nach Filterprofil, Auswertung beim Öffnen, weitere Groq-Modelle, Batch-API im Gratis-Tarif.
- **Zusatzfirmen:** Die Tabelle `laeufe` (Laufberichte mit Firmennamen) ist für alle lesbar; private Zusatzfirmen dürfen dort nicht sichtbar werden. Eigener Rechteplan auch für Facetten.
- **TK** (Techniker Krankenkasse): nur per JSF-Nachladen erreichbar; Playwright-Entscheidung in Phase 4.
- **„Ähnliche Stellen“** (Wettbewerbsanalyse 2026-11-12, erstmal nicht): gleiche Funktion/Level bei anderen Firmen; wieder aufgreifen, wenn mehr Firmen angebunden sind.

## Phase 5: Datenlage für zusätzliche Filter

**Nutzerwünsche für Phase 5 (2026-11-19, Q79):** „Ich möchte auf der Website in den Filtern auch Firmen ausschließen können. Außerdem möchte ich frühere Suchen speichern können“ (= Sperrliste für Firmen und gespeicherte Suchprofile, CLAUDE.md 4.1).

| Kriterium | Im Code/Schema | Fehlt noch |
|---|---|---|
| Mitarbeiterzahl als Spanne | `companies.mitarbeitende_ca`, Größenklasse | URL-/Abfrage-/Facettenanschluss; Datenqualität. Keine Klassenmitte als Zahl erfinden. |
| Berufserfahrung | `jobs.steckbrief.erfahrung_jahre` | Zahlenfilter; Mindestwert vs. Spanne vs. unbekannt klären. `jobs.ki.erfahrung` ist Freitext. |
| Gehalt | `jobs.steckbrief.gehalt` (min/max/waehrung/zeitraum) | Jahresnormalisierung, Wechselkurse, Schätzung. Monat nicht mit Jahr vergleichen. |
| Sprachen/Sicherheitsüberprüfung | `jobs.steckbrief`, `leseSteckbrief` | Nur Anzeige; `sicherheit=false` heißt auch „nichts erkannt“. |
| Studium/Anspruch | `jobs.studium`, `jobs.taetigkeit` (Migration 009) | Groq-Halte-Punkt; Whitelist/Prestige offen. |
| Personalverantwortung, Präsenztage, Remote-Gebiet | Arbeitsmodell/Remote-Boolean | Keine Einzelfelder; aus „Hybrid“ keine Präsenztage ableiten. |
| Benefits/Muss | Listen in `jobs.ki`, `leseKi` | Freitext, keine Urlaubstage oder Skill-IDs. |
| Marktrolle/Eigentümer/Alter | Name, Portal, Größe, Kategorie, Hauptsitz | Felder und Quellen fehlen; nicht aus Werbetext ableiten. |
| Suchprofile, Muss/Soll, Gewichte | `leseFilter`, `filterZuUrl`, `formZuUrl` | Keine gespeicherten Profile/Gewichte im Schema. |

**Anschlussfolge nach Freigabe:** `web/lib/filter.ts` → `web/lib/stellen.ts` **und** `ranking_stellen` (Migration 010; Änderungen als neue Migration) → Facetten → `web/app/stellen/page.tsx` → Tests. Sonst funktioniert ein Filter nur ohne Ranking-Auswahl. Quellbasis: `scraper/steckbrief.py`, `leseSteckbrief`, `leseKi`, Migrationen 001/005/009. **Gastschutz:** Migration 007 vergibt Spaltenrechte einzeln; neue KI-Spalten sind für Gäste gesperrt und dürfen nicht über Freitext oder breite RPCs umgangen werden; ob ein Kriterium Gästen angeboten wird, ist eine spätere Entscheidung. Bereits gebaut: `web/lib/stellendaten.ts` (siehe [Codex-Pakete](plans/2026-11-16-codex-pakete.md)).

## Künstliche Beispiele (aus `docs/beispiele/spaetere-phasen.json`)

Vollständig künstlich, reduziert; kein API-/Datenbankschema, kein Import, wird von Anwendung und Lauf nicht gelesen. Fälle: vier Gehalts-/Steckbriefvarianten, gültige KI-Zusammenfassung, Mail-Zuordnung (laufende Bewerbung, zwei Bewerbungen derselben Firma, fremder Nutzer, ähnliche fremde Domain, doppelte Nachricht, fehlender Text), Kalender (normal, von App erstellt, Berliner Sommerzeitgrenzen). Vor Nutzung als Regressionstests die jeweilige Phase klären; für ungeklärte Erwartungen keine grünen Tests behaupten. Der CV-Fall steht im CV-Plan.

```json
{
  "hinweis": "Vollständig künstliche, reduzierte Eingaben. Kein API-/Datenbankschema, kein Import und keine echte Nutzerinformation. Neue Funktionserwartungen vor Verwendung klären.",
  "filterdaten": [
    {"fall": "eur_jahr", "steckbrief": {"erfahrung_jahre": 3, "sprachen": [{"sprache": "Deutsch", "niveau": "B2"}], "gehalt": {"min": 70000, "max": 85000, "waehrung": "EUR", "zeitraum": "Jahr"}, "sicherheitsueberpruefung": false}},
    {"fall": "eur_monat", "steckbrief": {"erfahrung_jahre": 5, "sprachen": [], "gehalt": {"min": 6000, "max": 7000, "waehrung": "EUR", "zeitraum": "Monat"}, "sicherheitsueberpruefung": true}},
    {"fall": "chf_jahr", "steckbrief": {"erfahrung_jahre": 2, "sprachen": [], "gehalt": {"min": 85000, "max": 95000, "waehrung": "CHF", "zeitraum": "Jahr"}, "sicherheitsueberpruefung": false}},
    {"fall": "unbekannt", "steckbrief": {"erfahrung_jahre": null, "sprachen": [], "gehalt": null, "sicherheitsueberpruefung": false}}
  ],
  "ki_zusammenfassung": {
    "aufgaben": ["Kennzahlen auswerten", "Datenqualität prüfen", "Analysen dokumentieren"],
    "rahmen": ["Hybrides Arbeitsmodell"],
    "abschluss": "Abgeschlossenes fachlich passendes Studium",
    "erfahrung": "Mindestens drei Jahre relevante Erfahrung",
    "muss": ["SQL-Kenntnisse"],
    "benefits": [],
    "sprache": "de"
  },
  "bewerbungen": [
    {"id": "a1", "nutzer": "a", "firma": "Synthetische Firma A", "domain": "firma-a.example.invalid", "referenz": "TEST-101", "status": "beworben"},
    {"id": "a2", "nutzer": "a", "firma": "Synthetische Firma A", "domain": "firma-a.example.invalid", "referenz": "TEST-102", "status": "beworben"},
    {"id": "b1", "nutzer": "b", "firma": "Synthetische Firma A", "domain": "firma-a.example.invalid", "referenz": "TEST-101", "status": "beworben"}
  ],
  "mailfaelle": [
    {"fall": "referenz_vorhanden", "nutzer": "a", "nachricht_id": "m1", "von": "jobs@firma-a.example.invalid", "betreff": "Einladung zu TEST-101", "text": "Wir möchten ein Gespräch vereinbaren."},
    {"fall": "mehrdeutig", "nutzer": "a", "nachricht_id": "m2", "von": "jobs@firma-a.example.invalid", "betreff": "Ihre Bewerbung", "text": "Wir möchten ein Gespräch vereinbaren."},
    {"fall": "aehnliche_fremde_domain", "nutzer": "a", "nachricht_id": "m3", "von": "jobs@firma-a.example.invalid.evil.invalid", "betreff": "TEST-101", "text": "Synthetischer fremder Absender."},
    {"fall": "doppelte_nachricht", "nutzer": "a", "nachricht_id": "m1", "von": "jobs@firma-a.example.invalid", "betreff": "Einladung zu TEST-101", "text": "Wir möchten ein Gespräch vereinbaren."},
    {"fall": "fehlender_text", "nutzer": "a", "nachricht_id": "m4", "von": "jobs@firma-a.example.invalid", "betreff": "Ihre Bewerbung", "text": null}
  ],
  "kalenderfaelle": [
    {"fall": "normal", "nutzer": "a", "event_id": "e1", "start": "2026-11-17T09:00:00Z", "zeitzone": "Europe/Berlin", "von_app_erstellt": false},
    {"fall": "app_termin", "nutzer": "a", "event_id": "e2", "start": "2026-11-18T09:00:00Z", "zeitzone": "Europe/Berlin", "von_app_erstellt": true},
    {"fall": "nicht_existierende_wanduhrzeit", "lokale_zeit": "2026-03-29T02:30", "zeitzone": "Europe/Berlin", "fachliche_behandlung": "offen"},
    {"fall": "doppelte_wanduhrzeit", "lokale_zeit": "2026-10-25T02:30", "zeitzone": "Europe/Berlin", "fachliche_behandlung": "offen"}
  ],
  "bestehende_invarianten": [
    "Nutzerdaten nicht über Nutzergrenzen zusammenführen.",
    "Status aus E-Mails zunächst nur vorschlagen, nicht automatisch ändern.",
    "Fremde Kalendertermine nicht verändern.",
    "Persönliche Texte nicht an Groq senden.",
    "Aus unbekannten Werten keine belegten negativen Tatsachen ableiten."
  ]
}
```
