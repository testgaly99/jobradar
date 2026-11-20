"""Verlangtes Deutschniveau einer Anzeige per Regeln, ohne KI.

Logik aus dem getesteten Prototyp docs/superpowers/specs/2026-11-18-sprachniveau-prototyp.py (Q65–Q68);
neu: Stufe bei "Deutsch von Vorteil" ("German at B2 to C1 is a strong plus" -> "B2–C1").
"""
import re

STUFEN = ["A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"]

_ABK = re.compile(r"\b(mind|min|bzw|ca|ggf|inkl|z\. ?B|e\.g|i\.e)\.", re.I)
_SATZ = re.compile(r"(?<=[.!?;])\s+(?=[A-ZÄÖÜ])|\n|•|·|\s[-–]\s")

# Sprachnamen; Adjektivformen ("deutsche Sprache") nur, wenn im Segment von Sprache die Rede ist
_DE = (r"deutsch(?:kenntniss\w*|sprachig\w*)?(?=[\s\-,.;:)(/]|$)"
       r"|german(?!y)(?!\s+(?!(?:language|skills?|and|or|is|are|at|as|proficiency|speaking|speakers?|communication|knowledge|level|native|fluency|comes|required|preferred|mandatory|essential|desirable|written|spoken|would|will|to|for|with|in|on|both|skills|a|an)\b)(?-i:[a-z]))")
_DE_ADJ = r"deutsche[rnms]?"
_ANDERE = r"englisch\w*|english|französisch\w*|french|italienisch\w*|italian|spanisch\w*|spanish|chinesisch\w*|chinese|polnisch\w*|polish|niederländisch\w*|dutch"
_ANDERE_ADJ = r"englische[rnms]?|französische[rnms]?"
_KOORD = re.compile(r"^[\s\-,&/]*(?:und|and|or|oder|sowie|as well as)?[\s\-,&/]*(?:(?:und|and|or|oder)\s*)?$", re.I)
_ODER = re.compile(r"\b(or|oder)\b", re.I)

_CEFR = re.compile(r"\b([ABC])\s?([12])\b")
_WORTE = [  # vage Worte -> geschaetzte Stufe (Q68); laengere zuerst
    (r"muttersprach\w*|native|mother tongue", "Muttersprache"),
    (r"verhandlungssicher\w*", "C2"),
    (r"sehr gut\w*|very good|excellent|fließend\w*|fliessend\w*|fluen(?:t|cy)\w*|business[- ](?:level|fluent)|strong|confident\w*|\bsicher(?:e[nrms]?)?\b|beherrsch\w*|selbstverständlich|comes naturally|safe|proficien(?:t|cy)", "C1"),
    (r"\bgute\w*|\bgood\b", "B2"),
]
_PLUS = re.compile(r"(?:is|are|would be) (?:considered )?(?:a |an )?(?:strong |big |great |real )?(?:plus|advantage|bonus|asset)|von vorteil|wünschenswert"
                   r"|nice[- ]to[- ]have|\bpreferred\b|\bideally\b|idealerweise|\ba plus\b|\ban asset\b|wäre(?:n)? (?:ein )?plus|vorteilhaft", re.I)


def _spans(rx, seg):
    return [(m.start(), m.end()) for m in re.finditer(rx, seg, re.I)]


