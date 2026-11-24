"""Einmalige, fortsetzbare Einrichtung über offizielle Karriereseiten."""
from collections import defaultdict
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
import re
import time
import contextlib
import io
from urllib.parse import urldefrag, urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import requests

from scraper import http
from scraper.ats import ADAPTER, liste, sitemap
from scraper.ats_erkennung import erkenne_portal
from scraper.companies import lade_unternehmen, wende_korrekturen_an
from scraper.fehler import kurzfehler
from scraper.filter import ist_relevant
from scraper.http import ist_portal, registrierbare_domain as _regdom
from scraper.ranglisten_holen import lies_json, schreibe_json, schreibe_firmen
from scraper.run import _schreibe_text

PFADE = ['', '/karriere', '/careers', '/jobs', '/de/karriere', '/en/careers']
# Suche (Plan 2026-11-24): Karriere-Links auch auf andere Adressen, Unteradressen, Sitemap/Stellenliste mit JobPosting
SUCHVERSION = 1  # erhöhen, wenn die Suche besser wird: dann werden alle nicht aktiven Firmen erneut versucht
UNTERADRESSEN = ('jobs', 'karriere', 'careers', 'career')
MAX_SEITEN, MAX_TIEFE, MAX_SITEMAPS, PROBE_NEU = 25, 3, 8, 20
KARRIERE = re.compile(r'karriere|career|jobs?(?:[./_-]|$)|stellen|join-?us|arbeiten-bei|createyourown', re.I)
NICHT_FOLGEN = re.compile(r'linkedin|xing|stepstone|indeed|facebook|instagram|youtube|twitter|tiktok|pinterest'
                          r'|glassdoor|kununu|wikipedia|apps\.apple|play\.google', re.I)
_STELLENWORT = r'(?:job|jobs|stelle|stellen|stellenangebote?|stellenboerse|jobdetail|job-detail|offer|position|vacancy|requisition)s?'
STELLE = re.compile(rf'/{_STELLENWORT}/[^/?#]{{3,}}|[?&]job[_-]?id=\w', re.I)
LISTENENDE = re.compile(r'/(?:jobs|stellen|search|suche)/?$', re.I)
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


class _Robots:
    """robots.txt je Host höchstens einmal lesen; 4xx = keine robots.txt (None), andere Fehler gehen durch."""
    def __init__(self, holen):
        self.holen, self.texte = holen, {}

    def text(self, basis):
        if basis not in self.texte:
            try:
                self.texte[basis] = self.holen(basis + '/robots.txt').text
            except requests.HTTPError as exc:
                if not 400 <= getattr(exc.response, 'status_code', 0) < 500:
                    raise
                self.texte[basis] = None
        return self.texte[basis]


def _stellenseite(holen, url):
    """Trägt die Seite eine Stelle? JobPosting (JSON-LD/Microdata) oder Avatures Feldstruktur."""
    try:
        seite = holen(url).text
    except Exception:
        return False
    try:
        sitemap._jobposting(seite)
        return True
    except ValueError:
        return 'article__content__view__field' in seite and 'og:title' in seite


def _merkmal(url):
    m = re.search(rf'/{_STELLENWORT}/', urlsplit(url).path, re.I)
    return m.group(0) if m else ''


def _stellenadressen(locs):
    """Stellenadressen nach Muster; sonst Adressen wie Mercedes' „…-titel-235908-mer00047kx“ (Probe entscheidet)."""
    treffer = [x for x in locs if STELLE.search(urlsplit(x).path + '?' + urlsplit(x).query)
               and not LISTENENDE.search(urlsplit(x).path)]
    return treffer or [x for x in locs if re.search(r'/[^/]*-[^/]*-[^/]*\d{4,}[^/]*/?$', urlsplit(x).path)]


