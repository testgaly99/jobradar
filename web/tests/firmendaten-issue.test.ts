import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firmendatenIssue } from '../lib/firmendaten-issue.ts';
const firma={name:'Beispiel AG',herkunft:'datei',groesse_klasse:'1.000+',kategorie:['Tech'],hauptsitz:'Berlin',careers_url:'https://example.org/careers'};
test('Nicht-Admin oder private Firma löst keinen Abruf aus',async()=>{
  let calls=0; const holen=async()=>{calls++;throw Error('kein Netz');};
  assert.ok('fehler' in await firmendatenIssue('Beispiel AG','',{admin:false,ladeFirma:async()=>firma,holen,token:'synthetisch',repo:'test/repo'}));
  assert.ok('fehler' in await firmendatenIssue('Beispiel AG','',{admin:true,ladeFirma:async()=>({...firma,herkunft:'nutzer'}),holen,token:'synthetisch',repo:'test/repo'}));
  assert.equal(calls,0);
});
test('offenes Issue wird wiederverwendet, Daten bleiben kanonisch',async()=>{
  const methods:string[]=[];
  const result=await firmendatenIssue('Beispiel AG','',{admin:true,ladeFirma:async()=>firma,token:'synthetisch',repo:'test/repo',holen:async(_url,init)=>{methods.push(init?.method??'GET');return new Response(JSON.stringify([{title:'Firmendaten prüfen: Beispiel AG',html_url:'https://github.com/test/repo/issues/1'}]));}});
  assert.deepEqual(result,{link:'https://github.com/test/repo/issues/1'});assert.deepEqual(methods,['GET']);
});
test('Issue enthält nur freigegebene Firmendaten, keine Listennamen',async()=>{
  let body='';
  const result=await firmendatenIssue('Beispiel AG','Bitte Größe prüfen',{admin:true,ladeFirma:async()=>({...firma,ranking_name:'Interne Liste'}),verboteneBegriffe:['Interne Liste'],token:'synthetisch',repo:'test/repo',holen:async(_url,init)=>{if(init?.method==='POST'){body=String(init.body);return new Response(JSON.stringify({html_url:'https://github.com/test/repo/issues/2'}));}return new Response('[]');}});
  assert.ok('link' in result);assert.ok(body.includes('Berlin'));assert.ok(!body.includes('Interne Liste'));
});
test('unbekannte Einrichtung und Hinweis mit verborgener Herkunft werden abgelehnt',async()=>{
  assert.deepEqual(await firmendatenIssue('A','',{admin:true,ladeFirma:async()=>firma,token:'',repo:''}),{fehler:'Firmendaten-Prüfung ist noch nicht eingerichtet.'});
  let calls=0;
  const r=await firmendatenIssue('Beispiel AG','Bitte Interne Liste prüfen',{admin:true,ladeFirma:async()=>firma,verboteneBegriffe:['Interne Liste'],token:'synthetisch',repo:'test/repo',holen:async()=>{calls++;return new Response('[]');}});
  assert.ok('fehler'in r);assert.equal(calls,0);
});
test('offenes Issue auf zweiter Seite und feindlicher Rückgabe-Link',async()=>{
  let calls=0;
  const r=await firmendatenIssue('Beispiel AG','',{admin:true,ladeFirma:async()=>firma,token:'synthetisch',repo:'test/repo',holen:async(_url,init)=>{
    assert.notEqual(init?.method,'POST');calls++;
    return new Response(JSON.stringify(calls===1?Array.from({length:100},()=>({title:'Andere Firma'})):[{title:'Firmendaten prüfen: Beispiel AG',html_url:'https://github.com/test/repo/issues/99'}]));
  }});
  assert.equal(calls,2);assert.deepEqual(r,{link:'https://github.com/test/repo/issues/99'});
  const ungueltig=await firmendatenIssue('Beispiel AG','',{admin:true,ladeFirma:async()=>firma,token:'synthetisch',repo:'test/repo',holen:async()=>new Response('[{"title":"Firmendaten prüfen: Beispiel AG","html_url":"https://fremd.example/stehlen"}]')});
  assert.ok('fehler'in ungueltig);
});
