import { notFound } from 'next/navigation';
import { aktuellerNutzer } from '@/lib/nutzer';
import { createClient } from '@/lib/supabase/server';
import { rankingQuellUrl } from '@/lib/rankings';
import Formular from './formular';

export default async function Seite() {
  const n=await aktuellerNutzer(); if(!n?.admin) notFound();
  const sb=await createClient();
  const {data}=await sb.from('stoebern_links').select('id,titel,url,geprueft_am').eq('art','einfuegen').order('reihenfolge');
  return <div className="stapel"><h1>Ranglisten</h1><h2>Liste von Hand einfügen</h2>
    {(data??[]).map(z=>{const url=rankingQuellUrl(z.url); return url?<p key={z.id}><a href={url} target="_blank" rel="noopener noreferrer">{z.titel}</a> <small>Stand: {z.geprueft_am}</small></p>:null;})}
    <p>Nur Listen mit geklärter Nutzungserlaubnis einfügen. Text aus einer PDF-Datei kopieren und hier einfügen. Erst nach Prüfung der Vorschau speichern. Pro Liste werden höchstens die Plätze 1–200 übernommen.</p><Formular/></div>;
}
