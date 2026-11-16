# Übergabepaket für spätere Phasen

Stand: Recherche 2026-11-15 auf `601ec4a`, Anschlussstellen aktualisiert 2026-11-16 auf `ae9c463`. Anbieterinformationen nicht erneut recherchiert. Auftrag: Claude durch geprüfte Anschlussstellen, Grundlagenrecherche und künstliche Beispiele spätere Bestandsarbeit abnehmen.

**Keine Implementierungsfreigabe:** Dieses Dokument ist eine Bestandsaufnahme und Recherche, kein freigegebener Bauplan. Gestaltung, neue Datenmodelle, Abläufe und Empfehlungen bleiben vorläufig. Vor einer Übernahme passende Fragen mit dem Nutzer klären, Antworten einarbeiten und die überarbeitete Planung ausdrücklich freigeben lassen. Die vorhandenen Projektregeln und Haltepunkte bleiben maßgeblich.

Alle Feststellungen zum Datenbestand beziehen sich auf Quellcode/Migrationsdateien, nicht auf die Live-Datenbank. Keine echten Bewerbungen, Dokumente, E-Mails, Termine oder Zugangsdaten wurden gelesen. Beispiele in `beispiele/spaetere-phasen.json` sind vollständig künstlich; das Hilfsformat ist kein vorgeschlagenes API- oder Datenbankschema.

## Phase 3: Google-Anbindung, Statusvorschläge und Erinnerungen

### Bereits vorhandene Anschlussstellen

| Aufgabe | Geprüfte Stelle | Bedeutung für Claude |
|---|---|---|
| Google-Anmeldung | `web/app/login/page.tsx`, Funktion `google` | Ruft `signInWithOAuth` mit Weiterleitungsadresse auf. Keine zusätzlichen Gmail-/Kalender-Scopes oder Offline-Zugriffsparameter in diesem Aufruf. |
| Rückkehr von Google | `web/app/auth/callback/route.ts`, `GET` | Tauscht Code gegen Supabase-Sitzung. Keine eigene verschlüsselte Provider-Token-Ablage oder Erneuerungslogik in dieser Route. Erlaubte Weiterleitungsziele sind beschränkt. |
| Anwendungsdaten | `supabase/migrations/001_schema.sql`, `applications`, `contacts`, `interviews`, `application_events` | Firma, Referenznummer, Kontakte, Bewerbungsstatus, nächster Schritt und Interviewzeitpunkt vorhanden. Interviewzeit ist `timestamptz`; Fälligkeit des nächsten Schritts ist nur ein `date`. |
| Statusmodell | `web/lib/bewerbung.ts`, `STATUS` | Aktuell gemerkt/beworben/im_gespraech/angebot/abgeschlossen. Alten Status eingang_bestaetigt nicht aus Migration 001 übernehmen; Migration 008 und spätere Anforderungen beachten. |
| Zeitdarstellung | `web/lib/bewerbung.ts`, `berlinZuIso`, `zeitDe`, `tagDe`; `web/instrumentation.ts` | Paket 7 prüft Kalender/Uhrzeit, weist die Berliner Frühlingslücke ab und erhält die bisherige Wahl bei der doppelten Herbststunde. In vorhandene Formulare eingebunden/getestet. Neue Google-Event-Importregeln sind dadurch nicht festgelegt. |
| Export/Löschen | `web/app/export/route.ts`, `web/lib/nutzer-loeschen-kern.ts` | Neue Verbindungs-, Mail-, Vorschlags- oder Erinnerungsdaten müssen später in den Lebenszyklus einbezogen werden. Aktuelle Löschroutine behandelt Bewerbungen, Dokumente, Storage und Auth-Konto. |
| Namensvergleich | `web/lib/link-import.ts`, `firmaPasst` | Für Stellenlinks vorhanden; Präfixvergleich ist kein Identitätsnachweis für Mail-Absender oder Gesellschaften. Nicht ungeprüft für Gmail-Zuordnung übernehmen. |

