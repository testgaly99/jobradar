# Phase 3: Gmail und Google Kalender – Design

Stand 2026-11-19. Grundlage: CLAUDE.md 4.4 (Erinnerungen), 4.7 und Phase 3; `docs/phasen-vorarbeit.md` („Phase 3“); Fragen Q138–Q156 in `docs/fragen-und-antworten.md`.

## Absicht

Der Admin soll Bewerbungen nicht mehr von Hand nachführen müssen. Die Mails der Firmen setzen Status, Interviews und nächste Schritte selbst. Vor jedem Interview kommt ein Briefing. Gebaut wird zuerst nur für den Admin (Q138 „Erst ich, Freunde später“), aber so, dass Freunde später ohne Umbau den Knopf „Google verbinden“ bekommen (Q146 Bauweise B).

## Ziele

| Ziel | Entschieden |
|---|---|
| Knopf „Google verbinden“ / „Trennen“ auf der Konto-Seite (vorerst nur Admin sichtbar) | Q138, Q146 |
| Stündlicher Lauf im privaten Repo liest neue Mails von Firmen-Domains und bekannten Bewerbungssystemen, wenn der Firmenname einer laufenden Bewerbung vorkommt | Q150 „Stündlich“, Q143 „Firma + Bewerbungssysteme“ |
| Claude (Abo, `claude -p`, Haiku) wertet jede zugeordnete Mail aus und **setzt** Status, Interview (Datum, Uhrzeit, Format) und nächsten Schritt mit Fälligkeit. Jede automatische Änderung ist in der Bewerbung markiert („Automatisch aus Mail vom …“) und hat „Rückgängig“. Einladung, Absage und Angebot meldet Telegram zusätzlich. | Q139 (Nutzer: „Alle Mails von der Firma sollen ausgelesen werden und basierend darauf sollen Status, next steps etc. gesetzt werden“), Q142 „Setzen, mit Hinweis“ – **ersetzt** in CLAUDE.md 4.7 „Der neue Status wird nur vorgeschlagen“ |
| Mailverlauf je Bewerbung: Absender, Betreff, Datum, Volltext ohne Anhänge, Link zu Gmail | Q139, Q144 „Volltext“ |
| Eigener Kalender „Jobradar“ im Google-Kalender des Nutzers: jobradar trägt Interviews und Fristen (Case-Aufgaben) aus Bewerbungen dort ein und hält sie aktuell; andere Kalender nur lesen | Q140 „Eigener Kalender“ |
| Interview-Erkennung im Kalender nach CLAUDE.md 4.7 (Teilnehmer-Domain der Firma, Firmenname im Titel, aus der Bewerbung angelegt) | CLAUDE.md 4.7 |
| Interview-Briefing etwa 24 h und 1,5–2,5 h vorher (Q149) per Telegram: kurz mit Link zur Briefing-Seite in jobradar (nur angemeldet). Die Seite zeigt Firma, Stelle, Gesprächspartner, empfohlenen CV, Verlauf, 5–8 von Claude erstellte Vorbereitungsfragen und 3 eigene Fragen | Q141 „Telegram“, Q145 „Kurz + Link“, „Claude erstellt sie“ |

| Hinweis „Anzeige seit 4.12. offline“ in der Bewerbung, wenn die Stelle einer laufenden Bewerbung verschwindet, dazu Telegram (Nachtlauf, ohne Google, auch für Freunde) | Q156, CLAUDE.md 4.4 |
| Telegram-Erinnerung an den Admin, wenn eine von Hand gepflegte Ranglisten-Quelle (z. B. EIC) älter als 12 Monate ist: „EIC-Liste fällig – Anleitung öffnen“ (Nachtlauf, einmal je Fälligkeit) | Q155, CLAUDE.md Phase 3 |

## Nicht-Ziele (Backlog)

- Nachfass-Erinnerung nach 14 Tagen, Antwortfrist bei Angebot (Q139 nicht gewählt).
- E-Mail als Kanal (Q141), Mails senden.
- Gmail für Freunde, Verifizierung bei Google (erst beim „Live gehen“; dann Knopf für alle freischalten, Lizenz-/CASA-Frage neu prüfen).
- Anhänge von Mails, Antworten aus jobradar heraus.

## Anti-Ziele

