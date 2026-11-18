# Sprachniveau für Nutzer – kurzes Design

Stand 2026-11-18 (Q65, Q66; Wunsch des Nutzers im Fragenprotokoll). Kleines Paket, vor dem Einladen der ersten Testerinnen und Tester (Backlog „Live gehen“).

**Absicht:** Nutzer, deren Muttersprache nicht Deutsch ist, sollen vorab sehen und filtern können, welches Deutschniveau eine Stelle verlangt. Für den Admin bleibt die Zusammenfassung wie freigegeben (ohne Sprachen).

**Ziele**
1. Einstellung je Nutzer auf der Konto-Seite: „Sprachkenntnisse in ‚Das bringst du mit‘ zeigen“. Standard: aus für den Admin, an für alle anderen (Q66).
2. Filter „Mein Deutschniveau“ in der Stellenliste: Auswahl A1, A2, B1, B2, C1, C2, Muttersprache; gezeigt werden Stellen, deren verlangtes Deutschniveau höchstens dem gewählten entspricht, plus Stellen ohne Deutsch-Anforderung, plus Stellen mit Deutsch ohne Niveau mit Hinweis „Deutsch: Niveau nicht angegeben“ (Q65).

**Nicht-Ziele:** keine Änderung am Groq-Prompt oder am Streich-Filter (`ki.streiche`), keine neue Probe; Vollzeit/Befristung und Qualitätsregeln bleiben für alle fest (Q66); andere Sprachen als Deutsch nicht filterbar.

**Ansatz (Claudes Wahl):** Quelle ist der vorhandene Steckbrief (`scraper/steckbrief.py`, Feld `sprachen` mit `sprache`/`niveau`, ohne KI). Verworfen: Sprachen zusätzlich von Groq erheben (braucht neuen Prompt, neue Probe und Neubewertung aller Stellen; der Steckbrief liefert dasselbe kostenlos).

**Festlegungen**
- Stufenreihenfolge: A1 < A2 < B1 < B2 < C1 < C2 < Muttersprache. Wörter: „fließend“ = C1, „verhandlungssicher“ = C2, „Muttersprache/native“ = Muttersprache.
- Verlangtes Deutschniveau einer Stelle: Steckbrief nennt Deutsch mit Niveau → diese Stufe; Deutsch ohne Niveau → „nicht angegeben“; kein Deutsch genannt und Anzeige englisch → „kein Deutsch gefordert“; kein Deutsch genannt und Anzeige deutsch → „nicht angegeben“. Sprache der Anzeige aus Groq (`ki.sprache`), ohne KI-Ergebnis per einfacher Regel wie `ki_probe._englisch`.
- Gespeichert als eigene Spalte an `jobs` (vom Scraper beim Steckbrief gesetzt; Migration), damit der Filter in der Datenbank läuft und Trefferzahlen stimmen. Bestehende Stellen bekommt sie über den nächsten Nachtlauf (Nachrüsten wie bei Snapshots).
- Einstellung und Filterwahl liegen beim Nutzer (wie die vorhandene Feldauswahl der Kurzbeschreibung).

**Dem Bauenden überlassen:** Spaltenname, genaue Stelle im Filterbereich, Wortlaut der Hinweise.

**Prüfung vor dem Bau:** an 20 echten Anzeigen kontrollieren, wie oft der Steckbrief das Deutschniveau richtig erkennt (Halte-Punkt mit Claude, nicht Codex).
