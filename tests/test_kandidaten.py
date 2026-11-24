from scraper import kandidaten
from scraper.quellen import kandidat
from scraper.rankings import pruefe_ausgabe


def k(name='Siemens', liste='dax', q='Q1', web='https://siemens.example', **kw):
    d = kandidat(name, liste)
    d.update(wikidata_id=q, website=web, **kw)
    return d


def test_id_domain_und_bestand_bleiben():
    alt = dict(name='Siemens', wikidata_id='Q1', website='https://siemens.example',
               ats_typ='ashby', ats_id='siemens', status='aktiv', aktiv='ja', quellen=['bestand'])
    firmen, bericht = kandidaten.zusammenfuehren([k('Siemens AG', 'scoreboard-world'), k()], [alt])
    assert len(firmen) == 1 and firmen[0]['ats_typ'] == 'ashby'
    assert set(firmen[0]['quellen']) == {'bestand', 'scoreboard-world', 'dax'}
    firmen, _ = kandidaten.zusammenfuehren([k(q=None), k('Siemens AG', 'epa-patente', None, 'https://www.siemens.example/jobs')], [])
    assert len(firmen) == 1


def test_gleicher_name_verschiedene_domains_nie_ueberschreiben():
    firmen, bericht = kandidaten.zusammenfuehren([k(q=None), k(q=None, web='https://andere.example')], [])
    assert len(firmen) == 2 and len({f['name'] for f in firmen}) == 2
    assert any('Name' in s for s in bericht)


def test_verschiedene_portale_nie_zusammenlegen():
    a = k(ats_typ='ashby', ats_id='a')
    b = k('Siemens Marke', 'epa-patente', ats_typ='personio', ats_id='b')
    firmen, bericht = kandidaten.zusammenfuehren([a, b], [])
    assert len(firmen) == 2 and any('Portale' in s for s in bericht)
    assert sum(bool(f['wikidata_id']) for f in firmen) == 1


def test_austritt_ohne_bestand_schaltet_ab():
    alt = [dict(name='A', quellen=['dax'], aktiv='ja', status='aktiv'),
           dict(name='B', quellen=['bestand'], aktiv='ja', status='aktiv')]
    firmen, _ = kandidaten.zusammenfuehren([], alt)
    assert firmen[0]['aktiv'] == 'nein' and firmen[1]['aktiv'] == 'ja'


def test_branche_und_ausgaben_gueltig():
    assert kandidaten.kategorie_fuer('Q1', {'Q1': 'Tech'}) == 'Tech'
    assert kandidaten.kategorie_fuer(None, {}) == 'Sonstige'
    for ausgabe in kandidaten.ausgaben([k(rang=2)], '2026-11-20'):
        assert pruefe_ausgabe(ausgabe, {'Siemens'})['ranking_firmen'][0]['rang'] == 2


def test_epa_nur_admin_und_schaltjahr():
    a = kandidaten.ausgaben([k(liste='epa-patente')], '2024-02-29')[0]
    assert a['ausgabe']['gueltig_bis'] == '2025-02-28'
    assert a['ausgabe']['freigegeben'] and a['ausgabe']['sichtbarkeit']=='admin'
    pruefe_ausgabe(a, {'Siemens'})


def test_unaufgeloester_quelleneintrag_bleibt_beim_monatswechsel_stabil():
    quelle = k('Unbekannt', q=None, web=None)
    firmen, _ = kandidaten.zusammenfuehren([quelle], [])
    erneut, _ = kandidaten.zusammenfuehren([quelle], firmen)
    assert len(erneut) == 1
    # Quellenübergreifend ist der bloße Name weiterhin kein Identitätsbeweis.
    weitere, _ = kandidaten.zusammenfuehren([quelle, dict(quelle, liste_id='epa-patente')], firmen)
    assert len(weitere) == 2


def test_ausgaben_behalten_quelljahr():
    a = kandidaten.ausgaben([k(jahr=2025)], '2026-11-20')[0]
    assert a['ausgabe']['jahr'] == 2025


def test_bestandsfirmen_mit_listenplatz_und_inaktiver_bestand():
    from pathlib import Path
    from scraper.companies import lade_unternehmen
    bestand = lade_unternehmen(Path(__file__).parents[1] / 'data/companies.csv')
    neue = [k('dm', 'top200-arbeitgeber', None, 'https://www.dm.de/'),
            k('Porsche AG', 'scoreboard-world', None, 'https://www.porsche.com/'),
            k('Deutsche Bundesbank', 'top200-arbeitgeber', 'Q162222', 'https://www.bundesbank.de/')]
    firmen, _ = kandidaten.zusammenfuehren(neue, bestand)
    assert len(firmen) == len(bestand) == 13
    for name in ['dm-drogerie markt', 'Porsche', 'Deutsche Bundesbank']:
        f = next(f for f in firmen if f['name'] == name)
        assert len(f['quellen']) == 2 and f['ats_typ'] == 'sitemap'
    assert next(f for f in firmen if f['name'] == 'Techniker Krankenkasse')['aktiv'] == 'nein'


def test_unbekannte_groesse_bleibt_unbekannt():
    firmen, _ = kandidaten.zusammenfuehren([k()], [])
    assert firmen[0]['groesse_klasse'] == ''
