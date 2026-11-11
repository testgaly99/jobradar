"""Gesamtlauf: alle aktiven Unternehmen abrufen, filtern, in Supabase abgleichen, Bericht schreiben."""
import os
import sys
import tempfile
from collections import Counter
from datetime import date
from pathlib import Path

from scraper.ats import ADAPTER
from scraper import db
from scraper.companies import lade_unternehmen
from scraper.steckbrief import steckbrief
from scraper.filter import deutsche_staedte, erfahrungslevel, ist_relevant, land


def _schreibe_text(pfad, text):
    # Temp-Datei + os.replace : nie eine halbe Datei.
    fd, tmp = tempfile.mkstemp(dir=Path(pfad).parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        os.replace(tmp, pfad)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def _firma(f, heute):
    """Gibt die Berichtszeile fuer ein Unternehmen zurueck; bei Fehler wird nichts geschrieben."""
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
                try:
                    sbr = steckbrief(s.get("abschnitte"), s["text"])
                except Exception as e:  # eine Anzeige darf nie die ganze Firma kippen
                    print(f"Hinweis: Steckbrief fehlgeschlagen ({name}): {type(e).__name__}: {e}")
                    sbr = None
                behalten.append({**s, "erfahrungslevel": erfahrungslevel(s["titel"]),
                                 "staedte": deutsche_staedte(s["ort"]), "land": land(s["ort"]),
                                 "steckbrief": sbr})
            else:
                gruende[grund] += 1
        neu, geschlossen = db.schreibe(name, behalten, heute)
        zeile.update(gefunden=len(stellen), gefiltert=sum(gruende.values()), gruende=dict(gruende),
                     neu=neu, geschlossen=geschlossen)
    except Exception as e:
        zeile["fehler"] = f"{type(e).__name__}: {e}"[:200]
    return zeile


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


def lauf(heute, datenordner="data"):
    datenordner = Path(datenordner)
    firmen = lade_unternehmen(datenordner / "companies.csv")
    db._spalten = None  # Spalten-Pruefung (Migration 005) einmal pro Lauf neu
    db.sync_companies(firmen)  # Stellen verweisen per FK auf companies
    bericht = {"stand": heute, "firmen": [_firma(f, heute) for f in firmen if f["aktiv"] == "ja"]}
    _schreibe_text(datenordner / "bericht.md", _markdown(bericht))
    db.snapshot_nachruesten()  # nach allen Firmen
    db.speichere_lauf(bericht)
    return bericht


if __name__ == "__main__":
    b = lauf(date.today().isoformat())
    fehler = [f for f in b["firmen"] if f["fehler"]]
    print(f"{len(b['firmen'])} Unternehmen, {len(fehler)} Fehler, "
          f"{sum(f['neu'] for f in b['firmen'])} neu, {sum(f['geschlossen'] for f in b['firmen'])} geschlossen")
    for f in fehler:
        print(f"  Fehler {f['name']}: {f['fehler']}")
    sys.exit(1 if b["firmen"] and len(fehler) == len(b["firmen"]) else 0)
