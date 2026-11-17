import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { appOrigin, erfasseAnzeige, uebertrageImAppTab, erstelleImporteur, istPortal, PORTALE, MAX_ALTER } from "./kern.mjs";

const origin = "https://board.example.invalid";
const id = "11111111-1111-4111-8111-111111111111";

test("Ziel ist eine einzelne HTTPS-Origin oder genau localhost:3002", () => {
  assert.equal(appOrigin(`${origin}/`), origin);
  assert.equal(appOrigin("http://localhost:3002"), "http://localhost:3002");
  for (const wert of ["http://example.invalid", "http://localhost:3003", "https://u:p@example.invalid", `${origin}/pfad`, `${origin}/?x=1`, `${origin}/#x`, "javascript:alert(1)"]) {
    assert.throws(() => appOrigin(wert));
  }
});

function erfassung({ postings = [], auswahl = "", feldFokus = false, feldImBereich = false, h1 = ["Analyst"], titel = "Stellenanzeige", url = "https://karriere.example.invalid/job/7" } = {}) {
  const feld = { nodeType: 1, closest: () => ({}) };
  const document = {
    title: titel,
    activeElement: feldFokus ? feld : null,
    querySelectorAll(selector) {
      if (selector === 'script[type="application/ld+json"]') return postings.map((p) => ({ textContent: typeof p === "string" ? p : JSON.stringify(p) }));
      if (selector === "h1") return h1.map((textContent) => ({ textContent }));
      if (selector.includes("input,textarea")) return feldImBereich ? [feld] : [];
      throw Error(`Unerlaubtes Lesen: ${selector}`);
    },
    querySelector() { return null; },
    get body() { throw Error("Ganze Seite darf nicht gelesen werden"); },
    get cookie() { throw Error("Cookies dürfen nicht gelesen werden"); },
  };
  return vm.runInNewContext(`(${erfasseAnzeige.toString()})()`, {
    document, location: { href: url }, window: { getSelection: () => ({ rangeCount: auswahl ? 1 : 0, getRangeAt: () => ({ intersectsNode: () => feldImBereich }), toString: () => { if (feldFokus || feldImBereich) throw Error("Formularauswahl darf nicht gelesen werden"); return auswahl; } }) }, URL,
  });
}

test("Erfassung liest nur eine eindeutige strukturierte Anzeige, keine ganze Seite", () => {
  const r = erfassung({ postings: [{ "@type": "JobPosting", title: "SQL Analyst", hiringOrganization: { name: "Beispielfirma" }, description: "<p>SQL &amp; Reporting</p><script>heimlich()</script>" }] });
  assert.equal(r.link, "https://karriere.example.invalid/job/7");
  assert.equal(r.titel, "SQL Analyst");
  assert.equal(r.firma, "Beispielfirma");
  assert.equal(r.text, "SQL & Reporting");
});

test("Mehrere Anzeigen werden nicht zu einer Anzeige vermischt; Auswahl bleibt möglich", () => {
  const r = erfassung({ postings: [{ "@type": "JobPosting", title: "A", hiringOrganization: { name: "A" } }, { "@type": "JobPosting", title: "B", hiringOrganization: { name: "B" } }], auswahl: "Bewusst ausgewählter Text" });
  assert.equal(r.firma, undefined);
  assert.equal(r.titel, "Analyst");
  assert.equal(r.text, "Bewusst ausgewählter Text");
});

test("Ungültige JSON-Daten werden ignoriert, lange Auszüge begrenzt", () => {
  const r = erfassung({ postings: ["{"], auswahl: "a".repeat(60_000) });
  assert.equal(r.text.length, 50_000);
  assert.match(r.text, /gekürzt\]$/);
  assert.throws(() => erfassung({ url: "file:///geheim" }));
});

