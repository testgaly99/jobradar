import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { kopiereQuellen, umgebung } = require("../scripts/offline/pruefe.cjs");

test("Isolierte Kopie übernimmt Quellen und verweigert Umgebungsdateien/Caches", () => {
  const root = mkdtempSync(join(tmpdir(), "jobradar-offline-"));
  const src = join(root, "quelle"), dst = join(root, "ziel");
  mkdirSync(join(src, "app"), { recursive: true });
  mkdirSync(join(src, "lib"));
  writeFileSync(join(src, "app", "page.tsx"), "künstliche Quelle");
  writeFileSync(join(src, "app", ".env.kunst"), "künstlicher geheimer Testwert");
  writeFileSync(join(src, "package.json"), "{}");
  writeFileSync(join(src, ".env.local"), "künstlicher geheimer Testwert");
  mkdirSync(join(src, ".next"));
  writeFileSync(join(src, ".next", "alt"), "alter Cache");
  kopiereQuellen(src, dst);
  assert.ok(existsSync(join(dst, "app", "page.tsx")));
  assert.ok(existsSync(join(dst, "package.json")));
  assert.equal(existsSync(join(dst, ".env.local")), false);
  assert.equal(existsSync(join(dst, "app", ".env.kunst")), false);
  assert.equal(existsSync(join(dst, ".next")), false);
});

test("Quell-Symlinks werden nicht in den isolierten Build verfolgt", () => {
  const root = mkdtempSync(join(tmpdir(), "jobradar-offline-link-"));
  const src = join(root, "quelle");
  mkdirSync(join(src, "app"), { recursive: true });
  mkdirSync(join(root, "ausserhalb"));
  symlinkSync(join(root, "ausserhalb"), join(src, "app", "link"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => kopiereQuellen(src, join(root, "ziel")), /Verknüpfung/);
});

test("Kindprozessumgebung übernimmt keine Dienste-Schlüssel oder fremden Node-Optionen", () => {
  const env = umgebung("/test/guard.cjs", { PATH: "test", GROQ_API_KEY: "künstlich", NODE_OPTIONS: "fremd", SUPABASE_URL: "fremd",
    ADMIN_EMAIL: "geerbt@example.invalid", SUPABASE_SERVICE_KEY: "geerbter-kuenstlicher-wert" });
  assert.equal(env.GROQ_API_KEY, undefined);
  assert.equal(env.SUPABASE_URL, undefined);
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "https://offline.example.invalid");
  assert.equal(env.ADMIN_EMAIL, "offline-admin@example.invalid");
  assert.equal(env.SUPABASE_SERVICE_KEY, "synthetischer-offline-service-schluessel");
  assert.equal(env.NODE_OPTIONS, '--require "/test/guard.cjs"');
});

test("Netz-Guard blockiert HTTP und Socketverbindungen vor dem Zugriff", () => {
  const guard = new URL("../scripts/offline/netz-sperre.cjs", import.meta.url);
  const r = spawnSync(process.execPath, ["--require", fileURLToPath(guard), "-e",
    "const a=require('node:assert/strict'); a.throws(()=>require('node:https').get('https://example.invalid'),/gesperrt/); a.throws(()=>require('node:net').connect(443,'example.invalid'),/gesperrt/);"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("Netz-Guard erlaubt den lokalen Prüfserver, verhindert aber externe DNS-Abfragen", () => {
  const guard = fileURLToPath(new URL("../scripts/offline/netz-sperre.cjs", import.meta.url));
  const r = spawnSync(process.execPath, ["--require", guard, "-e",
    "const a=require('node:assert/strict'); a.throws(()=>require('node:dns').lookup('example.invalid',()=>{}),/gesperrt/); const s=require('node:net').createServer(); s.listen(0,'127.0.0.1',()=>s.close());"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("Browserfixture beantwortet nur markierten internen Redirect synthetisch, übriges Netz bleibt gesperrt", () => {
  const fixture = fileURLToPath(new URL("../scripts/offline/antworten.cjs", import.meta.url));
  const r = spawnSync(process.execPath, ["-e", `
    const a = require('node:assert/strict'); require(process.argv[1]);
    (async () => {
      const intern = { method: 'GET', next: { internal: 1 }, headers: { rsc: '1' } };
      a.equal((await fetch('http://localhost:3002/stellen/test', intern)).status, 204);
      await a.rejects(fetch('http://localhost:3002/stellen/test'), /gesperrt/);
      a.equal((await fetch('http://localhost:3002/konto?fehler=synthetisch', intern)).status, 204);
      a.equal((await fetch('http://localhost:3002/unterlagen', intern)).status, 204);
      a.equal((await fetch('http://localhost:3002/login?geloescht=1', intern)).status, 204);
      await a.rejects(fetch('http://localhost:3002/export', intern), /gesperrt/);
      await a.rejects(fetch('https://example.invalid/stellen/test', intern), /gesperrt/);
      a.throws(() => require('node:net').connect(3002, '127.0.0.1'), /gesperrt/);
    })().catch(() => { process.exitCode = 1; });
  `, fixture], { encoding: "utf8", cwd: mkdtempSync(join(tmpdir(), "jobradar-redirect-")) });
  assert.equal(r.status, 0, r.stderr);
});

test("Browserfixture beantwortet leere 4d-Kategorien und Stöberlinks ohne Wiederholungsfehler", () => {
  const fixture = fileURLToPath(new URL("../scripts/offline/antworten.cjs", import.meta.url));
  const r = spawnSync(process.execPath, ["-e", `
    const a = require('node:assert/strict'); require(process.argv[1]);
    (async () => {
      for (const p of ['/rest/v1/rpc/ranking_kategorien', '/rest/v1/stoebern_links', '/rest/v1/firmen_sichtbar', '/rest/v1/wunschfirmen', '/rest/v1/abgleich_stichwoerter']) {
        const r = await fetch('https://offline.example.invalid' + p, {method:'POST', body:'{}'});
        a.equal(r.status, 200); a.deepEqual(await r.json(), []);
      }
    })().catch(() => { process.exitCode = 1; });
  `, fixture], { encoding: "utf8", cwd: mkdtempSync(join(tmpdir(), "jobradar-kategorien-")) });
  assert.equal(r.status, 0, r.stderr);
});
