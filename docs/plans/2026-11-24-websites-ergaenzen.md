# Plan: Websites für Firmen ohne Website ergänzen

Stand 2026-11-24 (Q290: „Ja, als nächstes Paket“). Umsetzung: Claude.

**Ziel:** Jede Firma der Liste hat eine Website, damit die Firmensuche (`docs/plans/2026-11-24-firmensuche-verbessern.md`) ihre Karriereseite finden kann. Automatisch nur, was eindeutig ist; der Rest kommt als Liste zum Nutzer.

**Anlass:** 211 von 599 Firmen haben keine Website, fast alle aus dem EU R&D Scoreboard (161) und der Patentstatistik des EPA (46), die nur Namen liefern – darunter Amazon, Microsoft, Nvidia, Roche, Novartis. Die bisherige Zuordnung (`scraper/quellen/wikidata.py` `name_zu_id`) verlangt exakte Schreibweise plus Land und traf nur 5.

**Regeln:** Wikidata (CC0) über QLever wie bisher; kleine Pakete mit Pausen, bei 429 länger warten; ehrlicher User-Agent. Keine Websites raten, die nicht geprüft sind.

## Befunde (Messung 2026-11-24, nur lesend)

| Weg | Firmen |
|---|---|
| Wikidata, Bezeichnung ohne Groß-/Kleinschreibung, eindeutig oder klar bekanntester Eintrag | 130 |
| Wikidata, alternative Bezeichnungen (zweiter Durchgang) | 12 |
| Domain-Probe `name.com`/`name.de` mit Name im Seitentitel | 25 (mit Fehlgriffen, z. B. ALPHABET → alphabet.com = BMW-Leasing) |
| weiter offen | 43 (u. a. Toyota, IBM, TSMC, Ford, Nestlé, Uber, PayPal, Ericsson; dazu historische Firmen) |

Weitere Befunde: Doppelte Firmen aus zwei Quellen („TOYOTA MOTOR“ und „TOYOTA MOTOR CORPORATION“, Medtronic, Panasonic); historische Einträge (Deutsche Ausrüstungswerke, Eibia G.m.b.H., Bombardier Transportation). QLever bricht Abfragen nach etwa 30 s ab: höchstens 40 Namen je Abfrage, Bekanntheit (Zahl der Wikipedia-Sprachen) und „aufgelöst“ (P576) in einer zweiten, kleinen Abfrage.

## Tasks

### Task 1: `wikidata.websites_zu_namen(namen) -> dict[name, (domain, qid)]`
- Abfrage 1 je 40 Namensvarianten (wie geliefert; ohne Rechtsform/Zusätze wie „Holding“, „(THE)“, „Gesellschaft mit beschränkter Haftung“; jeweils klein geschrieben) gegen `rdfs:label`@en, Typen wie `name_zu_id`, nur Einträge mit `wdt:P856`.
- Abfrage 2 nur für Namen ohne Treffer gegen `skos:altLabel`@en (15 je Abfrage).
- Abfrage 3 für gefundene Einträge: Zahl der Wikipedia-Sprachen und P576.
- Wahl: aufgelöste raus; genau ein Eintrag oder der bekannteste mit mindestens doppelt so vielen Sprachen wie der zweite; sonst „mehrdeutig“.
- Website auf die registrierbare Domain kürzen (`investors.spotify.com` → `spotify.com`, `sony.co.jp` bleibt).
- Tests mit gespeicherten Antworten: AstraZeneca (Landesgesellschaften, bekanntester gewinnt), Gleichstand → mehrdeutig, aufgelöst → nie gewählt, Alias-Treffer, Domain-Kürzung.

### Task 2: In den Ablauf einbauen
- `ranglisten_holen`: Kandidaten ohne Website und ohne `wikidata_id` gehen durch `websites_zu_namen`; eindeutige bekommen `website` (und `wikidata_id`).
- Einmalig für den Bestand: die 211 heutigen Firmen ohne Website im nächsten Einrichtungslauf (gleicher Schritt vor der Suche).
- Alles Unklare (mehrdeutig, kein Treffer) in `data/karriereseite_nicht_gefunden.md` mit Grund „keine Website gefunden“.

### Task 3: Liste für den Nutzer (keine Domain-Probe im Automatikbetrieb)
- Die Domain-Probe läuft nicht automatisch (Fehlgriffe). Claude legt dem Nutzer die offenen Firmen als Tabelle vor: Name, Vorschlag (Domain-Probe oder Claudes Vorschlag), Häkchen „passt“. Bestätigte Werte trägt Claude in `data/firmen_korrekturen.csv` ein (Vorrang vor automatischen Werten, CLAUDE.md 4.3).
- Historische Firmen und Dubletten stehen in derselben Liste mit Vorschlag „entfernen“ bzw. „zusammenführen“; nur nach Bestätigung.

## Nicht-Ziele
- Wikidata-Suchdienst (robots.txt verbietet ihn, 2026-11-20); Raten ohne Prüfung; kostenpflichtige Firmendatenbanken.

## Abnahme
- Lauf über die 211: mindestens 70 % automatisch eindeutig (Messung: 142 = 67 % ohne Domain-Probe; mit Tasks 1–2 Ziel ≥ 70 %), keine aufgelöste Firma gewählt, Stichprobe von 20 automatisch gesetzten Websites durch Claude geprüft (Startseite gehört zur Firma).
- Danach Nutzerliste (Task 3) für den Rest.
