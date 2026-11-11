# Phase 2 – Freunde: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freunde nutzen die Website mit eigenem, getrenntem Tracker. Der Admin sieht die Nutzer und kann sie entfernen. Jeder kann sein Konto selbst löschen. Es gibt eine Datenschutzerklärung.

**Architecture:**
- Die Anmeldung bleibt Supabase Auth mit Google. Es braucht dafür keinen neuen Login-Code.
- Für die zwei Admin-Fähigkeiten (Nutzer auflisten, Konto löschen) gibt es einen Server-Client mit dem Service-Key. Er ist nur serverseitig nutzbar (`import "server-only"`).
- Datenzeilen verschwinden über die vorhandenen `on delete cascade`-FKs auf `auth.users`. Die Dateien im Storage löscht der Code vorher selbst.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@supabase/supabase-js` (Admin-API), `node --test`, pytest für den Live-Test.

**Spec:** `CLAUDE.md` Abschnitt 4.6 und Abschnitt 6 (Phase 2), dazu `docs/ENTSCHEIDUNGEN.md` (Zeilen vom 2026-11-08).

## Global Constraints

- Kostenlos, ohne neuen Dienst und ohne neue Abhängigkeit.
- Der Service-Key liegt nur in serverseitigen Umgebungsvariablen: `SUPABASE_SERVICE_KEY` in `web/.env.local` und bei Vercel, ohne `NEXT_PUBLIC_`-Präfix. Er darf nie im Browser-Bundle landen.
- Admin ist, wessen E-Mail in der Umgebungsvariable `ADMIN_EMAIL` steht. Groß- und Kleinschreibung zählen nicht. Die E-Mail wird nie fest in den Code geschrieben.
- Datentrennung gilt auch für den Admin. Die Admin-Seite zeigt nur Name, E-Mail und „dabei seit“, nie Bewerbungen.
- Die Adresse der Website steht nirgends im Code (Domain-Wechsel nur über Einstellungen).
- Oberfläche komplett deutsch, „Modern & farbig“, Hell/Dunkel, Handy und Laptop, WCAG AA. Daten werden nie als HTML eingesetzt.
- Bestätigungswort zum Löschen: genau `LÖSCHEN`.
- Datenschutz-Kontakt: `Mark Galysh`, `markgaly99@gmail.com`.
- Commits auf Deutsch mit Co-Authored-By-Zeile. Push nur nach Zustimmung des Nutzers.

## Review Focus

1. **Löschen mit hochgeladenen Dateien:**
   - Supabase verweigert `deleteUser`, solange der Nutzer noch Storage-Objekte besitzt.
   - Die Dateien müssen deshalb zuerst weg, auch mehr als 100 Stück, denn `list` liefert seitenweise.
   - → Test in Task 2.
2. **Admin löscht oder entfernt sich selbst:**
   - Das ist nie möglich, weder über `/konto` noch über die Admin-Seite.
   - Meldung: „Das Admin-Konto kann nicht gelöscht werden.“
   - → Tests in Task 2 und Task 3.
3. **Nicht-Admin ruft die Admin-Aktion direkt auf:**
   - Ein Server-Action-POST ohne Admin-Rechte führt zu keinem Löschen und zu `notFound()`.
   - → Task 3.
4. **Falsches Bestätigungswort:**
   - Bei `löschen`, ` LÖSCHEN ` (mit Leerzeichen) oder leerem Feld wird nichts gelöscht, und es kommt ein Hinweis.
   - Leerzeichen am Rand werden entfernt, Großschreibung ist Pflicht.
   - → Test in Task 2.
5. **Der Service-Key gelangt ins Browser-Bundle:**
   - Nach dem Build darf `.next/static` den Key nicht enthalten.
   - → Prüfung in Task 2.

---

### Task 1: Admin-Client und Admin-Prüfung

**Files:**
- Create: `web/lib/supabase/admin.ts`, `web/lib/admin.ts`
- Test: `web/tests/admin.test.ts`
- Modify: `web/.env.example` (neue Zeilen `SUPABASE_SERVICE_KEY=` und `ADMIN_EMAIL=`)

**Interfaces:**
- Produces:
  - `createAdminClient(): SupabaseClient` in `web/lib/supabase/admin.ts`
    - beginnt mit `import "server-only"`
    - nutzt `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_KEY`, mit `auth: { persistSession: false, autoRefreshToken: false }`
    - wirft einen deutschen Fehler, wenn der Key fehlt
  - `istAdmin(email: string | undefined | null, adminEnv: string | undefined): boolean` in `web/lib/admin.ts`, pur, ohne Next-Imports
    - `adminEnv` darf mehrere Adressen durch Komma getrennt enthalten
    - Leerzeichen am Rand werden entfernt, die Groß- und Kleinschreibung zählt nicht
  - `aktuellerNutzer(): Promise<{ id: string; email: string | null; admin: boolean } | null>` in `web/lib/admin.ts` oder einer serverseitigen Nachbardatei
    - liest die Claims über den vorhandenen `createClient()` aus `web/lib/supabase/server.ts`
    - Muster wie in den bestehenden Actions
- Kopf: `web/app/kopf.tsx` zeigt den Link „Nutzer“ (`/admin/nutzer`) nur, wenn `admin` wahr ist, und für alle den Link „Konto“ (`/konto`).

- [ ] Tests:
  - `istAdmin("Mark@X.de", "mark@x.de")` → true
  - `istAdmin("a@x.de", " b@x.de , a@x.de ")` → true
  - `istAdmin("a@x.de", "")` → false
  - `istAdmin(null, "a@x.de")` → false
  - `istAdmin("a@x.de", undefined)` → false
- [ ] Rot → Code → Grün (`npm test`), `npx tsc --noEmit`
- [ ] Commit `Admin-Prüfung und Server-Client mit Service-Key`

### Task 2: Konto löschen

**Files:**
- Create:
  - `web/lib/nutzer-loeschen.ts` (server-only)
  - `web/lib/bestaetigung.ts` (pur)
  - `web/app/konto/page.tsx`
  - `web/app/konto/actions.ts`
- Test:
  - `web/tests/bestaetigung.test.ts`
  - `tests/test_konto_loeschen.py` (live, `@pytest.mark.supabase`)

**Interfaces:**
- Consumes: `createAdminClient()`, `aktuellerNutzer()` (Task 1)
- Produces:
  - `bestaetigt(eingabe: string | null | undefined): boolean` in `web/lib/bestaetigung.ts`
    - Ergebnis ist `eingabe?.trim() === "LÖSCHEN"`
  - `loescheNutzer(uid: string): Promise<void>` in `web/lib/nutzer-loeschen.ts`
    1. Alle Objekte unter `dokumente/<uid>/` seitenweise auflisten: `list(uid, { limit: 100, offset })`, bis eine Seite weniger als 100 Einträge liefert.
    2. Die Objekte in Blöcken entfernen.
    3. Danach `auth.admin.deleteUser(uid)`.
    4. Die Tabellenzeilen verschwinden über `on delete cascade`.
    5. Jeder Fehler wird als deutscher Fehler weitergeworfen. Es gibt kein stilles Weitermachen, damit nie nur ein halber Löschvorgang gemeldet wird.
  - Server-Action `kontoLoeschen(formData)` in `web/app/konto/actions.ts`
    1. Sitzung prüfen.
    1a. Ist der Aufrufer Admin (`aktuellerNutzer().admin`), folgt `redirect("/konto?fehler=…")` mit „Das Admin-Konto kann nicht gelöscht werden.“, und es wird nichts gelöscht.
    2. `bestaetigt(formData.get("bestaetigung"))` prüfen, sonst `redirect("/konto?fehler=…")`.
    3. `loescheNutzer(eigene id)` aufrufen.
    4. Abmelden (`auth.signOut()`).
    5. `redirect("/login?geloescht=1")`.
    6. `redirect` steht außerhalb von try/catch.
- Seite `/konto`:
  - **Abschnitt „Meine Daten exportieren“ zuerst**, mit Empfehlungstext: „Wir empfehlen dir, deine Bewerbungen vorher zu exportieren. Nach dem Löschen sind sie nicht wiederherstellbar.“ Daneben der Knopf zum vorhandenen `/export`.
  - Für den Admin erscheint statt des Lösch-Abschnitts nur der Satz „Das Admin-Konto kann nicht gelöscht werden. Es endet erst, wenn die Website und die Datenbank entfernt werden.“
  - Für alle anderen folgt dann der Abschnitt „Konto löschen“:
    - Liste dessen, was gelöscht wird: Bewerbungen, Kontakte, Interviews, Verlauf, Dokumente samt Dateien.
    - Eingabefeld „Tippe LÖSCHEN ein“.
    - Knopf `SendeKnopf` aus `web/app/bewerbungen/knoepfe.tsx`.
  - Die Login-Seite zeigt bei `?geloescht=1`: „Dein Konto wurde gelöscht.“

- [ ] Tests (`bestaetigung.test.ts`):
  - `"LÖSCHEN"` → true
  - `"  LÖSCHEN  "` → true
  - `"löschen"`, `"LOESCHEN"`, `""` → false
  - `null`, `undefined` → false
- [ ] Live-Test `tests/test_konto_loeschen.py`, aufgebaut wie `tests/test_rls.py`:
  1. Wegwerf-Nutzer anlegen, je eine Zeile in `applications`, `contacts`, `interviews` und `documents` einfügen und **101 kleine Dateien** in `dokumente/<uid>/` hochladen.
  2. Die Löschlogik auslösen.
     - Python kann die TS-Funktion nicht aufrufen. Deshalb prüft der Test das Ergebnis über einen kleinen Node-Aufruf (`node --experimental-strip-types` auf ein Skript, das `loescheNutzer` mit gesetzten Env-Variablen aufruft).
     - Alternativ, gleichwertig: Der Test prüft die Python-Nachbildung der Reihenfolge, und `loescheNutzer` wird zusätzlich einmal manuell per Skript gegen den Wegwerf-Nutzer gefahren.
     - Der Implementer wählt eine der beiden Varianten und begründet sie im Bericht.
  3. Danach muss gelten: 0 Zeilen in allen vier Tabellen für diese uid, 0 Objekte unter `<uid>/`, `auth.admin.getUserById` liefert „nicht gefunden“.
- [ ] Rot → Code → Grün, `npm run build`
- [ ] Danach prüfen, dass der Service-Key nicht in `web/.next/static` vorkommt: `grep -r "<erste 12 Zeichen des Keys>" web/.next/static` ergibt keinen Treffer. Den Key dabei nie ausgeben.
- [ ] Commit `Konto löschen mit Export-Empfehlung`

### Task 3: Admin-Seite „Nutzer“

**Files:**
- Create:
  - `web/app/admin/nutzer/page.tsx`
  - `web/app/admin/nutzer/actions.ts`
  - `web/lib/nutzerliste.ts` (pur)
- Test: `web/tests/nutzerliste.test.ts`

**Interfaces:**
- Consumes: `createAdminClient()`, `aktuellerNutzer()` (Task 1), `loescheNutzer(uid)` (Task 2)
- Produces:
  - `nutzerZeilen(users: Array<{ id: string; email?: string; created_at: string; user_metadata?: { full_name?: string; name?: string } }>): Array<{ id: string; name: string; email: string; dabeiSeit: string }>` in `web/lib/nutzerliste.ts`
    - `name` ist `full_name`, sonst `name`, sonst `"–"`
    - `dabeiSeit` ist das Datum im Format TT.MM.JJJJ in Europe/Berlin
    - sortiert nach `created_at`, älteste zuerst
  - Seite `/admin/nutzer`:
    - Ist der Aufrufer kein Admin, folgt `notFound()`.
    - Sonst `auth.admin.listUsers({ page, perPage: 100 })` über alle Seiten.
    - Tabelle mit Name, E-Mail und „dabei seit“, pro Zeile ein Knopf „Entfernen“.
    - Bei Admin-Zeilen (auch der eigenen) steht statt des Knopfes der Text „Admin“.
    - Über der Tabelle der Hinweis: „Neue Freunde: In der Google Cloud Console als Testnutzer eintragen, dann den Link zur Website schicken.“
  - Server-Action `nutzerEntfernen(uid)`:
    1. Ohne Admin-Rechte folgt `notFound()`.
    2. Die uid muss uuid-förmig sein.
    3. Ist `uid === eigene id` oder hat die Ziel-E-Mail laut `istAdmin` Admin-Rechte, folgt `redirect("/admin/nutzer?fehler=…")` mit „Das Admin-Konto kann nicht gelöscht werden.“
    4. Sonst `loescheNutzer(uid)` und `redirect("/admin/nutzer")`.
  - Der Knopf ist eine Client-Komponente mit `confirm("<Name> entfernen? Bitte die Person vorher, ihre Daten zu exportieren. Alle Bewerbungen und Dateien werden endgültig gelöscht.")`, nach dem Muster des vorhandenen Lösch-Knopfs in `web/app/bewerbungen/knoepfe.tsx`.

- [ ] Tests (`nutzerliste.test.ts`):
  - Name aus `full_name`, Ersatz durch `name`, Ersatz durch `"–"`
  - `dabeiSeit` für `"2026-11-08T23:30:00Z"` ergibt `"09.11.2026"` (Berliner Zeit)
  - Sortierung nach `created_at`
- [ ] Rot → Code → Grün, `npx tsc --noEmit`, `npm run build`
- [ ] Live-Check mit zwei Wegwerf-Nutzern, A als Admin über `ADMIN_EMAIL` im Skript-Env:
  - B entfernen: B ist weg.
  - A entfernt A: wird abgelehnt. A ruft kontoLoeschen auf: wird abgelehnt, A existiert weiter.
  - B als Nicht-Admin ruft die Liste ab: kein Zugriff.
  - Beide Nutzer danach löschen.
- [ ] Commit `Admin-Seite Nutzer`

### Task 4: Datenschutzerklärung, Doku und Nutzer-To-dos

**Files:**
- Create: `web/app/datenschutz/page.tsx`
- Modify:
  - `web/proxy.ts`: `datenschutz` in die Ausnahmen des Matchers aufnehmen, damit die Seite ohne Login erreichbar ist
  - `web/app/login/page.tsx`: Link „Datenschutz“
  - `web/app/layout.tsx` oder `web/app/kopf.tsx`: Link „Datenschutz“ in der Fußzeile
  - `README.md`, `docs/STATUS.md`

**Inhalt `/datenschutz`** (kurz, deutsch, als normaler Text, kein HTML aus Daten):
- **Verantwortlich:** Mark Galysh, markgaly99@gmail.com. Privates, nicht-kommerzielles Projekt für Freunde.
- **Was gespeichert wird:**
  - Google-Name und E-Mail für die Anmeldung
  - deine Bewerbungen, Kontakte, Interviews, Notizen und hochgeladenen Dokumente
- **Wo:**
  - Supabase (Server in Frankfurt, EU) für Datenbank und Dateien
  - Vercel für die Website
  - ein tägliches Backup der Datenbank in einem privaten GitHub-Repo; Dateien sind darin nicht enthalten
- **Wer es sieht:** nur du. Auch der Betreiber sieht deine Bewerbungen nicht über die Website. Technisch hat er als Datenbank-Inhaber Zugriff.
- **Löschen:** jederzeit unter „Konto“. Alles wird sofort entfernt. Aus dem Backup verschwindet es mit dem nächsten täglichen Lauf, die Git-Historie des privaten Backups behält ältere Stände.
- **Keine Werbung, kein Tracking, keine Weitergabe.**
- **Stand:** 2026-11-08.

**README:**
- Abschnitt „Freunde einladen“:
  1. Google Cloud Console → APIs & Dienste → OAuth-Zustimmungsbildschirm → Zielgruppe → Testnutzer → „Add users“ → Gmail-Adresse eintragen.
  2. Den Link zur Website schicken.
  3. Woran man erkennt, dass es geklappt hat: Der Freund taucht auf der Admin-Seite „Nutzer“ auf.

  Jeder Schritt mit Warum.
- Abschnitt „Vercel“: die zwei Server-Variablen `SUPABASE_SERVICE_KEY` und `ADMIN_EMAIL` (beide ohne `NEXT_PUBLIC_`), mit Warum.

**STATUS:**
- Die Nutzer-To-dos werden als nummerierte Schlussliste von Phase 2 geführt. Neu dazu:
  - `SUPABASE_SERVICE_KEY` und `ADMIN_EMAIL` in Vercel und `web/.env.local` eintragen
  - erster Freund als Google-Testnutzer
- Das To-do „Registrierung abschalten“ entfällt (Entscheidung vom 2026-11-08).

- [ ] Prüfen:
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/datenschutz` liefert ohne Login 200.
  - `/konto` liefert ohne Login eine Weiterleitung auf /login.
- [ ] `npm test`, `npm run build`, `py -m pytest -q`
- [ ] Commit `Datenschutzerklärung und Doku für Phase 2`

### Task 5 (gemeinsam mit dem Nutzer, nach dem Code): Inbetriebnahme

Kein Code. Ich führe den Nutzer Schritt für Schritt durch, jeweils mit Was, Warum und Woran man den Erfolg erkennt, in dieser Reihenfolge:
1. Migrationen 002, 003 und 004 ausführen.
2. Klicktest.
3. Secret-Key rotieren.
4. Vercel einrichten, inklusive der vier Variablen.
5. Die Vercel-Adresse in Supabase URL Configuration eintragen.
6. `SUPABASE_DB_URL` in jobradar-privat setzen und den Backup-Lauf starten.
7. GitHub Pages abschalten.
8. Den ersten Freund als Testnutzer eintragen und gemeinsam testen, dass er nur seine eigenen Daten sieht.
