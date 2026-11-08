# Task 4 Bericht
Status: fertig. Tests: npm test 55/55, tsc ok, build ok, pytest 96 passed, 1 skipped (admin_einblicke-Live-Test, Migration 005 fehlt noch).
Geaendert: Migration 005 (admin_einblicke, wichtige_punkte + RLS), nutzerliste.ts (letzteAnmeldung, istGoogle, begriffPruefen), Admin-Seite (Kennzahlen, Balken, details-Menue), Konto-Seite + Actions (Status-Zaehlung, wichtige Punkte, Loeschen klein am Ende), kopf.tsx, Datenschutz, Link "Dokument hochladen", minimales CSS, test_rls.py.
Hinweise: Name wird nur bei Google angezeigt (sonst leer; Admin-Entfernen-Frage nutzt dann E-Mail). loescheNutzerMit unveraendert: wichtige_punkte hat ON DELETE CASCADE auf auth.users, passt. Fehlerpfade ohne 005 (rpc-/Tabellenfehler) nur per Code geprueft, nicht live.

## Fix round 1
1. Trigger wichtige_punkte_limit (BEFORE INSERT, invoker, search_path='', Advisory-Lock pro Nutzer gegen Parallelitaet, Fehlertext wichtige_punkte_limit); Action mappt auf die deutsche Limit-Meldung.
2. Unique-Index jetzt (owner_id, lower(trim(begriff))), alter Index per drop index if exists; Action speichert bereits den getrimmten Wert (begriffPruefen).
3. Live-Test test_wichtige_punkte_rls (skip ohne Migration 005, Cleanup per _retry/finally).
4. Wochenreihe per generate_series immer 8 Wochen, 0 bei leeren.
5. aria-label "Aktionen fuer {email}".
6. Konto: "Verfuegbar nach Migration 005" nur bei 42P01/PGRST205, sonst generische Meldung.
Tests: npm test 55/55, tsc, build ok, pytest 96 passed, 2 skipped (beide Live-Tests vor Migration 005). SQL nicht gegen DB ausgefuehrt (005 nicht angewendet).