- jobradar ändert oder löscht nie Termine außerhalb des eigenen Kalenders „Jobradar“ und nie Mails (nur Leserechte auf Gmail).
- Keine Mail ohne Bezug zu einer laufenden Bewerbung wird geöffnet oder gespeichert.
- Kein persönlicher Inhalt in Logs, GitHub-Issues oder Telegram (Telegram: nur Firma, Stelle, Uhrzeit, Art des Ereignisses, Link).
- Keine Mail- oder Kalenderdaten an Groq, Mistral oder andere Anbieter; nur Claude über das Abo, nur für den Admin (CLAUDE.md 3.2).
- Eine falsche Automatik darf nie Daten zerstören: jede Änderung lässt sich mit dem vorherigen Wert rückgängig machen.

## Rahmen (geprüft 2026-11-19)

- **Google-Projekt:** eigenes Projekt nur für Gmail/Kalender (nicht das Login-Projekt, das im Testmodus bleibt), Nutzertyp „External“, Status **In production**, unverifiziert. Quellen: Refresh-Tokens laufen nur im Status *Testing* nach 7 Tagen ab ([OAuth2 expiration](https://developers.google.com/identity/protocols/oauth2#expiration)); unverifizierte Apps mit „fewer than 100 users“ dürfen genutzt werden, Nutzer klicken die Warnung „App nicht überprüft“ weg ([Ausnahmen](https://support.google.com/cloud/answer/13464323?hl=en), [Unverified apps](https://support.google.com/cloud/answer/7454865?hl=en)). Kein „Personal mode“, weil er sich nicht für andere Nutzer öffnen lässt.
- **Token endet**, wenn der Nutzer das Google-Passwort ändert (Gmail-Scopes), den Zugriff widerruft oder 6 Monate nichts abgerufen wird → Lauf meldet per Telegram „Google neu verbinden“, Konto-Seite zeigt „Verbindung unterbrochen“.
- **Offene Grauzone:** Laut [Gmail-Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) braucht, wer Restricted-Daten auf Servern speichert, eine Sicherheitsprüfung (CASA); die Ausnahmeseiten erwähnen das nicht. Für den Admin allein vertretbar (persönliche Nutzung), vor Freunden neu prüfen.
- **Scopes:** `openid`, `email` (Konto anzeigen), `https://www.googleapis.com/auth/gmail.readonly` (Restricted), `https://www.googleapis.com/auth/calendar.events.owned.readonly` (eigene Kalender lesen, Einladungen landen im eigenen Hauptkalender), `https://www.googleapis.com/auth/calendar.app.created` (nur den eigenen Kalender „Jobradar“ anlegen und bearbeiten). `access_type=offline`, `prompt=consent`.
- **Minuten:** privates Repo hat 2.000 Gratis-Minuten im Monat; GitHub rundet jeden Lauf auf volle Minuten. Stündlich ≈ 720–1.100 Minuten; dazu CV-Nachtlauf und Backup. Claude Code wird nur installiert, wenn es neue Mails oder ein Briefing gibt.
- **Pünktlichkeit:** GitHub startet geplante Läufe oft 5–30 Minuten verspätet; deshalb geht die Kurznachricht schon ab 2,5 h vor dem Interview (Q149) statt 1 h.
- **Sicherheit (Analyse 2026-11-19):** Das Token öffnet das ganze Postfach. Es liegt nur verschlüsselt in der Datenbank und damit im Backup; öffnen kann es nur der Lauf im privaten Repo (Q147).
- **KI-Regel:** nur unverändertes `claude -p` mit `CLAUDE_CODE_OAUTH_TOKEN`, Modell `haiku` (Wiederverwendung `scraper/claude_cli.py` aus 6a). Am Abo-Limit: aufhören, Rest im nächsten Lauf.

## Bauweisen (Q146)

- **A: Schlüssel als GitHub-Secret** – einmal lokal holen, nur im privaten Repo; am wenigsten Code und Angriffsfläche, aber Umbau für Freunde.
- **B: Knopf „Google verbinden“ auf der Website (gewählt)** – Refresh-Token verschlüsselt in der Datenbank; für Freunde vorbereitet, mehr Code.
- Verworfen: Google Apps Script im Konto des Nutzers (Claude ginge nur per eigenem API-Aufruf, verboten).

Nutzer wählte B (Q146), obwohl Claude A empfahl. Nach der Sicherheitsanalyse ergänzt um „Website kann nur verschließen“ (Q147), womit B beim Schutz des Tokens fast an A heranreicht.

## Entwurf

**1. Verbinden (Website).** Konto-Seite, Abschnitt „Google (Gmail und Kalender)“, sichtbar nur für Nutzer, für die `google_erlaubt(user)` gilt (vorerst `istAdmin`). Knopf → Route `/api/google/start` (Zustand `state` als signiertes, kurzlebiges Cookie, PKCE) → Google → `/api/google/zurueck`: Code gegen Tokens tauschen, das Refresh-Token **nur verschließen** (Q147): hybride Verschlüsselung mit dem öffentlichen Schlüssel `GOOGLE_TOKEN_PUBLIC_KEY` (RSA-OAEP-SHA256 3072 Bit für einen zufälligen AES-256-GCM-Schlüssel, Web Crypto), in `google_verbindung` schreiben; das Access-Token aus dem Tausch wird nur für diesen einen Aufruf genutzt (Kalender „Jobradar“ anlegen, falls nicht vorhanden) und nie gespeichert. Den privaten Schlüssel `GOOGLE_TOKEN_PRIVATE_KEY` hat **nur** das private Repo (Secret); Vercel kann gespeicherte Tokens nie entschlüsseln. Verbunden ist unabhängig von der Anmeldeart (Admin meldet sich mit E-Mail/Passwort an). „Trennen“ setzt `status = 'trennen'`; der nächste stündliche Lauf widerruft das Token bei Google und löscht die Zeile (Website-Text: „Wird beim nächsten Abgleich innerhalb einer Stunde getrennt. Sofort: myaccount.google.com/permissions“). Der Kalender „Jobradar“ bleibt in Google stehen. Client-ID/Secret in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Vercel für den Tausch, privates Repo für die Erneuerung).

**Welches Postfach (Q148):** offen, der Nutzer entscheidet beim Verbinden. Empfehlung in der Anleitung: eigene Gmail-Adresse nur für Bewerbungen, weil `gmail.readonly` das ganze Postfach öffnet und Google kein engeres Leserecht kennt (`gmail.metadata` hat keinen Text, Labels begrenzen das Recht nicht).

**2. Stündlicher Lauf (privates Repo, `scraper/google_lauf.py`).** Für jede Zeile in `google_verbindung`, deren Nutzer `google_erlaubt` ist:
1. Access-Token holen; Fehler `invalid_grant` → Verbindung als `unterbrochen` markieren, einmal Telegram, weiter.
2. **Mails:** „Laufend“ = Status Beworben, Im Gespräch, Angebot (nicht Gemerkt, nicht abgeschlossen; Claudes Entscheidung). **Gmail sucht selbst** (Parameter `q` von `users.messages.list`, liefert nur IDs), damit der Lauf keine fremde Mail öffnet: je laufender Bewerbung eine Suche `after:<letzter Lauf − 1 Tag> (from:(<domains>) OR (from:(<ats-domains>) "<Firmenname>"))`. `<domains>` = neue Spalte `applications.firma_domains text[]`, automatisch befüllt aus (a) E-Mail-Domains der Kontakte der Bewerbung, (b) Host der Karriere-/Anzeigen-URL, wenn es kein Portal und kein Bewerbungssystem ist, (c) Domains der Absender bereits zugeordneter Mails; im Bewerbungsformular sichtbar und änderbar. `<ats-domains>` = feste Liste `data/ats_mail_domains.csv` (z. B. greenhouse.io, personio.de, myworkday.com, smartrecruiters.com, lever.co, ashbyhq.com, successfactors.com). Ohne Domain sucht der Lauf nur `from:(<ats-domains>) "<Firmenname>"`. Nur Treffer werden mit `format=full` geholt und in `bewerbung_mails` gespeichert; Dubletten über `gmail_id`.
3. **Auswertung:** bis zu 10 Mails je Claude-Aufruf; Antwort je Mail `{mail_id, bewerbung_id|null, art: eingang|einladung|absage|angebot|rueckfrage|sonstiges, status|null, interview:{beginn, ende|null, format, teilnehmer[]}|null, naechster_schritt:{text, faellig}|null, beleg}`; `beleg` muss wörtlich im Mailtext stehen, sonst nur speichern, nichts setzen. Bei zwei möglichen Bewerbungen derselben Firma und Unsicherheit → `bewerbung_id null`, Bewerbung zeigt „Mail zuordnen“.
4. **Anwenden:** Status nur vorwärts nach der Reihenfolge in CLAUDE.md 4.4, außer Absage/Zurückgezogen; Interview als neue Runde; nächster Schritt überschreibt nur, wenn neuer. Jede Änderung als Eintrag in `automatik_aenderungen` (vorher/nachher als JSON) und als `application_events` mit Quelle „Mail“. Telegram bei Einladung, Absage, Angebot.
5. **Kalender:** Interviews und Fristen aus Bewerbungen im Kalender „Jobradar“ anlegen/ändern/löschen (Zuordnung über gespeicherte `event_id`). Termine der nächsten 48 h in eigenen Kalendern lesen und nach den Regeln aus 4.7 Bewerbungen zuordnen; erkannte Interviews ohne Eintrag in jobradar als Runde eintragen (ebenfalls in `automatik_aenderungen`).
6. **Briefing:** erster Lauf, in dem das Interview höchstens 26 h entfernt ist: Claude erstellt Vorbereitungsfragen (einmal je Interview, gespeichert), Telegram „Morgen 10:00 Interview bei X (Stelle) – Briefing öffnen“ mit Link. Zweite Kurznachricht im ersten Lauf, in dem das Interview höchstens 2,5 h entfernt ist (Nutzer Q149: „Dann stellen wir hier lieber 1,5std ein sicherheitshalber“) → kommt bei stündlichem Lauf etwa 1,5–2,5 h vorher, auch bei 30 Minuten Verspätung mindestens 1 h vorher. Liegt das Interview bei Erkennung schon näher, geht nur die Kurznachricht. Doppelte Nachrichten verhindert `briefing_gesendet`.
7. Log nur Zahlen, z. B. `Google: 4 Mails, 2 zugeordnet, 1 Änderung, 1 Briefing`.

**3. Website.** Bewerbung: Abschnitt „Mails“ (neueste zuerst, aufklappbar, Link „In Gmail öffnen“); Hinweise „Automatisch aus Mail vom 3.12.: Status → Im Gespräch“ mit „Rückgängig“; „Mail zuordnen“ bei unklaren Mails. **Rückgängig** (Claudes Entscheidung) ist nur möglich, solange das Feld noch den automatischen Wert hat; sonst steht dort „Inzwischen von dir geändert“ ohne Knopf. Rückgängig bei einem Interview löscht auch den Eintrag im Kalender „Jobradar“ (nächster Lauf). Briefing-Seite `/bewerbung/[id]/briefing/[interview_id]`. Konto: Verbindungsstatus, letzter Lauf, „Trennen“, „Gespeicherte Mails löschen“. Datenschutzerklärung ergänzen (siehe Datenschutz).

**4. Daten (Migration, Nummer bei Planung).** Eine Runde ist eine Zeile in `interviews` (Claudes Entscheidung). `applications.firma_domains text[]`; `interviews.kalender_event_id text`; `google_verbindung (owner_id pk, google_email, token_verschluesselt, scopes, kalender_id, status 'ok'|'unterbrochen'|'trennen', verbunden_am, letzter_lauf)` – kein Zugriff für `authenticated`/`anon`, Status für den Nutzer über eine `security definer`-Funktion ohne Token; `bewerbung_mails (id, owner_id, application_id null, gmail_id unique je owner, thread_id, von, betreff, datum, text, art, ausgewertet)`; `automatik_aenderungen (id, owner_id, application_id, quelle 'mail'|'kalender', mail_id, feld, vorher jsonb, nachher jsonb, erstellt, rueckgaengig_am)`; `briefings (interview_id pk, fragen jsonb, erstellt)`; `briefing_gesendet (interview_id, art 'vortag'|'kurz', primary key beide)`. RLS nur Eigentümer; Kontolöschung per `on delete cascade`; Export enthält Mails und Änderungen.

**5. Code und Lauf.** Code im öffentlichen Repo (`scraper/google_*.py`, Tests mit Attrappen, keine echten Mails in Fixtures); Workflow `google.yml` nur im privaten Repo, holt den öffentlichen Code per `actions/checkout` (wie der CV-Nachtlauf 6a). `scraper/claude_cli.py` aus 6a wird wiederverwendet; ist 6a noch nicht gebaut, baut Phase 3 ihn nach dem 6a-Plan Task 4.

## Datenschutz (Prüfung 2026-11-19, keine Rechtsberatung)

- **Rahmen:** solange nur der Admin für die eigene Jobsuche nutzt, sehr wahrscheinlich Haushaltsausnahme (Art. 2 Abs. 2 lit. c DSGVO), auch für Recruiter-Namen in Mails. Vor Freunden neu prüfen (dann Verantwortlicher, Auftragsverarbeiter, CASA).
- **Google Limited Use:** Gmail-Daten nur für sichtbare Funktionen des Nutzers, nie zum Training allgemeiner KI-Modelle. Deshalb **Pflicht vor Phase 3:** Claude-Einstellung „Help improve Claude“ aus (Nutzer-To-do 27). Datenschutzerklärung enthält den von Google verlangten Hinweis (Link auf die „Google API Services User Data Policy“, Limited Use).
- **Backup (Q151 „Nicht sichern“):** `bewerbung_mails`, `google_verbindung`, `briefings` nicht im GitHub-Backup (wie die CV-Tabellen); `automatik_aenderungen` und Bewerbungsfelder schon.
- **Telegram (Q152 „Mit Firma“):** Firma, Stelle, Uhrzeit, Art; nie Mailtext, Namen von Personen oder CV.
- **Aufbewahrung (Q153 „Solange die Bewerbung“):** Mails bleiben bis zum Löschen der Bewerbung oder des Kontos oder per Knopf.
- **Trennen (Q154 „Behalten“):** gespeicherte Mails bleiben; Knopf „Gespeicherte Mails löschen“ auf der Konto-Seite.
- **Vercel-Region:** Im Code ist keine Region festgelegt; Vercel rechnet dann meist in den USA. Nutzer-To-do: Function Region auf `fra1` (Frankfurt) stellen, vor Phase 3.
- **Anthropic (USA):** Mailtexte gehen an Claude über das Abo; bei ausgeschaltetem Training 30 Tage Aufbewahrung. In die Datenschutzerklärung.
- **Kalender:** Termine der nächsten 48 h werden nur im Arbeitsspeicher geprüft; gespeichert wird nur, was einer Bewerbung zugeordnet ist.
- **Untergeschobene Anweisungen in Mails:** Claude bekommt keine Werkzeuge (`--tools ""` bzw. entsprechender Schalter aus 6a), Mailtext steht klar abgegrenzt als Daten im Prompt; jede Änderung braucht ein wörtliches Zitat; eine Mail ändert nur die ihr zugeordnete Bewerbung; alles rückgängig machbar.

## Claudes Entscheidungen (zur Prüfung)

1. Eigenes Google-Projekt statt Login-Projekt (sonst 7-Tage-Ablauf oder Login für alle offen).
2. Scope `calendar.events.owned.readonly` statt `calendar.events.readonly` (liest nur Kalender, die dir gehören; Einladungen liegen dort).
3. Status nur vorwärts, außer Absage/Zurückgezogen; Unklares wird gespeichert, aber nicht gesetzt.
4. Liste der Bewerbungssystem-Domains als Datei im Repo.
5. Verbinden unabhängig von der Anmeldeart; CLAUDE.md 4.6 („Wer sich mit E-Mail anmeldet, bekommt keine Gmail- und Kalender-Anbindung“) gilt für Freunde.
6. „Trennen“ lässt den Kalender „Jobradar“ in Google stehen.
7. Firmen-Domain als neue Spalte, automatisch befüllt und änderbar; Gmail sucht serverseitig, kein Öffnen fremder Mails.
8. „Laufend“ = Beworben, Im Gespräch, Angebot.
9. Rückgängig nur, solange der automatische Wert noch steht.
10. Runde = Zeile in `interviews`.

## Dem Bauenden überlassen

Bibliothek für Google-Aufrufe (bevorzugt reines `fetch`/`urllib` ohne neues Paket), genaue Prompt-Texte (eigene Datei), Zeitfenster-Toleranzen, Aufteilung in Dateien, Darstellung der Hinweise im bestehenden Stil (`web/app/stil/utilitaer.css`).

## Nachtrag 2026-11-19 (Q192, Bewerben-Helfer)

Eingangsbestätigungen setzen eine noch gemerkte Bewerbung auf „Beworben“, wenn der Nutzer in den letzten 14 Tagen über den Bewerben-Helfer auf „Bewerben“ geklickt hat (`applications.helfer_geoeffnet_am`, Migration 024). Nur dafür werden auch solche gemerkten Bewerbungen beim Mail-Abgleich berücksichtigt; alle anderen gemerkten nicht. Mit „Rückgängig“ wie jede automatische Änderung.