def _segment(seg):
    """Liste von Befunden fuer Deutsch in einem Satz: dicts mit stufe/geschaetzt/vorteil/vorteil_stufen."""
    sprachbezug = re.search(r"sprach|language", seg, re.I)
    de = _spans(_DE, seg) + (_spans(_DE_ADJ, seg) if sprachbezug else [])
    if not de:
        return []
    andere = _spans(_ANDERE, seg) + (_spans(_ANDERE_ADJ, seg) if sprachbezug else [])
    alle = sorted([(a, b, "de") for a, b in de] + [(a, b, "x") for a, b in andere])
    # Gruppen nur durch Bindewoerter getrennter Sprachen ("Deutsch- und Englisch", "German, French, or Italian")
    gruppen, akt = [], [alle[0]]
    for s in alle[1:]:
        zwischen = seg[akt[-1][1]:s[0]]
        if _KOORD.match(zwischen):
            akt.append(s)
        else:
            gruppen.append(akt)
            akt = [s]
    gruppen.append(akt)
    befunde = []
    for g in gruppen:
        if not any(t == "de" for _, _, t in g):
            continue
        anfang, ende = g[0][0], g[-1][1]
        alternativ = any(_ODER.search(seg[g[i][1]:g[i + 1][0]]) for i in range(len(g) - 1))
        fremd = [(a, b) for a, b, _ in alle if not (anfang <= a < ende)]

        def frei(a, b):  # kein anderer Sprachname zwischen Marke und Gruppe
            lo, hi = (b, anfang) if b <= anfang else (ende, a)
            return not any(lo <= x < hi for x, _ in fremd)

        def abstand(a, b):
            return anfang - b if b <= anfang else a - ende

        marken = [(abstand(m.start(), m.end()), 0, f"{m.group(1)}{m.group(2)}", False)
                  for m in _CEFR.finditer(seg) if frei(m.start(), m.end()) and not (anfang <= m.start() < ende)
                  and abstand(m.start(), m.end()) <= 60]
        belegt = []
        for rx, stufe in _WORTE:
            for m in re.finditer(rx, seg, re.I):
                if any(a <= m.start() < b for a, b in belegt) or (anfang <= m.start() < ende):
                    continue
                belegt.append((m.start(), m.end()))
                if frei(m.start(), m.end()) and abstand(m.start(), m.end()) <= 45:  # lange Absätze ohne Satzzeichen
                    marken.append((abstand(m.start(), m.end()), 1, stufe, True))
        # "Sehr gute Deutschkenntnisse (wünschenswert C1)": erwünscht ist nur die Stufe, Deutsch selbst ist Pflicht
        plus = [m for m in _PLUS.finditer(seg) if m.start() >= ende and frei(m.start(), m.end())
                and not _CEFR.match(seg, m.end() + len(seg[m.end():]) - len(seg[m.end():].lstrip()))]
        if plus or alternativ:
            befunde.append({"stufe": None, "geschaetzt": False, "vorteil": True,
                            "vorteil_stufen": [s for _, art, s, _ in marken if art == 0]})
            continue
        if marken:
            marken.sort(key=lambda x: (x[1], x[0]))  # echte Stufe vor Wort, dann naechste
            _, _, stufe, gesch = marken[0]
            befunde.append({"stufe": stufe, "geschaetzt": gesch, "vorteil": False})
        else:
            befunde.append({"stufe": None, "geschaetzt": False, "vorteil": False})
    return befunde


def deutsch(text: str, englisch: bool = False) -> dict:
    """-> {"status": pflicht|vorteil|ohne_niveau|keins, "stufe": str|None, "geschaetzt": bool}"""
    t = _ABK.sub(lambda m: m.group(0)[:-1], text or "")
    befunde = [b for seg in _SATZ.split(t) if seg for b in _segment(seg)]
    mit = [b for b in befunde if b["stufe"] and not b["vorteil"]]
    if mit:
        b = max(mit, key=lambda b: STUFEN.index(b["stufe"]))
        return {"status": "pflicht", "stufe": b["stufe"], "geschaetzt": b["geschaetzt"]}
    vorteil = [b for b in befunde if b["vorteil"]]
    if vorteil:
        stufen = sorted({s for b in vorteil for s in b["vorteil_stufen"]}, key=STUFEN.index)
        stufe = None if not stufen else stufen[0] if len(stufen) == 1 else f"{stufen[0]}–{stufen[-1]}"
        return {"status": "vorteil", "stufe": stufe, "geschaetzt": False}
    if befunde or not englisch:
        return {"status": "ohne_niveau", "stufe": None, "geschaetzt": False}
    return {"status": "keins", "stufe": None, "geschaetzt": False}


def rang(ergebnis: dict | None) -> int | None:
    """1 (A1) bis 7 (Muttersprache), nur wenn Deutsch Pflicht mit Stufe ist; sonst None (Filter zeigt die Stelle)."""
    if not ergebnis or ergebnis.get("status") != "pflicht" or ergebnis.get("stufe") not in STUFEN:
        return None
    return STUFEN.index(ergebnis["stufe"]) + 1


def englisch(text: str) -> bool:
    """Grobe Regel wie ki_probe._englisch: englische Anzeige, wenn " the " mindestens 5-mal vorkommt."""
    return (text or "").count(" the ") >= 5