Das geprüfte Firmenschema hat auch keine eigene bestätigte Mail-Domain-Zuordnung. Eine ATS-/Karriereportal-Domain ist nicht automatisch eine erlaubte Absenderdomain der Firma. Diese Zuordnung gehört vor einem Mailabruf in die Planung.

In den vorhandenen Migrationen 001–011 sind keine Tabellen für Google-Verbindungen, verschlüsselte Provider-Tokens, Mail-/Kalender-Synchronisationsstände oder Erinnerungszustellungen definiert. Auch keine Zuordnung von Google-Event-IDs und Gmail-Nachrichten-IDs zu Bewerbungen. Das sind spätere Planungspunkte, keine Aussage über den Inhalt einer echten Datenbank.

### Offizielle Grundlagen, geprüft am 2026-11-15

- **Anmeldung und API-Zugriff unterscheiden:** Supabase beschreibt eigene Auth-Tokens und zusätzliche Google-Provider-Tokens getrennt. Google liefert den Provider-Refresh-Token nicht standardmäßig; Supabase dokumentiert dafür zusätzliche OAuth-Parameter. Die bestehende Anmeldung ist deshalb noch kein fertiger dauerhafter Gmail-/Kalenderzugriff. [Supabase: Saving Google tokens](https://supabase.com/docs/guides/auth/social-sign-in/auth-google#saving-google-tokens).
- **Hintergrundzugriff:** Google dokumentiert `access_type=offline` als Voraussetzung für automatischen Zugriff ohne anwesenden Nutzer. Das ist Googles Bezeichnung für Hintergrundberechtigung und hat nichts mit unserer netzlosen Testprüfung zu tun. [Google: Refresh an access token](https://developers.google.com/identity/protocols/oauth2/web-server#offline).
- **Testmodus:** Bei externen OAuth-Apps im Status Testing laufen Refresh-Tokens nach sieben Tagen ab; die Ausnahme betrifft reine Name-/E-Mail-/Profil-Scopes, nicht eine vollwertige Gmail-/Kalenderanbindung. **Schlussfolgerung für das Projekt:** Den aktuellen reinen Login und eine spätere regelmäßige Mail-Synchronisation nicht gleichsetzen; dauerhafte Verbindung vor Umsetzung gesondert klären. Andere Widerrufs-/Ablaufgründe bleiben möglich. [Google: Refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).
- **Gmail-Berechtigungen:** Sowohl `gmail.readonly` als auch `gmail.metadata` sind als Restricted eingestuft. Metadata umfasst keine Mailtexte; geringere Inhaltsmenge beseitigt damit nicht automatisch die Prüfungsthematik. [Google: Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes).
- **Absender-Suche:** `users.messages.list` erlaubt den Suchparameter `q` nicht bei `gmail.metadata`. Eine Listenantwort enthält zudem nur Nachrichten-/Thread-IDs; Details benötigen einen weiteren Abruf. **Schlussfolgerung:** „Nur Metadaten plus normale Gmail-Absendersuche“ ist nicht ohne Weiteres der gewünschte sparsame Abrufweg. [Google: messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).
- **Verifizierung:** Google nennt für persönliche Nutzung mit weniger als 100 Nutzern eine Ausnahme von der Verifizierung; Nutzungsrichtlinien gelten trotzdem. Nicht pauschal daraus ableiten, jede spätere öffentliche oder serverseitige Ausbaustufe sei ohne Prüfung möglich. Die Regeln für Restricted-Scopes nennen bei Serververarbeitung zusätzliche Anforderungen; konkreten Nutzungskreis und Ausnahme prüfen, bevor ein kostenloser Dauerbetrieb zugesagt wird. [Google: Ausnahmen](https://support.google.com/cloud/answer/13464323?hl=en), [Google: Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).
- **Kalenderrechte:** `calendar.events.readonly` liest Termine; `calendar.events.owned` darf Termine in Kalendern verändern, die dem Nutzer gehören. Es bedeutet nicht „nur von Jobradar angelegte Termine“. `calendar.app.created` betrifft sekundäre Kalender, die die App erstellt. **Schlussfolgerung:** Die Projektregel „nur eigene Termine ändern“ braucht eine passende Architektur und Prüfung; keines dieser Wörter allein bildet sie vollständig ab. Noch keinen Scope wählen oder anfordern. [Google: Calendar scopes](https://developers.google.com/workspace/calendar/api/auth).

**Schon beschlossene Grenzen aus CLAUDE.md 4.7:** Mail nur von Domains laufender Bewerbungen; Statusänderung zunächst als Vorschlag, Nutzer bestätigt; Zuordnung von Terminen über passende Teilnehmerdomain, Firma im Titel oder Erstellung aus einer Bewerbung; Briefing 24 Stunden und eine Stunde vorher. Das sind Grenzen für die spätere Implementierung, keine hier implementierten Funktionen.

### Vor dem Bau passende Fragen

Was soll zuerst kommen: Kalender, Statusvorschläge oder Erinnerungen? Welche Mailinhalte sollen angezeigt/gespeichert werden? Welche Kalender gehören zur Anbindung, und sollen eigene Termine überhaupt erstellt werden? Wie soll eine mehrdeutige Zuordnung geklärt werden? Wie lange werden Synchronisationsdaten aufbewahrt? Antwort und Scope-/Speicherplanung gemeinsam freigeben; hier keine Auswahl treffen.

Automatische Abläufe gehören nach Einrichtung in den Hintergrund. Der Nutzer möchte keine regelmäßigen manuellen Starts. Einmalige Verbindungsfreigabe oder erneute Anmeldung nach Widerruf nicht mit täglicher Bedienarbeit verwechseln; automatische Token-Erneuerung und Wiederanlauf müssen geplant werden.

## Phase 5: Datenlage für zusätzliche Filter

| Gewünschtes Kriterium | Bereits im Code/Schema | Noch fehlender Nachweis/Unterbau |
|---|---|---|
| Mitarbeiterzahl als freie Spanne | `companies.mitarbeitende_ca`, Größenklasse | URL-/Abfrage-/Facettenanschluss für freie Spannen; Qualität und fehlende Werte der Zahl. Keine Klassenmitte als exakte Zahl erfinden. |
| Berufserfahrung | `jobs.steckbrief.erfahrung_jahre`; Anzeige in `web/lib/steckbrief.ts` | Zahlenfilter fehlt; Mehrdeutigkeit von Mindestwert, Spanne und unbekannt klären. `jobs.ki.erfahrung` ist Freitext. |
| Gehalt | `jobs.steckbrief.gehalt` mit min/max/waehrung/zeitraum | Noch keine Jahresnormalisierung, Wechselkurslogik oder Gehaltsschätzung. Ein Monatsbetrag darf nicht mit Jahresbetrag verglichen werden. |
| Sprachen/Sicherheitsüberprüfung | `jobs.steckbrief`; `leseSteckbrief` | Bisher Anzeige, kein eigener Suchfilter. `sicherheit=false` ist im aktuellen Parser kein belegtes „nicht erforderlich“, sondern auch „nichts erkannt“. |
| Studium und Anspruch | `jobs.studium`, `jobs.taetigkeit` aus Migration 009 | Bestehendes Ausblenden und Groq-Haltepunkt beachten. Whitelist/Prestige-Ausnahme ausdrücklich noch offen; hier nicht vorentscheiden. |
| Personalverantwortung, Präsenztage, Remote-Gebiet | Arbeitsmodell/Remote-Boolean vorhanden | Keine passenden strukturierten Einzelfelder; aus „Hybrid“ keine Zahl von Präsenztagen ableiten. |
| Benefits/Muss-Anforderungen | Listen in `jobs.ki`; Validator `leseKi` | Freitextlisten, keine verlässlichen numerischen Urlaubstage oder standardisierten Skill-IDs. Keine freie Wortsuche als semantischen Nachweis ausgeben. |
| Marktrolle/Eigentümer/Alter | Firmenschema enthält bisher vor allem Name, Karriereportal, Größe, Kategorie, Hauptsitz | Entsprechende strukturierte Felder/Quellen fehlen im aktuellen Schema; nicht aus dem vorhandenen Werbetext ableiten. |
| Suchprofile, Muss/Soll, Gewichte | `leseFilter`, `filterZuUrl`, `formZuUrl` für aktuelle URL-Auswahl | Keine gespeicherten Suchprofile oder Gewichtung im vorhandenen Schema definiert. Inhalt und Verhalten erst klären. |

**Konkrete Anschlussfolge für Claude nach späterer Freigabe:** `web/lib/filter.ts` (URL/Typen) → `web/lib/stellen.ts` (normale Abfrage) **und** `ranking_stellen` (aktuelle Definition in Migration 011; spätere Schemaänderungen als neue Migrationsdatei) (Ranking-Modus) → passende Facetten → `web/app/stellen/page.tsx` (Darstellung) → vorhandene Tests erweitern. Sonst könnte ein neuer Filter nur ohne Ranking-Auswahl funktionieren.

Quell-/Parserbasis: `scraper/steckbrief.py:steckbrief`, `web/lib/steckbrief.ts:leseSteckbrief`, `web/lib/zusammenfassung.ts:leseKi`, Migrationen 001/005/009. Vorhandene Gehaltsanzeige rechnet ausdrücklich nichts um. Die Beispielwerte unten belegen diese Formate, keine zugesagte Datenqualität echter Anzeigen.

**Gastschutz:** Migration 007 vergibt Spaltenrechte einzeln; neue KI-Spalten sind Gästen nicht freigegeben. Zusätzliche Filter/Funktionen dürfen diese Grenze nicht indirekt umgehen, etwa durch Freitextausgabe oder zu breite RPC-Rechte. Ob ein neues Kriterium Gästen angeboten werden soll, ist eine spätere Entscheidung.

**Inzwischen konkret programmiert (2026-11-15):** Auf gesonderten Nutzerauftrag wurde die vorhandene Datenprüfung nach `web/lib/stellendaten.ts` gezogen und unmittelbar über `steckbrief.ts` angeschlossen. `leseGehalt` prüft das bestehende vollständige Format, `leseSteckbrief` erhält auch 0 Jahre und gibt unabhängige Datenobjekte zurück. Einheiten werden nicht umgerechnet. Diese Funktionen können später ohne Anzeigenabhängigkeit genutzt werden; sie sind keine Filterentscheidung oder CV-Bewertung. Die obige Bestandsaufnahme stammt aus Basis `601ec4a`; Fortschritt und neuer Prüfstand stehen in STATUS und im Stellendaten-Plan.

## Phase 6: Lebenslauf-Abgleich

- **Vorhanden:** `documents` enthält Dokumentart, Versionsname, Datum und Storage-Pfad; Bewerbungen verweisen über `cv_dokument_id` und `anschreiben_dokument_id` auf Versionen. Migration 004 schützt verwendete Versionen vor Löschung. `web/app/dokumente/upload.tsx` lädt Dateien direkt in den Speicher; `actions.ts` erstellt kurzlebige Download-Links.
- **Noch nicht vorhanden im geprüften Code:** Textgewinnung aus PDF/Word, strukturierte Lebenslauf-Fähigkeiten, Abgleichläufe, begründete Treffer/Lücken, nachvollziehbare Modell-/Dokumentversionen und Passungsgewichte. Ein Upload ist noch kein gelesener oder ausgewerteter Lebenslauf. Keine Parserbibliothek, Modellversion oder neue Tabelle in dieser Vorbereitung festlegen.
- **Wiederverwendbar:** `jobs.abschnitte`, `jobs.ki`, `voraussetzungen` und `web/lib/anzeige.ts` bieten Anzeigenabschnitte bzw. Anforderungen. Die bisherige Hervorhebung wichtiger Punkte ist ein Wortvergleich; sie ersetzt keinen semantischen CV-Abgleich.
- **Verbindliche Datenregel:** Persönliche Daten ausschließlich über den vorgesehenen Claude-Abo-Weg. Nie echte Lebensläufe an Groq oder andere Anbieter senden oder als Testfixture ablegen. Auch Mail-/Kalendertexte sind persönliche Daten; spätere Automatisierung muss diese Regel durchgängig berücksichtigen.
- **Vor späterer Freigabe klären:** Welche CV-Versionen vergleichen? Wie fehlende Nachweise statt behaupteter fehlender Fähigkeiten anzeigen? Welche Ergebnisse speichern und wann verwerfen? Wie Empfehlungen erklären? Wie berücksichtigt der Nutzer Textauslesefehler? Keine Punktzahl oder Gewichtung hier vorgeben.

## Fertig vorbereitete künstliche Fälle

Datei `beispiele/spaetere-phasen.json` enthält reduzierte Eingaben, keine Tokens, echten Personen oder importierbaren Produktionsdatensätze:

1. **Filterdaten:** EUR/Jahr, EUR/Monat, CHF/Jahr und unbekanntes Gehalt; vollständiger/leerer Steckbrief sowie gültige KI-Zusammenfassung. Bestehende Leser können diese Teilobjekte verarbeiten.
2. **Mail-Zuordnung:** eine laufende Bewerbung, zwei Bewerbungen derselben Firma, fremder Nutzer, ähnliche fremde Domain, doppelte Nachricht und fehlender Text. Claude muss keine echten Nachrichten zum Entwerfen solcher Fälle verwenden.
3. **Kalender:** normaler Zeitpunkt und Berliner Sommerzeit-Grenzen; Herkunft „von App erstellt“ gegenüber „fremder Termin“. Die vorhandene Herbstwahl ist in Paket 7 erhalten und geprüft; andere Import-/Zuordnungsregeln später gesondert klären.
4. **CV-Abgleich:** fiktiver Text mit explizitem SQL-Nachweis und einer nicht erwähnten Anforderung. Keine vorgegebene KI-Antwort, Bewertung oder Modellentscheidung.

Vorbereitet sind Eingangsdaten und bereits geltende Invarianten; für neue, noch ungeklärte Funktionserwartungen werden keine grünen Tests behauptet. Vor Nutzung als echte Regressionstests die jeweilige Phase mit dem Nutzer klären. Der Datenbestand wird nicht von Anwendung oder täglichem Lauf eingelesen.

## Aktualisierte vorhandene Grundlagen (2026-11-16)

Die Codepakete ergänzen bereits genutzte Grundlagen: `web/lib/stellendaten.ts` enthält `leseGehalt`/`leseSteckbrief`, der KI-Leser liefert unabhängige geprüfte Listen, `datumOk` und `berlinZuIso` prüfen vorhandene Formularwerte. Python und Website verwenden dieselben künstlichen Vertragsbeispiele in `tests/fixtures/stellendaten_vertrag.json`. Diese Grundlagen wiederverwenden; sie sind kein fertiger CV-Abgleich oder Auftrag für zusätzliche Filterregeln. Weitere konkret prüfbare Unterstützung steht als Kandidaten 15–20 im Arbeitskatalog; vorhandene Recherche nicht erneut als neues Paket zählen.

## Übergabe an Claude

Als Erstes weiterhin `AGENTS.md`, `CLAUDE.md`, `STATUS.md`, Entscheidungen und neue Agentenprotokolle lesen. Danach dieses Paket für die Bestandsaufnahme nutzen, Quellen bei geänderter Ausgangslage erneut prüfen und nur die gewünschte Phase mit dem Nutzer planen. Kein neuer manueller Routine-Test oder Datenabruf wird dem Nutzer übertragen.

Die Recherche-/Beispielvorbereitung ist abgeschlossen. Der gesondert beauftragte kleine Datenbaustein ist im Nachtrag dokumentiert; vollständige neue Phasen wurden nicht implementiert. Offene Ranking-SQL-/PostgREST-Abnahme und finale Groq-Probe bleiben offen. Aktuelle Kontoeinstellungen, Anbieterfreigaben und Qualität echter Auswertungen wurden nicht geprüft.
