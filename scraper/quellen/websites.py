"""Website zu Firmennamen über Wikidata (CC0, QLever), nur wenn eindeutig (Plan 2026-11-24 „Websites ergänzen“).

Scoreboard und EPA liefern nur Namen. Abgleich ohne Groß-/Kleinschreibung gegen die englische Bezeichnung, danach gegen
alternative Bezeichnungen. Mehrere Einträge (Landesgesellschaften): aufgelöste raus, sonst der bekannteste, wenn er
mindestens doppelt so viele Wikipedia-Sprachen hat wie der zweite. QLever bricht nach ~30 s ab: kleine Pakete.
"""
import json
import re
import time
from urllib.parse import urlsplit

from scraper import http
from scraper.quellen import wikidata

PAKET, PAKET_ALIAS, PAUSE_S = 40, 15, 5
TYPEN = 'wd:Q4830453 wd:Q891723 wd:Q6881511 wd:Q783794 wd:Q43229'
_ZUSATZ = re.compile(r'(?i)(?<![\w])(holding|holdings|group|gruppe|company|co|corporation|incorporated|limited|ltd|inc'
                     r'|corp|plc|ag|se|gmbh|kgaa|kg|sa|nv|n\.v|spa|s\.p\.a|ab|asa|oyj|kk|investment'
                     r'|gesellschaft mit beschraenkter haftung|& co|the|ind|mfg)(?![\w])\.?')


def _kern(name):
    k = re.sub(r'\.com\b', '', name, flags=re.I)
    k = re.sub(r'\(.*?\)', ' ', k)
    for _ in range(3):
        k = _ZUSATZ.sub(' ', k)
    k = re.sub(r'[^\w&\- ]', ' ', k)
    return re.sub(r'\s+', ' ', k).strip()


def varianten(name):
    """Kleingeschriebene Schreibweisen: wie geliefert, ohne Satzzeichen, ohne Rechtsform und Zusätze."""
    return sorted({name.strip().casefold(), re.sub(r'[,.]', '', name).strip().casefold(), _kern(name).casefold()} - {''})


def website_von(url):
    """Startadresse der Firma: Unterseiten wie investors.spotify.com oder english.cscec.com auf die Firmendomain."""
    host = (urlsplit(url or '').hostname or '').lower()
    if not host:
        return ''
    dom = http.registrierbare_domain(host)
    return f'https://{host}' if host in (dom, 'www.' + dom) else f'https://www.{dom}'


def _abfrage(text, holen, schlafen):
    """Eine Abfrage; bei 429/5xx bis zu dreimal länger warten (öffentlicher Dienst)."""
    for versuch in range(4):
        try:
            return wikidata._rows(wikidata.abfrage(text, holen))
        except Exception as e:
            status = getattr(getattr(e, 'response', None), 'status_code', None)
            if versuch == 3 or not (status == 429 or (isinstance(status, int) and status >= 500)):
                raise
            schlafen(60 * (versuch + 1))


def _bezeichnungen(werte, eigenschaft, groesse, holen, schlafen):
    zeilen = []
    for i in range(0, len(werte), groesse):
        schlafen(PAUSE_S)
        liste = ', '.join(json.dumps(v, ensure_ascii=False) for v in werte[i:i + groesse])
        try:
            zeilen += _paket(liste, eigenschaft, holen, schlafen)
        except Exception:  # ein schlechtes Paket kostet nur seine Namen, nicht alle Treffer
            continue
    return zeilen


def _paket(liste, eigenschaft, holen, schlafen):
    return _abfrage(f'''SELECT ?firma ?lc ?web WHERE {{
          ?firma wdt:P856 ?web .
          ?firma {eigenschaft} ?lab . FILTER(LANG(?lab) = "en")
          BIND(LCASE(STR(?lab)) AS ?lc)
          FILTER(?lc IN ({liste}))
          ?firma wdt:P31/wdt:P279? ?typ . VALUES ?typ {{ {TYPEN} }}
        }}''', holen, schlafen)


def _bevorzugt(urls):
    """Mehrere Websites eines Eintrags: erst .de, dann .com, sonst die erste (nicht rossmann.es, cewe.fr …)."""
    rang = lambda u: (0 if (urlsplit(u).hostname or '').endswith('.de') else 1 if (urlsplit(u).hostname or '').endswith('.com') else 2)
    return sorted(urls, key=rang)[0]


def _treffer(namen, zeilen):
    """name -> {qid: website}"""
    alle = {}
    for n in namen:
        vs = set(varianten(n))
        for z in zeilen:
            if z.get('lc') in vs and z.get('firma') and z.get('web'):
                alle.setdefault(n, {}).setdefault(z['firma'].rsplit('/', 1)[-1], []).append(z['web'])
    return {n: {q: _bevorzugt(u) for q, u in t.items()} for n, t in alle.items()}


def websites_zu_namen(namen, holen=None, schlafen=time.sleep):
    """name -> {'website', 'wikidata_id'} wenn eindeutig, sonst {'grund': 'mehrdeutig' | 'kein Treffer'}."""
    namen = list(dict.fromkeys(n for n in namen if isinstance(n, str) and n.strip()))
    treffer = _treffer(namen, _bezeichnungen(sorted({v for n in namen for v in varianten(n)}), 'rdfs:label', PAKET, holen, schlafen))
    rest = [n for n in namen if n not in treffer]
    if rest:
        treffer |= _treffer(rest, _bezeichnungen(sorted({v for n in rest for v in varianten(n)}), 'skos:altLabel',
                                                 PAKET_ALIAS, holen, schlafen))
    ids = sorted({q for t in treffer.values() for q in t})
    bekannt, aufgeloest = {}, set()
    for i in range(0, len(ids), 150):
        werte = ' '.join('wd:' + q for q in ids[i:i + 150])
        schlafen(PAUSE_S)
        for z in _abfrage('SELECT ?firma (COUNT(?sl) AS ?n) WHERE { VALUES ?firma { ' + werte
                          + ' } ?sl <http://schema.org/about> ?firma } GROUP BY ?firma', holen, schlafen):
            bekannt[z['firma'].rsplit('/', 1)[-1]] = int(z['n'])
        schlafen(PAUSE_S)
        for z in _abfrage('SELECT ?firma ?ende WHERE { VALUES ?firma { ' + werte + ' } ?firma wdt:P576 ?ende }', holen, schlafen):
            aufgeloest.add(z['firma'].rsplit('/', 1)[-1])
    aus = {}
    for n in namen:
        k = sorted(((q, w) for q, w in treffer.get(n, {}).items() if q not in aufgeloest), key=lambda x: -bekannt.get(x[0], 0))
        if len(k) == 1 or (len(k) >= 2 and bekannt.get(k[0][0], 0) >= 2 * max(bekannt.get(k[1][0], 0), 1)):
            aus[n] = {'website': website_von(k[0][1]), 'wikidata_id': k[0][0]}
        else:
            aus[n] = {'grund': 'mehrdeutig' if k else 'kein Treffer'}
    return aus
