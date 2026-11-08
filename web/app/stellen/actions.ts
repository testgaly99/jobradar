"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anlegenAusJob } from "@/lib/bewerbung-anlegen";
import { fehlerText } from "@/lib/fehler";
import { heuteLokal } from "@/lib/filter";

// Merkt die Stelle (Status gemerkt) und bleibt auf der Liste. Doppelklick legt dank anlegenAusJob keine zweite Bewerbung an.
export async function merken(jobId: string) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: job } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", jobId).maybeSingle();
  if (!job) redirect("/stellen");
  const r = await anlegenAusJob(sb, job);
  if ("fehler" in r) redirect(`/stellen?fehler=${encodeURIComponent(fehlerText({}))}`);
  revalidatePath("/stellen");
}

// "Ich habe mich beworben": Bewerbung anlegen oder finden, Status beworben und Datum setzen (der Trigger schreibt den Verlauf).
export async function beworben(jobId: string) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: job } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", jobId).maybeSingle();
  if (!job) redirect("/stellen");
  const r = await anlegenAusJob(sb, job);
  if ("fehler" in r) redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent(fehlerText({}))}`);
  const { data: a } = await sb.from("applications").select("status,beworben_am").eq("id", r.id).maybeSingle();
  // Nur von "gemerkt" aus vorwärts; ein späterer Status (z. B. im Gespräch) wird nicht zurückgesetzt.
  const patch: Record<string, string> = {};
  if (a?.status === "gemerkt") patch.status = "beworben";
  if (a && !a.beworben_am) patch.beworben_am = heuteLokal();
  if (Object.keys(patch).length) {
    const { error } = await sb.from("applications").update(patch).eq("id", r.id);
    if (error) redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent("Der Status konnte nicht gespeichert werden. Bitte erneut versuchen.")}`);
  }
  revalidatePath("/stellen");
  redirect(`/bewerbungen/${r.id}`);
}
