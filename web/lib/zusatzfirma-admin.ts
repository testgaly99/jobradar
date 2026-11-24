export type Meldung={unternehmen:string;careers_url:string;ats_typ:string;nutzer:number;fuer_alle:boolean};
export function meldeliste(daten:unknown):Meldung[] {
  if(!Array.isArray(daten)) throw new Error('Firmenmeldungen konnten nicht geprüft werden.');
  return daten.map(z=>{
    if(!z||typeof z.unternehmen!=='string'||!z.unternehmen.trim()||typeof z.fuer_alle!=='boolean'||!Number.isSafeInteger(Number(z.nutzer))||Number(z.nutzer)<0)
      throw new Error('Firmenmeldungen konnten nicht geprüft werden.');
    return {unternehmen:z.unternehmen,careers_url:typeof z.careers_url==='string'?z.careers_url:'',ats_typ:typeof z.ats_typ==='string'?z.ats_typ:'',nutzer:Number(z.nutzer),fuer_alle:z.fuer_alle};
  });
}
export function pruefeFreigabe(admin:boolean,name:string,liste:Meldung[]):string {
  if(!admin||!liste.some(z=>z.unternehmen===name)) throw new Error('Freigabe nicht erlaubt.');
  return name;
}
