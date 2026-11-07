const test = require("node:test");
const assert = require("node:assert");
const { filtere } = require("../site/app.js");

const U = [
  { name: "A", groesse_klasse: "<50", kategorie: ["Tech", "Raumfahrt"] },
  { name: "B", groesse_klasse: "1.000+", kategorie: ["Energie"] },
];
const S = [
  { id: "1", unternehmen: "A", titel: "Python Dev", ort: "München", remote: false, beschreibung_kurz: "Backend", erstmals_gesehen: "2026-11-01" },
  { id: "2", unternehmen: "B", titel: "Ingenieur", ort: "Berlin", remote: true, beschreibung_kurz: "Netz Python", erstmals_gesehen: "2026-11-05" },
  { id: "3", unternehmen: "B", titel: "Koch", ort: "Hamburg", remote: false, beschreibung_kurz: "", erstmals_gesehen: "2026-11-03" },
];
const leer = { groessen: [], kategorien: [], ort: "", remote: false, stichwort: "", neuSeit: "" };
const ids = (f) => filtere(S, U, { ...leer, ...f }).map((s) => s.id);

test("leere Filter geben alles, neueste zuerst", () => assert.deepStrictEqual(ids({}), ["2", "3", "1"]));
test("Größe", () => assert.deepStrictEqual(ids({ groessen: ["<50"] }), ["1"]));
test("Kategorie: eine von mehreren reicht", () => {
  assert.deepStrictEqual(ids({ kategorien: ["Raumfahrt"] }), ["1"]);
  assert.deepStrictEqual(ids({ kategorien: ["Raumfahrt", "Energie"] }), ["2", "3", "1"]);
});
test("Ort Teilwort ohne Groß/Klein", () => assert.deepStrictEqual(ids({ ort: "ünch" }), ["1"]));
test("nur Remote", () => assert.deepStrictEqual(ids({ remote: true }), ["2"]));
test("Stichwort in Titel oder Kurzbeschreibung", () => {
  assert.deepStrictEqual(ids({ stichwort: "python" }), ["2", "1"]);
  assert.deepStrictEqual(ids({ stichwort: "koch" }), ["3"]);
});
test("neu seit", () => assert.deepStrictEqual(ids({ neuSeit: "2026-11-03" }), ["2", "3"]));
