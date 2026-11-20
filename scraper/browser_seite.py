"""Eine Firmen-Karriereseite in einem echten Browser lesen (Playwright), nur wenn die Anzeige erst per JavaScript erscheint
(CLAUDE.md 9). Ehrlicher User-Agent, robots.txt gilt, jede Anfrage (auch Weiterleitungen und Nachladen) wird vorher geprüft.
Meldungen nennen nie die Adresse: die Protokolle des Nachtlaufs sind öffentlich."""
import json
import os
import re
from urllib.parse import urlsplit

from scraper import http

MAX_TEXT = 50_000
WARTEN_MS = 45_000


_BANNER = re.compile(r"cookie|privacy|datenschutz|consent|einwilligung|privatsphäre", re.I)


def waehle_titel(og_titel, h1):
    """og:title vor der ersten Überschrift; Überschriften von Cookie-Bannern zählen nicht (Siemens: „We value your privacy“)."""
    for t in (og_titel, h1):
        t = " ".join((t or "").split())[:300]
        if t and not _BANNER.search(t):
            return t
    return ""


def _jobposting(roh_bloecke):
    for roh in roh_bloecke:
        try:
            daten = json.loads(roh)
        except (TypeError, ValueError):
            continue
        stapel = daten if isinstance(daten, list) else [daten]
        while stapel:
            o = stapel.pop(0)
            if not isinstance(o, dict):
                continue
            typ = o.get("@type")
            if "JobPosting" in (typ if isinstance(typ, list) else [typ]):
                return o
            stapel.extend(o.get("@graph") or [])
    return None


def lies(url, pruefe):
    """Gibt {"jobposting": dict|None, "titel": str, "text": str} zurück oder wirft (Adresse verboten, robots.txt, Zeit)."""
    from playwright.sync_api import sync_playwright  # nur im Lauf installiert; Tests spritzen lies() ein

    pruefe(url)
    adresse, basis = http._adresse(url)
    if not http._darf(basis, adresse, pruefe):
        raise http.VerbotenDurchRobots("robots.txt")
    erlaubt = {}

    def filter_(route):
        host = urlsplit(route.request.url).hostname or ""
        if host not in erlaubt:
            try:
                pruefe(route.request.url)
                erlaubt[host] = True
            except Exception:
                erlaubt[host] = False
        # Hauptseite oder Weiterleitung auf ein verbotenes Ziel: abbrechen; sonst nur dieses Nachladen auslassen
        return route.continue_() if erlaubt[host] else route.abort()

    with sync_playwright() as p:
        # lokal ohne Playwright-Chromium: JOBRADAR_BROWSER_KANAL=chrome nutzt das installierte Chrome
        browser = p.chromium.launch(headless=True, channel=os.environ.get("JOBRADAR_BROWSER_KANAL") or None)
        try:
            seite = browser.new_context(user_agent=http.USER_AGENT, locale="de-DE").new_page()
            seite.route("**/*", filter_)
            antwort = seite.goto(adresse, wait_until="load", timeout=WARTEN_MS)
            if antwort is None or antwort.status >= 400:
                raise ValueError(f"HTTP {antwort.status if antwort else '-'}")
            pruefe(seite.url)  # Endadresse nach Weiterleitungen
            try:
                seite.wait_for_load_state("networkidle", timeout=8_000)
            except Exception:
                pass  # manche Seiten laden dauernd nach; der Text steht meist schon da
            jp = _jobposting(seite.eval_on_selector_all('script[type="application/ld+json"]', "e => e.map(x => x.textContent)"))
            haupt = seite.query_selector("main") or seite.query_selector("article") or seite.query_selector("body")
            text = " ".join((haupt.inner_text() if haupt else "").split())[:MAX_TEXT]
            h1 = seite.query_selector("h1")
            og = seite.query_selector('meta[property="og:title"]')
            titel = waehle_titel(og.get_attribute("content") if og else "", h1.inner_text() if h1 else "")
            return {"jobposting": jp, "titel": titel, "text": text}
        finally:
            browser.close()
