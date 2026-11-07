"""Abgleich frisch abgerufener Stellen mit dem gespeicherten Bestand."""
import json
import os
import tempfile
from pathlib import Path

FELDER = ("titel", "ort", "remote", "url", "beschreibung_kurz")


def abgleichen(bestand, unternehmen, neue, heute):
    """Gibt einen neuen Bestand zurueck; die Eingabe bleibt unveraendert."""
    ergebnis = {k: dict(v) for k, v in bestand.items()}
    gesehen = set()
    for n in neue:
        id_ = f"{unternehmen}:{n['ext_id']}"
        gesehen.add(id_)
        alt = ergebnis.get(id_)
        ergebnis[id_] = {
            "id": id_,
            "unternehmen": unternehmen,
            **{f: n[f] for f in FELDER},
            "erstmals_gesehen": alt["erstmals_gesehen"] if alt else heute,
            "zuletzt_gesehen": heute,
            "status": "offen",
        }
    for id_, s in ergebnis.items():
        if s["unternehmen"] == unternehmen and id_ not in gesehen:
            s["status"] = "geschlossen"
    return ergebnis


def lade(pfad):
    pfad = Path(pfad)
    if not pfad.exists():
        return {}
    return json.loads(pfad.read_text(encoding="utf-8"))


def speichere(pfad, bestand):
    pfad = Path(pfad)
    text = json.dumps({k: bestand[k] for k in sorted(bestand)},
                      ensure_ascii=False, indent=1) + "\n"
    # Temp-Datei im selben Ordner + os.replace: ein Absturz hinterlaesst nie eine halbe Datei.
    fd, tmp = tempfile.mkstemp(dir=pfad.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        os.replace(tmp, pfad)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
