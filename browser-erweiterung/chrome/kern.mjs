// Browsercode ohne Pakete. Funktionen für executeScript müssen vollständig eigenständig bleiben.
export const MAX_ALTER = 10 * 60 * 1000;
const PREFIX = "stellen-import:";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Jobportale: Nur Adresse und Titel aus dem Tab-Objekt, kein Skript in der Seite (Nutzungsbedingungen verbieten das Auslesen per Erweiterung).
// "name.*" steht für beliebige Endungen. Die Liste steht je einmal in der Erweiterung (kern.mjs) und in der Website (web/lib/stellen-import.ts); ein Test prüft Gleichheit.
export const PORTALE = ["linkedin.com", "stepstone.*", "indeed.*", "xing.com", "glassdoor.*", "monster.*", "kununu.com"];
export const istPortal = (host) => passt(host, PORTALE);
function passt(host, liste) {
  const l = String(host).toLowerCase().split(".");
  if (l.at(-1) === "") l.pop();
  return liste.some((p) => {
    if (!p.endsWith(".*")) return l.length >= 2 && l.slice(-p.split(".").length).join(".") === p;
    const n = p.slice(0, -2), tld = l.at(-1) ?? "";
    return tld.length >= 2 && (l.at(-2) === n || (tld.length === 2 && ["co", "com"].includes(l.at(-2) ?? "") && l.at(-3) === n));
  });
}

// Hier übernimmt die Erweiterung gar nichts, auch nicht Adresse oder Titel (Nutzer 2026-11-19, Q135/Q137): LinkedIn verbietet solche Erweiterungen, StepStone und XING werden nie ausgelesen.
export const GESPERRT = ["linkedin.com", "stepstone.*", "xing.com"];
export const istGesperrt = (host) => passt(host, GESPERRT);

export function appOrigin(wert) {
  let url;
  try { url = new URL(wert.trim()); } catch { throw Error("Bitte die Adresse deiner Jobradar-Website eintragen."); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    !(url.protocol === "https:" || url.origin === "http://localhost:3002")) {
    throw Error("Nur die HTTPS-Adresse ohne Unterseite oder http://localhost:3002 verwenden.");
  }
  return url.origin;
}

