"""Website zu Firmennamen über Wikidata (Plan 2026-11-24 „Websites ergänzen“), nur gespeicherte Antworten."""
import json
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import requests

from scraper.quellen import websites

WD = 'http://www.wikidata.org/entity/'


def _antwort(zeilen):
    daten = {'results': {'bindings': [{k: {'value': v} for k, v in z.items()} for z in zeilen]}}
    return SimpleNamespace(content=json.dumps(daten).encode())


def _dienst(label=(), alias=(), bekannt=None, aufgeloest=(), abfragen=None):
    """label/alias: (qid, kleingeschriebene Bezeichnung, Website)."""
    def holen(url):
        q = parse_qs(urlsplit(url).query)['query'][0]
        if abfragen is not None:
            abfragen.append(q)
        if 'schema.org/about' in q:
            return _antwort([{'firma': WD + k, 'n': str(v)} for k, v in (bekannt or {}).items() if 'wd:' + k in q])
        if 'P576' in q:
            return _antwort([{'firma': WD + k, 'ende': '2020'} for k in aufgeloest if 'wd:' + k in q])
        quelle = alias if 'skos:altLabel' in q else label
        return _antwort([{'firma': WD + k, 'lc': lc, 'web': w} for k, lc, w in quelle if json.dumps(lc) in q])
    return holen


def test_gross_kleinschreibung_und_zusaetze():
    holen = _dienst(label=[('Q1', 'astrazeneca', 'https://www.astrazeneca.com/'), ('Q2', 'eli lilly and company', 'http://www.lilly.com')])
    aus = websites.websites_zu_namen(['ASTRAZENECA PLC', 'ELI LILLY AND COMPANY'], holen, schlafen=lambda _: None)
    assert aus['ASTRAZENECA PLC'] == {'website': 'https://www.astrazeneca.com', 'wikidata_id': 'Q1'}
    assert aus['ELI LILLY AND COMPANY']['website'] == 'https://www.lilly.com'


def test_landesgesellschaften_bekanntester_gewinnt_gleichstand_ist_mehrdeutig():
    label = [('Q1', 'astrazeneca', 'https://www.astrazeneca.com/'), ('Q2', 'astrazeneca', 'https://www.astrazeneca.it/'),
             ('Q3', 'cea', 'https://www.cea.fr/'), ('Q4', 'cea', 'https://cta.tech/')]
    holen = _dienst(label=label, bekannt={'Q1': 80, 'Q2': 3, 'Q3': 10, 'Q4': 8})
    aus = websites.websites_zu_namen(['ASTRAZENECA PLC', 'CEA'], holen, schlafen=lambda _: None)
    assert aus['ASTRAZENECA PLC']['wikidata_id'] == 'Q1'
    assert aus['CEA'] == {'grund': 'mehrdeutig'}  # 10 ist nicht doppelt so viel wie 8: lieber zum Nutzer


def test_aufgeloeste_firma_wird_nie_gewaehlt():
    holen = _dienst(label=[('Q5', 'bombardier transportation', 'https://www.bombardier.com/')], aufgeloest=['Q5'])
    assert websites.websites_zu_namen(['Bombardier Transportation'], holen, schlafen=lambda _: None) == \
        {'Bombardier Transportation': {'grund': 'kein Treffer'}}


def test_alternative_bezeichnung_nur_fuer_namen_ohne_treffer():
    abfragen = []
    holen = _dienst(label=[('Q1', 'nvidia', 'https://www.nvidia.com/')],
                    alias=[('Q9', 'caterpillar inc', 'https://www.caterpillar.com/')], abfragen=abfragen)
    aus = websites.websites_zu_namen(['NVIDIA CORP', 'CATERPILLAR INC'], holen, schlafen=lambda _: None)
    assert aus['CATERPILLAR INC']['wikidata_id'] == 'Q9' and aus['NVIDIA CORP']['wikidata_id'] == 'Q1'
    alias = [q for q in abfragen if 'skos:altLabel' in q]
    assert alias and all('"nvidia' not in q for q in alias)


def test_unterseite_wird_auf_firmendomain_gekuerzt():
    assert websites.website_von('https://investors.spotify.com/home') == 'https://www.spotify.com'
    assert websites.website_von('http://www.sony.co.jp/') == 'https://www.sony.co.jp'
    assert websites.website_von('https://tesla.com') == 'https://tesla.com'


def test_drosselung_wartet_und_versucht_erneut():
    gewartet, versuche = [], []
    gut = _dienst(label=[('Q1', 'nvidia', 'https://www.nvidia.com/')])

    def holen(url):
        versuche.append(url)
        if len(versuche) == 1:
            antwort = requests.Response(); antwort.status_code = 429
            raise requests.HTTPError('429', response=antwort)
        return gut(url)
    aus = websites.websites_zu_namen(['NVIDIA CORP'], holen, schlafen=gewartet.append)
    assert aus['NVIDIA CORP']['wikidata_id'] == 'Q1' and 60 in gewartet


def test_pakete_bleiben_klein():
    abfragen = []
    namen = [f'Firma {i} AG' for i in range(50)]
    websites.websites_zu_namen(namen, _dienst(abfragen=abfragen), schlafen=lambda _: None)
    label = [q for q in abfragen if 'rdfs:label' in q]
    assert len(label) >= 3 and all(q.count('"firma ') <= websites.PAKET for q in label)
