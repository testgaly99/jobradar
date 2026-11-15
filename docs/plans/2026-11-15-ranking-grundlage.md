# Phase 4, erstes Paket: Ranglisten zuordnen und filtern

Stand: 2026-11-15. **Technischer Unterbau vom Nutzer freigegeben; konkrete Ranking-Auswahl ausdrücklich auf später mit Claude verschoben.**

## Anlass und Ergebnis

Der Nutzer verschiebt die finale Groq-Probe und möchte mit einem anderen Arbeitspaket beginnen. Phase 4 ist laut `CLAUDE.md` 6 als Nächstes vorgesehen. Dieses erste Paket benötigt weder Groq noch persönliche Daten und lässt die Auswahl konkreter Quellen zunächst offen.

Nach Umsetzung können angemeldete Nutzer vorhandene Stellen nach der Rangliste ihrer Firma filtern und Rang, Ausgabe sowie Quelle sehen. Beispiel ausschließlich mit künstlichen Daten: Eine Testfirma steht auf „Test-Rangliste 2026“, Platz 12. Ihre zwei offenen Stellen erscheinen bei diesem Filter genau einmal pro Stelle; die Quelle ist verlinkt. Eine Firma kann mehreren Listen angehören.

**Entscheidungsvorschlag:** Mit der Zuordnung vorhandener Firmen beginnen. Alternative wäre sofort die automatische Aufnahme neuer Firmen. Dafür sind Quellenprüfung, Firmenidentität und Erkennung der Bewerbungssysteme noch zu klären. Der kleinere Einstieg liefert zuerst eine prüfbare Grundlage für den wichtigsten Filter.

## Verbindliche Grenzen

- Nur `jobradar-entwurf`, Zweig `entwurf-ui`; bestehende lokale Dokumentationsänderungen erhalten.
- Die Verschiebung ist keine Freigabe der Groq-Probe, der ersten Live-Auswertung oder eines Uploads. Der Groq-Haltepunkt gilt weiter für das Groq-Paket.
- Keine Zugangsdaten lesen, keine Live-Datenbank, keine Groq-Aufrufe; alle Beispieldaten künstlich.
- Keine neue Bibliothek, kein neues Konto, keine Änderung der Kanban-Animationen.
- Ranglisten bleiben gemäß `CLAUDE.md` 4.6 nur angemeldet zugänglich, auch über direkte Datenbankabfragen.
- Datenbankänderung ausschließlich als Migrationsdatei vorbereiten; Migration spielt der Nutzer später selbst ein. Kein Push oder Merge.
- Die Quellenrecherchen sind Vorarbeiten, keine aktuelle Rechtsfreigabe. Keine Quelle wird allein aufgrund dieses Plans abgerufen oder aktiviert. Vor echtem Import aktuelle Primärquellen prüfen und Auswahl mit dem Nutzer klären.

## Umfang und Verhalten

1. „Liste“ ist der erste fachliche Filter, vor Größe und Branche, mit Anzahl offener sichtbarer Stellen aktiver Firmen. Die Zahlen folgen dem bisherigen Zählverhalten der übrigen Filter; keine allgemeine Überarbeitung aller Trefferzahlen.
2. Mehrere gewählte Listen werden mit ODER verbunden; andere Filter weiterhin mit UND. Adressparameter speichern stabile Listenkennungen, nicht Anzeigenamen.
3. Angezeigt wird je Liste die neueste freigegebene, noch nicht abgelaufene Ausgabe. Eine neuere, noch nicht freigegebene Ausgabe verdrängt keine gültige freigegebene Ausgabe. Ausgabe endet spätestens 13 Monate nach Veröffentlichung oder bei Ablösung durch die nächste freigegebene Ausgabe. Keine belegte Veröffentlichung = noch keine Aktivierung.
4. Bei jeder angezeigten Firma stehen Listenname, Ausgabe/Jahr, Rang soweit vorhanden und Quell-Link; Quellen-/Lizenzhinweis sichtbar. Eine unplatzierte Liste erhält keinen erfundenen Rang.
5. „Rang“ als Sortierung nur bei genau einer ausgewählten Liste; aufsteigend, unplatzierte Firmen zuletzt, danach Firmenname und Stellen-ID als stabile Reihenfolge. Bei mehreren Listen bleibt die bestehende Sortierung, da Ränge verschiedener Listen nicht vergleichbar sind.
6. Ohne Listenauswahl bleiben alle bisherigen Firmen und Stellen verfügbar. Dieses Paket entfernt keine Firmen, blendet keine Stellen wegen fehlender Rangliste aus und löscht keine Bewerbungen.
7. Gäste erhalten weder Listenfilter noch Ranglistenangaben. Übergebene Listenparameter werden für Gäste verworfen, ohne die bestehende öffentliche Stellenansicht zu verändern.
8. Ohne Migration bleibt die bisherige Stellenansicht nutzbar. Bei einer gewählten, unbekannten oder abgelaufenen Liste erscheint ein klarer Hinweis statt einer stillschweigend ungefilterten Trefferliste. Technische Fehler nicht als „keine Treffer“ ausgeben.

