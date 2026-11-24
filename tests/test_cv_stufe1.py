"""Plan 6a, Task 3: Stufe 1 (Bedeutungsvergleich) ohne Modell mit festen Ähnlichkeiten aus dem Abnahmefall."""
import json
from pathlib import Path

import pytest

from scraper import cv_stufe1 as s1

ROOT = Path(__file__).resolve().parents[1]
FALL = json.loads((ROOT / 'tests/fixtures/cv-aehnlichkeiten.json').read_text(encoding='utf-8'))
REGELN = json.loads((ROOT / 'web/lib/cv-regeln.json').read_text(encoding='utf-8'))
# Stufe 1 darf nur „sicher“ für Belegtes vergeben; alles Strittige (teilweise, negativer Beleg) bleibt Grenzfall für Claude.
ERLAUBT = {'belegt': {'sicher'}, 'nicht_belegt': {'nicht_belegt', 'grenzfall'},
           'teilweise_belegt': {'grenzfall'}, 'nachweislich_nicht_erfuellt': {'grenzfall'}}


def _bewertungen():
    return {cv['id']: s1.bewerte(FALL['anforderungen'], cv['profil'], cv['aehnlich'], REGELN) for cv in FALL['cvs']}


def test_abnahmefall_stufen_passen():
    alle = _bewertungen()
    for cv in FALL['cvs']:
        for b in alle[cv['id']]:
            assert b['stufe'] in ERLAUBT[cv['erwartet'][b['id']]], (cv['id'], b)


def test_power_bi_nie_sicher_und_nie_rot():
    for liste in _bewertungen().values():
        a5 = next(b for b in liste if b['id'] == 'a5')
        assert a5['stufe'] != 'sicher' and 'rot' not in json.dumps(a5)


def test_fehlender_fachbegriff_verhindert_sicher():
    anf = [{'id': 'x', 'text': 'Erfahrung mit SQL', 'muss': True}]
    profil = [{'aussage': 'Datenbankabfragen', 'beleg': 'Regelmäßig Datenbankabfragen erstellt'}]
    assert s1.bewerte(anf, profil, [[0.99]], REGELN)[0]['stufe'] == 'grenzfall'
    profil = [{'aussage': 'SQL', 'beleg': 'Regelmäßig sql-Abfragen erstellt'}]
    assert s1.bewerte(anf, profil, [[0.99]], REGELN)[0]['stufe'] == 'sicher'


def test_verneinung_im_beleg_verhindert_sicher():
    anf = [{'id': 'x', 'text': 'Führerschein Klasse B vorhanden', 'muss': True}]
    profil = [{'aussage': 'kein Führerschein', 'beleg': 'Führerschein Klasse B nicht vorhanden'}]
    assert s1.bewerte(anf, profil, [[0.99]], REGELN)[0]['stufe'] == 'grenzfall'


def test_leeres_profil_ist_nicht_belegt():
    assert s1.bewerte([{'id': 'x', 'text': 'SQL', 'muss': True}], [], [[]], REGELN)[0] == \
        {'id': 'x', 'stufe': 'nicht_belegt', 'beleg': None, 'wert': 0.0}


def test_fachbegriffe_ohne_normale_substantive():
    assert s1.fachbegriffe('Erfahrung mit SQL, C++ und S/4HANA im Team, Englisch C1') == ['SQL', 'C++', 'S/4HANA', 'C1']


def _b(ids_sicher, muss=('m1', 'm2', 'm3'), soll=('s1',)):
    return [{'id': i, 'stufe': 'sicher' if i in ids_sicher else 'grenzfall'} for i in (*muss, *soll)]


ANF = [{'id': i, 'muss': True} for i in ('m1', 'm2', 'm3')] + [{'id': 's1', 'muss': False}]


def test_waehle_regeln():
    # Gleichstand: Standard zuerst, beide empfohlen
    assert s1.waehle({'a': _b({'m1'}), 'b': _b({'m1'})}, ANF, 'b') == ['b', 'a']
    # genau eine Muss-Anforderung dahinter: zwei Versionen
    assert s1.waehle({'a': _b({'m1', 'm2'}), 'b': _b({'m1'})}, ANF, None) == ['a', 'b']
    # zwei Muss dahinter: eine Version
    assert s1.waehle({'a': _b({'m1', 'm2', 'm3'}), 'b': _b({'m1'})}, ANF, None) == ['a']
    # Soll entscheidet erst nach Muss
    assert s1.waehle({'a': _b({'m1'}), 'b': _b({'m1', 's1'}), 'c': _b(set())}, ANF, None)[0] == 'b'


def test_abnahmefall_empfiehlt_kombinierte_version_zuerst():
    assert s1.waehle(_bewertungen(), FALL['anforderungen'], None)[0] == 'cv-kombiniert'


def test_einbetten_mit_echtem_modell():
    pytest.importorskip('onnxruntime')
    v = s1.einbetten(['Erfahrung mit SQL'], 'query')
    w = s1.einbetten(['Regelmäßig SQL-Abfragen erstellt', 'Führerschein Klasse B'], 'passage')
    assert len(v[0]) == 384 and abs(sum(x * x for x in v[0]) - 1) < 1e-3
    assert sum(a * b for a, b in zip(v[0], w[0])) > sum(a * b for a, b in zip(v[0], w[1]))
