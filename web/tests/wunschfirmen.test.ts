import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wunschEingabe, stichwortEingabe, wunschfirmaMit } from '../lib/wunschfirmen.ts';
test('nur exakte Firmen und gültige Stichwörter',()=>{
 assert.equal(wunschEingabe('Beispiel AG','an')?.unternehmen,'Beispiel AG');
 assert.equal(wunschEingabe('A\nB','an'),null);assert.equal(wunschEingabe('A','kaputt'),null);
 assert.equal(stichwortEingabe('  Daten '),'Daten');assert.equal(stichwortEingabe('x'),null);
});
test('Anlegen/Entfernen mit angemeldeter Nutzerkennung und geprüftem Firmenzugriff',async()=>{
 const calls:unknown[]=[];
 const dep={sichtbar:async()=>true,anlegen:async(o:string,f:string)=>{calls.push(['an',o,f]);},entfernen:async(o:string,f:string)=>{calls.push(['aus',o,f]);}};
 assert.equal(await wunschfirmaMit('owner','Beispiel AG','an',dep),null);
 assert.equal(await wunschfirmaMit('owner','Beispiel AG','aus',dep),null);
 assert.deepEqual(calls,[['an','owner','Beispiel AG'],['aus','owner','Beispiel AG']]);
 assert.ok(await wunschfirmaMit('owner','Geheim','an',{...dep,sichtbar:async()=>false}));
 assert.equal(calls.length,2);
});
