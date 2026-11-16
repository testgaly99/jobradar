import { test } from "node:test";
import assert from "node:assert/strict";
import { markiere, zaehleTreffer, leseAbschnitte } from "../lib/anzeige.ts";

const treffer = (t: string, b: string[]) => markiere(t, b).filter((s) => s.treffer).map((s) => s.text);

test("Treffer am Anfang, in der Mitte und am Ende", () => {
  assert.deepEqual(markiere("Python und SQL und Excel", ["python", "excel"]), [
    { text: "Python", treffer: true }, { text: " und SQL und ", treffer: false }, { text: "Excel", treffer: true },
  ]);
  assert.deepEqual(treffer("Wir nutzen SQL täglich", ["SQL"]), ["SQL"]);
});
test("Wortanfang: Team trifft Teamfähigkeit, Java trifft JavaScript, nie mitten im Wort", () => {
  assert.deepEqual(treffer("Python-Kenntnisse", ["Python"]), ["Python"]);
  assert.deepEqual(treffer("JavaScript und Java", ["Java"]), ["Java", "Java"]);
  assert.deepEqual(treffer("im Team, Teamfähigkeit", ["Team"]), ["Team", "Team"]);
  assert.deepEqual(treffer("Datenbank", ["bank"]), []);
});
test("Umlaute zählen als Buchstaben", () => {
  assert.deepEqual(treffer("Kein Ärger", ["ärger"]), ["Ärger"]);
  assert.deepEqual(treffer("Ärger", ["ger"]), []);
  assert.deepEqual(treffer("Büro", ["Üro"]), []);
});
test("mehrere Begriffe, längster zuerst", () => {
  assert.deepEqual(treffer("Power BI und Power Query", ["Power", "Power BI"]), ["Power BI", "Power"]);
});
test("Sonderzeichen im Begriff", () => {
  assert.deepEqual(treffer("Erfahrung mit C++ (gern) und C", ["C++", "(gern)"]), ["C++", "(gern)"]);
  assert.deepEqual(treffer("a(b", ["("]), []);
  assert.deepEqual(treffer("C", ["C++"]), []);
});
test("leere Begriffsliste und leerer Text", () => {
  assert.deepEqual(markiere("Text", []), [{ text: "Text", treffer: false }]);
  assert.deepEqual(markiere("Text", ["", "  "]), [{ text: "Text", treffer: false }]);
  assert.deepEqual(markiere("", ["a"]), []);
});
test("zaehleTreffer zählt Begriffe, nicht Vorkommen", () => {
  assert.equal(zaehleTreffer("SQL, SQL und Python", ["sql", "Python", "Rust"]), 2);
  assert.equal(zaehleTreffer("x", []), 0);
});
test("leseAbschnitte prüft die Form", () => {
  assert.deepEqual(leseAbschnitte([{ titel: "A", punkte: ["x", "", 3] }, { titel: "B", punkte: [] }, null, "s"]), [{ titel: "A", punkte: ["x"] }]);
  assert.equal(leseAbschnitte(null), null);
  assert.equal(leseAbschnitte({}), null);
});

test("Zusammengefügte Markierungssegmente ergeben für Unicode und jeden Leerraum exakt den Eingabetext", () => {
  const texte = [
    "", " \t\r\n  ", "  SQL\tund Python  ", "Ärger im Büro – Teamfähigkeit", "A\u0308rger und naïve Fähigkeiten",
    "SQL\r\nPython\rRust\n\nC++", "👩‍💻 SQL 👨‍👩‍👧‍👦", "𐐀 und 𝒜 und 中文 – عربى",
    '<script>alert("Text")</script> & SQL < 10', "C++ / C# / .NET / [SQL] / a(b)",
    "\u0000SQL\u0001\u2028Python\u2029", "\ud800 SQL \udfff", "SQLSQL und SQL; SQL", "ＳＱＬ und SQL",
  ];
  const listen = [[], ["SQL"], ["Python", "SQL", "C++"], ["ärger", "Team", "Büro"],
    ["", "  ", " SQL ", "SQL"], [".*", "[", "(", "\\", "$", "^"], ["👩‍💻", "𐐀", "中文"], ["A\u0308", "naïve"]];
  for (const text of texte) for (const begriffe of listen) {
    const vorher = [...begriffe];
    const segmente = markiere(text, begriffe);
    assert.equal(segmente.map((s) => s.text).join(""), text, JSON.stringify({ text, begriffe }));
    assert.ok(segmente.every((s) => s.text.length > 0));
    assert.deepEqual(begriffe, vorher);
  }
});

