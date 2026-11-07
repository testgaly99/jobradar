"""Gesamtlauf: alle aktiven Unternehmen abrufen, filtern, abgleichen, Berichte schreiben."""
import json
import os
import sys
import tempfile
from collections import Counter
from datetime import date
from pathlib import Path

from scraper.ats import ADAPTER
from scraper.bestand import abgleichen, lade, speichere
from scraper.companies import lade_unternehmen
from scraper.filter import ist_relevant


def _schreibe_text(pfad, text):
    # Temp-Datei + os.replace wie in bestand.speichere: nie eine halbe Datei.
    fd, tmp = tempfile.mkstemp(dir=Path(pfad).parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        os.replace(tmp, pfad)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def _firma(bestand, f, heute):
    """Gibt (neuer Bestand, Berichtszeile) fuer ein Unternehmen zurueck."""
    name = f["name"]
    zeile = {"name": name, "gefunden": 0, "gefiltert": 0, "neu": 0,
             "geschlossen": 0, "fehler": "", "gruende": {}}
    try:
        adapter = ADAPTER.get(f["ats_typ"])
        if adapter is None:
            raise LookupError(f"kein Adapter für {f['ats_typ']}")
        stellen = adapter(f["ats_id"])
        behalten, gruende = [], Counter()
        for s in stellen:
            ok, grund = ist_relevant(s["titel"], s["ort"], s["remote"])
            if ok:
                behalten.append(s)
            else:
                gruende[grund] += 1
        neu = abgleichen(bestand, name, behalten, heute)
        vorher = {i: s for i, s in bestand.items() if s["unternehmen"] == name}
        zeile.update(
            gefunden=len(stellen), gefiltert=sum(gruende.values()), gruende=dict(gruende),
            neu=sum(1 for i, s in neu.items() if s["unternehmen"] == name and i not in vorher),
            geschlossen=sum(1 for i, s in vorher.items()
                            if s["status"] == "offen" and neu[i]["status"] == "geschlossen"))
    except Exception as e:
        zeile.update(gefunden=0, gefiltert=0, gruende={}, neu=0, geschlossen=0)
        zeile["fehler"] = f"{type(e).__name__}: {e}"[:200]
        return bestand, zeile  # Bestand bleibt unberuehrt
    return neu, zeile


def _markdown(bericht):
    z = [f"# Lauf vom {bericht['stand']}", "",
         "| Unternehmen | gefunden | gefiltert | neu | geschlossen | Fehler |",
         "|---|---|---|---|---|---|"]
    for f in bericht["firmen"]:
        fehler = f["fehler"].replace("|", "/").replace("\n", " ")
        z.append(f"| {f['name']} | {f['gefunden']} | {f['gefiltert']} | {f['neu']} "
                 f"| {f['geschlossen']} | {fehler} |")
    z.append("")
    for f in bericht["firmen"]:
        if f["gruende"]:
            z.append(f"- {f['name']} gefiltert: " + ", ".join(f"{g}: {n}" for g, n in f["gruende"].items()))
    return "\n".join(z) + "\n"


def lauf(heute, datenordner="data", seitenordner="site"):
    datenordner, seitenordner = Path(datenordner), Path(seitenordner)
    firmen = lade_unternehmen(datenordner / "companies.csv")
    bestand = lade(datenordner / "jobs.json")
    bericht = {"stand": heute, "firmen": []}
    for f in firmen:
        if f["aktiv"] != "ja":
            continue
        bestand, zeile = _firma(bestand, f, heute)
        bericht["firmen"].append(zeile)
    speichere(datenordner / "jobs.json", bestand)
    _schreibe_text(datenordner / "bericht.md", _markdown(bericht))
    offen = sorted((s for s in bestand.values() if s["status"] == "offen"), key=lambda s: s["id"])
    offen.sort(key=lambda s: s["erstmals_gesehen"], reverse=True)  # stabil: id bleibt Nebenschluessel
    daten = {"stand": heute,
             "unternehmen": [{k: v for k, v in f.items() if k != "notiz"} for f in firmen],
             "stellen": offen}
    _schreibe_text(seitenordner / "daten.json", json.dumps(daten, ensure_ascii=False, indent=None))
    return bericht


if __name__ == "__main__":
    b = lauf(date.today().isoformat())
    fehler = [f for f in b["firmen"] if f["fehler"]]
    print(f"{len(b['firmen'])} Unternehmen, {len(fehler)} Fehler, "
          f"{sum(f['neu'] for f in b['firmen'])} neu, {sum(f['geschlossen'] for f in b['firmen'])} geschlossen")
    for f in fehler:
        print(f"  Fehler {f['name']}: {f['fehler']}")
    sys.exit(1 if b["firmen"] and len(fehler) == len(b["firmen"]) else 0)
