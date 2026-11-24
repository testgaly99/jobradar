import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erkennePortal, pruefeZusatzfirma, fuegeZusatzfirmaHinzu } from '../lib/zusatzfirma.ts';
import { analysiereLink } from '../lib/link-import.ts';

test('direkte erlaubte Boards brauchen keinen HTML-Abruf',async()=>{
  for(const [link,typ,id] of [['https://boards.greenhouse.io/beispiel','greenhouse','beispiel'],['https://jobs.ashbyhq.com/beispiel','ashby','beispiel'],['https://beispiel.jobs.personio.de','personio','beispiel'],['https://beispiel.recruitee.com/o/engineer','recruitee','beispiel']]) {
    assert.deepEqual(await erkennePortal(link,{holeSeite:async()=>{throw Error('HTML verboten');}}),{typ,id});
  }
  assert.equal(analysiereLink('https://beispiel.recruitee.com/o/engineer').ats?.typ,'recruitee');
});
test('ein HTML-Portal erlaubt, zwei und Workday abgewiesen',async()=>{
  const dep={holeSeite:async()=>'<a href="https://beispiel.jobs.personio.de/job/12">Jobs</a>'};
  assert.deepEqual(await erkennePortal('https://example.org/careers',dep),{typ:'personio',id:'beispiel'});
  const zwei={holeSeite:async()=>'<a href="https://boards.greenhouse.io/a">A</a><a href="https://b.jobs.personio.de">B</a>'};
  assert.ok('fehler' in await erkennePortal('https://example.org/careers',zwei));
  assert.ok('fehler' in await erkennePortal('https://firma.myworkdayjobs.com/jobs',dep));
});
test('nur tatsächliche href-Attribute, keine Skripte oder Datenattribute',async()=>{
  const dep={holeSeite:async()=>'<script>const x="<a href=\"https://boards.greenhouse.io/a\">";</script><!-- <a href="https://boards.greenhouse.io/a"> --><a data-href="https://boards.greenhouse.io/a" title="href=andere">Text</a>'};
  assert.ok('fehler' in await erkennePortal('https://example.org',dep));
});
test('Probe, Namensprüfung und Portal-Hostgrenzen',async()=>{
  assert.ok('fehler' in await pruefeZusatzfirma('A','https://boards.greenhouse.io/a'));
  const p=await pruefeZusatzfirma('Beispiel','https://boards.greenhouse.io/a',{holeStellen:async()=>[]});
  assert.deepEqual(p,{fehler:'Bei dieser Firma hat jobradar gerade keine Stellen gefunden.'});
  for(const u of ['http://boards.greenhouse.io/a','https://boards.greenhouse.io.evil.example/a','https://a.recruitee.com:123/jobs','https://user@a.recruitee.com/jobs']) {
    const result=await erkennePortal(u,{holeSeite:async()=>''}); assert.ok('fehler' in result);
  }
});
test('Atomarer RPC entscheidet 51.Firma und bestehende öffentliche Firma',async()=>{
  const args:unknown[]=[];
  const dep={holeStellen:async()=>[{extId:'1',titel:'Engineer',ort:'Berlin',url:'https://example.org',text:''}],
    speichern:async(p:unknown)=>{args.push(p); return {status:'limit'};}};
  assert.equal((await fuegeZusatzfirmaHinzu('owner','Beispiel','https://boards.greenhouse.io/a',dep)).fehler,'Du kannst höchstens 50 eigene Firmen anlegen.');
  assert.equal(args.length,1);
  const pub=await fuegeZusatzfirmaHinzu('owner','Beispiel','https://boards.greenhouse.io/a',{...dep,speichern:async()=>({status:'vorhanden'})});
  assert.equal(pub.fehler,'Diese Firma gibt es schon in jobradar.');
  const ok=await fuegeZusatzfirmaHinzu('admin','Beispiel','https://boards.greenhouse.io/a',{...dep,speichern:async()=>({status:'verbunden'})});
  assert.equal(ok.fehler,null);
});
