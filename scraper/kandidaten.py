"""Kandidaten zu dauerhaften Firmeneinträgen und Ranglisten-Ausgaben verbinden."""
import calendar
from copy import deepcopy
import csv
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

from scraper.companies import SPALTEN

LISTEN = {
    'scoreboard-world': ('EU R&D Scoreboard – Top 200 weltweit', 'Europäische Kommission', 'Innovation',
                        'https://iri.jrc.ec.europa.eu/scoreboard', 'CC BY 4.0'),
    'dax': ('DAX', 'Wikidata', 'Börsennotiert', 'https://www.wikidata.org/wiki/Q155718', 'CC0'),
    'mdax': ('MDAX', 'Wikidata', 'Börsennotiert', 'https://www.wikidata.org/wiki/Q595622', 'CC0'),
    'sdax': ('SDAX', 'Wikidata', 'Börsennotiert', 'https://www.wikidata.org/wiki/Q448445', 'CC0'),
    'tecdax': ('TecDAX', 'Wikidata', 'Börsennotiert', 'https://www.wikidata.org/wiki/Q378967', 'CC0'),
    'top200-arbeitgeber': ('Top 200 Arbeitgeber nach Mitarbeitenden', 'Wikidata', 'Große Unternehmen',
                         'https://www.wikidata.org/', 'CC0'),
    'epa-patente': ('Top 100 Patentanmelder', 'EPA', 'Innovation',
                    'https://www.epo.org/en/about-us/statistics', 'Ränge nicht freigegeben; Prüfung ausstehend'),
}


def domain(url):
    try:
        return (urlsplit(url or '').hostname or '').lower().removeprefix('www.')
    except ValueError:
        return ''


def kategorie_fuer(branche_wd, zuordnung):
    return zuordnung.get(branche_wd, 'Sonstige')


def _zuordnung():
    with open(Path(__file__).parents[1] / 'data/branchen_zuordnung.csv', encoding='utf-8-sig', newline='') as f:
        return {z['wikidata_branche']: z['kategorie'] for z in csv.DictReader(f)}


def _portal(f):
    return (f.get('ats_typ'), f.get('ats_id')) if f.get('ats_typ') and f.get('ats_id') else None


def zusammenfuehren(kandidaten, bestand):
    firmen, bericht, zuordnung = deepcopy(bestand), [], _zuordnung()
    # Ein bereits übernommener Eintrag derselben Quelle ist keine neue Firma.
    # Nie zur Zusammenlegung gleichnamiger Einträge verschiedener Quellen verwenden.
    quelleneintraege = {(q, f['name']): f for f in firmen for q in f.get('quellen', [])}
    for f in firmen:
        # Quellen dieses vollständigen Schnappschusses werden unten neu aufgebaut.
        f['quellen'] = [q for q in f.get('quellen', []) if q not in LISTEN]
    for k in kandidaten:
        q, host = k.get('wikidata_id'), domain(k.get('website'))
        ids = [f for f in firmen if q and f.get('wikidata_id') == q]
        treffer = ids or [f for f in firmen if host and domain(f.get('website')) == host
                         and not (q and f.get('wikidata_id') and q != f['wikidata_id'])]
        if not q and not host and (k['liste_id'], k['name']) in quelleneintraege:
            treffer = [quelleneintraege[(k['liste_id'], k['name'])]]
        kompatibel = [f for f in treffer if not (_portal(f) and _portal(k) and _portal(f) != _portal(k))]
        if len(kompatibel) == 1:
            f = kompatibel[0]
            if q and not f.get('wikidata_id'):
                f['wikidata_id'] = q
        else:
            name = k['name']
            if treffer:
                bericht.append(f'Verschiedene oder mehrdeutige Portale: {name}')
            if any(f['name'] == name for f in firmen):
                bericht.append(f'Name mehrfach: {name}; getrennte Prüfung erforderlich')
                basis = name + ' (' + (host or q or 'Zuordnung offen') + ')'
                name, n = basis, 2
                while any(f['name'] == name for f in firmen):
                    name, n = f'{basis} {n}', n + 1
            branche = next((b for b in k.get('branchen', [k.get('branche_wd')]) if b in zuordnung), None)
            if branche is None:
                bericht.append(f"Branche ohne Zuordnung: {k.get('branche_wd') or 'unbekannt'} ({name})")
            zahl = k.get('mitarbeitende')
            groesse = '' if zahl is None else '<50' if zahl < 50 else '50–249' if zahl < 250 else '250–999' if zahl < 1000 else '1.000+'
            f = {feld: '' for feld in SPALTEN}
            f.update(name=name, website=k.get('website') or '',
                     wikidata_id=q if not ids else '', quellen=[], aktiv='nein', status='offen',
                     kategorie=[kategorie_fuer(branche, zuordnung)], groesse_klasse=groesse,
                     mitarbeitende_ca=str(zahl or ''), hauptsitz=k.get('hauptsitz') or '')
            if _portal(k):
                f.update(ats_typ=k['ats_typ'], ats_id=k['ats_id'])
            firmen.append(f)
        if k['liste_id'] not in f['quellen']:
            f['quellen'].append(k['liste_id'])
        # Übertragungsname für Ranglisten; Eingabeobjekt bleibt unangetastet.
    for f in firmen:
        if not f['quellen']:
            f['aktiv'] = 'nein'
            if f.get('status') == 'aktiv':
                f['status_grund'] = 'keine aktuelle Rangliste'
        elif f.get('status') == 'aktiv' and f.get('status_grund') == 'keine aktuelle Rangliste':
            f['aktiv'] = 'ja'
            f['status_grund'] = ''
    return firmen, bericht


def firmenname(k, firmen):
    treffer = [f for f in firmen if k['liste_id'] in f.get('quellen', []) and
               ((k.get('wikidata_id') and f.get('wikidata_id') == k['wikidata_id']) or
                (domain(k.get('website')) and domain(f.get('website')) == domain(k['website'])))]
    if len(treffer) == 1:
        return treffer[0]['name']
    return next((f['name'] for f in firmen if f['name'] == k['name']), None)


def ausgaben(kandidaten, heute):
    datum = date.fromisoformat(heute)
    ende = datum.replace(year=datum.year + 1, day=min(datum.day, calendar.monthrange(datum.year + 1, datum.month)[1]))
    result = []
    for liste in sorted({k['liste_id'] for k in kandidaten}):
        name, herausgeber, kategorie, quelle, lizenz = LISTEN[liste]
        firmen = {}
        for k in kandidaten:
            if k['liste_id'] == liste:
                firma = k.get('unternehmen', k['name'])
                rang = k.get('rang')
                if firma not in firmen or (rang is not None and rang < (firmen[firma] or 10**9)):
                    firmen[firma] = rang
        jahr = max((k.get('jahr') or datum.year for k in kandidaten if k['liste_id'] == liste))
        result.append({'liste': dict(id=liste, name=name, herausgeber=herausgeber, aktiv=True, kategorie=kategorie),
                       'ausgabe': dict(id=f'{liste}-{heute}', jahr=jahr, veroeffentlicht_am=heute,
                                       geprueft_am=heute, quelle_url=quelle, lizenz=lizenz,
                                       gueltig_bis=ende.isoformat(), freigegeben=liste != 'epa-patente'),
                       'firmen': [dict(unternehmen=n, rang=r) for n, r in firmen.items()]})
    return result
