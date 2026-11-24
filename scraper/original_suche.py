"""Originalstellen zu privaten Bewerbungen suchen; nach außen ausschließlich Zähler."""
from contextlib import redirect_stdout, redirect_stderr
import io
import ipaddress
import os
import re
from urllib.parse import urlsplit

from scraper import db, http, ki, nachruesten
from scraper.ats import ADAPTER
from scraper import einrichtung
from scraper.einrichtung import finde_portal
from scraper.quellen import wikidata
from scraper.titel_vergleich import vergleiche

_STANDARD = object()


def _original_url(url):
    if not isinstance(url, str) or re.search(r'[\s\\\x00-\x1f\x7f]', url):
        return False
    try:
        u = urlsplit(url)
        host = (u.hostname or '').lower().removesuffix('.')
        if (u.scheme != 'https' or not host or '%' in host or u.port not in (None,443)
                or not all(host.split('.'))
                or host == 'localhost' or host.endswith('.localhost')
                or u.username is not None or u.password is not None or nachruesten.ist_portal(host)):
            return False
        try:
            ipaddress.ip_address(host)
            return False  # Gleicher Domainnamenvertrag wie bei der Web-Auswahl.
        except ValueError:
            return not re.fullmatch(r'(?:0x[0-9a-f]+|[0-9]+)(?:\.(?:0x[0-9a-f]+|[0-9]+))*\.?', host, re.I)
    except ValueError:
        return False


