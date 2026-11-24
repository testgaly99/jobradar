// Zustandsbehaftete persönliche Browserfälle, ausschließlich erfundene Daten.
const UID_MODUS = new Map();
const STAENDE = new Map();
const AID = '00000000-0000-4000-8000-000000000031';
const DOK_A = '00000000-0000-4000-8000-000000000032';
const DOK_B = '00000000-0000-4000-8000-000000000033';
const DOK_NEU = '00000000-0000-4000-8000-000000000034';
const VORHANDEN = '00000000-0000-4000-8000-000000000035';
const PORTAL_URL = 'https://www.indeed.de/viewjob?jk=offline';
const ORIGINAL_JOB = {
  id: 'Prüffirma Kanban:offline', unternehmen: 'Prüffirma Kanban', titel: 'Prüf-Original vor Ort',
  ort: 'Teststadt', url: 'https://karriere.example.invalid/stellen/offline', sichtbar: true, status: 'offen',
  text: 'Künstlicher Text von der Originalstelle.', arbeitsmodell: 'Hybrid', abschnitte: null,
};

function antwort(daten, status = 200, headers = {}) {
  return new Response(status === 204 ? null : JSON.stringify(daten), {
    status, headers: { 'Content-Type': 'application/json', ...headers },
  });
}
const fehler = () => antwort({ code: 'XX000', message: 'künstlicher Prüffehler' }, 500);
const gehoert = mode => /^(tracker|dokument|export|konto|import|original)-/.test(mode);

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
      link: 'https://karriere.example.invalid/stellen/123', status: 'im_gespraech', snapshot_text: 'Bestehender künstlicher Text' });
    const applications = /^(import-neu|original-formular)-/.test(mode) ? [] : [a];
    if (mode.startsWith('original-')) {
      Object.assign(a, {
        job_id: null, portal_link: PORTAL_URL, link: PORTAL_URL, quelle: 'indeed.de',
        original_suche: 'offen', original_wahl: null, original_dublette: null, original_portal: null, original_vorschlaege: null,
        snapshot_text: null, snapshot_abschnitte: null,
      });
      if (/^original-(lokal|keine|extern)-/.test(mode)) Object.assign(a, {
        original_suche: 'auswahl',
        original_vorschlaege: [
          { job_id: ORIGINAL_JOB.id, titel: ORIGINAL_JOB.titel, ort: ORIGINAL_JOB.ort },
          { titel: 'Prüf-Original im Nachtlauf', ort: 'Andere Teststadt', ats_typ: 'ashby', ats_id: 'offline', ext_id: 'synthetisch',
            url: 'https://jobs.ashbyhq.com/offline/synthetisch' },
        ],
      });
      if (mode.startsWith('original-dublette-')) {
        Object.assign(a, { original_suche: 'nicht_gefunden', original_dublette: VORHANDEN });
        applications.push({ ...a, id: VORHANDEN, titel: 'Schon gespeichertes Original', link: ORIGINAL_JOB.url,
          original_suche: null, original_dublette: null, portal_link: null, job_id: ORIGINAL_JOB.id });
      }
      if (mode.startsWith('original-beobachten-')) Object.assign(a, { firma: 'X', link: 'https://jobs.ashbyhq.com/offline/synthetisch',
        original_suche: 'gefunden', original_portal: { typ: 'ashby', id: 'offline' } });
    }
    STAENDE.set(mode, { uid, vorlage: a, applications, documents: [
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
    if (methode === 'POST' && mode.startsWith('original-formular-')) {
      const a = { ...s.vorlage, ...body, id: AID, owner_id: s.uid };
      s.applications.push(a);
      loggen({ mode, ereignis: 'original-formular-anlegen', patch: body });
      return antwort({ id: a.id }, 201);
    }
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
      if (mode.startsWith('original-')) {
        const q = url.searchParams;
        if (q.get('owner_id') !== `eq.${a.owner_id}` || q.get('geaendert_am') !== `eq.${a.geaendert_am}` ||
            q.get('job_id') !== 'is.null' || a.job_id !== null) throw new Error('Fehlender Eigentümer- oder Versionsschutz in der Originalsuche');
        Object.assign(a, body, { geaendert_am: new Date(Date.parse(a.geaendert_am) + 1000).toISOString() });
        loggen({ mode, ereignis: 'original-schreiben', patch: body });
        return antwort([{ id: a.id }]);
      }
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
    for (const feld of ['id', 'link', 'owner_id', 'job_id', 'portal_link', 'original_suche']) {
      const filter = url.searchParams.get(feld);
      if (filter?.startsWith('eq.')) daten = daten.filter(a => a[feld] === filter.slice(3));
      if (filter?.startsWith('neq.')) daten = daten.filter(a => a[feld] !== filter.slice(4));
    }
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? daten.length);
    return antwort(daten.slice(offset, offset + limit));
  }
  if (mode.startsWith('original-') && p === '/rest/v1/jobs') {
    const q = url.searchParams;
    if (q.get('id') === `eq.${ORIGINAL_JOB.id}` && q.get('sichtbar') === 'eq.true' && q.get('status') === 'eq.offen') {
      return antwort([ORIGINAL_JOB]);
    }
    return antwort([]);
  }
  if (mode.startsWith('original-') && p === '/rest/v1/companies') return antwort([]);
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
  if (['/rest/v1/wichtige_punkte', '/rest/v1/listen_felder', '/rest/v1/briefkopf', '/rest/v1/anschreiben_vorlagen', '/rest/v1/bewerbung_anlagen'].includes(p)) return antwort([]);
  if (p === '/storage/v1/object/list/dokumente' && admin) return antwort([{ name: 'verwendet.pdf' }, { name: 'anlage.pdf' }]);
  if (p === '/storage/v1/object/dokumente' && methode === 'DELETE') return antwort([]);
  if (p.startsWith('/storage/v1/object/sign/dokumente/') && methode === 'POST') return mode.startsWith('dokument-downloadfehler-')
    ? fehler() : antwort({ signedURL: `/object/sign/dokumente/${s.uid}/synthetisch.pdf?token=offline` });
  return null;
}
module.exports = { bearbeiten };
