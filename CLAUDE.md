# CLAUDE.md – Projekt „Jobsuche“

Diese Datei liest du (Claude Code) zu Beginn jeder Sitzung. Sie beschreibt, was gebaut wird, für wen, unter welchen Bedingungen und wie wir zusammenarbeiten. Wenn etwas hier mit einer späteren Anweisung im Chat kollidiert, gilt der Chat. Wenn eine Entscheidung fällt, die hier etwas ändert, aktualisierst du diese Datei (nach Rückfrage).

---

## 1. Wer ich bin und was das für dich heißt

- Ich bin **kompletter Programmier-Anfänger**. Ich kann Code nicht selbst prüfen und kenne weder Git noch Terminal-Befehle.
- Deshalb gilt:
  - Sag mir bei jedem Schritt, **was ich selbst tun muss** (klicken, Konto anlegen, Schlüssel eintragen), in einfacher Sprache und in nummerierten Schritten.
  - Erkläre Fachbegriffe beim ersten Auftauchen in einem Satz.
  - Triff keine stillen Annahmen. Wenn eine Entscheidung zwei vernünftige Antworten hat, frag mich.
  - Wenn du etwas ausführst, das ich nicht rückgängig machen kann (Daten löschen, Datenbank umbauen, Repo-Historie umschreiben, etwas veröffentlichen), **frag vorher** und sag, was passiert.
- Ich arbeite beruflich im Finanzsektor. Dieses Projekt ist **privat**. Es kommen keine Firmen- oder Kundendaten hinein.
- Antworte auf Deutsch.

---

## 2. Ziel des Projekts

Eine eigene Jobsuche-Website für mich, weil Stepstone, Glassdoor & Co. schlechte Filter haben und keine passenden Treffer liefern.

**Kernidee:** Ein Skript durchsucht regelmäßig die **offiziellen Karriereseiten** einer von mir gepflegten Liste von rund 100 Unternehmen und zeigt mir die Stellen auf einer Website, die ich vor allem nach diesen Kriterien filtern kann:

1. **Unternehmensgröße** (wichtigster Filter)
2. **Kategorie des Unternehmens** (z. B. Bank, Versicherung, Asset Manager, Beratung, Startup, Tech …)
3. danach die üblichen Filter (Ort, Remote, Stichwort, Datum)

**Spätere Ausbaustufen** (nicht in Version 1!):

- **Bewerbungs-Tracker:** Bewerbungen, CVs, Anschreiben, Stellenauszüge, Gehalt, Ansprechpartner, Vorlagen.
- **Logins für Freunde:** Jeder hat ein eigenes Konto und sieht nur seine eigenen Daten.
- **Gmail- und Google-Kalender-Anbindung:** Infos vor Interviews bündeln (Termin, Mails mit dem Unternehmen, Stellenauszug).
- **Monatliche Unternehmensübersichten:** automatisiert abgerufene Listen relevanter Unternehmen in Deutschland (Top-Startups & Funding, Unternehmensgröße, beliebteste/beste Arbeitgeber nach Kategorie), die mir helfen, meine Unternehmensliste zu erweitern.

---

## 3. Harte Anforderungen (nicht verhandelbar)