## Daten und vorhandene Anschlussstellen

Geprüft: `companies.name` ist der vorhandene Firmenschlüssel; `jobs.unternehmen` verweist darauf. `web/lib/filter.ts` verarbeitet Adressparameter, `web/lib/stellen.ts` Filter/Sortierung/Seitennavigation, `web/app/stellen/page.tsx` die Liste. `facetten()` wird auch von Gästen genutzt; Migration 007 erzwingt deren Spaltenrechte.

Vorgeschlagenes kleines relationales Modell:

- `ranking_listen`: stabile Kennung, Anzeigename, Herausgeber, aktiv/abgeschaltet.
- `ranking_ausgaben`: Liste, eindeutige Ausgabekennung, Jahr, Veröffentlichungsdatum, Abruf-/Prüfdatum, Quell-Link, Lizenz-/Nutzungshinweis, Ablaufdatum, Freigabestatus.
- `ranking_firmen`: Ausgabe, vorhandener Firmenname, optionaler positiver Rang; eindeutig je Ausgabe/Firma. Fremdschlüssel mit Aktualisierung bei Firmenumbenennung. Gleicher Rang für mehrere Firmen erlaubt.

Schreiben nur durch die Serverrolle, für die bereits vorhandenen Scraper-Schreibrechte. Angemeldete Nutzer lesen ausschließlich aktive freigegebene Ausgaben und deren Zuordnungen. Für Gäste sämtliche Tabellenrechte und Funktionsaufrufe sperren. Auch Funktionen standardmäßig der allgemeinen Rolle `PUBLIC` entziehen; Daten-RPCs mit `security invoker` und festem leerem `search_path`. Eine eng begrenzte boolesche Hilfsfunktion für die aktuelle Ausgabe verwendet `security definer`, weil eine Selbstabfrage der Ausgabentabelle innerhalb ihrer eigenen RLS-Regel rekursieren würde. Diese Funktion liest nur Ranglistenmetadaten, keine Nutzertabellen, und ist für Gäste gesperrt.

Die bestehende Gastfunktion `facetten()` bleibt unabhängig von Ranglistentabellen. Ranglisten-Zahlen separat und nur angemeldet laden. Filtern und globale Rangsortierung in der Datenbank vor Seiteneinteilung ausführen; keine vollständigen Firmenlisten in lange Adressfilter laden und keine Sortierung nur der 50 bereits geladenen Stellen. Zuordnungen mittels Existenzprüfung verwenden, damit Mehrfachmitgliedschaften weder Stellen noch Zahlen vervielfachen.

## Umsetzung nach Freigabe

- [x] **1. Datenmodell und Zugriffsschutz als Datei.** `010_rankings.sql` mit drei Tabellen, Fremdschlüsseln, Datums-/Rangprüfungen, Rechten und vier Funktionen vorbereitet. Nummer auf Kollision geprüft, keine Nutzertabelle umgebaut. SQL-Abnahmefälle in `tests/sql/rankings.sql`; Ausführung bleibt offen.
- [x] **2. Eingabeprüfung und ausdrückliche Zuordnung.** `scraper/rankings.py` prüft normalisierte Listenausgaben mit bekannten Firmen; unbekannte/doppelte Firmen, ungültige Ränge/Daten/URLs werden abgelehnt. Wiederholte Eingaben liefern identische Zeilen. Gemäß späterer Umfangsklärung oben/unten kein Importbefehl und keine Schreibschnittstelle in diesem Paket: atomare Ersetzung folgt mit Quellenentscheidung und Bereinigung.
- [x] **3. Filteranschluss und Rangsortierung.** URL, Abfrage und Gesamtzahl erweitert; gebundene Parameter, serverseitige Filterung und Rangfolge vor Seiteneinteilung. Bestehende Filter bleiben angeschlossen. HTTP-Vertrag und Pagination über 1.000 Datensätze offline geprüft; tatsächliches SQL-/PostgREST-Verhalten bleibt offen.
- [x] **4. Anzeige.** Listenfilter vor Größe/Branche, Rang-/Quell-/Lizenzangaben in Liste und Detailseite; Gastparameter verworfen. Ohne aktive Ausgaben kein neuer Filter. Bestehender Stil, nur `utilitaer.css` ergänzt; Next.js-Hinweise gelesen. Chrome-Klicktests mit künstlichen Antworten bestanden.
- [ ] **5. Vollständige Datenbankabnahme.** Lokaler Teil abgeschlossen: 430 Python-Offline-Tests, 153 Webtests, Typprüfung, isolierter Produktions-Build und Chrome-Klicktests bestanden; unabhängiges Review und Übergabe dokumentiert. SQL-Testskript noch in isolierter Testdatenbank ausführen, bevor Migration/echte Daten freigegeben werden. Kein PostgreSQL/Docker vorhanden; nichts installiert und keine Live-Datenbank als Ersatz verwendet. Keine Quelle aktivieren, bevor Nutzungskreis, Erlaubnis und Bereinigung im Quellenpaket geklärt sind.

