"""Ashby: öffentliche Posting-API."""
from scraper import http
from scraper.abschnitte import abschnitte
from scraper.ats.daten import objekt_liste, stellen_id

_MODELL = {"Remote": "Remote", "Hybrid": "Hybrid", "OnSite": "Vor Ort"}
_VERTRAG = {"FullTime": "Vollzeit", "PartTime": "Teilzeit", "Contract": "Befristet", "Temporary": "Befristet"}


def hole_stellen(ats_id: str, bekannte: frozenset[str] = frozenset()) -> list[dict]:  # bekannte: ignoriert
    daten = http.hole(f"https://api.ashbyhq.com/posting-api/job-board/{ats_id}").json()
    stellen = []
    for j in objekt_liste(daten, "jobs"):
        if not isinstance(j.get("isListed"), bool):
            stellen.append({"uebersprungen": "isListed ungültig"})
            continue
        if not j["isListed"]:
            continue
        land = (((j.get("address") or {}).get("postalAddress")) or {}).get("addressCountry")
        teile = [j.get("location"), land] + [(s or {}).get("location") for s in j.get("secondaryLocations") or []]
        text = " ".join((j.get("descriptionPlain") or "").split())
        stellen.append({
            "ext_id": stellen_id(j.get("id")),
            "titel": j.get("title"),
            "ort": ", ".join(t.strip() for t in teile if t and t.strip()),
            "remote": bool(j.get("isRemote")),
            "url": j.get("jobUrl"),
            "beschreibung_kurz": text[:300],
            "text": text,
            "abschnitte": abschnitte(j.get("descriptionHtml") or ""),
            "abteilung": (j.get("department") or "").strip(),
            "arbeitsmodell": _MODELL.get(j.get("workplaceType"), ""),
            "vertragsart": _VERTRAG.get(j.get("employmentType"), ""),
        })
    return stellen
