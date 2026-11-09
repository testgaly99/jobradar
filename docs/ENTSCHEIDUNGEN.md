# Entscheidungen

| Datum | Entscheidung | Begründung |
|---|---|---|
| 2026-11-07 | Repo **öffentlich**, Website über **GitHub Pages** | Kein zweiter Dienst. Actions sind für öffentliche Repos kostenlos. Im Repo stehen nur öffentliche Stellenanzeigen. |
| 2026-11-07 | Seite für **Handy und Laptop** (passt sich der Bildschirmgröße an) | Beide Geräte werden gleich oft genutzt. |
| 2026-11-07 | Abruf **1× täglich automatisch** (ca. 5–6 Uhr), dazu manueller Start | Reicht für die Jobsuche und schont die Unternehmensseiten. |
| 2026-11-07 | Größenklassen **<50 \| 50–249 \| 250–999 \| 1.000+** | Gewünscht; die oberen Stufen sind zu einer zusammengelegt. |
| 2026-11-07 | **Mehrere Kategorien** pro Unternehmen, 30 Branchen (`data/kategorien.md`) | Viele Firmen passen in mehr als eine Branche. |
| 2026-11-07 | Start mit **13 statt 10** Unternehmen, aus Funding- und Arbeitgeber-Rankings | Alle Größenklassen sollen zum Testen vertreten sein. |
| 2026-11-07 | Vorfilter: **nur Deutschland plus Remote**; ohne Ausbildung, duales Studium, Praktikum, Werkstudent, Abschlussarbeit, Minijob/Aushilfe, Filial- und Verkaufsjobs | Große Firmen haben sonst Tausende unpassende Stellen. |
| 2026-11-07 | Zielbild: Unternehmensliste **monatlich automatisch** aus offiziellen Rankings aktualisieren (Stufe 5) | Gewünscht, aber erst nach einer stabilen Version 1. |
| 2026-11-07 | Daten (`data/`) werden **im Repo gespeichert** | Das Repo ist zugleich das Backup, mit vollständiger Historie. |
| 2026-11-08 | Anforderungen erweitert und in CLAUDE.md zusammengeführt (Tracker, Freunde, Gmail und Kalender, KI-Auswertung, Selbstreparatur, Benachrichtigungen) | CLAUDE.md ist die einzige Anforderungsquelle, damit es keine widersprüchlichen Angaben gibt. |
| 2026-11-08 | KI im Betrieb ist erlaubt, aber nur über den Claude-Abo-Token oder Gratis-Kontingente, nie mit kostenpflichtigem API-Schlüssel | Keine laufenden Kosten. |
| 2026-11-08 | Neue Reihenfolge der Phasen: Tracker zuerst, die Jobsuche wird in Phase 4 und 5 ausgebaut | Wunsch des Nutzers. |
| 2026-11-08 | Website-Plan (Filter, Design, Scroll-Fix) pausiert, bis die Architektur geklärt ist | Die Website könnte mit Next.js neu gebaut werden. Dann wäre Arbeit an der alten Seite doppelt. |
| 2026-11-08 | Zielarchitektur: Supabase (Frankfurt), Next.js auf Vercel Hobby, Jobs per GitHub Actions; die Jobsuche zieht später von GitHub Pages um | Gratis-Tarife geprüft. Supabase bleibt durch den täglichen Lauf wach, Login, Datentrennung und Dateien gibt es fertig. |
| 2026-11-08 | KI nur über den Claude-Abo-Token, ohne Ausweichlösung | GitHub Models wurde am 30.07.2026 abgeschaltet. Ein weiterer Anbieter hieße ein neues Konto und noch ein Ort für die Daten. |
| 2026-11-08 | Repo bleibt öffentlich, persönliche Daten nur in Supabase | Actions bleiben gratis. Im Repo steht nichts Privates. |
| 2026-11-08 | Login mit Google oder mit E-Mail und Passwort (Supabase Auth) | Wunsch des Nutzers. Für Mails an Freunde wird in Phase 2 ein eigener SMTP-Zugang nötig. |
| 2026-11-08 | Phase 1 erweitert: Die Jobsuche zieht schon in Phase 1 in die neue Website um, mit „Bewerbung anlegen“ per Klick, per Link oder manuell | Der Nutzer will Bewerbungen aus gespeicherten Stellen übernehmen. |
| 2026-11-08 | Link-Erkennung nur per Code, ohne KI. LinkedIn, Stepstone usw. werden nie abgerufen; ist nichts erkennbar, gibt es 2 Felder (Firma, Titel) | Kostenlos, sofort, regelkonform. |
| 2026-11-08 | Geschlossene Stellen ohne Bewerbung verlieren den Text und werden ausgeblendet; es bleibt eine Mini-Notiz für das echte Erstdatum | Nur beworbene oder gemerkte Stellen interessieren. Spart Platz bei rund 1000 Firmen. |
| 2026-11-08 | Backup in einem privaten Repo `jobradar-privat` (täglich), dazu ein Export-Knopf | Persönliche Daten gehören nicht ins öffentliche Repo, und Supabase Free hat kein herunterladbares Backup. |
| 2026-11-08 | Ziel: rund 1000 Firmen | Wunsch des Nutzers. |
| 2026-11-08 | Die alten Stellen kommen per Skript (`scraper/umzug.py`) nach Supabase, nicht von Hand | Einmalig und wiederholbar: Das echte Erstdatum bleibt erhalten, ein zweiter Lauf ändert nichts. |
| 2026-11-08 | Backup per `pg_dump` in einem `postgres:17`-Container über den Session pooler | Der Runner hat ein älteres `pg_dump`. Ein neueres kann ältere Server sichern. Der Pooler ist nötig, weil GitHub-Runner kein IPv6 haben und der direkte Host nur IPv6 kann. |
| 2026-11-08 | GitHub Pages abgeschaltet, die alte Seite gelöscht | Die neue Website auf Vercel ersetzt sie. Der Verlauf liegt in Git. |
| 2026-11-08 | Löschschutz über Fremdschlüssel mit `restrict` | Die Datenbank selbst verhindert, dass ein benutzter Lebenslauf oder ein benutztes Anschreiben versehentlich gelöscht wird. |
| 2026-11-08 | Dokumente werden direkt vom Browser in Storage hochgeladen | So läuft nichts durch die Vercel-Funktionen (Größenlimit) und es braucht keinen Zwischenschritt. |
| 2026-11-08 | Export als eine CSV-Tabelle mit klickbaren Links (Wunsch des Nutzers), ohne ZIP | Excel öffnet die CSV direkt; Kontakte und Interviews stehen in Spalten der Bewerbung. Kein Fremdpaket nötig (CLAUDE.md Abschnitt 10). |
| 2026-11-08 | Täglicher Lauf läuft weiter täglich (kurz pausiert, dann wieder an) | Kostet nichts und hält Supabase wach; ohne Aktivität pausiert Supabase Free nach ca. 7 Tagen. |
| 2026-11-08 | **Keine** Bundesagentur für Arbeit als Quelle | Es gibt keine offizielle Schnittstelle, die Nutzungsbedingungen sind unklar (Regel: nur legal abrufen). |
| 2026-11-08 | Phase 2: Freunde melden sich **nur mit Google** über den geteilten Link an, **ohne Einladungsliste**. Bis zur eigenen Domain trägt der Nutzer sie als Google-Testnutzer ein. | Wunsch des Nutzers. Im Google-Testmodus kommen ohnehin nur eingetragene Konten herein. Für das Veröffentlichen braucht es eine eigene Domain. |
| 2026-11-08 | Kein eigener Mail-Dienst in Phase 2. Domain, Resend und Veröffentlichen der Google-App kommen in den Backlog („Mail-Paket“). | Mit reinem Google-Login sind keine Bestätigungs- oder Reset-Mails nötig. Kostet 0 €. |
| 2026-11-08 | Admin-Seite „Nutzer“, Konto löschen (Export wird empfohlen, Bestätigung mit „LÖSCHEN“) und Datenschutzerklärung (Kontakt Mark Galysh). Der Service-Key liegt dafür nur serverseitig bei Vercel. | Nutzer auflisten und löschen geht nur mit Admin-Rechten. Der Browser bekommt den Key nie. |
| 2026-11-08 | Vorlagen, Textbausteine und Anlagen kommen in ein eigenes späteres Paket. Benachrichtigungen: Telegram, später Google Kalender, kein Teams. | Wunsch des Nutzers. |
| 2026-11-08 | Die offenen To-dos des Nutzers (Migrationen, Klicktest, Vercel usw.) sind der letzte Schritt von Phase 2. | Für das Bauen werden sie nicht gebraucht, erst für den Live-Test mit Freunden. |
| 2026-11-08 | Das Admin-Konto lässt sich nie löschen, weder selbst noch über die Admin-Seite | Wunsch des Nutzers. Es endet erst, wenn Website und Datenbank entfernt werden. |
| 2026-11-08 | Registrierung per E-Mail und Passwort bleibt **offen**, bis das Mail-Paket kommt | Entscheidung des Nutzers. Risiko bewusst getragen: Wer den Link kennt, kann ein Konto anlegen, sieht aber nur Stellen und einen eigenen leeren Tracker (RLS). Der Admin sieht neue Konten auf „Nutzer“ und kann sie entfernen. |
| 2026-11-08 | Phase 3 (Kalender/Gmail, `web/`) und Phase 4 (Scraper, `scraper/`) werden **parallel** gebaut, jeweils in eigener Arbeitskopie (Worktree); in Phase 4 je ein Helfer pro Jobportal-Typ. Vorher Klärung beider Phasen. Neue Teile werden früh in `main` übernommen, aber erst eingeschaltet, wenn sie fertig sind. | Vorschlag des Nutzers. Die beiden Phasen teilen kaum Dateien, das spart Wochen ohne Qualitätsverlust. Doku und Zusammenführung macht nur der Koordinator. |
| 2026-11-08 | Website-Überarbeitung (Phase 2b) nach dem Klicktest des Nutzers, vor dem Einladen von Freunden. Inhalt siehe CLAUDE.md Abschnitt 6, Punkt 2b. | Rückmeldung aus dem Klicktest: unklare Begriffe, fehlende Detailseite und Merken-Funktion, schwache Suche. |
| 2026-11-08 | Reiter „Dokumente“ ausgeblendet; „Dokumente klären“ und „Bewerbungsformular neu definieren“ in den Backlog | Ohne Bewerben über die Website bringen Dokumente wenig. Das Formular will der Nutzer später gemeinsam neu festlegen. |
| 2026-11-08 | Admin-Einblicke nur als Zahlen ohne Inhalte (letzte Anmeldung, Anzahl Bewerbungen, aktive Nutzer) | Datenschutz: keine Firmennamen, Notizen oder Klickverfolgung. |
| 2026-11-08 | „Wichtige Punkte“ markieren kommt in Phase 2b (Textvergleich). CV-Abgleich (fett/rot) und CV-Empfehlung kommen in Phase 6, per KI über den Abo-Token | Wortvergleich mit einem Lebenslauf würde oft falsch rot markieren; Bedeutungen erkennt nur ein Sprachmodell. |
| 2026-11-08 | CV-Abgleich (Phase 6) mit dem günstigsten Modell (Haiku) | Schont das Abo-Kontingent. Ein größeres Modell nur, wenn Stichproben zu viele Fehler zeigen. |
| 2026-11-08 | „Wichtige Punkte“ treffen ganze Wörter und Wortanfänge (Übergang bis zur KI in Phase 6); gegliederte Snapshots werden für alle Bewerbungen automatisch nachgerüstet | Deutsche Komposita („Teamfähigkeit“); der Nutzer will überall dieselbe Gliederung. |
| 2026-11-08 | Steckbrief per Regeln jetzt (2b), KI-Zusammenfassung bleibt in Phase 5; Felder der Kurzbeschreibung in der Liste sind pro Nutzer einstellbar | Der Nutzer sichtet täglich hunderte Stellen und will auf einen Blick entscheiden; nicht jeder braucht dieselben Felder (z. B. Sprachen). |
| 2026-11-09 | Zusammenfassungen öffentlicher Anzeigen per **Groq Gratis-Tarif** (Llama 70B); persönliche Daten weiter nur über Claude-Abo. Vorher eine Probe mit 20 echten Anzeigen, die der Nutzer beurteilt. | Schont das Claude-Abo bei hunderten Anzeigen pro Tag. Groq: 1.000 Anfragen/Tag gratis, laut Bedingungen kein Training mit Eingaben. OpenRouter (50/Tag) zu knapp, Gemini Gratis nutzt Eingaben. |
| 2026-11-09 | Design-Variante **utilitär** (Apothekengrün) gewählt, vorerst. Die Varianten „editorial“ und „verspielt“ sind aus dem Ordner entfernt, liegen aber in Git (Commits 743a6cf und a2153ad) und lassen sich mit einer Datei und einer Import-Zeile zurückholen. | Zeigt die meisten Stellen pro Bildschirm, ruhig und professionell. Ungenutzte Dateien würden nur verwirren. |
