"""Supabase per PostgREST (Service-Key). Jeder HTTP-Aufruf geht durch _req, damit Tests ihn ersetzen koennen."""
import hashlib
import os
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


def db_firmen(status=None):
    if not herkunft_da():
        return []
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
    erlaubt={'careers_url','ats_typ','ats_id','status','status_grund','aktiv'}
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
    if mit_herkunft:
        privat={f['name'] for f in db_firmen()}
        if any(f['name'] in privat for f in firmen):
            raise ValueError('Herkunft-Konflikt; keine Stammdaten überschrieben')
    zeilen = [{
        "name": f["name"], "careers_url": f["careers_url"], "ats_typ": f["ats_typ"], "ats_id": f["ats_id"],
        "mitarbeitende_ca": zahl(f["mitarbeitende_ca"]), "groesse_klasse": f["groesse_klasse"],
        "kategorie": f["kategorie"], "hauptsitz": f["hauptsitz"],
        "aktiv": f["aktiv"] == "ja" and f.get('status', 'aktiv') == 'aktiv',
        **({'herkunft':'datei'} if mit_herkunft else {}),
        **({k: f.get(k) or (list() if k == 'quellen' else 'aktiv' if k == 'status' else None)
            for k in ('website', 'wikidata_id', 'quellen', 'status', 'status_grund')} if erweitert else {}),
    } for f in firmen]
    if mit_herkunft:
        _req('POST','rpc/sync_dateifirmen',json={'p_firmen':zeilen})
    else:
        _upsert('companies',zeilen,'name')


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


def bewerbungen_zum_nachruesten(limit=50):
    """Bewerbungen aus Firmenseiten (Link-Schnellstart). Ohne Migration 012 antwortet PostgREST mit 400: dann nichts."""
    try:
        return _req("GET", "applications", params={"select": "id,link,firma", "nachruesten": "eq.true", "limit": limit})
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


def speichere_lauf(bericht):
    _req("POST", "laeufe", json={"datum": bericht["stand"], "bericht": bericht})


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
