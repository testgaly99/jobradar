# Erweiterung verteilen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Angemeldete laden die Chrome-Erweiterung als ZIP von der Konto-Seite und richten sie mit einer Schritt-Anleitung (Chrome und Edge) ein; die eigene jobradar-Adresse steht zum Kopieren bereit.

**Architecture:** Ein Build-Skript packt `browser-erweiterung/chrome` (ohne Tests) beim `prebuild` nach `web/public/downloads/jobradar-erweiterung.zip` und schreibt die Version aus `manifest.json` nach `web/lib/erweiterung-version.json`. Die Konto-Seite zeigt Download, Version und Anleitung.

**Tech Stack:** Next.js 16, Node-Skript, neue devDependency `fflate@0.8.3` (MIT, Mai 2026, ZIP schreiben, nur im Build), `node --test`.

**Spec:** Entscheidung Q63 (`docs/fragen-und-antworten.md`): „jetzt Download von der Konto-Seite (ZIP, „Entpackte Erweiterung laden“, Anleitung mit eigener Adresse zum Kopieren); Chrome Web Store „nicht gelistet“ erst bei mehr Freunden oder öffentlichem Start“. Kein eigenes Design-Dokument (kleines Paket).

**Gebaut von Claude 2026-11-19** (Q232). Abweichung: `web/lib/erweiterung-version.json` liegt im Repo statt in `.gitignore`, weil Typprüfung (CI) und Offline-Build ohne `prebuild` laufen; ein Test hält sie gleich mit `manifest.json`. Zusätzlich `predev`, damit die ZIP auch lokal da ist. `/downloads` liegt hinter der Anmeldung (Proxy). Firefox und Safari bekommen wie das Handy den Hinweis „Nur am Computer mit Chrome oder Edge.“

## Global Constraints

- Codex nach `AGENTS.md` (kein `.env`, keine Live-DB, kein Push, Protokoll, `Agent: Codex`).
- Download nur für Angemeldete sichtbar (Link auf der Konto-Seite); die Datei selbst enthält nur öffentlichen Code aus dem Repo.
- ZIP enthält genau: `manifest.json`, `background.js`, `kern.mjs`, `options.html`, `options.js`, `README.md` und – sobald vorhanden – weitere Laufzeitdateien der Erweiterung (alles außer `*.test.mjs`, `*.test.ts`, Fixtures); Ordnername im ZIP `jobradar-erweiterung/`.
- Keine Adresse der Website im Repo: die Konto-Seite liest die eigene Adresse zur Laufzeit (`headers()`/`origin` der Anfrage).
- Texte wörtlich: Abschnitt „Browser-Erweiterung“, Knopf „Erweiterung herunterladen (Version {v})“, „Adresse kopieren“, Hinweis „Auf LinkedIn, StepStone und XING übernimmt die Erweiterung nichts.“
- Kein Chrome Web Store, keine Gebühr (CLAUDE.md 3.1).

## Review Focus

1. Vercel baut mit Stammordner `web` → `../browser-erweiterung` fehlt → Build bricht mit klarer Meldung ab statt eine leere ZIP zu liefern (Test Task 1).
2. Neue Testdatei in der Erweiterung (`helfer.test.mjs` aus Nr. 11a) → landet nicht in der ZIP (Test Task 1).
3. Version in der Konto-Seite = Version im `manifest.json` (Test Task 1).
4. Nutzer auf dem Handy → Hinweis „Nur am Computer mit Chrome oder Edge“ statt Anleitung (Test Task 2).

---

### Task 1: ZIP beim Build

**Files:** Create `web/scripts/erweiterung-zip.mjs`; Modify `web/package.json` (`"prebuild": "node scripts/erweiterung-zip.mjs"`, devDependency `fflate` mit fester Version), `.gitignore` (`web/public/downloads/`, `web/lib/erweiterung-version.json`); Test `web/tests/erweiterung-zip.test.ts`
**Interfaces — Produces:** `packeErweiterung(quelle: string, ziel: string): { version: string; dateien: string[] }`; Datei `web/lib/erweiterung-version.json` = `{ "version": "<manifest.version>" }`.
- [x] Step 1: Failing tests: Quelle mit `manifest.json`, `kern.mjs`, `vertrag.test.mjs` → `dateien` enthält `jobradar-erweiterung/manifest.json`, nicht den Test (Review Focus 2); Version aus dem Manifest (Review Focus 3); fehlender Quellordner → wirft „Ordner browser-erweiterung/chrome nicht gefunden – in Vercel ‚Include files outside the root directory‘ einschalten“ (Review Focus 1); ZIP ist mit `fflate.unzipSync` lesbar.
- [x] Step 2: FAIL. Step 3: implementieren. Step 4: PASS; `npm run build` lokal erzeugt die ZIP. Step 5: Commit `Erweiterung als ZIP beim Build`.

### Task 2: Konto-Seite

**Files:** Modify `web/app/konto/page.tsx`; Create `web/app/konto/erweiterung.tsx` (Client: „Adresse kopieren“ per `navigator.clipboard`), `web/lib/erweiterung-anleitung.ts`; Test `web/tests/erweiterung-anleitung.test.ts`
**Interfaces — Produces:** `anleitung(browser: "chrome" | "edge" | "mobil"): string[]` – Chrome: `chrome://extensions` → „Entwicklermodus“ ein → ZIP entpacken → „Entpackte Erweiterung laden“ → Ordner `jobradar-erweiterung` wählen → „Details“ → „Erweiterungsoptionen“ → Adresse einfügen → „Verbinden“ → Knopf anheften; Edge: dasselbe mit `edge://extensions`, „Entwicklermodus“, „Entpackte Erweiterung laden“; mobil: `["Nur am Computer mit Chrome oder Edge."]`. Dazu Abschnitt „Aktualisieren“: neue ZIP herunterladen, alten Ordner ersetzen, in `chrome://extensions` auf ↻ klicken. Browser-Erkennung aus dem User-Agent (Edge enthält `Edg/`).
- [x] Step 1: Failing tests: `anleitung("edge")[0]` enthält `edge://extensions`; `anleitung("mobil")` genau ein Satz (Review Focus 4); Chrome-Anleitung enthält „Entpackte Erweiterung laden“ und „Erweiterungsoptionen“.
- [x] Step 2: FAIL. Step 3: Abschnitt „Browser-Erweiterung“ auf der Konto-Seite (Download, Version, Anleitung je Browser, Adresse zum Kopieren, Hinweis zu LinkedIn/StepStone/XING); `browser-erweiterung/chrome/README.md` verweist für Nutzer auf die Konto-Seite. Step 4: PASS, Build grün. Step 5: Commit `Konto: Browser-Erweiterung herunterladen und einrichten`.

### Task 3: Doku und Halt

- [x] `docs/STATUS.md`, `docs/agenten-protokoll.md`, Warteschlange 🛑; `npm test`, `npm run build` grün; Commit `Erweiterung verteilen: Doku`.
- [ ] 🛑 Halt: Claude prüft nach dem nächsten Vercel-Build, dass die ZIP unter der Konto-Seite ladbar ist (falls nicht: Nutzer schaltet in Vercel → Settings → Build → „Include files outside the root directory“ ein), entpackt sie und lädt sie in einem Test-Chrome-Profil.
