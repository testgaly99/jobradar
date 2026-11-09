import { test } from "node:test";
import assert from "node:assert/strict";
import { analysiereLink, normFirma, normTitel, firmaPasst, slugAusFirma, htmlZuText } from "../lib/link-import.ts";
import { pruefeAbrufHost } from "../lib/ats-abruf.ts";

test("Greenhouse-Links", () => {
  for (const u of ["https://boards.greenhouse.io/helsing/jobs/123", "https://job-boards.greenhouse.io/helsing/jobs/123?x=1"]) {
    const a = analysiereLink(u);
    assert.deepEqual(a.ats, { typ: "greenhouse", id: "helsing", jobId: "123" });
    assert.equal(a.quelle, new URL(u).hostname);
  }
  const g = analysiereLink("https://helsing.ai/careers?gh_jid=987");
  assert.deepEqual(g.ats, { typ: "greenhouse", id: null, jobId: "987" });
});

test("Ashby, Lever, Personio", () => {
  const uuid = "6b1c2c3e-1111-4222-8333-444455556666";
  assert.deepEqual(analysiereLink(`https://jobs.ashbyhq.com/taktile/${uuid}`).ats, { typ: "ashby", id: "taktile", jobId: uuid });
  assert.deepEqual(analysiereLink(`https://jobs.lever.co/acme/${uuid}/apply`).ats, { typ: "lever", id: "acme", jobId: uuid });
  assert.deepEqual(analysiereLink("https://acme.jobs.personio.de/job/42?language=de").ats, { typ: "personio", id: "acme", jobId: "42" });
});

test("LinkedIn: Slug liefert Titel und Firma", () => {
  const a = analysiereLink("https://www.linkedin.com/jobs/view/senior-data-engineer-at-acme-gmbh-3912345678?trk=x");
  assert.equal(a.titel, "Senior Data Engineer");
  assert.equal(a.firma, "Acme Gmbh");
  assert.equal(a.ats, undefined);
});

test("LinkedIn nur mit Nummer, trk oder currentJobId: nichts erkennbar", () => {
  for (const u of ["https://www.linkedin.com/jobs/view/3912345678", "https://www.linkedin.com/jobs/view/3912345678/?trk=public_jobs",
    "https://www.linkedin.com/jobs/collections/?currentJobId=3912345678", "https://lnkd.in/abc123"]) {
    const a = analysiereLink(u);
    assert.equal(a.titel, undefined, u);
    assert.equal(a.firma, undefined, u);
  }
});

test("LinkedIn-Links werden zu .../jobs/view/<nummer>/ vereinheitlicht", () => {
  const ziel = "https://www.linkedin.com/jobs/view/3912345678/";
  for (const u of ["https://www.linkedin.com/jobs/collections/recommended/?currentJobId=3912345678&trk=x",
    "https://www.linkedin.com/jobs/search/?keywords=data&currentJobId=3912345678", "https://de.linkedin.com/jobs/view/3912345678?trk=public_jobs",
    "https://www.linkedin.com/jobs/view/senior-data-engineer-at-acme-gmbh-3912345678?trk=x"]) assert.equal(analysiereLink(u).link, ziel, u);
  for (const u of ["https://www.linkedin.com/jobs/collections/recommended/", "https://www.linkedin.com/jobs/search/?currentJobId=abc",
    "https://lnkd.in/abc123", "https://www.linkedin.com/in/someone/"]) assert.equal(analysiereLink(u).link, undefined, u);
});

test("Stepstone und sonstige Domains", () => {
  const s = analysiereLink("https://www.stepstone.de/stellenangebote--Softwareentwickler-Berlin-Siemens--1234567-inline.html");
  assert.equal(s.titel, "Softwareentwickler");
  assert.equal(s.firma, "Siemens");
  const mehr = analysiereLink("https://www.stepstone.de/stellenangebote--Data-Engineer-m-w-d-Berlin-Acme-GmbH--1-inline.html");
  assert.equal(mehr.titel, undefined);
  assert.deepEqual(analysiereLink("https://example.com/jobs/1"), { quelle: "example.com" });
});

test("Normalisierung", () => {
  assert.equal(normFirma("Acme GmbH & Co. KG"), "acme");
  assert.equal(normFirma("Müller-Werke AG"), "müllerwerke");
  assert.equal(normTitel("Senior Data Engineer (m/w/d)!"), "senior data engineer m w d");
  assert.ok(firmaPasst("Helsing GmbH", "Helsing"));
  assert.ok(firmaPasst("Helsing Defence", "helsing"));
  assert.ok(!firmaPasst("Other", "Helsing"));
  assert.equal(slugAusFirma("The Acme-Tech GmbH"), "theacmetech");
  assert.equal(htmlZuText("<p>Hallo&nbsp;<b>Welt</b> &amp; Co</p><script>x</script>"), "Hallo Welt & Co x");
});

test("Abruf-Allowlist und Sperrliste", () => {
  for (const u of ["https://boards-api.greenhouse.io/v1/boards/x/jobs", "https://api.ashbyhq.com/posting-api/job-board/x",
    "https://api.lever.co/v0/postings/x", "https://acme.jobs.personio.de/xml"]) assert.doesNotThrow(() => pruefeAbrufHost(u), u);
  for (const u of ["https://www.linkedin.com/jobs/view/1", "https://lnkd.in/x", "https://www.stepstone.de/a", "https://de.indeed.com/x",
    "https://www.glassdoor.com/x", "https://stepstone.fr/x", "https://example.com/", "https://a.b.jobs.personio.de/xml",
    "http://boards-api.greenhouse.io/x", "https://boards-api.greenhouse.io.evil.com/x", "https://localhost/"]) assert.throws(() => pruefeAbrufHost(u), u);
});

test("Stepstone mit kaputter Prozent-Kodierung wirft nicht", () => {
  assert.doesNotThrow(() => analysiereLink("https://www.stepstone.de/stellenangebote--%E0%A4%A--1-inline.html"));
});
