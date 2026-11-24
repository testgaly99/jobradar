"""Monatliche offene Quellen; nur normalisierte Ergebnisse, nie Rohseiten speichern."""
import csv
from datetime import date
from io import BytesIO, StringIO
import json
import hashlib
from pathlib import Path
from zipfile import ZipFile
import re
import time

from scraper import http
from scraper.companies import SPALTEN, lade_unternehmen, wende_korrekturen_an
from scraper.fehler import kurzfehler
from scraper.kandidaten import LISTEN, ausgaben, zusammenfuehren, firmenname
from scraper.quellen import scoreboard, epa, wikidata
from scraper.rankings import pruefe_ausgabe
from scraper.run import _schreibe_text

SCOREBOARD_URL = 'https://knowledge-for-policy.ec.europa.eu/sites/default/files/World2000%282004-2025%29.zip'
EPA_URL = 'https://link.epo.org/web/about-us/statistics/top-100-applicants-epo-technology-dashboard-2025.xlsx'


def _scoreboard(daten):
    with ZipFile(BytesIO(daten)) as z:
        namen = sorted(n for n in z.namelist() if n.lower().endswith('.xlsx') and 'world' in n.lower())
        if not namen:
            raise ValueError('Scoreboard enthält keine Jahresdatei')
        if z.getinfo(namen[-1]).file_size > 64 * 1024 * 1024:
            raise ValueError('Jahresdatei zu groß')
        kandidaten = scoreboard.lies(z.read(namen[-1]))
        jahr = re.search(r'20\d{2}', Path(namen[-1]).name)
        if jahr:
            for k in kandidaten:
                k['jahr'] = int(jahr.group())
        return kandidaten


def _url(abfrage):
    return wikidata.url(abfrage)


def _arbeitgeber(daten):
    with open(Path(__file__).parents[1] / 'data/arbeitgeber_ausschluss.csv', encoding='utf-8-sig', newline='') as f:
        return wikidata.top_arbeitgeber(json.loads(daten), list(csv.DictReader(f)))


QUELLEN = {'scoreboard-world': (SCOREBOARD_URL, _scoreboard), 'epa-patente': (EPA_URL, epa.lies),
           'top200-arbeitgeber': (_url(wikidata.vorlage('arbeitgeber')), _arbeitgeber)}
for _liste, _q in [('dax', 'Q155718'), ('mdax', 'Q595622'), ('sdax', 'Q448445'), ('tecdax', 'Q378967')]:
    QUELLEN[_liste] = (_url(wikidata.vorlage('index').replace('{INDEX}', 'wd:' + _q)),
                       lambda b, liste=_liste: wikidata.lies(json.loads(b), liste))


def lies_json(pfad, standard):
    return json.loads(pfad.read_text(encoding='utf-8')) if pfad.exists() else standard


def schreibe_json(pfad, daten):
    _schreibe_text(pfad, json.dumps(daten, ensure_ascii=False, indent=2) + '\n')


def schreibe_firmen(pfad, firmen):
    s = StringIO(newline='')
    w = csv.DictWriter(s, SPALTEN, lineterminator='\n', extrasaction='ignore')
    w.writeheader()
    for f in firmen:
        w.writerow({k: ';'.join(v) if isinstance(v, list) else v for k, v in f.items()})
    _schreibe_text(pfad, s.getvalue())


def bereinige_dateien(d, heute):
    """Abgelaufene normalisierte Ausgaben entfernen; keine Firmen/Bewerbungen löschen."""
    for p in (d / 'ranglisten').glob('*.json'):
        a = lies_json(p, {})
        if a['ausgabe']['gueltig_bis'] <= heute:
            p.unlink()


def _wikidata_suche(name, holen, warte):
    """Ein Namensabgleich; bei Drosselung (429) oder Serverfehler einmal warten und neu versuchen."""
    try:
        return wikidata.suche_name(name, holen)
    except Exception as e:
        antwort = getattr(e, 'response', None)
        status = getattr(antwort, 'status_code', None)
        if status != 429 and not (isinstance(status, int) and status >= 500):
            raise
        try:
            pause = int(antwort.headers.get('Retry-After', 30))
        except (TypeError, ValueError):
            pause = 30
        warte(min(max(pause, 1), 120))
        return wikidata.suche_name(name, holen)


def _anreichern(kandidaten, holen, bericht, warte=None):
    # Ein QLever-Fehler kostet nur diese Firma, nie die ganze Liste (live 2026-11-24: 429/500 verwarf Scoreboard/EPA).
    warte = warte or time.sleep
    folge = 0
    for k in kandidaten:
        if k.get('wikidata_id') or k.get('website'):
            continue
        if folge >= 5:
            bericht.append('Wikidata-Abgleich nach 5 Fehlern in Folge abgebrochen; übrige Firmen ohne Abgleich')
            break
        try:
            antwort = _wikidata_suche(k['name'], holen, warte)
        except Exception as e:
            folge += 1
            bericht.append(f"Wikidata nicht erreichbar: {k['name']} ({kurzfehler(e)})")
            continue
        folge = 0
        q = wikidata.name_zu_id(k['name'], k.get('land', ''), suche=lambda _: antwort)
        if q:
            k['wikidata_id'] = q
            rows = [r for r in antwort['results']['bindings'] if r['firma']['value'].endswith('/' + q)]
            stammdaten = wikidata.lies({'results': {'bindings': rows}})[0]
            for feld in ('website', 'hauptsitz', 'branche_wd', 'branchen'):
                if stammdaten.get(feld):
                    k[feld] = stammdaten[feld]
            if rows and any('name' in r for r in rows):
                k['name'] = stammdaten['name']
            if not k.get('mitarbeitende'):
                k['mitarbeitende'] = stammdaten['mitarbeitende']
        else:
            bericht.append('Wikidata nicht eindeutig: ' + k['name'])


