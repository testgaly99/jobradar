"""Supabase per PostgREST (Service-Key). Jeder HTTP-Aufruf geht durch _req, damit Tests ihn ersetzen koennen."""
import hashlib
import os
from datetime import date, timedelta
from pathlib import Path

import requests
from scraper.fehler import DatenbankFehler, kurzfehler
from scraper.sprachniveau import rang

BATCH = 500
SEITE = 1000
CHUNK = 40  # ids pro in.(...)-Abfrage, haelt die URL kurz


def _lade_env(pfad=Path(__file__).parent.parent / ".env"):
    # Setzt nur Variablen, die noch nicht gesetzt sind (CI-Secrets gewinnen).
    if not pfad.exists():
        return
    for zeile in pfad.read_text(encoding="utf-8-sig").splitlines():
        zeile = zeile.strip()
        if zeile and not zeile.startswith("#") and "=" in zeile:
            k, v = zeile.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


def _req(method, pfad, **kw):
    _lade_env()
    url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_KEY"]
    headers = {"apikey": key, "Authorization": f"Bearer {key}", **kw.pop("headers", {})}
    try:
        r = requests.request(method, f"{url}/rest/v1/{pfad}", headers=headers, timeout=60, **kw)
    except requests.RequestException as e:
        raise DatenbankFehler(method, pfad, getattr(getattr(e, "response", None), "status_code", None),
                              ursache=type(e).__name__) from None
    if not r.ok:
        try:
            daten = r.json()
        except ValueError:
            daten = None
        code = daten.get("code") if isinstance(daten, dict) else None
        raise DatenbankFehler(method, pfad, r.status_code, code) from None
    try:
        return r.json() if r.text else None
    except ValueError as e:
        raise DatenbankFehler(method, pfad, r.status_code, ursache=type(e).__name__) from None


def _upsert(tabelle, zeilen, konflikt):
    for i in range(0, len(zeilen), BATCH):
        _req("POST", tabelle, params={"on_conflict": konflikt}, json=zeilen[i:i + BATCH],
             headers={"Prefer": "resolution=merge-duplicates,return=minimal"})


_spalten = None  # None = noch nicht geprueft (run.lauf setzt es pro Lauf zurueck)


def _spalten_da():
    """Einmal pro Lauf: gibt es abschnitte/land/steckbrief schon (Migration 005)? PostgREST antwortet sonst mit 400."""
    global _spalten
    if _spalten is None:
        try:
            _req("GET", "jobs", params={"select": "abschnitte,land,steckbrief", "limit": 0})
            _spalten = True
        except RuntimeError as e:
            if ": 400 " not in str(e):
                raise
            _spalten = False
            print("Hinweis: Spalten abschnitte/land/steckbrief fehlen (Migration 005 offen), werden nicht geschrieben.")
    return _spalten


_deutsch = None  # None = noch nicht geprueft (run.lauf setzt es pro Lauf zurueck)


def deutsch_spalte_da():
    """Einmal pro Lauf: gibt es jobs.deutsch_stufe schon (Migration 013)? PostgREST antwortet sonst mit 400."""
    global _deutsch
    if _deutsch is None:
        try:
            _req("GET", "jobs", params={"select": "deutsch_stufe", "limit": 0})
            _deutsch = True
        except RuntimeError as e:
            if ": 400 " not in str(e):
                raise
            _deutsch = False
            print("Hinweis: Spalte jobs.deutsch_stufe fehlt (Migration 013 offen), Deutschniveau nicht gespeichert.")
    return _deutsch


def stellen_ohne_deutsch(limit=2000):
    """Offene Stellen mit Text, deren Steckbrief noch kein Deutschniveau hat (alle wurden vor dem Lesen geholt, dann geschrieben)."""
    zeilen = []
    while len(zeilen) < limit:
        teil = _req("GET", "jobs", params={"select": "id,text,abschnitte,steckbrief", "status": "eq.offen", "text": "neq.",
                                           "steckbrief->deutsch": "is.null", "order": "id",
                                           "limit": min(SEITE, limit - len(zeilen)), "offset": len(zeilen)})
        zeilen += teil
        if len(teil) < SEITE:
            break
    return zeilen


def setze_deutsch(job_id, steckbrief, stufe):
    _req("PATCH", "jobs", params={"id": f"eq.{job_id}"}, json={"steckbrief": steckbrief, "deutsch_stufe": stufe})


# --- Plan 6a: Anforderungslisten und CV-Abgleich (Migration 018) ---
_anforderung = None


def anforderung_spalte_da():
    """Einmal pro Lauf: gibt es jobs.anforderungs_hash schon (Migration 018)? Sonst 400."""
    global _anforderung
    if _anforderung is None:
        try:
            _req("GET", "jobs", params={"select": "anforderungs_hash", "limit": 0})
            _anforderung = True
        except RuntimeError as e:
            if ": 400 " not in str(e):
                raise
            _anforderung = False
            print("Hinweis: Spalte jobs.anforderungs_hash fehlt (Migration 018 offen), Anforderungslisten nicht gespeichert.")
    return _anforderung


