# AGENTS.md – Pflichtlektüre für jeden KI-Agenten (z. B. Codex)

Dieses Projekt wird hauptsächlich mit Claude Code gebaut. Arbeitest du (ein anderer Agent) daran, gelten **ausnahmslos dieselben Regeln**. Diese Datei fasst die wichtigsten zusammen; im Zweifel gilt `CLAUDE.md`. Weichst du von einer Regel ab, ist die Arbeit unbrauchbar, auch wenn der Code funktioniert.

## 1. Bevor du irgendetwas tust
1. Lies **vollständig**: `CLAUDE.md` (Anforderungen, harte Regeln, Arbeitsweise), `docs/STATUS.md` (Stand, offene To-dos, „Nächster Schritt“ mit Halte-Punkten), `docs/ENTSCHEIDUNGEN.md` (warum etwas so ist), `docs/fragen-und-antworten.md` (Fragenprotokolle und bereits gegebene Antworten).
2. Arbeitet gerade ein Paket nach Plan, lies dessen Plan und Design (`docs/superpowers/plans/…`, `docs/superpowers/specs/…`). Das Design geht dem Plan vor; Abschnitte wie „Änderungen nach der Probe“ gehen älteren Abschnitten vor.
3. Lokal (nicht im Repo) liegt das Arbeitsprotokoll unter `.superpowers/sdd/<plan>/progress.md`. Lesen erlaubt, **nie** committen, nie löschen.
4. Arbeite **nur** im Ordner `jobradar-entwurf` auf dem Zweig `entwurf-ui`. Nie gleichzeitig mit Claude Code im selben Ordner arbeiten.
5. Ändert der Nutzer im Gespräch etwas an Plan oder Regeln: erst in den Dateien festhalten (Abschnitt 4), dann bauen.

## 2. Harte Verbote (keine Ausnahme ohne ausdrückliche Zustimmung des Nutzers im Chat)
- **Persönliche Daten und Geheimnisse:** Öffne, lies oder gib **nie** aus: `.env`, `web/.env.local`, irgendeine `*.env*`-Datei, Schlüssel, Tokens. Frage die Live-Datenbank **nie** ab (auch nicht lesend): Sie enthält persönliche Daten, und die dürfen laut `CLAUDE.md` nur über das Claude-Abo verarbeitet werden. Damit sind für dich auch alle Groq-Proben und Live-Läufe tabu.
  - **Verlass dich nicht darauf, dass dein Werkzeug `.env`-Dateien von selbst ausschließt** (das ist ungeprüft). Schließe sie aktiv aus: keine Suche, kein Auflisten von Inhalten, kein Öffnen dieser Dateien, auch nicht „nur kurz zum Nachsehen“. Brauchst du einen Wert daraus, frag den Nutzer, welche Einstellung gemeint ist, ohne den Wert zu nennen.
- **Nichts Unumkehrbares:** kein Push, kein Merge nach `main`, kein Force-Push, keine umgeschriebene Historie, keine gelöschten Daten, keine Änderung an der Live-Datenbank, keine Migration ausführen (Migrationen schreibst du nur als Datei; der Nutzer spielt sie selbst ein).
- **Git:** nie `git add -A`, `git add .`, `git commit -a` oder `git add -f`; Dateien immer einzeln mit Pfad hinzufügen. Nichts aus `.superpowers/` ins Repo. Commits klein, deutsche Nachricht.
- **Keine neuen Dienste, Konten, kostenpflichtigen APIs oder Pakete** ohne Zustimmung (`CLAUDE.md` 3 und 10).
- **Das Repo ist öffentlich:** keine Namen, E-Mails, Adressen, Vercel-Adresse oder sonstige persönliche Daten in Code oder Doku.
- **Kanban-Animationen** nicht verändern. Scraping nur legal und fair (`CLAUDE.md` 3.5, 9).
- Halte-Punkte in `docs/STATUS.md` („Halte vor dem Weitermachen“) sind verbindlich: dort anhalten und den Nutzer fragen.