def _portal_ok(portal):
    if not isinstance(portal, dict):
        return False
    typ, id = portal.get('typ'), portal.get('id')
    if not isinstance(id, str) or not id or len(id) > 2048:
        return False
    if typ in {'greenhouse', 'ashby', 'personio'}:
        return bool(re.fullmatch(r'[A-Za-z0-9_-]{1,200}', id))
    if typ == 'recruitee':
        return bool(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.recruitee\.com', id))
    if typ == 'sitemap':
        url, sep, pfad = id.partition('#')
        return bool(sep and pfad.startswith('/') and not re.search(r'[\s\\]', id)
                    and _original_url(url))
    return False


def _stelle_ok(stelle):
    if not isinstance(stelle, dict) or not isinstance(stelle.get('titel'), str) or not stelle['titel'].strip():
        return False
    if not isinstance(stelle.get('url'), str) or not isinstance(stelle.get('ext_id'), (str, int)):
        return False
    return _original_url(stelle['url'])


def _suche(a, holen, adapter, frage, pruefe):
    def sicher_holen(url, **kw):
        pruefe(url)
        return holen(url, pruefe=pruefe)

    wahl = a.get('original_wahl')
    gewaehlt = None
    if wahl is not None:
        vorschlaege = a.get('original_vorschlaege')
        if (type(wahl) is not int or not isinstance(vorschlaege, list) or len(vorschlaege) > 5
                or wahl < 0 or wahl >= len(vorschlaege) or not isinstance(vorschlaege[wahl], dict)):
            return {'original_suche': 'nicht_gefunden', 'original_wahl': None, 'original_vorschlaege': None}
        gewaehlt = vorschlaege[wahl]
        portal = {'typ': gewaehlt.get('ats_typ'), 'id': gewaehlt.get('ats_id')}
    else:
        if not a.get('firma') or not a.get('titel'):
            return {'original_suche': 'nicht_gefunden', 'original_wahl': None, 'original_vorschlaege': None}
        website = wikidata.website_zu_name(a['firma'], holen=sicher_holen)
        if not website:
            return {'original_suche': 'nicht_gefunden', 'original_wahl': None, 'original_vorschlaege': None}
        pruefe(website)
        portal = finde_portal(website, holen=sicher_holen)
    if not _portal_ok(portal) or portal['typ'] not in adapter:
        return {'original_suche': 'nicht_gefunden', 'original_wahl': None, 'original_vorschlaege': None}
    # Sämtliche verschachtelten Adapterabrufe einschließlich robots.txt/Redirects
    # verwenden den Zielschutz. Kein zeitweises Ersetzen globaler HTTP-Funktionen.
    stellen = adapter[portal['typ']](portal['id'])
    if not isinstance(stellen, list):
        raise ValueError('Ungültige Adapterantwort')
    kandidaten = []
    for s in stellen:
        try:
            if _stelle_ok(s):
                kandidaten.append(s)
        except ValueError:
            continue
    if gewaehlt is not None:
        treffer = [s for s in kandidaten if str(s['ext_id']) == str(gewaehlt.get('ext_id')) and s['url'] == gewaehlt.get('url')]
        erg = {'art': 'eindeutig', 'treffer': treffer[0]} if len(treffer) == 1 else {'art': 'keine'}
    else:
        erg = vergleiche(a['titel'], a.get('standort'), kandidaten)
    if erg['art'] == 'auswahl':
        sicher = []
        for s in erg['treffer'][:5]:
            try:
                pruefe(s['url'])
                sicher.append(s)
            except Exception:
                continue
        if not sicher:
            return {'original_suche': 'nicht_gefunden', 'original_wahl': None, 'original_vorschlaege': None}
        return {'original_suche': 'auswahl', 'original_wahl': None,
                'original_portal': portal, 'original_vorschlaege': [
                    {'titel': s['titel'], 'ort': s.get('ort'), 'url': s['url'],
                     'ats_typ': portal['typ'], 'ats_id': portal['id'], 'ext_id': str(s['ext_id'])}
                    for s in sicher]}
    if erg['art'] != 'eindeutig':
        return {'original_suche': 'nicht_gefunden', 'original_wahl': None, 'original_vorschlaege': None}
    s = erg['treffer']
    pruefe(s['url'])
    text, gliederung = s.get('text'), s.get('abschnitte')
    if not isinstance(text, str) or not text.strip():
        daten = nachruesten._lies(s['url'], sicher_holen, None, pruefe)
        text, gliederung = daten['text'], daten['gliederung']
    patch = nachruesten.snapshot_felder(gliederung, text, frage)
    patch.update(snapshot_text=text, standort=s.get('ort'), link=s['url'],
                 portal_link=a.get('portal_link') or a.get('link'), original_portal=portal,
                 original_suche='gefunden', original_vorschlaege=None, original_wahl=None, nachruesten=False)
    return patch


def lauf(holen=http.hole, adapter=None, frage=_STANDARD, pruefe=None):
    adapter = ADAPTER if adapter is None else adapter
    pruefe = pruefe or nachruesten.pruefe_ziel
    if frage is _STANDARD:
        frage = ki.frage_groq if os.environ.get('GROQ_API_KEY') else None
    zaehler = dict(gesucht=0, gefunden=0, auswahl=0, nicht_gefunden=0)
    for alt in db.bewerbungen_original_offen(limit=20)[:20]:
        # Vor einem Abruf nochmals lesen: inzwischen gelöscht/verknüpft/abgewählt?
        a = db.bewerbung_original(alt['id'], alt['owner_id'])
        if (not a or a.get('job_id') or a.get('original_suche') != 'offen'
                or a.get('geaendert_am') != alt.get('geaendert_am')):
            continue
        zaehler['gesucht'] += 1
        try:
            # Grenzen wie die Probe der Einrichtung: eine Bewerbung darf nie den Täglichen Lauf sprengen (Review 2026-11-24)
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()), http.zielschutz(pruefe, gepinnt=True), \
                    einrichtung.probegrenzen():
                patch = _suche(a, holen, adapter, frage, pruefe)
        except (ki.Erschoepft, ki.GroqWeg):
            break  # Markierung bleibt offen, kein halber Abschluss.
        except Exception:
            patch = {'original_suche': 'nicht_gefunden', 'original_vorschlaege': None, 'original_wahl': None}
        erg = db.setze_original(a['id'], patch, a['owner_id'], a['geaendert_am'])
        if erg.get('status') == 'gespeichert':
            zaehler[patch['original_suche']] += 1
        elif erg.get('status') == 'doppelt':
            zaehler['nicht_gefunden'] += 1
    print('Original-Suche: '+', '.join(f'{n} {k}' for k, n in zaehler.items()))
    return zaehler


if __name__ == '__main__':
    lauf()
