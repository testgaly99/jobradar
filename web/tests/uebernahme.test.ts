import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { pruefeUebernahme, leseAnker, textZuLang, seitenUrsprung, lesezeichen, lesezeichenCode, MAX_TEXT } from "../lib/uebernahme.ts";

const gut = { url: "https://www.linkedin.com/jobs/view/1/", titel: "Data Engineer", firma: "Acme", ort: "Berlin", text: "Wir suchen …" };

test("pruefeUebernahme: gültig, fehlende Felder werden leer", () => {
  assert.deepEqual(pruefeUebernahme(gut), gut);
  assert.deepEqual(pruefeUebernahme({ url: "http://example.com/a" }), { url: "http://example.com/a", titel: "", firma: "", ort: "", text: "" });
  assert.equal(pruefeUebernahme({ ...gut, text: "x".repeat(MAX_TEXT) })?.text.length, MAX_TEXT);
});

test("pruefeUebernahme: zu lang, falsche Typen, falsche URL", () => {
  assert.equal(pruefeUebernahme({ ...gut, text: "x".repeat(MAX_TEXT + 1) }), null);
  assert.equal(pruefeUebernahme({ ...gut, titel: "x".repeat(301) }), null);
  assert.equal(pruefeUebernahme({ ...gut, url: "https://a.de/" + "x".repeat(2000) }), null);
  for (const x of [null, undefined, "text", 42, [], { ...gut, titel: 5 }, { ...gut, firma: { name: "x" } }, { ...gut, text: ["a"] }])
    assert.equal(pruefeUebernahme(x), null, JSON.stringify(x));
  for (const url of ["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,x", "ftp://a.de/", "kein link", ""])
    assert.equal(pruefeUebernahme({ ...gut, url }), null, url);
});

test("seitenUrsprung: nur http(s)", () => {
  assert.equal(seitenUrsprung("localhost:3000", null), "http://localhost:3000");
  assert.equal(seitenUrsprung("jobradar.vercel.app", "https"), "https://jobradar.vercel.app");
  assert.equal(seitenUrsprung("jobradar.vercel.app", null), "https://jobradar.vercel.app");
  assert.equal(seitenUrsprung("jobradar.vercel.app", "javascript"), "https://jobradar.vercel.app");
  assert.equal(seitenUrsprung("a.de", "https,http"), "https://a.de");
  assert.equal(seitenUrsprung("a.de/pfad\"x", "https"), "https://a.de");
  assert.equal(seitenUrsprung(null, "https"), null);
  assert.equal(seitenUrsprung("a b", "https"), null);
});

test("Lesezeichen: gültiges JavaScript, unter 2 KB, nur die eigene Adresse", () => {
  const code = lesezeichenCode("https://jobradar.vercel.app");
  assert.ok(code.length < 2048, `Länge ${code.length}`);
  assert.doesNotThrow(() => new Function(code));
  const l = lesezeichen("https://jobradar.vercel.app");
  assert.ok(l.startsWith("javascript:"));
  assert.equal(decodeURIComponent(l.slice(11)), code);
  assert.ok(!/<script|https?:\/\/(?!jobradar\.vercel\.app)/.test(code.replace(/"application\/ld\+json"/, "")), "keine fremden Adressen");
});

