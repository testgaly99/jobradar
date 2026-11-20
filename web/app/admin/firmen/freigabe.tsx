'use client';
import { useState, useTransition } from 'react';
import { fuerAlleFreigeben, fuerMichFreigeben } from './actions';
export default function Freigabe({name,fuerAlle}:{name:string;fuerAlle:boolean}) {
  const [bestaetigen,setBestaetigen]=useState(false),[meldung,setMeldung]=useState('');
  const [pending,start]=useTransition();
  function senden(alle:boolean) {
    const f=new FormData();f.set('unternehmen',name);if(alle)f.set('bestaetigung','ja');
    start(async()=>{setMeldung(await (alle?fuerAlleFreigeben(f):fuerMichFreigeben(f)));setBestaetigen(false);});
  }
  return <div className="stapel"><button className="knopf knopf-rand" disabled={pending} onClick={()=>senden(false)}>Für mich freigeben</button>
    {!fuerAlle&&(bestaetigen?<><button className="knopf" disabled={pending} onClick={()=>senden(true)}>Wirklich für alle?</button><button className="knopf knopf-leise" onClick={()=>setBestaetigen(false)}>Abbrechen</button></>:<button className="knopf knopf-rand" disabled={pending} onClick={()=>setBestaetigen(true)}>Für alle freigeben</button>)}
    {meldung&&<p role="status">{meldung}</p>}</div>;
}
