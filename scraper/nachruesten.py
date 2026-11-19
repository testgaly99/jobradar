"""Link-Schnellstart: Bewerbungen aus Firmen-Karriereseiten nachts nachrüsten (Gliederung, Steckbrief, Groq).
Die Adresse kommt vom Nutzer, deshalb wird jedes Ziel (auch robots.txt und Weiterleitungen) vor dem Abruf geprüft.
Meldungen nennen nie die Adresse: die Protokolle des Nachtlaufs sind öffentlich."""
import ipaddress
import os
import socket
from urllib.parse import urlsplit

from scraper import db, http, ki
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


def lauf(frage=_STANDARD, hole=http.hole, aufloesen=_aufloesen):
    """frage=None: ohne Groq (Gliederung und Steckbrief trotzdem). Groq weg oder Tageslimit: Rest bleibt markiert."""
    if frage is _STANDARD:
        frage = ki.frage_groq if os.environ.get("GROQ_API_KEY") else None
    erg = {"nachgeruestet": 0, "uebersprungen": 0}
    for a in db.bewerbungen_zum_nachruesten():
        def pruefe(url):
            pruefe_ziel(url, aufloesen)
        try:
            pruefe(a["link"] or "")
            jp = sitemap.jobposting(sitemap._seitentext(hole(a["link"], pruefe=pruefe)))
            html = jp.get("description")
            if not isinstance(html, str) or not html.strip():
                raise ValueError("JobPosting ohne Beschreibung")
            gliederung, text = abschnitte(html), text_aus_html(html)
            patch = {"snapshot_abschnitte": gliederung, "snapshot_steckbrief": steckbrief(gliederung, text)}
            if frage:
                try:
                    e = frage(ki.kuerze_fuer_ki(gliederung, text), ki.GROSS)
                    patch["snapshot_ki"] = {k: v for k, v in e.items() if k not in ("studium", "taetigkeit")}
                except ki.Ungueltig:
                    pass  # Gliederung und Steckbrief trotzdem speichern
        except (ki.Erschoepft, ki.GroqWeg) as e:
            print(f"Hinweis: Nachrüsten beendet ({kurzfehler(e)}), Rest folgt beim nächsten Lauf.")
            break
        except Exception as e:  # nur diese Bewerbung: Markierung weg, damit sie nicht jede Nacht wieder abgerufen wird
            print(f"Hinweis: Bewerbung nicht nachgerüstet: {kurzfehler(e)}")
            db.setze_nachgeruestet(a["id"], {})
            erg["uebersprungen"] += 1
            continue
        db.setze_nachgeruestet(a["id"], patch)
        erg["nachgeruestet"] += 1
    return erg
