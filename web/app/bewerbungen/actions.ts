"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { analysiereLink, firmaPasst, hostOhneWww, normFirma, normTitel, slugAusFirma } from "@/lib/link-import";
import { anlegenAusJob, type JobZeile } from "@/lib/bewerbung-anlegen";
import { holeStelle, sucheTitel, type Stelle } from "@/lib/ats-abruf";
import { textZuLang } from "@/lib/uebernahme";

type Ergebnis = { brauchtEingabe: true } | { fehler: string };
type Ziel = { firma?: string; titel?: string; ort?: string | null; link: string; quelle: string | null; text?: string | null; job?: JobZeile | null };

// text: eingefügter Anzeigentext, nur wenn es keinen Text aus Stellenliste oder ATS gibt. Es wird nichts abgerufen, was GESPERRT ist.
// Ohne Link: Firma und Titel sind Pflicht. Mit Link: eingetragene Firma/Titel gehen vor, der Rest kommt aus dem Link.
export async function bewerbungAusLink(url: string, firma?: string, titel?: string, text?: string): Promise<Ergebnis> {
  text = text?.replace(/\r\n/g, "\n").trim();
  if (text && textZuLang(text)) return { fehler: "Der Anzeigentext ist zu lang (höchstens 50.000 Zeichen)." };
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) return { fehler: "Bitte melde dich an." };
  if (!url.trim()) {
    if (!firma?.trim() || !titel?.trim()) return { fehler: "Bitte einen Link einfügen oder Firma und Titel eintragen." };
    const { data, error } = await sb.from("applications")
      .insert({ firma: firma.trim(), titel: titel.trim(), snapshot_text: text || null, status: "gemerkt" }).select("id").single();
    if (error || !data) return { fehler: "Bewerbung konnte nicht angelegt werden." };
    redirect(`/bewerbung/${data.id}`);
  }
  let u: URL;
  try { u = new URL(url.trim()); } catch { return { fehler: "Das ist kein gültiger Link." }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { fehler: "Nur http- und https-Links sind möglich." };
  const a = analysiereLink(u.toString());
  const link = a.link ?? u.toString();
  firma = firma?.trim() || a.firma;
  titel = titel?.trim() || a.titel;

  const vorhandenZu = async (spalte: "job_id" | "link", wert: string) =>
    (await sb.from("applications").select("id").eq(spalte, wert).limit(1).maybeSingle()).data?.id as string | undefined;

  const dupLink = await vorhandenZu("link", link);
  if (dupLink) redirect(`/bewerbung/${dupLink}`);

  // Verknüpfung nur über die Firma des Boards (companies.ats_typ/ats_id) und die exakte id "<firma>:<ext_id>".
  const ausStelle = async (s: Stelle, typ: string, boardId: string): Promise<Ziel> => {
    const { data: fz } = await sb.from("companies").select("name").eq("ats_typ", typ).eq("ats_id", boardId).limit(1).maybeSingle();
    const job = fz
      ? (await sb.from("jobs").select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", `${fz.name}:${s.extId}`).limit(1).maybeSingle()).data
      : null;
    if (job) return { firma: job.unternehmen ?? firma, link, quelle: a.quelle, job };
    return { firma, titel: s.titel, ort: s.ort, link, quelle: a.quelle, text: s.text };
  };

  let ziel: Ziel | null = null;
  // Schritt 1: ATS-Link über die offizielle Schnittstelle.
  if (a.ats?.id) {
    try { ziel = await ausStelle(await holeStelle({ ...a.ats, id: a.ats.id }), a.ats.typ, a.ats.id); } catch { /* weiter mit Schritt 2 */ }
  }

  // Schritt 1b: nur Job-Nummer (z. B. ?gh_jid=): in der eigenen Stellenliste nach id "<firma>:<nummer>" suchen; nur bei genau einem Treffer.
  if (!ziel && a.ats?.jobId && /^[A-Za-z0-9._-]{1,200}$/.test(a.ats.jobId)) {
    // "_" ist im like-Muster ein Platzhalter, deshalb escapen.
    const { data: tr } = await sb.from("jobs").select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("sichtbar", true).like("id", `%:${a.ats.jobId.replace(/_/g, "\\_")}`).limit(2);
    if (tr?.length === 1) ziel = { link, quelle: a.quelle, job: tr[0] };
  }

  // Schritt 1c: Board-Kennung über die Firmentabelle (gleicher Host wie der Link, gleicher ATS-Typ).
  if (!ziel && a.ats && !a.ats.id) {
    const host = hostOhneWww(link);
    const { data: fs } = host ? await sb.from("companies").select("careers_url,ats_id").eq("ats_typ", a.ats.typ).not("ats_id", "is", null).limit(1000) : { data: null };
    const f = fs?.find((c) => c.careers_url && hostOhneWww(c.careers_url) === host);
    if (f?.ats_id) {
      try { ziel = await ausStelle(await holeStelle({ ...a.ats, id: f.ats_id }), a.ats.typ, f.ats_id); } catch { /* weiter mit Schritt 2 */ }
    }
  }

  // Schritt 2: Firma und Titel in jobs suchen.
  if (!ziel && firma && titel) {
    const erstes = normFirma(firma).split(" ")[0].replace(/[\\%_]/g, "");
    const { data: kand } = erstes
      ? await sb.from("jobs").select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("sichtbar", true).ilike("unternehmen", `%${erstes}%`).limit(500)
      : { data: null };
    const t = normTitel(titel);
    const job = kand?.find((j) => j.unternehmen && j.titel && firmaPasst(j.unternehmen, firma!) && normTitel(j.titel) === t);
    if (job) ziel = { link, quelle: a.quelle, job };
  }

  // Schritt 3: Boards unter dem Firmennamen als Slug prüfen.
  if (!ziel && firma && titel) {
    const slug = slugAusFirma(firma);
    if (slug) for (const typ of ["greenhouse", "ashby", "lever"] as const) {
      try {
        const s = await sucheTitel(typ, slug, titel);
        if (s) { ziel = await ausStelle(s, typ, slug); break; }
      } catch { /* Board fehlt oder Netzfehler: nächster Anbieter */ }
    }
  }

  // Schritt 4: nur Link, Firma und Titel.
  if (!ziel) {
    if (!firma && !titel) return { brauchtEingabe: true };
    ziel = { firma, titel, link, quelle: a.quelle };
  }

  if (ziel.job) {
    const r = await anlegenAusJob(sb, ziel.job, { quelle: ziel.quelle, text });
    if ("fehler" in r) return { fehler: "Bewerbung konnte nicht angelegt werden." };
    redirect(`/bewerbung/${r.id}`);
  }
  const { data, error } = await sb.from("applications").insert({
    firma: ziel.firma ?? null, titel: ziel.titel ?? null, link: ziel.link, quelle: ziel.quelle,
    standort: ziel.ort || null, snapshot_text: ziel.text || text || null, status: "gemerkt",
  }).select("id").single();
  if (error || !data) return { fehler: "Bewerbung konnte nicht angelegt werden." };
  redirect(`/bewerbung/${data.id}`);
}
