import type { SupabaseClient } from "@supabase/supabase-js";
import { isIP } from "node:net";
import { alleStellen, holeStelle, type Stelle } from "./ats-abruf.ts";
import { escapeLike, istUuid } from "./bewerbung.ts";
import { findeBewerbungZumLink, snapshotAusJob, type JobZeile } from "./bewerbung-anlegen.ts";
import { istPortal } from "./jobportale.ts";
import { analysiereLink, firmaPasst, type Ats } from "./link-import.ts";
import { vergleiche } from "./original-suche.ts";
export { originalSpalteFehlt } from "./bewerbung-anlegen.ts";

type Zustand = "gefunden" | "auswahl" | "offen" | "nicht_gefunden";
type Treffer = { titel: string; ort: string | null; job_id: string; firma: string } |
  { titel: string; ort: string | null; url: string; ats_typ: Portal["typ"]; ats_id: string; ext_id: string };
type App = {
  id: string; owner_id: string; geaendert_am: string; job_id: null;
  link: string | null; portal_link: string | null; quelle: string | null; original_suche: Zustand | null;
  original_wahl: number | null; original_vorschlaege: unknown;
  firma: string | null; titel: string | null; standort: string | null;
  praesenzmodell: string | null; snapshot_text: string | null; snapshot_abschnitte: unknown;
};
type Kandidat = Pick<JobZeile, "id" | "titel" | "unternehmen" | "ort" | "url">;
type Board = { typ: Exclude<Ats["typ"], "lever">; id: string };
type Portal = Board | { typ: "sitemap"; id: string };
type Ergebnis = { fehler: string | null };
const FEHLER = "Die Originalstelle konnte nicht gespeichert werden. Bitte lade die Bewerbung neu.";
const JOB = "id,unternehmen,titel,url,ort,arbeitsmodell,text,abschnitte";
const BOARDS = new Set<string>(["greenhouse", "ashby", "personio", "recruitee"]);
const SEITENGROESSE = 500;

function stellenUrl(wert: unknown): URL | null {
  if (typeof wert !== "string") return null;
  try {
    const u = new URL(wert);
    return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password && !istPortal(u.hostname) ? u : null;
  } catch { return null; }
}

