// Höflicher Abruf der offiziellen ATS-Schnittstellen (Spiegel von scraper/http.py).
// Ruft nie die vom Nutzer eingegebene URL ab, nur Allowlist-Hosts mit selbst gebauten Pfaden.
import { htmlZuText, normTitel, type Ats } from "./link-import.ts";

export const USER_AGENT = "jobradar/1.0 (+https://github.com/testgaly99/jobradar)";
const TIMEOUT_MS = 5000;
const PAUSE_MS = 1000;

const GESPERRT = /(^|\.)(linkedin\.com|lnkd\.in|stepstone\.[a-z.]+|indeed\.[a-z.]+|glassdoor\.[a-z.]+)$/;
const ERLAUBT = /^(boards-api\.greenhouse\.io|api\.ashbyhq\.com|api\.lever\.co|[a-z0-9-]+\.jobs\.personio\.de)$/;

export function pruefeAbrufHost(url: string): void {
  const u = new URL(url);
  const h = u.hostname.toLowerCase();
  if (GESPERRT.test(h)) throw new Error(`Abruf gesperrt: ${h}`);
  if (u.protocol !== "https:" || !ERLAUBT.test(h)) throw new Error(`Host nicht erlaubt: ${h}`);
}

const robots = new Map<string, ((pfad: string) => boolean) | null>();
const zuletzt = new Map<string, number>();

async function get(url: string): Promise<Response> {
  const host = new URL(url).host;
  const warte = (zuletzt.get(host) ?? -Infinity) + PAUSE_MS - Date.now();
  if (warte > 0) await new Promise((r) => setTimeout(r, warte));
  try {
    return await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
  } finally { zuletzt.set(host, Date.now()); }
}

// shortcut: nur Disallow-Präfixe der Gruppen "*" und jobradar, kein Allow/Wildcard; bei Bedarf Parser-Lib nehmen.
function parseRobots(text: string): (pfad: string) => boolean {
  const verbote: string[] = [];
  let gilt = false, gruppeOffen = false;
  for (const roh of text.split(/\r?\n/)) {
    const [k, ...v] = roh.split("#")[0].split(":");
    const key = k.trim().toLowerCase(), val = v.join(":").trim().toLowerCase();
    if (key === "user-agent") {
      gilt = (gruppeOffen && gilt) || val === "*" || (val !== "" && USER_AGENT.toLowerCase().startsWith(val));
      gruppeOffen = true;
    } else {
      gruppeOffen = false;
      if (gilt && key === "disallow" && v.join(":").trim()) verbote.push(v.join(":").trim());
    }
  }
  return (pfad) => !verbote.some((d) => pfad.startsWith(d));
}

async function hole(url: string): Promise<Response> {
  pruefeAbrufHost(url);
  const u = new URL(url);
  if (!robots.has(u.host)) {
    const r = await get(`${u.origin}/robots.txt`);
    if (r.status >= 500) throw new Error(`robots.txt nicht erreichbar: ${u.host}`);
    robots.set(u.host, r.status < 400 ? parseRobots(await r.text()) : null);
  }
  const darf = robots.get(u.host);
  if (darf && !darf(u.pathname)) throw new Error(`Durch robots.txt verboten: ${url}`);
  const r = await get(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r;
}

export type Stelle = { extId: string; titel: string; ort: string; url: string; text: string };

const enc = encodeURIComponent;
const flach = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function ausGreenhouse(j: any): Stelle {
  return { extId: String(j.id), titel: j.title, ort: j.location?.name ?? "", url: j.absolute_url, text: htmlZuText(j.content ?? "") };
}
function ausAshby(j: any): Stelle {
  return { extId: String(j.id), titel: j.title, ort: j.location ?? "", url: j.jobUrl, text: flach(j.descriptionPlain) };
}
function ausLever(j: any): Stelle {
  return { extId: String(j.id), titel: j.text, ort: j.categories?.location ?? "", url: j.hostedUrl, text: flach(j.descriptionPlain) };
}

function ausPersonio(xml: string, id: string): Stelle[] {
  const tag = (s: string, t: string) => htmlZuText((s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
  return [...xml.matchAll(/<position>([\s\S]*?)<\/position>/g)].map(([, p]) => {
    const extId = tag(p, "id");
    return {
      extId, titel: tag(p, "name"), ort: tag(p, "office"), url: `https://${id}.jobs.personio.de/job/${extId}`,
      text: [...p.matchAll(/<value>([\s\S]*?)<\/value>/g)].map((m) => htmlZuText(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))).join(" "),
    };
  });
}

// Alle Stellen eines Boards (Ashby/Personio-Einzelstelle und Slug-Suche).
export async function alleStellen(typ: Ats["typ"], id: string): Promise<Stelle[]> {
  const i = enc(id);
  if (typ === "greenhouse") return ((await (await hole(`https://boards-api.greenhouse.io/v1/boards/${i}/jobs`)).json()).jobs ?? []).map(ausGreenhouse);
  if (typ === "ashby") return ((await (await hole(`https://api.ashbyhq.com/posting-api/job-board/${i}`)).json()).jobs ?? []).filter((j: any) => j.isListed).map(ausAshby);
  if (typ === "lever") return ((await (await hole(`https://api.lever.co/v0/postings/${i}?mode=json`)).json()) as any[]).map(ausLever);
  return ausPersonio(await (await hole(`https://${i}.jobs.personio.de/xml`)).text(), i);
}

export async function holeStelle(a: Ats & { id: string }): Promise<Stelle> {
  const id = enc(a.id), jid = enc(a.jobId);
  if (a.typ === "greenhouse") return ausGreenhouse(await (await hole(`https://boards-api.greenhouse.io/v1/boards/${id}/jobs/${jid}`)).json());
  if (a.typ === "lever") return ausLever(await (await hole(`https://api.lever.co/v0/postings/${id}/${jid}`)).json());
  const s = (await alleStellen(a.typ, a.id)).find((x) => x.extId === a.jobId);
  if (!s) throw new Error("Stelle nicht gefunden");
  return s;
}

export async function sucheTitel(typ: Ats["typ"], id: string, titel: string): Promise<Stelle | null> {
  const t = normTitel(titel);
  const s = (await alleStellen(typ, id)).find((x) => normTitel(x.titel) === t);
  if (!s) return null;
  // Greenhouse-Liste kommt ohne content: Text per Einzelabruf nachladen.
  return typ === "greenhouse" ? holeStelle({ typ, id, jobId: s.extId }) : s;
}
