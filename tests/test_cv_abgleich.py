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
        self.schaetz, self.schaetz_fehler = [], False

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

    def stellen_fuer_schaetzung(self, owner):
        if self.schaetz_fehler:
            raise RuntimeError('Geheimfirma kaputt')
        return self.schaetz

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


@pytest.mark.parametrize('wert,erwartet', [('5', 5), ('500', 50), ('0', 50), ('abc', 50)])
def test_grenze_fuer_probelauf_nur_nach_unten(monkeypatch, wert, erwartet):
    monkeypatch.setenv('CV_MAX_STELLEN', wert)
    db = FakeDB(stellen=60)
    _lauf(db, Claude())
    assert db.grenze == erwartet and len(db.ergebnisse) == erwartet


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


def _anf(n, muss=True):
    return [{'id': f'a{i}', 'text': 't', 'muss': muss} for i in range(n)]


def _je(anf, farben):
    return {a['id']: {'cv1': {'farbe': f}} for a, f in zip(anf, farben)}


def test_passung_sortwert():
    sw = cv_abgleich.passung_sortwert
    a = _anf(10)
    assert sw(a, _je(a, ['gruen'] * 10), ['cv1']) == 0
    assert sw(a, _je(a, ['rot'] + ['gruen'] * 9), ['cv1']) >= 1000
    s = _anf(10, muss=False)
    assert sw(s, _je(s, ['rot'] + ['gruen'] * 9), ['cv1']) == 15
    assert sw(a, _je(a, ['gelb', 'gelb'] + ['gruen'] * 8), ['cv1']) == 20
    assert sw([], {}, ['cv1']) is None


def test_offen_schaetzung_darf_ueberschrieben_werden():
    k = [{'job_id': 'J1', 'anforderungs_hash': 'x', 'anforderungen': [{'id': 'a'}]}]
    assert cv_abgleich.offen(k, [{'job_id': 'J1', 'application_id': None, 'weg': 'schaetzung'}], 50) == k


def test_claude_ergebnis_hat_sortwert():
    db = FakeDB()
    _lauf(db, Claude())
    assert isinstance(db.ergebnisse[0][1]['passung_sortwert'], int)


def _schaetz_stellen(n):
    return [{'job_id': f'S:{i}', 'anforderungs_hash': f's{i}',
             'anforderungen': [{'id': 'a1', 'text': GEHEIM_ANZ, 'muss': True}, {'id': 'a2', 'text': 'Python', 'muss': True}]}
            for i in range(n)]


def test_schaetzung_nur_gruen_gelb_und_ohne_claude():
    db, c = FakeDB(stellen=0), Claude()
    db.schaetz = _schaetz_stellen(3)
    _lauf(db, c)
    assert c.aufrufe == 0 and len(db.ergebnisse) == 3
    for ziel, d in db.ergebnisse:
        assert d['weg'] == 'schaetzung' and d['passung_sortwert'] is not None
        assert {e['farbe'] for a in d['anforderungen'] for e in a['je_cv'].values()} <= {'gruen', 'gelb'}


def test_schaetzung_haelt_zeitbudget(monkeypatch):
    db = FakeDB(stellen=0)
    db.schaetz = _schaetz_stellen(10)
    t = iter(range(0, 10000, 400))  # jeder Aufruf +400 s
    monkeypatch.setattr(cv_abgleich.time, 'monotonic', lambda: next(t))
    _lauf(db, Claude())
    assert len(db.ergebnisse) == 2  # Uhr: Start 0, Prüfungen bei 400, 800 ok, 1200 > 900


def test_schaetzfehler_bricht_nicht_ab(capsys):
    db = FakeDB()
    db.schaetz_fehler = True
    assert _lauf(db, Claude()) == 0
    assert len(db.ergebnisse) == 1
    log = capsys.readouterr().out
    assert 'Schätzung' in log and 'Geheimfirma' not in log


def test_abo_limit_beide_admins_bekommen_schaetzung(capsys):
    class ZweiAdmins(FakeDB):
        def admin_ids(self):
            return [{'user_id': 'admin-1'}, {'user_id': 'admin-2'}]

        def speichere_ergebnis(self, owner, ziel, **daten):
            self.ergebnisse.append((owner, daten))

    db = ZweiAdmins(stellen=0)
    db.schaetz = _schaetz_stellen(2)
    aufrufe = []

    def frage(prompt, bilder=()):
        aufrufe.append(1)
        raise claude_cli.AboLimit('Limit')
    assert cv_abgleich.main(db=db, frage=frage, einbetten=_einbetten, heute='2026-11-24') == 0
    assert sorted(o for o, _ in db.ergebnisse) == ['admin-1', 'admin-1', 'admin-2', 'admin-2']
    assert all(d['weg'] == 'schaetzung' for _, d in db.ergebnisse)
    assert len(aufrufe) == 1  # nur das erste Konto fragt Claude, das zweite läuft im Modus nur_schaetzen
    log = capsys.readouterr().out
    assert log.count('Abbruch: Limit') == 1 and '4 geschätzt' in log
