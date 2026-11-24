'use server';
import { aktuellerNutzer } from '@/lib/nutzer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { meldeliste, pruefeFreigabe } from '@/lib/zusatzfirma-admin';
import { revalidatePath } from 'next/cache';

async function freigeben(form:FormData,alle:boolean):Promise<string> {
  const n=await aktuellerNutzer();
  if(!n?.admin) return 'Nicht berechtigt.';
  const sb=await createClient(); const admin=await sb.rpc('ist_admin');
  if(admin.error||admin.data!==true) return 'Admin-Einrichtung prüfen.';
  if(alle&&form.get('bestaetigung')!=='ja') return 'Bitte die Freigabe für alle bestätigen.';
  const dienst=createAdminClient();
  try {
    const {data,error}=await dienst.rpc('zusatzfirmen_meldung');
    if(error) return 'Firmenmeldungen konnten nicht geladen werden.';
    const name=pruefeFreigabe(true,String(form.get('unternehmen')??''),meldeliste(data));
    const ergebnis=await dienst.rpc('zusatzfirma_freigeben',{p_admin:n.id,p_name:name,p_fuer_alle:alle});
    if(ergebnis.error) return 'Freigabe fehlgeschlagen. Bitte erneut prüfen.';
    revalidatePath('/admin/firmen'); revalidatePath('/konto'); revalidatePath('/stellen');
    return alle?'Firma ist für alle freigegeben.':'Firma ist für dich freigegeben.';
  } catch { return 'Freigabe nicht erlaubt oder Meldedaten ungültig.'; }
}
export async function fuerMichFreigeben(form:FormData):Promise<string> { return freigeben(form,false); }
export async function fuerAlleFreigeben(form:FormData):Promise<string> { return freigeben(form,true); }