### Prüfstand 2026-11-15

Build in frischer lokaler Kopie ausschließlich freigegebener Quelldateien, ohne `*.env*`, mit künstlichen Supabase-Einstellungen, bereinigter Prozessumgebung und gesperrtem HTTP-Zugriff (`next build --webpack`). Typprüfung zusätzlich im Arbeitsordner. Chrome auf `localhost:3002` gegen diesen Build; alle Serverantworten synthetisch, externe Browseranfragen blockiert. Geprüft: Gast ohne Ranking-Abfragen, Listenauswahl/ODER, Rangoption nur bei einer Liste, Detailseite mit Quellenangaben, Zurücksetzen, ungültige Liste, fehlende Migration, Katalogfehler und leere Ausgaben auf Handygröße. Keine Prüfung echter Anmeldung, Datenbankrechte oder globaler SQL-Sortierung durch diese Browserprobe. Testserver anschließend beendet.

Unabhängiges Review fand Unterschiede bei Jahresgrenzen, Prüfdatum und Quell-URL-Darstellung. SQL/Validator abgeglichen, IDN-Adressen normalisiert und deren Längengrenze nach Normalisierung geprüft; Python-Regressionstests jeweils zuerst fehlgeschlagen, danach grün. SQL-Tests um passende Grenzfälle ergänzt, aber nicht ausgeführt. `/ponytail-review` nicht ausgeführt; stattdessen zusätzliche unabhängige Codeprüfung ohne Änderungsrechte. Lokale Prüfhilfen und vollständiger Verlauf bleiben ausschließlich in `.superpowers/sdd/2026-11-15-ranking-grundlage/`.

## Aussagekräftige Abnahmefälle

- Firma auf zwei gewählten Listen: drei offene Stellen ergeben drei Treffer, nicht sechs; geschlossene/versteckte Stellen und inaktive Firmen ausgeschlossen.
- Filter ODER innerhalb Liste, UND mit Branche/Stadt/Suchtext; Auswahl, Zurücksetzen und Seitennavigation erhalten den richtigen Zustand.
- Rangsortierung über mehrere Seiten, gleiche Ränge, fehlender Rang und stabile Reihenfolge; mindestens 1.001 Zuordnungen ohne stilles Abschneiden.
- Ausgabewechsel, abgeschaltete Quelle, Ablaufgrenze 13 Monate, ungeprüfte neue Ausgabe und unbekannte Listenkennung.
- Gast kann Tabellen und Funktionen direkt nicht lesen; angemeldeter Nutzer kann keine Zuordnungen schreiben. Gäste-Stellenliste und bisherige Facetten funktionieren weiter.
- Ungültige URLs wie `javascript:` und HTML in Namen/Quellen werden abgewiesen bzw. als Text sicher dargestellt.
- Fehlende Migration, Datenbankfehler und keine Treffer klar unterscheidbar; kein stiller Rückfall auf ungefilterte Treffer bei gewählter Liste.
- Keine Bewerbungen, Nutzerprofile oder Groq-Einstellungen werden verändert.

## Danach separat klären

**Abgleich aller Projektdokumente am 2026-11-15:** Quellenfreigabe muss zwischen Eigennutzung und Freigabe an andere Angemeldete unterscheiden; Anmeldung allein ist keine Nutzungserlaubnis. Ausblenden abgelaufener Ausgaben ist noch keine Löschung. Deshalb keine echten Ranking-Daten aktivieren, bevor Nutzungskreis und fristgerechte Bereinigung im späteren Quellen-/Importpaket umgesetzt und geprüft sind. Der reine Validator in diesem Paket schreibt nichts; eine atomare Import-/Ersetzungsschnittstelle folgt erst im Quellenpaket.

Auswahl der ersten Quellen und aktuelle Nutzungserlaubnis; kostenpflichtige Teilnahme der ausgezeichneten Firmen; Behörden/Forschung; Konzern gegenüber Marke/Karriereportal; Deutschland/Remote-Definition. Diese Fragen sind in `ranking-recherche-v3.md` offen und werden hier nicht vorentschieden. Automatische Quellenadapter, 4-Wochen-Aktualisierung einschließlich fristgerechter Bereinigung, neue Firmen/ATS, Zusatzfirmen, Prestige-Ausnahmen, Mistral und Telegram folgen in eigenen Paketen.

## Nutzerfreigabe

2026-11-15: Der Nutzer beauftragt die Vorbereitung der Filterstruktur und Datenbanken; Auswahl der Rankings später mit Claude. Damit sind Datenmodell, Migration als Datei, neutrale Eingabeprüfung, Filteranschluss und Tests mit künstlichen Daten freigegeben. Keine echten Rankings vorauswählen oder eintragen. Ohne aktive Daten bleibt die Oberfläche unverändert; ein vorhandener Listenfilter wird erst bei gültigen freigegebenen Ausgaben eingeblendet. Datenbank-Ausführung und Veröffentlichung bleiben ausgeschlossen.
