# STATUS

Stand: 2026-11-08

## Was funktioniert (Phase 0)
- Ein täglicher Lauf per GitHub Actions („Täglicher Lauf“, 04:00 UTC) ruft die Stellen von 4 Firmen ab: Helsing, The Exploration Company, Taktile und telli.
- Der Lauf filtert vor, gleicht mit dem Bestand ab und schreibt einen Bericht nach `data/bericht.md`.
- Die Website ist live: https://testgaly99.github.io/jobradar/
- Repo: https://github.com/testgaly99/jobradar (öffentlich, Zweig `main`)
- Tests: `py -m pytest` (62) und `node --test tests/test_app.js` (7).

## In Arbeit
- Die Architektur ist festgelegt (CLAUDE.md Abschnitt 5). Als Nächstes wird Phase 1 (Tracker) geklärt.
- Pausiert: `docs/plans/2026-11-07-website-filter-design.md` (neue Filter, neues Design, Scroll-Fix). Der Plan wartet, bis die Architektur feststeht.

## Bekannte Probleme
- Die Filterleiste lässt sich am Laptop schwer scrollen, und die Oberfläche wirkt langweilig. Das soll der pausierte Plan beheben.
- 9 der 13 Firmen in `data/companies.csv` sind noch nicht angebunden (`aktiv=nein`).

## Umgebung (Windows 11, lokal)
- Python 3.12 immer über `py` aufrufen, nicht über `python`.
- Node v24 ist installiert.
- In Git ist für dieses Repo die Identität testgaly99 eingetragen.
- Die GitHub CLI (`gh`) ist nicht installiert.

## Nächster Schritt
Phase 1 (Tracker) mit grill-me klären, Plan schreiben, dann Supabase- und Vercel-Konto mit dem Nutzer anlegen.