def anforderungen_stellen():
    return _alle_zeilen('jobs', {'select': 'id,abschnitte,anforderungs_hash', 'status': 'eq.offen', 'order': 'id'})


def anforderungen_bewerbungen():
    """Bewerbungen ohne Stelle (Q111): Anforderungen aus dem gegliederten Snapshot."""
    admins = {a['user_id'] for a in admin_ids()}
    zeilen = _alle_zeilen('applications', {'select': 'id,owner_id,snapshot_abschnitte,anforderungs_hash', 'job_id': 'is.null', 'order': 'id'})
    return sorted(zeilen, key=lambda z: z.get('owner_id') not in admins)  # Admin-Konten zuerst (Q307)


def setze_anforderungen(tabelle, zeilen_id, liste, pruefsumme):
    if tabelle not in ('jobs', 'applications'):
        raise ValueError('Ungültige Tabelle')
    _req('PATCH', tabelle, params={'id': f'eq.{zeilen_id}'}, json={'anforderungsliste': liste, 'anforderungs_hash': pruefsumme})


def hat_cv_einwilligung(owner, fassung):
    return bool(_req('GET', 'cv_einwilligung', params={'select': 'owner_id', 'owner_id': f'eq.{owner}', 'fassung': f'eq.{fassung}', 'limit': 1}))


def cv_dokumente(owner):
    """CV-Versionen eines Kontos mit gespeichertem Text und Profil (None, wenn noch nicht vorhanden)."""
    docs = _alle_zeilen('documents', {'select': 'id,name,storage_pfad,standard', 'owner_id': f'eq.{owner}',
                                      'art': 'eq.cv', 'order': 'id'})
    texte = {z['dokument_id']: z for z in _alle_zeilen('cv_texte', {'select': 'dokument_id,text,herkunft,hash',
                                                                     'owner_id': f'eq.{owner}', 'order': 'dokument_id'})}
    profile = {z['dokument_id']: z for z in _alle_zeilen('cv_profile', {'select': 'dokument_id,text_hash,aussagen',
                                                                        'owner_id': f'eq.{owner}', 'order': 'dokument_id'})}
    for d in docs:
        d['cv_text'] = texte.get(d['id'])
        d['profil'] = profile.get(d['id'])
    return docs


def lade_datei(pfad):
    """Datei aus dem privaten Speicher (Bucket dokumente) mit dem Service-Schlüssel; nur in den Arbeitsspeicher."""
    from urllib.parse import quote
    _lade_env()
    url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_KEY"]
    try:
        r = requests.get(f"{url}/storage/v1/object/dokumente/{quote(pfad)}",
                         headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=60)
    except requests.RequestException as e:
        raise DatenbankFehler('GET', 'storage', None, ursache=type(e).__name__) from None
    if not r.ok:
        raise DatenbankFehler('GET', 'storage', r.status_code)
    return r.content


def speichere_cv_text(dokument_id, owner, text, herkunft, pruefsumme):
    _req('POST', 'cv_texte', params={'on_conflict': 'dokument_id'}, headers={'Prefer': 'resolution=merge-duplicates'},
         json={'dokument_id': dokument_id, 'owner_id': owner, 'text': text, 'herkunft': herkunft, 'hash': pruefsumme})


def speichere_profil(dokument_id, owner, text_hash, aussagen):
    _req('POST', 'cv_profile', params={'on_conflict': 'dokument_id'}, headers={'Prefer': 'resolution=merge-duplicates'},
         json={'dokument_id': dokument_id, 'owner_id': owner, 'text_hash': text_hash, 'aussagen': aussagen})


