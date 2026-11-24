import { createHash } from 'node:crypto';
import { normFirma, slugAusFirma } from './link-import.ts';
import { rankingQuellUrl } from './rankings.ts';
import type { Eintrag } from './listen-import.ts';
import { KATEGORIEN } from './listen-kategorien.ts';
export type Eingabe={name:string;herausgeber:string;jahr:number;quelle_url:string;lizenz:string;sichtbarkeit:string;kategorie:string};
function text(w:unknown,max:number):string {
  if(typeof w!=='string'||!w.trim()||w.length>max||/[\u0000-\u001f\u007f]/.test(w)) throw new Error('Bitte alle Angaben vollständig und gültig ausfüllen.');
  return w.trim();
}
export function baueAusgabe(e:Eingabe,eintraege:Eintrag[],vorhandeneFirmen:string[],heute:string) {
  const name=text(e.name,200), herausgeber=text(e.herausgeber,200),lizenz=text(e.lizenz,1000);
  if(!Number.isInteger(e.jahr)||e.jahr<1900||e.jahr>Number(heute.slice(0,4))+1) throw new Error('Ungültiges Ausgabejahr.');
  if(!KATEGORIEN.includes(e.kategorie)||!['admin','angemeldet'].includes(e.sichtbarkeit)) throw new Error('Kategorie oder Sichtbarkeit ungültig.');
  const url=rankingQuellUrl(e.quelle_url); if(!url) throw new Error('Bitte einen gültigen HTTPS-Quell-Link eingeben.');
  if(!Array.isArray(eintraege)||eintraege.length>200) throw new Error('Höchstens 200 Einträge je Teil.');
  const datum=new Date(heute+'T00:00:00Z'); if(!Number.isFinite(+datum)||datum.toISOString().slice(0,10)!==heute) throw new Error('Ungültiges Datum.');
  const ende=new Date(Date.UTC(datum.getUTCFullYear()+1,datum.getUTCMonth()+1,0));
  ende.setUTCDate(Math.min(datum.getUTCDate(),ende.getUTCDate()));
  const id='hand-'+(slugAusFirma(name).slice(0,40)||'liste')+'-'+createHash('sha256').update(name.toLowerCase()+'\n'+herausgeber.toLowerCase()).digest('hex').slice(0,10);
  const neueFirmen:string[]=[]; const gesehen=new Map<string,number|null>();
  for(const z of eintraege) {
    if(!z||typeof z!=='object') throw new Error('Ungültige Vorschau.');
    const firma=text(z.firma,200);
    if(z.rang!==null&&(!Number.isSafeInteger(z.rang)||z.rang<1)) throw new Error('Ungültiger Rang.');
    if(z.rang!==null&&z.rang>200) continue;
    const matches=vorhandeneFirmen.filter(n=>normFirma(n)===normFirma(firma));
    if(!vorhandeneFirmen.includes(firma)&&matches.length>1) throw new Error('Firmenzuordnung mehrdeutig: '+firma+'. Bitte den exakten Namen verwenden.');
    const genau=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
    if(!vorhandeneFirmen.includes(firma)&&matches.length===1&&genau(firma)!==genau(matches[0])) throw new Error('Unsichere Firmenzuordnung. Bitte den exakten Namen aus dem Firmenbestand verwenden: '+matches[0]);
    const zuordnung=vorhandeneFirmen.includes(firma)?firma:matches[0]??firma;
    if(!vorhandeneFirmen.includes(zuordnung)&&!neueFirmen.includes(zuordnung)) neueFirmen.push(zuordnung);
    if(gesehen.has(zuordnung)&&gesehen.get(zuordnung)!==z.rang) throw new Error('Widersprüchliche Ränge für dieselbe Firma.');
    gesehen.set(zuordnung,z.rang);
  }
  if(!gesehen.size) throw new Error('Keine Einträge bis Platz 200 vorhanden.');
  return {liste:{id,name,herausgeber,kategorie:e.kategorie,aktiv:true},
    ausgabe:{id:id+'-'+e.jahr,liste_id:id,jahr:e.jahr,veroeffentlicht_am:heute,geprueft_am:heute,quelle_url:url,lizenz,gueltig_bis:ende.toISOString().slice(0,10),freigegeben:true,sichtbarkeit:e.sichtbarkeit},
    firmen:[...gesehen].map(([unternehmen,rang])=>({unternehmen,rang})),neueFirmen};
}
