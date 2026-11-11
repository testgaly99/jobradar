"""Firmen-Logo nur von der eigenen Karriereseite (apple-touch-icon, sonst icon); kein Drittanbieter-Dienst."""
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

from scraper import http


class _Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.apple, self.icon = None, None

    def handle_starttag(self, tag, attrs):
        if tag != "link":
            return
        a = dict(attrs)
        rel, href = (a.get("rel") or "").lower().split(), (a.get("href") or "").strip()
        if not href:
            return
        if any(r.startswith("apple-touch-icon") for r in rel):
            self.apple = self.apple or href
        elif "icon" in rel:
            self.icon = self.icon or href


def logo_url(html: str, basis: str) -> str | None:
    p = _Links()
    p.feed(html)
    for href in (p.apple, p.icon):
        if href:
            url = urljoin(basis, href)
            if urlsplit(url).scheme in ("http", "https"):
                return url
    return None


def hole_logo(careers_url: str) -> str | None:
    try:
        antwort = http.hole(careers_url)
        return logo_url(antwort.text, antwort.url)
    except Exception:
        return None