def stellen_fuer_abgleich(owner, grenze):
    """Gemerkte Stellen zuerst (mit Stelle über deren Liste, ohne Stelle über die Bewerbung), dann offene Stellen mit
    Titel-Stichwort; nur sichtbare Firmen; ohne gültiges Ergebnis (cv_abgleich.offen)."""
    from scraper.cv_abgleich import offen
    from scraper.digest import passt
    kandidaten = []
    gemerkt = _alle_zeilen('applications', {'select': 'id,job_id,anforderungsliste,anforderungs_hash',
                                            'owner_id': f'eq.{owner}', 'status': 'eq.gemerkt', 'order': 'erstellt_am,id'})
    stellen = {}
    ids = [a['job_id'] for a in gemerkt if a.get('job_id')]
    for i in range(0, len(ids), 100):
        for j in _alle_zeilen('jobs', {'select': 'id,anforderungsliste,anforderungs_hash', 'id': 'in.(' + ','.join(
                '"' + x.replace('"', '') + '"' for x in ids[i:i + 100]) + ')'}):
            stellen[j['id']] = j
    for a in gemerkt:
        if a.get('job_id') and a['job_id'] in stellen:
            j = stellen[a['job_id']]
            kandidaten.append({'job_id': j['id'], 'anforderungen': j.get('anforderungsliste') or [],
                               'anforderungs_hash': j.get('anforderungs_hash')})
        elif not a.get('job_id'):
            kandidaten.append({'application_id': a['id'], 'anforderungen': a.get('anforderungsliste') or [],
                               'anforderungs_hash': a.get('anforderungs_hash')})
    _, woerter = wunsch_und_stichwoerter(owner)
    if woerter:
        sichtbar = sichtbare_firmen(owner)
        for j in _alle_zeilen('jobs', {'select': 'id,unternehmen,titel,anforderungsliste,anforderungs_hash',
                                       'status': 'eq.offen', 'sichtbar': 'eq.true', 'anforderungs_hash': 'not.is.null',
                                       'order': 'erstmals_gesehen.desc,id'}):
            if j.get('unternehmen') in sichtbar and passt(j, set(), woerter):
                kandidaten.append({'job_id': j['id'], 'anforderungen': j.get('anforderungsliste') or [],
                                   'anforderungs_hash': j.get('anforderungs_hash')})
    vorhanden = _alle_zeilen('cv_ergebnisse', {'select': 'job_id,application_id,weg', 'owner_id': f'eq.{owner}', 'order': 'id'})
    return offen(kandidaten, vorhanden, grenze)


def speichere_ergebnis(owner, ziel, **daten):
    """Ein Ergebnis je Konto und Stelle bzw. Bewerbung: altes löschen, neues schreiben (Teilindizes, Migration 018)."""
    (feld, wert), = ziel.items()
    if feld not in ('job_id', 'application_id'):
        raise ValueError('Ungültiges Ziel')
    _req('DELETE', 'cv_ergebnisse', params={'owner_id': f'eq.{owner}', feld: f'eq.{wert}'})
    zeile = {'owner_id': owner, feld: wert, **daten}
    try:
        _req('POST', 'cv_ergebnisse', headers={'Prefer': 'return=minimal'}, json=zeile)
    except RuntimeError as e:  # Migration 027 noch offen: ohne Sortwert schreiben, Nachtlauf läuft weiter
        if ': 400 ' not in str(e) or not any(c in str(e) for c in ('42703', 'PGRST204')):
            raise
        zeile.pop('passung_sortwert', None)
        _req('POST', 'cv_ergebnisse', headers={'Prefer': 'return=minimal'}, json=zeile)


def stellen_fuer_schaetzung(owner, cv_hashes):
    """Offene, sichtbare Stellen sichtbarer Firmen mit Anforderungsliste, die noch kein Claude-Ergebnis und keine aktuelle
    Schätzung haben; neueste zuerst. Veraltet: Anforderungen geändert oder ein aktueller CV fehlt/anders in der Schätzung."""
    sichtbar = sichtbare_firmen(owner)
    ergebnisse = {z['job_id']: z for z in _alle_zeilen('cv_ergebnisse', {
        'select': 'job_id,weg,anforderungs_hash,cv_hashes', 'owner_id': f'eq.{owner}', 'job_id': 'not.is.null', 'order': 'id'})}
    aus = []
    for j in _alle_zeilen('jobs', {'select': 'id,unternehmen,anforderungsliste,anforderungs_hash', 'status': 'eq.offen',
                                   'sichtbar': 'eq.true', 'anforderungs_hash': 'not.is.null',
                                   'order': 'erstmals_gesehen.desc,id'}):
        e = ergebnisse.get(j['id'])
        if j.get('unternehmen') in sichtbar and j.get('anforderungsliste') and (
                e is None or (e['weg'] == 'schaetzung' and (e.get('anforderungs_hash') != j['anforderungs_hash'] or any(
                    (e.get('cv_hashes') or {}).get(c) != h for c, h in cv_hashes.items())))):
            aus.append({'job_id': j['id'], 'anforderungen': j['anforderungsliste'], 'anforderungs_hash': j['anforderungs_hash']})
    return aus


def ki_spalten_da():
    """Gibt es jobs.ki schon (Migration 009)? Sonst antwortet PostgREST mit 400."""
    try:
        _req("GET", "jobs", params={"select": "ki", "limit": 0})
        return True
    except RuntimeError as e:
        if ": 400 " not in str(e):
            raise
        print("Hinweis: Spalte jobs.ki fehlt (Migration 009 offen), KI-Auswertung übersprungen.")
        return False


def ki_kandidaten():
    """Offene Stellen mit nicht-leerem Text, seitenweise gelesen."""
    zeilen = []
    while True:
        teil = _req("GET", "jobs", params={"select": "id,text_hash,ki_hash,ki_modell,erstmals_gesehen", "status": "eq.offen",
                                           "text": "neq.", "order": "id", "limit": SEITE, "offset": len(zeilen)})
        zeilen += teil
        if len(teil) < SEITE:
            return zeilen


