# Link-Schnellstart: komplette Stelle aus dem Link einer Firmen-Karriereseite – kurzes Design

Stand 2026-11-18 (Q69–Q71). Kleines Paket **vor Phase 4**. Der Rest (Workday/SuccessFactors, Suche zu Jobportal-Links) ist Teil 4g im Phase-4-Design.

**Absicht:** Der Nutzer fügt den Link einer Stellenanzeige ein und bekommt ohne Abtippen die komplette Stelle: Firma, Titel, Anzeigentext, gegliederte Anzeige, Steckbrief und Groq-Zusammenfassung (Q70). Heute klappt das nur für die eigenen Firmen und für Greenhouse/Ashby/Lever/Personio.

**Ziele**
1. Link auf eine beliebige **Firmen-Karriereseite** (nicht Jobportal, Q16): jobradar ruft genau diese Seite einmal ab und liest die eingebettete Stellenbeschreibung `JobPosting` (JSON-LD; Logik wie `scraper/ats/sitemap.py`, Zeile ~70).
2. **Sofort** beim Anlegen: Firma (`hiringOrganization.name`), Titel (`title`), Anzeigentext (`description` als Text) und Ort. Was der Nutzer selbst einträgt, geht vor (wie heute).
3. **In der nächsten Nacht** (Nachtlauf, Python): gegliederte Anzeige, Steckbrief und Groq-Zusammenfassung für diese Bewerbung nachrüsten (öffentlicher Anzeigentext, daher Groq erlaubt; Muster `snapshot_nachruesten`). Grund: Gliederung und Steckbrief gibt es nur im Python-Teil; ein Nachbau in der Website wäre doppelter Code.
4. Hat die Seite kein `JobPosting`: Hinweis „Diese Seite enthält keine maschinenlesbare Anzeige. Bitte Firma und Titel eintragen oder den Anzeigentext einfügen.“

**Nicht-Ziele:** keine Jobportale aufrufen (LinkedIn, StepStone, Indeed, XING, Glassdoor, kununu …; Liste wie `PORTALE` in der Erweiterung, auf dem Server erzwungen); kein Durchsuchen weiterer Seiten der Firma; kein Browser (Playwright); keine Workday-/SuccessFactors-Schnittstelle (kommt mit 4c-3/4g).

**Sicherheit (Pflicht, weil die Website eine vom Nutzer genannte Adresse abruft):**
- Nur `https`, Standardport, keine Zugangsdaten in der Adresse; Host darf kein Jobportal sein.
- Vor dem Abruf den Hostnamen auflösen und private, Loopback-, Link-Local- und Metadaten-Adressen ablehnen (Schutz gegen das Ausspähen interner Dienste).
- Höchstens 3 Weiterleitungen, jede neu geprüft (gleiche Regeln); `robots.txt` der Seite beachten; eigener User-Agent wie `USER_AGENT` in `web/lib`.
- Zeitlimit 10 s, höchstens 2 MB, nur HTML.
- Nur für angemeldete Nutzer; höchstens 10 Abrufe pro Nutzer und Minute.

**Ansatz (Claudes Wahl):** Abruf in der Website (Server-Aktion), Nachrüsten im Nachtlauf. Verworfen: alles erst nachts (Nutzer sähe Firma/Titel nicht sofort) und alles in der Website (Gliederung/Steckbrief doppelt bauen).

**Dem Bauenden überlassen:** Dateiaufteilung, genaue Meldungstexte, Speicherort des Nachrüst-Status.

**Prüfung nach dem Bau (Claude, nicht Codex):** 10 echte Links von Firmenseiten außerhalb der 12 jobradar-Firmen ausprobieren und zählen, wie viele `JobPosting` haben.
