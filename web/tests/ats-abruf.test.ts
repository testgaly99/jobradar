import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");

type Aufruf = { url: URL; zeit: number; optionen: RequestInit };
type Antwort = { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> };
const antwort = (status = 200, text = ""): Antwort => ({
  ok: status >= 200 && status < 300, status, text: async () => text, json: async () => ({ jobs: [] }),
});

function vorbereiten(fetchAntwort: (a: Aufruf) => Antwort | Promise<Antwort> = () => antwort()) {
  let zeit = 0;
  const timer: { zeit: number; fn: () => void }[] = [];
  const aufrufe: Aufruf[] = [];
  const weiter = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
  function lade(name: "ats-abruf" | "link-import"): any {
    const modul = { exports: {} };
    const code = ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    runInNewContext(code, {
      module: modul, exports: modul.exports, URL,
      Date: { now: () => zeit },
      AbortSignal: { timeout: (ms: number) => ({ timeout: ms }) },
      setTimeout: (fn: () => void, ms: number) => { timer.push({ zeit: zeit + ms, fn }); },
      fetch: async (url: string, optionen: RequestInit) => {
        const a = { url: new URL(url), zeit, optionen };
        aufrufe.push(a);
        return fetchAntwort(a);
      },
      require: (id: string) => {
        assert.equal(id, "./link-import.ts", "Nicht vorbereiteter Import");
        return lade("link-import");
      },
    });
    return modul.exports;
  }
  async function tick() {
    await weiter();
    assert.ok(timer.length, "Prüfung wartet ohne vorbereiteten Timer");
    zeit = Math.min(...timer.map(t => t.zeit));
    const faellig = timer.filter(t => t.zeit <= zeit);
    for (const t of faellig) { timer.splice(timer.indexOf(t), 1); t.fn(); }
    await weiter();
  }
  async function fertig<T>(p: Promise<T>): Promise<T> {
    let ende = false;
    p.then(() => { ende = true; }, () => { ende = true; });
    for (let i = 0; i < 100; i++) {
      await weiter();
      if (ende) return p;
      await tick();
    }
    throw new Error("Zu viele künstliche Warteschritte");
  }
  return { api: lade("ats-abruf"), aufrufe, fertig, tick, weiter, jetzt: () => zeit };
}

function abstaende(aufrufe: Aufruf[]) {
  for (let i = 1; i < aufrufe.length; i++) {
    assert.ok(aufrufe[i].zeit - aufrufe[i - 1].zeit >= 1000,
      `${aufrufe[i - 1].url.pathname} → ${aufrufe[i].url.pathname}: weniger als eine Sekunde`);
  }
}

test('Recruitee liest Offers-Fixture nur über offiziellen Host mit Robots und Pause',async()=>{
  const fixture=JSON.parse(readFileSync(new URL('../../tests/fixtures/recruitee_quantum.json',import.meta.url),'utf8'));
  const t=vorbereiten(a=>({...antwort(),json:async()=>fixture}));
  const stellen=await t.fertig<any[]>(t.api.alleStellen('recruitee','beispiel'));
  assert.equal(stellen.length,3); assert.equal(stellen[0].extId,'2819908');
  assert.equal(stellen[0].titel,'UX/UI Designer (m/f/d)');
  assert.equal(t.aufrufe[1].url.href,'https://beispiel.recruitee.com/api/offers/');
  abstaende(t.aufrufe);
});
test('Recruitee-Einzelanzeigen werden anhand des URL-Slugs gefunden',async()=>{
  const fixture=JSON.parse(readFileSync(new URL('../../tests/fixtures/recruitee_quantum.json',import.meta.url),'utf8'));
  const t=vorbereiten(a=>({...antwort(),json:async()=>fixture}));
  const stelle=await t.fertig<any>(t.api.holeStelle({typ:'recruitee',id:'beispiel',jobId:'uxui-designer-mfd'}));
  assert.equal(stelle.extId,'2819908');
});
test('Recruitee lehnt unsichere careers_url aus beschädigter Antwort ab',()=>{
  const t=vorbereiten();
  for(const url of ['javascript:alert(1)','https://user:pass@example.org/o/engineer','https://example.org:123/o/engineer'])
    assert.throws(()=>t.api.recruiteeStellen({offers:[{id:1,title:'Engineer',careers_url:url}]}));
});

