"""Probe: 20 gemischte offene Stellen an Groq schicken und die unveraenderten Antworten als HTML-Seite schreiben.
Nur lesend (keine Schreibzugriffe auf die Datenbank). Aufruf: py -m scraper.ki_probe <ausgabe.html>"""
import html
import json
import sys
from datetime import datetime, timezone
from itertools import zip_longest

from . import db, ki

GRENZFAELLE = ("werkstudent", "assistenz", "sales")


def _englisch(s):
    return (s.get("text") or "").count(" the ") >= 5


def waehle_probe(stellen: list[dict], n: int = 20) -> list[dict]:
    """Deterministische Mischung: je Grenzfall-Titel eine, mind. 4 englische, Rest reihum ueber die Firmen."""
    alle = sorted(stellen, key=lambda s: str(s["id"]))
    gew = {}

    def nimm(s):
        gew.setdefault(s["id"], s)

    for wort in GRENZFAELLE:
        for s in alle:
            if wort in (s.get("titel") or "").lower():
                nimm(s)
                break
    for s in [s for s in alle if _englisch(s)][:4]:
        nimm(s)
    firmen = {}
    for s in alle:
        firmen.setdefault(s["unternehmen"], []).append(s)
    for reihe in zip_longest(*firmen.values()):
        for s in reihe:
            if s and len(gew) < n:
                nimm(s)
    return list(gew.values())[:n]


def _lade_offene():
    zeilen = []
    while True:
        teil = db._req("GET", "jobs", params={"status": "eq.offen", "select": "id,unternehmen,titel,url,text",
                                              "order": "id", "limit": db.SEITE, "offset": len(zeilen)})
        zeilen += teil
        if len(teil) < db.SEITE:
            return zeilen


def _liste(v):
    return "<ul>" + "".join(f"<li>{html.escape(x)}</li>" for x in v) + "</ul>"


def _zeile(s, erg):
    e = html.escape
    kopf = (f'<td><a href="{e(s.get("url") or "", quote=True)}">{e(s.get("titel") or "")}</a></td>'
            f'<td>{e(s.get("unternehmen") or "")}</td>')
    if erg["fehler"]:
        mitte = f'<td colspan="5"><b>Fehler:</b> {e(erg["fehler"])}</td>'
    elif erg["gueltig"]:
        f = erg["felder"]  # unveraendert aus Groqs JSON, nicht die normalisierte Fassung von pruefe
        mitte = (f'<td>{_liste(f["aufgaben"])}</td><td>{_liste(f["muss"])}</td><td>{e(f["studium"])}</td>'
                 f'<td>{e(f["taetigkeit"])}</td><td>{e(f["sprache"])}</td>')
    else:
        mitte = f'<td colspan="5"><b>ungültig</b><pre>{e(erg["roh"])}</pre></td>'
    ende = (f'<td>{e(erg["modell"])}</td><td>{e(erg["zeit"])}</td>'
            f'<td><details><summary>Rohantwort von Groq</summary><pre>{e(erg["roh"])}</pre></details>'
            f'<details><summary>Text</summary><pre>{e(s.get("text") or "")}</pre></details></td>')
    return f"<tr>{kopf}{mitte}{ende}</tr>"


def baue_html(zeilen) -> str:
    kopf = "".join(f"<th>{h}</th>" for h in ("Titel", "Firma", "Aufgaben", "Muss", "Studium", "Tätigkeit",
                                              "Sprache", "Modell", "Zeitpunkt", "Original"))
    return ('<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Groq-Probe</title>'
            '<style>:root{color-scheme:light dark}body{font:14px system-ui;margin:1rem}'
            'table{border-collapse:collapse}td,th{border:1px solid #8888;padding:.3rem;vertical-align:top;text-align:left}'
            'pre{white-space:pre-wrap;max-width:40rem}ul{margin:0;padding-left:1.1rem}</style></head><body>'
            f'<h1>Groq-Probe</h1><table><tr>{kopf}</tr>{"".join(_zeile(s, e) for s, e in zeilen)}</table></body></html>')


def probe(stellen, ausgabe, anfrage=ki.anfrage):
    zeilen = []
    for s in stellen:
        erg = {"fehler": "", "gueltig": False, "roh": "", "felder": None, "modell": "",
               "zeit": datetime.now(timezone.utc).isoformat(timespec="seconds")}
        stopp = False
        try:
            erg["roh"], erg["modell"] = anfrage(s.get("text") or "", ki.GROSS)
            erg["zeit"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            try:
                erg["felder"] = json.loads(erg["roh"])
                ki.pruefe(erg["felder"])  # nur zur Entscheidung gueltig/ungueltig
                erg["gueltig"] = True
            except (ValueError, TypeError, ki.Ungueltig):
                pass
        except ki.Erschoepft as e:
            erg["fehler"], stopp = f"Tageslimit erschöpft ({e.modell})", True
        except ki.GroqWeg as e:
            erg["fehler"], stopp = f"Groq nicht erreichbar ({e})", True
        except Exception as e:  # z. B. fehlender Schluessel, unerwartetes Antwortformat; nur Typ + Text
            erg["fehler"], stopp = f"{type(e).__name__}: {e}", True
        zeilen.append((s, erg))
        if stopp:
            break
    with open(ausgabe, "w", encoding="utf-8") as f:
        f.write(baue_html(zeilen))
    return zeilen


if __name__ == "__main__":
    probe(waehle_probe(_lade_offene()), sys.argv[1])
