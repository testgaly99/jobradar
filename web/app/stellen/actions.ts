"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { beworbenPatch } from "@/lib/bewerbung";
import { anlegenAusJob } from "@/lib/bewerbung-anlegen";
import { fehlerText } from "@/lib/fehler";
import { heuteLokal } from "@/lib/filter";
import { darfEntmerken, hatEigeneEingaben } from "@/lib/schalter";

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
  if (a) Object.assign(patch, beworbenPatch("beworben", a.beworben_am, heuteLokal()));
  if (Object.keys(patch).length) {
    const { error } = await sb.from("applications").update(patch).eq("id", r.id);
    if (error) redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent("Der Status konnte nicht gespeichert werden. Bitte erneut versuchen.")}`);
  }
  revalidatePath("/stellen");
  redirect(`/bewerbungen/${r.id}`);
}

// Merken zurücknehmen: löscht die Bewerbung nur im Status gemerkt (Kontakte, Interviews, Verlauf fallen per cascade mit weg).
export async function entmerken(jobId: string) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: a } = await sb.from("applications").select("*").eq("job_id", jobId).limit(1).maybeSingle();
  if (a && darfEntmerken(a.status)) {
    // C1: Hat der Nutzer schon etwas eingetragen, nicht still löschen, sondern zur Bewerbung führen (dort gibt es „Bewerbung löschen“ mit Rückfrage).
    const anzahl = { count: "exact", head: true } as const;
    const [k, i, n] = await Promise.all([
      sb.from("contacts").select("id", anzahl).eq("application_id", a.id),
      sb.from("interviews").select("id", anzahl).eq("application_id", a.id),
      sb.from("application_events").select("id", anzahl).eq("application_id", a.id).is("neuer_status", null), // Verlaufsnotizen
    ]);
    const weitere = (k.count ?? 0) + (i.count ?? 0) + (n.count ?? 0);
    if (hatEigeneEingaben(a, weitere)) {
      redirect(`/bewerbungen/${a.id}?fehler=${encodeURIComponent("Diese gemerkte Stelle enthält schon deine Eingaben und wurde deshalb nicht gelöscht. Wenn du sie wirklich entfernen willst: unten „Bewerbung löschen“.")}`);
    }
    const { error } = await sb.from("applications").delete().eq("id", a.id).eq("status", "gemerkt");
    if (error) redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent("Das Merken konnte nicht zurückgenommen werden. Bitte erneut versuchen.")}`);
  }
  revalidatePath("/stellen");
  revalidatePath(`/stellen/${jobId}`);
}

