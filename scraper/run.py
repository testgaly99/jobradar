"""Gesamtlauf: alle aktiven Unternehmen abrufen, filtern, in Supabase abgleichen, Bericht schreiben."""
import os
import sys
import tempfile
import json
import time
import contextlib
import io
from collections import Counter
from datetime import date
from pathlib import Path

from scraper.anforderungen import pruefsumme, zerlege
from scraper.ats import ADAPTER
from scraper import db, ki, nachruesten
from scraper.companies import lade_unternehmen
from scraper.logo import hole_logo
from scraper.steckbrief import deutsch_nachtragen, steckbrief
from scraper.sprachniveau import rang
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


_MELDUNGEN = {"kein Objekt", "doppelte ID", "isListed ungültig", "Status ungültig", "vertagt", "unvollstaendig"}  # feste Adapter-Gründe


def _grund(s, bekannte, gesehen):
    """Kurzer, fester Grund, warum eine einzelne Stelle übersprungen wird (nie Rohdaten); None = gültig."""
    if not isinstance(s, dict):
        return "kein Objekt"
    if "uebersprungen" in s:  # Adapter meldet eine kaputte Einzelstelle
        m = s["uebersprungen"]
        return m if isinstance(m, str) and m in _MELDUNGEN else "ungültige Meldung"  # nie Rohwerte in den Bericht
    ext_id = s.get("ext_id")
    if not isinstance(ext_id, str) or not ext_id.strip():
        return "ungültige ID"
    if ext_id in gesehen:
        return "doppelte ID"
    unveraendert = s.get("unveraendert", False)
    if not isinstance(unveraendert, bool):
        return "ungültige Markierung"
    if unveraendert:
        return None if ext_id in bekannte else "unbekannte ID"
    for feld, grund in (("titel", "ohne Titel"), ("url", "ohne URL")):
        if not isinstance(s.get(feld), str) or not s[feld].strip():
            return grund
    return None


def _pruefe_stellen(stellen, bekannte):
    """Kaputte Gesamtantwort kippt die Firma; kaputte Einzelstellen werden übersprungen. [] bleibt gültig."""
    if not isinstance(stellen, list):
        raise ValueError("Abrufantwort ist keine Liste")
    gueltig, uebersprungen, gesehen = [], Counter(), set()
    for s in stellen:
        grund = _grund(s, bekannte, gesehen)
        if grund:
            uebersprungen[grund] += 1
        else:
            gesehen.add(s["ext_id"])
            gueltig.append(s)
    return gueltig, uebersprungen


def _firma(f, heute):
    """Gibt die Berichtszeile fuer ein Unternehmen zurueck; bei Fehler wird nichts geschrieben."""
    name = f["name"]
    zeile = {"name": name, "gefunden": 0, "gefiltert": 0, "neu": 0,
             "geschlossen": 0, "fehler": "", "gruende": {}, "uebersprungen": {}}
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
        gueltig, uebersprungen = _pruefe_stellen(stellen, bekannte)
        # alles kaputt: eher Formatwechsel beim ATS als Einzelfehler; „vertagt“/„unvollstaendig“ (Tagesgrenze, 429,
        # Liste nicht ganz gelesen) sind keiner
        if stellen and not gueltig and set(uebersprungen) - {"vertagt", "unvollstaendig"}:
            zeile.update(gefunden=len(stellen), uebersprungen=dict(uebersprungen),
                         fehler=f"{schritt}: alle {len(stellen)} Stellen übersprungen (Format geändert?)")
            return zeile
        unveraendert = [s["ext_id"] for s in gueltig if s.get("unveraendert")]
        voll = [s for s in gueltig if not s.get("unveraendert")]
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
        # Eine übersprungene Stelle könnte eine bestehende sein: dann nichts schließen.
        # „vertagt“ heißt: Adressliste vollständig, nur neue Seiten auf morgen verschoben -> Verschwundenes darf schließen
        neu, geschlossen = db.schreibe(name, behalten, heute, unveraendert,
                                       schliessen=not (set(uebersprungen) - {"vertagt"}))
        zeile.update(gefunden=len(stellen), gefiltert=sum(gruende.values()), gruende=dict(gruende),
                     uebersprungen=dict(uebersprungen), neu=neu, geschlossen=geschlossen)
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
        if f.get("uebersprungen"):
            z.append(f"- {f['name']}: {sum(f['uebersprungen'].values())} Stellen übersprungen ("
                     + ", ".join(f"{g}: {n}" for g, n in f["uebersprungen"].items()) + "), nichts geschlossen")
    if bericht.get("deutsch"):
        z.append(f"- Deutschniveau nachgerüstet: {bericht['deutsch']}")
    if bericht.get("ki"):
        z.append("- KI: " + ", ".join(f"{k}: {v}" for k, v in bericht["ki"].items()))
    if bericht.get("nachruesten"):
        z.append("- Bewerbungen nachgerüstet: " + ", ".join(f"{k}: {v}" for k, v in bericht["nachruesten"].items()))
    z.extend('- ' + s for s in bericht.get('ranglisten_hinweise', []))
    if 'laufzeit_min' in bericht:
        z.append(f"- Laufzeit: {bericht['laufzeit_min']} min")
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
        def ausblenden():
            erg["ausgeblendet"] = erg.get("ausgeblendet", 0) + db.nein_ausblenden()
        schritte = [("ausblenden", ausblenden)]  # zuerst: wieder sichtbar gesetzte "nein"-Stellen sofort weg
        if not os.environ.get("GROQ_API_KEY"):
            erg["hinweis"] = "GROQ_API_KEY fehlt, keine KI-Auswertung"
        else:
            schritte += [("auswerten", lambda: erg.update(ki.auswerten(heute, frist_s=3600))),
                         ("nachfuellen", lambda: erg.update(nachgefuellt=ki.nachfuellen(frist_s=3600))),
                         ("ausblenden", ausblenden)]  # frisch ausgewertete "nein"-Stellen; Whitelist-Firmen bleiben sichtbar
        for name, schritt in schritte:
            try:
                schritt()
            except Exception as e:
                print(f"Hinweis: KI {name} fehlgeschlagen: {kurzfehler(e)}")
    except Exception as e:
        print(f"Hinweis: KI-Schritt fehlgeschlagen: {kurzfehler(e)}")
    return erg


