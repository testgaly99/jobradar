import csv
from copy import deepcopy
from pathlib import Path

SPALTEN = ['name', 'careers_url', 'ats_typ', 'ats_id', 'groesse_klasse',
           'mitarbeitende_ca', 'kategorie', 'hauptsitz', 'aktiv', 'notiz',
           'website', 'wikidata_id', 'quellen', 'status', 'status_grund']


def lade_unternehmen(pfad="data/companies.csv"):
    with open(pfad, encoding="utf-8-sig", newline="") as f:
        zeilen = list(csv.DictReader(f))
    for z in zeilen:
        z["kategorie"] = [k.strip() for k in z["kategorie"].split(";") if k.strip()]
        z['quellen'] = [q.strip() for q in z.get('quellen', '').split(';') if q.strip()]
        for feld in ('website', 'wikidata_id', 'status_grund'):
            z.setdefault(feld, '')
        z.setdefault('status', 'aktiv' if z.get('aktiv') == 'ja' else 'offen')
    return zeilen


def wende_korrekturen_an(firmen, pfad):
    ergebnis = deepcopy(firmen)
    if not Path(pfad).exists():
        return ergebnis
    with open(pfad, encoding='utf-8-sig', newline='') as f:
        for z in csv.DictReader(f):
            feld = z['feld']
            if feld not in set(SPALTEN) - {'name'}:
                raise ValueError('Unbekanntes Stammdaten-Feld')
            for firma in ergebnis:
                if firma['name'] == z['name']:
                    firma[feld] = ([s.strip() for s in z['wert'].split(';') if s.strip()]
                                   if feld in {'kategorie', 'quellen'} else z['wert'])
    return ergebnis
