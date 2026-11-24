"""Deterministischer Stellenvergleich wie in web/lib/original-suche.ts."""

import re
import unicodedata


GESCHLECHTER = re.compile(
    r"(^|[ ([{,;:–—-])(?:m/w/d|w/m/d|m/f/d|f/m/d|d/m/w|d/w/m|m/w/x)(?=$|[ )\]},;:–—.!?-])"
)
GESCHLECHTER_KLAMMER = re.compile(r"\( *(?:all genders|gn) *\)")
GENDERZEICHEN = re.compile(r"[*:_]in(?:nen)?(?=$|[ )\]},;:–—.!?/-])")
UNICODE_LEERZEICHEN = re.compile(r"[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+")
FUELLWOERTER = set("und and of für for the der die das im in m w d".split())
PROGRAMMIERSPRACHEN = {"c++", "c#", "f#"}


def _kleinschreibung(s: str) -> str:
    # Dieselben Regeln in TypeScript: NFC, Kleinschreibung, Eszett und finales Sigma.
    return unicodedata.normalize("NFC", s).lower().replace("ß", "ss").replace("ς", "σ")


def _norm_woerter(s: str) -> str:
    roh = "".join(
        zeichen if zeichen in "+#" or unicodedata.category(zeichen)[0] in "LMN" else " "
        for zeichen in s
    )
    woerter = (wort if wort in PROGRAMMIERSPRACHEN else re.sub(r"[+#]+", " ", wort)
               for wort in roh.split())
    return " ".join(" ".join(woerter).split())


def norm_titel_streng(s: str) -> str:
    klein = UNICODE_LEERZEICHEN.sub(" ", _kleinschreibung(s))
    klein = GESCHLECHTER.sub(r"\1", re.sub(r" */ *", "/", klein))
    klein = GESCHLECHTER_KLAMMER.sub(" ", klein)
    klein = GENDERZEICHEN.sub(
        lambda treffer: "" if treffer.start() > 0
        and unicodedata.category(klein[treffer.start() - 1])[0] in "LM"
        else treffer.group(),
        klein,
    )
    return _norm_woerter(klein)


def _wort_aehnlichkeit(a: set[str], b: set[str]) -> float:
    kuerzer = min(len(a), len(b))
    return len(a & b) / kuerzer if kuerzer else 0


def _wortmenge(norm: str) -> set[str]:
    return set(norm.split()) - FUELLWOERTER


def aehnlichkeit(a: str, b: str) -> float:
    return _wort_aehnlichkeit(_wortmenge(norm_titel_streng(a)), _wortmenge(norm_titel_streng(b)))


def vergleiche(titel: str, ort: str | None, kandidaten: list[dict]) -> dict:
    gesucht = norm_titel_streng(titel)
    if not gesucht:
        return {"art": "keine"}

    suchwoerter = _wortmenge(gesucht)
    suchort = _norm_woerter(_kleinschreibung(ort or ""))
    exakt = []
    aehnlich = []
    for kandidat in kandidaten:
        ort_kandidat = _norm_woerter(_kleinschreibung(kandidat.get("ort") or ""))
        if suchort and ort_kandidat and suchort != ort_kandidat:
            continue

        titel_kandidat = norm_titel_streng(kandidat["titel"])
        if gesucht == titel_kandidat:
            exakt.append(kandidat)
        else:
            wert = _wort_aehnlichkeit(suchwoerter, _wortmenge(titel_kandidat))
            if wert >= 0.5:
                aehnlich.append((wert, kandidat))

    if len(exakt) == 1:
        return {"art": "eindeutig", "treffer": exakt[0]}
    aehnlich.sort(key=lambda paar: paar[0], reverse=True)
    treffer = (exakt + [kandidat for _, kandidat in aehnlich])[:5]
    return {"art": "auswahl", "treffer": treffer} if treffer else {"art": "keine"}