1. **Kostenlos.** Keine Dienste, die Geld kosten oder eine Kreditkarte verlangen, ohne dass ich ausdrücklich zustimme. Wenn ein Gratis-Tarif Grenzen hat, nenne sie mir, bevor wir uns darauf festlegen.
2. **Zuverlässig und dauerhaft.** Meine Daten dürfen sich nicht regelmäßig löschen, und ich will mein Konto nicht neu anlegen oder Verbindungen ständig neu herstellen müssen. Konkret:
   - Prüfe bei jedem Gratis-Hosting/jeder Gratis-Datenbank **anhand der aktuellen offiziellen Doku**, ob Daten nach einer Frist gelöscht, Projekte bei Inaktivität pausiert oder Tokens ablaufen. Gratis-Tarife ändern sich, verlass dich nicht auf dein Vorwissen.
   - Es gibt von Anfang an ein **Backup** (Export der Daten in eine Datei, die im Repo oder bei mir liegt) und eine kurze Anleitung zum Wiederherstellen.
   - Bekannte Fallen, die du aktiv prüfst:
     - Geplante GitHub-Actions-Workflows in öffentlichen Repos werden nach längerer Inaktivität des Repos automatisch deaktiviert.
     - Google-OAuth-Apps im Status „Testing“ stellen Refresh-Tokens aus, die nach kurzer Zeit ablaufen; Gmail-Scopes sind „restricted“ und für einen öffentlichen Betrieb prüfpflichtig.
     - Gratis-Datenbanken mancher Anbieter werden bei Inaktivität pausiert oder nach einer Frist gelöscht.
3. **Tokensparend.** Das Scraping läuft als **normales Programm ohne KI**. Kein Sprachmodell im laufenden Betrieb, es sei denn, ich stimme ausdrücklich zu. Auch in unserer Zusammenarbeit: kurze Zusammenfassungen statt langer Dateiausgaben, Status in Dateien festhalten (siehe Abschnitt 8).
4. **Legal und fair scrapen.**
   - Nur **offizielle Karriereseiten der Unternehmen** bzw. deren Bewerbermanagement-Systeme. **Kein** Scraping von Stepstone, LinkedIn, Indeed, Glassdoor, Kununu o. Ä.
   - `robots.txt` respektieren, höchstens eine Anfrage pro Sekunde pro Domain, eindeutiger User-Agent, keine Logins umgehen, keine CAPTCHAs umgehen.
   - Unternehmen, die das Abrufen erkennbar nicht wollen, werden markiert und übersprungen.
5. **Datenschutz** (relevant ab den Ausbaustufen mit Freunden): Jeder sieht nur seine Daten (serverseitig erzwungen, nicht nur im Frontend versteckt), Passwörter nie selbst speichern, sondern über einen etablierten Login-Dienst, Google-Zugriffe mit minimalen Rechten (nur lesen).
6. **Keine Geheimnisse im Repo.** API-Schlüssel, Passwörter, Tokens kommen in `.env` (steht in `.gitignore`) bzw. in GitHub Secrets. Prüfe vor jedem Commit, dass nichts davon im Code landet. Erkläre mir, wo ich einen Schlüssel eintragen muss.

---

## 4. Version 1 – der Umfang

Version 1 ist bewusst klein. Alles andere kommt erst, wenn sie **mehrere Wochen stabil** läuft.

**In Version 1:**

1. `data/companies.csv` – meine Unternehmensliste, von mir pflegbar, mit mindestens diesen Spalten:
   `name, careers_url, ats_typ, ats_id, groesse_klasse, mitarbeitende_ca, kategorie, hauptsitz, aktiv, notiz`
   - `groesse_klasse` mit festen Stufen: `<50 | 50–249 | 250–999 | 1.000+` (entschieden 2026-11-07).
   - `kategorie`: **eine oder mehrere** aus der festen Liste in `data/kategorien.md`, getrennt durch `;`.
   - Fang mit **13 Unternehmen** an (Startliste vom 2026-11-07), nicht mit 100. Erst wenn die laufen, erweitern.
   - Vorfilter beim Abruf: nur Deutschland plus Remote; ohne Ausbildung, duales Studium, Praktikum, Werkstudent, Abschlussarbeit, Minijob/Aushilfe, Filial- und Verkaufsjobs.
2. **Scraper** (Python), der für jedes aktive Unternehmen die offenen Stellen holt und in einheitlicher Form speichert:
   `id, unternehmen, titel, ort, remote, url, erstmals_gesehen, zuletzt_gesehen, beschreibung_kurz`
   - Stellen, die nicht mehr auftauchen, werden als „geschlossen“ markiert, nicht gelöscht.
   - Neue Stellen seit dem letzten Lauf sind erkennbar.
   - Ein Fehler bei einem Unternehmen bricht nicht den ganzen Lauf ab; am Ende gibt es einen kurzen Bericht (welche Unternehmen fehlgeschlagen sind und warum).
