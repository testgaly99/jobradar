'use server';
import { aktuellerNutzer } from '@/lib/nutzer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { leseListe } from '@/lib/listen-import';
import { baueAusgabe } from '@/lib/listen-speichern';
import type { Eingabe } from '@/lib/listen-speichern';
import type { Eintrag } from '@/lib/listen-import';
import { revalidatePath } from 'next/cache';

export type Zustand={meldung:string;eintraege:Eintrag[];neu:string[];zuordnung:{unternehmen:string;rang:number|null}[]};
export async function listeAktion(_alt:Zustand, form:FormData):Promise<Zustand> {
  const leer:Zustand={meldung:'',eintraege:[],neu:[],zuordnung:[]};
  const n=await aktuellerNutzer(); if(!n?.admin) return {...leer,meldung:'Nicht berechtigt.'};
  const sb=await createClient(); const admin=await sb.rpc('ist_admin');
  if(admin.error||admin.data!==true) return {...leer,meldung:'Ranglisten-Verwaltung noch nicht eingerichtet. Migration 015 und Admin-Eintrag prüfen.'};
  try {
    const eingabe:Eingabe={name:String(form.get('name')??''),herausgeber:String(form.get('herausgeber')??''),jahr:Number(form.get('jahr')),
      quelle_url:String(form.get('quelle_url')??''),lizenz:String(form.get('lizenz')??''),sichtbarkeit:String(form.get('sichtbarkeit')??''),kategorie:String(form.get('kategorie')??'')};
    const service=createAdminClient(); const namen:string[]=[];
    for(let von=0;;von+=500) {
      const {data,error}=await service.from('companies').select('name').order('name').range(von,von+499);
      if(error) return {...leer,meldung:'Firmen konnten nicht geprüft werden.'};
      namen.push(...(data??[]).map(z=>String(z.name))); if((data??[]).length<500) break;
    }
    const speichern=form.get('absicht')==='speichern';
    let eintraege:Eintrag[];
    if(speichern) {
      const json=String(form.get('vorschau')??''); if(json.length>100000) throw new Error('Vorschau zu groß.');
      eintraege=JSON.parse(json);
    } else {
      const gelesen=await leseListe(String(form.get('text')??''));
      if(gelesen.hinweis) return {...leer,meldung:gelesen.hinweis};
      eintraege=gelesen.eintraege;
    }
    const ausgabe=baueAusgabe(eingabe,eintraege,namen,new Date().toISOString().slice(0,10));
    if(speichern) {
      const {error}=await service.rpc('speichere_handliste',{p_daten:ausgabe});
      if(error) return {...leer,meldung:'Nicht gespeichert. Ausgabe oder Ränge stehen im Konflikt mit vorhandenen Daten, oder die Einrichtung fehlt. Bitte mit Claude prüfen; vorhandene Daten bleiben erhalten.'};
      revalidatePath('/stellen'); revalidatePath('/admin/ranglisten');
      return {...leer,meldung:'Liste gespeichert. Weitere Teile derselben Ausgabe werden ergänzt.'};
    }
    return {meldung:'Bitte Namen, Ränge und Zuordnungen sorgfältig prüfen, dann speichern.',eintraege,neu:ausgabe.neueFirmen,zuordnung:ausgabe.firmen};
  } catch(e) { return {...leer,meldung:e instanceof Error && !(e instanceof SyntaxError)?e.message:'Ungültige Vorschau. Bitte erneut einlesen.'}; }
}