test("Regex-Sonderzeichen bleiben wörtliche Suchbegriffe und unveränderter Text", () => {
  for (const begriff of ["C++", "C#", ".NET", "[SQL]", "(gern)", "a|b", "a?b", "a*b", "a.b", "a^b", "a$b", "a{2}", "\\SQL"]) {
    const text = `Vorher ${begriff} nachher`;
    const segmente = markiere(text, [begriff]);
    assert.equal(segmente.map((s) => s.text).join(""), text);
    assert.deepEqual(segmente.filter((s) => s.treffer).map((s) => s.text), [begriff]);
  }
});

test("Gültige Abschnittsbelege behalten Leerraum, Unicode, Zeilenumbrüche und Duplikate", () => {
  const roh = [{ titel: "  Anforderungen & Büro  ", punkte: ["  SQL\r\nund Python  ", "👩‍💻 C++ < 10", "SQL", "SQL"] }];
  const vorher = structuredClone(roh);
  Object.freeze(roh[0].punkte);
  Object.freeze(roh[0]);
  Object.freeze(roh);
  const gelesen = leseAbschnitte(roh);
  assert.deepEqual(gelesen, vorher);
  for (const teil of gelesen!) for (const text of [teil.titel, ...teil.punkte]) {
    assert.equal(markiere(text, ["SQL", "Büro", "C++"]).map((s) => s.text).join(""), text);
  }
  assert.deepEqual(roh, vorher);
});

test("Vollständig kaputte Abschnittsdaten geben null für den bestehenden Text-Rückfall", () => {
  for (const roh of [null, undefined, "Text", 42, {}, [], [null, false, 3, "Text"],
    [{ titel: 1, punkte: ["SQL"] }], [{ titel: "A", punkte: "SQL" }],
    [{ titel: "A", punkte: [null, 3, "", " \n "] }], new Array(3)]) {
    assert.equal(leseAbschnitte(roh), null);
  }
});

test("Gemischte kaputte Abschnitte verwerfen nur unbrauchbare Einträge und erhalten verbleibende Texte", () => {
  const roh = [null, { titel: " Anforderungen ", punkte: ["  SQL\nPython  ", "", 3, null, "\t", "<b>C++</b>"] },
    { titel: "Kaputt", punkte: [] }, { titel: false, punkte: ["Nicht lesbar"] }, { titel: "Benefits", punkte: ["Büro & Remote"] }];
  const vorher = structuredClone(roh);
  assert.deepEqual(leseAbschnitte(roh), [
    { titel: " Anforderungen ", punkte: ["  SQL\nPython  ", "<b>C++</b>"] },
    { titel: "Benefits", punkte: ["Büro & Remote"] },
  ]);
  assert.deepEqual(roh, vorher);
});

test("Lücken in Punktlisten werden kontrolliert verworfen und echte Belege bleiben erhalten", () => {
  const punkte = new Array(4);
  punkte[1] = " SQL ";
  punkte[3] = "Python\r\nC++";
  assert.deepEqual(leseAbschnitte([{ titel: "Anforderungen", punkte }]), [
    { titel: "Anforderungen", punkte: [" SQL ", "Python\r\nC++"] },
  ]);
});

test("Trefferzählung und Markierung verändern schreibgeschützte Begriffslisten nicht", () => {
  const begriffe = [" SQL ", "Python", "", "SQL"];
  Object.freeze(begriffe);
  const text = "SQL\r\nSQL und Python";
  assert.equal(zaehleTreffer(text, begriffe), 2);
  assert.equal(markiere(text, begriffe).map((s) => s.text).join(""), text);
  assert.deepEqual(begriffe, [" SQL ", "Python", "", "SQL"]);
});