def _deutsch_nachruesten():
    """Deutschniveau für Stellen von vor Migration 013 nachtragen; darf den Lauf nie kippen."""
    n = 0
    try:
        if not db.deutsch_spalte_da():
            return 0
        for s in db.stellen_ohne_deutsch():
            try:
                sb = deutsch_nachtragen(s.get("steckbrief"), s.get("abschnitte"), s.get("text"))
            except Exception as e:  # eine kaputte Anzeige darf die übrigen nicht aufhalten
                print(f"Hinweis: Deutschniveau einer Stelle übersprungen: {kurzfehler(e)}")
                continue
            db.setze_deutsch(s["id"], sb, rang(sb["deutsch"]))
            n += 1
    except Exception as e:
        print(f"Hinweis: Deutschniveau nachrüsten fehlgeschlagen: {kurzfehler(e)}")
    return n


def _anforderungen_nachruesten(grenze=2000):
    """Plan 6a, Task 1: Anforderungsliste je offener Stelle und je Bewerbung ohne Stelle (Q111) neu berechnen, wenn
    die Prüfsumme fehlt oder nicht mehr passt; darf den Lauf nie kippen."""
    n = 0
    try:
        if not db.anforderung_spalte_da():
            return 0
        for tabelle, zeilen, feld in (('jobs', db.anforderungen_stellen(), 'abschnitte'),
                                      ('applications', db.anforderungen_bewerbungen(), 'snapshot_abschnitte')):
            for z in zeilen:
                if n >= grenze:
                    return n
                liste = zerlege(z.get(feld))
                summe = pruefsumme(liste)
                if z.get('anforderungs_hash') != summe:
                    db.setze_anforderungen(tabelle, z['id'], liste, summe)
                    n += 1
    except Exception as e:
        print(f"Hinweis: Anforderungslisten nachrüsten fehlgeschlagen: {kurzfehler(e)}")
    return n


def _nachruesten():
    """Bewerbungen aus Firmenseiten nachrüsten (Link-Schnellstart); darf den Lauf nie kippen."""
    try:
        return nachruesten.lauf()
    except Exception as e:
        print(f"Hinweis: Nachrüsten fehlgeschlagen: {kurzfehler(e)}")
        return {}


def _original_suche():
    """Original-Suche darf keine privaten Fehlermeldungen oder Namen protokollieren."""
    try:
        from scraper import original_suche
        log = io.StringIO()
        with contextlib.redirect_stdout(log), contextlib.redirect_stderr(io.StringIO()):
            erg = original_suche.lauf()
        if 'Hinweis: Migration 020 offen, Original-Suche übersprungen.' in log.getvalue():
            print('Hinweis: Migration 020 offen, Original-Suche übersprungen.')
        return {k: erg[k] for k in ('gesucht','gefunden','auswahl','nicht_gefunden')
                if type(erg.get(k)) is int and erg[k] >= 0}
    except Exception:
        print('Hinweis: Original-Suche konnte nicht abgeschlossen werden.')
        return {}