def _bestaetigt(holen, adressen):
    proben = list(dict.fromkeys([adressen[len(adressen) // 2], adressen[0]]))
    return all(_stellenseite(holen, u) for u in proben)


def _sitemap_quelle(basis, holen, robots):
    """Stellen-Sitemap eines Hosts: aus robots.txt (gleiche Firma) oder /sitemap.xml, bestätigt durch zwei Stellenseiten."""
    text = robots.text(basis) or ''
    karten = [l.split(':', 1)[1].strip() for l in text.splitlines() if l.lower().startswith('sitemap:')]
    karten = [k for k in karten if urlsplit(k).scheme == 'https'
              and _regdom(urlsplit(k).hostname) == _regdom(urlsplit(basis).hostname)] or [basis + '/sitemap.xml']
    for karte in karten[:3]:
        ziele, n, adressen, fund = [karte], 0, [], karte
        while ziele and n < MAX_SITEMAPS and not adressen:
            z = ziele.pop(0)
            n += 1
            try:
                w = sitemap.xml_aus(holen(z).content)
            except http.VerbotenDurchRobots:
                raise
            except Exception:
                continue
            locs = [e.text.strip() for e in w.iter() if e.tag.endswith('loc') and e.text]
            if w.tag.endswith('sitemapindex'):
                vorne = [x for x in locs if re.search(r'job|stelle|position|career|vacanc', x, re.I)]
                ziele = vorne[:6] + ziele + [x for x in locs if x not in vorne][:3]
            else:
                adressen, fund = _stellenadressen(locs), z
        if adressen and _bestaetigt(holen, adressen):
            merkmal = _merkmal(adressen[0])
            # Ohne Stellenwort in der Adresse würde '' jede Seite der Website treffen: dann nur die Teil-Sitemap der Stellen
            return dict(ats_typ='sitemap', ats_id=(karte if merkmal else fund) + '#' + merkmal, careers_url=basis)
    return None


def _listen_quelle(seiten_url, links, holen):
    """Seite listet mindestens drei Stellen desselben Hosts mit gemeinsamem Merkmal (Avature, rexx …)."""
    host = urlsplit(seiten_url).hostname
    stellen = list(dict.fromkeys(l for l in links if urlsplit(l).hostname == host and _merkmal(l)
                                 and STELLE.search(urlsplit(l).path) and not LISTENENDE.search(urlsplit(l).path)))
    if len(stellen) < 3 or not any(liste._blaetterseite(l, seiten_url) for l in links) or not _bestaetigt(holen, stellen):
        return None
    return dict(ats_typ='liste', ats_id=urldefrag(seiten_url)[0] + '#' + _merkmal(stellen[0]), careers_url=seiten_url)


def _suche(url, holen, robots):
    """Breitensuche ab der Website: Unteradressen, übliche Pfade, Karriere-Links (auch fremde Hosts der Firma)."""
    start = urlsplit(url)
    basis, dom = f'https://{start.netloc}', _regdom(start.hostname)
    ziele = [(url, 0)] + [(f'https://{s}.{dom}/', 1) for s in UNTERADRESSEN if f'{s}.{dom}' != start.hostname]
    ziele += [(basis + p, 1) for p in PFADE if basis + p != url]
    besucht, geprueft, sitemap_hosts, gesperrt = set(), set(), set(), set()
    e = dict(kandidaten={}, unbekannt=[], verboten=False, abgelehnt=False, erreicht=0)
    while ziele and len(besucht) < MAX_SEITEN:
        ziel, tiefe = ziele.pop(0)
        if ziel in besucht or ist_portal(urlsplit(ziel).hostname or '') or urlsplit(ziel).hostname in gesperrt:
            continue
        besucht.add(ziel)
        try:
            antwort = holen(ziel)
        except http.VerbotenDurchRobots:
            e['verboten'] = True
            continue
        except requests.HTTPError as exc:
            if getattr(exc.response, 'status_code', 0) == 403:  # Q288: Absage gilt für den ganzen Host, nie umgehen
                gesperrt.add(urlsplit(ziel).hostname)
                e['abgelehnt'] |= urlsplit(ziel).hostname == start.hostname
            continue
        except Exception:
            continue  # ein üblicher Pfad oder eine Unteradresse kann fehlen
        seiten_url = getattr(antwort, 'url', None) or ziel
        if ist_portal(urlsplit(seiten_url).hostname or ''):
            continue  # Weiterleitung auf ein Jobportal: nie verwenden
        e['erreicht'] += 1
        if portal_art(seiten_url):
            e['unbekannt'].append(seiten_url)
        for k in portal_links(antwort.text, seiten_url):
            e['kandidaten'][(k['ats_typ'], k['ats_id'])] = k
        links = _Links(antwort.text, seiten_url).links
        for link in links:
            t = urlsplit(link)
            if portal_art(link):
                e['unbekannt'].append(link)
            elif t.hostname == urlsplit(seiten_url).hostname and '/job/' in t.path and t.hostname not in sitemap_hosts:
                sitemap_hosts.add(t.hostname)
                k = _sitemap_portal(seiten_url, holen, robots=robots)
                if k:
                    e['kandidaten'][(k['ats_typ'], k['ats_id'])] = k
            elif (tiefe < MAX_TIEFE and link not in besucht and not NICHT_FOLGEN.search(link)
                  and not ist_portal(t.hostname or '') and KARRIERE.search((t.hostname or '') + t.path)
                  # fremde Adressen nur von Seiten der Firma aus; innerhalb einer erreichten Gruppen-Domain weiter
                  and dom in (_regdom(urlsplit(seiten_url).hostname), _regdom(t.hostname))
                  or (tiefe < MAX_TIEFE and link not in besucht and not ist_portal(t.hostname or '')
                      and _regdom(t.hostname) == _regdom(urlsplit(seiten_url).hostname)
                      and KARRIERE.search((t.hostname or '') + t.path) and not NICHT_FOLGEN.search(link))):
                ziele.append((urldefrag(link)[0], tiefe + 1))
        if e['kandidaten'] or e['unbekannt']:
            break
        host = f'https://{urlsplit(seiten_url).hostname}'
        if host not in geprueft:
            geprueft.add(host)
            try:
                q = _sitemap_quelle(host, holen, robots)
            except http.VerbotenDurchRobots:
                e['verboten'], q = True, None
            except Exception:
                q = None
            if q:
                e['kandidaten'][(q['ats_typ'], q['ats_id'])] = q
                break
        q = _listen_quelle(seiten_url, links, holen)
        if q:
            e['kandidaten'][(q['ats_typ'], q['ats_id'])] = q
            break
    return e


def _sitemap_portal(url, holen, stellenpfad='/job/', robots=None):
    art = portal_art(url)
    if art and art not in {'workday', 'successfactors'}:
        return None
    t = urlsplit(url)
    basis = f'https://{t.netloc}'
    text = (robots or _Robots(holen)).text(basis)
    if text is None:
        return None  # ohne robots.txt bietet die Seite keine Sitemap an
    robots = RobotFileParser(); robots.parse(text.splitlines())
    if not robots.can_fetch(http.USER_AGENT, basis + stellenpfad):
        return None
    sitemaps = robots.site_maps() or []
    sitemaps = [s for s in sitemaps if urlsplit(s).scheme == 'https' and urlsplit(s).hostname == t.hostname]
    if not sitemaps:
        return None
    return dict(ats_typ='sitemap', ats_id=sitemaps[0] + '#' + stellenpfad, careers_url=url)


def _finde_portal(firma, holen=None):
    holen = holen or http.hole
    result = dict(firma, status='offen', aktiv='nein', status_grund='Karriereseite nicht gefunden')
    result.pop('ats_typ', None)
    result.pop('ats_id', None)
    url = firma.get('careers_url') or firma.get('website')
    if not url:
        return result
    if ist_portal(urlsplit(url).hostname or ''):  # LinkedIn, StepStone, Indeed …: nie abrufen
        return dict(result, status_grund='Website ist ein Jobportal (nicht abgerufen)')
    kandidaten, unbekannt, verboten, abgelehnt, erreicht = {}, [], False, False, 1
    robots = _Robots(holen)
    try:
        direkt = erkenne_portal(url)
        if direkt.status == 'erkannt':
            k = direkt.kandidat
            kandidaten[(k.ats_typ, k.ats_id)] = dict(ats_typ=k.ats_typ, ats_id=k.ats_id, careers_url=url)
        elif portal_art(url):
            unbekannt.append(url)
        else:
            e = _suche(url, holen, robots)
            kandidaten.update(e['kandidaten'])
            unbekannt += e['unbekannt']
            verboten, abgelehnt, erreicht = e['verboten'], e['abgelehnt'], e['erreicht']
        ungeklaert = {}
        for link in dict.fromkeys(unbekannt):
            try:
                k = _sitemap_portal(link, holen, robots=robots)
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
            elif abgelehnt:  # Q288: 403 auf den ehrlichen User-Agent gilt wie ein Verbot
                result['status_grund'] = 'lehnt Abruf ab (403)'
            elif not erreicht:
                result['status_grund'] = 'Website nicht erreichbar'
            return result
        k = next(iter(kandidaten.values()))
        result.update(k)
    except http.VerbotenDurchRobots:
        result['status_grund'] = 'robots.txt verbietet Abruf'
    except Exception as exc:
        result['status_grund'] = 'Probe fehlgeschlagen: ' + kurzfehler(exc)
    return result


def finde_portal(website, holen=None):
    """Nur Portal finden: keine Probe, keine Firma oder gemeinsame Stelle speichern."""
    ergebnis = _finde_portal({'website': website}, holen)
    if ergebnis.get('ats_typ') and ergebnis.get('ats_id'):
        return {'typ': ergebnis['ats_typ'], 'id': ergebnis['ats_id']}
    return None


def richte_ein(firma, holen=None, adapter=None):
    adapter = ADAPTER if adapter is None else adapter
    result = _finde_portal(firma, holen)
    if not result.get('ats_typ') or not result.get('ats_id'):
        return result
    k = result
    try:
        if k['ats_typ'] not in adapter:
            return dict(result, status='portal_nicht_unterstuetzt', status_grund=k['ats_typ'])
        with probegrenzen():
            antwort = adapter[k['ats_typ']](k['ats_id'])
        if not isinstance(antwort, list):
            raise ValueError('Ungültige Probeantwort')
        # Bekannte („unveraendert“) gibt es in der Einrichtung nicht; „vertagt“ = Tagesgrenze/429, kein Defekt
        stellen = [s for s in antwort if not (isinstance(s, dict) and 'uebersprungen' in s)]
        if any(not isinstance(s, dict) or 'titel' not in s for s in stellen):
            raise ValueError('Ungültige Probeantwort')
        if not stellen and len(antwort) > len(stellen):
            return dict(result, status='offen', aktiv='nein', status_grund='Ratenbegrenzung, später erneut')
        relevant = any(ist_relevant(s['titel'], s.get('ort', ''), s.get('remote', False))[0] for s in stellen)
        result.update(status='aktiv' if relevant else 'keine_stellen_de', aktiv='ja' if relevant else 'nein',
                      status_grund='' if relevant else 'keine passenden Stellen in DE/remote')
    except http.VerbotenDurchRobots:
        result['status_grund'] = 'robots.txt verbietet Abruf'
    except Exception as exc:
        result['status_grund'] = 'Probe fehlgeschlagen: ' + kurzfehler(exc)
    return result


@contextlib.contextmanager
def probegrenzen():
    """Probe in der Einrichtung: höchstens PROBE_NEU Stellenseiten und wenige Listenseiten (nicht der Tägliche Lauf)."""
    alt = sitemap.MAX_NEU, liste.MAX_SEITEN
    sitemap.MAX_NEU, liste.MAX_SEITEN = PROBE_NEU, 5
    try:
        yield
    finally:
        sitemap.MAX_NEU, liste.MAX_SEITEN = alt


def faellig(firma, eintrag, heute):
    """Erneut versuchen? Nie bei aktiven Firmen; sonst neue Suchversion oder letzter Versuch mind. 30 Tage her."""
    if firma.get('status') == 'aktiv':
        return False
    if not eintrag:
        return True
    if isinstance(eintrag, str):  # Stand vor SUCHVERSION: nur das Datum
        eintrag = {'datum': eintrag, 'suche': 0}
    try:
        alter = (heute - date.fromisoformat(eintrag['datum'])).days
    except (KeyError, TypeError, ValueError):
        return True
    return eintrag.get('suche', 0) < SUCHVERSION or alter >= 30


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


def lauf(datenordner='data', budget_s=17100, mit_db=True):  # 285 min, vor dem 300-min-Limit des Workflow-Schritts
    start, d = time.monotonic(), Path(datenordner)
    firmen = lade_unternehmen(d / 'companies.csv')
    stand = lies_json(d / 'einrichtung_stand.json', {})
    raenge = _raenge(d)
    reihenfolge = sorted(range(len(firmen)), key=lambda i: (raenge.get(firmen[i]['name'], 10**9), firmen[i]['name']))
    bearbeitet = 0
    for i in reihenfolge:
        f = firmen[i]
        if not faellig(f, stand.get(f['name']), date.today()):
            continue
        if time.monotonic() - start >= max(0, budget_s - 60):
            break
        firmen[i] = richte_ein(f)
        firmen = wende_korrekturen_an(firmen, d / 'firmen_korrekturen.csv')
        schreibe_firmen(d / 'companies.csv', firmen)
        if firmen[i].get('status_grund') != 'Ratenbegrenzung, später erneut':  # 429: beim nächsten Lauf gleich wieder
            stand[f['name']] = {'datum': date.today().isoformat(), 'suche': SUCHVERSION}
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
    if mit_db:
        from scraper import db
        privat=[]
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            for f in db.db_firmen('offen'):
                if f.get('fuer_alle', True) is False and f.get('nutzer', 0) <= 0:
                    continue
                if time.monotonic()-start >= max(0,budget_s-60):
                    break
                if not f.get('website') and not f.get('careers_url'):
                    ergebnis=dict(f,status='offen',aktiv='nein',status_grund='keine Website bekannt')
                else:
                    ergebnis=richte_ein(f)
                db.setze_einrichtung(f['name'],ergebnis)
                if ergebnis.get('status') != 'aktiv':
                    privat.append((f['name'],ergebnis.get('status_grund','')))
        # Nur lokal; niemals in öffentliche Commits, Logs oder Artefakte hochladen.
        _schreibe_text(d/'einrichtung_privat.md','# Private Einrichtung\n\n'+'\n'.join(text(n)+': '+text(g) for n,g in privat)+'\n')
    return dict(bearbeitet=bearbeitet, portale=statistik)


if __name__ == '__main__':
    lauf()