def lade_anzeige(job_id):
    """(text, abschnitte) einer Stelle; (None, None), wenn es sie nicht gibt."""
    z = _req("GET", "jobs", params={"select": "text,abschnitte", "id": f"eq.{job_id}"})
    return (z[0]["text"], z[0]["abschnitte"]) if z else (None, None)


def speichere_ki(job_id, ergebnis, modell, text_hash):
    """ergebnis=None (Fehler): nur Modell/Hash vermerken. studium/taetigkeit liegen in eigenen Spalten.
    Ausgeblendet wird nur über nein_ausblenden (kennt die Whitelist)."""
    patch = {"ki": None, "ki_modell": modell, "ki_hash": text_hash}
    if ergebnis:
        patch["ki"] = {k: v for k, v in ergebnis.items() if k not in ("studium", "taetigkeit")}
        patch["studium"], patch["taetigkeit"] = ergebnis["studium"], ergebnis["taetigkeit"]
    _req("PATCH", "jobs", params={"id": f"eq.{job_id}"}, json=patch)


def nein_ausblenden():
    """Blendet offene Stellen mit studium=nein aus, außer bei Whitelist-Firmen (Migration 011). Gibt die Anzahl zurück.
    Ohne Migration 011: alte Regel ohne Whitelist."""
    try:
        return _req("POST", "rpc/nein_ausblenden", json={}) or 0
    except RuntimeError as e:
        if ": 404 " not in str(e) and "PGRST202" not in str(e):
            raise
        print("Hinweis: nein_ausblenden fehlt (Migration 011 offen), alte Regel ohne Whitelist.")
    r = _req("PATCH", "jobs", params={"studium": "eq.nein", "status": "eq.offen", "sichtbar": "eq.true", "select": "id"},
             json={"sichtbar": False}, headers={"Prefer": "return=representation"})
    return len(r or [])


def bewerbungen_ohne_firma():
    z = _req("GET", "applications", params={"select": "id,snapshot_text", "firma": "is.null", "titel": "is.null"})
    return [a for a in z if a["snapshot_text"]]


def setze_firma_titel(app_id, firma, titel):
    # firma/titel=is.null: hat der Nutzer inzwischen selbst etwas eingetragen, bleibt das unberührt
    _req("PATCH", "applications", params={"id": f"eq.{app_id}", "firma": "is.null", "titel": "is.null"}, json={"firma": firma, "titel": titel})


def firmen_ohne_logo():
    """Namen aller Firmen ohne logo_url. Fehlt die Spalte (Migration 006 offen), Hinweis und leere Menge."""
    try:
        zeilen = _req("GET", "companies", params={"select": "name,logo_url"})
    except RuntimeError as e:
        if ": 400 " not in str(e):
            raise
        print("Hinweis: Spalte companies.logo_url fehlt (Migration 006 offen), Logos übersprungen.")
        return set()
    return {z["name"] for z in zeilen if not z["logo_url"]}


def setze_logo(name, url):
    _req("PATCH", "companies", params={"name": f"eq.{name}"}, json={"logo_url": url})


def _in(werte):
    return "in.(" + ",".join('"' + w.replace('"', '\\"') + '"' for w in werte) + ")"


def _objektliste(antwort, kontext):
    if not isinstance(antwort, list) or not all(isinstance(z, dict) for z in antwort):
        raise ValueError(f"Ungültige {kontext}")
    return antwort


def _bestand(firma):
    bestand = {}
    while True:
        teil = _objektliste(_req("GET", "jobs", params={
            "unternehmen": f"eq.{firma}", "select": "id,status,erstmals_gesehen",
            "order": "id", "limit": SEITE, "offset": len(bestand),
        }), "Bestandsantwort")
        for z in teil:
            id_, datum = z.get("id"), z.get("erstmals_gesehen", "")
            if (not isinstance(id_, str) or not id_.startswith(firma + ":") or id_ == firma + ":"
                    or id_ in bestand or z.get("status") not in ("offen", "geschlossen")
                    or (datum is not None and (not isinstance(datum, str) or not datum.strip()))):
                raise ValueError("Ungültige Bestandszeile")
            bestand[id_] = z
        if len(teil) < SEITE:
            return bestand


def lade_offene(firma):
    return {i: z for i, z in _bestand(firma).items() if z["status"] == "offen"}


_firmen_quellen = None


def firmen_quellen_da():
    global _firmen_quellen
    if _firmen_quellen is None:
        try:
            _req('GET', 'companies', params={'select': 'website,wikidata_id,quellen,status,status_grund', 'limit': 0})
            _firmen_quellen = True
        except RuntimeError as e:
            if ': 400 ' not in str(e):
                raise
            _firmen_quellen = False
            print('Hinweis: Migration 014 offen, Firmenquellen werden nicht geschrieben.')
    return _firmen_quellen


_herkunft = None