export function erfasseAnzeige() {
  const url = new URL(location.href);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.href.length > 4096) throw Error("Diese Seite kann nicht übernommen werden.");
  const kurz = (s, limit) => typeof s === "string" ? s.trim().slice(0, limit) : "";
  const text = (s) => {
    if (typeof s !== "string") return "";
    const t = s.replace(/\r\n/g, "\n").trim();
    const hinweis = "\n[Auszug gekürzt]";
    return t.length <= 50_000 ? t : `${t.slice(0, 50_000 - hinweis.length)}${hinweis}`;
  };
  const klartext = (s) => typeof s !== "string" ? "" : s
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (alles, zahl) => {
      const n = zahl[0].toLowerCase() === "x" ? parseInt(zahl.slice(1), 16) : Number(zahl);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : alles;
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[name])
    .replace(/\s+/g, " ").trim();
  const stellen = [];
  let besucht = 0;
  const finde = (obj, tiefe = 0) => {
    if (!obj || typeof obj !== "object" || tiefe > 8 || ++besucht > 1000) return;
    if (Array.isArray(obj)) { obj.forEach((v) => finde(v, tiefe + 1)); return; }
    const typen = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
    if (typen.some((typ) => typeof typ === "string" && /^(?:https?:\/\/schema\.org\/)?JobPosting$/.test(typ))) stellen.push(obj);
    for (const wert of Object.values(obj)) if (wert && typeof wert === "object") finde(wert, tiefe + 1);
  };
  for (const script of [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 30)) {
    const roh = script.textContent || "";
    if (roh.length > 200_000) continue;
    try { finde(JSON.parse(roh)); } catch { /* Unbekanntes Markup nicht ausführen. */ }
  }
  const stelle = stellen.length === 1 ? stellen[0] : null;
  const ueberschriften = document.querySelectorAll("h1");
  const titel = kurz(stelle?.title, 500) || kurz(ueberschriften.length === 1 ? ueberschriften[0].textContent : "", 500) ||
    kurz(document.querySelector('meta[property="og:title"]')?.getAttribute("content"), 500) || kurz(document.title, 500);
  const firma = kurz(stelle?.hiringOrganization?.name, 300);
  // Formular-/Editorauswahl auch dann nicht auslesen, wenn sie absichtlich markiert wurde.
  const felder = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role="textbox"]';
  const inFeld = (node) => {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    return !!element?.closest(felder) || !!node?.getRootNode?.()?.host;
  };
  const selection = window.getSelection();
  let gesperrt = !selection || inFeld(document.activeElement) || inFeld(selection?.anchorNode) || inFeld(selection?.focusNode) || selection.rangeCount > 20;
  if (!gesperrt && selection.rangeCount) {
    try {
      const eingaben = document.querySelectorAll(felder);
      for (let i = 0; i < selection.rangeCount && !gesperrt; i++) {
        const bereich = selection.getRangeAt(i);
        gesperrt = [...eingaben].some((feld) => bereich.intersectsNode(feld));
      }
    } catch { gesperrt = true; }
  }
  // Explizite sichere Textauswahl hat Vorrang. Keine gesamte Seite und keine Cookies.
  const auswahl = gesperrt ? "" : selection.toString();
  const inhalt = text(auswahl || (stelle ? klartext(kurz(stelle.description, 200_000)) : ""));
  return { link: url.href, ...(titel ? { titel } : {}), ...(firma ? { firma } : {}), ...(inhalt ? { text: inhalt } : {}) };
}

