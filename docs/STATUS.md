# STATUS – Projekt „Jobsuche“

Stand: 2026-11-07 (nach Task 10)

## Was funktioniert
- Scraper für 4 Unternehmen (Helsing, The Exploration Company, Taktile, telli) mit Vorfilter und Bericht (`data/bericht.md`).
- Website mit Filtern (`site/`).
- Tests (`py -m pytest`, `node --test tests/test_app.js`).
- README mit Anleitung, Backup und Wiederherstellung.

## Umgebung (geprüft am 2026-11-07, lokal auf Windows 11)
| Programm | Status |
|---|---|
| Git | 2.56.0, Name/E-Mail für dieses Repo eingerichtet (testgaly99). |
| Python | 3.12.10 über `py` installiert. Der Befehl `python` öffnet nur den Microsoft Store, deshalb immer `py` verwenden. |
| Node.js / npm | v24.22.2 / 11.19.1 installiert |
| GitHub CLI (`gh`) | Nicht installiert. Erst später nötig, und auch dann nur vielleicht. |

## Skills aus CLAUDE.md Abschnitt 7
Superpowers, Karpathy, Ponytail und I have ADHD sind installiert. **Fehlen noch:** Playwright und Firecrawl. grill-me liegt in `~/.agents/skills` statt `~/.claude/skills`.

## In Arbeit
- Task 9: täglicher Lauf und Veröffentlichung (GitHub Actions + Pages), gemeinsam mit dem Nutzer.

## Bekannte Probleme
- Die Website wurde noch nicht im Browser angesehen.
- Die eingecheckten Daten stammen von vor der Korrektur des Dual-Use-Filters.
- Phase B (9 weitere Unternehmen) ist noch offen.

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
- Optional: Playwright + Firecrawl nachinstallieren.

## Nächster Schritt
Task 9: täglicher Lauf und Veröffentlichung, zusammen mit dem Nutzer.
