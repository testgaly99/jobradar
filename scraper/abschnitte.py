"""HTML einer Stellenanzeige -> [{"titel": str, "punkte": [str]}]. Nur Text, nie HTML (Standardbibliothek)."""
from html.parser import HTMLParser

_UEBERSCHRIFT = {"h1", "h2", "h3", "h4"}
_BLOCK = _UEBERSCHRIFT | {"p", "li", "ul", "ol", "div", "br", "tr", "section", "article", "table", "blockquote"}
_FETT = {"strong", "b"}
_IGNORIERT = {"script", "style"}


class _Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.bloecke = []  # (art, text) mit art "h" oder "p"
        self.art, self.puffer = "p", []
        self.ignoriert = self.fett = 0
        self.fett_zeichen = self.sonst_zeichen = 0

    def _leeren(self):
        text = " ".join("".join(self.puffer).split())
        if text:
            fettdruck = self.art == "p" and self.fett_zeichen and not self.sonst_zeichen
            self.bloecke.append(("h" if self.art == "h" or fettdruck else "p", text))
        self.art, self.puffer = "p", []
        self.fett_zeichen = self.sonst_zeichen = 0

    def handle_starttag(self, tag, attrs):
        if tag in _IGNORIERT:
            self.ignoriert += 1
        elif tag in _BLOCK:
            self._leeren()
            self.art = "h" if tag in _UEBERSCHRIFT else "p"
        elif tag in _FETT:
            self.fett += 1

    def handle_endtag(self, tag):
        if tag in _IGNORIERT:
            self.ignoriert = max(0, self.ignoriert - 1)
        elif tag in _BLOCK:
            self._leeren()
        elif tag in _FETT:
            self.fett = max(0, self.fett - 1)

    def handle_data(self, data):
        if self.ignoriert:
            return
        self.puffer.append(data)
        n = len(data.strip())
        if self.fett:
            self.fett_zeichen += n
        else:
            self.sonst_zeichen += n


def abschnitte(html: str) -> list[dict]:
    p = _Parser()
    p.feed(html or "")
    p.close()
    p._leeren()
    hat_titel = any(a == "h" for a, _ in p.bloecke)
    liste = [] if hat_titel else [{"titel": "Beschreibung", "punkte": []}]
    for art, text in p.bloecke:
        if art == "h":
            liste.append({"titel": text, "punkte": []})
        else:
            if not liste:
                liste.append({"titel": "Über die Stelle", "punkte": []})
            liste[-1]["punkte"].append(text)
    return [a for a in liste if a["punkte"]]
