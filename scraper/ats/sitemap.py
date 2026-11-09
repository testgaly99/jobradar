"""Sitemap + JSON-LD `JobPosting` (Stufe 2): eine Anfrage pro Stelle, bekannte Stellen werden nicht neu geladen.

ats_id = Sitemap-URL, optional mit Fragment als Filter für Stellen-URLs, z. B. ".../sitemap.xml#/offer/".
"""
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import date
from html import unescape
from urllib.parse import unquote, urlsplit

import requests

from scraper import http
from scraper.abschnitte import abschnitte, text_aus_html
from scraper.filter import _TITEL_RE

_LD = re.compile(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", re.S | re.I)
# dm: die JSON-LD-description ist nur ein Anrisstext, Aufgaben/Profil stehen im Seiten-HTML
_DM_TEXT = re.compile(r'data-testid="job-detail-description"[^>]*>(.*?)<[^>]*\bdata-testid=', re.S)
_TEXTFELDER = ("description", "responsibilities", "qualifications", "skills", "jobBenefits")
_MAX_FEHLSERIE = 5  # so viele Detailseiten in Folge nicht erreichbar: Firma abbrechen statt je bis zu 30 s warten
_VERTRAG = (("TEMPORARY", "Befristet"), ("CONTRACTOR", "Befristet"), ("FULL_TIME", "Vollzeit"), ("PART_TIME", "Teilzeit"))


def _ext_id(url):
    # Nur URL-sichere Zeichen: die Website baut daraus /stellen/<id>, "/" würde zu %2F
    t = urlsplit(url)
    id_ = re.sub(r"[^A-Za-z0-9._~-]+", "-", f"{t.path}?{t.query}").strip("-")
    return id_ if 0 < len(id_) <= 200 else hashlib.sha256(url.encode()).hexdigest()[:32]


def _urls(sitemap, index_aufloesen=True):
    wurzel = ET.fromstring(http.hole(sitemap).content)
    urls = [loc.text.strip() for loc in wurzel.findall(".//{*}loc") if loc.text]
    if index_aufloesen and wurzel.tag.endswith("sitemapindex"):
        return [u for teil in urls for u in _urls(teil, False)]
    return urls


def _vorgefiltert(url):
    titel = re.sub(r"[-_/]", " ", unquote(urlsplit(url).path)).lower()
    for aus, ein in (("ae", "ä"), ("oe", "ö"), ("ue", "ü")):
        titel = titel.replace(aus, ein)
    return bool(_TITEL_RE.search(titel))


def _objekte(x):
    if isinstance(x, list):
        for y in x:
            yield from _objekte(y)
    elif isinstance(x, dict):
        yield x
        yield from _objekte(x.get("@graph"))


def _jobposting(seite):
    for m in _LD.finditer(seite):
        start = re.search(r"[\[{]", m.group(1))  # Porsche/Bundesbank: Text vor dem JSON
        try:
            daten = json.JSONDecoder().raw_decode(m.group(1), start.start())[0] if start else None
        except ValueError:
            continue
        for o in _objekte(daten):
            if o.get("@type") == "JobPosting":
                return o
    raise ValueError("kein JobPosting")


def _liste(x):
    return x if isinstance(x, list) else [x] if x else []


def _stelle(url, ext_id, heute):
    seite = http.hole(url).text
    jp = _jobposting(seite)
    ablauf = str(jp.get("validThrough") or "")[:10]
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", ablauf) and ablauf < heute:
        return None
    # Porsche/Bundesbank liefern das HTML entity-escaped, Neura hat wörtliche "\n"
    roh = "".join(t if "<" in t else unescape(t) for k in _TEXTFELDER if isinstance(t := jp.get(k), str))
    if m := _DM_TEXT.search(seite):
        roh += m.group(1)
    roh = roh.replace("\\n", "\n")
    text = text_aus_html(roh)
    adressen = [o.get("address") or {} for o in _liste(jp.get("jobLocation"))]
    laender = [a.get("addressCountry") for a in adressen] + _liste(jp.get("applicantLocationRequirements"))
    teile = [a.get("addressLocality") for a in adressen] + [l.get("name") if isinstance(l, dict) else l for l in laender]
    remote = jp.get("jobLocationType") == "TELECOMMUTE"
    typen = _liste(jp.get("employmentType"))
    return {
        "ext_id": ext_id,
        "titel": unescape(jp["title"]).strip(),
        "ort": ", ".join(dict.fromkeys(str(t).strip() for t in teile if t)),
        "remote": remote,
        "url": url,
        "beschreibung_kurz": text[:300],
        "text": text,
        "abschnitte": abschnitte(roh),
        "abteilung": "",
        "arbeitsmodell": "Remote" if remote else "",
        "vertragsart": next((v for k, v in _VERTRAG if k in typen), ""),
    }


def hole_stellen(ats_id: str, bekannte: frozenset[str] = frozenset()) -> list[dict]:
    sitemap, _, filter_ = ats_id.partition("#")  # das Fragment wird nie abgerufen
    heute = date.today().isoformat()
    stellen, gesehen, zaehler, fehlserie = [], set(), Counter(), 0
    for url in _urls(sitemap):  # Fehler der Sitemap selbst kippen die Firma
        ext_id = _ext_id(url)
        if filter_ not in url or ext_id in gesehen:
            continue
        gesehen.add(ext_id)
        if _vorgefiltert(url):
            zaehler["vorgefiltert"] += 1
            continue
        # shortcut: eine bekannte Stelle, deren validThrough abläuft, bleibt offen, solange sie in der Sitemap steht;
        # Upgrade: bekannte Stellen alle N Tage neu laden
        if ext_id in bekannte:
            zaehler["unverändert"] += 1
            stellen.append({"ext_id": ext_id, "unveraendert": True})
            continue
        try:
            s = _stelle(url, ext_id, heute)
        except Exception as e:  # eine Anzeige darf nie die ganze Firma kippen
            zaehler[f"übersprungen ({type(e).__name__})"] += 1
            # nur Abruffehler zählen zur Serie; eine erreichbare Seite ohne JobPosting setzt sie zurück
            fehlserie = fehlserie + 1 if isinstance(e, (requests.RequestException, http.VerbotenDurchRobots)) else 0
            if fehlserie >= _MAX_FEHLSERIE:
                raise RuntimeError(f"{urlsplit(url).netloc}: {fehlserie} Detailseiten in Folge nicht erreichbar, "
                                   f"zuletzt {type(e).__name__}: {e}") from e
            continue
        fehlserie = 0
        if s is None:
            zaehler["abgelaufen"] += 1
        else:
            zaehler["geladen"] += 1
            stellen.append(s)
    print(f"Hinweis: {sitemap}: {len(gesehen)} Stellen-URLs, " + ", ".join(f"{k}: {v}" for k, v in zaehler.items()))
    return stellen
