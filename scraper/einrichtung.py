"""Einmalige, fortsetzbare Einrichtung über offizielle Karriereseiten."""
from collections import defaultdict
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
import re
import time
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

from scraper import http
from scraper.ats import ADAPTER
from scraper.ats_erkennung import erkenne_portal
from scraper.companies import lade_unternehmen, wende_korrekturen_an
from scraper.fehler import kurzfehler
from scraper.filter import ist_relevant
from scraper.ranglisten_holen import lies_json, schreibe_json, schreibe_firmen
from scraper.run import _schreibe_text

PFADE = ['', '/karriere', '/careers', '/jobs', '/de/karriere', '/en/careers']
PORTAL_HOSTS = {
    'workday': r'(?:^|\.)myworkdayjobs\.com$|\.wd\d+\.myworkdaysite\.com$',
    'successfactors': r'(?:^|\.)successfactors\.(?:com|eu)$|^jobs\.sap\.com$',
    'smartrecruiters': r'(?:^|\.)smartrecruiters\.com$',
    'lever': r'(?:^|\.)lever\.co$', 'softgarden': r'(?:^|\.)softgarden\.io$',
    'join': r'(?:^|\.)join\.com$',
}


def portal_art(url):
    try:
        host = (urlsplit(url).hostname or '').lower()
    except ValueError:
        return None
    return next((art for art, muster in PORTAL_HOSTS.items() if re.search(muster, host)), None)


class _Links(HTMLParser):
    def __init__(self, html, basis):
        super().__init__(convert_charrefs=True)
        self.links, self.basis = [], basis
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            for k, v in attrs:
                if k == 'href' and v:
                    url = urljoin(self.basis, v)
                    if urlsplit(url).scheme == 'https':
                        self.links.append(url)


def portal_links(html, basis):
    result = {}
    for url in _Links(html, basis).links:
        e = erkenne_portal(url)
        if e.status == 'erkannt':
            k = e.kandidat
            result.setdefault((k.ats_typ, k.ats_id), dict(ats_typ=k.ats_typ, ats_id=k.ats_id, careers_url=url))
    return list(result.values())


def _sitemap_portal(url, holen, stellenpfad='/job/'):
    art = portal_art(url)
    if art and art not in {'workday', 'successfactors'}:
        return None
    t = urlsplit(url)
    basis = f'https://{t.netloc}'
    text = holen(basis + '/robots.txt').text
    robots = RobotFileParser(); robots.parse(text.splitlines())
    if not robots.can_fetch(http.USER_AGENT, basis + stellenpfad):
        return None
    sitemaps = robots.site_maps() or []
    sitemaps = [s for s in sitemaps if urlsplit(s).scheme == 'https' and urlsplit(s).hostname == t.hostname]
    if not sitemaps:
        return None
    return dict(ats_typ='sitemap', ats_id=sitemaps[0] + '#' + stellenpfad, careers_url=url)


def richte_ein(firma, holen=None, adapter=None):
    holen, adapter = holen or http.hole, ADAPTER if adapter is None else adapter
    result = dict(firma, status='offen', aktiv='nein', status_grund='Karriereseite nicht gefunden')
    url = firma.get('careers_url') or firma.get('website')
    if not url:
        return result
    kandidaten, unbekannt, verboten = {}, [], False
    try:
        direkt = erkenne_portal(url)
        if direkt.status == 'erkannt':
            k = direkt.kandidat
            kandidaten[(k.ats_typ, k.ats_id)] = dict(ats_typ=k.ats_typ, ats_id=k.ats_id, careers_url=url)
        elif portal_art(url):
            unbekannt.append(url)
        else:
            basis = f'https://{urlsplit(url).netloc}'
            ziele = list(dict.fromkeys([url] + [basis + p for p in PFADE]))
            besucht = set()
            while ziele:
                ziel = ziele.pop(0)
                if ziel in besucht:
                    continue
                besucht.add(ziel)
                try:
                    antwort = holen(ziel)
                except http.VerbotenDurchRobots:
                    verboten = True
                    continue
                except Exception:
                    continue  # ein üblicher Pfad kann fehlen
                seiten_url = getattr(antwort, 'url', None) or ziel
                if portal_art(seiten_url):
                    unbekannt.append(seiten_url)
                for k in portal_links(antwort.text, seiten_url):
                    kandidaten[(k['ats_typ'], k['ats_id'])] = k
                for link in _Links(antwort.text, seiten_url).links:
                    if portal_art(link):
                        unbekannt.append(link)
                    elif (urlsplit(link).hostname == urlsplit(url).hostname
                          and re.search(r'karriere|careers|jobs', urlsplit(link).path, re.I)
                          and link not in besucht and link not in ziele and len(besucht) + len(ziele) < 12):
                        ziele.append(link)
                    elif (urlsplit(link).hostname == urlsplit(seiten_url).hostname
                          and '/job/' in urlsplit(link).path):
                        k = _sitemap_portal(seiten_url, holen)
                        if k:
                            kandidaten[(k['ats_typ'], k['ats_id'])] = k
                if kandidaten or unbekannt:
                    break
        ungeklaert = {}
        for link in dict.fromkeys(unbekannt):
            try:
                k = _sitemap_portal(link, holen)
            except http.VerbotenDurchRobots:
                verboten = True; k = None
            if k:
                kandidaten[(k['ats_typ'], k['ats_id'])] = k
            else:
                t = urlsplit(link)
                ungeklaert[(t.hostname, t.path.strip('/').split('/')[0])] = link
        if len(kandidaten) + len(ungeklaert) > 1:
            result['status_grund'] = 'mehrere Portale: ' + ', '.join([k[0] for k in kandidaten] + sorted({portal_art(u) or 'sonstige' for u in ungeklaert.values()}))
            return result
        if not kandidaten:
            if unbekannt:
                result.update(status='portal_nicht_unterstuetzt', careers_url=unbekannt[0],
                              status_grund=portal_art(unbekannt[0]) or 'sonstige')
            elif verboten:
                result['status_grund'] = 'robots.txt verbietet Abruf'
            return result
        k = next(iter(kandidaten.values()))
        result.update(k)
        if k['ats_typ'] not in adapter:
            return dict(result, status='portal_nicht_unterstuetzt', status_grund=k['ats_typ'])
        stellen = adapter[k['ats_typ']](k['ats_id'])
        if not isinstance(stellen, list) or any(not isinstance(s, dict) or 'titel' not in s for s in stellen):
            raise ValueError('Ungültige Probeantwort')
        relevant = any(ist_relevant(s['titel'], s.get('ort', ''), s.get('remote', False))[0] for s in stellen)
        result.update(status='aktiv' if relevant else 'keine_stellen_de', aktiv='ja' if relevant else 'nein',
                      status_grund='' if relevant else 'keine passenden Stellen in DE/remote')
    except http.VerbotenDurchRobots:
        result['status_grund'] = 'robots.txt verbietet Abruf'
    except Exception as exc:
        result['status_grund'] = 'Probe fehlgeschlagen: ' + kurzfehler(exc)
    return result


