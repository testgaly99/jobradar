"""Stellenliste mit Blättern + Stellenseiten (für Karriereseiten ohne Stellen-Sitemap, z. B. Avature, rexx).

ats_id = Adresse der Stellenliste + "#" + Merkmal der Stellenadressen, z. B.
"https://jobs.siemens.com/de_DE/externaljobs/SearchJobs/#/JobDetail/".
Stellenseiten: `JobPosting` (JSON-LD/Microdata wie im Sitemap-Adapter), sonst Avatures feste Feldstruktur.
"""
import re
from collections import Counter
from datetime import date
from html import unescape
from urllib.parse import parse_qsl, urldefrag, urljoin, urlsplit

from scraper import http
from scraper.abschnitte import abschnitte, text_aus_html
from scraper.ats import sitemap

MAX_SEITEN = 150  # Listenseiten je Lauf; mehr = Liste unvollständig, dann schließt der Lauf nichts
_BLAETTERN = re.compile(r"^(?:folderOffset|jobOffset|offset|page|pageNum|start|seite|p|from)$", re.I)
_HREF = re.compile(r'href="([^"#][^"]*)"', re.I)
_AV_LABEL = re.compile(r'class="article__content__view__field__label[^"]*"[^>]*>(.*?)</', re.S)
_AV_WERT = re.compile(r'<(\w+)[^>]*class="article__content__view__field__value[^"]*"')
_AV_ORT = re.compile(r"^(?:standort|standorte|standort\(e\)|location|locations|location\(s\)|arbeitsort|ort)$", re.I)


def _links(seite, basis):
    aus = []
    for h in _HREF.findall(seite):
        try:
            aus.append(urldefrag(urljoin(basis, unescape(h)))[0])
        except ValueError:  # kaputter Link (TK Elevator): überspringen
            pass
    return aus


def _blaetterseite(link, start):
    """Gleiche Liste (Host und Pfad), nur ein Blätter-Parameter mit Zahl anders."""
    a, s = urlsplit(link), urlsplit(start)
    return (a.hostname == s.hostname and a.path.rstrip("/") == s.path.rstrip("/")
            and any(_BLAETTERN.match(k) and v.isdigit() for k, v in parse_qsl(a.query)))


def stellenlinks(start, merkmal):
    """(Stellenadressen in Listenreihenfolge, vollständig?) über höchstens MAX_SEITEN Listenseiten."""
    host = urlsplit(start).hostname
    offen, gesehen, stellen = [start], {start}, {}
    seiten = 0
    while offen:
        if seiten >= MAX_SEITEN:
            return list(stellen), False
        url = offen.pop(0)
        seiten += 1
        seite = sitemap._seitentext(http.hole(url))  # Fehler der ersten Liste kippen die Firma
        for link in _links(seite, url):
            if urlsplit(link).hostname != host:
                continue
            if merkmal in link:
                stellen.setdefault(link, None)
            elif _blaetterseite(link, start) and link not in gesehen:
                gesehen.add(link)
                offen.append(link)
    return list(stellen), True


def _avature(seite, url, ext_id):
    """Avature-Stellenseite ohne JobPosting: Titel aus og:title, Felder als Beschriftung/Wert-Paare."""
    og = re.search(r'<meta property="og:title" content="([^"]*)"', seite)
    titel = unescape(og.group(1)).strip() if og else ""
    if not titel:
        raise ValueError("kein Titel")
    werte = [sitemap._inneres(seite, w.start()) for w in _AV_WERT.finditer(seite)]
    ort = ""
    for m in _AV_LABEL.finditer(seite):  # Wert direkt nach der Beschriftung „Standort(e)“ o. Ä.
        w = _AV_WERT.search(seite, m.end())
        if w and _AV_ORT.match(text_aus_html(m.group(1)).strip()):
            ort = text_aus_html(sitemap._inneres(seite, w.start())).strip()
            break
    roh = "\n".join(w for w in werte if len(text_aus_html(w)) > 300)  # Beschreibung, nicht die Kurzfelder
    text = text_aus_html(roh)
    return {"ext_id": ext_id, "titel": titel, "ort": ort, "remote": False, "url": url,
            "beschreibung_kurz": text[:300], "text": text, "abschnitte": abschnitte(roh),
            "abteilung": "", "arbeitsmodell": "", "vertragsart": ""}


def _ext_id(url):
    m = re.search(r"/JobDetail/(?:[^/?#]+/)?(\d+)", url)  # Avature: gleiche Stelle unter mehreren Sprachpfaden
    return f"JobDetail-{m.group(1)}" if m else sitemap._ext_id(url)


def hole_stellen(ats_id: str, bekannte: frozenset[str] = frozenset()) -> list[dict]:
    start, _, merkmal = ats_id.partition("#")
    heute = date.today().isoformat()
    links, vollstaendig = stellenlinks(start, merkmal)
    urls = {}
    for link in links:
        urls.setdefault(_ext_id(link), link)
    stellen, zaehler, neu, stopp, fehlserie = [], Counter(), 0, False, 0
    for ext_id, url in sitemap.reihenfolge(list(urls.items()), lambda x: x[0] not in bekannte and not sitemap._vorgefiltert(x[1])):
        if sitemap._vorgefiltert(url):
            zaehler["vorgefiltert"] += 1
            continue
        if ext_id in bekannte:
            stellen.append({"ext_id": ext_id, "unveraendert": True})
            continue
        if stopp or neu >= sitemap.MAX_NEU:  # Tagesgrenze oder 429: keine neuen Seiten mehr, Bekannte weiter melden
            stopp = True
            zaehler["vertagt"] += 1
            continue
        neu += 1
        try:
            seite = sitemap._seitentext(http.hole(url))
            fehlserie = 0
            try:
                s = sitemap._stelle(seite, url, ext_id, heute)
            except ValueError:
                s = _avature(seite, url, ext_id) if "article__content" in seite else None
        except Exception as e:  # eine Anzeige darf nie die ganze Firma kippen
            if sitemap._ratenbegrenzt(e):
                stopp = True
                zaehler["vertagt"] += 1
                continue
            zaehler[f"übersprungen ({type(e).__name__})"] += 1
            if sitemap._ausfall(e):
                fehlserie += 1
                if fehlserie >= sitemap._MAX_FEHLSERIE:
                    raise RuntimeError(f"{urlsplit(url).netloc}: {fehlserie} Detailseiten in Folge nicht erreichbar") from e
            continue
        if s:
            stellen.append(s)
            zaehler["geladen"] += 1
    if not vollstaendig:  # nicht alle Listenseiten gelesen: fehlende Bekannte sind evtl. noch online -> nichts schließen
        stellen.append({"uebersprungen": "unvollstaendig"})
    elif stopp:  # Liste vollständig, nur neue Seiten vertagt: fehlende Bekannte sind wirklich weg
        stellen.append({"uebersprungen": "vertagt"})
    print(f"Hinweis: Stellenliste: {len(urls)} Stellen-Adressen, vollständig: {vollstaendig}, "
          + ", ".join(f"{k}: {v}" for k, v in zaehler.items()))
    return stellen
