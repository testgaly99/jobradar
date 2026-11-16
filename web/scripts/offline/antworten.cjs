// Ausschließlich synthetische Antworten; keine Anfrage verlässt den Testprozess.
require('./netz-sperre.cjs');
const fs = require('node:fs');
const path = require('node:path');
const log = path.join(process.cwd(), 'anfragen.jsonl');
const bewerbungen = new Map();
const heute = new Date().toISOString().slice(0, 10);
const jobs = [
  ['Testfirma A:1', 'Testfirma A', 'Datenanalyse'],
  ['Testfirma A:2', 'Testfirma A', 'Entwicklung'],
  ['Testfirma B:1', 'Testfirma B', 'Beratung'],
].map(([id, unternehmen, titel]) => ({
  id, unternehmen, titel, ort: 'Berlin', staedte: ['Berlin'], remote: false,
  arbeitsmodell: 'Hybrid', vertragsart: 'Vollzeit', abteilung: 'Technik', erfahrungslevel: 'Senior',
  url: 'https://karriere.example.invalid/test', erstmals_gesehen: heute, land: 'Deutschland',
  groesse_klasse: '250–999', kategorie: ['Technik'],
  companies: { groesse_klasse: '250–999', kategorie: ['Technik'], aktiv: true },
  steckbrief: { erfahrung_jahre: 0, sprachen: [], gehalt: { min: 70000, max: 85000, waehrung: 'EUR', zeitraum: 'Jahr' }, sicherheitsueberpruefung: false },
}));
const antwort = (daten, status = 200, headers = {}) => new Response(JSON.stringify(daten), {
  status, headers: { 'Content-Type': 'application/json', ...headers },
});
// Bewusst mehr als zwei Seiten; unbekannte Größe bleibt am Ende.
const groessenJobs = [[57, '<50', 0], [52, '50–249', 1], [1, '250–999', 2], [1, '1.000+', 3], [1, null, 99]]
  .flatMap(([anzahl, klasse, rang]) => Array.from({ length: anzahl }, (_, i) => ({
    ...jobs[0], id: `groesse:${rang}:${i}`, titel: `Größentest ${rang}:${i}`,
    groesse_klasse: klasse, companies: { ...jobs[0].companies, groesse_klasse: klasse, groesse_rang: rang },
  })));
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : {}));
  // Nexts internen Redirect-Vorabruf rein synthetisch beantworten: Client lädt das Ziel regulär neu.
  // Keine echte Loopback-Verbindung und keine gelockerte Socket-/Domainsperre.
  if (['http://localhost:3002', 'http://127.0.0.1:3002'].includes(url.origin)
      && (url.pathname === '/stellen' || url.pathname.startsWith('/stellen/'))
      && init.method === 'GET' && init.next?.internal === 1 && headers.get('rsc') === '1') {
    return new Response(null, { status: 204 });
  }
  if (url.hostname !== 'offline.example.invalid') throw new Error('Externer Testzugriff gesperrt');
  const token = headers.get('authorization')?.replace(/^Bearer /, '');
  let mode = 'gast';
  try { mode = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).mode ?? 'normal'; } catch {}
  const body = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : {};
  const methode = init.method ?? 'GET';
  fs.appendFileSync(log, JSON.stringify({ pfad: url.pathname, mode, methode, listen: body.p_listen }) + '\n');
  const aktionsprobe = /^(merken-fehler|merken-leer|beworben-konflikt)-/.test(mode);
  if (aktionsprobe && !bewerbungen.has(mode)) bewerbungen.set(mode, {
    id: '00000000-0000-4000-8000-000000000015', job_id: 'Testfirma A:1', status: 'gemerkt', beworben_am: null,
  });
  if (aktionsprobe && methode === 'HEAD' && ['/rest/v1/contacts', '/rest/v1/interviews', '/rest/v1/application_events'].includes(url.pathname)) {
    return mode.startsWith('merken-fehler-') && url.pathname.endsWith('/contacts')
      ? antwort({ code: 'XX000' }, 500) : antwort([], 200, { 'content-range': '*/0' });
  }
  if (aktionsprobe && url.pathname === '/rest/v1/applications') {
    const a = bewerbungen.get(mode);
    if (methode === 'DELETE') {
      if (a?.status === 'gemerkt' && url.searchParams.get('status') === 'eq.gemerkt') bewerbungen.set(mode, null);
      return antwort(null);
    }
    if (methode === 'PATCH') {
      if (mode.startsWith('beworben-konflikt-')) a.status = 'im_gespraech';
      const passt = a && url.searchParams.get('status') === `eq.${a.status}`
        && (url.searchParams.get('beworben_am') === 'is.null' ? a.beworben_am === null
          : url.searchParams.get('beworben_am') === `eq.${a.beworben_am}`);
      if (passt) Object.assign(a, body);
      fs.appendFileSync(log, JSON.stringify({ mode, ereignis: 'statusupdate', status: a?.status, passend: !!passt }) + '\n');
      return antwort(passt ? [{ id: a.id }] : []);
    }
    return antwort(a ? [a] : []);
  }
  if (url.pathname === '/auth/v1/user') return antwort({ id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'ranking@example.com', app_metadata: {}, user_metadata: {}, created_at: heute });
  if (url.pathname === '/rest/v1/rpc/facetten') return antwort({ groesse: { '250–999': 3 }, kategorie: { Technik: 3 }, land: { Deutschland: 3 } });
  if (url.pathname === '/rest/v1/rpc/ranking_katalog') {
    if (mode === 'missing') return antwort({ code: 'PGRST202', message: 'synthetisch fehlende Migration' }, 404);
    if (mode === 'error') return antwort({ code: 'XX000', message: 'interne Testdetails' }, 500);
    return antwort(mode === 'empty' ? [] : [
      { id: 'test-a', name: 'Test-Rangliste A', anzahl: 2 }, { id: 'test-b', name: 'Test-Rangliste B', anzahl: 3 },
    ]);
  }
  if (url.pathname === '/rest/v1/rpc/ranking_zuordnungen') return antwort((body.p_firmen ?? []).flatMap(unternehmen => [
    { unternehmen, liste_id: 'test-b', name: 'Test-Rangliste B', jahr: 2026, rang: unternehmen === 'Testfirma A' ? 2 : null, quelle_url: 'https://quelle.example.invalid/b', lizenz: 'Nur künstliche Testdaten' },
    ...(unternehmen === 'Testfirma A' ? [{ unternehmen, liste_id: 'test-a', name: 'Test-Rangliste A', jahr: 2026, rang: 12, quelle_url: 'https://quelle.example.invalid/a', lizenz: 'Nur künstliche Testdaten' }] : []),
  ]));
  if (url.pathname === '/rest/v1/rpc/ranking_stellen' || url.pathname === '/rest/v1/jobs') {
    let daten = jobs;
    if (url.searchParams.get('order')?.startsWith('companies')) daten = groessenJobs;
    if (body.p_listen?.length === 1 && body.p_listen[0] === 'test-a') daten = daten.filter(j => j.unternehmen === 'Testfirma A');
    if (url.searchParams.get('id')?.startsWith('eq.')) daten = daten.filter(j => j.id === url.searchParams.get('id').slice(3));
    if (url.searchParams.get('order')?.startsWith('rang.')) daten = [...daten].sort((a, b) => a.id.localeCompare(b.id));
    const total = daten.length;
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? total);
    return antwort(daten.slice(offset, offset + limit), 200, { 'content-range': `${offset}-${Math.max(offset, total - 1)}/${total}` });
  }
  if (url.pathname === '/rest/v1/laeufe') return antwort([{ datum: heute, bericht: {} }]);
  if (['/rest/v1/companies', '/rest/v1/applications', '/rest/v1/listen_felder', '/rest/v1/wichtige_punkte'].includes(url.pathname)) return antwort([]);
  throw new Error('Nicht vorbereitete Testanfrage: ' + url.pathname);
};
const denied = () => { throw new Error('HTTP-Zugriff außerhalb der Testdaten gesperrt'); };
require('node:http').request = denied;
require('node:https').request = denied;
require('node:http').get = denied;
require('node:https').get = denied;