def _raenge(d):
    result = {}
    for p in (d / 'ranglisten').glob('*.json'):
        for f in lies_json(p, {})['firmen']:
            if f.get('rang') is not None:
                result[f['unternehmen']] = min(result.get(f['unternehmen'], 10**9), f['rang'])
    return result


def portal_statistik(firmen, raenge):
    result = {}
    for f in firmen:
        if f.get('status') != 'portal_nicht_unterstuetzt':
            continue
        art = portal_art(f.get('careers_url', '')) or 'sonstige'
        z = result.setdefault(art, dict(anzahl=0, bester_rang=None, beispiele=[]))
        z['anzahl'] += 1
        rang = raenge.get(f['name'])
        if rang is not None:
            z['bester_rang'] = min(z['bester_rang'] or rang, rang)
        if len(z['beispiele']) < 3:
            z['beispiele'].append(f['name'])
    return result


def lauf(datenordner='data', budget_s=19800):
    start, d = time.monotonic(), Path(datenordner)
    firmen = lade_unternehmen(d / 'companies.csv')
    stand = lies_json(d / 'einrichtung_stand.json', {})
    raenge = _raenge(d)
    reihenfolge = sorted(range(len(firmen)), key=lambda i: (raenge.get(firmen[i]['name'], 10**9), firmen[i]['name']))
    bearbeitet = 0
    for i in reihenfolge:
        f = firmen[i]
        if f.get('status') != 'offen' or f['name'] in stand:
            continue
        if time.monotonic() - start >= max(0, budget_s - 60):
            break
        firmen[i] = richte_ein(f)
        firmen = wende_korrekturen_an(firmen, d / 'firmen_korrekturen.csv')
        schreibe_firmen(d / 'companies.csv', firmen)
        stand[f['name']] = date.today().isoformat()
        schreibe_json(d / 'einrichtung_stand.json', stand)
        bearbeitet += 1
    offen = sorted((f for f in firmen if f.get('status') != 'aktiv'), key=lambda f: raenge.get(f['name'], 10**9))
    def text(s):
        return str(s or '').replace('|', '/').replace('\n', ' ')
    zeilen = ['# Karriereseite nicht gefunden', '', '| Firma | Website | Bester Rang | Grund |', '|---|---|---|---|']
    for f in offen:
        zeilen.append('| ' + ' | '.join(text(s) for s in (f['name'], f.get('website'), raenge.get(f['name']), f.get('status_grund'))) + ' |')
    statistik = portal_statistik(firmen, raenge)
    zeilen += ['', '## Portal-Arten', '', '| Art | Anzahl Firmen | Bester Rang | Beispiele |', '|---|---|---|---|']
    for art, z in sorted(statistik.items()):
        zeilen.append(f"| {art} | {z['anzahl']} | {z['bester_rang'] or ''} | {text(', '.join(z['beispiele']))} |")
    _schreibe_text(d / 'karriereseite_nicht_gefunden.md', '\n'.join(zeilen) + '\n')
    return dict(bearbeitet=bearbeitet, portale=statistik)


if __name__ == '__main__':
    lauf()
