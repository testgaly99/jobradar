"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function bewerbungAusStelle(jobId: string) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: vorhanden } = await sb.from("applications").select("id").eq("job_id", jobId).limit(1).maybeSingle();
  if (vorhanden) redirect(`/bewerbungen/${vorhanden.id}`);
  const { data: job } = await sb.from("jobs")
    .select("unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", jobId).maybeSingle();
  if (!job) redirect("/stellen");
  let quelle: string | null = null;
  try { quelle = new URL(job.url).hostname; } catch { /* Link ungültig: ohne Quelle */ }
  const { data, error } = await sb.from("applications").insert({
    job_id: jobId, firma: job.unternehmen, titel: job.titel, link: job.url, quelle,
    standort: job.ort, praesenzmodell: job.arbeitsmodell, snapshot_text: job.text, status: "gemerkt",
  }).select("id").single();
  if (error || !data) throw new Error("Bewerbung konnte nicht angelegt werden.");
  redirect(`/bewerbungen/${data.id}`);
}
