import { htmlZuText, normFirma } from './link-import.ts';
import { erkenneListe } from './groq-kern.ts';
export type Eintrag = { rang: number | null; firma: string };

export function leseRangZeilen(text: string): Eintrag[] {
  const zeilen = text.replace(/<\/(?:tr|p|li|div)>|<br\s*\/?\s*>/gi,'\n').split(/\r?\n/).map(z=>htmlZuText(z)).filter(Boolean);
  const result: Eintrag[] = [];
  for (const zeile of zeilen) {
    const m = zeile.match(/^(?:Platz\s+|#)?(\d{1,6})(?:[.):]\s*|\s+)(.+)$/i);
    if(m && Number(m[1])>0) result.push({rang:Number(m[1]),firma:m[2].trim()});
  }
  return zeilen.length && result.length/zeilen.length>=.8 ? result : [];
}
export async function leseListe(text: string, groq = erkenneListe): Promise<{eintraege:Eintrag[];hinweis:string|null}> {
  if(text.length>200000) return {eintraege:[],hinweis:'Bitte in kleineren Teilen einfügen.'};
  let eintraege=leseRangZeilen(text);
  if(!eintraege.length) {
    if(text.length>12000) return {eintraege:[],hinweis:'Bitte in Teilen einfügen (höchstens 12.000 Zeichen).'};
    const gelesen=await groq(text);
    if(!gelesen?.length) return {eintraege:[],hinweis:'Keine verlässlichen Einträge erkannt. Bitte Rang und Firma zeilenweise einfügen.'};
    eintraege=gelesen;
  }
  const unique=new Map<string,Eintrag>();
  for(const z of eintraege) {
    if(typeof z.firma!=='string'||!z.firma.trim()||z.firma.length>200|| (z.rang!==null && (!Number.isSafeInteger(z.rang)||z.rang<1)))
      return {eintraege:[],hinweis:'Ungültige Einträge erkannt. Bitte den Text prüfen.'};
    const key=normFirma(z.firma)||z.firma.toLowerCase(); const alt=unique.get(key);
    if(alt&&alt.firma.toLowerCase()!==z.firma.trim().toLowerCase()) return {eintraege:[],hinweis:'Mehrdeutige Firmennamen mit unterschiedlichen Schreibweisen oder Rechtsformen. Bitte die Quelle und exakten Firmennamen prüfen.'};
    if(!alt || (z.rang??Infinity)<(alt.rang??Infinity)) unique.set(key,{rang:z.rang,firma:z.firma.trim()});
  }
  return {eintraege:[...unique.values()].filter(z=>z.rang===null||z.rang<=200).slice(0,200),hinweis:null};
}
