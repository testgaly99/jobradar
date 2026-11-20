import { analysiereLink, htmlZuText } from './link-import.ts';
import { alleStellen, type Stelle } from './ats-abruf.ts';
import { holeFirmenseite } from './seiten-abruf.ts';

export const UNTERSTUETZT=['greenhouse','ashby','personio','recruitee'] as const;
export const ZUSATZFIRMA_HINWEIS='Der Admin sieht den Firmennamen und kann die Firma für alle freigeben.';
export const NICHT_LESBAR='Diese Seite kann jobradar nicht lesen.';
type Typ=typeof UNTERSTUETZT[number];
type Portal={typ:Typ;id:string};
type Fehler={fehler:string};
type Dep={holeSeite?:(url:string)=>Promise<string>;holeStellen?:(typ:Typ,id:string)=>Promise<Stelle[]>};
const label=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const board=/^[a-z0-9][a-z0-9_-]{0,99}$/i;
function urlVon(link:string):URL|null {
  if(typeof link!=='string'||link.length>4096||/[\s\u0000-\u001f\u007f\\]/.test(link))return null;
  try { const u=new URL(link); return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')?u:null; } catch{return null;}
}
function direkt(u:URL):Portal|null {
  const host=u.hostname.toLowerCase(), teile=u.pathname.split('/').filter(Boolean);
  const erkannt=analysiereLink(u.href).ats;
  if(erkannt?.id && UNTERSTUETZT.includes(erkannt.typ as Typ) && board.test(erkannt.id))
    return {typ:erkannt.typ as Typ,id:erkannt.id};
  if(['boards.greenhouse.io','job-boards.greenhouse.io'].includes(host)&&teile[0]&&board.test(teile[0]))return {typ:'greenhouse',id:teile[0]};
  if(host==='jobs.ashbyhq.com'&&teile[0]&&board.test(teile[0]))return {typ:'ashby',id:teile[0]};
  const personio=host.match(/^([a-z0-9-]+)\.jobs\.personio\.de$/);
  if(personio&&label.test(personio[1]))return {typ:'personio',id:personio[1]};
  const recruitee=host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
  if(recruitee&&label.test(recruitee[1]))return {typ:'recruitee',id:recruitee[1]};
  return null;
}
const fremdesPortal=(u:URL)=>/(^|\.)(?:myworkdayjobs\.com|myworkdaysite\.com|successfactors\.(?:com|eu)|smartrecruiters\.com|lever\.co|softgarden\.io|join\.com)$/.test(u.hostname)||u.hostname==='jobs.sap.com';
export async function erkennePortal(link:string,dep:Dep={}):Promise<Portal|Fehler>{
  const u=urlVon(link); if(!u)return {fehler:NICHT_LESBAR};
  const d=direkt(u);if(d)return d;
  if(fremdesPortal(u))return {fehler:NICHT_LESBAR};
  try {
    const html=(await (dep.holeSeite??holeFirmenseite)(u.href)).replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
    const gefunden=new Map<string,Portal>();let fremd=false;
    for(const m of html.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
      const href=[...m[1].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)].find(a=>a[1].toLowerCase()==='href');
      if(!href)continue;
      let ziel:URL;try{ziel=new URL(htmlZuText(href[2]??href[3]??href[4]??''),u);}catch{continue;}
      const sicher=urlVon(ziel.href);if(!sicher)continue;
      const p=direkt(sicher);if(p)gefunden.set(p.typ+':'+p.id,p);
      if(fremdesPortal(sicher))fremd=true;
    }
    return !fremd&&gefunden.size===1?[...gefunden.values()][0]:{fehler:NICHT_LESBAR};
  }catch{return {fehler:NICHT_LESBAR};}
}
export async function pruefeZusatzfirma(name:string,link:string,dep:Dep={}):Promise<(Portal&{name:string;link:string})|Fehler>{
  if(typeof name!=='string'||name.trim().length<2||name.trim().length>80||/[\u0000-\u001f\u007f]/.test(name))return {fehler:'Der Firmenname muss 2 bis 80 Zeichen lang sein.'};
  const p=await erkennePortal(link,dep);if('fehler'in p)return p;
  try{
    const stellen=await (dep.holeStellen??alleStellen)(p.typ,p.id);
    if(!stellen.some(s=>typeof s?.titel==='string'&&s.titel.trim()&&s.extId))return {fehler:'Bei dieser Firma hat jobradar gerade keine Stellen gefunden.'};
    return {...p,name:name.trim(),link:new URL(link).href};
  }catch{return {fehler:NICHT_LESBAR};}
}
export async function fuegeZusatzfirmaHinzu(owner:string,name:string,link:string,dep:Dep&{speichern:(daten:{p_owner:string;p_name:string;p_link:string;p_typ:Typ;p_id:string})=>Promise<{status:string}>}):Promise<{fehler:string|null}> {
  const p=await pruefeZusatzfirma(name,link,dep);if('fehler'in p)return p;
  try{
    const r=await dep.speichern({p_owner:owner,p_name:p.name,p_link:p.link,p_typ:p.typ,p_id:p.typ==='recruitee'?p.id+'.recruitee.com':p.id});
    if(r.status==='limit')return {fehler:'Du kannst höchstens 50 eigene Firmen anlegen.'};
    if(r.status==='vorhanden')return {fehler:'Diese Firma gibt es schon in jobradar.'};
    return {fehler:['angelegt','verbunden'].includes(r.status)?null:'Speichern fehlgeschlagen. Bitte später erneut versuchen.'};
  }catch{return {fehler:'Eigene Firmen sind noch nicht eingerichtet oder konnten nicht gespeichert werden.'};}
}
