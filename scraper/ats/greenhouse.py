"""Greenhouse: öffentliche Board-API."""
import html

from scraper import http
from scraper.abschnitte import abschnitte, text_aus_html
from scraper.ats.daten import objekt_liste, stellen_id


def hole_stellen(ats_id: str, bekannte: frozenset[str] = frozenset()) -> list[dict]:  # bekannte: ignoriert
    daten = http.hole(f"https://boards-api.greenhouse.io/v1/boards/{ats_id}/jobs?content=true").json()
    stellen = []
    for j in objekt_liste(daten, "jobs"):
        if "uebersprungen" in j:  # Nicht-Objekt aus objekt_liste
            stellen.append(j)
            continue
        ort = (j.get("location") or {}).get("name") or ""
        # Greenhouse liefert doppelt escaped: erst entpacken, Tags entfernen, nochmal entpacken.
        roh = html.unescape(j.get("content") or "")
        text = text_aus_html(roh)
        abt = ((j.get("departments") or [{}])[0].get("name") or "").strip()
        stellen.append({
            "ext_id": stellen_id(j.get("id")),
            "titel": j.get("title"),
            "ort": ort,
            "remote": "remote" in ort.lower(),
            "url": j.get("absolute_url"),
            "beschreibung_kurz": text[:300],
            "text": text,
            "abschnitte": abschnitte(roh),
            "abteilung": abt,
            "arbeitsmodell": "Remote" if "remote" in ort.lower() else "Hybrid" if "hybrid" in ort.lower() else "",
            "vertragsart": "",
        })
    return stellen