test("Fokus oder Auswahlbereich in Formular/Editor wird vor dem Auslesen ausgeschlossen", () => {
  for (const schutz of [{ feldFokus: true }, { feldImBereich: true }]) {
    const r = erfassung({ ...schutz, auswahl: "Private Eingabe" });
    assert.equal(r.text, undefined);
    const mitStelle = erfassung({ ...schutz, auswahl: "Private Eingabe", postings: [{ "@type": "JobPosting", title: "Analyst", description: "Öffentliche Aufgaben" }] });
    assert.equal(mitStelle.text, "Öffentliche Aufgaben");
  }
});

test("Portale: nur registrierbare Domain samt Subdomains, keine Ähnlichkeiten", () => {
  for (const h of ["linkedin.com", "de.linkedin.com", "www.stepstone.de", "stepstone.at", "de.indeed.com", "indeed.de", "uk.indeed.co.uk", "www.xing.com", "glassdoor.de", "www.monster.fr", "www.kununu.com", "WWW.LinkedIn.com"]) assert.equal(istPortal(h), true, h);
  for (const h of ["evil-linkedin.com", "linkedin.com.evil.example", "notindeed.de", "stepstone.evil.com", "linkedin.de", "xing.de", "kununu.de", "karriere.example.invalid", "", "indeed"]) assert.equal(istPortal(h), false, h);
  assert.ok(PORTALE.includes("linkedin.com"));
});

function appAufruf({ url = `${origin}/bewerbungen/import`, status = 201, body = { id, vorhanden: false }, kaputt = false } = {}) {
  const anzeige = { textContent: "Bereit", dataset: {} };
  const calls = [];
  const top = {};
  const context = {
    location: new URL(url), window: { top }, self: top, URL, AbortController, setTimeout, clearTimeout,
    document: { querySelector: () => anzeige },
    fetch: async (ziel, init) => { calls.push({ ziel, init }); if (kaputt) throw Error("offline"); return { status, ok: status >= 200 && status < 300, headers: { get: () => "application/json" }, json: async () => body }; },
  };
  return { anzeige, calls, run: () => vm.runInNewContext(`(${uebertrageImAppTab.toString()})(${JSON.stringify(origin)}, {link:"https://quelle.example.invalid/job"})`, context) };
}

test("App-Brücke verwendet nur festen same-origin POST und vorhandene Cookies", async () => {
  const f = appAufruf();
  const r = await f.run();
  assert.equal(r.art, "ok");
  assert.equal(r.id, id);
  assert.equal(f.calls[0].ziel, `${origin}/api/stellen-import`);
  assert.equal(f.calls[0].init.credentials, "same-origin");
  assert.equal(f.calls[0].init.mode, "same-origin");
  assert.equal(f.calls[0].init.redirect, "error");
  assert.equal(f.calls[0].init.method, "POST");
  assert.equal(f.calls[0].init.headers.Authorization, undefined);
});

test("Fremde Origin oder falscher Pfad lösen keinen POST aus", async () => {
  for (const url of ["https://boese.example.invalid/bewerbungen/import", `${origin}/konto`]) {
    const f = appAufruf({ url });
    assert.equal((await f.run()).art, "fehler");
    assert.equal(f.calls.length, 0);
  }
});

test("Anmeldung, gefälschte Erfolgsausgabe und Netzfehler ergeben keinen Erfolg", async () => {
  assert.equal((await appAufruf({ status: 401, body: { fehler: "Anmelden" } }).run()).art, "anmelden");
  assert.equal((await appAufruf({ body: { id: "https://boese.example.invalid", vorhanden: false } }).run()).art, "unklar");
  assert.equal((await appAufruf({ kaputt: true }).run()).art, "unklar");
});

