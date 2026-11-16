"""Gesamtlauf: alle aktiven Unternehmen abrufen, filtern, in Supabase abgleichen, Bericht schreiben."""
import os
import sys
import tempfile
from collections import Counter
from datetime import date
from pathlib import Path

from scraper.ats import ADAPTER
from scraper import db, ki
from scraper.companies import lade_unternehmen
from scraper.logo import hole_logo
from scraper.steckbrief import steckbrief
from scraper.filter import deutsche_staedte, erfahrungslevel, ist_relevant, land
from scraper.fehler import kurzfehler


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


def _pruefe_stellen(stellen, bekannte):
    """Kaputte Antworten vor jedem Stellenabgleich ablehnen; [] bleibt ein gültiger Abruf."""
    if not isinstance(stellen, list):
        raise ValueError("Abrufantwort ist keine Liste")
    gesehen = set()
    for s in stellen:
        if not isinstance(s, dict):
            raise ValueError("Stelleneintrag ist kein Objekt")
        ext_id = s["ext_id"]
        if not isinstance(ext_id, str) or not ext_id.strip():
            raise ValueError("Ungültige Stellen-ID")
        if ext_id in gesehen:
            raise ValueError("Doppelte Stellen-ID")
        gesehen.add(ext_id)
        unveraendert = s.get("unveraendert", False)
        if not isinstance(unveraendert, bool):
            raise ValueError("Ungültige unveraendert-Markierung")
        if unveraendert:
            if ext_id not in bekannte:
                raise ValueError("Unbekannte ID in unveraendert-Kurzmeldung")
        else:
            for feld in ("titel", "url"):
                if not isinstance(s[feld], str) or not s[feld].strip():
                    raise ValueError(f"Ungültiges Pflichtfeld: {feld}")


def _firma(f, heute):
    """Gibt die Berichtszeile fuer ein Unternehmen zurueck; bei Fehler wird nichts geschrieben."""
    name = f["name"]
    zeile = {"name": name, "gefunden": 0, "gefiltert": 0, "neu": 0,
             "geschlossen": 0, "fehler": "", "gruende": {}}
    schritt = "Adapterwahl"
    try:
        adapter = ADAPTER.get(f["ats_typ"])
        if adapter is None:
            raise LookupError(f"kein Adapter für {f['ats_typ']}")
        schritt = "Bestand"
        bekannte = frozenset(i[len(name) + 1:] for i in db.lade_offene(name))
        schritt = "Abruf"
        stellen = adapter(f["ats_id"], bekannte=bekannte)
        schritt = "Antwortprüfung"
        _pruefe_stellen(stellen, bekannte)
        unveraendert = [s["ext_id"] for s in stellen if s.get("unveraendert")]
        voll = [s for s in stellen if not s.get("unveraendert")]
        behalten, gruende = [], Counter()
        schritt = "Filterung"
        for s in voll:
            ok, grund = ist_relevant(s["titel"], s["ort"], s["remote"])
            if ok:
                try:
                    sbr = steckbrief(s.get("abschnitte"), s["text"])
                except Exception as e:  # eine Anzeige darf nie die ganze Firma kippen
                    print(f"Hinweis: Steckbrief fehlgeschlagen: {kurzfehler(e)}")
                    sbr = None
                behalten.append({**s, "erfahrungslevel": erfahrungslevel(s["titel"], (sbr or {}).get("erfahrung_jahre")),
                                 "staedte": deutsche_staedte(s["ort"]), "land": land(s["ort"]),
                                 "steckbrief": sbr})
            else:
                gruende[grund] += 1
        schritt = "Abgleich"
        neu, geschlossen = db.schreibe(name, behalten, heute, unveraendert)
        zeile.update(gefunden=len(stellen), gefiltert=sum(gruende.values()), gruende=dict(gruende),
                     neu=neu, geschlossen=geschlossen)
    except Exception as e:
        zeile["fehler"] = f"{schritt}: {kurzfehler(e)}"[:200]
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
    if bericht.get("ki"):
        z.append("- KI: " + ", ".join(f"{k}: {v}" for k, v in bericht["ki"].items()))
    return "\n".join(z) + "\n"


def _logos(firmen):
    """Je Firma ohne logo_url hoechstens ein Abruf pro Lauf; Fehler duerfen den Lauf nie kippen."""
    try:
        fehlen = db.firmen_ohne_logo()
        for f in firmen:
            if f["aktiv"] == "ja" and f["name"] in fehlen and f["careers_url"]:
                url = hole_logo(f["careers_url"])
                if url:
                    db.setze_logo(f["name"], url)
    except Exception as e:
        print(f"Hinweis: Logos fehlgeschlagen: {kurzfehler(e)}")


def _ki(heute):
    """Groq-Auswertung und Nachfuellen nur mit Migration 009 und Schluessel; 'nein' wird immer ausgeblendet.
    Kein Schritt darf den Lauf kippen."""
    erg = {}
    try:
        if not db.ki_spalten_da():
            return {"hinweis": "Migration 009 fehlt, KI übersprungen"}
        schritte = [("ausblenden", lambda: erg.update(ausgeblendet=db.nein_ausblenden()))]  # zuerst: wieder sichtbar gesetzte "nein"-Stellen sofort weg
        if not os.environ.get("GROQ_API_KEY"):
            erg["hinweis"] = "GROQ_API_KEY fehlt, keine KI-Auswertung"
        else:
            schritte += [("auswerten", lambda: erg.update(ki.auswerten(heute, frist_s=3600))),
                         ("nachfuellen", lambda: erg.update(nachgefuellt=ki.nachfuellen()))]
        for name, schritt in schritte:
            try:
                schritt()
            except Exception as e:
                print(f"Hinweis: KI {name} fehlgeschlagen: {kurzfehler(e)}")
    except Exception as e:
        print(f"Hinweis: KI-Schritt fehlgeschlagen: {kurzfehler(e)}")
    return erg


def lauf(heute, datenordner="data"):
    datenordner = Path(datenordner)
    firmen = lade_unternehmen(datenordner / "companies.csv")
    db._spalten = None  # Spalten-Pruefung (Migration 005) einmal pro Lauf neu
    db.sync_companies(firmen)  # Stellen verweisen per FK auf companies
    _logos(firmen)
    bericht = {"stand": heute, "firmen": [_firma(f, heute) for f in firmen if f["aktiv"] == "ja"]}
    db.snapshot_nachruesten()  # nach allen Firmen
    bericht["ki"] = _ki(heute)
    _schreibe_text(datenordner / "bericht.md", _markdown(bericht))
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
