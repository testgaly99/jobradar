"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anlegenAusJob, aufBeworben } from "@/lib/bewerbung-anlegen";
import { fehlerText } from "@/lib/fehler";
import { heuteLokal, ID_FORM } from "@/lib/filter";
import { leseAbschnitte, type Anzeigenteil } from "@/lib/anzeige";
import type { Spalte } from "@/lib/cv-ergebnis";
import { ladeAbgleich } from "../cv-abgleich";
import { ladeZugZeile } from "@/lib/tracker-daten";
import { bewerbenGesperrt, OFFLINE_GESPERRT } from "@/lib/offline";
import { entmerkenMit } from "@/lib/bewerbung-schutz";
import { aktuellerNutzer } from '@/lib/nutzer';
import { createAdminClient } from '@/lib/supabase/admin';
import { firmendatenIssue } from '@/lib/firmendaten-issue';
import { wunschfirmaMit } from '@/lib/wunschfirmen';

export async function wunschfirmaUmschalten(form:FormData){
  const n=await aktuellerNutzer();if(!n)redirect('/login');
  const sb=await createClient();
  const fehler=await wunschfirmaMit(n.id,form.get('firma'),form.get('wert'),{
    sichtbar:async firma=>{const r=await sb.from('companies').select('name').eq('name',firma).maybeSingle();return !r.error&&!!r.data;},
    anlegen:async(owner,firma)=>{const r=await sb.from('wunschfirmen').upsert({owner_id:owner,unternehmen:firma},{onConflict:'owner_id,unternehmen',ignoreDuplicates:true});if(r.error)throw Error('Speichern fehlgeschlagen');},
    entfernen:async(owner,firma)=>{const r=await sb.from('wunschfirmen').delete().eq('owner_id',owner).eq('unternehmen',firma);if(r.error)throw Error('Entfernen fehlgeschlagen');},
  });
  revalidatePath('/konto');revalidatePath('/stellen');
  const id=String(form.get('job_id')??'');
  const ziel=id?'/stellen/'+encodeURIComponent(id):'/konto';
  if(fehler)redirect(ziel+'?fehler='+encodeURIComponent(fehler));
}

export async function firmendatenPruefen(_alt:{meldung:string;link:string|null},form:FormData):Promise<{meldung:string;link:string|null}>{
  const n=await aktuellerNutzer();if(!n?.admin)return {meldung:'Nicht berechtigt.',link:null};
  if(!process.env.GITHUB_ISSUE_TOKEN||!process.env.GITHUB_REPOSITORY)return {meldung:'Firmendaten-Prüfung ist noch nicht eingerichtet.',link:null};
  const sb=await createClient();const admin=await sb.rpc('ist_admin');
  if(admin.error||admin.data!==true)return {meldung:'Nicht berechtigt oder Admin-Einrichtung fehlt.',link:null};
  const firma=String(form.get('firma')??''),hinweis=String(form.get('hinweis')??'');
  const verboten:string[]=[];
  if(hinweis){
    try{
      const dienst=createAdminClient();
      for(let von=0;von<10000;von+=500){
        const r=await dienst.from('ranking_listen').select('name').order('id').range(von,von+499);
        if(r.error)return {meldung:'Öffentlicher Hinweis konnte nicht geprüft werden.',link:null};
        verboten.push(...(r.data??[]).map(z=>String(z.name)));
        if((r.data??[]).length<500)break;
        if(von===9500)return {meldung:'Öffentlicher Hinweis konnte nicht geprüft werden.',link:null};
      }
    }catch{return {meldung:'Öffentlicher Hinweis konnte nicht geprüft werden.',link:null};}
  }
  const r=await firmendatenIssue(firma,hinweis,{admin:true,verboteneBegriffe:verboten,ladeFirma:async name=>{
    const r=await sb.from('companies').select('name,herkunft,groesse_klasse,kategorie,hauptsitz,careers_url').eq('name',name).maybeSingle();
    return r.error?null:r.data;
  }});
  return 'link'in r?{meldung:'Firmendaten-Prüfung angefragt.',link:r.link}:{meldung:r.fehler,link:null};
}

// Merkt die Stelle (Status gemerkt) und bleibt auf der Liste. Doppelklick legt dank anlegenAusJob keine zweite Bewerbung an.
export async function merken(jobId: string) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: job } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", jobId).maybeSingle();
  if (!job) redirect("/stellen");
  const r = await anlegenAusJob(sb, job, claims.claims.sub);
  if ("fehler" in r) redirect(`/stellen?fehler=${encodeURIComponent(fehlerText({}))}`);
  if (r.manuelleBewerbung) redirect(`/bewerbung/${r.id}`);
  revalidatePath("/stellen");
}

// "Ich habe mich beworben": Bewerbung anlegen oder finden, Status beworben und Datum setzen (der Trigger schreibt den Verlauf).
export async function beworben(jobId: string, trotzdem = false) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");
  const { data: job } = await sb.from("jobs")
    .select("id,unternehmen,titel,url,ort,arbeitsmodell,text").eq("id", jobId).maybeSingle();
  if (!job) redirect("/stellen");
  const r = await anlegenAusJob(sb, job, claims.claims.sub);
  if ("fehler" in r) redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent(fehlerText({}))}`);
  if (!r.manuelleBewerbung) { // Sperre: gemerkt + Anzeige offline, außer "Trotzdem eintragen"
    const z = await ladeZugZeile(sb, r.id);
    if (z.fehler || !z.alt) redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent(fehlerText({}))}`);
    if (bewerbenGesperrt(z.alt.status, z.offline, trotzdem === true)) redirect(`/stellen/${encodeURIComponent(jobId)}?fehler=${encodeURIComponent(OFFLINE_GESPERRT)}`);
  }
  if (!r.manuelleBewerbung && !(await aufBeworben(sb, r.id, heuteLokal()))) {
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


// Lädt die gegliederte Anzeige für das Aufklappen in der Liste (nur Angemeldete; Gäste dürfen text/abschnitte nicht lesen).
// geschaetzt ist bis Paket 4 immer false.
export async function anzeigeLaden(jobId: string): Promise<{ abschnitte: Anzeigenteil[] | null; text: string | null; begriffe: string[]; spalten: Spalte[]; geschaetzt: boolean } | { fehler: string }> {
  if (!(await aktuellerNutzer())) return { fehler: "Bitte anmelden." };
  if (typeof jobId !== "string" || !ID_FORM.test(jobId)) return { fehler: "Ungültige Stelle." };
  const sb = await createClient();
  const [j, wp, al] = await Promise.all([
    sb.from("jobs").select("abschnitte,text").eq("id", jobId).maybeSingle(),
    sb.from("wichtige_punkte").select("begriff"),
    // Fehlt Migration 018, scheitert nur diese Abfrage: dann kein CV-Abgleich (wie auf der Detailseite).
    sb.from("jobs").select("anforderungsliste,anforderungs_hash").eq("id", jobId).maybeSingle(),
  ]);
  if (j.error || !j.data) return { fehler: "Anzeige konnte nicht geladen werden." };
  const cv = al.error || !al.data ? null : await ladeAbgleich(sb, { job_id: jobId }, al.data.anforderungsliste, al.data.anforderungs_hash);
  return {
    abschnitte: leseAbschnitte(j.data.abschnitte), text: j.data.text ?? null,
    begriffe: wp.error ? [] : (wp.data ?? []).map((p: { begriff: string }) => p.begriff),
    spalten: cv?.zustand === "fertig" ? cv.spalten : [], geschaetzt: false,
  };
}
