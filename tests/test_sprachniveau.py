"""Deutschniveau per Regeln. Testsätze aus dem Prototyp (docs/superpowers/specs/2026-11-18-sprachniveau-prototyp.py)."""
import pytest

from scraper.sprachniveau import STUFEN, deutsch, englisch, rang

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


@pytest.mark.parametrize("satz,soll", FAELLE)
def test_prototyp_faelle(satz, soll):
    assert kurz(deutsch(satz, englisch=True)) == soll


def test_vorteil_mit_stufenbereich():
    assert deutsch("German at B2 to C1 is a strong plus.", True) == {"status": "vorteil", "stufe": "B2–C1", "geschaetzt": False}


def test_vorteil_mit_einer_stufe():
    assert deutsch("German (B2) is a plus.", True)["stufe"] == "B2"


def test_vorteil_ohne_stufe_bleibt_ohne():
    assert deutsch("Fluent English, German a plus.", True)["stufe"] is None


def test_deutsche_anzeige_ohne_deutsch_ist_ohne_niveau_englische_keins():
    assert deutsch("Wir suchen eine Analystin.", False)["status"] == "ohne_niveau"
    assert deutsch("We are hiring an analyst.", True)["status"] == "keins"


def test_rang():
    assert STUFEN.index("C1") == 4
    assert rang({"status": "pflicht", "stufe": "C1", "geschaetzt": True}) == 5
    assert rang({"status": "pflicht", "stufe": "Muttersprache", "geschaetzt": True}) == 7
    assert rang({"status": "vorteil", "stufe": "B2", "geschaetzt": False}) is None
    assert rang({"status": "ohne_niveau", "stufe": None, "geschaetzt": False}) is None
    assert rang(None) is None


def test_englisch():
    assert englisch("the a the b the c the d the e the f") is True
    assert englisch("Wir suchen dich") is False
    assert englisch(None) is False
