import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meldeliste, pruefeFreigabe } from '../lib/zusatzfirma-admin.ts';

test('Meldeliste gibt keine Kontodaten weiter',()=>{
  const rows=meldeliste([{unternehmen:'Beispiel AG',careers_url:'https://example.org',ats_typ:'ashby',nutzer:2,fuer_alle:false,owner_id:'geheim',email:'synthetisch'}]);
  assert.deepEqual(Object.keys(rows[0]).sort(),['ats_typ','careers_url','fuer_alle','nutzer','unternehmen']);
  assert.equal(rows[0].nutzer,2);
});
test('Freigabe nur durch Admin und nur für gemeldete Firma',()=>{
  const rows=meldeliste([{unternehmen:'Beispiel AG',careers_url:'https://example.org',ats_typ:'ashby',nutzer:2,fuer_alle:false}]);
  assert.throws(()=>pruefeFreigabe(false,'Beispiel AG',rows));
  assert.throws(()=>pruefeFreigabe(true,'Unbekannt',rows));
  assert.equal(pruefeFreigabe(true,'Beispiel AG',rows),'Beispiel AG');
});
test('kaputte Meldedaten werden nicht als leere oder öffentliche Firma behandelt',()=>{
  assert.throws(()=>meldeliste([{unternehmen:'A',nutzer:-1,fuer_alle:false}]));
  assert.throws(()=>meldeliste([{unternehmen:'A',nutzer:1,fuer_alle:'false'}]));
});
