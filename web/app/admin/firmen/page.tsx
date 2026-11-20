import { notFound } from 'next/navigation';
import { aktuellerNutzer } from '@/lib/nutzer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { meldeliste } from '@/lib/zusatzfirma-admin';
import { rankingQuellUrl } from '@/lib/rankings';
import Freigabe from './freigabe';
export default async function Seite() {
  const n=await aktuellerNutzer();if(!n?.admin)notFound();
  const sb=await createClient();const admin=await sb.rpc('ist_admin');
  if(admin.error||admin.data!==true)return <p>Admin-Einrichtung prüfen (Migration 015 und Admin-Eintrag).</p>;
  const {data,error}=await createAdminClient().rpc('zusatzfirmen_meldung');
  if(error)return <p>Eigene Firmen sind noch nicht eingerichtet (Migration 016).</p>;
  let zeilen;try{zeilen=meldeliste(data);}catch{return <p>Firmenmeldungen konnten nicht geprüft werden.</p>;}
  return <div className="stapel"><h1>Firmen</h1><p>Zusatzfirmen ohne Namen der eintragenden Nutzer.</p>
    <div className="tabelle-rahmen"><table className="tabelle"><thead><tr><th>Firma</th><th>Karriereseite</th><th>Portal</th><th>Nutzer</th><th>Sichtbarkeit</th><th>Freigabe</th></tr></thead><tbody>
      {zeilen.map(z=>{const url=rankingQuellUrl(z.careers_url);return <tr key={z.unternehmen}><td>{z.unternehmen}</td><td>{url?<a href={url} target="_blank" rel="noopener noreferrer">Karriereseite</a>:'Kein Link'}</td><td>{z.ats_typ}</td><td>von {z.nutzer} Nutzern</td><td>{z.fuer_alle?'Für alle':'Privat'}</td><td><Freigabe name={z.unternehmen} fuerAlle={z.fuer_alle}/></td></tr>;})}
    </tbody></table></div>{!zeilen.length&&<p>Noch keine Zusatzfirmen gemeldet.</p>}</div>;
}
