"""Plan 6a, Task 4: Prüfung der Claude-Antworten (A5, A6, A7; Review Focus 3)."""
from scraper.cv_abgleich import antwort_pruefen, profil_pruefen

CV = {'cv1': 'Regelmäßig SQL-Abfragen erstellt.\nFührerschein Klasse B nicht vorhanden.', 'cv2': '', 'cv3': 'Python-Projekte.'}
ANF = [{'id': 'a1', 'text': 'SQL', 'muss': True}, {'id': 'a6', 'text': 'Führerschein', 'muss': True}]
GELB_NP = {'farbe': 'gelb', 'grund': 'nicht_pruefbar', 'beleg': None, 'begruendung': 'konnte nicht geprüft werden'}


def test_profil_behaelt_nur_woertliche_belege():
    aussagen = [{'aussage': 'SQL', 'beleg': 'SQL-Abfragen erstellt'}, {'aussage': 'Power BI', 'beleg': 'Power-BI-Berichte'},
                {'aussage': 'x', 'beleg': ''}, 'kaputt', {'aussage': 'y'}]
    assert profil_pruefen(aussagen, CV['cv1']) == [{'aussage': 'SQL', 'beleg': 'SQL-Abfragen erstellt'}]
    assert profil_pruefen('kein json', CV['cv1']) == []


def test_gueltige_antwort_bleibt_erhalten():
    antwort = [{'id': 'a1', 'cv': 'cv1', 'farbe': 'gruen', 'grund': 'belegt', 'beleg': 'SQL-Abfragen erstellt', 'begruendung': 'nennt SQL'},
               {'id': 'a6', 'cv': 'cv1', 'farbe': 'rot', 'grund': 'nicht_erfuellt', 'beleg': 'Führerschein Klasse B nicht vorhanden',
                'begruendung': 'ausdrücklich verneint'}]
    erg = antwort_pruefen(antwort, ANF, {'cv1': CV['cv1']})
    assert erg['a1']['cv1']['farbe'] == 'gruen' and erg['a6']['cv1']['farbe'] == 'rot'


def test_erfundener_beleg_rot_ohne_begruendung_und_fehlende_antwort():
    antwort = [{'id': 'a1', 'cv': 'cv1', 'farbe': 'gruen', 'grund': 'belegt', 'beleg': 'Power BI Experte', 'begruendung': 'x'},
               {'id': 'a6', 'cv': 'cv1', 'farbe': 'rot', 'grund': 'nicht_erfuellt', 'beleg': 'Führerschein Klasse B nicht vorhanden',
                'begruendung': ''}]
    erg = antwort_pruefen(antwort, ANF, {'cv1': CV['cv1'], 'cv3': CV['cv3']})
    assert erg['a1']['cv1'] == GELB_NP and erg['a6']['cv1'] == GELB_NP
    assert erg['a1']['cv3'] == GELB_NP  # keine Antwort für diese Version


def test_beleg_aus_anderer_version_wird_nicht_uebernommen():
    antwort = [{'id': 'a1', 'cv': 'cv3', 'farbe': 'gruen', 'grund': 'belegt', 'beleg': 'SQL-Abfragen erstellt', 'begruendung': 'x'}]
    assert antwort_pruefen(antwort, ANF[:1], {'cv1': CV['cv1'], 'cv3': CV['cv3']})['a1']['cv3'] == GELB_NP


def test_leerer_cv_nie_rot_und_gelb_gruende_erhalten():
    antwort = [{'id': 'a1', 'cv': 'cv2', 'farbe': 'rot', 'grund': 'nicht_erfuellt', 'beleg': '', 'begruendung': 'nichts da'},
               {'id': 'a6', 'cv': 'cv1', 'farbe': 'gelb', 'grund': 'teilweise', 'beleg': None, 'begruendung': 'nur teilweise'}]
    erg = antwort_pruefen(antwort, ANF, {'cv1': CV['cv1'], 'cv2': CV['cv2']})
    assert erg['a1']['cv2'] == GELB_NP
    assert erg['a6']['cv1'] == {'farbe': 'gelb', 'grund': 'teilweise', 'beleg': None, 'begruendung': 'nur teilweise'}
    assert antwort_pruefen('kaputt', ANF, {'cv1': CV['cv1']})['a1']['cv1'] == GELB_NP