def lauf(heute, datenordner='data', holen=None):
    date.fromisoformat(heute)
    holen = holen or http.hole
    d = Path(datenordner); d.mkdir(parents=True, exist_ok=True)
    (d / 'ranglisten').mkdir(exist_ok=True)
    stand = lies_json(d / 'quellen_stand.json', {})
    bestand = lade_unternehmen(d / 'companies.csv') if (d / 'companies.csv').exists() else []
    bereinige_dateien(d, heute)
    alt = {p.stem: lies_json(p, {}) for p in (d / 'ranglisten').glob('*.json')}
    metadaten = lies_json(d / 'quellen_ausgaben.json', {})
    frisch, bericht = {}, {'geholt': [], 'fehler': [], 'hinweise': []}
    for liste, (url, parser) in QUELLEN.items():
        if stand.get(liste, '')[:7] == heute[:7]:
            continue
        # Auch Fehlversuche zählen: keine Wiederholungsflut innerhalb eines Monats.
        stand[liste] = heute
        try:
            kandidaten = parser(holen(url).content)
            if not kandidaten:
                raise ValueError('Leere Quelle; alte Ausgabe bleibt erhalten')
            _anreichern(kandidaten, holen, bericht['hinweise'])
            digest = hashlib.sha256(json.dumps(kandidaten, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            meta = metadaten.get(liste, {})
            if meta.get('fingerabdruck') == digest and meta.get('gueltig_bis', '') <= heute:
                bericht['hinweise'].append(f'{liste}: unveränderte Ausgabe abgelaufen; keine Wiederaufnahme')
                continue
            if meta.get('fingerabdruck') != digest:
                datum = ausgaben(kandidaten, heute)[0]['ausgabe']
                metadaten[liste] = dict(fingerabdruck=digest, veroeffentlicht_am=heute, gueltig_bis=datum['gueltig_bis'])
            frisch[liste] = kandidaten
            bericht['geholt'].append(liste)
            soll = {'dax': 40, 'mdax': 50, 'sdax': 70, 'tecdax': 30}.get(liste)
            if soll and len(kandidaten) != soll:
                bericht['hinweise'].append(f'{liste}: {len(kandidaten)} statt {soll} Mitglieder')
        except Exception as e:
            bericht['fehler'].append(f'{liste}: {kurzfehler(e)}')
    alle = [k for gruppe in frisch.values() for k in gruppe]
    for liste, a in alt.items():
        if liste in frisch:
            continue
        for z in a['firmen']:
            f = next((f for f in bestand if f['name'] == z['unternehmen']), {})
            alle.append(dict(name=z['unternehmen'], liste_id=liste, rang=z.get('rang'),
                             wikidata_id=f.get('wikidata_id'), website=f.get('website')))
    firmen, hinweise = zusammenfuehren(alle, bestand)
    firmen = wende_korrekturen_an(firmen, d / 'firmen_korrekturen.csv')
    bericht['hinweise'] += hinweise
    for liste, gruppe in frisch.items():
        zugeordnet = []
        for k in gruppe:
            name = firmenname(k, firmen)
            if not name:
                raise ValueError('Kandidatenzuordnung nicht eindeutig')
            zugeordnet.append(dict(k, unternehmen=name))
        a = ausgaben(zugeordnet, heute)[0]
        a['ausgabe']['quelle_url'] = QUELLEN[liste][0] if liste in {'scoreboard-world', 'epa-patente'} else LISTEN[liste][3]
        # Unveränderte Jahrestabellen nicht durch Monatsabruf künstlich verjüngen.
        vorher = alt.get(liste)
        if vorher and vorher['firmen'] == a['firmen']:
            a = vorher
        pruefe_ausgabe(a, {f['name'] for f in firmen})
        schreibe_json(d / 'ranglisten' / (liste + '.json'), a)
    schreibe_firmen(d / 'companies.csv', firmen)
    schreibe_json(d / 'quellen_stand.json', stand)
    schreibe_json(d / 'quellen_ausgaben.json', metadaten)
    _schreibe_text(d / 'kandidaten_bericht.md', '# Ranglisten-Abruf ' + heute + '\n\n' +
                   '\n'.join('- ' + s for s in bericht['fehler'] + bericht['hinweise']) + '\n')
    return bericht


if __name__ == '__main__':
    lauf(date.today().isoformat())
