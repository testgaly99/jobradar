"""Vorfilter: nur Deutschland plus Remote (Europa/EMEA/EU), keine Ausbildung/Praktikum/etc."""
import re

_TITEL_WOERTER = (
    "Ausbildung", "Duales Studium", r"Dual(?:e[rsn]?)?(?![- ]?use\b)", "Praktikum", "Intern", "Internship", "Working Student",
    "Bachelorarbeit", "Masterarbeit", "Abschlussarbeit", "Thesis", "Filiale",
    "Unsolicited Application", "Open Application", "Spontaneous Application",
)
# Stämme mit weiblicher/Pluralform (Werkstudentin, Aushilfen, Azubis); \w* nur hier, sonst träfe es "International"
# Nicht "Initiativ" als Stamm: träfe "Initiative"
_TITEL_STAEMME = (
    "Azubi", "Auszubildende", "Praktikant", "Werkstudent", "Minijob", "Aushilfe", "Verkäufer", "Kassierer",
    "Initiativbewerbung",
)
_TITEL_RE = re.compile(
    r"\b(" + "|".join(_TITEL_WOERTER) + "|" + "|".join(s + r"\w*" for s in _TITEL_STAEMME) + r")\b",
    re.IGNORECASE,
)

# shortcut: Städteliste deckt Kleinstädte nicht ab, Länderfeld des ATS nutzen, wo vorhanden
_STAEDTE = (
    "Berlin", "Hamburg", "Munich", "München", "Muenchen", "Cologne", "Köln", "Koeln", "Frankfurt",
    "Stuttgart", "Düsseldorf", "Duesseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden",
    "Hannover", "Hanover", "Nuremberg", "Nürnberg", "Nuernberg", "Duisburg", "Bochum", "Wuppertal",
    "Bielefeld", "Bonn", "Münster", "Muenster", "Karlsruhe", "Mannheim", "Augsburg", "Wiesbaden",
    "Mönchengladbach", "Gelsenkirchen", "Braunschweig", "Kiel", "Chemnitz", "Aachen", "Halle",
    "Magdeburg", "Freiburg", "Krefeld", "Mainz", "Lübeck", "Erfurt", "Rostock", "Potsdam",
    "Gilching", "Gauting", "Metzingen", "Weissach", "Zuffenhausen",
)
_DE_RE = re.compile(r"\b(" + "|".join(_STAEDTE) + r"|Germany|Deutschland)\b", re.IGNORECASE)
_DE_CODE = re.compile(r"\bDE\b")
_REMOTE_RE = re.compile(r"\b(Europe|EMEA|EU)\b", re.IGNORECASE)


def ist_relevant(titel: str, ort_text: str, remote: bool) -> tuple[bool, str]:
    if m := _TITEL_RE.search(titel):
        return False, f"Stellenart: {m.group(1).lower()}"
    if _DE_RE.search(ort_text) or _DE_CODE.search(ort_text):
        return True, ""
    if remote and (not ort_text.strip() or _REMOTE_RE.search(ort_text)):
        return True, ""
    return False, "Ausland"


_LEAD_RE = re.compile(r"(?<!\w)(head of|lead|principal|staff|director|vp|vice president|chief|leiter|leitung)(?!\w)", re.IGNORECASE)
_SENIOR_RE = re.compile(r"(?<!\w)(senior|sr\.)(?!\w)", re.IGNORECASE)
_JUNIOR_RE = re.compile(r"(?<!\w)(junior|jr\.|trainee|graduate|entry|berufseinsteiger)(?!\w)", re.IGNORECASE)


def erfahrungslevel(titel: str) -> str:
    for level, rx in (("Lead", _LEAD_RE), ("Senior", _SENIOR_RE), ("Junior", _JUNIOR_RE)):
        if rx.search(titel):
            return level
    return "Mid"


# Englische/umlautfreie Schreibweisen -> deutsche Schreibweise
_STADT_NAME = {"munich": "München", "muenchen": "München", "cologne": "Köln", "koeln": "Köln",
               "nuremberg": "Nürnberg", "nuernberg": "Nürnberg", "duesseldorf": "Düsseldorf",
               "hanover": "Hannover", "muenster": "Münster"}
_STADT_RE = re.compile(r"\b(" + "|".join(_STAEDTE) + r")\b", re.IGNORECASE)


def deutsche_staedte(ort_text: str) -> list[str]:
    ergebnis = []
    for m in _STADT_RE.finditer(ort_text):
        s = m.group(1)
        s = _STADT_NAME.get(s.lower(), s[0].upper() + s[1:])
        if s not in ergebnis:
            ergebnis.append(s)
    return ergebnis


_AT_RE = re.compile(r"\b(Austria|Österreich|Oesterreich|Wien|Vienna)\b", re.IGNORECASE)
_CH_RE = re.compile(r"\b(Switzerland|Schweiz|Zürich|Zuerich|Zurich|Genf|Geneva|Basel)\b", re.IGNORECASE)


def land(ort_text: str) -> str:
    # Deutschland hat Vorrang (der Vorfilter lässt nur Deutschland durch); sonst das zuerst genannte.
    if _DE_RE.search(ort_text) or _DE_CODE.search(ort_text):
        return "Deutschland"
    treffer = [(m.start(), name) for name, rx in (("Österreich", _AT_RE), ("Schweiz", _CH_RE))
               if (m := rx.search(ort_text))]
    return min(treffer)[1] if treffer else ""
