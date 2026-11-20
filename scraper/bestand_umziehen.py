"""Erst DB atomar umstellen, danach ausschließlich bestätigte Bestandszeilen entfernen."""
from copy import deepcopy

from scraper import db


def umziehen(firmen, pfad):
    if not any('bestand' in f.get('quellen', []) for f in firmen) or not db.zusatzfirmen_da():
        return firmen
    privat = [f['name'] for f in firmen if f.get('quellen') == ['bestand']]
    if not db.privatisiere_bestand(privat):
        print('Hinweis: Bestandsumzug noch offen; Admin-Einträge fehlen oder Datenbank bestätigt nicht.')
        return firmen
    result = []
    for firma in deepcopy(firmen):
        if firma['name'] in privat:
            continue
        firma['quellen'] = [q for q in firma.get('quellen', []) if q != 'bestand']
        result.append(firma)
    from scraper.ranglisten_holen import schreibe_firmen
    schreibe_firmen(pfad, result)
    return result
