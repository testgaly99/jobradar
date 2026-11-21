"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anlegenAusJob, aufBeworben } from "@/lib/bewerbung-anlegen";
import { fehlerText } from "@/lib/fehler";
import { heuteLokal } from "@/lib/filter";
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

