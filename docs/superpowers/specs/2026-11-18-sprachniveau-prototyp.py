"""Wegwerf-Versuch: verlangtes Deutschniveau einer Anzeige per Regeln (Design 2026-11-18, Q67/Q68)."""
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
    """Liste von Befunden fuer Deutsch in einem Satz: dicts mit stufe/geschaetzt/vorteil."""
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
            gruppen.append(akt); akt = [s]
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
            befunde.append({"stufe": None, "geschaetzt": False, "vorteil": True})
            continue
        if marken:
            marken.sort(key=lambda x: (x[1], x[0]))  # echte Stufe vor Wort, dann naechste
            _, _, stufe, gesch = marken[0]
            befunde.append({"stufe": stufe, "geschaetzt": gesch, "vorteil": False})
        else:
            befunde.append({"stufe": None, "geschaetzt": False, "vorteil": False})
    return befunde


def deutsch(text, englisch=False):
    """-> {"status": pflicht|vorteil|ohne_niveau|keins, "stufe": str|None, "geschaetzt": bool}"""
    t = _ABK.sub(lambda m: m.group(0)[:-1], text or "")
    befunde = [b for seg in _SATZ.split(t) if seg for b in _segment(seg)]
    mit = [b for b in befunde if b["stufe"] and not b["vorteil"]]
    if mit:
        b = max(mit, key=lambda b: STUFEN.index(b["stufe"]))
        return {"status": "pflicht", "stufe": b["stufe"], "geschaetzt": b["geschaetzt"]}
    if any(b["vorteil"] for b in befunde):
        return {"status": "vorteil", "stufe": None, "geschaetzt": False}
    if befunde or not englisch:
        return {"status": "ohne_niveau", "stufe": None, "geschaetzt": False}
    return {"status": "keins", "stufe": None, "geschaetzt": False}


FAELLE = [
    ("Sehr gute Deutsch- und Englischkenntnisse sowie Bereitschaft zu Kundenterminen", "C1~"),
    ("Are fluent in German and English", "C1~"),
    ("Are fluent in English and German, written and spoken", "C1~"),
    ("Gute Deutschkenntnisse (mindestens auf C 1-Niveau)", "C1"),
    ("Your written and verbal communication in German and English is excellent.", "C1~"),
    ("Sprache: Deutsch und Englisch (jeweils ab Level C1 bzw. verhandlungssicher)", "C1"),
    ("Confident communication skills in German or English.", "vorteil"),
    ("Fluency in English; additional fluency in German, French, or Italian is a strong advantage", "vorteil"),
    ("Verhandlungssichere Deutschkenntnisse (mind. C1) sowie gute Englischkenntnisse (mind. B2)", "C1"),
    ("you’re a strong communicator in both English and German", "C1~"),
    ("sehr gute Deutsch- und Englischkenntnisse", "C1~"),
    ("Sehr gute deutsche und gute englische Sprachkenntnisse", "C1~"),
    ("Excellent Python. Excellent English. German is a plus.", "vorteil"),
    ("You communicate confidently in English. German is an advantage.", "vorteil"),
    ("A clear and professional communicator in English (German is a plus)", "vorteil"),
    ("Fluency in English and German to effectively engage with our customer base", "C1~"),
    ("Auch mit der deutschen Sprache und mit Zahlen gehst Du sicher um.", "C1~"),
    ("You speak business-level German and English", "C1~"),
    ("Speak German at native level (non-negotiable) and fluent English", "Muttersprache~"),
    ("Gute Kommunikationsfähigkeit in deutscher Sprache", "B2~"),
    ("Sehr gute Deutschkenntnisse und gute Englischkenntnisse", "C1~"),
    ("Gute Deutsch- und Englischkenntnisse", "B2~"),
    ("Willingness to undergo a German security clearance (Sicherheitsüberprüfung). Business-fluent English. German is a strong advantage.", "vorteil"),
    ("10 % Mitarbeiterrabatt in allen deutschen dm-Märkten. Die Deutsche Bundesbank ist eine besondere Bank.", "keins"),
    # Grenzfaelle aus den Runden 2-4 an neuen Anzeigen (2026-11-18)
    ("Are business fluent in English (German language skills are a strong asset).", "vorteil"),
    ("Fluent in English. German, French and Italian is an asset.", "vorteil"),
    ("Sprache: sehr gut Deutsch & Englisch Flexibilität", "C1~"),
    ("Sprache: sicheres Deutsch & Englisch Flexibilität", "C1~"),
    ("Language : safe German & English Flexibility", "C1~"),
    ("Sehr gute Deutschkenntnisse in Wort und Schrift (wünschenswert C1)", "C1"),
    ("Fluency in English; German language skills are an advantage.", "vorteil"),
    ("Fluent English, German a plus.", "vorteil"),
    ("Excellent written and verbal communication; fluent in English and German Hands-on, problem-solving attitude", "C1~"),
    ("you’ll contribute to one of the most exciting German aviation projects of the years to come", "keins"),
    ("Language: Fluent in English & German at least B2 Flexibility", "B2"),
    ("Communicating in both English and German comes naturally to you.", "C1~"),
    ("Auch die deutsche Sprache beherrschst Du aus dem Effeff.", "C1~"),
    ("Professional communication skills in English or German; Ukrainian language skills are a significant advantage.", "vorteil"),
    ("Good command of German and English Soft Skills", "B2~"),
]


def kurz(e):
    return {"pflicht": f"{e['stufe']}{'~' if e['geschaetzt'] else ''}", "vorteil": "vorteil", "keins": "keins", "ohne_niveau": "ohne_niveau"}[e["status"]]


if __name__ == "__main__":
    ok = 0
    for satz, soll in FAELLE:
        ist = kurz(deutsch(satz, englisch=True))
        ok += ist == soll
        if ist != soll:
            print(f"FALSCH: {ist!r} statt {soll!r}: {satz}")
    print(f"{ok}/{len(FAELLE)} richtig")
