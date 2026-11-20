"""Link-Schnellstart: Bewerbungen aus Firmen-Karriereseiten nachts nachrüsten (Gliederung, Steckbrief, Groq).
Die Adresse kommt vom Nutzer, deshalb wird jedes Ziel (auch robots.txt und Weiterleitungen) vor dem Abruf geprüft.
Meldungen nennen nie die Adresse: die Protokolle des Nachtlaufs sind öffentlich."""
import ipaddress
import os
import socket
from urllib.parse import urlsplit

import requests

from scraper import browser_seite, db, http, ki
from scraper.abschnitte import abschnitte, text_aus_html
from scraper.ats import sitemap
from scraper.fehler import kurzfehler
from scraper.steckbrief import steckbrief

# Gleich wie PORTALE in web/lib/stellen-import.ts (ein Test prüft das); "name.*" steht für beliebige Endungen.
PORTALE = ["linkedin.com", "stepstone.*", "indeed.*", "xing.com", "glassdoor.*", "monster.*", "kununu.com"]


def ist_portal(host):
    l = host.lower().rstrip(".").split(".")
    for p in PORTALE:
        if not p.endswith(".*"):
            n = p.split(".")
            if len(l) >= 2 and l[-len(n):] == n:
                return True
        elif len(l) >= 2 and len(l[-1]) >= 2:
            name = p[:-2]
            if l[-2] == name or (len(l[-1]) == 2 and len(l) >= 3 and l[-2] in ("co", "com") and l[-3] == name):
                return True
    return False


def _aufloesen(host):
    return [a[4][0] for a in socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)]


def pruefe_ziel(url, aufloesen=_aufloesen):
    """Nur https auf Port 443, ohne Zugangsdaten, kein Jobportal, alle aufgelösten Adressen öffentlich."""
    t = urlsplit(url)
    if t.scheme != "https" or t.port not in (None, 443) or t.username or t.password or not t.hostname:
        raise ValueError("Adresse nicht erlaubt")
    if ist_portal(t.hostname):
        raise ValueError("Jobportal")
    try:
        ips = [ipaddress.ip_address(t.hostname)]
    except ValueError:
        ips = [ipaddress.ip_address(i.split("%")[0]) for i in aufloesen(t.hostname)]
    if not ips or not all(i.is_global for i in ips):
        raise ValueError("interne Adresse")


_STANDARD = object()
MIN_TEXT = 300  # weniger sichtbarer Text heißt: die Anzeige ist nicht da (leeres Gerüst, Cookie-Seite)


def _liste(x):
    return x if isinstance(x, list) else [x] if x else []


def _aus_jobposting(jp):
    """JobPosting → Gliederung, Text, Firma, Titel, Ort; None ohne Beschreibung."""
    html = jp.get("description") if isinstance(jp, dict) else None
    if not isinstance(html, str) or not html.strip():
        return None
    org = jp.get("hiringOrganization")
    firma = org if isinstance(org, str) else org.get("name") if isinstance(org, dict) else None
    ort_obj = next(iter(_liste(jp.get("jobLocation"))), None)
    adresse = next(iter(_liste(ort_obj.get("address"))), None) if isinstance(ort_obj, dict) else None
    ort = adresse.get("addressLocality") if isinstance(adresse, dict) else None
    titel = jp.get("title")
    return {"gliederung": abschnitte(html), "text": text_aus_html(html), "firma": firma if isinstance(firma, str) else None,
            "titel": text_aus_html(titel) if isinstance(titel, str) else None, "ort": ort if isinstance(ort, str) else None}


def _lies(link, hole, browser, pruefe):
    """Erst einfacher Abruf; ohne JobPosting im echten Browser (Seiten, die die Anzeige per JavaScript laden)."""
    try:
        daten = _aus_jobposting(sitemap.jobposting(sitemap._seitentext(hole(link, pruefe=pruefe))))
    except (ValueError, requests.RequestException):  # kein JobPosting oder HTTP-Fehler; robots.txt-Verbot bricht ab
        daten = None
    if daten is None and browser:
        r = browser(link, pruefe)
        daten = _aus_jobposting(r["jobposting"])
        if daten is None and len(r["text"]) >= MIN_TEXT:
            daten = {"gliederung": None, "text": r["text"], "firma": None, "titel": r["titel"] or None, "ort": None}
    if daten is None:
        raise ValueError("keine Anzeige lesbar")
    return daten


def lauf(frage=_STANDARD, hole=http.hole, aufloesen=_aufloesen, browser=_STANDARD, frage_ft=_STANDARD):
    """frage/frage_ft=None: ohne Groq (Gliederung, Steckbrief und Text trotzdem). browser=None: nur einfacher Abruf.
    Groq weg oder Tageslimit: Rest bleibt markiert. Eingetragenes des Nutzers wird nie überschrieben."""
    mit_groq = bool(os.environ.get("GROQ_API_KEY"))
    if frage is _STANDARD:
        frage = ki.frage_groq if mit_groq else None
    if frage_ft is _STANDARD:
        frage_ft = ki.firma_titel if mit_groq else None
    if browser is _STANDARD:
        browser = browser_seite.lies
    erg = {"nachgeruestet": 0, "uebersprungen": 0}
    for a in db.bewerbungen_zum_nachruesten():
        def pruefe(url):
            pruefe_ziel(url, aufloesen)
        try:
            pruefe(a["link"] or "")
            d = _lies(a["link"], hole, browser, pruefe)
            gliederung, text = d["gliederung"], d["text"]
            patch = {"snapshot_steckbrief": steckbrief(gliederung, text)}
            if gliederung:
                patch["snapshot_abschnitte"] = gliederung
            firma, titel = d["firma"], d["titel"]
            if frage_ft and not (a.get("firma") or firma):
                try:
                    f2, t2 = frage_ft(text[:ki.MAX_ZEICHEN])
                    firma, titel = firma or f2, titel or t2
                except ki.Ungueltig:
                    pass
            if frage:
                try:
                    e = frage(ki.kuerze_fuer_ki(gliederung, text), ki.GROSS)
                    patch["snapshot_ki"] = {k: v for k, v in e.items() if k not in ("studium", "taetigkeit")}
                except ki.Ungueltig:
                    pass  # Gliederung und Steckbrief trotzdem speichern
            leer = {"firma": firma, "titel": titel, "standort": d["ort"], "snapshot_text": text}
        except (ki.Erschoepft, ki.GroqWeg) as e:
            print(f"Hinweis: Nachrüsten beendet ({kurzfehler(e)}), Rest folgt beim nächsten Lauf.")
            break
        except Exception as e:  # nur diese Bewerbung: Markierung weg, damit sie nicht jede Nacht wieder abgerufen wird
            print(f"Hinweis: Bewerbung nicht nachgerüstet: {kurzfehler(e)}")
            db.setze_nachgeruestet(a["id"], {})
            erg["uebersprungen"] += 1
            continue
        db.fuelle_leere(a["id"], leer)
        db.setze_nachgeruestet(a["id"], patch)
        erg["nachgeruestet"] += 1
    return erg


if __name__ == "__main__":  # GitHub-Workflow „Anzeigen lesen“: nur Zähler ausgeben, nie Adressen
    print(f"Anzeigen gelesen: {lauf()}")