function externerOriginalLink(wert: unknown): boolean {
  if (typeof wert !== "string" || /[\p{White_Space}\u0000-\u001f\u007f\\]/u.test(wert)) return false;
  const authority = /^https:\/\/([^/?#]+)/i.exec(wert)?.[1];
  if (!authority || /[@%]/.test(authority)) return false;
  const url = stellenUrl(wert);
  if (url?.protocol !== "https:" || url.port !== "") return false;
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host.split(".").every(Boolean) && host !== "localhost" && !host.endsWith(".localhost") && isIP(host) === 0;
}

export function originalPortal(wert: unknown): Portal | null {
  if (!wert || typeof wert !== "object" || !("typ" in wert) || !("id" in wert)) return null;
  const { typ, id } = wert;
  if (typeof typ !== "string" || typeof id !== "string") return null;
  if (typ === "sitemap") {
    const trenner = id.indexOf("#");
    const url = id.slice(0, trenner);
    return id.length <= 2048 && trenner > 0 && id[trenner + 1] === "/" && !/[\s\\]/.test(id) &&
      externerOriginalLink(url) ? { typ, id } : null;
  }
  if (!BOARDS.has(typ)) return null;
  const muster = typ === "recruitee"
    ? /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.recruitee\.com$/
    : /^[a-z0-9_-]{1,200}$/i;
  return muster.test(id) ? { typ: typ as Board["typ"], id } : null;
}

async function leseAnlage(sb: SupabaseClient, id: string, owner: string): Promise<App | null> {
  if (!istUuid(id) || !istUuid(owner)) return null;
  const { data } = await sb.from("applications")
    .select("id,owner_id,geaendert_am,job_id,link,portal_link,quelle,original_suche,original_wahl,original_vorschlaege,firma,titel,standort,praesenzmodell,snapshot_text,snapshot_abschnitte")
    .eq("id", id).eq("owner_id", owner).maybeSingle();
  return data?.owner_id === owner && data.job_id === null ? data : null;
}

async function speichere(sb: SupabaseClient, app: App, patch: Record<string, unknown>) {
  return sb.from("applications").update(patch).eq("id", app.id).eq("owner_id", app.owner_id)
    .eq("geaendert_am", app.geaendert_am).is("job_id", null).select("id").maybeSingle();
}

const suche = (original_suche: Zustand, original_vorschlaege: Treffer[] | null = null) => ({
  original_suche, original_vorschlaege, original_wahl: null, original_dublette: null,
});

async function dublette(sb: SupabaseClient, app: App, link: string, jobId?: string) {
  const [nachLink, nachJob] = await Promise.all([
    findeBewerbungZumLink(sb, app.owner_id, link, { ohneId: app.id, nurOhneJob: Boolean(jobId) }),
    jobId ? sb.from("applications").select("id").eq("owner_id", app.owner_id).neq("id", app.id)
      .eq("job_id", jobId).order("id").limit(1).maybeSingle() : null,
  ]);
  return { fehler: nachLink.error || nachJob?.error, id: nachJob?.data?.id ?? nachLink.data?.id };
}

async function zuordnen(sb: SupabaseClient, app: App, snapshot: ReturnType<typeof snapshotAusJob>, jobId?: string, portal?: Portal): Promise<Zustand | null> {
  const link = snapshot.link;
  if (!link || !stellenUrl(link) || !app.portal_link || app.link !== app.portal_link) return null;
  const markiereDublette = async (id: string): Promise<Zustand | null> =>
    (await speichere(sb, app, { ...suche("nicht_gefunden"), original_dublette: id })).data ? "nicht_gefunden" : null;

  const dup = await dublette(sb, app, link, jobId);
  if (dup.fehler) return null;
  if (dup.id) return markiereDublette(dup.id);

  const eigentlicheFelder = Object.fromEntries(Object.entries(snapshot).filter(([feld, wert]) =>
    feld !== "link" && feld !== "quelle" && wert != null && wert !== "" && (app[feld as keyof App] == null || app[feld as keyof App] === "")));
  const quelleIstAutomatisch = !app.quelle || app.quelle === analysiereLink(app.portal_link).quelle;
  const r = await speichere(sb, app, {
    ...suche("gefunden"), ...eigentlicheFelder, link, portal_link: app.portal_link,
    ...(quelleIstAutomatisch ? { quelle: snapshot.quelle } : {}),
    ...(jobId ? { job_id: jobId } : {}), ...(portal ? { original_portal: portal } : {}),
  });
  if (r.data) return "gefunden";
  if (r.error?.code === "23505") {
    // Eine andere Anfrage konnte zwischen der Prüfung und dem Schreiben die Stelle verknüpfen.
    const inzwischen = await dublette(sb, app, link, jobId);
    if (!inzwischen.fehler && inzwischen.id) return markiereDublette(inzwischen.id);
  }
  return null;
}

const offeneJobs = (sb: SupabaseClient) => sb.from("jobs").select(JOB).eq("sichtbar", true).eq("status", "offen");
const firmenschluessel = (s: string) => s.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const RECHTSFORM_AM_ENDE = / (?:gmbh co kg|ug haftungsbeschränkt co kg|ug haftungsbeschränkt|gmbh|ag|se|inc|ltd|llc|kg|ohg|ug|kgaa|mbh|plc|sa|bv|corp)$/;
function firmaEindeutig(a: string, b: string): boolean {
  const x = firmenschluessel(a), y = firmenschluessel(b);
  const ax = x.replace(RECHTSFORM_AM_ENDE, ""), by = y.replace(RECHTSFORM_AM_ENDE, "");
  return x === y || (ax === by && (x === ax || y === by));
}

async function passendeJobs(sb: SupabaseClient, firma: string): Promise<Kandidat[] | null> {
  const treffer: Kandidat[] = [];
  for (let start = 0; ; start += SEITENGROESSE) {
    const { data, error } = await sb.from("jobs").select("id,unternehmen,titel,ort,url")
      .eq("sichtbar", true).eq("status", "offen").order("id").range(start, start + SEITENGROESSE - 1);
    if (error) return null;
    for (const job of data ?? []) {
      if (job.unternehmen && firmaPasst(job.unternehmen, firma)) treffer.push(job);
    }
    if (!data || data.length < SEITENGROESSE) return treffer;
  }
}

export async function firmaBereitsBekannt(sb: SupabaseClient, firma: string, portal: Portal) {
  const [name, board] = await Promise.all([
    sb.from("companies").select("name").ilike("name", escapeLike(firma.trim())).limit(1).maybeSingle(),
    sb.from("companies").select("name").eq("ats_typ", portal.typ)
      .eq("ats_id", portal.id).limit(1).maybeSingle(),
  ]);
  return Boolean(name.data || board.data || name.error || board.error);
}

async function bekanntesBoard(sb: SupabaseClient, firma: string): Promise<Board | null> {
  let passend: { name: string; ats_typ: unknown; ats_id: unknown } | undefined;
  for (let start = 0; ; start += SEITENGROESSE) {
    const { data, error } = await sb.from("companies").select("name,ats_typ,ats_id").eq("aktiv", true)
      .order("name").range(start, start + SEITENGROESSE - 1);
    if (error) return null;
    for (const unternehmen of data ?? []) {
      if (!firmaPasst(unternehmen.name, firma)) continue;
      if (passend || !firmaEindeutig(unternehmen.name, firma)) return null;
      passend = unternehmen;
    }
    if (!data || data.length < SEITENGROESSE) break;
  }
  const portal = passend && originalPortal({ typ: passend.ats_typ, id: passend.ats_id });
  return portal && portal.typ !== "sitemap" ? portal : null;
}

function vorschlagVonStelle(s: Stelle, p: Portal): Treffer {
  return { titel: s.titel, ort: s.ort, url: s.url, ats_typ: p.typ, ats_id: p.id, ext_id: s.extId };
}

async function imBoardSuchen(sb: SupabaseClient, app: App & { firma: string; titel: string }, dep: { alle: typeof alleStellen; stelle: typeof holeStelle }) {
  // Eine Kennung aus dem Firmennamen allein kann auch das Board einer anderen Firma treffen.
  const p = await bekanntesBoard(sb, app.firma);
  if (!p) return null;
  try {
    const boardId = p.typ === "recruitee" ? p.id.replace(/\.recruitee\.com$/, "") : p.id;
    const stellen = (await dep.alle(p.typ, boardId)).filter(s => typeof s.titel === "string" && externerOriginalLink(s.url));
    const verglichen = vergleiche(app.titel, app.standort, stellen);
    if (verglichen.art === "keine") return null;
    if (verglichen.art === "auswahl") return suche("auswahl", verglichen.treffer.map(s => vorschlagVonStelle(s, p)));
    const s = p.typ === "greenhouse" ? await dep.stelle({ ...p, jobId: verglichen.treffer.extId }) : verglichen.treffer;
    if (s.extId !== verglichen.treffer.extId || !externerOriginalLink(s.url)) return null;
    return { s, p };
  } catch { return null; }
}

export async function ordneOriginalZu(sb: SupabaseClient, id: string, owner: string,
  dep: { alle?: typeof alleStellen; stelle?: typeof holeStelle } = {}): Promise<Zustand> {
  const app = await leseAnlage(sb, id, owner);
  if (!app || !app.portal_link || app.link !== app.portal_link || app.original_wahl != null || ![null, "offen"].includes(app.original_suche)) return "offen";
  if (!app.firma || !app.titel) return "offen";
  const kandidaten = await passendeJobs(sb, app.firma);
  if (!kandidaten) return "offen";

  let patch = suche("offen");
  if (kandidaten.length) {
    const bewertbar = kandidaten.filter((job): job is Kandidat & { titel: string; unternehmen: string } =>
      !!job.titel && !!job.unternehmen && !!stellenUrl(job.url));
    const ergebnis = vergleiche(app.titel, app.standort, bewertbar);
    const alsVorschlag = (j: typeof bewertbar[number]): Treffer => ({ titel: j.titel, ort: j.ort, job_id: j.id, firma: j.unternehmen });
    if (ergebnis.art === "eindeutig") {
      const j = ergebnis.treffer;
      const eindeutig = new Set(kandidaten.map(k => k.unternehmen)).size === 1 && firmaEindeutig(app.firma, j.unternehmen);
      if (eindeutig) {
        const { data: frisch } = await offeneJobs(sb).eq("id", j.id).maybeSingle();
        if (frisch?.titel !== j.titel || frisch.unternehmen !== j.unternehmen || frisch.ort !== j.ort || frisch.url !== j.url) return "offen";
        return (await zuordnen(sb, app, snapshotAusJob(frisch), j.id)) ?? "offen";
      }
      patch = suche("auswahl", [alsVorschlag(j)]);
    } else if (ergebnis.art === "auswahl") {
      patch = suche("auswahl", ergebnis.treffer.map(alsVorschlag));
    } else {
      patch = suche("nicht_gefunden");
    }
  } else {
    const board = await imBoardSuchen(sb, { ...app, firma: app.firma, titel: app.titel }, { alle: dep.alle ?? alleStellen, stelle: dep.stelle ?? holeStelle });
    if (board && "s" in board) {
      const { s, p } = board;
      return (await zuordnen(sb, app, snapshotAusJob({ id: s.extId, unternehmen: app.firma, titel: s.titel,
        url: s.url, ort: s.ort, text: s.text, arbeitsmodell: null }), undefined, p)) ?? "offen";
    }
    if (board) patch = board;
  }
  return (await speichere(sb, app, patch)).data ? patch.original_suche : "offen";
}

async function leseAuswahl(sb: SupabaseClient, appId: string, owner: string) {
  const app = await leseAnlage(sb, appId, owner);
  return app?.original_suche === "auswahl" ? app : null;
}

export async function originalWaehlenMit(sb: SupabaseClient, appId: string, owner: string, index: number): Promise<Ergebnis> {
  if (!Number.isSafeInteger(index) || index < 0 || index >= 5) return { fehler: FEHLER };
  const app = await leseAuswahl(sb, appId, owner);
  const v = app && Array.isArray(app.original_vorschlaege) ? app.original_vorschlaege[index] : null;
  if (!app || !v || typeof v.titel !== "string" || !app.portal_link || app.link !== app.portal_link) return { fehler: FEHLER };
  if ("job_id" in v) {
    const { data: job } = typeof v.job_id === "string" ? await offeneJobs(sb).eq("id", v.job_id).maybeSingle() : { data: null };
    const ok = app.firma && job?.unternehmen && firmaPasst(job.unternehmen, app.firma) &&
      job.titel === v.titel && (!("ort" in v) || v.ort === job.ort) &&
      await zuordnen(sb, app, snapshotAusJob(job), job.id);
    return { fehler: ok ? null : FEHLER };
  }
  if (!originalPortal({ typ: v.ats_typ, id: v.ats_id }) || typeof v.ext_id !== "string" || !v.ext_id || !externerOriginalLink(v.url))
    return { fehler: FEHLER };
  const r = await speichere(sb, app, { original_wahl: index, original_suche: "offen" });
  return { fehler: r.data ? null : FEHLER };
}

export async function keinOriginalMit(sb: SupabaseClient, appId: string, owner: string): Promise<Ergebnis> {
  const app = await leseAuswahl(sb, appId, owner);
  if (!app) return { fehler: FEHLER };
  const r = await speichere(sb, app, suche("nicht_gefunden"));
  return { fehler: r.data ? null : FEHLER };
}
