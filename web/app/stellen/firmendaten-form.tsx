'use client';
import { useActionState } from 'react';
import { firmendatenPruefen } from './actions';
export default function FirmendatenForm({firma}:{firma:string}){
 const [state,action,pending]=useActionState(firmendatenPruefen,{meldung:'',link:null});
 return <details><summary>Firmendaten prüfen lassen</summary><form action={action} className="formular">
  <input type="hidden" name="firma" value={firma}/>
  <label>Was stimmt nicht? (optional, öffentlich)<input name="hinweis" maxLength={300}/></label>
  <p className="gedaempft klein">Die Anfrage erscheint öffentlich auf GitHub. Keine persönlichen Daten, Listen oder Ränge eintragen.</p>
  <button className="knopf knopf-rand" disabled={pending}>Firmendaten prüfen lassen</button>
  {state.meldung&&<p role="status">{state.meldung} {state.link&&<a href={state.link} target="_blank" rel="noopener noreferrer">Issue ansehen</a>}</p>}
 </form></details>;
}
