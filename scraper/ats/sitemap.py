"""Sitemap + `JobPosting` als JSON-LD oder Microdata (Stufe 2): eine Anfrage pro Stelle, bekannte Stellen werden nicht
neu geladen. Höchstens MAX_NEU neue Stellenseiten je Firma und Lauf; der Rest folgt an den nächsten Tagen.

ats_id = Sitemap-URL, optional mit Fragment als Filter für Stellen-URLs, z. B. ".../sitemap.xml#/offer/".
"""
import gzip
import hashlib
import io
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
from scraper.filter import _TITEL_RE, deutsche_staedte

_LD = re.compile(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", re.S | re.I)
# dm: die JSON-LD-description ist nur ein Anrisstext, Aufgaben/Profil stehen im Seiten-HTML
_DM_TEXT = re.compile(r'data-testid="job-detail-description"[^>]*>(.*?)<[^>]*\bdata-testid=', re.S)
_TEXTFELDER = ("description", "responsibilities", "qualifications", "skills", "jobBenefits")
_MAX_FEHLSERIE = 5  # so viele Ausfälle in Folge (siehe _ausfall): Firma abbrechen statt je bis zu 30 s warten
MAX_NEU = 300  # neue Stellenseiten je Firma und Lauf (Plan 2026-11-24 Task 2); schont Lauf und Server
_DE = re.compile(r"/de(?:[/_-]|$)|de[_-]de|germany|deutschland", re.I)
_META = re.compile(r"<meta\b[^>]*>", re.I)
_ATTR = re.compile(r'([\w:-]+)\s*=\s*"([^"]*)"')
_VERTRAG = (("TEMPORARY", "Befristet"), ("CONTRACTOR", "Befristet"), ("FULL_TIME", "Vollzeit"), ("PART_TIME", "Teilzeit"))


def _ext_id(url):
    # Nur URL-sichere Zeichen: die Website baut daraus /stellen/<id>, "/" würde zu %2F
    t = urlsplit(url)
    id_ = re.sub(r"[^A-Za-z0-9._~-]+", "-", f"{t.path}?{t.query}").strip("-")
    return id_ if 0 < len(id_) <= 200 else hashlib.sha256(url.encode()).hexdigest()[:32]


def _xml(url):
    return xml_aus(http.hole(url).content)


def xml_aus(inhalt):
    """Sitemap-XML aus Bytes; .xml.gz wird entpackt (auch für die Suche in scraper/einrichtung.py)."""
    if inhalt[:2] == b"\x1f\x8b":  # .xml.gz (z. B. db.jobs); entpackt höchstens so groß wie eine Antwort
        inhalt = gzip.GzipFile(fileobj=io.BytesIO(inhalt)).read(http.MAX_ANTWORT_BYTES + 1)
        if len(inhalt) > http.MAX_ANTWORT_BYTES:
            raise ValueError("Entpackte Sitemap zu groß")
    try:
        return ET.fromstring(inhalt)
    except ET.ParseError:  # häufigster Formfehler echter Sitemaps: „&“ in Adressen nicht als &amp; geschrieben
        pass
    try:
        return ET.fromstring(re.sub(rb"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)", b"&amp;", inhalt))
    except ET.ParseError:  # z. B. thyssenkrupp: Anführungszeichen mitten in einer Adresse; nur die <loc>-Einträge zählen
        pass
    locs = re.findall(rb"<loc>\s*(.*?)\s*</loc>", inhalt, re.S)
    if not locs:
        raise ValueError("Sitemap nicht lesbar")
    index = b"<sitemapindex" in inhalt[:2000]
    wurzel = ET.Element("sitemapindex" if index else "urlset")
    for loc in locs:
        ET.SubElement(ET.SubElement(wurzel, "sitemap" if index else "url"), "loc").text = unescape(loc.decode("utf-8", "replace"))
    return wurzel


def _urls(sitemap, index_aufloesen=True):
    wurzel = _xml(sitemap)
    if wurzel.tag.rsplit("}", 1)[-1] not in ("urlset", "sitemapindex"):
        raise ValueError("Unerwartete Sitemap-XML-Wurzel")
    # nur <url>/<sitemap>-Einträge, nicht image:loc/video:loc der Erweiterungen
    eintraege = wurzel.findall("{*}url") + wurzel.findall("{*}sitemap")
    locs = [eintrag.find("{*}loc") for eintrag in eintraege]
    if any(loc is None or not loc.text or not loc.text.strip() for loc in locs):
        raise ValueError("Sitemap-Eintrag ohne Link")
    urls = [loc.text.strip() for loc in locs]
    if index_aufloesen and wurzel.tag.endswith("sitemapindex"):
        return [u for teil in urls for u in _urls(teil, False)]
    return urls


def ort_aus_url(url):
    m = re.search(r'/job/([^/]+)', unquote(urlsplit(url).path), re.I)
    if not m:
        return None
    segment = m.group(1)
    # Numerische Kennungen oder bloße Stellentitel sind kein erkennbarer Ort.
    if not re.match(r'(?:Germany|Deutschland|DE|US|USA|Vietnam|India|China|Japan|France|UK|Singapore|Canada|Australia|Poland|Spain|Italy|Brazil|Remote)(?:-|$)', segment, re.I) and not deutsche_staedte(segment.replace('-', ' ')):
        return None
    return segment.replace('-', ' ')


def _vorgefiltert(url):
    titel = re.sub(r"[-_/]", " ", unquote(urlsplit(url).path)).lower()
    for aus, ein in (("ae", "ä"), ("oe", "ö"), ("ue", "ü")):
        titel = titel.replace(aus, ein)
    ort = ort_aus_url(url)
    ausserhalb = ort and not (re.search(r'\b(?:Germany|Deutschland|DE|Remote)\b', ort, re.I) or deutsche_staedte(ort))
    return bool(_TITEL_RE.search(titel) or ausserhalb)


def _objekte(x):
    if isinstance(x, list):
        for y in x:
            yield from _objekte(y)
    elif isinstance(x, dict):
        yield x
        yield from _objekte(x.get("@graph"))


def _inneres(seite, start):
    """HTML im Element, das bei `start` beginnt (gleichnamige Tags gezählt)."""
    tag = re.match(r"<([a-zA-Z0-9]+)", seite[start:]).group(1)
    tiefe, ende = 0, seite.index(">", start) + 1
    for m in re.compile(rf"<(/?){tag}\b[^>]*>", re.I).finditer(seite, start):
        tiefe += -1 if m.group(1) else 1
        if tiefe == 0:
            return seite[ende:m.start()]
    return seite[ende:]


def _mikrodaten(seite):
    """schema.org-JobPosting als Microdata (SuccessFactors-Karriereseiten) in dieselbe Form wie JSON-LD bringen."""
    treffer = re.search(r'itemtype="https?://schema\.org/JobPosting"', seite, re.I)
    if not treffer:
        return None
    werte = {}
    for m in _META.finditer(seite, treffer.start()):  # Firmenadresse im Seitenkopf ist kein Stellenort
        a = dict((k.lower(), unescape(v)) for k, v in _ATTR.findall(m.group(0)))
        if a.get("itemprop") and "content" in a:
            werte.setdefault(a["itemprop"], a["content"])
    for m in re.compile(r'<(?!meta\b)[a-zA-Z0-9]+\b[^>]*\bitemprop="(title|description|employmentType|validThrough)"').finditer(seite, treffer.start()):
        werte.setdefault(m.group(1), _inneres(seite, m.start()))
    if "description" in werte:  # SuccessFactors hängt Schlagwörter an die Beschreibung
        werte["description"] = re.sub(r'<span class="jobsegments">.*', "", werte["description"], flags=re.S)
    if "title" not in werte:
        og = next((dict(_ATTR.findall(m.group(0))) for m in _META.finditer(seite) if 'property="og:title"' in m.group(0)), {})
        werte["title"] = og.get("content") or ""
    titel = text_aus_html(werte["title"]).strip()
    if not titel:
        return None
    ort = {k: werte[k] for k in ("addressLocality", "addressCountry") if werte.get(k)}
    return {"@type": "JobPosting", "title": titel, "description": werte.get("description", ""),
            "validThrough": werte.get("validThrough", ""), "employmentType": werte.get("employmentType", ""),
            "jobLocation": [{"address": ort}] if ort else []}


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
    if jp := _mikrodaten(seite):
        return jp
    raise ValueError("kein JobPosting")


jobposting = _jobposting  # auch für scraper/nachruesten.py


def _liste(x):
    return x if isinstance(x, list) else [x] if x else []


def _deutsch_zuerst(url):
    """Sortierschlüssel: Adressen mit deutschem Sprach-/Länderteil oder deutscher Stadt zuerst (Tagesgrenze)."""
    pfad = unquote(urlsplit(url).path)
    return 0 if _DE.search(pfad) or deutsche_staedte(re.sub(r"[-_/]", " ", pfad)) else 1


def _tag():
    return date.today().toordinal()


def reihenfolge(urls, ist_neu):
    """Deutsche Adressen zuerst. Gibt es mehr neue Adressen als MAX_NEU, wandert der Startpunkt täglich um MAX_NEU:
    Seiten, die nie gespeichert werden (Ausland, abgelaufen), belegen so nicht jeden Tag dieselben Plätze."""
    gruppen = {}
    for x in urls:
        gruppen.setdefault(_deutsch_zuerst(x[1]), []).append(x)
    aus = []
    for g in sorted(gruppen):
        teil = gruppen[g]
        neu = [x for x in teil if ist_neu(x)]
        if len(neu) > MAX_NEU:
            k = (_tag() * MAX_NEU) % len(neu)
            neu = neu[k:] + neu[:k]
            teil = neu + [x for x in teil if not ist_neu(x)]
        aus += teil
    return aus


def _ratenbegrenzt(e):
    antwort = e.response if isinstance(e, requests.HTTPError) else None
    return antwort is not None and antwort.status_code == 429


def _ausfall(e):
    """Host fällt aus (Zeitüberschreitung, keine Verbindung, 5xx, 429). 404/410 und robots.txt zählen nicht."""
    if isinstance(e, (requests.ConnectionError, requests.Timeout)):
        return True
    antwort = e.response if isinstance(e, requests.HTTPError) else None
    return antwort is not None and (antwort.status_code >= 500 or antwort.status_code == 429)


def _seitentext(antwort):
    # ohne charset im Header nähme requests ISO-8859-1; Stellenseiten sind in der Praxis UTF-8
    if "charset" in antwort.headers.get("content-type", "").lower():
        return antwort.text
    return antwort.content.decode("utf-8", "replace")


def _ort(jp):
    standorte = _liste(jp.get("jobLocation"))
    orte, laender = [], []
    for o in standorte:
        a = o.get("address") if isinstance(o, dict) else o
        if isinstance(a, dict):
            orte.append(a.get("addressLocality"))
            laender.append(a.get("addressCountry"))
        else:
            orte.append(a)  # schema.org erlaubt Text statt Place/PostalAddress
    if not standorte:  # nur als Ersatz, z. B. dm-Remote-Stellen ohne jobLocation
        laender = _liste(jp.get("applicantLocationRequirements"))
    teile = orte + [l.get("name") if isinstance(l, dict) else l for l in laender]
    return ", ".join(dict.fromkeys(str(t).strip() for t in teile if t))


def _stelle(seite, url, ext_id, heute):
    jp = _jobposting(seite)
    ablauf = str(jp.get("validThrough") or "")[:10]
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", ablauf) and ablauf < heute:
        return None
    # Porsche/Bundesbank liefern das HTML entity-escaped, Neura hat wörtliche "\n"
    felder = [jp[k] for k in _TEXTFELDER if isinstance(jp.get(k), str)]
    roh = "\n".join(t if "<" in t else unescape(t) for t in felder)
    if m := _DM_TEXT.search(seite):
        roh += "\n" + m.group(1)
    roh = roh.replace("\\n", "\n")
    text = text_aus_html(roh)
    remote = jp.get("jobLocationType") == "TELECOMMUTE"
    typen = _liste(jp.get("employmentType"))
    return {
        "ext_id": ext_id,
        "titel": unescape(jp["title"]).strip(),
        "ort": _ort(jp),
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
    # Gleiche ID, andere URL: die erste gilt, jede weitere wird gemeldet (run.py schließt dann nichts).
    urls, stellen = {}, []
    for url in _urls(sitemap):  # Fehler der Sitemap selbst kippen die Firma
        if filter_ not in url:
            continue
        ext_id = _ext_id(url)
        if ext_id in urls and urls[ext_id] != url:
            stellen.append({"uebersprungen": "doppelte ID"})
            continue
        urls[ext_id] = url
    zaehler, fehlserie, neu, vertagt = Counter(), 0, 0, False
    for ext_id, url in reihenfolge(list(urls.items()), lambda x: x[0] not in bekannte and not _vorgefiltert(x[1])):
        if _vorgefiltert(url):
            zaehler["vorgefiltert"] += 1
            continue
        # shortcut: eine bekannte Stelle, deren validThrough abläuft, bleibt offen, solange sie in der Sitemap steht;
        # Upgrade: bekannte Stellen alle N Tage neu laden
        if ext_id in bekannte:
            zaehler["unverändert"] += 1
            stellen.append({"ext_id": ext_id, "unveraendert": True})
            continue
        if vertagt or neu >= MAX_NEU:  # Rest morgen; der Lauf schließt dann nichts
            vertagt = True
            zaehler["vertagt"] += 1
            continue
        neu += 1
        try:
            seite = _seitentext(http.hole(url))
            fehlserie = 0  # Seite geladen: der Host lebt
            s = _stelle(seite, url, ext_id, heute)
        except Exception as e:  # eine Anzeige darf nie die ganze Firma kippen
            if _ratenbegrenzt(e):  # 429: der Host will heute nicht mehr; kein Defekt
                vertagt = True
                zaehler["vertagt"] += 1
                continue
            zaehler[f"übersprungen ({type(e).__name__})"] += 1
            if _ausfall(e):
                fehlserie += 1
                if fehlserie >= _MAX_FEHLSERIE:
                    raise RuntimeError(f"{urlsplit(url).netloc}: {fehlserie} Detailseiten in Folge nicht erreichbar, "
                                       f"zuletzt {type(e).__name__}: {e}") from e
            continue
        if s is None:
            zaehler["abgelaufen"] += 1
        else:
            zaehler["geladen"] += 1
            stellen.append(s)
    if vertagt:
        stellen.append({"uebersprungen": "vertagt"})
    print(f"Hinweis: {sitemap}: {len(urls)} Stellen-URLs, " + ", ".join(f"{k}: {v}" for k, v in zaehler.items()))
    return stellen
