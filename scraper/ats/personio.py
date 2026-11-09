"""Personio: öffentlicher XML-Feed (liefert alle Daten in einer Anfrage)."""
import html
import re
import xml.etree.ElementTree as ET

from scraper import http
from scraper.abschnitte import abschnitte

_SCHEDULE = {"full-time": "Vollzeit", "part-time": "Teilzeit"}


def hole_stellen(ats_id: str, bekannte: frozenset[str] = frozenset()) -> list[dict]:  # bekannte: ignoriert
    wurzel = ET.fromstring(http.hole(f"https://{ats_id}.jobs.personio.de/xml").content)
    stellen = []
    for p in wurzel.iter("position"):
        id_ = p.findtext("id").strip()
        orte = [(o.text or "").strip() for o in p.iter("office")]  # iter: auch <additionalOffices>
        orte = [o for o in orte if o]
        roh = "".join(f"<h3>{d.findtext('name') or ''}</h3>{d.findtext('value') or ''}"
                      for d in p.iter("jobDescription"))
        text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", roh)).split())
        vertrag = "Befristet" if p.findtext("employmentType") == "temporary" else _SCHEDULE.get(p.findtext("schedule"), "")
        stellen.append({
            "ext_id": id_,
            "titel": (p.findtext("name") or "").strip(),
            "ort": ", ".join(orte),
            "remote": any(o.lower() == "remote" for o in orte),
            "url": f"https://{ats_id}.jobs.personio.de/job/{id_}",
            "beschreibung_kurz": text[:300],
            "text": text,
            "abschnitte": abschnitte(roh),
            "abteilung": (p.findtext("department") or "").strip(),
            "arbeitsmodell": "",
            "vertragsart": vertrag,
        })
    return stellen
