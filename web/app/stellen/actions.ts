"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anlegenAusJob, aufBeworben } from "@/lib/bewerbung-anlegen";
import { fehlerText } from "@/lib/fehler";
import { heuteLokal } from "@/lib/filter";
import { entmerkenMit } from "@/lib/bewerbung-schutz";

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
  if (!(await aufBeworben(sb, r.id, heuteLokal()))) {
    redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent("Der Status konnte nicht gespeichert werden. Bitte erneut versuchen.")}`);
  }
  revalidatePath("/stellen");
  redirect(`/bewerbung/${r.id}`);
}

// Merken zurücknehmen: löscht die Bewerbung nur im Status gemerkt (Kontakte, Interviews, Verlauf fallen per cascade mit weg).
export async function entmerken(jobId: string) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const r = await entmerkenMit(sb, jobId);
  if (r.art === "eigene_eingaben") {
    redirect(`/bewerbung/${r.id}?fehler=${encodeURIComponent("Diese gemerkte Stelle enthält schon deine Eingaben und wurde deshalb nicht gelöscht. Wenn du sie wirklich entfernen willst: unten „Bewerbung löschen“.")}`);
  }
  if (r.art === "fehler") redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent("Das Merken konnte nicht zurückgenommen werden. Bitte erneut versuchen.")}`);
  revalidatePath("/stellen");
  revalidatePath(`/stellen/${jobId}`);
}

