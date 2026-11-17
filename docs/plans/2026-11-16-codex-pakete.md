# Codex-Arbeitspakete 2026-11-15/16 – Sammelbericht

Stand: 2026-11-17. Ein Dokument für alle **abgeschlossenen** Codex-Pakete (Katalog `eeced3f`, Kandidaten 15–20 auf `ae9c463`, Nachprüfung auf `658696d`). Zusammengeführt aus dem Arbeitskatalog, den Einzelplänen, dem Nachprüfbericht und der Prüfvorbereitung (Verbleib siehe letzter Abschnitt; alte Fassungen in Git). **Testzahlen stehen nur im [Agentenprotokoll](../agenten-protokoll.md)** (je Paket ein Eintrag mit Uhrzeit); hier steht nur, welche Prüfarten bestanden. Noch offene Arbeit hat eigene Pläne: [CV-Abgleich](2026-11-16-cv-abgleich.md), [Firmenportal-Erkennung](2026-11-15-firmenportal-erkennung.md), [Ein-Klick-Import](2026-11-16-ein-klick-import.md), [Ranking-Grundlage](2026-11-15-ranking-grundlage.md).

## Regeln, die für alle Pakete galten

- **„Ohne neue Entscheidungen“** heißt: keine neuen fachlichen Regeln, Anbieter, Quellen, Gebühren, Datenformate oder Nutzerabläufe. Technische Umsetzung bestehender Regeln durfte Codex selbst übernehmen. Jedes Paket hat einen konkreten vorhandenen Anschluss; keine Universalbibliotheken auf Vorrat.
- **Voraussetzung je Paket:** kleinen Umfang vorher festhalten, bestehende Regeln erhalten, mit künstlichen Daten prüfen, sofort anschließen. Keine echten CVs/Nutzerdaten, Live-Datenbank, Zugangsdaten, Migrationsausführung, Installation oder Veröffentlichung. Dem Nutzer keine regelmäßigen manuellen Starts übertragen.
- **Arbeitsweise:** Tests zuerst (rot, dann grün; wo bestehendes Verhalten nur abgesichert wurde, keine roten Tests erzwungen). Eigener Review statt Helfer (Sitzungsregel gegen unaufgeforderte Delegation), Claudes Prüfung separat. Python über den direkten Python-3.12-Interpreter, weil der `py`-Launcher die Installation nicht erkannte; lokaler `PYTEST_DEBUG_TEMPROOT`, weil der Standard-Tempordner gesperrt war. Browserproben in Chrome auf `localhost:3002`, 1280/390 Pixel, künstliche Antworten, externe Anfragen blockiert, Server danach beendet. Lokale Hilfen unter `.superpowers/sdd/<plan>/` (nicht versioniert).
- **Grenze aller Nachweise:** Ersatztests belegen weder echtes SQL/RLS/PostgREST noch Modellqualität.

## Vorläufer am 2026-11-15

