"""Plan 6a, Task 4: Nachtlauf mit Attrappen für Datenbank, Claude und Modell (Review Focus 3–5)."""
import json

import pytest

from scraper import claude_cli, cv_abgleich

GEHEIM_CV = 'Datenbankabfragen regelmäßig erstellt. Führerschein Klasse B nicht vorhanden. Wohnort Geheimstadt'
GEHEIM_ANZ = 'Erfahrung mit SQL bei der Firma Geheimfirma'


class FakeDB:
    def __init__(self, stellen=1, einwilligung=cv_abgleich.EINWILLIGUNG_FASSUNG, cvs=('cv1',), text=GEHEIM_CV):
        self.einwilligung, self.ergebnisse, self.texte, self.profile = einwilligung, [], {}, {}
        self.docs = [{'id': c, 'name': c, 'storage_pfad': f'u/{c}.pdf', 'standard': False,
                      'cv_text': {'text': text, 'hash': 'h-' + c, 'herkunft': 'ausgelesen'}, 'profil': None} for c in cvs]
        self.stellen = [{'job_id': f'J:{i}', 'anforderungs_hash': f'a{i}',
                         'anforderungen': [{'id': 'a1', 'text': GEHEIM_ANZ, 'muss': True},
                                           {'id': 'a2', 'text': 'Python', 'muss': True}]} for i in range(stellen)]
        self.grenze = None

    def admin_ids(self):
        return [{'user_id': 'admin-1'}]

    def hat_cv_einwilligung(self, owner, fassung):
        return self.einwilligung == fassung

    def cv_dokumente(self, owner):
        return self.docs

    def speichere_cv_text(self, *a):
        self.texte[a[0]] = a

    def speichere_profil(self, dokument_id, owner, text_hash, aussagen):
        self.profile[dokument_id] = aussagen

    def stellen_fuer_abgleich(self, owner, grenze):
        self.grenze = grenze
        return self.stellen

    def speichere_ergebnis(self, owner, ziel, **daten):
        self.ergebnisse.append((ziel, daten))


def _einbetten(texte, art):
    # SQL-Texte zeigen in dieselbe Richtung; der Beleg nennt „SQL“ nicht wörtlich -> Grenzfall für Claude.
    return [[1.0, 0.0] if 'SQL' in t or 'Datenbank' in t else [0.0, 1.0] for t in texte]


def _profil_antwort():
    return [{'aussage': 'Datenbank', 'beleg': 'Datenbankabfragen regelmäßig erstellt.'}]


class Claude:
    def __init__(self, fehler_bei=None, kaputt=False):
        self.aufrufe, self.fehler_bei, self.kaputt = 0, fehler_bei, kaputt

    def __call__(self, prompt, bilder=()):
        if '<cv>' in prompt:
            return _profil_antwort()
        self.aufrufe += 1
        if self.fehler_bei == self.aufrufe:
            raise claude_cli.AboLimit('Limit')
        if self.kaputt:
            raise claude_cli.UngueltigeAntwort('kein JSON')
        nutzlast = json.loads(prompt[prompt.rindex('<daten>') + 7:prompt.rindex('</daten>')])
        return [{'stelle': s['stelle'], 'id': a['id'], 'cv': cv, 'farbe': 'gruen', 'grund': 'belegt',
                 'beleg': 'Datenbankabfragen regelmäßig erstellt.', 'begruendung': 'nennt Datenbankabfragen'}
                for s in nutzlast for cv, anf in s['grenzfaelle'].items() for a in anf]


def _lauf(db, claude):
    return cv_abgleich.main(db=db, frage=claude, einbetten=_einbetten, heute='2026-11-24')


def test_gueltige_antwort_wird_gespeichert(capsys):
    db, c = FakeDB(), Claude()
    assert _lauf(db, c) == 0
    (ziel, d), = db.ergebnisse
    assert ziel == {'job_id': 'J:0'} and d['weg'] == 'claude' and d['empfohlen'] == ['cv1']
    a1 = next(a for a in d['anforderungen'] if a['id'] == 'a1')
    assert a1['je_cv']['cv1']['farbe'] == 'gruen' and d['anforderungs_hash'] == 'a0' and d['cv_hashes'] == {'cv1': 'h-cv1'}
    log = capsys.readouterr().out
    for geheim in ('Geheimstadt', 'Geheimfirma', 'Datenbankabfragen'):
        assert geheim not in log
    assert 'CV-Abgleich:' in log


def test_kaputtes_json_macht_gelb_und_lauf_geht_weiter():
    db = FakeDB(stellen=6)
    assert _lauf(db, Claude(kaputt=True)) == 0
    assert len(db.ergebnisse) == 6
    a1 = next(a for a in db.ergebnisse[0][1]['anforderungen'] if a['id'] == 'a1')
    assert a1['je_cv']['cv1'] == cv_abgleich.GELB_NICHT_PRUEFBAR


def test_limit_in_buendel_drei_behaelt_buendel_eins_und_zwei(capsys):
    db, c = FakeDB(stellen=50), Claude(fehler_bei=3)
    assert _lauf(db, c) == 0
    assert len(db.ergebnisse) == 10 and c.aufrufe == 3
    assert 'Abbruch: Limit' in capsys.readouterr().out


