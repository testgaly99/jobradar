import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leseListe, leseRangZeilen } from '../lib/listen-import.ts';
import { baueAusgabe } from '../lib/listen-speichern.ts';
import { erkenneListe, PROMPT_LISTE } from '../lib/groq-kern.ts';
import { readFileSync } from 'node:fs';

test('fünf Rangformate bleiben exakt erhalten', () => {
  assert.deepEqual(leseRangZeilen('1. Beispiel A\n2) Beispiel B\n3 Beispiel C\nPlatz 4: Beispiel D\n#5 Beispiel E').map(z=>z.rang), [1,2,3,4,5]);
});
test('80 Prozent, Teilegrenze und doppelte Firmen', async () => {
  assert.equal(leseRangZeilen('1. A\n2. B\nÜberschrift').length, 0);
  let calls=0;
  const groq=async()=>{ calls++; return [{rang:4,firma:'Beispiel AG'},{rang:2,firma:'Beispiel AG'}]; };
  assert.equal((await leseListe('Fließtext',groq)).eintraege[0].rang,2);
  assert.equal((await leseListe('x'.repeat(12001),groq)).eintraege.length,0);
  assert.equal(calls,1);
});
const eingabe={name:'Beispiel Liste',herausgeber:'Beispiel',jahr:2026,quelle_url:'https://example.org/list',lizenz:'Eigene Freigabe',sichtbarkeit:'admin',kategorie:'Innovation'};
test('Zuordnung ist eindeutig; Jahr und Kategorie werden validiert',()=>{
  const a=baueAusgabe(eingabe,[{rang:1,firma:'Beispiel AG'},{rang:201,firma:'Andere AG'}],['Beispiel AG'],'2026-11-20');
  assert.equal(a.firmen.length,1); assert.deepEqual(a.neueFirmen,[]);
  assert.equal(a.ausgabe.gueltig_bis,'2027-11-20');
  assert.throws(()=>baueAusgabe({...eingabe,jahr:NaN},[],[],'2026-11-20'));
  assert.throws(()=>baueAusgabe({...eingabe,kategorie:'Erfunden'},[],[],'2026-11-20'));
  assert.throws(()=>baueAusgabe(eingabe,[{rang:1,firma:'Beispiel'}],['Beispiel AG','Beispiel GmbH'],'2026-11-20'),/mehrdeutig/);
});
test('manipulierte Vorschau wird vor Schreibaufruf validiert',()=>{
  for(const rang of [-1,0,1.5,Infinity]) assert.throws(()=>baueAusgabe(eingabe,[{rang,firma:'A'}],[],'2026-11-20'));
  assert.throws(()=>baueAusgabe({...eingabe,quelle_url:'javascript:alert(1)'},[{rang:1,firma:'A'}],[],'2026-11-20'));
  assert.equal(baueAusgabe(eingabe,[{rang:1,firma:'A'},{rang:1,firma:'B'}],[],'2026-11-20').firmen.length,2);
});
test('Groq-Anleitung identisch; erfundene Firmennamen werden verworfen',async()=>{
  assert.equal(PROMPT_LISTE.trim(),readFileSync(new URL('../../scraper/ki_prompt_liste.md',import.meta.url),'utf8').trim());
  const holen=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({eintraege:[{rang:1,firma:'Erfunden'}]})}}]}));
  assert.equal(await erkenneListe('1. Beispiel AG',holen,'synthetisch'),null);
});
test('ähnliche Rechtsformen werden nicht still zu einer Firma zusammengezogen',async()=>{
  const a=await leseListe('1. Beispiel AG\n2. Beispiel GmbH');
  assert.equal(a.eintraege.length,0); assert.ok(a.hinweis);
});
test('KI darf keine unbelegten Ränge oder rechtlich andere Firma zuordnen',async()=>{
  const holen=async()=>new Response(JSON.stringify({choices:[{message:{content:'{"eintraege":[{"rang":99,"firma":"Beispiel AG"}]}'}}]}));
  assert.equal(await erkenneListe('1. Beispiel AG',holen,'synthetisch'),null);
  assert.equal(await erkenneListe('Beispiel AG ohne Rang',holen,'synthetisch'),null);
  assert.throws(()=>baueAusgabe(eingabe,[{rang:1,firma:'Beispiel GmbH'}],['Beispiel AG'],'2026-11-20'),/exakten/);
});
