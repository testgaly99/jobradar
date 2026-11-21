"""Gesundheitsprüfung ohne KI. Öffentliche Issues ausschließlich für Dateifirmen."""
from collections import defaultdict
from datetime import date, timedelta
import os
import re
from urllib.parse import urlsplit, urlunsplit

import requests
from scraper import db, telegram
from scraper.companies import lade_unternehmen


def _zahl(wert):
    return wert if type(wert) is int and wert >= 0 else None


def _fehler(text):
    # Berichtfehler sind normalerweise bereits kurzfehler-Ausgaben. Niemals
    # beliebige alte Antwortkörper, Adressen oder Zugangsdaten weiterreichen.
    teile = re.findall(r'\b(?:HTTP [1-5][0-9]{2}|[A-Z][A-Za-z]{1,40}(?:Error|Fehler)|PGRST[0-9]{3})\b', str(text))
    return ', '.join(dict.fromkeys(teile))[:1000] or 'Abruf- oder Verarbeitungsfehler'


def pruefe(heute, vorher):
    tag = date.fromisoformat(heute['stand'])
    historie = []
    for b in vorher:
        try:
            datum = date.fromisoformat(b['stand'])
        except (ValueError, KeyError, TypeError):
            continue
        if tag - timedelta(days=7) <= datum < tag:
            historie.append(b)
    historie.sort(key=lambda b:b['stand'], reverse=True)
    probleme = []
    for f in heute.get('firmen', []):
        name = f.get('name')
        if not isinstance(name,str) or not name.strip():
            continue
        verlauf = [z['gefunden'] for b in historie[:7] for z in b.get('firmen', [])
                   if z.get('name') == name and _zahl(z.get('gefunden')) is not None]
        def problem(art, text):
            probleme.append(dict(firma=name, art=art, text=text, verlauf=verlauf))
        n = _zahl(f.get('gefunden'))
        if n is None:
            problem('fehler','Ungültige Stellenzahl im Laufbericht')
        elif verlauf and max(verlauf)>0:
            if n==0:
                problem('null_stellen','Keine Stellen trotz vorheriger Treffer')
            if n < max(verlauf)/2:
                problem('einbruch','Stellenzahl um mehr als 50 % gefallen')
        if f.get('fehler'):
            problem('fehler',_fehler(f['fehler']))
        if any(_zahl(v) and k in {'ohne Titel','ohne URL','ohne Link'} for k,v in (f.get('uebersprungen') or {}).items()):
            problem('ohne_titel_link','Stellen ohne Titel oder Link übersprungen')
        if 'stammdaten' in f:
            meta=f['stammdaten']
            if meta.get('aktiv') in ('ja',True) and any(not meta.get(k) for k in ('careers_url','ats_typ','groesse_klasse')):
                problem('firmendaten','Pflichtangaben einer aktiven Firma fehlen')
    return probleme


def _karriere(url):
    try:
        u=urlsplit(url or '')
        if u.scheme!='https' or not u.hostname or u.username or u.password or any(c.isspace() for c in url):
            return 'Kein veröffentlichbarer Karriere-Link'
        return urlunsplit((u.scheme,u.netloc,u.path,'',''))
    except (ValueError,TypeError):
        return 'Kein veröffentlichbarer Karriere-Link'


