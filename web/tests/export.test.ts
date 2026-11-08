import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32 } from "node:zlib";
import { csvDatei, csvFeld, dateiname } from "../lib/export.ts";
import { zip } from "../lib/zip.ts";

test("csvFeld: Quoting", () => {
  assert.equal(csvFeld("a"), "a");
  assert.equal(csvFeld("a;b"), '"a;b"');
  assert.equal(csvFeld('sag "hi"'), '"sag ""hi"""');
  assert.equal(csvFeld("x\ny"), '"x\ny"');
  assert.equal(csvFeld("x\ry"), '"x\ry"');
});

test("csvFeld: null, Zahl, Array", () => {
  assert.equal(csvFeld(null), "");
  assert.equal(csvFeld(undefined), "");
  assert.equal(csvFeld(4), "4");
  assert.equal(csvFeld(["a", "b"]), "a, b");
  assert.equal(csvFeld(true), "true");
});

test("csvFeld: Formel-Schutz", () => {
  for (const s of ["=1+1", "+1", "-1", "@x", "\tx"]) assert.equal(csvFeld(s)[0] === '"' ? csvFeld(s)[1] : csvFeld(s)[0], "'");
  assert.equal(csvFeld("\rx"), "\"'\rx\"");
  assert.equal(csvFeld("a=b"), "a=b");
});

test("csvDatei: BOM, Kopfzeile, CRLF, Semikolon", () => {
  const t = csvDatei(["a", "b"], [{ a: "1", b: null }, { a: "x;y", b: 2 }]);
  assert.equal(t, "\uFEFFa;b\r\n1;\r\n\"x;y\";2\r\n");
});

test("dateiname bereinigen", () => {
  assert.equal(dateiname("Lebenslauf Müller (v2).pdf"), "Lebenslauf_M_ller__v2_.pdf");
  assert.equal(dateiname("../../etc/passwd"), ".._.._etc_passwd");
  assert.equal(dateiname("a".repeat(300) + ".pdf").length, 100);
  assert.equal(dateiname(""), "datei");
});

// Minimaler ZIP-Leser: Central Directory -> lokale Header.
test("zip: Round-Trip", () => {
  const dateien = [{ name: "bewerbungen.csv", data: Buffer.from("\uFEFFä;b\r\n") }, { name: "k.csv", data: "x" }];
  const z = zip(dateien);
  const ende = z.length - 22;
  assert.equal(z.readUInt32LE(ende), 0x06054b50);
  assert.equal(z.readUInt16LE(ende + 10), 2);
  let p = z.readUInt32LE(ende + 16);
  dateien.forEach((d) => {
    const daten = Buffer.from(d.data);
    assert.equal(z.readUInt32LE(p), 0x02014b50);
    assert.equal(z.readUInt16LE(p + 8) & 0x800, 0x800);
    const crc = z.readUInt32LE(p + 16), gr = z.readUInt32LE(p + 20);
    assert.equal(crc, crc32(daten));
    assert.equal(gr, daten.length);
    assert.equal(z.readUInt32LE(p + 24), daten.length);
    const nl = z.readUInt16LE(p + 28), lokal = z.readUInt32LE(p + 42);
    assert.equal(z.toString("utf8", p + 46, p + 46 + nl), d.name);
    assert.equal(z.readUInt32LE(lokal), 0x04034b50);
    assert.equal(z.readUInt32LE(lokal + 14), crc);
    const ln = z.readUInt16LE(lokal + 26), le = z.readUInt16LE(lokal + 28);
    assert.equal(z.toString("utf8", lokal + 30, lokal + 30 + ln), d.name);
    assert.deepEqual(z.subarray(lokal + 30 + ln + le, lokal + 30 + ln + le + gr), daten);
    p += 46 + nl;
  });
});
