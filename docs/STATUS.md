# STATUS – Projekt „Jobsuche“

Stand: 2026-11-07

## Was funktioniert
- Grundgerüst des Repos liegt an: `scraper/`, `data/`, `site/`, `tests/`, `README.md`, `requirements.txt`, `.gitignore`.
- Noch kein Code und noch kein Commit.

## Umgebung (geprüft am 2026-11-07, lokal auf Windows 11)
| Programm | Status |
|---|---|
| Git | 2.56.0 installiert. Name und E-Mail für Commits sind **noch nicht eingerichtet**. |
| Python | 3.12.10 über `py` installiert. Der Befehl `python` öffnet nur den Microsoft Store, deshalb immer `py` verwenden. |
| Node.js / npm | v24.22.2 / 11.19.1 installiert |
| GitHub CLI (`gh`) | Nicht installiert. Erst später nötig, und auch dann nur vielleicht. |

## Skills aus CLAUDE.md Abschnitt 7
Keiner der vorgesehenen Skills ist installiert: Superpowers, grill-me, Karpathy Skills, Ponytail, Playwright, Firecrawl und I have ADHD fehlen alle.
Bis sie installiert sind, arbeitet Claude deren Methoden von Hand ab, zum Beispiel die Fragerunde im grill-me-Stil.

## In Arbeit
- Abschnitt 11, Schritt 3 (Fragerunde V1): **abgeschlossen** am 2026-11-07.
- Schritt 4: Plan geschrieben → `docs/plans/2026-11-07-version-1.md` (**wartet auf Freigabe**).
- Angelegt: `docs/ENTSCHEIDUNGEN.md`, `data/kategorien.md`; CLAUDE.md angepasst (13 Firmen, mehrere Kategorien, Vorfilter, Zielbild).
- Git-Identität im Repo gesetzt (testgaly99 / markgaly99@gmail.com).
- Skills: Superpowers, Karpathy, Ponytail, I have ADHD installiert. **Fehlen noch:** Playwright, Firecrawl (nicht in Plugin-Liste); grill-me liegt in `~/.agents/skills` statt `~/.claude/skills`.

## Bisherige Antworten (Fragerunde V1)
- Repo: **öffentlich** + Website über **GitHub Pages** (Weg 1, entschieden 2026-11-07). GitHub-Konto vorhanden.
  - Grund: am einfachsten, kein zweiter Dienst; im Repo stehen nur öffentliche Stellenanzeigen.
  - Vor dem Plan prüfen: 60-Tage-Inaktivitätsregel für Zeitpläne in öffentlichen Repos (zählen Commits vom täglichen Lauf als Aktivität?).
- Geräte: **Handy und Laptop gleich oft** → Seite passt sich der Bildschirmgröße an.
- Abruf: **1× täglich automatisch, ca. 6 Uhr** (Verspätung durch GitHub möglich); manueller Start per Knopf nur als Zusatz.
- Kategorien: **mehrere pro Unternehmen** erlaubt. Liste bestätigt (kommt später nach `data/kategorien.md`):
  Bank · Versicherung · Asset Management & Investment · Fintech · Unternehmensberatung · Wirtschaftsprüfung & Steuern · Recht · Personal & Recruiting · Marketing, Medien & Werbung · Tech & Software · IT-Dienstleistung · Telekommunikation · Gaming & Entertainment · Automobil & Mobilität · Maschinenbau & Industrie · Chemie & Pharma · Medizintechnik & Gesundheit · Energie & Versorgung · Luft- & Raumfahrt, Verteidigung · Handel & E-Commerce · Konsumgüter & Lebensmittel · Reise, Hotel & Gastronomie · Mode & Lifestyle · Logistik & Transport · Immobilien & Bau · Bildung & Forschung · Öffentlicher Sektor & NGO · Nachhaltigkeit & Klima · Startup / Venture-finanziert · Sonstige
- Größenklassen (`groesse_klasse`): **<50 | 50–249 | 250–999 | 1.000+** (Größe der ganzen Unternehmensgruppe).

- Vorfilter beim Abruf: **nur Deutschland (+ Remote) und bestimmte Stellenarten ausschließen** (Variante C). Raus (per Wort im Titel): Ausbildung, Duales Studium, Praktikum, Werkstudent, Abschlussarbeit, Minijob/Aushilfe, Filial-/Verkaufsjobs. Drin: Trainee/Graduate/Junior. Bericht zählt herausgefilterte Stellen pro Unternehmen.
- Startliste **13 Unternehmen** (bestätigt; weicht bewusst von „10“ in CLAUDE.md ab): Helsing, Neura Robotics, Quantum Systems, Proxima Fusion, The Exploration Company, Techniker Krankenkasse, dm-drogerie markt, Deutsche Bundesbank, Porsche, Controlware, Taktile, telli, Plato. Größen + ATS noch prüfen; nicht abrufbare Firmen werden mit Rückmeldung getauscht.

## Zielbild (nicht vergessen!)
- Unternehmensliste soll **monatlich automatisch** aktualisiert werden, aus offiziellen Rankings/Umfragen: beliebteste, beste Bewertungen, bestes Gehalt, bestes Funding, beste Arbeitgeber usw. (= Stufe 5 in CLAUDE.md).
- Bewusst **nach** Version 1. Bis dahin: Startliste einmalig von Hand aus solchen Rankings recherchiert.
- Offen für Stufe 5: welche Quellen das Abrufen erlauben; ob neue Firmen automatisch übernommen werden oder als Vorschlagsliste (CLAUDE.md: Vorschlagsliste).

## Offene To-dos für mich
- Plan freigeben.
- Optional: Playwright + Firecrawl nachinstallieren.

## Nächster Schritt
Nach Freigabe: Plan Phase A, Task 1 umsetzen.
