// Einzelabruf einer vom Nutzer genannten Firmen-Karriereseite (Link-Schnellstart).
// Weil die Adresse vom Nutzer kommt, wird jedes Ziel (auch robots.txt und jede Weiterleitung) vorher geprüft.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parseRobots, USER_AGENT } from "./ats-abruf.ts";
import { istPortal } from "./jobportale.ts";

const MAX_BYTES = 2_097_152;
const MAX_WEITER = 3;
const WEITER = new Set([301, 302, 303, 307, 308]);

type Dep = { holen?: typeof fetch; aufloesen?: (host: string) => Promise<string[]> };

function v4Oeffentlich(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b < 128) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)));
}

// IPv6 auf acht Zahlen ausschreiben (auch "::" und eingebettetes IPv4).
function v6Teile(ip: string): number[] {
  let s = ip.toLowerCase();
  const v4 = s.match(/^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) { const [w, x, y, z] = v4.slice(2).map(Number); s = `${v4[1]}${((w << 8) | x).toString(16)}:${((y << 8) | z).toString(16)}`; }
  const [kopf, fuss] = s.split("::");
  const k = kopf ? kopf.split(":") : [], f = fuss ? fuss.split(":") : [];
  return (s.includes("::") ? [...k, ...Array(8 - k.length - f.length).fill("0"), ...f] : k).map((h) => parseInt(h, 16));
}

export function istOeffentlicheIp(ip: string): boolean {
  if (isIP(ip) === 4) return v4Oeffentlich(ip);
  if (isIP(ip) !== 6) return false;
  const t = v6Teile(ip);
  if (t.slice(0, 5).every((x) => x === 0) && t[5] === 0xffff) return v4Oeffentlich(`${t[6] >> 8}.${t[6] & 255}.${t[7] >> 8}.${t[7] & 255}`);
  return (t[0] & 0xe000) === 0x2000; // nur globales Unicast 2000::/3; schließt ::, ::1, fc00::/7, fe80::/10, ff00::/8 aus
}

async function pruefeZiel(u: URL, aufloesen: (host: string) => Promise<string[]>): Promise<void> {
  if (u.protocol !== "https:") throw new Error("Nur https-Links werden abgerufen.");
  if (u.port && u.port !== "443") throw new Error("Nur der Standard-Port ist erlaubt.");
  if (u.username || u.password) throw new Error("Zugangsdaten in der Adresse sind nicht erlaubt.");
  if (istPortal(u.hostname)) throw new Error("Jobportale werden nicht abgerufen.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const ips = isIP(host) ? [host] : await aufloesen(host);
  if (!ips.length || !ips.every(istOeffentlicheIp)) throw new Error("Die Adresse zeigt auf ein internes Netz.");
}

// shortcut: Auflösung und Abruf sind zwei Schritte (DNS-Rebinding theoretisch möglich); bei öffentlichem Start Abruf über die geprüfte IP mit Host-Header.
export async function holeFirmenseite(url: string, dep: Dep = {}): Promise<string> {
  const holen = dep.holen ?? fetch;
  const aufloesen = dep.aufloesen ?? (async (h: string) => (await lookup(h, { all: true })).map((a) => a.address));
  const robots = new Map<string, ((pfad: string) => boolean) | null>();

  const abrufen = (u: URL) => holen(u.toString(), { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": USER_AGENT } });

  const darf = async (u: URL): Promise<boolean> => {
    if (!robots.has(u.origin)) {
      const r = await abrufen(new URL("/robots.txt", u.origin)); // Ursprung ist schon geprüft; robots.txt-Weiterleitungen werden nicht verfolgt
      if (r.status >= 500) throw new Error("robots.txt der Seite ist nicht erreichbar.");
      robots.set(u.origin, r.ok ? parseRobots(await r.text()) : null);
    }
    const regel = robots.get(u.origin);
    return !regel || regel(u.pathname);
  };

  let u = new URL(url);
  for (let i = 0; ; i++) {
    await pruefeZiel(u, aufloesen);
    if (!(await darf(u))) throw new Error("Die robots.txt der Seite verbietet den Abruf.");
    const r = await abrufen(u);
    if (WEITER.has(r.status)) {
      if (i === MAX_WEITER) throw new Error("Die Seite hat zu viele Weiterleitungen.");
      const ziel = r.headers.get("location");
      if (!ziel) throw new Error("Weiterleitung ohne Ziel.");
      u = new URL(ziel, u);
      continue;
    }
    if (!r.ok) throw new Error(`Die Seite antwortet mit ${r.status}.`);
    if (!/text\/html/i.test(r.headers.get("content-type") ?? "")) throw new Error("Die Adresse ist keine HTML-Seite.");
    return await leseBegrenzt(r);
  }
}

async function leseBegrenzt(r: Response): Promise<string> {
  if (Number(r.headers.get("content-length")) > MAX_BYTES) throw new Error("Die Seite ist zu groß.");
  const leser = r.body?.getReader();
  if (!leser) return "";
  const teile: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    n += value.byteLength;
    if (n > MAX_BYTES) { await leser.cancel(); throw new Error("Die Seite ist zu groß."); }
    teile.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(teile)); // wie im Nachtlauf: Stellenseiten sind praktisch immer UTF-8
}

// shortcut: Zähler je Server-Instanz, nicht global; bei Missbrauch auf Datenbank-Zähler umstellen.
const abrufe = new Map<string, number[]>();
export function darfAbrufen(nutzer: string, jetzt = Date.now()): boolean {
  const liste = (abrufe.get(nutzer) ?? []).filter((t) => jetzt - t < 60_000);
  const ok = liste.length < 10;
  if (ok) liste.push(jetzt);
  abrufe.set(nutzer, liste);
  return ok;
}