def herkunft_da():
    global _herkunft
    if _herkunft is None:
        try:
            _req('GET','companies',params={'select':'herkunft','limit':0})
            _herkunft = True
        except RuntimeError as e:
            if ': 400 ' not in str(e):
                raise
            _herkunft = False
    return _herkunft


_zusatzfirmen = None


def zusatzfirmen_da():
    global _zusatzfirmen
    if _zusatzfirmen is None:
        try:
            _req('GET', 'companies', params={'select': 'fuer_alle', 'limit': 0})
            _zusatzfirmen = True
        except RuntimeError as e:
            if ': 400 ' not in str(e):
                raise
            _zusatzfirmen = False
    return _zusatzfirmen


def privatisiere_bestand(namen):
    return _req('POST', 'rpc/bestand_privatisieren', json={'p_firmen': namen}) is True


def db_firmen(status=None):
    if not herkunft_da():
        return []
    if zusatzfirmen_da():
        rows = _objektliste(_req('POST', 'rpc/firmen_fuer_nachtlauf', json={}), 'DB-Firmenantwort')
        result = []
        for f in rows:
            if type(f.get('fuer_alle')) is not bool or type(f.get('nutzer')) is not int or f['nutzer'] < 0:
                raise ValueError('Ungültige DB-Firmensichtbarkeit')
            if status is None or f.get('status') == status:
                result.append(dict(f, aktiv='ja' if f.get('aktiv') is True else 'nein'))
        return result
    result=[]
    while True:
        params={'select':'name,careers_url,ats_typ,ats_id,mitarbeitende_ca,groesse_klasse,kategorie,hauptsitz,aktiv,website,wikidata_id,quellen,status,status_grund,herkunft',
                'herkunft':'neq.datei','order':'name','offset':len(result),'limit':SEITE}
        if status is not None:
            params['status']='eq.'+status
        teil=_objektliste(_req('GET','companies',params=params),'DB-Firmenantwort')
        result.extend(dict(f,aktiv='ja' if f.get('aktiv') is True else 'nein') for f in teil)
        if len(teil)<SEITE:
            return result


def setze_einrichtung(name, felder):
    erlaubt={'careers_url','ats_typ','ats_id','status','status_grund','aktiv','website','wikidata_id'}
    patch={k:v for k,v in felder.items() if k in erlaubt}
    if 'aktiv' in patch:
        patch['aktiv']=patch['aktiv'] in ('ja',True)
    _req('PATCH','companies',params={'name':'eq.'+name,'herkunft':'neq.datei'},json=patch)


def sync_companies(firmen):
    def zahl(x):
        try:
            return int(str(x).strip())
        except ValueError:
            return None
    erweitert = firmen_quellen_da()
    mit_herkunft = herkunft_da()
    mit_sichtbarkeit = mit_herkunft and zusatzfirmen_da()
    konflikt = []
    if mit_herkunft:
        # Gleicher Name wie eine DB-Firma, aber anderes oder fehlendes Portal: nur diese Dateizeile
        # überspringen. Ein Abbruch würde jede Nacht alle Firmen stoppen.
        privat={f['name']: f for f in db_firmen()}
        for firma in firmen:
            alt=privat.get(firma['name'])
            if alt and not (mit_sichtbarkeit and firma.get('ats_typ') and firma.get('ats_id')
                            and firma['ats_typ']==alt.get('ats_typ') and firma['ats_id']==alt.get('ats_id')):
                konflikt.append(firma['name'])
        firmen = [f for f in firmen if f['name'] not in konflikt]
    zeilen = [{
        "name": f["name"], "careers_url": f["careers_url"], "ats_typ": f["ats_typ"], "ats_id": f["ats_id"],
        "mitarbeitende_ca": zahl(f["mitarbeitende_ca"]), "groesse_klasse": f["groesse_klasse"],
        "kategorie": f["kategorie"], "hauptsitz": f["hauptsitz"],
        "aktiv": f["aktiv"] == "ja" and f.get('status', 'aktiv') == 'aktiv',
        **({'herkunft':'datei'} if mit_herkunft else {}),
        **({'fuer_alle':True} if mit_sichtbarkeit else {}),
        **({k: f.get(k) or (list() if k == 'quellen' else 'aktiv' if k == 'status' else None)
            for k in ('website', 'wikidata_id', 'quellen', 'status', 'status_grund')} if erweitert else {}),
    } for f in firmen]
    if mit_herkunft:
        if zeilen:
            _req('POST','rpc/sync_dateifirmen',json={'p_firmen':zeilen})
    else:
        _upsert('companies',zeilen,'name')
    return konflikt


