# Konkrete Codegrundlage: vorhandene Stellenwerte prüfen

Stand: 2026-11-15. Nutzerauftrag: tatsächliche Codevorarbeit für CV-Abgleich oder Filter anhand bereits fester Vorgaben, ohne offene Details vorwegzunehmen. Dieser kleine Schritt verarbeitet ausschließlich das vorhandene Steckbrief-/Gehaltsformat und wird sofort von der bestehenden Anzeige genutzt.

## Umfang

- Reine Datenleser und vorhandene Typen aus `web/lib/steckbrief.ts` nach `web/lib/stellendaten.ts` ziehen; bestehende Exporte über `steckbrief.ts` erhalten. Keine Next.js-, Anbieter-, Datenbank- oder Dateizugriffe im neuen Modul.
- Gehalt mit vorhandenen Regeln prüfen: endliche positive Grenzen, min <= max, EUR/CHF und Jahr/Monat/Stunde. Geprüfte Felder als neues Objekt zurückgeben; keine Umrechnung, Schätzung oder Änderung der bisherigen Währungs-/Zeitraumunterstützung.
- Erfahrung als endliche Zahl >= 0 erhalten. Der bestehende Python-Parser kann ausdrücklich 0 liefern; das ist von unbekannt/null zu unterscheiden. Vorhandene Anzeigenvorlage muss bei 0 ebenfalls den belegten Wert verwenden, statt auf eine geschätzte Level-Spanne zurückzufallen.
- Rückgaben von Eingaben und voneinander entkoppeln, einschließlich verschachtelter Sprachobjekte und Gehalt. Ein leerer Steckbrief darf andere Stellen nicht über ein gemeinsam veränderliches Array beeinflussen.
- Bestehende boolesche Sicherheitsanzeige beibehalten; false nicht als Nachweis „nicht erforderlich“ für künftige Filter interpretieren. Bestehende Sprache-/Niveauformate beibehalten, keine neue Sprachniveaupolitik.

Keine neue Filterauswahl, Rangsortierung, Gewichtung, CV-Datenstruktur oder Bewertung. Kein PDF-/Word-Parser, keine KI-Anbindung und keine echten CVs. `karte.ts` verarbeitet weiterhin sein bisheriges lockeres Format für Bewerbungsangaben; es wird nicht ungeprüft auf vollständige Gehaltsspannen umgestellt. Keine Migration, Bibliothek, Kontoeinstellung oder Veröffentlichung.

## Prüfschritte

- [x] Tests zuerst: vorhandene Formate, 0/fehlende/ungültige Erfahrung, ungültige Zahlen/Einheiten, unabhängige Rückgaben und bisherige Exporte; Anzeige von 0 mit vorhandener Textvorlage.
- [x] Datenmodul implementieren und unmittelbar in `steckbrief.ts` nutzen; bestehende Anzeige und Importpfade erhalten.
- [x] Gesamte Websuite, Typprüfung, isolierter Build und geeignete Browserprobe mit synthetischen Daten; Python-Offline-Suite, wenn die vorausgehende Dokumentation mit abgegeben wird. Unabhängiges Review.
- [x] Plan, STATUS, Entscheidungen und Agentenprotokoll aktualisieren. Konkrete Grenzen und spätere Anschlussmöglichkeiten für Claude erklären.

## Ergebnis und Nachweis

Zunächst Tests geschrieben: fehlendes Modul rot. Dann vorhandene Logik unverändert extrahiert: sechs von zehn Tests rot, konkret wegen verlorener 0, gemeinsam veränderlicher Leerdaten, übernommenem Roh-Gehaltsobjekt und geteilten Sprachobjekten. Danach diese Fehler korrigiert; alle zehn neuen Tests grün. Gesamte Websuite 163 bestanden, Typprüfung ohne Fehler, Python-Offline-Suite 468 bestanden. Isolierter Build mit künstlichen Einstellungen, ohne lokale Umgebungsdateien und mit gesperrtem HTTP bestanden.

Chrome-Prüfung auf localhost:3002 gegen isolierten Build und vollständig künstliche Daten: drei Listeneinträge und Detailseite zeigen die explizite 0 mit vorhandener Vorlage. Filterauswahl, ODER, Quellen-/Detailseite, Zurücksetzen, Gastschutz und fehlende/kaputte/leere Ranking-Einrichtung auf Handygröße weiterhin bestanden. Externe Browseranfragen blockiert, Testserver danach beendet. Vorbereitete vier Steckbrief-/KI-Beispiele weiterhin kompatibel.

Unabhängiger Helfer nur lesend: keine materiellen Fehler im fertigen Scope gefunden; alte Exporte, Einheiten, 0-Anzeige und voneinander unabhängige Daten geprüft. Keine echte Datenbank-/KI-/CV-Qualitätsprüfung. Lokale Reproduktionshilfen liegen ausschließlich unter `.superpowers/sdd/2026-11-15-stellendaten-grundlage/`; kein automatischer Zugriff darauf durch die Website.

Ergebnis ist eine geprüfte Eingangsgrundlage für vorhandene Stellenwerte. Sie validiert die Datenform, nicht den Wahrheitsgehalt einer Anzeige. Die endgültige CV-/Filterfunktion bleibt vor passenden Fragen und Planfreigabe vorläufig; bestehende Ranking-/Groq-Grenzen bleiben erhalten.