@pytest.mark.parametrize('db,grund', [(FakeDB(einwilligung=None), 'keine Einwilligung'), (FakeDB(einwilligung='admin-alt'), 'keine Einwilligung'),
                                     (FakeDB(cvs=()), 'kein CV')])
def test_ohne_einwilligung_oder_cv_kein_aufruf(db, grund, capsys):
    c = Claude()
    assert _lauf(db, c) == 0 and c.aufrufe == 0 and not db.ergebnisse
    assert f'übersprungen: {grund}' in capsys.readouterr().out


def test_buendel_zu_fuenf_und_grenze_fuenfzig():
    db, c = FakeDB(stellen=12), Claude()
    _lauf(db, c)
    assert c.aufrufe == 3 and len(db.ergebnisse) == 12
    db, c = FakeDB(stellen=60), Claude()
    _lauf(db, c)
    assert db.grenze == 50 and len(db.ergebnisse) == 50


def test_leerer_cv_nie_rot():
    db = FakeDB(text='')
    db.docs[0]['cv_text']['herkunft'] = 'leer'
    _lauf(db, Claude())
    for _, d in db.ergebnisse:
        assert all(e['farbe'] != 'rot' for a in d['anforderungen'] for e in a['je_cv'].values())


def test_offen_nur_ohne_gueltiges_ergebnis():
    kandidaten = [{'job_id': 'J1', 'anforderungs_hash': 'x', 'anforderungen': [{'id': 'a'}]},
                  {'job_id': 'J2', 'anforderungs_hash': 'x', 'anforderungen': [{'id': 'a'}]},
                  {'application_id': 'B1', 'anforderungs_hash': 'x', 'anforderungen': [{'id': 'a'}]},
                  {'job_id': 'J3', 'anforderungs_hash': 'x', 'anforderungen': []}]
    vorhanden = [{'job_id': 'J1', 'application_id': None, 'weg': 'claude'},
                 {'job_id': 'J2', 'application_id': None, 'weg': 'browser-vorlaeufig'}]
    assert [k.get('job_id') or k.get('application_id') for k in cv_abgleich.offen(kandidaten, vorhanden, 50)] == ['J2', 'B1']


def test_stellen_fuer_abgleich_reihenfolge_sichtbarkeit_und_vorhandene(monkeypatch):
    from scraper import db
    liste = [{'id': 'a1', 'text': 'SQL', 'muss': True}]
    daten = {
        'applications': [{'id': 'B1', 'job_id': 'J1', 'anforderungsliste': None, 'anforderungs_hash': None},
                         {'id': 'B2', 'job_id': None, 'anforderungsliste': liste, 'anforderungs_hash': 'b2'}],
        'jobs_gemerkt': [{'id': 'J1', 'anforderungsliste': liste, 'anforderungs_hash': 'j1'}],
        'jobs_offen': [{'id': 'J2', 'unternehmen': 'Sichtbar', 'titel': 'Data Engineer', 'anforderungsliste': liste, 'anforderungs_hash': 'j2'},
                       {'id': 'J3', 'unternehmen': 'Fremd privat', 'titel': 'Data Analyst', 'anforderungsliste': liste, 'anforderungs_hash': 'j3'},
                       {'id': 'J4', 'unternehmen': 'Sichtbar', 'titel': 'Koch', 'anforderungsliste': liste, 'anforderungs_hash': 'j4'},
                       {'id': 'J5', 'unternehmen': 'Sichtbar', 'titel': 'Data Scientist', 'anforderungsliste': liste, 'anforderungs_hash': 'j5'}],
        'cv_ergebnisse': [{'job_id': 'J5', 'application_id': None, 'weg': 'claude'}],
    }

    def alle(tabelle, params):
        if tabelle == 'applications':
            assert params['status'] == 'eq.gemerkt' and params['owner_id'] == 'eq.o'
            return daten['applications']
        if tabelle == 'jobs':
            return daten['jobs_gemerkt'] if 'id' in params else daten['jobs_offen']
        return daten[tabelle]
    monkeypatch.setattr(db, '_alle_zeilen', alle)
    monkeypatch.setattr(db, 'wunsch_und_stichwoerter', lambda o: (set(), ['Data']))
    monkeypatch.setattr(db, 'sichtbare_firmen', lambda o: {'Sichtbar'})
    erg = db.stellen_fuer_abgleich('o', 50)
    assert [k.get('job_id') or k.get('application_id') for k in erg] == ['J1', 'B2', 'J2']


def test_text_lesen_unbekanntes_format_ist_leer(tmp_path):
    datei = tmp_path / 'cv.odt'
    datei.write_bytes(b'x')
    assert cv_abgleich.text_lesen(datei) == ''


def test_text_lesen_word(tmp_path):
    docx = pytest.importorskip('docx')
    d = docx.Document()
    d.add_paragraph('Regelmäßig SQL-Abfragen erstellt.')
    d.add_paragraph('Englisch C1')
    d.save(tmp_path / 'cv.docx')
    assert cv_abgleich.text_lesen(tmp_path / 'cv.docx') == 'Regelmäßig SQL-Abfragen erstellt.\nEnglisch C1'