def importiere_ausgabe(daten):
    from scraper.rankings import pruefe_ausgabe
    if isinstance(daten,dict) and isinstance(daten.get('liste'),dict) and daten['liste'].get('id')=='epa-patente':
        if 'sichtbarkeit' not in daten.get('ausgabe',{}):
            daten={**daten,'ausgabe':{**daten['ausgabe'],'sichtbarkeit':'admin','freigegeben':True}}
        elif daten['ausgabe']['sichtbarkeit']!='admin':
            raise ValueError('Eingeschränkte Quelle darf nur für Admins importiert werden')
    bekannte, offset = set(), 0
    while True:
        teil = _objektliste(_req('GET', 'companies', params={'select': 'name', 'order': 'name',
                                                           'limit': SEITE, 'offset': offset}), 'Firmenantwort')
        bekannte.update(z['name'] for z in teil)
        offset += len(teil)
        if len(teil) < SEITE:
            break
    zeilen = pruefe_ausgabe(daten, bekannte)
    if not herkunft_da():
        # Migration 014 kennt keine Sichtbarkeit: eingeschränkte Ausgaben nie freigeben.
        for a in zeilen['ranking_ausgaben']:
            if a.pop('sichtbarkeit','angemeldet') == 'admin':
                a['freigegeben'] = False
        for l in zeilen['ranking_listen']:
            l.pop('kategorie',None)
    # Ein REST-Aufruf, eine Datenbanktransaktion: nie halbe Ausgaben sichtbar.
    _req('POST', 'rpc/importiere_ranking_ausgabe', json={'p_daten': zeilen})


def bereinige_ausgaben():
    _req('POST', 'rpc/bereinige_ranking_ausgaben', json={})


def schreibe(firma, neue, heute, unveraendert=(), schliessen=True):
    """Gibt (Anzahl neuer, Anzahl geschlossener Stellen) zurueck. `unveraendert`: ext_ids, nur zuletzt_gesehen wird gesetzt.
    `schliessen=False`: nicht gesehene Stellen bleiben offen (Lauf hat Einzelstellen übersprungen)."""
    alt = _bestand(firma)
    zeilen, neue_spalten = [], _spalten_da()
    mit_deutsch = neue_spalten and deutsch_spalte_da()
    for n in neue:
        id_ = f"{firma}:{n['ext_id']}"
        sbr = n.get("steckbrief")
        if not mit_deutsch and isinstance(sbr, dict):
            # Ohne Spalte (Migration 013) kein steckbrief.deutsch speichern: sonst übersieht das Nachrüsten die Stelle später
            sbr = {k: v for k, v in sbr.items() if k != "deutsch"}
        zeilen.append({
            "id": id_, "unternehmen": firma,
            **{k: n[k] for k in ("titel", "ort", "staedte", "remote", "arbeitsmodell", "vertragsart", "abteilung",
                                 "erfahrungslevel", "url", "beschreibung_kurz", "text")},
            "text_hash": hashlib.sha256(n["text"].encode("utf-8")).hexdigest(),
            "erstmals_gesehen": alt[id_]["erstmals_gesehen"] if id_ in alt else heute,
            "zuletzt_gesehen": heute, "status": "offen", "sichtbar": True,
            **({"abschnitte": n.get("abschnitte"), "land": n.get("land", ""),
                                                  "steckbrief": sbr} if neue_spalten else {}),
            **({"deutsch_stufe": rang((sbr or {}).get("deutsch"))} if mit_deutsch else {}),
        })
    gesehen = {z["id"] for z in zeilen}
    unv = [i for i in (f"{firma}:{e}" for e in unveraendert) if i in alt]
    gesehen_alle = gesehen | set(unv)
    fehlend = [i for i, z in alt.items() if schliessen and z["status"] == "offen" and i not in gesehen_alle]
    mit_bewerbung = set()
    for i in range(0, len(fehlend), CHUNK):
        angefragt = fehlend[i:i + CHUNK]
        offset = 0
        while True:
            r = _objektliste(_req("GET", "applications", params={
                "select": "job_id", "job_id": _in(angefragt), "order": "job_id",
                "limit": SEITE, "offset": offset,
            }), "Bewerbungsantwort")
            for a in r:
                if not isinstance(a.get("job_id"), str) or a["job_id"] not in angefragt:
                    raise ValueError("Ungültige Bewerbungszuordnung")
                mit_bewerbung.add(a["job_id"])
            if len(r) < SEITE:
                break
            offset += len(r)
    # Erst nach allen kritischen Schutzlesungen schreiben; keine HTTP-Transaktion behaupten.
    _upsert("jobs", zeilen, "id")
    for i in range(0, len(unv), CHUNK):
        _req("PATCH", "jobs", params={"id": _in(unv[i:i + CHUNK])}, json={"zuletzt_gesehen": heute})
    for liste, patch in (([i for i in fehlend if i not in mit_bewerbung],
                          {"status": "geschlossen", "text": None, "sichtbar": False}),
                         ([i for i in fehlend if i in mit_bewerbung], {"status": "geschlossen"})):
        for i in range(0, len(liste), CHUNK):
            _req("PATCH", "jobs", params={"id": _in(liste[i:i + CHUNK])}, json=patch)
    return sum(1 for i in gesehen if i not in alt), len(fehlend)


