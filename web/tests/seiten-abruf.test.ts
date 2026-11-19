import { test } from "node:test";
import assert from "node:assert/strict";
import { darfAbrufen, holeFirmenseite, istOeffentlicheIp } from "../lib/seiten-abruf.ts";

const HTML = "<html><body>Stelle</body></html>";
const html = (body = HTML, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
const weiter = (ziel: string) => new Response(null, { status: 301, headers: { location: ziel } });

// Ersatz für fetch und DNS: zählt Abrufe, nie echtes Netz.
function netz(antworten: Record<string, () => Response>, ips: Record<string, string[]> = {}) {
  const abrufe: string[] = [];
  const holen = (async (url: string | URL | Request, optionen?: RequestInit) => {
    const u = String(url);
    abrufe.push(u);
    assert.equal(optionen?.redirect, "manual");
    assert.match(String((optionen?.headers as Record<string, string>)["User-Agent"]), /^jobradar\//);
    return (antworten[u] ?? (() => new Response("", { status: 404 })))();
  }) as typeof fetch;
  const aufloesen = async (host: string) => ips[host] ?? ["93.184.216.34"];
  return { abrufe, dep: { holen, aufloesen } };
}

test("istOeffentlicheIp: öffentliche ja, interne nein", () => {
  assert.equal(istOeffentlicheIp("8.8.8.8"), true);
  assert.equal(istOeffentlicheIp("2a00:1450:4001:80b::200e"), true);
  for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "192.168.1.1", "172.16.5.4", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "::", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "kein-ip"]) {
    assert.equal(istOeffentlicheIp(ip), false, ip);
  }
});

test("unzulässige Adressen werden ohne Abruf abgelehnt", async () => {
  for (const url of ["http://firma.example/job", "https://firma.example:8443/job", "https://user:pw@firma.example/job",
    "https://www.linkedin.com/jobs/view/1/", "https://de.indeed.com/viewjob?jk=1", "https://127.0.0.1/job"]) {
    const n = netz({});
    await assert.rejects(holeFirmenseite(url, n.dep), url);
    assert.equal(n.abrufe.length, 0, url);
  }
  const n = netz({}, { "intern.example": ["10.0.0.5"] });
  await assert.rejects(holeFirmenseite("https://intern.example/job", n.dep), /intern/i);
  assert.equal(n.abrufe.length, 0);
  const gemischt = netz({}, { "halb.example": ["8.8.8.8", "192.168.0.2"] });
  await assert.rejects(holeFirmenseite("https://halb.example/job", gemischt.dep));
  assert.equal(gemischt.abrufe.length, 0);
});

test("Weiterleitungen: interne Ziele und mehr als drei werden abgelehnt", async () => {
  const intern = netz({ "https://firma.example/job": () => weiter("http://169.254.169.254/") });
  await assert.rejects(holeFirmenseite("https://firma.example/job", intern.dep));
  assert.ok(!intern.abrufe.some((u) => u.includes("169.254")));

  const vier = netz({
    "https://firma.example/a": () => weiter("/b"), "https://firma.example/b": () => weiter("/c"),
    "https://firma.example/c": () => weiter("/d"), "https://firma.example/d": () => weiter("/e"), "https://firma.example/e": () => html(),
  });
  await assert.rejects(holeFirmenseite("https://firma.example/a", vier.dep), /zu viele Weiterleitungen/);

  const eine = netz({ "https://firma.example/alt": () => weiter("https://karriere.example/neu"), "https://karriere.example/neu": () => html() });
  assert.equal(await holeFirmenseite("https://firma.example/alt", eine.dep), HTML);
});

test("robots.txt wird beachtet, 404 erlaubt alles", async () => {
  const verboten = netz({ "https://firma.example/robots.txt": () => new Response("User-agent: *\nDisallow: /jobs", { status: 200 }) });
  await assert.rejects(holeFirmenseite("https://firma.example/jobs/1", verboten.dep), /robots/);
  assert.deepEqual(verboten.abrufe, ["https://firma.example/robots.txt"]);

  const frei = netz({ "https://firma.example/jobs/1": () => html() });
  assert.equal(await holeFirmenseite("https://firma.example/jobs/1", frei.dep), HTML);
});

test("nur HTML, höchstens 2 MB, Fehlerstatus wirft", async () => {
  const pdf = netz({ "https://firma.example/job": () => new Response("%PDF", { headers: { "content-type": "application/pdf" } }) });
  await assert.rejects(holeFirmenseite("https://firma.example/job", pdf.dep), /HTML/);
  const gross = netz({ "https://firma.example/job": () => html("x".repeat(2_097_153)) });
  await assert.rejects(holeFirmenseite("https://firma.example/job", gross.dep), /groß/);
  const genau = netz({ "https://firma.example/job": () => html("x".repeat(2_097_152)) });
  assert.equal((await holeFirmenseite("https://firma.example/job", genau.dep)).length, 2_097_152);
  const weg = netz({ "https://firma.example/job": () => html("", 404) });
  await assert.rejects(holeFirmenseite("https://firma.example/job", weg.dep), /404/);
});

test("darfAbrufen: 10 je Minute und Nutzer", () => {
  const t = 1_000_000;
  for (let i = 0; i < 10; i++) assert.equal(darfAbrufen("u1", t + i), true);
  assert.equal(darfAbrufen("u1", t + 10), false);
  assert.equal(darfAbrufen("u2", t + 10), true);
  assert.equal(darfAbrufen("u1", t + 60_001), true);
});
