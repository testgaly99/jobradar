"""Recruitee: öffentliche Offers-API (liefert alle Stellen mit Text in einer Anfrage)."""
from scraper import http
from scraper.abschnitte import abschnitte, text_aus_html
from scraper.ats.daten import objekt_liste, stellen_id

_VERTRAG = {"fulltime": "Vollzeit", "fulltime_permanent": "Vollzeit", "fulltime_fixed_term": "Befristet"}


def hole_stellen(ats_id: str, bekannte: frozenset[str] = frozenset()) -> list[dict]:  # bekannte: ignoriert
    stellen = []
    for o in objekt_liste(http.hole(f"https://{ats_id}/api/offers/").json(), "offers"):
        if o.get("status", "published") != "published":
            continue
        roh = f"{o.get('description') or ''}{o.get('requirements') or ''}"
        text = text_aus_html(roh)
        ort = ", ".join(x for x in (o.get("city"), o.get("country")) if x)
        modell = "Remote" if o.get("remote") else "Hybrid" if o.get("hybrid") else "Vor Ort" if o.get("on_site") else ""
        stellen.append({
            "ext_id": stellen_id(o["id"]),
            "titel": o["title"].strip(),
            "ort": ort,
            "remote": bool(o.get("remote")),
            "url": o["careers_url"],
            "beschreibung_kurz": text[:300],
            "text": text,
            "abschnitte": abschnitte(roh),
            "abteilung": (o.get("department") or "").strip(),
            "arbeitsmodell": modell,
            "vertragsart": _VERTRAG.get(o.get("employment_type_code"), ""),
        })
    return stellen