3. **Regelmäßiger Lauf** automatisch (z. B. täglich), kostenlos, ohne dass mein Rechner an sein muss.
4. **Eine einfache Website** mit Liste und Filtern (Größe, Kategorie, Ort, Remote, Stichwort, „neu seit …“). Nur für mich, kein Login nötig, weil in Version 1 keine persönlichen Daten darin stehen.
5. `README.md` auf Deutsch: was das Projekt tut, wie ich ein Unternehmen hinzufüge, wie ich einen Lauf manuell starte, was zu tun ist, wenn etwas kaputt ist.

**Vorschlag für den technischen Aufbau von Version 1** (in der Planungsphase mit mir bestätigen, nicht stillschweigend übernehmen):

- Python-Skript + Daten als JSON/SQLite im Repo
- GitHub Actions als kostenloser Zeitplan
- statische Seite (z. B. GitHub Pages) mit Filtern im Browser, ohne Server
- Begründung: keine Datenbank, die pausiert oder gelöscht wird, keine Kosten, die Historie liegt versioniert im Repo.
- Kläre vorher mit mir, ob das Repo öffentlich oder privat sein soll, und was das für Pages und Actions-Minuten bedeutet.

**Ausdrücklich nicht in Version 1:** Login, Bewerbungs-Tracker, Freunde, Gmail, Kalender, monatliche Übersichten, KI-Auswertung der Stellen.

---

## 5. Scraping-Strategie (Reihenfolge einhalten)

Für jedes Unternehmen nimmst du den **einfachsten, stabilsten und billigsten** Weg, der funktioniert:

1. **Öffentliche Schnittstelle des Bewerbermanagement-Systems (ATS).** Viele Karriereseiten laufen über Personio, Greenhouse, Lever, SmartRecruiters, Workday, SuccessFactors o. Ä., die öffentliche Feeds oder JSON-Endpunkte für ihre Stellenlisten haben. Erkenne das ATS an der Karriereseite und trage `ats_typ` und `ats_id` in `companies.csv` ein. Pro ATS-Typ gibt es **einen** wiederverwendbaren Adapter, nicht pro Unternehmen eigenen Code.
2. **Statisches HTML** parsen, wenn die Stellen ohne JavaScript im Seitenquelltext stehen.
3. **Playwright** (Browser-Automatisierung), nur wenn die Stellen erst nach JavaScript, Klicks oder Scrollen erscheinen. Langsamer und anfälliger, deshalb nur als Ausnahme.
4. **Firecrawl** nur als letzter Ausweg und **nur nach meiner Zustimmung**, weil es pro Seite Guthaben verbraucht. Wenn du es vorschlägst, schätze den monatlichen Verbrauch.

Weitere Regeln:
- Kein Sprachmodell zum Auslesen von Stellen im laufenden Betrieb.
- Speichere keine kompletten Stellentexte dauerhaft, nur eine Kurzfassung und den Link.
- Teste jeden neuen Adapter an mindestens zwei echten Unternehmen und zeig mir das Ergebnis (Anzahl Stellen, drei Beispieltitel).

---

## 6. Ausbaustufen (Reihenfolge, jeweils eigene Planungsrunde)

Jede Stufe startet mit einer eigenen Planung (siehe Abschnitt 7, Phase 1). Vorher: Version 1 läuft stabil, Backup existiert.

**Stufe 2 – Bewerbungs-Tracker (nur für mich)**
- Datensätze: Bewerbung (verknüpft mit Stelle/Unternehmen), Status-Verlauf, Datum, Gehalt (Wunsch/Angebot), Ansprechpartner, Notizen, Dateien (CV-Version, Anschreiben), gespeicherter Stellenauszug (die Stelle kann später offline gehen), Vorlagen.
- Ab hier gibt es persönliche Daten → Login nötig, Daten nicht mehr öffentlich. Hosting/Datenbank neu bewerten nach den Regeln in Abschnitt 3.
- Export-Funktion (CSV/JSON) für alle meine Daten.