JE_KONTO = 5  # Q307: höchstens so viele Einträge je weiterem Konto und Nacht


def _gerecht(params, limit):
    """Admin-Konten zuerst, dann höchstens JE_KONTO je weiterem Konto: Markierungen setzt jedes Konto selbst,
    deshalb darf keines die anderen verdrängen (Sicherheitsprüfung 2026-11-25, Befund 6)."""
    admins = [a['user_id'] for a in admin_ids()]
    eigene = _req('GET', 'applications', params={**params, 'owner_id': _in(admins), 'limit': limit}) if admins else []
    aus, je, voll, gesehen = list(eigene)[:limit], {}, set(admins), set()
    for _ in range(20):  # jede volle Runde macht mind. ein Konto „voll“; 20 Runden als harte Grenze
        if len(aus) >= limit:
            break
        andere = _req('GET', 'applications', params={**params, **({'owner_id': 'not.' + _in(sorted(voll))} if voll else {}), 'limit': 500})
        for z in andere:
            o = z.get('owner_id')
            if len(aus) >= limit or z['id'] in gesehen or o in voll:
                continue
            gesehen.add(z['id'])
            aus.append(z)
            je[o] = je.get(o, 0) + 1
            if je[o] >= JE_KONTO:
                voll.add(o)  # in der nächsten Abfrage ausgeschlossen: viele alte Einträge eines Kontos verdrängen niemanden
        if len(andere) < 500:
            break
    return aus


def bewerbungen_zum_nachruesten(limit=50):
    """Bewerbungen aus Firmenseiten (Link-Schnellstart). Ohne Migration 012 antwortet PostgREST mit 400: dann nichts."""
    try:
        return _gerecht({"select": "id,owner_id,link,firma", "nachruesten": "eq.true", "order": "erstellt_am,id"}, limit)
    except RuntimeError as e:
        if ": 400 " not in str(e):
            raise
        print("Hinweis: Migration 012 offen, Nachrüsten übersprungen.")
        return []


def fuelle_leere(app_id, felder):
    """Nur leere Felder füllen (je Feld mit Filter is.null): was der Nutzer eingetragen hat, bleibt unberührt."""
    for k, v in felder.items():
        if v:
            _req("PATCH", "applications", params={"id": f"eq.{app_id}", k: "is.null"}, json={k: v})


def setze_nachgeruestet(app_id, patch):
    _req("PATCH", "applications", params={"id": f"eq.{app_id}"}, json={**patch, "nachruesten": False})


_ORIGINAL_FELDER = ('id,owner_id,geaendert_am,firma,titel,standort,link,portal_link,job_id,'
                    'original_suche,original_wahl,original_vorschlaege')


def bewerbungen_original_offen(limit=20):
    try:
        return _gerecht({'select': _ORIGINAL_FELDER, 'original_suche': 'eq.offen', 'job_id': 'is.null',
                         'order': 'erstellt_am,id'}, min(20, max(0, limit)))
    except RuntimeError as exc:
        if ': 400 ' not in str(exc) or not any(code in str(exc) for code in ('42703', 'PGRST204')):
            raise
        print('Hinweis: Migration 020 offen, Original-Suche übersprungen.')
        return []


def bewerbung_original(app_id, owner):
    rows = _req('GET', 'applications', params={'select': _ORIGINAL_FELDER, 'id': 'eq.'+app_id,
                    'owner_id': 'eq.'+owner, 'limit': 1})
    return rows[0] if rows else None


def setze_original(app_id, patch, owner, stand):
    return _req('POST', 'rpc/setze_original', json={'p_id': app_id, 'p_owner': owner,
                'p_stand': stand, 'p_patch': patch})


def speichere_lauf(bericht):
    _req("POST", "laeufe", json={"datum": bericht["stand"], "bericht": bericht})


def letzte_laeufe(n=7):
    if type(n) is not int or not 1 <= n <= 100:
        raise ValueError('Ungültige Laufanzahl')
    rows = _objektliste(_req('GET', 'laeufe', params={'select':'datum,bericht', 'order':'datum.desc', 'limit':n}), 'Laufantwort')
    result=[]
    for r in rows:
        if not isinstance(r.get('bericht'),dict):
            raise ValueError('Ungültiger Laufbericht')
        result.append({**r['bericht'],'stand':r['datum']})
    return result


def ergaenze_lauf(datum, felder):
    date.fromisoformat(datum)
    if not isinstance(felder,dict) or 'stand' in felder or 'firmen' in felder:
        raise ValueError('Ungültige Ergänzung')
    rows = _objektliste(_req('GET','laeufe',params={'select':'datum,bericht','datum':'eq.'+datum,'limit':1}), 'Laufantwort')
    if not rows or not isinstance(rows[0].get('bericht'),dict):
        raise ValueError('Lauf zum Ergänzen fehlt')
    _req('PATCH','laeufe',params={'datum':'eq.'+datum},json={'bericht':{**rows[0]['bericht'],**felder}})


