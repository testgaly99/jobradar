"""Vorfilter: nur Deutschland plus Remote (Europa/EMEA/EU), keine Ausbildung/Praktikum/etc."""
import re

_TITEL_WOERTER = (
    "Ausbildung", "Duales Studium", "Dual", "Praktikum", "Intern", "Internship", "Working Student",
    "Bachelorarbeit", "Masterarbeit", "Abschlussarbeit", "Thesis", "Filiale",
)
# Stämme mit weiblicher/Pluralform (Werkstudentin, Aushilfen, Azubis); \w* nur hier, sonst träfe es "International"
_TITEL_STAEMME = (
    "Azubi", "Auszubildende", "Praktikant", "Werkstudent", "Minijob", "Aushilfe", "Verkäufer", "Kassierer",
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
