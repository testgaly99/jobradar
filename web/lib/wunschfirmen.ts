export function wunschEingabe(firma:unknown,wert:unknown):{unternehmen:string;an:boolean}|null{
 if(typeof firma!=='string'||!firma.trim()||firma.length>200||/[\u0000-\u001f\u007f]/.test(firma)||(wert!=='an'&&wert!=='aus'))return null;
 return {unternehmen:firma,an:wert==='an'};
}
export function stichwortEingabe(wert:unknown):string|null{
 if(typeof wert!=='string'||/[\u0000-\u001f\u007f]/.test(wert))return null;
 const s=wert.trim();return s.length>=2&&s.length<=60?s:null;
}
export async function wunschfirmaMit(owner:string,firma:unknown,wert:unknown,dep:{sichtbar:(firma:string)=>Promise<boolean>;anlegen:(owner:string,firma:string)=>Promise<void>;entfernen:(owner:string,firma:string)=>Promise<void>}):Promise<string|null>{
 const e=wunschEingabe(firma,wert);if(!owner||!e)return 'Ungültige Wunschfirma.';
 try{
  if(e.an){if(!await dep.sichtbar(e.unternehmen))return 'Diese Firma ist nicht verfügbar.';await dep.anlegen(owner,e.unternehmen);}
  else await dep.entfernen(owner,e.unternehmen);
  return null;
 }catch{return 'Wunscharbeitgeber sind noch nicht eingerichtet oder konnten nicht gespeichert werden.';}
}