- **Stellendaten-Grundlage** (Nutzerauftrag: Codevorarbeit für CV/Filter ohne offene Details vorwegzunehmen). Ziel: vorhandene Datenleser aus `steckbrief.ts` nach `web/lib/stellendaten.ts` (`leseGehalt`, `leseSteckbrief`, ohne Next.js/Netz). Ergebnis: Gehalt mit endlichen positiven Grenzen, min ≤ max, EUR/CHF, Jahr/Monat/Stunde, ohne Umrechnung; Erfahrung 0 bleibt von „unbekannt“ unterscheidbar und wird in der Anzeige korrekt gezeigt; Rückgaben entkoppelt. `sicherheit=false` ist kein Nachweis „nicht erforderlich“. `karte.ts` behält sein lockeres Format. Tests: Web, Typprüfung, isolierter Build, Python-Suite, Chrome-Probe, unabhängiger Review ohne Befund.
- **Offline-Prüfeinstieg `py -B -m pruefe_offline`** (Nutzer: „Okay, fahre fort“). Schließt die Live-Module `tests/test_rls.py`/`test_konto_loeschen.py` vor Import aus, sperrt `*.env*`, Python-Netz und Prozessstarts, deaktiviert den Zugangsdaten-Lader, Plugin-Autoload und geerbte pytest-Optionen. Nur Testpfade unter `tests/`, `-k`, `--collect-only`. Schutz erst im Runner aktiv, keine Sandbox gegen bösartigen Code. Reviewer-Funde (Groß-/Kleinschreibung unter Windows → `casefold()`, `os.fork`/`forkpty`) behoben. Kein Linux-Lauf. Anleitung jetzt im [README](../../README.md#prüfen-ohne-zugangsdaten).
- **Arbeitskatalog** (Nutzer: „Was für Arbeitspakete hast du?“, N1): elf lokale Pakete, drei mit gesonderter Abnahme. **Vorarbeit spätere Phasen** (Anschlussstellen, Google-Recherche, künstliche Beispiele): jetzt in [phasen-vorarbeit.md](../phasen-vorarbeit.md) bzw. im CV-Plan.

## A: Pakete 1–11 (lokal fertig)

| Nr. | Ziel und Ergebnis | Entscheidung / Grenze | Geprüft (Zahlen: Agentenprotokoll) |
|---|---|---|---|
| 1 | Nutzer: ausschließlich Paket 1. `web/lib/zusammenfassung.ts:leseKi` liefert unabhängige, geprüfte Kopien von aufgaben (3–5)/rahmen (0–4)/muss (0–3)/benefits (0–2); lückenhafte Arrays ungültig; Format/Reihenfolge erhalten. | Kein neues Modul/Schema/KI-Aufruf. | Web, tsc, Build, Chrome-Probe; Fehler zuerst rot gesehen. |
| 2 | Nutzer: „Nun Nummer 2“. `web/lib/dokumente.ts:pruefeDokument` prüft Art cv/anschreiben/anlage, getrimmten Namen 1–120 Zeichen, Pfad `uid/` ohne `..`, echtes Kalenderdatum (vorher wurde 2026-02-29 angenommen); `dokumentAnlegen` schreibt nur geprüfte Daten, Anmeldung bleibt zuerst. | `datumOk` aus `bewerbung.ts` wiederverwendet; keine Datei-/MIME-Regeln. | Web, tsc, Build, Chrome-/Aktionsprobe. |
| 3 | Nutzer: „Weiter mit 3“. Gemeinsamer `seitenBereich` prüft Seite/Start/Ende mit `Number.isSafeInteger`; unsicher → Seite 1. Genutzt von `leseFilter`, `filterZuUrl`, `stellenAbfrage`. Größte sichere Seite bei 50 Treffern: 180143985094819. | Keine fachliche Treffergrenze; `PRO_SEITE` über `stellen.ts` erhalten. | Web, tsc, Build, Chrome über vier Seiten; Nachprüfung zusätzlich Grenzwerte mit BigInt. |
| 4 | Nutzer beauftragt 4, 5, 6 nacheinander. `web/tests/filter-vertrag.test.ts`: alle Filtergruppen, ODER innerhalb/UND zwischen Gruppen, Suche/Ausschluss, Gast, Sortierung, Pagination, Rücksetzen am echten Supabase-Abfrageobjekt. | Kein Fehler gefunden, kein Anwendungscode geändert. | Web, tsc, Build. |
| 5 | `web/lib/karte.ts:gehaltText` beschriftet explizite Stundenbeträge mit „Stunde“ (vorher fälschlich Jahr). | Keine Umrechnung; Priorität Angebot → Wunsch → Anzeige erhalten. | Web, tsc, Build, Chrome-Karten-/Detailprobe. |
| 6 | `markiere`/`leseAbschnitte` (`web/lib/anzeige.ts`, `web/app/abschnitte.tsx`): exakte Segmentrekonstruktion (Unicode, Emoji, CR/LF, Steuerzeichen, Regex-/HTML-Zeichen), kaputte Abschnitte kontrolliert. | Kein Fehler, Anwendung unverändert; Rückfall-Absatzformatierung bleibt (nicht umkehrbar). | Web, tsc, Build, Chrome-Probe; scheinbares Script bleibt Text. |
| 7 | Nutzer beauftragt 7 → 8 → 9 → 10. `datumOk` strikt (Jahre 0–99), `berlinZuIso` weist die Frühlingslücke ab, Herbstwahl unverändert; `parseAbschnitt` nutzt ihn. | Keine neue Auswahlpolitik für doppelte Herbststunde. | Web, tsc, Build, Chrome-Formularprobe. |
| 8 | Gemeinsame Fixture `tests/fixtures/stellendaten_vertrag.json` für Python-Schreiber (`steckbrief.py`, `ki.py`) und Web-Leser. | Bewusste Unterschiede erhalten (Python verlangt alle Schlüssel/trimmt, UI liest Teilprojektion). | Python, Web, tsc, Build. |
| 9 | Gesamtes Adapterergebnis vor Filter/`db.schreibe` prüfen (Pflichtfelder ext_id/titel/url, keine Doppel-IDs, Kurzmeldungen nur mit bekannter ID); JSON-/XML-Formprüfung in Adaptern; kaputte Firma schreibt nichts, andere laufen weiter, echte leere Liste bleibt gültig. | **Nachprüfung fand Lücke** (Sichtbarkeitsfelder), behoben, siehe unten. **Nachtrag 2026-11-17 (Claude):** Einzelne kaputte Stellen werden jetzt übersprungen statt die Firma abzubrechen, siehe unten. | Python. |
| 10 | Öffentliche Laufberichte/Konsolen/KI-Hinweise zeigen nur Klasse, HTTP-Status, geprüfte SQLSTATE-/PostgREST-Codes und Verarbeitungsschritt; `_req` bereinigt, Migrations-Fallbacks funktionieren weiter. | Verlust beliebiger Freitext-Fehlerdetails ist beabsichtigt. Private Zusatzfirmen bleiben eigenes Paket. | Python. |
| 11 | Isolierter Build-/Browserweg versioniert (`web/scripts/offline`, `npm.cmd run pruefe:build`/`pruefe:browser`): nur app/lib/public und Konfiguration kopiert, keine Umgebungsdateien/Symlinks, Netz/DNS gesperrt außer numerischem Loopback, eigener Server nur auf freiem Port 3002. | Kein neues Paket; CI kann den Build ohne Browser nutzen. | Web, tsc, Build, Browserlauf. |

Pakete 1, 2, 6 und 8 sind Eingangs-/Beleggrundlagen für den CV-Abgleich, 3, 4 und 5 für Filter/Daten. Daraus entsteht noch kein CV-Abgleich.

## B: Pakete 12–14 (vorbereitet, Abnahme offen)

- **12 – Globale Größensortierung.** Gespeicherte generierte Spalte `companies.groesse_rang` (<50→0, 50–249→1, 250–999→2, 1.000+→3, unbekannt→99); Standardabfrage ordnet über die Firmenbeziehung, Ranking-RPC über denselben Schlüssel im companies-JSON, danach erstmals_gesehen absteigend, id aufsteigend; Sortierung vor der Seitenbildung, alte Seitensortierung entfernt. Grundlagen: PostgREST Top-level/JSON Ordering, PostgreSQL Generated Columns (gelesen 2026-11-16). Seit 2026-11-17 steckt die Spalte in `010_rankings.sql` (eine mehrfach ausführbare Datei). **Offen:** Migration 010 ist Voraussetzung (ohne sie ist die Sortierung „Größe“ defekt, Prüfvermerk 2026-11-17); echte SQL-/PostgREST-Abnahme. Geprüft: Web, tsc, Build, Chrome über drei Seiten mit/ohne Ranking.
- **13 – Isolierte Datenbankabnahme.** `tests/sql/pruefe.py`: Standard nur verbindungsfreier Werkzeugvorcheck (psql/postgrest fehlen → Exit 2); SQL nur gegen 127.0.0.1:5433/`jobradar_ranking_test`, HTTP nur 127.0.0.1:3003 nach Testkennung; künstliche Fixture `http_daten.sql` (1005 Firmen/Stellen, zwei Listen). Getrennte commitende Fixture, weil zurückgerollte Transaktionen für HTTP unsichtbar sind. Anleitung: [tests/sql/README.md](../../tests/sql/README.md). **Offen:** Einrichtung (PostgreSQL mit Supabase-kompatiblem auth/storage) und Ausführung, gesondert freizugeben.
- **14 – Codeprüfung als Workflow.** `.github/workflows/codepruefung.yml`: getrennte Ubuntu-Jobs, Python 3.12 mit Offline-Einstieg, Node 24 mit Webtests/tsc/isoliertem Build; nur `contents: read`, keine Secrets, kein Cache; täglicher Lauf unverändert. Action-Tags anhand offizieller Doku geprüft (Workflow-Syntax, setup-node, setup-python v6, checkout v7). **Offen:** echter GitHub-/Linux-Lauf (kommt mit dem Push, Q21); kein YAML-/Actions-Prüfer lokal.

## Nachprüfung 1–14 und Reviewkorrekturen (2026-11-16)

Nutzer: „Prüfe die Umsetzung all deiner bisherigen Arbeitspakete“. Drei Befunde (Pakete 1–8, 10–12, 14 ohne konkreten Befund):
1. **Hoch, Paket 9:** Ashby (`if not j.get("isListed")`) und Recruitee (`status` null/0/false/{}/[]) übersprangen kaputte Objekte vor der Pflichtfeldprüfung; `{"jobs":[{}]}` wurde zur erfolgreichen leeren Liste und schloss Bestand samt Text. Logik bestand schon vor Paket 9.
2. **Mittel, Paket 13:** `assert` in `pruefe.py` entfällt bei `-O`; Größenprüfungen standen sogar innerhalb von asserts.
3. **Mittel, Paket 13:** Größen-Fixture war schon nach ID sortiert, erkannte ignorierte Sortierung nicht (Fehler im Prüfnachweis, nicht in Migration 010).

Nutzer: „Behebe die offenen Punkte“. **Behoben:** Ashby verlangt boolesches `isListed`, Recruitee nichtleeren Status (fehlender Status bleibt „published“); kaputte Antworten erreichen keinen Bestandsabgleich, Text/Hash/Datum bleiben. Prüfer nutzt explizite Laufzeitprüfungen (auch unter -O/-OO). Fixture: fünf Klassen zyklisch, drei Erstdaten (`current_date - i % 3`), unabhängige Startgruppen; Negativfälle erkennen falsche Größen-/Datums-/ID-Sortierung, Rechte, Count, Duplikate. Zehn frühere Repros (lokal ignoriert unter `tests/.pruefung/review-*`) sind jetzt reguläre Regressionen. Geprüft: Python, unabhängiger Review ohne Restbefund.

## C: Pakete 15–20 (lokal fertig)

Nutzer: „Gibt es noch offene To Dos für dich? Prüfe alles, womit du Claude unterstützen kannst“ (N2) → Bestandsaufnahme auf `ae9c463`, danach „Arbeite das ein“. Reihenfolge 15 → 16 → 18 → 17 → 19 → 20 (erst Datenerhalt, dann faire Abrufe, dann Vollständigkeit). Entscheidung je Paket: beauftragte Korrektur bestehenden Verhaltens, keine neuen Produktkriterien oder Live-/Betriebsfreigaben. Gemeinsam geprüft: Python, Web, tsc, Build, Browserprobe mit neuen Aktionsfällen; unabhängiger Review ohne Restbefund.

- **15 – Entmerken/Status schützen** (Befund: DELETE trotz fehlgeschlagener Kontaktzählung; Lesefehler meldete Erfolg; paralleles `im_gespraech` wurde auf `beworben` zurückgesetzt). Unbekannte Counts/Lesefehler stoppen vor DELETE; Status-/Datumsupdate bedingt auf gelesene Werte, Konflikt → false. Grenze: keine atomare Prüfung mit DELETE ohne DB-Transaktion; RLS offen.
- **16 – DB-Antworten prüfen** (Befund `scraper/db.py`: `{}` wurde als leerer Bestand akzeptiert). Echte Objektlisten mit Pflichtfeldern, Doppel-IDs abgewiesen, alle Schutzlesungen vor Upsert/PATCH; Bewerbungszuordnungen seitenweise (über 1000 Zeilen). Grenze: keine atomare Transaktion über mehrere HTTP-Anfragen.
- **17 – Webabrufe je Host** (`web/lib/ats-abruf.ts`; Befund: zwei Ashby-Abrufe mit 0 ms Abstand). Promise-Warteschlange pro Host, gemeinsame erste Robots-Abfrage, Fehler geben frei. Grenze: gilt pro Serverprozess, nicht über mehrere Instanzen.
- **18 – Python-Weiterleitungen** (`scraper/http.py`). Automatik aus; jeder Hop prüft Zielrobots und Domainpause, höchstens fünf Redirects, Schleifen erkannt, ungültige URLs/Anmeldedaten abgewiesen. Quellen: RFC 9309 (Redirects), requests-Doku. Grenze: kein vollständiger SSRF-/DNS-Schutz.
- **19 – Sitemap-ID-Kollisionen** (Befund: `…/job/a+b/1` und `…/job/a,b/1` gleiche ID). Gleiche URL dedupliziert, verschiedene URLs mit gleicher ID wurden Firmenfehler. **Nachtrag 2026-11-17:** jetzt „erste URL gilt“, Rest übersprungen (siehe unten).
- **20 – Nachfüllen mit Frist** (`scraper/ki.py:nachfuellen`). Gleiche `frist_s`/Uhr-Konvention wie `auswerten`, `run` übergibt 3600 s; Rest bleibt für den nächsten Lauf. Grenze: weiche Frist, keine Gesamtgarantie für den 180-Minuten-Workflow.

**Nachtrag 2026-11-17 (Claude, Nutzerwunsch „Ich würde die anderen Stellen ja trotzdem gerne übernehmen, auch wenn in einer Stelle ein Fehler ist.“):** Eine Stelle ohne Titel/Link/gültige ID, mit kaputtem Ashby-`isListed`/Recruitee-Status, Nicht-Objekt oder doppelter ID (Sitemap: erste URL gilt) wird übersprungen; gültige Stellen werden übernommen; Bericht: „N Stellen übersprungen (Grund: Anzahl), nichts geschlossen“. Wurde etwas übersprungen, wird bei der Firma nichts geschlossen. Sind alle Stellen kaputt → Firmenfehler („Format geändert?“). Netz-/Formatfehler der Gesamtantwort kippen die Firma weiter. Commits `22c0006`, `8af7fbd`.

## D: Pakete 21–23 (lokal fertig, 2026-11-16)

Nutzer: „Was kannst du sonst noch erledigen?“ (N4, Antwort im Wortlaut in `docs/fragen-und-antworten.md`) → „Setz das um“.
- **21 – Browserabnahme persönlicher Abläufe.** Derselbe Einstieg `npm.cmd run pruefe:browser` prüft auf 1280/390 Pixel Tracker (Detail, Tastaturzug, Undo, Gemerkt-Sperre, Kommentar, Fehler), Dokumente (Upload/Download/Löschen, Referenzschutz), echten CSV-Download mit 1001 Bewerbungen, Konto/Admin (Bestätigung, Löschreihenfolge, Abbruch, Abmelden) und die Import-API. Dateien `web/scripts/offline/persoenlich.py`/`.cjs`. Entscheidung: bestehenden Runner erweitern statt neues Framework. Kein Produktfehler gefunden. Offen: echte RLS/Storage/Auth.
- **22 – Künstlicher CV-Gesamtfall:** siehe [CV-Plan](2026-11-16-cv-abgleich.md#künstlicher-gesamtfall-paket-22-2026-11-16).
- **23 – Chrome-Ein-Klick-Import:** siehe [Importplan](2026-11-16-ein-klick-import.md). Geprüft: Erweiterungs-Vertragstests, App-Importtests, Web, tsc, Build, Browser.

## Was aus diesen Paketen noch offen ist

- **12/13:** isolierte SQL-/PostgREST-Abnahme (Einrichtung gesondert freizugeben); Migration 010 vor Nutzung der Größensortierung (To-do 26 in STATUS).
- **14:** erster GitHub-/Linux-Lauf nach dem Push (Q21) auswerten; keine zweite Automatik bauen.
- **Claude-Review:** Prüfvermerk für alle Codex-Commits bis `79db245` liegt im Agentenprotokoll (2026-11-17) mit fünf Befunden.
- **Groq-Restregeln:** halb gefüllte Firma/Titel, wiederholte Nulltreffer, Ratengrenze für `firmaTitelVorschlag` brauchen konkrete Regeln; keine Retry-/Cache-/Quotenregel still festlegen. Finale Probe ist Claude-Aufgabe (Halte-Punkt in STATUS).
- **Native Chrome-/RLS-Abnahme** und weitere Browser (Importplan).

### Nicht ohne fachliche Klärung umsetzen

- **CV-Dateien auslesen** (Word/PDF, OCR, Ausführungsweg, Bibliotheken) und **CV-Vergleich/Ergebnisdaten** (Synonyme, Score, Gewichte, Speicherung, Löschung, Cache) – siehe CV-Plan.
- **Neue fachliche Filter:** Mindestwert/Spannenüberlappung, unbekannte Werte, Muss/Soll, Profile, Freigabe für Gäste.
- **Gehälter umrechnen/schätzen:** keine stillen Annahmen wie 13 Gehälter oder 40 Wochenstunden.
- **Ranking-Quellen, Import, Bereinigung:** Quellenwahl, Nutzungskreis, Erlaubnis; der Validator ist kein Import.
- **Private Firmen und Portal-Erkennung:** Firmenidentität, Anbieterumfang, Sichtbarkeit (Portalplan, Q13 offen).
- **Abrufüberwachung/Selbstreparatur:** Historienbasis, Issues/Schnappschüsse, Telegram, Auslösung planen; 0-/7-Tage-/50-Prozent-Regeln aus CLAUDE.md 4.3 nicht neu erfinden.
- **Google/Mail/Kalender:** Berechtigungen, Tokenspeicher, Aufbewahrung (phasen-vorarbeit.md).
- **Studiums-Whitelist/Prestige und weitere KI-Anbieter:** offen; Groq-Proben und echte Datenabfragen bleiben für Codex ausgeschlossen.

## Prüfgrundlage (aus `pruefvorbereitung.md`)

Befehle und Erfolgskriterien: [README, „Prüfen ohne Zugangsdaten“](../../README.md#prüfen-ohne-zugangsdaten). Zuordnung vorhandener Prüfungen (kein Nachweis vollständiger Abdeckung):

| Bereich | Prüfungen | Belegen | Offen |
|---|---|---|---|
| Firmenabruf | `tests/test_greenhouse.py`, `test_ashby.py`, `test_personio.py`, `test_recruitee.py`, `test_sitemap.py` | Beispielantworten, Felder, Filter | echte Erreichbarkeit, neue Formate, Abrufbedingungen |
| Abrufregeln | `tests/test_http.py` | Robots, Pause, User-Agent, Redirects | echte Server, frei eingegebene Ziele |
| Datenabgleich | `tests/test_db.py`, `test_run.py`, `test_umzug.py`, `tests/fakedb.py` | neue/unveränderte/geschlossene Stellen, Fehler | echte Constraints, Rollen, Transaktionen |
| Anzeigenverarbeitung | `tests/test_filter.py`, `test_abschnitte.py`, `test_steckbrief.py` | Regeln gegen Beispiele | unbekannte Anzeigenformate |
| KI-Schnittstelle | `tests/test_ki.py`, `web/tests/ki*.test.ts`, `zusammenfassung.test.ts` | Format, Grenz-/Fehlerfälle | Modellqualität, Groq-Probe |
| Website | `web/tests/*.test.ts`, Browser-Runner | Filter, Tracker, Export, HTTP-Verträge, Abläufe mit Ersatzdiensten | echte Anmeldung, Datenbankrechte |
| Ranglisten | `tests/test_rankings.py`, `web/tests/rankings.test.ts`, `tests/sql/*.sql` | Eingabeprüfung, HTTP-Vertrag; SQL vorbereitet | SQL/PostgREST nicht ausgeführt |
| Offline-Befehl | `tests/test_pruefe_offline.py` | Ausschlüsse, Sperren mit künstlichen Ereignissen | keine Sandbox; nur Windows geprüft |
| Live-Prüfungen | `tests/test_rls.py`, `test_konto_loeschen.py` | für echte DB geschrieben | für Codex tabu, nie importieren |

**Nachweise der späteren Datenbankabnahme** (unabhängig von der Ranking-Auswahl): isolierte Testdatenbank nur mit künstlichen Daten; Rollen `anon`, `authenticated`, `service_role`; Gäste lesen keine Ranglisten und rufen keine Ranglistenfunktionen auf, Angemeldete schreiben keine Zuordnungen; Ausgabewechsel, Entwurf/Zukunft, Abschaltung, Ablauf ohne Wiederaufleben; ODER über Listen ohne doppelte Stellen, UND mit weiteren Filtern, stabile globale Rangfolge, über 1000 Zuordnungen; zusätzlich echtes PostgREST für Gesamtzahl, Filter, Sortierung, Seiten. Das Skript prüft Datenbanknamen und Testkennung, ersetzt aber keine Kontrolle des Verbindungsziels.

**Übergabe jeder echten Prüfung:** Code-Stand, Datum, genaue Befehle, Ersatz-/Offline-Grenzen, bestandene und offene Prüfungen festhalten; Anzeigeabläufe, Datenbankrechte und KI-Qualität getrennt benennen; keine Tests nur für Dokumentation.

## Verbleib der alten Dateien (Konsolidierung 2026-11-17, Q18)

| Alte Datei | Inhalt jetzt in |
|---|---|
| `docs/arbeitspakete-codex.md` | diese Datei (umbenannt): Regeln, A/B/C/D, Offenes, „nicht ohne Klärung“ |
| `docs/pruefung-arbeitspakete-2026-11-16.md` | diese Datei, „Nachprüfung“; Testzahlen im Agentenprotokoll 2026-11-16 15:51/16:07 |
| `docs/pruefvorbereitung.md` | Befehle → README „Prüfen ohne Zugangsdaten“; Tabelle/DB-Nachweise → diese Datei „Prüfgrundlage“; Einrichtung → `tests/sql/README.md` (unverändert) |
| `docs/plans/2026-11-15-ki-anforderungsdaten.md` … `2026-11-16-isolierte-webpruefung.md` (Pakete 1–11) | Tabelle A |
| `2026-11-16-globale-groesse.md`, `-datenbankabnahme.md`, `-codepruefung.md` (12–14) | Abschnitt B |
| `2026-11-16-reviewkorrekturen.md` | „Nachprüfung und Reviewkorrekturen“ |
| `2026-11-16-pakete-15-20.md` | Abschnitt C |
| `2026-11-15-offline-pruefung.md`, `2026-11-15-stellendaten-grundlage.md` | „Vorläufer“ + README |
| `2026-11-16-browser-cv-abnahme.md` | Paket 21 → Abschnitt D; Paket 22 → CV-Plan |
| `2026-11-16-cv-abgleich-fragen.md`, `-klaerung.md` | `2026-11-16-cv-abgleich.md` (Wortlaut vollständig) |
| `docs/vorarbeit-spaetere-phasen.md` | Phase 3/5 → `docs/phasen-vorarbeit.md`; Phase 6 → CV-Plan „Vorarbeit im Code“ |
| `docs/beispiele/spaetere-phasen.json` | `cv_fall` → CV-Plan; Rest → `docs/phasen-vorarbeit.md` |
| STATUS-Abschnitte „Noch mögliche Codepakete“, „Stellenwerte“, „Übergabepaket“, „Prüfvorbereitung“, alte „Nächster Schritt“-Blöcke | diese Datei, CV-/Portal-/Ranking-Pläne, `phasen-vorarbeit.md`; Testzahlen ins Agentenprotokoll (Nachtrag 2026-11-17) |
| STATUS „Offene To-dos für spätere Phasen“ | `docs/phasen-vorarbeit.md` |
| ENTSCHEIDUNGEN-Zeilen „Paket 15–20“ (reine Erledigt-Meldungen) | Abschnitt C (Satz „Entscheidung je Paket“) |
