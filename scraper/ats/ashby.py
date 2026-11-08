"""Ashby: öffentliche Posting-API."""
from scraper import http
from scraper.abschnitte import abschnitte

_MODELL = {"Remote": "Remote", "Hybrid": "Hybrid", "OnSite": "Vor Ort"}
_VERTRAG = {"FullTime": "Vollzeit", "PartTime": "Teilzeit", "Contract": "Befristet", "Temporary": "Befristet"}


def hole_stellen(ats_id: str) -> list[dict]:
    daten = http.hole(f"https://api.ashbyhq.com/posting-api/job-board/{ats_id}").json()
    stellen = []
    for j in daten["jobs"]:
        if not j.get("isListed"):
            continue
        land = (((j.get("address") or {}).get("postalAddress")) or {}).get("addressCountry")
        teile = [j.get("location"), land] + [(s or {}).get("location") for s in j.get("secondaryLocations") or []]
        text = " ".join((j.get("descriptionPlain") or "").split())
        stellen.append({
            "ext_id": str(j["id"]),
            "titel": j["title"],
            "ort": ", ".join(t.strip() for t in teile if t and t.strip()),
            "remote": bool(j.get("isRemote")),
            "url": j["jobUrl"],
            "beschreibung_kurz": text[:300],
            "text": text,
            "abschnitte": abschnitte(j.get("descriptionHtml") or ""),
            "abteilung": (j.get("department") or "").strip(),
            "arbeitsmodell": _MODELL.get(j.get("workplaceType"), ""),
            "vertragsart": _VERTRAG.get(j.get("employmentType"), ""),
        })
    return stellen