**Stufe 3 – Konten für Freunde**
- Eigener Login pro Person über einen etablierten Login-Dienst.
- Strikte Trennung der Daten auf Datenbankebene (z. B. Row-Level-Security), mit Test, der beweist, dass Person A die Daten von Person B nicht sieht.
- Kurzer Datenschutzhinweis auf der Seite; jede Person kann ihre Daten exportieren und löschen.
- Die gemeinsame Stellenliste bleibt geteilt, Tracker-Daten sind privat.

**Stufe 4 – Gmail und Google Kalender**
- Nur Lesezugriff, nur auf das Nötigste (Termine mit Interview-Bezug, Mails von der Domain des Unternehmens).
- Vorher klären und mir erklären: Wie bleibt die Verbindung dauerhaft bestehen, ohne alle paar Tage neu anmelden zu müssen? Was bedeutet die Google-Prüfpflicht für Gmail-Zugriffe, wenn Freunde es auch nutzen? Gibt es eine einfachere Alternative (z. B. Kalender-Export-Link statt API)?
- Ergebnis: Eine „Interview-Vorbereitung“-Ansicht pro Termin.

**Stufe 5 – Monatliche Unternehmensübersichten**
- Ziel: Kandidaten für meine Unternehmensliste finden (Startups & Funding, Größe, Top-Arbeitgeber nach Kategorie).
- **Zielbild (2026-11-07):** Die Liste soll monatlich automatisch aktualisiert werden, aus offiziellen Rankings und Umfragen (beliebteste, beste Bewertungen, bestes Gehalt, bestes Funding, beste Arbeitgeber usw.). Ob neue Firmen automatisch übernommen werden oder als Vorschlag kommen, wird in der Planungsrunde dieser Stufe entschieden.
- Vorher prüfen, welche Quellen das Abrufen erlauben (offizielle APIs, offene Daten wie Wikidata, RSS, Pressemitteilungen). Keine Quellen scrapen, deren Bedingungen das verbieten.
- Ergebnis landet als Vorschlagsliste, die ich prüfe; nichts wird automatisch in `companies.csv` übernommen.

---

## 7. Arbeitsweise und Skills

In dieser Claude-Code-Installation sind folgende Skills/Plugins vorgesehen. **Prüfe am Anfang der ersten Sitzung mit `/plugin` und `/skills`, welche davon tatsächlich installiert sind**, und sag mir, was fehlt.

| Skill | Rolle in diesem Projekt |
|---|---|
| **Superpowers** | Hauptmethode: Planen, Umsetzen in kleinen Schritten, Testen, systematische Fehlersuche |
| **Matt Pocock – nur `/grill-me`** | Anforderungen klären, bevor geplant wird. Die übrigen Matt-Pocock-Skills nicht verwenden, sie konkurrieren mit Superpowers |
| **Karpathy Skills** | Nachfragen statt annehmen, einfache Lösungen, nur das ändern, was nötig ist |
| **Ponytail** | Code klein halten; nach größeren Änderungen `/ponytail-review` zum Aufräumen |
| **Playwright** | (a) Karriereseiten mit JavaScript auslesen, wenn Schritt 1–2 aus Abschnitt 5 scheitern; (b) die eigene Website durchklicken und testen |
| **Firecrawl** | Letzter Ausweg beim Scraping, nur nach Zustimmung (kostet Guthaben, API-Schlüssel muss ich erst hinterlegen) |
| **I have ADHD** | Antwortstil: kurz und handlungsorientiert. Gilt nur für die Form, nicht für den Inhalt – Rückfragen, Risiken und meine To-dos werden trotzdem genannt |

Nicht installiert und nicht vorschlagen: Perplexity-Skill, OmniRoute. Für Recherchen nutzt du deine eingebaute Websuche.

