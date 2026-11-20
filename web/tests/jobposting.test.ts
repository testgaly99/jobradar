import { test } from "node:test";
import assert from "node:assert/strict";
import { leseJobPosting } from "../lib/jobposting.ts";

const ld = (inhalt: string) => `<script type="application/ld+json">${inhalt}</script>`;
const JP = {
  "@type": "JobPosting", title: "Data Analyst (m/w/d)", description: "<p>Wir suchen <b>dich</b>.</p>",
  hiringOrganization: { "@type": "Organization", name: "Beispiel AG" },
  jobLocation: { "@type": "Place", address: { addressLocality: "München" } },
};

test("einfacher Block liefert alle vier Felder", () => {
  assert.deepEqual(leseJobPosting(`<html>${ld(JSON.stringify(JP))}</html>`),
    { titel: "Data Analyst (m/w/d)", firma: "Beispiel AG", ort: "München", text: "Wir suchen dich ." });
});

test("@graph, Text vor dem JSON, kaputter erster Block, @type als Liste", () => {
  const graph = ld(JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "Organization", name: "X" }, JP] }));
  assert.equal(leseJobPosting(graph)?.titel, JP.title);
  assert.equal(leseJobPosting(ld(`/* x */ ${JSON.stringify(JP)}`))?.firma, "Beispiel AG");
  assert.equal(leseJobPosting(ld("{ kaputt") + ld(JSON.stringify(JP)))?.ort, "München");
  assert.equal(leseJobPosting(ld(JSON.stringify({ ...JP, "@type": ["JobPosting"] })))?.titel, JP.title);
  assert.equal(leseJobPosting(ld(JSON.stringify([{ "@type": "WebPage" }, JP])))?.titel, JP.title);
});

test("Ort als Liste, Firma als Text, HTML-Liste in der Beschreibung", () => {
  const jp = { ...JP, hiringOrganization: "Text GmbH", jobLocation: [{ address: [{ addressLocality: "Berlin" }] }],
    description: "&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;li&gt;Python&lt;/li&gt;&lt;/ul&gt;" };
  assert.deepEqual(leseJobPosting(ld(JSON.stringify(jp))), { titel: JP.title, firma: "Text GmbH", ort: "Berlin", text: "SQL Python" });
});

test("ohne JobPosting, Titel oder Beschreibung → null", () => {
  assert.equal(leseJobPosting("<html>nichts</html>"), null);
  assert.equal(leseJobPosting(ld(JSON.stringify({ "@type": "Organization", name: "X" }))), null);
  assert.equal(leseJobPosting(ld(JSON.stringify({ ...JP, title: "" }))), null);
  assert.equal(leseJobPosting(ld(JSON.stringify({ ...JP, description: undefined }))), null);
});
