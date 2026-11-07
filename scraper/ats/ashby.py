"""Ashby: öffentliche Posting-API."""
from scraper import http


def hole_stellen(ats_id: str) -> list[dict]:
    daten = http.hole(f"https://api.ashbyhq.com/posting-api/job-board/{ats_id}").json()
    stellen = []
    for j in daten["jobs"]:
        if not j.get("isListed"):
            continue
        land = (((j.get("address") or {}).get("postalAddress")) or {}).get("addressCountry")
        teile = [j.get("location"), land] + [(s or {}).get("location") for s in j.get("secondaryLocations") or []]
        stellen.append({
            "ext_id": str(j["id"]),
            "titel": j["title"],
            "ort": ", ".join(t.strip() for t in teile if t and t.strip()),
            "remote": bool(j.get("isRemote")),
            "url": j["jobUrl"],
            "beschreibung_kurz": " ".join((j.get("descriptionPlain") or "").split())[:300],
        })
    return stellen