**Ablauf für jede Version bzw. Ausbaustufe:**

1. **Klären:** `/grill-me` – Frage für Frage, bis Umfang und Entscheidungen feststehen.
2. **Planen:** Superpowers-Brainstorming und -Plan. Der Plan landet in `docs/plans/<datum>-<thema>.md`, Schritte so klein, dass jeder einzeln testbar ist.
3. **Freigabe:** Ich bestätige den Plan, bevor du Code schreibst.
4. **Umsetzen:** Plan schrittweise ausführen, nach jedem Schritt testen und committen.
5. **Prüfen:** Tests laufen lassen; bei Website-Änderungen mit Playwright durchklicken; `/ponytail-review` nach größeren Änderungen.
6. **Abschluss:** `docs/STATUS.md` und ggf. diese Datei aktualisieren, mir in wenigen Sätzen sagen, was jetzt geht und was ich tun muss.

Bei Fehlern: Ich beschreibe nur, was passiert ist (oder kopiere die Fehlermeldung). Du suchst systematisch die Ursache, bevor du etwas änderst, und erklärst mir in einem Satz, woran es lag.

---

## 8. Projekt-Gedächtnis (spart Tokens zwischen Sitzungen)

Halte diese Dateien aktuell, damit du nicht jedes Mal das ganze Repo lesen musst:

- `docs/STATUS.md` – was funktioniert, was gerade in Arbeit ist, bekannte Probleme, nächster Schritt. Lies sie **zu Beginn jeder Sitzung**.
- `docs/ENTSCHEIDUNGEN.md` – jede getroffene Entscheidung mit Datum und einem Satz Begründung (z. B. „Hosting: X, weil Daten nicht ablaufen“).
- `docs/plans/` – die Pläne aus Phase 2.
- `data/kategorien.md` – die feste Kategorienliste und Größenklassen.

---

## 9. Code- und Repo-Regeln

- Sprache: Python für Scraper und Skripte, so wenig Abhängigkeiten wie möglich. Website so einfach wie möglich (kein großes Framework, solange es nicht nötig ist).
- Kleine, verständliche Dateien; keine Abstraktionen „für später“.
- Tests für jeden Scraper-Adapter (mit gespeicherten Beispielantworten, damit Tests nicht vom Internet abhängen).
- Kleine Commits mit deutscher, verständlicher Nachricht. Kein Force-Push, keine Historie umschreiben.
- `.gitignore` von Anfang an mit `.env`, lokalen Datenbanken mit persönlichen Daten, Browser-Caches.
- Keine neuen kostenpflichtigen Dienste, keine neuen Konten bei Drittanbietern ohne meine Zustimmung.
- Bevor du ein fremdes Paket hinzufügst: kurz sagen, wofür, und ob es gepflegt wird.

---

## 10. Wann eine Aufgabe fertig ist

- Es läuft, und du hast es selbst ausgeführt bzw. getestet (nicht nur „sollte funktionieren“).
- Tests sind grün.
- Keine Geheimnisse im Code.
- `docs/STATUS.md` ist aktuell.
- Du hast mir gesagt: was jetzt geht, was ich ggf. selbst tun muss, und was der sinnvolle nächste Schritt ist.

---

## 11. Erste Sitzung – so startest du

1. `/plugin` und `/skills` prüfen, mir sagen, welche der Skills aus Abschnitt 7 fehlen.
2. Prüfen, ob Git, Python und Node.js installiert sind; falls nicht, mir Schritt für Schritt erklären, wie ich sie installiere.
3. Mit `/grill-me` Version 1 klären, insbesondere:
   - Welche 10 Unternehmen für den Start?
   - Welche Kategorien und Größenklassen?
   - Repo öffentlich oder privat?
   - Wie oft soll gescrapt werden?
   - Wo und wie will ich die Seite aufrufen (Handy, Laptop)?
4. Danach Plan für Version 1 erstellen und mir zur Freigabe vorlegen.
