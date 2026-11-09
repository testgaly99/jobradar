// Reine Link-Erkennung, ruft nichts ab.
export type Ats = { typ: "greenhouse" | "ashby" | "lever" | "personio"; id: string | null; jobId: string };
// link: vereinheitlichte Form, falls es eine gibt (für die Dublettenprüfung).
export type LinkInfo = { quelle: string; ats?: Ats; titel?: string; firma?: string; link?: string };

const wort = (s: string) => s.split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export function analysiereLink(url: string): LinkInfo {
  const u = new URL(url);
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const p = u.pathname.split("/").filter(Boolean);
  const info: LinkInfo = { quelle: host };
  let m: RegExpMatchArray | null;

  if (/^(job-)?boards\.greenhouse\.io$/.test(host) && p[1] === "jobs" && p[2]) {
    info.ats = { typ: "greenhouse", id: p[0], jobId: p[2] };
  } else if (u.searchParams.get("gh_jid")) {
    info.ats = { typ: "greenhouse", id: null, jobId: u.searchParams.get("gh_jid")! };
  } else if (host === "jobs.ashbyhq.com" && p[0] && p[1]) {
    info.ats = { typ: "ashby", id: p[0], jobId: p[1] };
  } else if (host === "jobs.lever.co" && p[0] && p[1]) {
    info.ats = { typ: "lever", id: p[0], jobId: p[1] };
  } else if ((m = host.match(/^([a-z0-9-]+)\.jobs\.personio\.de$/)) && p[0] === "job" && p[1]) {
    info.ats = { typ: "personio", id: m[1], jobId: p[1] };
  } else if (/(^|\.)linkedin\.com$/.test(host) && p[0] === "jobs") {
    // Ansicht, Sammlung oder Suche: dieselbe Stelle bekommt immer den Link .../jobs/view/<nummer>/.
    const nr = p[1] === "view" && p[2] ? p[2].match(/(?:^|-)(\d+)$/)?.[1] : u.searchParams.get("currentJobId")?.match(/^\d+$/)?.[0];
    if (nr) info.link = `https://www.linkedin.com/jobs/view/${nr}/`;
    // Nur der Slug mit "-at-" ist verwertbar; "<titel>-at-<firma>-<nummer>".
    if (p[1] === "view" && p[2] && (m = p[2].match(/^(.+)-at-(.+)-\d+$/))) { info.titel = wort(m[1]); info.firma = wort(m[2]); }
  } else if (/(^|\.)stepstone\./.test(host)) {
    // shortcut: Titel, Ort und Firma sind nur bei je einem Wort eindeutig trennbar.
    const pfad = (() => { try { return decodeURIComponent(u.pathname); } catch { return u.pathname; } })();
    const t = pfad.match(/stellenangebote--(.+?)--\d+-inline\.html/)?.[1].split("-");
    if (t?.length === 3) { info.titel = t[0]; info.firma = t[2]; }
  }
  return info;
}

const RECHTSFORMEN = /\b(gmbh|ag|se|inc|ltd|llc|kg|co|ohg|ug|kgaa|mbh|plc|sa|bv|corp)\b/g;

export function normFirma(s: string): string {
  return s.toLowerCase().replace(/[.,]/g, " ").replace(RECHTSFORMEN, " ").replace(/&/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}
// Firmen gelten als gleich bei Gleichheit oder Präfix (ohne Rechtsform, ohne Leerzeichen).
export function firmaPasst(a: string, b: string): boolean {
  const x = normFirma(a).replace(/ /g, ""), y = normFirma(b).replace(/ /g, "");
  return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x));
}
export function normTitel(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
export function slugAusFirma(s: string): string {
  return normFirma(s.replace(/-/g, "")).replace(/[^a-z0-9]/g, "");
}
// Nur Klartext speichern, nie als HTML rendern.
export function htmlZuText(h: string): string {
  const e = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  return e(e(h).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
