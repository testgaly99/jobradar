# Sicherheit: mittlere Befunde (P11)

Stand 2026-11-25. Grundlage: Sicherheitsprüfung vom 2026-11-25 (Bericht nur im privaten Repo), Befunde 5–8. Die Registrierung bleibt offen (Q296); deshalb zählt vor allem, dass ein fremdes Konto weder Geheimnisse erreicht noch die Nachtläufe der Admin-Konten verdrängt.

## Ziel
- Kein Nachtlauf installiert unbemerkt eine neue Paket- oder Action-Version (Lieferkette).
- Ein einzelnes Konto kann Nachrüsten, Original-Suche und Anforderungslisten der anderen nicht blockieren.
- Hochgeladene Dateien nur in erwarteten Formaten; GitHub-Tokens in Vercel nur mit den nötigsten Rechten.

## Aufgaben

### Task 1: Feste Paketversionen (Befund 5)
- `requirements.txt`: jede Zeile `==` mit der Version aus dem grünen Täglichen Lauf 45550662407 (z. B. `requests==2.34.2`, `numpy==2.5.5`, `playwright==1.65.2`), darunter ein Abschnitt mit allen Unterpaketen ebenfalls `==`.
- Test `tests/test_lieferkette.py::test_pakete_fest`: jede Paketzeile in `requirements.txt` enthält `==`.
- Prüfung: Testlauf auf GitHub (Codeprüfung) installiert ohne Fehler.

### Task 2: Actions über feste Commit-Kennung (Befund 5)
- Alle `uses:` in `.github/workflows/*.yml` (öffentlich) und `jobradar-privat/.github/workflows/*.yml` von `@vN` auf die 40-stellige Kennung mit Kommentar `# vN`. Hauptversionen bleiben, wie sie sind (kein Umstieg v4 → v7 nebenbei).
- Test `tests/test_lieferkette.py::test_actions_fest`: jedes `uses:` der öffentlichen Workflows endet auf `@` + 40 Hex-Zeichen.

### Task 3: Monatliche Sammel-Vorschläge für Updates (Befund 5)
- `.github/dependabot.yml` (öffentlich): `pip` und `github-actions`, monatlich, je eine Gruppe → höchstens zwei Vorschläge pro Monat. Privates Repo: keine eigenen Vorschläge (zwei Workflows; Claude gleicht sie bei der monatlichen Prüfung an das öffentliche Repo an; `requirements.txt` kommt ohnehin von dort).
- Übernommen wird nie automatisch; Claude prüft die Vorschläge in der monatlichen Sicherheitsprüfung (P10) als zweite Prüfung (CLAUDE.md 4.3).
- Sicherheitswarnungen (To-do 51) bleiben davon unabhängig und melden Lücken sofort.

### Task 4: Nachtläufe gerecht je Konto (Befund 6)
- `scraper/db.py`: `_gerecht(zeilen, limit, admins, je_konto=5)`: erst alle Zeilen der Admin-Konten, dann reihum höchstens `je_konto` je weiterem Konto, zusammen höchstens `limit`.
- `bewerbungen_zum_nachruesten(limit=50)` und `bewerbungen_original_offen(limit=20)`: erst Admin-Konten, dann übrige Konten in Fenstern zu 500; Konten mit 5 Einträgen werden in der nächsten Abfrage ausgeschlossen (Zweitprüfung S1), höchstens 20 Runden. `anforderungen_bewerbungen()`: Admin-Konten zuerst.
- Tests in `tests/test_db.py`: 100 fremde Einträge mit altem `erstellt_am` + 3 Admin-Einträge → alle 3 Admin-Einträge dabei, fremdes Konto höchstens 5; zwei fremde Konten → beide kommen dran.
- **Nicht-Ziel:** Datenbank-Trigger, der `nachruesten`/`original_suche`/`erstellt_am` nur dem Server erlaubt. Die Website setzt diese Felder mit dem Login des Nutzers (`web/app/bewerbungen/actions.ts`); ein Trigger würde „Anzeige lesen lassen“ und die Original-Suche abschalten. Die gerechte Auswahl macht eine Manipulation wirkungslos.

### Task 5: Uploads nur in erwarteten Formaten (Befund 8)
- `web/app/unterlagen/upload.tsx`: `accept` am Dateifeld mit den freigegebenen Formaten (Q308).
- Migration `025_dokumente_dateiarten.sql` setzt dieselben Formate als `allowed_mime_types` des Buckets (nach Zweitprüfung S2 statt Klickweg); Test `tests/test_uploads.py` hält Formular und Migration gleich. Gilt nur für neue Uploads; vorhandene Dateien bleiben.

### Task 6: GitHub-Tokens in Vercel eng fassen (Befund 7)
- Nur Nutzer-To-do mit Klickanleitung: in GitHub prüfen, ob `GITHUB_DISPATCH_TOKEN` ein klassischer Token ist; falls ja, als fine-grained Token neu anlegen (nur Repo `jobradar`, nur „Actions: Read and write“, Ablaufdatum), in Vercel ersetzen, alten Token löschen. `GITHUB_ISSUE_TOKEN` wird mit To-do 43 gleich so angelegt.

### Task 7: Monatliche Erinnerung per Telegram, Prüfung freiwillig (P10, Q309)
- `.github/workflows/sicherheit-erinnerung.yml` am 3. jedes Monats: zählt offene Dependabot-Vorschläge, `scraper/sicherheit_erinnerung.py` schickt eine Nachricht in den Systemchat (`scraper.telegram.sende`, ohne Secrets still). Nur Leserechte, jeder Schritt mit `|| true`.
- Die Prüfung selbst: Der Nutzer schreibt Claude „Sicherheitsprüfung“. Claude prüft dann die offenen Vorschläge (zweite Prüfung), Dependabot-/CodeQL-Warnungen und die Code-Änderungen seit der letzten Prüfung; Bericht nur ins private Repo. Auslassen ändert nichts.
- Test `tests/test_lieferkette.py::test_erinnerung_freiwillig_und_ohne_telegram_still`.

## Abschluss
- Alle Tests grün, `/ponytail-review`, STATUS (P11 erledigt, neue Nutzer-To-dos), Checkliste.
- Hochladen und Übernahme in `main` nur nach Freigabe; da `requirements.txt` und `.github/` geändert werden, vorher zweite Prüfung durch einen unabhängigen Helfer (CLAUDE.md 4.3).
