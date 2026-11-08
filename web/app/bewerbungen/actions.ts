"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { analysiereLink, firmaPasst, normFirma, normTitel, slugAusFirma } from "@/lib/link-import";
import { holeStelle, sucheTitel, type Stelle } from "@/lib/ats-abruf";

type Ergebnis = { brauchtEingabe: true } | { fehler: string };
type Ziel = { firma?: string; titel?: string; ort?: string | null; link: string; quelle: string | null; text?: string | null; jobId?: string | null };

export async function bewerbungAusLink(url: string, firma?: string, titel?: string): Promise<Ergebnis> {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return { fehler: "Das ist kein gültiger Link." }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { fehler: "Nur http- und https-Links sind möglich." };
  const link = u.toString();
  const a = analysiereLink(link);
  firma = firma?.trim() || a.firma;
  titel = titel?.trim() || a.titel;

  const sb = await createClient();
  const vorhandenZu = async (spalte: "job_id" | "link", wert: string) =>
    (await sb.from("applications").select("id").eq(spalte, wert).limit(1).maybeSingle()).data?.id as string | undefined;

  const dupLink = await vorhandenZu("link", link);
  if (dupLink) redirect(`/bewerbungen/${dupLink}`);

  // Ist die ATS-Stelle schon in jobs (gleiche URL oder ext_id am Ende der id), wird sie verknüpft.
  const ausStelle = async (s: Stelle): Promise<Ziel> => {
    const ext = s.extId.replace(/[^\w-]/g, "");
    const felder = "id,unternehmen,titel,ort,text";
    let job = s.url ? (await sb.from("jobs").select(felder).eq("url", s.url).limit(1).maybeSingle()).data : null;
    if (!job && ext) job = (await sb.from("jobs").select(felder).like("id", `%:${ext}`).limit(1).maybeSingle()).data;
    if (job) return { firma: job.unternehmen ?? firma, titel: job.titel, ort: job.ort, link, quelle: a.quelle, text: job.text, jobId: job.id };
    return { firma, titel: s.titel, ort: s.ort, link, quelle: a.quelle, text: s.text };
  };

  let ziel: Ziel | null = null;
  // Schritt 1: ATS-Link über die offizielle Schnittstelle.
  if (a.ats?.id) {
    try { ziel = await ausStelle(await holeStelle({ ...a.ats, id: a.ats.id })); } catch { /* weiter mit Schritt 2 */ }
  }

  // Schritt 2: Firma und Titel in jobs suchen.
  if (!ziel && firma && titel) {
    const erstes = normFirma(firma).split(" ")[0].replace(/[\\%_]/g, "");
    const { data: kand } = erstes
      ? await sb.from("jobs").select("id,unternehmen,titel,ort,text").eq("sichtbar", true).ilike("unternehmen", `%${erstes}%`).limit(500)
      : { data: null };
    const t = normTitel(titel);
    const job = kand?.find((j) => j.unternehmen && j.titel && firmaPasst(j.unternehmen, firma!) && normTitel(j.titel) === t);
    if (job) ziel = { firma: job.unternehmen!, titel: job.titel, ort: job.ort, link, quelle: a.quelle, text: job.text, jobId: job.id };
  }

  // Schritt 3: Boards unter dem Firmennamen als Slug prüfen.
  if (!ziel && firma && titel) {
    const slug = slugAusFirma(firma);
    if (slug) for (const typ of ["greenhouse", "ashby", "lever"] as const) {
      try {
        const s = await sucheTitel(typ, slug, titel);
        if (s) { ziel = await ausStelle(s); break; }
      } catch { /* Board fehlt oder Netzfehler: nächster Anbieter */ }
    }
  }

  // Schritt 4: nur Link, Firma und Titel.
  if (!ziel) {
    if (!firma && !titel) return { brauchtEingabe: true };
    ziel = { firma, titel, link, quelle: a.quelle };
  }

  if (ziel.jobId) {
    const dup = await vorhandenZu("job_id", ziel.jobId);
    if (dup) redirect(`/bewerbungen/${dup}`);
  }
  const { data, error } = await sb.from("applications").insert({
    job_id: ziel.jobId ?? null, firma: ziel.firma ?? null, titel: ziel.titel ?? null, link: ziel.link, quelle: ziel.quelle,
    standort: ziel.ort ?? null, snapshot_text: ziel.text ?? null, status: "gemerkt",
  }).select("id").single();
  if (error || !data) return { fehler: "Bewerbung konnte nicht angelegt werden." };
  redirect(`/bewerbungen/${data.id}`);
}
