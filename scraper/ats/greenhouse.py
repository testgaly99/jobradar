"""Greenhouse: öffentliche Board-API."""
import html
import re

from scraper import http


def hole_stellen(ats_id: str) -> list[dict]:
    daten = http.hole(f"https://boards-api.greenhouse.io/v1/boards/{ats_id}/jobs?content=true").json()
    stellen = []
    for j in daten["jobs"]:
        ort = (j.get("location") or {}).get("name") or ""
        # Greenhouse liefert doppelt escaped: erst entpacken, Tags entfernen, nochmal entpacken.
        text = html.unescape(re.sub(r"<[^>]+>", " ", html.unescape(j.get("content") or "")))
        stellen.append({
            "ext_id": str(j["id"]),
            "titel": j["title"],
            "ort": ort,
            "remote": "remote" in ort.lower(),
            "url": j["absolute_url"],
            "beschreibung_kurz": " ".join(text.split())[:300],
        })
    return stellen
