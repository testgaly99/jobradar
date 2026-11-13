import { test } from "node:test";
import assert from "node:assert/strict";
import { kiStand } from "../lib/ki-stand.ts";

test("kiStand zählt wartende und nicht auswertbare Anzeigen, fertige nirgends", () => {
  const z = [
    { text_hash: "a", ki_hash: null, ki_modell: null },          // wartet: nie ausgewertet
    { text_hash: "b", ki_hash: "alt", ki_modell: "x" },          // wartet: Text hat sich geändert
    { text_hash: "c", ki_hash: "c", ki_modell: "fehler" },       // Fehler
    { text_hash: "d", ki_hash: "d", ki_modell: "gut" },          // fertig
    { text_hash: null, ki_hash: null, ki_modell: null },         // ohne Text: zählt nirgends
    { text_hash: "e", ki_hash: "alt", ki_modell: "fehler" },     // alter Fehler, Text neu: wartet, kein Fehler
  ];
  assert.deepEqual(kiStand(z), { wartend: 3, fehler: 1 });
  assert.deepEqual(kiStand([]), { wartend: 0, fehler: 0 });
});

import { ladeAlle } from "../lib/ki-stand.ts";

test("ladeAlle blättert in 1000er-Seiten bis eine kürzere kommt", async () => {
  const alle = Array.from({ length: 1003 }, (_, i) => i);
  const aufrufe: number[] = [];
  const r = await ladeAlle(async (von, bis) => { aufrufe.push(von); return alle.slice(von, bis + 1); });
  assert.equal(r.length, 1003);
  assert.deepEqual(aufrufe, [0, 1000]);
});

test("ladeAlle: genau 1000 Zeilen kostet eine leere Folgeseite", async () => {
  const alle = Array.from({ length: 1000 }, (_, i) => i);
  assert.equal((await ladeAlle(async (von, bis) => alle.slice(von, bis + 1))).length, 1000);
});