// Lässt das Lesezeichen in einer nachgebauten Seite laufen und liefert, welche Adresse der neue Tab bekommt.
function lauf(seite: { href: string; title: string; ldjson?: unknown; og?: string; el?: Record<string, string>; markiert?: string }) {
  const offen: string[] = [];
  const tab: { opener: unknown; location?: string } = { opener: {} };
  const el = (text: string) => ({ innerText: text, textContent: text });
  const document = {
    title: seite.title,
    querySelector: (s: string) => (s.startsWith("meta") ? (seite.og ? { content: seite.og } : null) : seite.el?.[s] ? el(seite.el[s]) : null),
    querySelectorAll: () => (seite.ldjson ? [{ textContent: JSON.stringify(seite.ldjson) }] : []),
  };
  const fenster = { open: (u: string) => { offen.push(u); return tab; } };
  const ctx = vm.createContext({
    window: fenster, document, location: { href: seite.href, hostname: new URL(seite.href).hostname },
    getSelection: () => seite.markiert ?? "", alert: () => {}, encodeURIComponent,
    DOMParser: class { parseFromString(h: string) { return { body: { textContent: h.replace(/<[^>]+>/g, " ") } }; } },
  });
  vm.runInContext(lesezeichenCode("http://localhost:3000"), ctx);
  const ziel = String(tab.location);
  return { offen, ziel, opener: tab.opener, daten: leseAnker(ziel.slice(ziel.indexOf("#"))) };
}

test("Lesezeichen: JSON-LD JobPosting", () => {
  const r = lauf({
    href: "https://karriere.example.com/job/1", title: "Karriere",
    ldjson: { "@graph": [{ "@type": "Organization" }, { "@type": "JobPosting", title: "Data Engineer", hiringOrganization: { name: "Acme" },
      jobLocation: [{ address: { addressLocality: "Berlin" } }], description: "<p>Wir suchen</p>" }] },
  });
  assert.deepEqual(r.offen, ["about:blank"]);
  assert.ok(r.ziel.startsWith("http://localhost:3000/bewerbungen/uebernehmen#"), r.ziel);
  assert.equal(r.opener, null);
  assert.deepEqual(r.daten, { url: "https://karriere.example.com/job/1", titel: "Data Engineer", firma: "Acme", ort: "Berlin", text: "Wir suchen" });
});

test("Lesezeichen: LinkedIn-Elemente, Markierung schlägt Anzeigentext", () => {
  const r = lauf({
    href: "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=123", title: "(3) Data Engineer | Acme | LinkedIn",
    el: { h1: "Data Engineer", ".job-details-jobs-unified-top-card__company-name a": "Acme GmbH",
      ".job-details-jobs-unified-top-card__primary-description-container": "Berlin, Deutschland · vor 2 Tagen", "#job-details": "Langer Text" },
    markiert: "  Nur dieser Teil  ",
  });
  assert.deepEqual(r.daten, {
    url: "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=123", titel: "Data Engineer", firma: "Acme GmbH", ort: "Berlin, Deutschland", text: "Nur dieser Teil",
  });
});

test("Lesezeichen: document.title „Titel | Firma | LinkedIn“ als letzte Quelle", () => {
  const r = lauf({ href: "https://www.linkedin.com/jobs/view/123/", title: "(1) Backend Dev | Beta AG | LinkedIn" });
  const d = r.daten;
  assert.equal(d?.titel, "Backend Dev");
  assert.equal(d?.firma, "Beta AG");
});

test("Lesezeichen: zu langer Anker wird über den Text gekürzt", () => {
  const r = lauf({ href: "https://a.de/job", title: "x", el: {}, markiert: "€".repeat(MAX_TEXT) });
  assert.ok(r.ziel.length <= 100_000 + 100, `Länge ${r.ziel.length}`);
  assert.ok(r.daten && r.daten.text.length > 5000 && /^€+$/.test(r.daten.text));
});

test("leseAnker und textZuLang", () => {
  assert.deepEqual(leseAnker("#" + encodeURIComponent(JSON.stringify(gut))), gut);
  for (const h of ["", "#", "#%E0%A4%A", "#nicht-json", "#" + encodeURIComponent(JSON.stringify({ ...gut, url: "javascript:alert(1)" }))])
    assert.equal(leseAnker(h), null, h);
  assert.ok(!textZuLang("a\r\n".repeat(MAX_TEXT / 2)), "\\r\\n zählt als ein Zeichen");
  assert.ok(textZuLang("a".repeat(MAX_TEXT + 1)));
});
