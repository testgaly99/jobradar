import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { anschreibenSetzen } from "../lib/anschreiben-setzen.ts";

const APP = "11111111-1111-4111-8111-111111111111";
const APP2 = "22222222-2222-4222-8222-222222222222";
const ALT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NEU = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NEU2 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type Zeile = Record<string, string | null>;
// Kleine Attrappe der Datenbank: versteht nur die Filter "spalte=eq.wert", die anschreibenSetzen nutzt.
function datenbank(apps: Zeile[], docs: Zeile[], o: { updateFehler?: boolean } = {}) {
  const geloescht: string[] = [];
  const entfernt: string[] = [];
  const sb = createClient("https://synthetisch.example.invalid", "synthetisch", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const method = init?.method ?? "GET";
      const antwort = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
      if (url.pathname === "/storage/v1/object/dokumente" && method === "DELETE") {
        entfernt.push(...JSON.parse(String(init?.body)).prefixes);
        return antwort([]);
      }
      const tabelle = url.pathname.replace("/rest/v1/", "");
      const filter = [...url.searchParams].filter(([, w]) => w.startsWith("eq.")).map(([k, w]) => [k, w.slice(3)]);
      const zeilen = tabelle === "applications" ? apps : docs;
      const treffer = zeilen.filter((z) => filter.every(([k, w]) => z[k] === w));
      if (method === "GET") return antwort(treffer);
      if (method === "PATCH") {
        if (o.updateFehler) return antwort({ code: "XX000", message: "INTERN" }, 500);
        for (const z of treffer) Object.assign(z, JSON.parse(String(init?.body)));
        return antwort([]);
      }
      if (method === "DELETE") {
        for (const z of treffer) { geloescht.push(z.id!); zeilen.splice(zeilen.indexOf(z), 1); }
        return antwort([]);
      }
      throw new Error(`unerwartet: ${method} ${url}`);
    } },
  });
  return { sb, geloescht, entfernt };
}

const dok = (id: string) => ({ id, art: "anschreiben", storage_pfad: `u/${id}.pdf` });

test("altes, sonst unbenutztes Anschreiben wird nach dem Umsetzen gelöscht (Zeile und Datei)", async () => {
  const apps = [{ id: APP, anschreiben_dokument_id: ALT }];
  const db = datenbank(apps, [dok(ALT), dok(NEU)]);
  assert.deepEqual(await anschreibenSetzen(db.sb, APP, NEU), {});
  assert.equal(apps[0].anschreiben_dokument_id, NEU);
  assert.deepEqual(db.geloescht, [ALT]);
  assert.deepEqual(db.entfernt, [`u/${ALT}.pdf`]);
});

test("altes Anschreiben einer zweiten Bewerbung bleibt erhalten", async () => {
  const apps = [{ id: APP, anschreiben_dokument_id: ALT }, { id: APP2, anschreiben_dokument_id: ALT }];
  const db = datenbank(apps, [dok(ALT), dok(NEU)]);
  assert.deepEqual(await anschreibenSetzen(db.sb, APP, NEU), {});
  assert.deepEqual(db.geloescht, []);
  assert.deepEqual(db.entfernt, []);
});

test("schlägt das Umsetzen fehl, wird nichts gelöscht", async () => {
  const apps = [{ id: APP, anschreiben_dokument_id: ALT }];
  const db = datenbank(apps, [dok(ALT), dok(NEU)], { updateFehler: true });
  assert.ok("fehler" in await anschreibenSetzen(db.sb, APP, NEU));
  assert.deepEqual(db.geloescht, []);
  assert.equal(apps[0].anschreiben_dokument_id, ALT);
});

test("zweimal nacheinander: nur das letzte bleibt verknüpft, beide vorigen sind gelöscht", async () => {
  const apps = [{ id: APP, anschreiben_dokument_id: ALT }];
  const docs = [dok(ALT), dok(NEU), dok(NEU2)];
  const db = datenbank(apps, docs);
  await anschreibenSetzen(db.sb, APP, NEU);
  await anschreibenSetzen(db.sb, APP, NEU2);
  assert.equal(apps[0].anschreiben_dokument_id, NEU2);
  assert.deepEqual(db.geloescht, [ALT, NEU]);
  assert.deepEqual(docs.map((d) => d.id), [NEU2]);
});

test("ein als Anschreiben verknüpfter Lebenslauf wird nie gelöscht", async () => {
  const apps = [{ id: APP, anschreiben_dokument_id: ALT }];
  const db = datenbank(apps, [{ id: ALT, art: "cv", storage_pfad: "u/cv.pdf" }, dok(NEU)]);
  await anschreibenSetzen(db.sb, APP, NEU);
  assert.deepEqual(db.geloescht, []);
});
