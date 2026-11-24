'use client';
import { useActionState, useState } from 'react';
import { listeAktion } from './actions';
import { KATEGORIEN } from '@/lib/listen-kategorien';

export default function Formular() {
  const [state,aktion,pending]=useActionState(listeAktion,{meldung:'',eintraege:[],neu:[],zuordnung:[]});
  const [geaendert,setGeaendert]=useState(false);
  const [werte,setWerte]=useState<Record<string,string>>({jahr:String(new Date().getFullYear()),kategorie:KATEGORIEN[0],sichtbarkeit:'admin'});
  const feld=(name:string)=>({value:werte[name]??'',onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>setWerte(w=>({...w,[name]:e.target.value}))});
  return <form action={aktion} className="stapel" onChange={()=>setGeaendert(true)}>
    <label>Listenname<input name="name" required maxLength={200} {...feld('name')}/></label>
    <label>Herausgeber<input name="herausgeber" required maxLength={200} {...feld('herausgeber')}/></label>
    <label>Jahr<input name="jahr" type="number" required min={1900} {...feld('jahr')}/></label>
    <label>Quell-Link<input name="quelle_url" type="url" required maxLength={2000} {...feld('quelle_url')}/></label>
    <label>Lizenz / Nutzungserlaubnis<input name="lizenz" required maxLength={1000} {...feld('lizenz')}/></label>
    <label>Kategorie<select name="kategorie" {...feld('kategorie')}>{KATEGORIEN.map(k=><option key={k}>{k}</option>)}</select></label>
    <label>Sichtbarkeit<select name="sichtbarkeit" {...feld('sichtbarkeit')}><option value="admin">Nur Admin</option><option value="angemeldet">Alle Angemeldeten</option></select></label>
    <label>Listentext<textarea name="text" rows={12} maxLength={200000} {...feld('text')}/></label>
    <button className="knopf" name="absicht" value="vorschau" disabled={pending} onClick={()=>setGeaendert(false)}>Vorschau</button>
    {state.meldung&&<p role="status">{state.meldung}</p>}
    {!!state.zuordnung.length&&<>
      <table className="tabelle"><thead><tr><th>Rang</th><th>Firma</th><th>Zuordnung</th></tr></thead><tbody>{state.zuordnung.map(z=><tr key={z.unternehmen}><td>{z.rang??'ohne Rang'}</td><td>{z.unternehmen}</td><td>{state.neu.includes(z.unternehmen)?'neu':'vorhanden'}</td></tr>)}</tbody></table>
      <input type="hidden" name="vorschau" value={JSON.stringify(state.eintraege)}/>
      {geaendert&&<p>Angaben geändert. Bitte erneut Vorschau wählen.</p>}
      <button className="knopf" name="absicht" value="speichern" disabled={pending||geaendert}>Speichern</button>
    </>}
  </form>;
}
