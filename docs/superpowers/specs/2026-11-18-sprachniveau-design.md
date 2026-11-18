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
- Testfälle (kurze Sätze aus echten Anzeigen der Prüfung, erwartetes Deutsch-Ergebnis):

| Satz | Erwartet |
|---|---|
| „Sehr gute Deutsch- und Englischkenntnisse sowie Bereitschaft zu Kundenterminen“ | ≈ C1, Pflicht |
| „Are fluent in German and English“ | ≈ C1, Pflicht |
| „Are fluent in English and German, written and spoken“ | ≈ C1, Pflicht |
| „Gute Deutschkenntnisse (mindestens auf C 1-Niveau)“ | C1, Pflicht |
| „Your written and verbal communication in German and English is excellent.“ | ≈ C1, Pflicht |
| „Sprache: Deutsch und Englisch (jeweils ab Level C1 bzw. verhandlungssicher)“ | C1, Pflicht |
| „Confident communication skills in German or English.“ | keine Pflicht (oder Englisch) |
| „Fluency in English; additional fluency in German, French, or Italian is a strong advantage“ | Vorteil |
| „Verhandlungssichere Deutschkenntnisse (mind. C1) sowie gute Englischkenntnisse (mind. B2)“ | C1, Pflicht |
| „you’re a strong communicator in both English and German“ | ≈ C1, Pflicht |
| „sehr gute Deutsch- und Englischkenntnisse“ | ≈ C1, Pflicht |
| „Sehr gute deutsche und gute englische Sprachkenntnisse“ | ≈ C1, Pflicht |
| „Excellent Python. Excellent English. German is a plus.“ | Vorteil |
| „You communicate confidently in English. German is an advantage.“ | Vorteil |
| „A clear and professional communicator in English (German is a plus)“ | Vorteil |
| „Fluency in English and German to effectively engage with our customer base“ | ≈ C1, Pflicht |
| „Auch mit der deutschen Sprache und mit Zahlen gehst Du sicher um.“ | ≈ C1, Pflicht |
| „You speak business-level German and English“ | ≈ C1, Pflicht |
| „Speak German at native level (non-negotiable) and fluent English“ | Muttersprache, Pflicht |
| „Gute Kommunikationsfähigkeit in deutscher Sprache“ | ≈ B2, Pflicht |
| „Sehr gute Deutschkenntnisse und gute Englischkenntnisse“ | ≈ C1, Pflicht |
| „Gute Deutsch- und Englischkenntnisse“ | ≈ B2, Pflicht |
| „Willingness to undergo a German security clearance (Sicherheitsüberprüfung). Business-fluent English. German is a strong advantage.“ | Vorteil |
| „10 % Mitarbeiterrabatt in allen deutschen dm-Märkten“ / „Die Deutsche Bundesbank ist eine besondere Bank“ | kein Treffer |

  Ziel mindestens 22 von 24 richtig, danach erneut an 20 neuen Anzeigen messen (Halte-Punkt mit Claude).

**Dem Bauenden überlassen:** Spaltenname, genaue Stelle im Filterbereich, Wortlaut der Hinweise.

**Prüfung vor dem Bau:** erledigt 2026-11-18 (Ergebnis oben); Nachmessung nach dem Ausbau an 20 neuen Anzeigen (Halte-Punkt mit Claude, nicht Codex).