## 3. Wie du arbeitest
- Kleinste vollständige Änderung; bestehende Muster und Dateistruktur übernehmen; keine Abstraktionen „für später“.
- **Tests zuerst** (rot sehen, dann grün). Vor jedem Commit: `py -m pytest -q` (Scraper) bzw. in `web/`: `npm test`, `npx tsc --noEmit`, `npm run build`. Rote Tests = nicht fertig.
- Website: Aussehen nur in `web/app/stil/utilitaer.css`, Aufbau in `web/app/globals.css`. Next.js-Besonderheiten: `web/AGENTS.md`. Lokal läuft nur `http://localhost:3002`.
- KI-Regeln: Anzeigentexte nur an Groq (nur `openai/gpt-oss-120b`), jedes Modell hat seine eigene Anleitung (`scraper/ki_prompt*.md`), nie Ausweichen auf andere Anbieter.

## 4. Dokumentationspflicht (genauso wichtig wie der Code)
Nach **jeder** Änderung, im selben oder direkt folgenden Commit:
1. `docs/STATUS.md`: was jetzt geht, was offen ist, neue To-dos für den Nutzer, und unter „Nächster Schritt“ den genauen Übergabestand.
2. `docs/ENTSCHEIDUNGEN.md`: jede Entscheidung mit Datum und einem Satz Begründung.
3. Betrifft es Anforderungen oder Arbeitsweise: `CLAUDE.md` – aber **nur nach Rückfrage beim Nutzer**.
4. Arbeitest du nach einem Plan: erledigte Schritte und Abweichungen im Plan bzw. im Arbeitsprotokoll vermerken (Abweichung immer mit Begründung).
5. **Pflicht-Eintrag in `docs/agenten-protokoll.md`** (neueste oben, nach der Vorlage dort): Datum und Uhrzeit, Auftrag, alle Commits, geänderte Dateien, Tests mit Ergebnis, was nicht geprüft ist, jede Abweichung mit Begründung. Ohne diesen Eintrag gilt deine Arbeit als nicht abgegeben. Claude liest das Protokoll zu Beginn jeder Sitzung, prüft deine Commits und pflegt danach die Checkliste des Nutzers (ein Claude-Artifact, das du nicht ändern kannst).
6. **Jede Commit-Nachricht endet mit der Zeile** `Agent: Codex` (bzw. deinem Namen). So findet Claude deine Commits auch, falls ein Protokoll-Eintrag fehlt.
7. **Projektweit alle Fragen und Antworten festhalten:** Nutzerfragen und Agentenfragen einschließlich Rückfragen, Statusfragen und Freigaben beim Stellen im passenden Fachdokument protokollieren; Wortlaut, Empfehlungen, Antwortoptionen, Datum/Kennung und Status erhalten. Antworten und Präzisierungen im Wortlaut ergänzen, ältere Fassungen nicht überschreiben; Empfehlungen nicht als Entscheidungen behandeln. Neue Protokolle über `docs/fragen-und-antworten.md` auffindbar machen. Vor neuen Fragen nach vorhandenen Antworten sehen. Datenschutz/Geheimnisse beachten, Schwärzungen und historische Quellenlücken kennzeichnen. Die vollständige Regel steht in `CLAUDE.md` 7.

## 5. Wie du mit dem Nutzer sprichst
- Immer **Deutsch**. Der Nutzer ist Programmier-Anfänger.
- Jede Anleitung hat drei Teile: **Was** (nummerierte Klick-Schritte mit exakten Namen), **Warum** (1–3 Sätze), **Woran man erkennt, dass es geklappt hat**.
- Fachbegriffe beim ersten Auftreten in einem Halbsatz erklären. Bei Entscheidungen die Alternative nennen und warum nicht.
- Keine stillen Annahmen: Gibt es zwei vernünftige Wege, frag. Am Ende sagen, was nicht geprüft wurde und welches Risiko bleibt.
