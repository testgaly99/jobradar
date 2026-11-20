# Anzeige per Browser lesen (Link-Schnellstart Teil 2) – kurzes Design

Stand 2026-11-20 (Q247–Q250). Ergänzt `2026-11-18-link-schnellstart-design.md`.

**Absicht:** Fügt der Nutzer den Link einer Firmen-Karriereseite ein, stehen nach 2–5 Minuten Firma, Titel, Ort und Anzeigentext in der Bewerbung, auch bei Konzernseiten, die die Anzeige erst per JavaScript laden (Bosch, VW, Siemens, BMW, Audi …). Nutzer: „Das Abrufen der Anzeigen muss definitiv von dir automatisiert gemacht werden … über eine Extension ist keine Option.“

**Messung 2026-11-20 (7 Konzerne des Nutzers):** einfacher Abruf 0/7. Echter Browser mit ehrlichem User-Agent: Bosch vollständig (JobPosting), VW Titel und Text; Siemens (Cookie-Banner), BMW (lange Ladezeit), Audi/Rheinmetall (nur Übersicht getestet) offen; SAP verbietet Programme in robots.txt → bleibt manuell.

**Ergänzung (Nutzer, 2026-11-20):** „Wenn ich einen Link einfüge, möchte ich nicht auf der Seite warten müssen … erstens ein Pop-up-Fenster, dass ich nicht warten muss, und zweitens die Seite verlassen können, ohne dass das Anlegen unterbrochen wird.“ Umsetzung: Die Bewerbung wird sofort mit Link und Eingaben angelegt (≈ 1 s), ein Fenster bestätigt das; alles Langsame (Stellenliste, Bewerbungssysteme, Firmenseite, Anstoß des Browser-Laufs) läuft mit `after()` auf dem Server weiter und füllt nur leere Felder. Nur bei Jobportal-Links ohne Firma und Titel wird sofort nachgefragt. Findet der Hintergrund die Stelle in der eigenen Stellenliste und gibt es dazu schon eine Bewerbung (z. B. gemerkt), wird diese beworben und die neue entfällt.

**Ziele**
1. Sofort beim Anlegen wie bisher: JobPosting aus dem einfachen Abruf, sonst Titel aus `og:title`.
2. Fehlt der Anzeigentext: Bewerbung wird markiert (`nachruesten = true`, Spalte aus Migration 012) und die Website stößt sofort den GitHub-Workflow „Anzeigen lesen“ an.
3. Der Workflow öffnet jede markierte Seite in einem echten Browser (Playwright, CLAUDE.md 9: „nur wenn die Stellen erst nach JavaScript erscheinen“), liest JobPosting aus der fertigen Seite, sonst den sichtbaren Text; Firma/Titel/Ort fehlen → Groq aus dem öffentlichen Anzeigentext. Danach wie bisher Gliederung, Steckbrief, Zusammenfassung.
4. Was der Nutzer eingetragen hat, wird nie überschrieben (nur leere Felder füllen).
5. Der Nachtlauf erledigt alles, was der Sofort-Lauf nicht geschafft hat (Rückfall ohne Schlüssel).

**Nicht-Ziele / Grenzen:** keine Tarnung (User-Agent `jobradar/1.0`), robots.txt gilt, nie Jobportale, keine Anmeldung auf fremden Seiten, kein Klick auf „Bewerben“. Cookie-Banner werden nicht weggeklickt (Text steht meist trotzdem im Dokument; sonst gilt die Seite als nicht lesbar).

**Datenschutz:** Die Protokolle öffentlicher GitHub-Läufe sind öffentlich. Der Workflow bekommt keine Eingaben (keine Adresse im Aufruf), liest die markierten Bewerbungen selbst aus der Datenbank und gibt nur Zähler und Fehlertypen aus, nie Adresse, Firma oder Titel.

**Bauweise (Claudes Wahl):**
- `.github/workflows/anzeige-lesen.yml`: `workflow_dispatch` ohne Eingaben, `concurrency` (höchstens ein Lauf, einer wartet), installiert Playwright-Chromium, ruft `python -m scraper.nachruesten`.
- `scraper/nachruesten.py`: erst einfacher Abruf (wie heute), ohne JobPosting dann Browser (`scraper/browser_seite.py`, eingespritzt testbar); jedes Ziel einschließlich Weiterleitungen wird vorher geprüft (öffentliche IP, kein Portal); ohne Groq-Schlüssel nur JobPosting/Titel.
- Website: nach dem Anlegen `POST /repos/{repo}/actions/workflows/anzeige-lesen.yml/dispatches` mit Schlüssel `GITHUB_DISPATCH_TOKEN` (fein abgestufter Token, nur dieses Repo, nur „Actions: Lesen und Schreiben“), Fehler werden geschluckt (Nachtlauf als Rückfall). Hinweis in der Bewerbung: „Die Anzeige wird gerade gelesen (2–5 Minuten).“
- Verworfen: Browser auf Vercel (kostenlos nicht lauffähig), Erweiterung (Nutzer: keine Option), stündlicher Lauf (Nutzer wählte sofort).

**Voraussetzung:** Workflow und Nachtlauf laufen von `main`. Wirksam wird alles erst nach dem Zusammenführen von `entwurf-ui` in `main` (Nutzer entscheidet).

**Prüfung:** Tests offline mit eingespritztem Browser; danach Messung mit echten Einzelanzeigen der 7 Konzerne (lokal), dann Live mit Wegwerf-Konto nach Schlüssel und Merge.
