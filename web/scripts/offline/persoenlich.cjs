// Zustandsbehaftete persönliche Browserfälle, ausschließlich erfundene Daten.
const UID_MODUS = new Map();
const STAENDE = new Map();
const AID = '00000000-0000-4000-8000-000000000031';
const DOK_A = '00000000-0000-4000-8000-000000000032';
const DOK_B = '00000000-0000-4000-8000-000000000033';
const DOK_NEU = '00000000-0000-4000-8000-000000000034';

function antwort(daten, status = 200, headers = {}) {
  return new Response(status === 204 ? null : JSON.stringify(daten), {
    status, headers: { 'Content-Type': 'application/json', ...headers },
  });
}
const fehler = () => antwort({ code: 'XX000', message: 'künstlicher Prüffehler' }, 500);
const gehoert = mode => /^(tracker|dokument|export|konto|import)-/.test(mode);

function bearbeiten({ url, init, headers, claims, mode, body, methode, loggen }) {
  const admin = headers.get('authorization') === 'Bearer synthetischer-offline-service-schluessel';
  if (admin) {
    const uid = url.searchParams.get('owner_id')?.replace(/^eq\./, '')
      ?? body.prefix ?? body.prefixes?.[0]?.split('/')[0]
      ?? (url.pathname.startsWith('/auth/v1/admin/users/') ? url.pathname.split('/').at(-1) : null);
    mode = UID_MODUS.get(uid);
    if (!mode) throw new Error('Nicht vorbereiteter administrativer Testzugriff');
  }
  if (!gehoert(mode)) return null;
  if (!STAENDE.has(mode)) {
    const uid = claims.sub;
    UID_MODUS.set(uid, mode);
    const heute = new Date().toISOString().slice(0, 10);
    const a = {
      id: AID, owner_id: uid, firma: 'Prüffirma Kanban', titel: 'Fiktive Datenanalyse', status: 'beworben',
      beworben_am: heute, erstellt_am: heute + 'T12:00:00Z', geaendert_am: heute + 'T12:00:00Z',
      ergebnis: null, interesse: 3, runde: null, kommentar: null, jobs: null, interviews: [], personen: [],
      naechster_schritt: null, naechster_schritt_faellig: null, standort: 'Teststadt', link: 'https://example.invalid/anzeige',
      cv_dokument_id: DOK_A,
    };
    if (mode.startsWith('import-fortgeschritten-')) Object.assign(a, { firma: 'Vorhandene Prüffirma', titel: 'Vorhandene Bewerbung',
      link: 'https://www.linkedin.com/jobs/view/123/', status: 'im_gespraech', snapshot_text: 'Bestehender künstlicher Text' });
    STAENDE.set(mode, { uid, vorlage: a, applications: mode.startsWith('import-neu-') ? [] : [a], documents: [
      { id: DOK_A, art: 'cv', name: 'CV Offline verwendet', version_datum: heute, storage_pfad: `${uid}/verwendet.pdf` },
      { id: DOK_B, art: 'anlage', name: 'Anlage Offline', version_datum: heute, storage_pfad: `${uid}/anlage.pdf` },
    ], events: [], geloescht: false });
  }
  const s = STAENDE.get(mode);
  loggen({ mode, ereignis: 'persoenlich', pfad: url.pathname, methode, query: url.search, admin });
  const p = url.pathname;
  if (p === '/auth/v1/user') return antwort({ id: s.uid, aud: 'authenticated', role: 'authenticated',
    email: mode.startsWith('konto-admin-') ? 'offline-admin@example.invalid' : 'offline@example.invalid',
    app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
  if (p === '/auth/v1/logout') return antwort(null, 204);
  if (p.startsWith('/auth/v1/admin/users/') && admin) {
    if (methode === 'GET') return antwort({ id: s.uid, email: 'offline@example.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
    if (methode === 'DELETE') { s.geloescht = true; return antwort({}); }
  }
  if (p === '/rest/v1/applications') {
    if (methode === 'POST' && mode.startsWith('import-')) {
      if (body.owner_id !== s.uid || body.status !== 'gemerkt' || body.beworben_am !== null) throw new Error('Unzulässige Importdaten in der Browserprobe');
      const a = { ...s.vorlage, ...body, id: AID };
      s.applications.push(a);
      return antwort({ id: a.id }, 201);
    }
    if (mode.startsWith('tracker-ladefehler-') && methode === 'GET') return fehler();
    if (admin && methode === 'DELETE') { s.applications = []; return antwort(null); }
    if (methode === 'PATCH') {
      if (mode.startsWith('tracker-schreibfehler-')) return fehler();
      const a = s.applications.find(a => url.searchParams.get('id') === `eq.${a.id}`);
      if (!a || (url.searchParams.has('status') && url.searchParams.get('status') !== `eq.${a.status}`)) return antwort([]);
      if (body.status && a.status !== body.status) s.events.push({ id: `00000000-0000-4000-8000-${String(s.events.length + 40).padStart(12, '0')}`,
        application_id: a.id, neuer_status: body.status, datum: new Date().toISOString() });
      Object.assign(a, body);
      loggen({ mode, ereignis: 'tracker-schreiben', patch: body });
      return antwort([{ id: a.id }]);
    }
    if (methode === 'HEAD') {
      const status = url.searchParams.get('status')?.replace(/^eq\./, '');
      return antwort([], 200, { 'content-range': `*/${s.applications.filter(a => !status || a.status === status).length}` });
    }
    let daten = s.applications;
    if (mode.startsWith('export-viele-')) daten = Array.from({ length: 1001 }, (_, i) => ({ ...s.applications[0], id: String(i).padStart(5, '0'), titel: `Exportzeile ${i + 1}` }));
    if (url.searchParams.has('id')) daten = daten.filter(a => url.searchParams.get('id') === `eq.${a.id}`);
    if (url.searchParams.has('link')) daten = daten.filter(a => url.searchParams.get('link') === `eq.${a.link}`);
    if (url.searchParams.has('owner_id')) daten = daten.filter(a => url.searchParams.get('owner_id') === `eq.${a.owner_id}`);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? daten.length);
    return antwort(daten.slice(offset, offset + limit));
  }
  if (p === '/rest/v1/documents') {
    if (methode === 'POST') {
      if (mode.startsWith('dokument-metadatenfehler-')) return fehler();
      s.documents.push({ id: DOK_NEU, ...body });
      return antwort(null, 201);
    }
    if (methode === 'DELETE') {
      if (admin) {
        if (mode.startsWith('konto-fehler-')) return fehler();
        s.documents = [];
      } else {
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        if (id === DOK_A) return antwort({ code: '23503' }, 409);
        s.documents = s.documents.filter(d => d.id !== id);
      }
      return antwort(null);
    }
    if (mode.startsWith('export-fehler-')) return fehler();
    const id = url.searchParams.get('id')?.replace(/^eq\./, '');
    return antwort(s.documents.filter(d => !id || d.id === id));
  }
  if (p === '/rest/v1/application_events') {
    if (methode === 'DELETE') { const weg = s.events; s.events = []; return antwort(weg); }
    const status = url.searchParams.get('neuer_status')?.replace(/^eq\./, '');
    return antwort(s.events.filter(e => !status || e.neuer_status === status));
  }
  if (p === '/rest/v1/contacts') return antwort(mode.startsWith('export-')
    ? [{ application_id: '00000', name: 'Fiktiver Kontakt', rolle: 'Recruiting', email: 'kontakt@example.invalid', telefon: '' }] : []);
  if (p === '/rest/v1/interviews') return antwort(mode.startsWith('export-')
    ? [{ application_id: '00000', datum: '2026-11-16T12:00:00Z', format: 'Video', teilnehmer: 'Fiktive Gesprächspartner' }] : []);
  if (['/rest/v1/wichtige_punkte', '/rest/v1/listen_felder'].includes(p)) return antwort([]);
  if (p === '/storage/v1/object/list/dokumente' && admin) return antwort([{ name: 'verwendet.pdf' }, { name: 'anlage.pdf' }]);
  if (p === '/storage/v1/object/dokumente' && methode === 'DELETE') return antwort([]);
  if (p.startsWith('/storage/v1/object/sign/dokumente/') && methode === 'POST') return mode.startsWith('dokument-downloadfehler-')
    ? fehler() : antwort({ signedURL: `/object/sign/dokumente/${s.uid}/synthetisch.pdf?token=offline` });
  return null;
}
module.exports = { bearbeiten };
