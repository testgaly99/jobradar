import pytest

from scraper.filter import deutsche_staedte, erfahrungslevel, ist_relevant


@pytest.mark.parametrize("titel,ort,remote", [
    ("Software Engineer", "Munich - London", False),
    ("Mechanical Engineer", "Gilching", False),
    ("Backend Engineer", "Remote - Europe", True),
    ("Backend Engineer", "", True),
    ("Backend Engineer", "  ", True),
    ("International Sales Manager", "Berlin", False),
    ("Internal Tools Engineer", "Berlin", False),
    ("Trainee Finance", "Frankfurt am Main", False),
    ("Graduate Engineer", "Germany", False),
    ("Junior Developer", "Stuttgart, DE", False),
    ("Engineer", "Düsseldorf", False),
    ("Engineer", "Muenchen", False),
    ("Engineer", "Berlin, DE", False),
    ("Dualität Engineer", "Berlin", False),
    ("Dual-Use Systems Engineer", "Munich", False),
    ("Dual Use Program Manager", "Berlin", False),
    ("Projektleiter Initiative Digitalisierung", "Berlin", False),
    ("Praktiker Instandhaltung (m/w/d)", "Berlin", False),
    ("Ingenieur für praktische Anwendungen", "Berlin", False),
    ("Ausbildungsleiter (m/w/d)", "Berlin", False),
    ("Praktikumsbetreuer HR", "Berlin", False),
])
def test_bleibt(titel, ort, remote):
    assert ist_relevant(titel, ort, remote) == (True, "")


@pytest.mark.parametrize("titel,ort,remote", [
    ("Account Executive", "New York Office United States", True),
    ("Engineer", "Comunidad de Madrid", False),
    ("Engineer", "Paris", False),
    ("Engineer", "Remote - Europe", False),
    ("Engineer", "Remote - USA", True),
    ("Engineer", "Euston London", True),
])
def test_ausland(titel, ort, remote):
    assert ist_relevant(titel, ort, remote) == (False, "Ausland")


def test_werkstudent():
    assert ist_relevant("Werkstudent Controlling (m/w/d)", "Hamburg", False) == (False, "Stellenart: werkstudent")


@pytest.mark.parametrize("titel", [
    "Verkäufer (m/w/d) Filiale Köln", "Ausbildung zum Fachinformatiker", "Praktikum Marketing",
    "Werkstudentin Marketing (w/m/d)", "Praktikantin HR", "Verkäuferin (m/w/d)", "Kassiererin", "Aushilfen gesucht", "Azubis",
    "Intern Data", "Summer Internship", "Duales Studium BWL", "Dualer Student", "Masterarbeit KI", "Working Student Ops",
    "Initiativbewerbung", "Initiativbewerbungen Studierende", "Unsolicited Application", "Open Application (m/f/d)",
    "Spontaneous Application", "Schülerpraktikum dm-Markt (w/m/d) in Berlin", "Pflichtpraktikum Marketing",
    "Schülerpraktikant (m/w/d)", "Schülerpraktikantin IT",
])
def test_stellenart_raus(titel):
    ok, grund = ist_relevant(titel, "Berlin", False)
    assert not ok and grund.startswith("Stellenart: ")


@pytest.mark.parametrize("titel,level", [
    ("Senior Engineering Manager", "Senior"), ("Head of Junior Talent", "Lead"), ("Trainee Finance", "Junior"),
    ("Backend Engineer", "Mid"), ("Teamleiter Controlling", "Mid"), ("Leiter Controlling", "Lead"),
    ("Sr. Data Scientist", "Senior"), ("Staff Engineer", "Lead"),
])
def test_erfahrungslevel(titel, level):
    assert erfahrungslevel(titel) == level


@pytest.mark.parametrize("ort,staedte", [
    ("Berlin; London; Munich; Paris", ["Berlin", "München"]),
    ("Remote - Europe", []),
    ("Muenchen, Cologne, Frankfurt am Main, Nuremberg, Duesseldorf",
     ["München", "Köln", "Frankfurt", "Nürnberg", "Düsseldorf"]),
    ("Berlin / Berlin, Germany", ["Berlin"]),
])
def test_deutsche_staedte(ort, staedte):
    assert deutsche_staedte(ort) == staedte
