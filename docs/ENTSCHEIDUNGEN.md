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
| 2026-11-08 | Löschschutz über Fremdschlüssel mit `restrict` | Die Datenbank selbst verhindert, dass ein Dokument oder eine Stelle mit Bewerbung versehentlich gelöscht wird. |
| 2026-11-08 | Dokumente werden direkt vom Browser in Storage hochgeladen | So läuft nichts durch die Vercel-Funktionen (Größenlimit) und es braucht keinen Zwischenschritt. |
| 2026-11-08 | CSV und ZIP für den Export ohne Bibliothek | Wenige Zeilen eigener Code ersetzen ein Fremdpaket (CLAUDE.md Abschnitt 10). |
