import { test } from "node:test";
import assert from "node:assert/strict";
import { leseFilter, filterZuUrl, escapeIlike, tagePlus } from "../lib/filter.ts";

test("leerer Filter gibt /stellen", () => {
  const f = leseFilter({});
  assert.equal(filterZuUrl(f), "/stellen");
  assert.equal(f.seite, 1);
  assert.deepEqual(f.stadt, []);
});

test("Rundreise mit Mehrfachwerten, Stichwort, Datum, Seite", () => {
  const url = "/stellen?level=Senior&level=Lead&stadt=Berlin&stadt=Remote&q=data+engineer&neu=2026-11-01&seite=3";
  const f = leseFilter(Object.fromEntries([...new Set(new URL(url, "http://x").searchParams.keys())]
    .map((k) => [k, new URL(url, "http://x").searchParams.getAll(k)])));
  assert.deepEqual(f.level, ["Senior", "Lead"]);
  assert.equal(f.q, "data engineer");
  assert.equal(f.seite, 3);
  assert.equal(filterZuUrl(f), url);
});

test("Einzelwert, Muell und Duplikate werden bereinigt", () => {
  const f = leseFilter({ firma: "SAP", stadt: ["A", "A", " ", ""], neu: "gestern", seite: "-4" });
  assert.deepEqual(f.firma, ["SAP"]);
  assert.deepEqual(f.stadt, ["A"]);
  assert.equal(f.neu, "");
  assert.equal(f.seite, 1);
});

test("Sonderzeichen in Werten bleiben nach der Rundreise erhalten", () => {
  const f = leseFilter({ stadt: "Frankfurt, Main & Co" });
  const u = new URL(filterZuUrl(f), "http://x");
  assert.equal(u.searchParams.get("stadt"), "Frankfurt, Main & Co");
});

test("escapeIlike maskiert %, _, Komma, Klammern, Anfuehrungszeichen", () => {
  assert.equal(escapeIlike("100%_"), '"%100\\\\%\\\\_%"');
  assert.equal(escapeIlike('a,b(c)"'), '"%a,b(c)\\"%"');
});

test("tagePlus ueber Monatsgrenze", () => {
  assert.equal(tagePlus("2026-11-01", -2), "2026-10-30");
});
