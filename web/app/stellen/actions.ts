"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { anlegenAusJob } from "@/lib/bewerbung-anlegen";
import { fehlerText } from "@/lib/fehler";

export async function bewerbungAusStelle(jobId: string) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: job } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", jobId).maybeSingle();
  if (!job) redirect("/stellen");
  const r = await anlegenAusJob(sb, job);
  if ("fehler" in r) redirect(`/stellen?fehler=${encodeURIComponent(fehlerText({}))}`);
  redirect(`/bewerbungen/${r.id}`);
}
