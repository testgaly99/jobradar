// Liest die eingebettete Stellenbeschreibung (schema.org JobPosting, JSON-LD) aus einer Firmen-Karriereseite.
// Gleiche Logik wie _jobposting in scraper/ats/sitemap.py.
import { htmlZuText } from "./link-import.ts";
import { holeFirmenseite } from "./seiten-abruf.ts";

type Obj = Record<string, unknown>;
export type JobPosting = { titel: string; firma: string | null; ort: string | null; text: string };

const LD = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
const liste = (x: unknown): unknown[] => (Array.isArray(x) ? x : x ? [x] : []);
const obj = (x: unknown): Obj | null => (x && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : null);

function* objekte(x: unknown): Generator<Obj> {
  for (const e of liste(x)) {
    const o = obj(e);
    if (!o) continue;
    yield o;
    yield* objekte(o["@graph"]);
  }
}

function parse(roh: string): unknown {
  const start = roh.search(/[[{]/); // Porsche/Bundesbank: Text vor dem JSON
  const ende = Math.max(roh.lastIndexOf("}"), roh.lastIndexOf("]"));
  if (start < 0 || ende < start) return null;
  try { return JSON.parse(roh.slice(start, ende + 1)); } catch { return null; }
}

export function leseJobPosting(html: string): JobPosting | null {
  for (const m of html.matchAll(LD)) {
    for (const o of objekte(parse(m[1]))) {
      if (!liste(o["@type"]).includes("JobPosting")) continue;
      const titel = typeof o.title === "string" ? htmlZuText(o.title) : "";
      const text = typeof o.description === "string" ? htmlZuText(o.description) : "";
      if (!titel || !text) return null;
      const org = o.hiringOrganization;
      const firma = typeof org === "string" ? org : obj(org)?.name;
      const ort = obj(liste(obj(liste(o.jobLocation)[0])?.address)[0])?.addressLocality;
      return { titel, firma: typeof firma === "string" && firma.trim() ? firma.trim() : null, ort: typeof ort === "string" && ort.trim() ? ort.trim() : null, text };
    }
  }
  return null;
}

export type FirmenseitenZiel = { firma?: string; titel?: string; ort?: string; text?: string; abgerufen: boolean };

// Schritt 1d im Link-Import: Eingaben des Nutzers gehen vor; ein gescheiterter Abruf ist kein Fehler.
export async function zielAusFirmenseite(url: string, eingabe: { firma?: string; titel?: string },
  dep: { holen?: (url: string) => Promise<string> } = {}): Promise<FirmenseitenZiel> {
  let html: string;
  try { html = await (dep.holen ?? holeFirmenseite)(url); } catch { return { ...eingabe, abgerufen: false }; }
  const jp = leseJobPosting(html);
  if (!jp) {
    // Rückfall: Seiten, die die Anzeige per JavaScript nachladen, nennen oft wenigstens den Titel (og:title).
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    const titel = og ? htmlZuText(og[1].replace(/&#35;/g, "#")).slice(0, 300) : "";
    return { ...eingabe, ...(eingabe.titel || titel ? { titel: eingabe.titel || titel } : {}), abgerufen: true };
  }
  return { firma: eingabe.firma || jp.firma || undefined, titel: eingabe.titel || jp.titel, ort: jp.ort ?? undefined, text: jp.text, abgerufen: true };
}