def lauf(heute, datenordner="data"):
    start = time.monotonic()
    datenordner = Path(datenordner)
    firmen = lade_unternehmen(datenordner / "companies.csv")
    hinweise, ausgaben = [], []
    # Abgelaufene Ausgaben nur nicht importieren; Firmen schaltet allein der monatliche Ranglisten-Lauf ab (Nutzer, Q258).
    for pfad in sorted((datenordner / 'ranglisten').glob('*.json')):
        try:
            a = json.loads(pfad.read_text(encoding='utf-8'))
            if a['ausgabe']['gueltig_bis'] <= heute:
                hinweise.append(f'Rangliste {pfad.name} abgelaufen; nicht importiert.')
                continue
            ausgaben.append((pfad, a))
        except Exception as e:
            hinweise.append(f'Ranglisten-Import {pfad.name}: {kurzfehler(e)}')
    db._spalten = db._deutsch = db._anforderung = None  # Spalten-Pruefungen (Migration 005, 013) einmal pro Lauf neu
    db._firmen_quellen = None
    db._herkunft = None
    db._zusatzfirmen = None
    from scraper.bestand_umziehen import umziehen
    firmen = umziehen(firmen, datenordner / 'companies.csv')
    konflikt = set(db.sync_companies(firmen))  # Stellen verweisen per FK auf companies
    if konflikt:
        # Nur die Anzahl: bericht.md ist öffentlich, die Namen stehen in der Datenbank.
        hinweise.append(f'Firmen mit Namenskonflikt zu einer DB-Firma übersprungen: {len(konflikt)} (mit Claude prüfen).')
        firmen = [f for f in firmen if f['name'] not in konflikt]
    if not db.firmen_quellen_da():
        hinweise.append('Migration 014 offen; Ranglisten-Import übersprungen.')
    else:
        try:
            db.bereinige_ausgaben()
        except Exception as e:
            hinweise.append(f'Ranglisten-Aufbewahrung: {kurzfehler(e)}')
        for pfad, a in ausgaben:
            try:
                db.importiere_ausgabe(a)
            except Exception as e:
                hinweise.append(f'Ranglisten-Import {pfad.name}: {kurzfehler(e)}')
    aktive = [f for f in firmen if f['aktiv'] == 'ja' and f.get('status', 'aktiv') == 'aktiv']
    _logos(aktive)
    bericht = {"stand": heute, "firmen": [_firma(f, heute) for f in aktive], 'ranglisten_hinweise': hinweise}
    if os.environ.get('GITHUB_RUN_ID'):
        bericht['workflow_lauf']={'id':os.environ['GITHUB_RUN_ID'],'versuch':os.environ.get('GITHUB_RUN_ATTEMPT','1')}
    oeffentliche_firmen=list(bericht['firmen'])
    bericht['private_firmen'] = {'abgerufen': 0, 'fehler': 0}
    diagnosen_db = []
    bericht['gesundheit_db_aktuell'] = False
    bereits_abgerufen = {(f.get('ats_typ'), f.get('ats_id')) for f in aktive if f.get('ats_typ') and f.get('ats_id')}
    # Adapter können URLs ausgeben: DB-Firmen auch vor öffentlichen Workflow-Logs schützen.
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        private_firmen=db.db_firmen()
        for f in private_firmen:
            if f.get('status')=='aktiv' and f.get('aktiv')=='ja':
                portal = (f.get('ats_typ'), f.get('ats_id'))
                if f.get('ats_typ') and f.get('ats_id') and portal in bereits_abgerufen:
                    continue
                privat = f.get('fuer_alle', True) is False
                if privat and f.get('nutzer', 0) <= 0:
                    continue
                if f.get('ats_typ') and f.get('ats_id'):
                    bereits_abgerufen.add(portal)
                zeile = _firma(f,heute)
                diagnosen_db.append(zeile)
                if privat:
                    bericht['private_firmen']['abgerufen'] += 1
                    bericht['private_firmen']['fehler'] += bool(zeile['fehler'])
                else:
                    bericht['firmen'].append(zeile)
        try:
            db.speichere_firmen_gesundheit(heute, diagnosen_db)
            bericht['gesundheit_db_aktuell'] = True
        except Exception:
            print('Zusätzliche Gesundheitsdiagnosen nicht gespeichert.')
    db.snapshot_nachruesten()  # nach allen Firmen
    bericht["deutsch"] = _deutsch_nachruesten()  # vor den KI-Schritten (Plan Sprachniveau, Task 3)
    bericht["anforderungen"] = _anforderungen_nachruesten()  # Plan 6a, Task 1
    bericht["ki"] = _ki(heute)
    bericht["nachruesten"] = _nachruesten()
    bericht["original_suche"] = _original_suche()
    bericht['laufzeit_min'] = round((time.monotonic() - start) / 60, 1)
    _schreibe_text(datenordner / "bericht.md", _markdown({**bericht,'firmen':oeffentliche_firmen}))
    db.speichere_lauf(bericht)
    return bericht


if __name__ == "__main__":
    b = lauf(date.today().isoformat())
    fehler = [f for f in b["firmen"] if f["fehler"]]
    print(f"{len(b['firmen'])} Unternehmen, {len(fehler)} Fehler, "
          f"{sum(f['neu'] for f in b['firmen'])} neu, {sum(f['geschlossen'] for f in b['firmen'])} geschlossen")
    # Firmennamen aus DB-Listen dürfen nicht im öffentlichen Workflow-Protokoll stehen.
    sys.exit(1 if b["firmen"] and len(fehler) == len(b["firmen"]) else 0)
