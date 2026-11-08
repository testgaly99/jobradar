"""Einmaliger Umzug: data/jobs.json (alte Seite) -> Supabase. Mehrfach ausfuehrbar, aendert dann nichts mehr."""
import json
from pathlib import Path

from scraper import db

PFAD = Path(__file__).parent.parent / "data" / "jobs.json"
FELDER = ("titel", "ort", "remote", "url", "beschreibung_kurz", "erstmals_gesehen", "zuletzt_gesehen")


def umziehen(alt):
    """alt: {id: Stelle} aus jobs.json. Gibt (aktualisiert, eingefuegt, uebersprungen) zurueck."""
    firmen = {c["name"] for c in db._req("GET", "companies", params={"select": "name"})}
    bestand, neu, fruehere = {}, [], {}
    for firma in sorted({j["unternehmen"] for j in alt.values()}):
        if firma in firmen:
            bestand.update(db._bestand(firma))
    uebersprungen = 0
    for id_, j in alt.items():
        if id_ in bestand:
            if j["erstmals_gesehen"] < (bestand[id_]["erstmals_gesehen"] or "9999"):
                fruehere.setdefault(j["erstmals_gesehen"], []).append(id_)
        elif j["unternehmen"] not in firmen:
            uebersprungen += 1
        else:
            zeile = {"id": id_, "unternehmen": j["unternehmen"], **{k: j.get(k) for k in FELDER}}
            if j["status"] == "offen":
                zeile.update(status="offen", sichtbar=True)
            else:  # Mini-Notiz laut CLAUDE.md Abschnitt 9
                zeile.update(status="geschlossen", sichtbar=False, text=None)
            neu.append(zeile)
    db._upsert("jobs", neu, "id")
    for datum, ids in fruehere.items():
        for i in range(0, len(ids), db.CHUNK):
            db._req("PATCH", "jobs", params={"id": db._in(ids[i:i + db.CHUNK])}, json={"erstmals_gesehen": datum})
    return sum(map(len, fruehere.values())), len(neu), uebersprungen


if __name__ == "__main__":
    a, e, u = umziehen(json.loads(PFAD.read_text(encoding="utf-8")))
    print(f"aktualisiert: {a}, eingefuegt: {e}, uebersprungen: {u}")
