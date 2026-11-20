"""SPARQL-Antworten zusammenfassen; Namenssuche nur eindeutig und landgleich."""
import json
from pathlib import Path
import re
from urllib.parse import urlencode

from scraper import http
from scraper.quellen import kandidat

ENDPUNKT = 'https://query.wikidata.org/sparql'
LAENDER = {'DE': 'Q183', 'US': 'Q30', 'GB': 'Q145', 'UK': 'Q145', 'FR': 'Q142',
           'CN': 'Q148', 'KR': 'Q884', 'JP': 'Q17', 'NL': 'Q55', 'CH': 'Q39',
           'SE': 'Q34', 'FI': 'Q33', 'DK': 'Q35', 'IT': 'Q38', 'ES': 'Q29', 'AT': 'Q40'}


def abfrage(text, holen=None):
    r = (holen or http.hole)(ENDPUNKT + '?' + urlencode({'query': text, 'format': 'json'}))
    return json.loads(r.content)


def vorlage(name):
    return (Path(__file__).parent / 'sparql' / (name + '.rq')).read_text(encoding='utf-8')


def _rows(antwort):
    rows = antwort['results']['bindings']
    if not isinstance(rows, list):
        raise ValueError('SPARQL-Antwort ungültig')
    return [{k: v['value'] for k, v in row.items()} for row in rows]


def lies(antwort, liste_id='dax'):
    firmen = {}
    for z in _rows(antwort):
        q = z['firma'].rsplit('/', 1)[-1]
        k = firmen.setdefault(q, kandidat(z.get('name', q), liste_id))
        k['wikidata_id'] = q
        if not k['website'] and z.get('website'):
            k['website'] = z['website']
        if not k['hauptsitz'] and z.get('hauptsitz'):
            k['hauptsitz'] = z['hauptsitz']
        zahl = int(float(z.get('mitarbeitende', '0')))
        k['mitarbeitende'] = max(k['mitarbeitende'] or 0, zahl) or None
        for feld in ('typen', 'branchen'):
            k[feld] = sorted(set(k.get(feld, [])) | {s.rsplit('/', 1)[-1] for s in re.split(r'[|\s]+', z.get(feld, '')) if s})
        k['branche_wd'] = k['branchen'][0] if k['branchen'] else None
    return list(firmen.values())


def top_arbeitgeber(antwort, ausschluss, anzahl=200):
    behalten = {z['wert'] for z in ausschluss if z['art'] == 'behalten'}
    typen = {z['wert'] for z in ausschluss if z['art'] == 'typ'}
    namen = [z['wert'].casefold() for z in ausschluss if z['art'] == 'name']
    result = [k for k in lies(antwort, 'top200-arbeitgeber') if k['wikidata_id'] in behalten or
              (not set(k['typen']) & typen and not any(n in k['name'].casefold() for n in namen))]
    result.sort(key=lambda k: (-(k['mitarbeitende'] or 0), k['name']))
    result = result[:min(anzahl, 200)]
    for rang, k in enumerate(result, 1):
        k['rang'] = rang
    return result


def _normal(name):
    name = re.sub(r'(?<!\w)(?:ag|se|gmbh|kgaa|inc|ltd|corp|plc|s\.?\s*a\.?|n\.?\s*v\.?)(?!\w)', ' ', name.casefold())
    return re.sub(r'[^\w]', '', name)


def suche_name(name, holen=None):
    # JSON-Quoting ist zugleich gültiges SPARQL-String-Quoting.
    text = vorlage('name_zu_id').replace('"{NAME}"', json.dumps(name, ensure_ascii=False))
    return abfrage(text, holen)


def name_zu_id(name, land, suche=None):
    rows = _rows((suche or suche_name)(name))
    ziel = LAENDER.get(land, land if re.fullmatch(r'Q\d+', land or '') else None)
    rows = [z for z in rows if (ziel and z.get('land', '').rsplit('/', 1)[-1] == ziel)
            or (land and land in {z.get('iso2'), z.get('iso3')})]
    for normal in (lambda s: s.casefold().strip(), _normal):
        ids = {z['firma'].rsplit('/', 1)[-1] for z in rows
               if any(normal(name) == normal(n) for n in z.get('namen', z.get('name', '')).split('|'))}
        if ids:
            return ids.pop() if len(ids) == 1 else None
    return None
