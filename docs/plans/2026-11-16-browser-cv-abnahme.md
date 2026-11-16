# Browserabnahme und künstlicher CV-Gesamtfall

Stand: 2026-11-16. Nutzer beauftragt nach Empfehlung die weiteren Arbeiten mit „Setz das um“. Zuerst Browserprüfungen und vollständiges künstliches CV-Beispiel; offene Produktentscheidungen werden weiterhin erfragt und dokumentiert. Kein fertiger CV-KI-Abgleich oder echter Datenbanknachweis daraus ableiten.

## Lieferungen

1. Vorhandene isolierte Browserprüfung um sinnvolle durchgehende Abläufe und Fehlerfälle für Bewerbungs-Tracker, Dokumente, CSV-Export und Kontolöschung ergänzen. Vorhandene Infrastruktur verwenden, nur künstliche Antworten/Dateien. Keine echte Löschung, Anmeldung, Storage-/Datenbank- oder KI-Verbindung. Kanban-Animationen erhalten.
2. Vollständige künstliche Anzeige mit mehreren getrennten CV-Versionen, tatsächlichen Belegzitaten, bestätigter Grün/Gelb/Rot-Bedeutung und benannter bester Vergleichsversion. Beste Version durch eindeutige Abdeckungsdominanz zeigen, keine Gewichte oder Gleichstandsregel erfinden. Als erwartetes Abnahmebeispiel kennzeichnen, nicht als ausgeführten KI-Vergleich.
3. Anforderungen/Plan für CV und vorläufige Firmenportal-Erkennung bei offenen Nutzerentscheidungen fortsetzen; bestehende Vorarbeit wiederverwenden. Keine direkte Umsetzung des vorläufigen Firmenportal-Entwurfs.

## Vorgehen und Abnahme

- Browserarbeit und CV-Beispiel in getrennten Dateibereichen parallel; gemeinsame Übergabe durch Koordinator.
- Vorhandene Browserprüfung zunächst verstehen und relevante neue Fälle am bisherigen Stand fehlschlagen sehen. Danach Ersatzantworten/Prüfung ergänzen. Belegte Produktfehler vor einer Änderung gesondert festhalten.
- Browserlauf ausschließlich über vorhandenen isolierten Build auf localhost:3002. Nur Fehler-Screenshots, keine laufenden fremden Testserver beenden.
- CV-Beispiel mechanisch auf eindeutige IDs, reale Zitatstellen, unveränderte Anzeige, getrennte Versionen und nachvollziehbare Sollzustände prüfen. Keine Parser-/KI-/Scoring-Implementierung auf Vorrat.
- Relevante Webtests, Typprüfung, isolierter Build und erweiterte Browserprobe ausführen. Für reine Beispiel-/Dokumentationsdaten keine neue allgemeine Testsuite erfinden.
- STATUS, Entscheidungen und Agentenprotokoll mit tatsächlichen Ergebnissen und verbleibenden Grenzen aktualisieren.

## Stand

- [x] Auftrag und Grenzen festgehalten.
- [ ] Browserprüfungen erweitert und tatsächlich ausgeführt.
- [x] Künstliches CV-Gesamtbeispiel erstellt und geprüft: `docs/beispiele/cv-abgleich.md`/`.json`, drei Versionen, sechs Anforderungen, 18 Zuordnungen, sieben Abnahmefälle; exakte Zitate/Positionen und eindeutige Dominanz mechanisch geprüft. Keine Modellaufrufe.
- [ ] Abschlussprüfung und Übergabe dokumentiert.

Zusätzlicher Nutzerwunsch Ein-Klick-Import fremder Stellenanzeigen: eigener Plan und Fragen in [2026-11-16-ein-klick-import.md](2026-11-16-ein-klick-import.md). Dieser Import ist nicht mit dem bisherigen manuellen Anlegen gleichzusetzen.
