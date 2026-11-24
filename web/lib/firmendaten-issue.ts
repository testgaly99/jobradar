export type Firmenwerte={name:string;herkunft:string;groesse_klasse?:string|null;kategorie?:string[]|null;hauptsitz?:string|null;careers_url?:string|null};
type Dep={admin?:boolean;ladeFirma?:(name:string)=>Promise<Firmenwerte|null>;verboteneBegriffe?:string[];holen?:typeof fetch;token?:string;repo?:string};
const NICHT_EINGERICHTET='Firmendaten-Prüfung ist noch nicht eingerichtet.';
function issueLink(wert:unknown,repo:string):string|null {
  if(typeof wert!=='string')return null;
  try{const u=new URL(wert);return u.origin==='https://github.com'&&!u.username&&!u.password&&new RegExp('^/'+repo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/issues/[1-9][0-9]*$').test(u.pathname)?u.href:null;}catch{return null;}
}
export async function firmendatenIssue(firma:string,hinweis:string,dep:Dep={}):Promise<{link:string}|{fehler:string}>{
  if(!dep.admin)return {fehler:'Nicht berechtigt.'};
  const token=dep.token??process.env.GITHUB_ISSUE_TOKEN,repo=dep.repo??process.env.GITHUB_REPOSITORY;
  if(!token||!repo||!/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/.test(repo))return {fehler:NICHT_EINGERICHTET};
  if(typeof firma!=='string'||!firma.trim()||firma.length>200||/[\u0000-\u001f\u007f]/.test(firma)||typeof hinweis!=='string'||hinweis.length>300||/[\u0000-\u001f\u007f]/.test(hinweis))return {fehler:'Ungültige Firmenangaben.'};
  if((dep.verboteneBegriffe??[]).some(w=>w.trim()&&hinweis.toLowerCase().includes(w.trim().toLowerCase())))return {fehler:'Bitte keine Listen- oder Rangangaben in den öffentlichen Hinweis aufnehmen.'};
  try{
    const daten=await dep.ladeFirma?.(firma);
    if(!daten||daten.name!==firma||daten.herkunft!=='datei')return {fehler:'Diese Firma kann nicht öffentlich geprüft werden.'};
    const holen=dep.holen??fetch;
    const titel='Firmendaten prüfen: '+firma, basis='https://api.github.com/repos/'+repo;
    const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
    for(let seite=1;seite<=50;seite++){
      const r=await holen(basis+'/issues?state=open&labels=firmendaten-pruefen&per_page=100&page='+seite,{headers,signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw Error('GitHub nicht verfügbar');
      const issues=await r.json();if(!Array.isArray(issues))throw Error('Ungültige Antwort');
      const offen=issues.find(z=>!z.pull_request&&z.title===titel);
      if(offen){const link=issueLink(offen.html_url,repo);return link?{link}:{fehler:'Issue-Link konnte nicht geprüft werden.'};}
      if(issues.length<100){
        const wert=(s:unknown)=>typeof s==='string'?s.replace(/[\r\n]/g,' ').slice(0,1000):'nicht bekannt';
        const body=['Firmenname: '+firma,'Größe: '+wert(daten.groesse_klasse),'Branche: '+wert(daten.kategorie?.join(', ')),
          'Hauptsitz: '+wert(daten.hauptsitz),'Karriere-Link: '+wert(daten.careers_url),'Hinweis: '+(hinweis.trim()||'Bitte aktuelle Firmendaten anhand belastbarer Quellen prüfen.')].join('\n');
        const r=await holen(basis+'/issues',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({title:titel,body,labels:['firmendaten-pruefen']}),signal:AbortSignal.timeout(10000)});
        if(!r.ok)throw Error('GitHub nicht verfügbar');
        const link=issueLink((await r.json()).html_url,repo);return link?{link}:{fehler:'Issue-Link konnte nicht geprüft werden.'};
      }
    }
    return {fehler:'Zu viele offene Issues. Bitte mit Claude prüfen.'};
  }catch{return {fehler:'Firmendaten-Prüfung konnte nicht gestartet werden. Bitte später erneut versuchen.'};}
}