def _alle_zeilen(tabelle, params):
    result=[]
    while True:
        teil=_objektliste(_req('GET',tabelle,params={**params,'offset':len(result),'limit':SEITE}), 'Datenantwort')
        result.extend(teil)
        if len(teil)<SEITE:
            return result


def admin_ids():
    return _alle_zeilen('admins',{'select':'user_id,telegram_chat_id','order':'user_id'})


def digest_fenster(owner, initial):
    date.fromisoformat(initial)
    result=_req('POST','rpc/digest_fenster',json={'p_owner':owner,'p_initial':initial})
    if not isinstance(result,dict) or not isinstance(result.get('gesendet_ids'),list) or not all(isinstance(i,str) for i in result['gesendet_ids']):
        raise ValueError('Ungültiges Digest-Fenster')
    date.fromisoformat(result['ab'])
    return result


def digest_erfolg(owner, ids, ab):
    date.fromisoformat(ab)
    if not isinstance(ids,list) or not all(isinstance(i,str) and i for i in ids):
        raise ValueError('Ungültige Digest-Zuordnung')
    if _req('POST','rpc/digest_erfolg',json={'p_owner':owner,'p_ids':ids,'p_ab':ab}) is not True:
        raise ValueError('Digest-Versand wurde nicht gespeichert')


def neue_stellen_seit(datum):
    date.fromisoformat(datum)
    return _alle_zeilen('jobs',{'select':'id,unternehmen,titel','status':'eq.offen','sichtbar':'eq.true',
                               'erstmals_gesehen':'gt.'+datum,'order':'id'})


def wunsch_und_stichwoerter(owner):
    wunsch=_alle_zeilen('wunschfirmen',{'select':'unternehmen','owner_id':'eq.'+owner,'order':'unternehmen'})
    woerter=_alle_zeilen('abgleich_stichwoerter',{'select':'begriff','owner_id':'eq.'+owner,'order':'id'})
    return {z['unternehmen'] for z in wunsch},[z['begriff'] for z in woerter]


def sichtbare_firmen(owner):
    firmen=_alle_zeilen('companies',{'select':'name','fuer_alle':'eq.true','aktiv':'eq.true','order':'name'})
    eigene=_alle_zeilen('firmen_sichtbar',{'select':'unternehmen','owner_id':'eq.'+owner,'order':'unternehmen'})
    return {z['name'] for z in firmen}|{z['unternehmen'] for z in eigene}


def speichere_firmen_gesundheit(datum, rows):
    date.fromisoformat(datum)
    berichte=[]
    for r in rows:
        if not isinstance(r,dict) or not isinstance(r.get('name'),str) or not r['name'].strip():
            raise ValueError('Ungültiger Firmenbericht')
        z={'name':r['name'], 'fehler':str(r.get('fehler') or '')[:1000]}
        for k in ('gefunden','gefiltert','neu','geschlossen'):
            wert=r.get(k,0)
            if type(wert) is not int or wert<0:
                raise ValueError('Ungültige Firmenzahl')
            z[k]=wert
        z['uebersprungen']={k:v for k,v in (r.get('uebersprungen') or {}).items()
                           if k in {'ohne Titel','ohne URL','ungültige ID','doppelte ID','kein Objekt','ungültige Markierung','unbekannte ID'}
                           and type(v) is int and v>=0}
        berichte.append(z)
    _req('POST','rpc/speichere_firmen_gesundheit',json={'p_datum':datum,'p_berichte':berichte})


def lade_firmen_gesundheit(datum=None):
    params={'select':'datum,bericht','order':'datum.desc,unternehmen'}
    if datum is not None:
        date.fromisoformat(datum)
        params['datum']='eq.'+datum
    else:
        params['datum']='gte.'+(date.today()-timedelta(days=7)).isoformat()
    return _alle_zeilen('firmen_gesundheit',params)


def snapshot_nachruesten():
    """Einmal pro Lauf: Bewerbungen ohne gegliederten Snapshot bekommen ihn aus der Stelle. Darf den Lauf nie scheitern lassen."""
    try:
        n = _req("POST", "rpc/snapshot_nachruesten", json={})
        print(f"Snapshots nachgerüstet: {n}")
    except RuntimeError as e:
        if ": 404 " in str(e) or "PGRST202" in str(e):
            print("Hinweis: snapshot_nachruesten fehlt (Migration 005 offen), übersprungen.")
        else:
            print(f"Hinweis: snapshot_nachruesten fehlgeschlagen: {kurzfehler(e)}")
    except Exception as e:  # Netzwerk o. Ä.: Lauf geht trotzdem weiter
        print(f"Hinweis: snapshot_nachruesten fehlgeschlagen: {kurzfehler(e)}")