export async function uebertrageImAppTab(origin, payload) {
  if (location.origin !== origin || location.pathname !== "/bewerbungen/import" || window.top !== self) {
    return { art: "fehler", fehler: "Übernahme nur auf der Jobradar-Importseite möglich." };
  }
  const status = document.querySelector("[data-import-status]");
  const zeige = (text, stand) => { if (status) { status.textContent = text; status.dataset.importStatus = stand; } };
  if (!status) return { art: "fehler", fehler: "Die Jobradar-Importseite ist noch nicht bereit." };
  zeige("Anzeige wird übernommen …", "laeuft");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  const unsicher = "Die Übernahme konnte nicht bestätigt werden. Prüfe dein Board, bevor du erneut übernimmst.";
  try {
    const response = await fetch(`${origin}/api/stellen-import`, {
      method: "POST", mode: "same-origin", credentials: "same-origin", redirect: "error",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal,
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw Error("Unerwartete Antwort");
    const data = await response.json();
    if (response.status === 401) { zeige("Bitte bei Jobradar anmelden. Der Entwurf wartet höchstens zehn Minuten.", "anmeldung-noetig"); return { art: "anmelden" }; }
    if (!response.ok) {
      const fehler = typeof data?.fehler === "string" ? data.fehler.slice(0, 400) : "Die Anzeige konnte nicht übernommen werden.";
      if (response.status >= 500) throw Error(fehler);
      zeige(fehler, "fehler");
      return { art: "fehler", fehler };
    }
    if (!data || typeof data.vorhanden !== "boolean" || typeof data.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) throw Error("Ungültige Bestätigung");
    zeige(data.vorhanden ? "Anzeige ist bereits in deinem Board." : "Anzeige wurde in deinem Board gemerkt.", "fertig");
    return { art: "ok", id: data.id, vorhanden: data.vorhanden };
  } catch {
    zeige(unsicher, "unklar");
    return { art: "unklar", fehler: unsicher };
  } finally { clearTimeout(timer); }
}

export function erstelleImporteur(chrome, { jetzt = Date.now, uuid = () => crypto.randomUUID() } = {}) {
  const aktiv = new Set();
  const nachlauf = new Set();
  const starts = new Set();
  const meldung = async (tabId, text, badge = "!") => {
    const ziel = Number.isInteger(tabId) ? { tabId } : {};
    await Promise.allSettled([
      chrome.action.setBadgeText({ ...ziel, text: badge }),
      chrome.action.setBadgeBackgroundColor({ ...ziel, color: badge === "✓" ? "#276749" : "#9b3c21" }),
      chrome.action.setTitle({ ...ziel, title: text }),
    ]);
  };
  const eintraege = async () => Object.entries(await chrome.storage.session.get(null)).filter(([key]) => key.startsWith(PREFIX));
  const abgelaufen = (p) => !p || typeof p.createdAt !== "number" || jetzt() < p.createdAt || jetzt() - p.createdAt > MAX_ALTER;
  const entferne = (key) => chrome.storage.session.remove(key);

  async function starten(tab) {
    if (starts.has(tab?.id)) return;
    starts.add(tab?.id);
    let key;
    try {
      const config = await chrome.storage.local.get("appOrigin");
      if (!config.appOrigin) { await chrome.runtime.openOptionsPage(); return; }
      const origin = appOrigin(config.appOrigin);
      if (!(await chrome.permissions.contains({ origins: [`${origin}/*`] }))) { await chrome.runtime.openOptionsPage(); return; }
      if (!Number.isInteger(tab?.id) || !tab.url || new URL(tab.url).origin === origin) throw Error("Bitte den Knopf auf einer fremden Stellenanzeige benutzen.");
      if (istGesperrt(new URL(tab.url).hostname)) throw Error("Auf LinkedIn, StepStone und XING übernimmt Jobradar nichts. Bitte den Link aus der Adresszeile selbst kopieren und in Jobradar einfügen.");
      for (const [altKey, p] of await eintraege()) if (abgelaufen(p)) await entferne(altKey);
      const schon = (await eintraege()).find(([, p]) => p?.sourceTabId === tab.id && p.origin === origin);
      if (schon) {
        if (Number.isInteger(schon[1].targetTabId)) await chrome.tabs.update(schon[1].targetTabId, { active: true });
        return;
      }
      if ((await eintraege()).length >= 10) throw Error("Bitte zuerst einen offenen Import abschließen oder schließen.");
      const portal = istPortal(new URL(tab.url).hostname);
      const roh = portal ? { link: tab.url, titel: tab.title } :
        (await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, world: "ISOLATED", func: erfasseAnzeige })).find((r) => r.frameId === 0)?.result;
      if (!roh || typeof roh.link !== "string" || roh.link.length > 4096) throw Error("Der Anzeigenlink konnte nicht gelesen werden.");
      const link = new URL(roh.link);
      if (!["http:", "https:"].includes(link.protocol) || link.username || link.password || link.origin !== new URL(tab.url).origin) throw Error("Diese Seite kann nicht übernommen werden.");
      const payload = { link: link.href };
      for (const [feld, max] of [["titel", 500], ["firma", 300], ["text", 50_000]]) {
        if (typeof roh[feld] === "string" && roh[feld].trim()) payload[feld] = roh[feld].trim().slice(0, max);
      }
      key = `${PREFIX}${uuid()}`;
      const pending = { origin, sourceTabId: tab.id, createdAt: jetzt(), phase: "wartet", payload };
      await chrome.storage.session.set({ [key]: pending });
      const ziel = await chrome.tabs.create({ url: `${origin}/bewerbungen/import` });
      pending.targetTabId = ziel.id;
      await chrome.storage.session.set({ [key]: pending });
      await meldung(tab.id, "Anzeige wird nach Jobradar übernommen …", "…");
      await fortsetzen(ziel.id);
    } catch (error) {
      if (key) await entferne(key);
      await meldung(tab?.id, error instanceof Error ? error.message : "Die Übernahme konnte nicht gestartet werden.");
    } finally { starts.delete(tab?.id); }
  }

  async function fortsetzen(tabId) {
    if (aktiv.has(tabId)) { nachlauf.add(tabId); return; }
    aktiv.add(tabId);
    try {
      do {
        nachlauf.delete(tabId);
        await pruefeTab(tabId);
      } while (nachlauf.has(tabId));
    } finally { aktiv.delete(tabId); nachlauf.delete(tabId); }
  }

  async function pruefeTab(tabId) {
      const paar = (await eintraege()).find(([, p]) => p?.targetTabId === tabId);
      if (!paar) return;
      const [key, p] = paar;
      if (abgelaufen(p)) { await entferne(key); await meldung(p.sourceTabId, "Importentwurf abgelaufen. Anzeige erneut übernehmen."); return; }
      if (p.phase === "senden") {
        await entferne(key);
        await meldung(p.sourceTabId, "Die Übernahme wurde unterbrochen. Bitte zuerst dein Board prüfen.");
        return;
      }
      const config = await chrome.storage.local.get("appOrigin");
      if (config.appOrigin !== p.origin) { await entferne(key); return; }
      let tab;
      try { tab = await chrome.tabs.get(tabId); } catch { await entferne(key); return; }
      if (tab.status !== "complete" || !tab.url) return;
      const url = new URL(tab.url);
      if (url.origin !== p.origin) return; // OAuth-Zwischenseite: keinerlei Daten/Skript dorthin.
      if (url.pathname === "/login") {
        await chrome.storage.session.set({ [key]: { ...p, phase: "anmelden" } });
        await meldung(p.sourceTabId, "Bitte bei Jobradar anmelden; Entwurf wartet zehn Minuten.", "…");
        return;
      }
      if (p.phase === "anmelden" && url.pathname === "/") {
        await chrome.tabs.update(tabId, { url: `${p.origin}/bewerbungen/import` });
        return;
      }
      if (url.pathname !== "/bewerbungen/import") return;
      await chrome.storage.session.set({ [key]: { ...p, phase: "senden" } });
      let result;
      try {
        const results = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, world: "ISOLATED", func: uebertrageImAppTab, args: [p.origin, p.payload] });
        result = results.find((r) => r.frameId === 0)?.result;
      } catch { result = { art: "unklar", fehler: "Die Übernahme konnte nicht bestätigt werden. Bitte zuerst dein Board prüfen." }; }
      if (result?.art === "anmelden") {
        await chrome.storage.session.set({ [key]: { ...p, phase: "anmelden" } });
        await chrome.tabs.update(tabId, { url: `${p.origin}/login` });
        return;
      }
      await entferne(key); // Kein automatischer Schreib-Retry bei unklarem Ergebnis.
      if (result?.art === "ok" && typeof result.id === "string" && UUID.test(result.id)) {
        await meldung(p.sourceTabId, result.vorhanden ? "Anzeige war bereits im Board." : "Anzeige wurde gemerkt.", "✓");
        await chrome.tabs.update(tabId, { url: `${p.origin}/bewerbungen?id=${encodeURIComponent(result.id)}${result.vorhanden ? "&archiv=1" : ""}` });
      } else {
        await meldung(p.sourceTabId, typeof result?.fehler === "string" ? result.fehler.slice(0, 400) : "Die Übernahme konnte nicht bestätigt werden. Bitte Board prüfen.");
      }
  }

  async function geschlossen(tabId) {
    for (const [key, p] of await eintraege()) if (p?.targetTabId === tabId || abgelaufen(p)) await entferne(key);
  }
  async function verwerfen() {
    const keys = (await eintraege()).map(([key]) => key);
    if (keys.length) await chrome.storage.session.remove(keys);
  }
  return { starten, fortsetzen, geschlossen, verwerfen };
}
