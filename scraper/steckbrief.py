"""Steckbrief einer Anzeige per Regeln (keine KI): Erfahrung, Sprachen, Gehalt, Sicherheitsüberprüfung."""
import re

_JAHRE = re.compile(r"(?<![\d.,])(\d{1,2})\s*(?:[-–]\s*\d{1,2})?\s*\+?\s*(?:years?|jahre?n?)\b(?!\s*(?:ago|old|vor))", re.I)
_BEZUG = re.compile(r"experience|erfahrung", re.I)

_NIVEAU = [(r"\b([ABC][12])\b", None), (r"flie(?:ß|ss)end|fluent(?:ly)?", "fließend"),
           (r"verhandlungssicher", "verhandlungssicher"), (r"muttersprach\w*|native", "Muttersprache")]
_SPRACHEN = {"Deutsch": r"german|deutsch", "Englisch": r"english|englisch", "Französisch": r"french|franz(?:ö|oe)sisch"}
_FENSTER = 25  # Zeichen links und rechts vom Sprachnamen, in denen das Niveau stehen muss

_W = r"(?:€|EUR|CHF)"
_ZAHL = r"(\d[\d.,]*)\s*(k\b)?"
_BEREICH = re.compile(rf"({_W})?\s*{_ZAHL}\s*({_W})?\s*[-–—]\s*({_W})?\s*{_ZAHL}\s*({_W})?", re.I)
_EINZEL = re.compile(rf"({_W})?\s*(\d[\d.,]*)\s*({_W})?\s*(?:/|pro|per|je)\s*(monat|month|stunde|hour|jahr|year)", re.I)
_SICHER = re.compile(r"security clearance|sicherheits(?:ü|ue)berpr(?:ü|ue)fung|\bÜ[123]\b", re.I)


def _erfahrung(t):
    # Nur Treffer mit "experience/Erfahrung" in der Naehe ("3 years contract", "within 2 years" zaehlen nicht)
    for m in _JAHRE.finditer(t):
        if _BEZUG.search(t[max(0, m.start() - 60):m.end() + 60]):
            return int(m.group(1))
    return None


def _sprachen(t):
    aus = []
    for name, muster in _SPRACHEN.items():
        for m in re.finditer(rf"\b(?:{muster})\b(?!\w)", t, re.I):
            umfeld = t[max(0, m.start() - _FENSTER):m.end() + _FENSTER]
            mitte = m.start() - max(0, m.start() - _FENSTER)
            # Das dem Sprachnamen naechste Niveau gewinnt ("fluent German and native French")
            nah = [(abs(g.start() - mitte), n or g.group(1).upper())
                   for p, n in _NIVEAU for g in re.finditer(p, umfeld, re.I)]
            niveau = min(nah)[1] if nah else None
            if niveau:
                aus.append({"sprache": name, "niveau": niveau})
                break
    return aus


def _betrag(s, k):
    """None bei unlesbaren Zahlen wie "1.2.3" oder "01.09.2026"."""
    try:
        if k:
            return round(float(s.replace(",", ".")) * 1000)
        s = re.sub(r"[.,](?=\d{3}(?!\d))", "", s)
        return round(float(s.replace(",", ".")))
    except ValueError:
        return None


_KEIN_GEHALT = re.compile(r"bonus|budget|sign-on|signing|relocation|umzug|zuschuss|per diem", re.I)


def _kein_gehalt(t, m):
    return bool(_KEIN_GEHALT.search(t[max(0, m.start() - 30):m.end() + 30]))


def _waehrung(*w):
    w = next((x for x in w if x), "")
    return "EUR" if w == "€" else w.upper()


def _zeitraum(t):
    z = t.lower()
    return "Monat" if re.search(r"monat|month|/\s*mo\b", z) else "Stunde" if re.search(r"stunde|hour|/\s*h\b", z) else "Jahr"


def _gehalt(t):
    for m in _BEREICH.finditer(t):
        w = _waehrung(m[1], m[4], m[5], m[8])  # Gruppen: 1 W, 2 Zahl, 3 k, 4 W, 5 W, 6 Zahl, 7 k, 8 W
        if not w:
            continue
        a, b = m[2], m[6]
        k = bool(m[3] or m[7])  # "70-85k": k gilt fuer beide
        lo, hi = _betrag(a, k), _betrag(b, k)
        if lo is None or hi is None or lo > hi or lo < 1000 or _kein_gehalt(t, m):
            continue
        return {"min": lo, "max": hi, "waehrung": w, "zeitraum": _zeitraum(t[m.end():m.end() + 25])}
    for m in _EINZEL.finditer(t):
        w = _waehrung(m[1], m[3])
        wert = _betrag(m[2], False)
        if w and wert is not None and wert >= 1000 and not _kein_gehalt(t, m):
            return {"min": wert, "max": wert, "waehrung": w, "zeitraum": _zeitraum(m[4])}
    return None


def steckbrief(abschnitte, text):
    t = " ".join([text or ""] + [" ".join([a["titel"], *a["punkte"]]) for a in abschnitte or []])
    return {"erfahrung_jahre": _erfahrung(t), "sprachen": _sprachen(t), "gehalt": _gehalt(t),
            "sicherheitsueberpruefung": bool(_SICHER.search(t))}