function ersatz() {
  const session = {};
  const tabs = new Map([[7, { id: 7, url: "https://quelle.example.invalid/job", status: "complete" }]]);
  const aufrufe = [];
  let antwort = { art: "ok", id, vorhanden: false };
  let zeit = 1000;
  let nummer = 0;
  const chrome = {
    storage: {
      local: { get: async () => ({ appOrigin: origin }) },
      session: {
        get: async (key) => key === null ? structuredClone(session) : { [key]: structuredClone(session[key]) },
        set: async (obj) => Object.assign(session, structuredClone(obj)),
        remove: async (keys) => { for (const key of [keys].flat()) delete session[key]; },
      },
    },
    permissions: { contains: async () => true },
    runtime: { openOptionsPage: async () => aufrufe.push("options") },
    action: { setBadgeText: async (x) => aufrufe.push(["badge", x]), setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
    tabs: {
      create: async ({ url }) => { const t = { id: 20 + nummer++, url, status: "loading" }; tabs.set(t.id, t); return t; },
      get: async (tabId) => { if (!tabs.has(tabId)) throw Error("Tab geschlossen"); return tabs.get(tabId); },
      update: async (tabId, patch) => { Object.assign(tabs.get(tabId), patch); aufrufe.push(["update", tabId, patch]); },
    },
    scripting: { executeScript: async (args) => { aufrufe.push(["script", args]); return [{ frameId: 0, result: args.func === erfasseAnzeige ? { link: "https://quelle.example.invalid/job", titel: "Analyst" } : antwort }]; } },
  };
  const importer = erstelleImporteur(chrome, { jetzt: () => zeit, uuid: () => `00000000-0000-4000-8000-${String(nummer).padStart(12, "0")}` });
  return { chrome, session, tabs, aufrufe, importer, antwort: (wert) => { antwort = wert; }, zeit: (wert) => { zeit = wert; } };
}

test("Auf Portalen wird kein Skript eingeschleust; Adresse und Titel stammen vom Tab, sonst wird erfasst", async () => {
  const portal = ersatz();
  const url = "https://de.linkedin.com/jobs/view/1";
  portal.tabs.set(5, { id: 5, url, title: "Analyst | LinkedIn", status: "complete" });
  await portal.importer.starten(portal.tabs.get(5));
  assert.equal(portal.aufrufe.filter((a) => a[0] === "script").length, 0);
  assert.deepEqual(Object.values(portal.session).map((p) => p.payload), [{ link: url, titel: "Analyst | LinkedIn" }]);
  const normal = ersatz();
  await normal.importer.starten(normal.tabs.get(7));
  assert.equal(normal.aufrufe.filter((a) => a[0] === "script" && a[1].func === erfasseAnzeige).length, 1);
});

test("Nur gestarteter Transfer wird im gebundenen App-Tab ausgeführt, danach einmalig beendet", async () => {
  const f = ersatz();
  await f.importer.fortsetzen(99);
  assert.equal(f.aufrufe.length, 0);
  await f.importer.starten(f.tabs.get(7));
  const t = f.tabs.get(20);
  t.status = "complete";
  await Promise.all([f.importer.fortsetzen(20), f.importer.fortsetzen(20)]);
  await f.importer.fortsetzen(20);
  assert.equal(f.aufrufe.filter(([art, args]) => art === "script" && args.func === uebertrageImAppTab).length, 1);
  assert.equal(Object.keys(f.session).length, 0);
  assert.equal(t.url, `${origin}/bewerbungen?id=${id}`);
});

test("Vorhandene Karte wird auch dann sichtbar geöffnet, wenn sie im Archiv liegt", async () => {
  const f = ersatz();
  await f.importer.starten(f.tabs.get(7));
  f.antwort({ art: "ok", id, vorhanden: true });
  f.tabs.get(20).status = "complete";
  await f.importer.fortsetzen(20);
  assert.equal(f.tabs.get(20).url, `${origin}/bewerbungen?id=${id}&archiv=1`);
});

test("Eigene App wird nicht importiert und wiederholte Quellklicks teilen einen Auftrag", async () => {
  const f = ersatz();
  await Promise.all([f.importer.starten(f.tabs.get(7)), f.importer.starten(f.tabs.get(7))]);
  await f.importer.starten(f.tabs.get(7));
  assert.equal(Object.keys(f.session).length, 1);
  assert.equal(f.tabs.size, 2);
  const g = ersatz();
  await g.importer.starten({ id: 8, url: `${origin}/bewerbungen` });
  assert.equal(Object.keys(g.session).length, 0);
  assert.equal(g.aufrufe.filter(([art]) => art === "script").length, 0);
});

test("Login-Unterbrechung erhält Entwurf und führt nach Rückkehr wieder zur Importseite", async () => {
  const f = ersatz();
  await f.importer.starten(f.tabs.get(7));
  Object.assign(f.tabs.get(20), { status: "complete", url: `${origin}/login` });
  await f.importer.fortsetzen(20);
  assert.equal(Object.values(f.session)[0].phase, "anmelden");
  f.tabs.get(20).url = "https://accounts.example.invalid/oauth";
  await f.importer.fortsetzen(20);
  f.tabs.get(20).url = `${origin}/`;
  await f.importer.fortsetzen(20);
  assert.equal(f.tabs.get(20).url, `${origin}/bewerbungen/import`);
  await f.importer.fortsetzen(20);
  assert.equal(Object.keys(f.session).length, 0);
});

test("Fertig-Ereignis während laufender Tabprüfung geht nicht verloren", async () => {
  const f = ersatz();
  await f.importer.starten(f.tabs.get(7));
  const original = f.chrome.tabs.get;
  let freigeben;
  let gelesen;
  const lesenBegonnen = new Promise((resolve) => { gelesen = resolve; });
  const warten = new Promise((resolve) => { freigeben = resolve; });
  let zuerst = true;
  f.chrome.tabs.get = async (tabId) => {
    if (!zuerst) return original(tabId);
    zuerst = false;
    const alterStand = { ...(await original(tabId)) };
    gelesen();
    await warten;
    return alterStand;
  };
  const laeuft = f.importer.fortsetzen(20);
  await lesenBegonnen;
  f.tabs.get(20).status = "complete";
  await f.importer.fortsetzen(20);
  freigeben();
  await laeuft;
  assert.equal(f.aufrufe.filter(([art, args]) => art === "script" && args.func === uebertrageImAppTab).length, 1);
  assert.equal(Object.keys(f.session).length, 0);
});

test("Abgelaufene oder geschlossene Transfers werden nicht übernommen", async () => {
  const f = ersatz();
  await f.importer.starten(f.tabs.get(7));
  f.zeit(1000 + MAX_ALTER + 1);
  f.tabs.get(20).status = "complete";
  await f.importer.fortsetzen(20);
  assert.equal(f.aufrufe.filter(([art, args]) => art === "script" && args.func === uebertrageImAppTab).length, 0);
  assert.equal(Object.keys(f.session).length, 0);
  const g = ersatz();
  await g.importer.starten(g.tabs.get(7));
  await g.importer.geschlossen(20);
  assert.equal(Object.keys(g.session).length, 0);
});

test("Unklarer Ausgang wird nicht automatisch erneut geschrieben", async () => {
  const f = ersatz();
  await f.importer.starten(f.tabs.get(7));
  f.antwort({ art: "unklar", fehler: "Bitte Board prüfen" });
  f.tabs.get(20).status = "complete";
  await f.importer.fortsetzen(20);
  await f.importer.fortsetzen(20);
  assert.equal(f.aufrufe.filter(([art, args]) => art === "script" && args.func === uebertrageImAppTab).length, 1);
  assert.equal(f.tabs.get(20).url, `${origin}/bewerbungen/import`);
});

test("Manifest gewährt keine dauerhaften Fremdseitenrechte und keine externe Nachrichtenbrücke", async () => {
  const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.toSorted(), ["activeTab", "scripting", "storage"]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.content_scripts, undefined);
});
