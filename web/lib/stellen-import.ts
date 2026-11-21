import type { SupabaseClient } from "@supabase/supabase-js";
import { istUuid } from "./bewerbung.ts";
import { analysiereLink } from "./link-import.ts";
import { MAX_TEXT } from "./uebernahme.ts";
import { erweiterungGesperrt, istIndeed, istPortal, PORTAL_EINGABE } from "./jobportale.ts";
import { originalSpalteFehlt, ordneOriginalZu } from "./original-daten.ts";
import { ausTabTitel } from "./original-suche.ts";
export { ERWEITERUNG_GESPERRT, PORTALE, istPortal } from "./jobportale.ts";

type ImportDaten = { link: string; quelle: string; titel: string | null; firma: string | null; text: string | null };
type ImportErgebnis = { id: string; vorhanden: boolean } | { fehler: string };
const FEHLER = "Die Stelle konnte nicht übernommen werden. Bitte erneut versuchen.";
const MAX_BODY = 200_000;

// Nur Daten aus dem bewussten Browserklick prüfen; diese Funktion ruft keine fremde URL ab.
export function pruefeImportDaten(wert: unknown): { daten: ImportDaten } | { fehler: string } {
  if (!wert || typeof wert !== "object" || Array.isArray(wert)) return { fehler: "Die übermittelten Anzeigendaten sind ungültig." };
  const w = wert as Record<string, unknown>;
  if (Object.keys(w).some(k => !["link", "titel", "firma", "text"].includes(k))) return { fehler: "Die übermittelten Anzeigendaten enthalten unzulässige Felder." };
  if (typeof w.link !== "string" || !w.link.trim() || w.link.length > 4096 || /[\u0000-\u001f\u007f]/.test(w.link)) return { fehler: "Der Anzeigenlink ist ungültig oder zu lang." };
  for (const [feld, max] of [["titel", 500], ["firma", 300], ["text", MAX_TEXT]] as const) {
    if (w[feld] !== undefined && (typeof w[feld] !== "string" || w[feld].length > max || w[feld].includes("\0"))) return { fehler: "Die übermittelten Anzeigendaten sind ungültig oder zu lang." };
  }
  let url: URL;
  try { url = new URL(w.link.trim()); } catch { return { fehler: "Der Anzeigenlink ist ungültig." }; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return { fehler: "Nur http- und https-Links ohne Zugangsdaten sind möglich." };
  const a = analysiereLink(url.href);
  const optional = (feld: "titel" | "firma" | "text") => (w[feld] as string | undefined)?.replace(/\r\n/g, "\n").trim() || null;
  if (erweiterungGesperrt(url.hostname)) return { fehler: "Bitte füge diesen Portal-Link direkt in Jobradar ein." };
  const portal = istPortal(url.hostname);
  const indeed = istIndeed(url.hostname);
  const tab = indeed ? ausTabTitel(optional("titel") ?? "", url.hostname) : null;
  const titel = tab ? tab.titel ?? null : optional("titel") ?? a.titel ?? null;
  const firma = tab ? tab.firma ?? null : (portal ? null : optional("firma")) ?? a.firma ?? null;
  if (indeed && (!firma || !titel)) return { fehler: PORTAL_EINGABE };
  if ((titel?.length ?? 0) > 500 || (firma?.length ?? 0) > 300) return { fehler: "Firma oder Titel aus dem Anzeigenlink sind zu lang." };
  return { daten: {
    link: a.link ?? url.href, quelle: a.quelle,
    titel, firma, text: portal ? null : optional("text"),
  } };
}

// Verhindert gleichzeitiges doppeltes Schreiben im selben Prozess. Ohne eindeutigen
// Link-Index ersetzt dies keine Datenbankgarantie über mehrere Serverinstanzen.
const laufend = new Map<string, Promise<ImportErgebnis>>();

type Hintergrund = (arbeit: () => Promise<void>) => void;

export async function importiereStelle(sb: SupabaseClient, ownerId: string, daten: ImportDaten, imHintergrund?: Hintergrund): Promise<ImportErgebnis> {
  if (!istUuid(ownerId)) return { fehler: FEHLER };
  const schluessel = JSON.stringify([ownerId, daten.link]);
  const geteilt = laufend.get(schluessel);
  if (geteilt) {
    const r = await geteilt;
    return "id" in r ? { ...r, vorhanden: true } : r;
  }
  const ausfuehren = async (): Promise<ImportErgebnis> => {
    try {
      const portal = istPortal(new URL(daten.link).hostname);
      const originalSuchen = portal && Boolean(daten.firma && daten.titel);
      const finde = async (): Promise<{ id?: string } | { fehler: string }> => {
        const suche = (feld: "link" | "portal_link") => sb.from("applications").select("id")
          .eq("owner_id", ownerId).eq(feld, daten.link).limit(1).maybeSingle();
        let { data, error } = await suche("link");
        if (!error && !data && portal) {
          const r = await suche("portal_link");
          if (!originalSpalteFehlt(r.error)) ({ data, error } = r);
        }
        if (error) return { fehler: FEHLER };
        if (data === null) return {};
        if (!data || Array.isArray(data) || typeof data.id !== "string" || !istUuid(data.id)) return { fehler: FEHLER };
        return { id: data.id };
      };
      const vorhanden = await finde();
      if ("fehler" in vorhanden) return vorhanden;
      if (vorhanden.id) return { id: vorhanden.id, vorhanden: true };
      const grund = {
        owner_id: ownerId, link: daten.link, quelle: daten.quelle, titel: daten.titel, firma: daten.firma,
        snapshot_text: daten.text, status: "gemerkt", beworben_am: null,
      };
      const anlegen = (mitOriginal: boolean) => sb.from("applications").insert({
        ...grund, ...(mitOriginal ? { portal_link: daten.link, original_suche: "offen" } : {}),
      }).select("id").single();
      let r = await anlegen(originalSuchen);
      let suchen = originalSuchen;
      if (originalSuchen && originalSpalteFehlt(r.error)) {
        suchen = false;
        r = await anlegen(false);
      }
      const { data, error } = r;
      if (error?.code === "23505") {
        const inzwischen = await finde();
        if ("id" in inzwischen && inzwischen.id) return { id: inzwischen.id, vorhanden: true };
      }
      if (error || !data || typeof data.id !== "string" || !istUuid(data.id)) return { fehler: FEHLER };
      if (suchen) {
        const arbeite = async () => {
          try { await ordneOriginalZu(sb, data.id, ownerId); } catch { /* Bewerbung bleibt für den Nachtlauf offen. */ }
        };
        if (imHintergrund) imHintergrund(arbeite);
        else await arbeite();
      }
      return { id: data.id, vorhanden: false };
    } catch { return { fehler: FEHLER }; }
  };
  const versuch = ausfuehren();
  laufend.set(schluessel, versuch);
  try { return await versuch; } finally { if (laufend.get(schluessel) === versuch) laufend.delete(schluessel); }
}

const antwort = (daten: object, status: number) => Response.json(daten, { status, headers: { "Cache-Control": "no-store" } });

// Die API authentifiziert selbst, auch wenn der Proxy nicht ausgeführt wurde.
export async function bearbeiteImportAnfrage(request: Request, client: () => Promise<SupabaseClient>, imHintergrund?: Hintergrund): Promise<Response> {
  if (request.method !== "POST") return antwort({ fehler: "Nur POST ist möglich." }, 405);
  if (request.headers.get("origin") !== new URL(request.url).origin) return antwort({ fehler: "Diese Übernahme ist nur aus Jobradar möglich." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return antwort({ fehler: "Die Anzeigendaten müssen als JSON übermittelt werden." }, 415);
  let wert: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return antwort({ fehler: "Es fehlen die Anzeigendaten." }, 400);
    const teile: Uint8Array[] = [];
    let laenge = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      laenge += value.byteLength;
      if (laenge > MAX_BODY) {
        await reader.cancel();
        return antwort({ fehler: "Die übermittelten Anzeigendaten sind zu groß." }, 413);
      }
      teile.push(value);
    }
    const bytes = new Uint8Array(laenge);
    let offset = 0;
    for (const teil of teile) { bytes.set(teil, offset); offset += teil.byteLength; }
    wert = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { return antwort({ fehler: "Die übermittelten Anzeigendaten sind ungültig." }, 400); }
  const geprueft = pruefeImportDaten(wert);
  if ("fehler" in geprueft) return antwort(geprueft, 400);
  try {
    const sb = await client();
    const { data, error } = await sb.auth.getClaims();
    const owner = data?.claims?.sub;
    if (error || typeof owner !== "string" || !istUuid(owner)) return antwort({ fehler: "Bitte melde dich bei Jobradar an." }, 401);
    const r = await importiereStelle(sb, owner, geprueft.daten, imHintergrund);
    return "fehler" in r ? antwort(r, 503) : antwort(r, r.vorhanden ? 200 : 201);
  } catch { return antwort({ fehler: FEHLER }, 503); }
}
