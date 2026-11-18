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

**Erkennung (Q67/Q68, nach Prüfung 2026-11-18):** Die heutige Regel `_sprachen` traf an 40 Probe-Anzeigen nur 3 von 24 Deutsch-Erwähnungen richtig. Ausbau ohne KI:
- Wortformen: „Deutsch“, „Deutschkenntnisse“, „Deutsch-“ (in „Deutsch- und Englischkenntnisse“), „deutsche Sprache“/„deutscher Sprache“, „German“; nicht „Deutschland“, „deutschen dm-Märkten“, „Deutsche Bundesbank“, „German security clearance“.
- Niveau im **selben Satz** bzw. Stichpunkt statt 25 Zeichen; bei mehreren Sprachen im Satz gilt das Niveau, das sich grammatisch auf beide bezieht („Deutsch und Englisch (jeweils ab C1)“ → beide C1), sonst das nächststehende **ohne** dazwischenliegenden anderen Sprachnamen („Business-fluent English. German is a strong advantage“ → Deutsch kein Niveau).
- Stufen auch mit Leerzeichen („C 1“), „mind./mindestens/ab“ davor.
- Vage Worte (Q68): „gute“ = B2; „sehr gute“, „fließend/fluent/fluency“, „business-level/business fluent“, „excellent“, „sicher“ = C1; „verhandlungssicher“ = C2; „Muttersprache/native“ = Muttersprache. Geschätzte Stufen tragen eine Markierung (Anzeige „≈ C1“).
- „is a plus/advantage/von Vorteil/wünschenswert/nice to have“ → Deutsch **keine Pflicht**: zählt im Filter wie „kein Deutsch gefordert“, Hinweis „Deutsch von Vorteil“.
- Testfälle: je ein kurzer Satz aus den 24 Fällen der Prüfung (Liste im Fragenprotokoll-Eintrag vom 2026-11-18 nachvollziehbar); Ziel mindestens 22 von 24 richtig, danach erneut an 20 neuen Anzeigen messen (Halte-Punkt mit Claude).

**Dem Bauenden überlassen:** Spaltenname, genaue Stelle im Filterbereich, Wortlaut der Hinweise.

**Prüfung vor dem Bau:** erledigt 2026-11-18 (Ergebnis oben); Nachmessung nach dem Ausbau an 20 neuen Anzeigen (Halte-Punkt mit Claude, nicht Codex).