def melde_issues(probleme, firmen, post=None, get=None, token=None, repo=None, heute=None, gesund=None):
    post,get=post or requests.post,get or requests.get
    token=token if token is not None else os.environ.get('GITHUB_TOKEN')
    repo=repo if repo is not None else os.environ.get('GITHUB_REPOSITORY')
    if not token or not isinstance(repo,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*',repo):
        print('Gesundheits-Issues sind noch nicht eingerichtet.')
        return []
    tag=heute or date.today().isoformat()
    basis='https://api.github.com/repos/'+repo
    headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'}
    links=[]
    try:
        issues=[]
        for page in range(1,101):
            r=get(basis+'/issues',headers=headers,params={'state':'all','labels':'scraper-defekt','per_page':100,'page':page},timeout=20,allow_redirects=False)
            if not r.ok:
                return []
            teil=r.json()
            if not isinstance(teil,list) or not all(isinstance(z,dict) for z in teil):
                return []
            issues.extend(z for z in teil if 'pull_request' not in z)
            if len(teil)<100:
                break
        else:
            return []  # unvollständige Sicht: keine riskanten Duplikate erzeugen
        offen={i.get('title'):i for i in issues if i.get('state','open')=='open'}
        # Auch bereits geschlossene Issues zählen zur Tagesgrenze bei Wiederholung.
        neu=sum(str(i.get('created_at',''))[:10]==tag for i in issues)
        gruppen=defaultdict(list)
        for p in probleme:
            name=p.get('firma')
            if name in firmen and firmen[name].get('herkunft')=='datei' and not re.search(r'[\x00-\x1f\x7f]',name):
                gruppen[name].append(p)
        for name,gruppe in gruppen.items():
            titel='Scraper defekt: '+name
            body='\n'.join('- '+p['art']+': '+_fehler(p['text']) if p['art']=='fehler' else '- '+p['art']+': '+p['text'] for p in gruppe)
            body+='\n\nKarriereseite: '+_karriere(firmen[name].get('careers_url',''))
            body+='\n\n| Vorheriger Lauf (neuester zuerst) | Stellen |\n|---|---|\n'
            body+='\n'.join(f'| {i+1} | {n} |' for i,n in enumerate(gruppe[0].get('verlauf',[])))
            issue=offen.get(titel)
            if issue:
                nummer=issue.get('number')
                if type(nummer) is not int or nummer<=0:
                    continue
                r=post(f'{basis}/issues/{nummer}/comments',headers=headers,json={'body':body},timeout=20,allow_redirects=False)
            elif neu<3:
                r=post(basis+'/issues',headers=headers,json={'title':titel,'body':body,'labels':['scraper-defekt']},timeout=20,allow_redirects=False)
                if r.ok:
                    neu+=1
            else:
                continue
            if r.ok:
                j=r.json();nummer=(issue or j).get('number')
                if type(nummer) is int and nummer>0:
                    links.append(f'https://github.com/{repo}/issues/{nummer}')
        for name,n in (gesund or {}).items():
            issue=offen.get('Scraper defekt: '+name)
            if name in gruppen or name not in firmen or firmen[name].get('herkunft')!='datei' or not issue or _zahl(n) is None or n<=0:
                continue
            nummer=issue.get('number')
            if type(nummer) is int and nummer>0:
                post(f'{basis}/issues/{nummer}/comments',headers=headers,json={'body':f'Wieder in Ordnung: {n} Stellen'},timeout=20,allow_redirects=False)
    except Exception:
        print('Gesundheits-Issues konnten nicht vollständig verarbeitet werden.')
    return links


def _mit_stammdaten(bericht,firmen):
    return {**bericht,'firmen':[dict(f,stammdaten=firmen.get(f.get('name'),{})) for f in bericht.get('firmen',[]) if f.get('name') in firmen]}


def _nachricht(probleme):
    return 'Gesundheitscheck\n'+'\n'.join(f"{p['firma']}: {p['art']} – {p['text']}" for p in probleme)


def main(heute=None):
    tag=heute or date.today().isoformat()
    try:
        berichte=db.letzte_laeufe(8)
        aktuell=next((b for b in berichte if b.get('stand')==tag),None)
        run_id=os.environ.get('GITHUB_RUN_ID')
        if run_id and (aktuell or {}).get('workflow_lauf')!={'id':run_id,'versuch':os.environ.get('GITHUB_RUN_ATTEMPT','1')}:
            aktuell=None
        if not aktuell:
            print('Kein aktueller Laufbericht; Gesundheitscheck übersprungen.')
            telegram.sende('Nachtlauf: Kein aktueller Laufbericht vorhanden. Bitte den GitHub-Lauf prüfen.')
            return 0
        vorher=[b for b in berichte if b.get('stand','')<tag]
        firmen={f['name']:dict(f,herkunft='datei') for f in lade_unternehmen()}
        oeffentlich=pruefe(_mit_stammdaten(aktuell,firmen),vorher)
        # Privaten Firmennamen nie in laeufe schreiben, auch nicht als Fehlerdetail.
        db.ergaenze_lauf(tag,{'gesundheit':oeffentlich})
        alte_probleme={p.get('firma') for b in vorher[:1] for p in b.get('gesundheit',[])}
        gesund={f['name']:f['gefunden'] for f in aktuell.get('firmen',[]) if f.get('name') in alte_probleme and f.get('name') not in {p['firma'] for p in oeffentlich} and (_zahl(f.get('gefunden')) or 0)>0}
        links=melde_issues(oeffentlich,firmen,heute=tag,gesund=gesund)
        if oeffentlich:
            telegram.sende(_nachricht(oeffentlich)+ ('\n'+'\n'.join(links) if links else ''))
        if aktuell.get('gesundheit_db_aktuell') is not True:
            print('Keine bestätigten aktuellen Zusatzdiagnosen; private Meldungen übersprungen.')
            return 0
        db_firmen={f['name']:f for f in db.db_firmen()}
        privat_historie=defaultdict(list)
        for z in db.lade_firmen_gesundheit():
            privat_historie[z['datum']].append(z['bericht'])
        aktuell_db={'stand':tag,'firmen':privat_historie.get(tag,[])}
        probleme_db=pruefe(_mit_stammdaten(aktuell_db,db_firmen),[{'stand':d,'firmen':rows} for d,rows in privat_historie.items() if d<tag])
        db.ergaenze_lauf(tag,{'gesundheit_db_anzahl':len(probleme_db)})
        for admin in db.admin_ids():
            if not admin.get('telegram_chat_id'):
                continue
            sichtbar=db.sichtbare_firmen(admin['user_id'])
            eigene=[p for p in probleme_db if p['firma'] in sichtbar]
            if eigene:
                telegram.sende(_nachricht(eigene),chat=admin['telegram_chat_id'])
        print(f'Gesundheitscheck: {len(oeffentlich)} öffentliche Probleme verarbeitet.')
    except Exception:
        print('Gesundheitscheck nicht vollständig möglich; übrige Schritte bleiben unabhängig.')
        telegram.sende('Gesundheitscheck nicht vollständig möglich. Bitte den GitHub-Lauf und die Datenbank-Einrichtung prüfen.')
    return 0


if __name__=='__main__':
    main()
