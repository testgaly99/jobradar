"""Supabase per PostgREST (Service-Key). Jeder HTTP-Aufruf geht durch _req, damit Tests ihn ersetzen koennen."""
import hashlib
import os
from pathlib import Path

import requests

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
    r = requests.request(method, f"{url}/rest/v1/{pfad}", headers=headers, timeout=60, **kw)
    if not r.ok:
        raise RuntimeError(f"Supabase {method} {pfad}: {r.status_code} {r.text[:200]}")
    return r.json() if r.text else None


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


def _bestand(firma):
    zeilen = []
    while True:
        teil = _req("GET", "jobs", params={"unternehmen": f"eq.{firma}", "select": "id,status,erstmals_gesehen",
                                           "order": "id", "limit": SEITE, "offset": len(zeilen)})
        zeilen += teil
        if len(teil) < SEITE:
            return {z["id"]: z for z in zeilen}


def lade_offene(firma):
    return {i: z for i, z in _bestand(firma).items() if z["status"] == "offen"}


def sync_companies(firmen):
    def zahl(x):
        try:
            return int(str(x).strip())
        except ValueError:
            return None
    _upsert("companies", [{
        "name": f["name"], "careers_url": f["careers_url"], "ats_typ": f["ats_typ"], "ats_id": f["ats_id"],
        "mitarbeitende_ca": zahl(f["mitarbeitende_ca"]), "groesse_klasse": f["groesse_klasse"],
        "kategorie": f["kategorie"], "hauptsitz": f["hauptsitz"], "aktiv": f["aktiv"] == "ja",
    } for f in firmen], "name")


def schreibe(firma, neue, heute, unveraendert=()):
    """Gibt (Anzahl neuer, Anzahl geschlossener Stellen) zurueck. `unveraendert`: ext_ids, nur zuletzt_gesehen wird gesetzt."""
    alt = _bestand(firma)
    zeilen, neue_spalten = [], _spalten_da()
    for n in neue:
        id_ = f"{firma}:{n['ext_id']}"
        zeilen.append({
            "id": id_, "unternehmen": firma,
            **{k: n[k] for k in ("titel", "ort", "staedte", "remote", "arbeitsmodell", "vertragsart", "abteilung",
                                 "erfahrungslevel", "url", "beschreibung_kurz", "text")},
            "text_hash": hashlib.sha256(n["text"].encode("utf-8")).hexdigest(),
            "erstmals_gesehen": alt[id_]["erstmals_gesehen"] if id_ in alt else heute,
            "zuletzt_gesehen": heute, "status": "offen", "sichtbar": True,
            **({"abschnitte": n.get("abschnitte"), "land": n.get("land", ""),
                                                  "steckbrief": n.get("steckbrief")} if neue_spalten else {}),
        })
    _upsert("jobs", zeilen, "id")
    gesehen = {z["id"] for z in zeilen}
    unv = [i for i in (f"{firma}:{e}" for e in unveraendert) if i in alt]
    for i in range(0, len(unv), CHUNK):
        _req("PATCH", "jobs", params={"id": _in(unv[i:i + CHUNK])}, json={"zuletzt_gesehen": heute})
    gesehen_alle = gesehen | set(unv)
    fehlend = [i for i, z in alt.items() if z["status"] == "offen" and i not in gesehen_alle]
    mit_bewerbung = set()
    for i in range(0, len(fehlend), CHUNK):
        r = _req("GET", "applications", params={"select": "job_id", "job_id": _in(fehlend[i:i + CHUNK])})
        mit_bewerbung |= {a["job_id"] for a in r}
    for liste, patch in (([i for i in fehlend if i not in mit_bewerbung],
                          {"status": "geschlossen", "text": None, "sichtbar": False}),
                         ([i for i in fehlend if i in mit_bewerbung], {"status": "geschlossen"})):
        for i in range(0, len(liste), CHUNK):
            _req("PATCH", "jobs", params={"id": _in(liste[i:i + CHUNK])}, json=patch)
    return sum(1 for i in gesehen if i not in alt), len(fehlend)


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
            print(f"Hinweis: snapshot_nachruesten fehlgeschlagen: {e}")
    except Exception as e:  # Netzwerk o. Ä.: Lauf geht trotzdem weiter
        print(f"Hinweis: snapshot_nachruesten fehlgeschlagen: {type(e).__name__}: {e}")