for (const robotsStatus of [200, 404]) {
  test(`Parallele Boards teilen Robots (${robotsStatus}) und starten je Host im Sekundenabstand`, async () => {
    const t = vorbereiten(a => antwort(a.url.pathname === "/robots.txt" ? robotsStatus : 200));
    const resultate = await t.fertig(Promise.all(["a", "b", "c"].map(id => t.api.alleStellen("ashby", id))));
    assert.equal(resultate.length, 3);
    assert.equal(t.aufrufe.filter(a => a.url.pathname === "/robots.txt").length, 1);
    assert.equal(t.aufrufe.length, 4);
    abstaende(t.aufrufe);
    for (const a of t.aufrufe) {
      assert.equal(a.optionen.redirect, "error");
      assert.equal((a.optionen.headers as Record<string, string>)["User-Agent"], t.api.USER_AGENT);
      assert.equal((a.optionen.signal as unknown as { timeout: number }).timeout, 5000);
    }
  });
}

test("Verschiedene Hosts warten unabhängig voneinander", async () => {
  const t = vorbereiten();
  await t.fertig(Promise.all([t.api.alleStellen("ashby", "a"), t.api.alleStellen("greenhouse", "b")]));
  for (const host of ["api.ashbyhq.com", "boards-api.greenhouse.io"]) {
    const aufrufe = t.aufrufe.filter(a => a.url.host === host);
    assert.equal(aufrufe.length, 2);
    assert.equal(aufrufe[0].zeit, 0);
    assert.equal(aufrufe[1].zeit, 1000);
  }
});

test("Ein laufender Abruf blockiert den nächsten desselben Hosts bis Abschluss plus Pause", async () => {
  let freigeben!: (r: Antwort) => void;
  const offen = new Promise<Antwort>(resolve => { freigeben = resolve; });
  const t = vorbereiten(a => a.url.pathname.endsWith("/a") ? offen : antwort());
  const beide = Promise.all([t.api.alleStellen("ashby", "a"), t.api.alleStellen("ashby", "b")]);
  await t.tick();
  assert.equal(t.jetzt(), 1000);
  assert.deepEqual(t.aufrufe.map(a => a.url.pathname), ["/robots.txt", "/posting-api/job-board/a"]);
  await t.weiter();
  assert.equal(t.aufrufe.length, 2);
  freigeben(antwort());
  await t.fertig(beide);
  assert.equal(t.aufrufe.at(-1)!.zeit, 2000);
});

for (const fehler of ["HTTP", "Transport"]) {
  test(`Fehlgeschlagene gemeinsame Robots-Abfrage (${fehler}) wird später erneut versucht`, async () => {
    let robots = 0;
    const t = vorbereiten(a => {
      if (a.url.pathname === "/robots.txt" && ++robots === 1) {
        if (fehler === "Transport") throw new Error("Künstlicher Netzwerkfehler");
        return antwort(503);
      }
      return antwort();
    });
    const resultate = await t.fertig(Promise.allSettled([
      t.api.alleStellen("ashby", "a"), t.api.alleStellen("ashby", "b"),
    ]));
    assert.deepEqual(resultate.map(r => r.status), ["rejected", "rejected"]);
    assert.equal(t.aufrufe.length, 1);
    await t.fertig(t.api.alleStellen("ashby", "neu"));
    assert.equal(t.aufrufe.filter(a => a.url.pathname === "/robots.txt").length, 2);
    assert.equal(t.aufrufe.length, 3);
    abstaende(t.aufrufe);
  });
}

test("Timeout eines Posting-Abrufs gibt die Host-Warteschlange frei", async () => {
  const t = vorbereiten(a => {
    if (a.url.pathname.endsWith("/a")) throw new DOMException("Künstlich abgebrochen", "TimeoutError");
    return antwort();
  });
  const resultate = await t.fertig(Promise.allSettled([
    t.api.alleStellen("ashby", "a"), t.api.alleStellen("ashby", "b"),
  ]));
  assert.deepEqual(resultate.map(r => r.status), ["rejected", "fulfilled"]);
  assert.equal(t.aufrufe.length, 3);
  abstaende(t.aufrufe);
});

test("Geteilte Robots-Regeln verweigern verbotene Pfade vor deren Posting-Abruf", async () => {
  const t = vorbereiten(a => antwort(200, a.url.pathname === "/robots.txt"
    ? "User-agent: *\nDisallow: /posting-api/job-board/gesperrt\n" : ""));
  const resultate = await t.fertig(Promise.allSettled([
    t.api.alleStellen("ashby", "gesperrt"), t.api.alleStellen("ashby", "erlaubt"),
  ]));
  assert.deepEqual(resultate.map(r => r.status), ["rejected", "fulfilled"]);
  assert.deepEqual(t.aufrufe.map(a => a.url.pathname), ["/robots.txt", "/posting-api/job-board/erlaubt"]);
});
