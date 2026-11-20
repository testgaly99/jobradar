import csv
from copy import deepcopy
from pathlib import Path

SPALTEN = ['name', 'careers_url', 'ats_typ', 'ats_id', 'groesse_klasse',
           'mitarbeitende_ca', 'kategorie', 'hauptsitz', 'aktiv', 'notiz',
           'website', 'wikidata_id', 'quellen', 'status', 'status_grund']


def lade_unternehmen(pfad="data/companies.csv"):
    with open(pfad, encoding="utf-8-sig", newline="") as f:
        zeilen = list(csv.DictReader(f))
    # Von Hand ergänzte Zeilen dürfen den Nachtlauf nie kippen: fehlende Spalten liefert csv als None.
    kennungen = set()
    for z in zeilen:
        z["kategorie"] = [k.strip() for k in (z.get("kategorie") or "").split(";") if k.strip()]
        z['quellen'] = [q.strip() for q in (z.get('quellen') or '').split(';') if q.strip()]
        for feld in ('website', 'wikidata_id', 'status_grund'):
            z[feld] = z.get(feld) or ''
        if not z.get('status'):
            z['status'] = 'aktiv' if z.get('aktiv') == 'ja' else 'offen'
        if z['wikidata_id'] in kennungen:  # kopierte Zeile: die Datenbank erlaubt jede Kennung nur einmal
            print('Hinweis: doppelte Wikidata-Kennung in companies.csv, bei der späteren Zeile ignoriert.')
            z['wikidata_id'] = ''
        elif z['wikidata_id']:
            kennungen.add(z['wikidata_id'])
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
