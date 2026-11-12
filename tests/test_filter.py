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
    ("Data Engineer", "Berlin", False),
    ("Elektrotechnik-Ingenieur (m/w/d)", "Berlin", False),
    ("Mechatronik-Ingenieur (m/w/d)", "Berlin", False),
    ("Fahrerassistenzsysteme Entwickler (m/w/d)", "Berlin", False),
    ("Entwickler Fahrerassistenzsysteme (ADAS)", "Berlin", False),
    ("Fahrer-Assistenzsysteme Entwickler (m/w/d)", "Berlin", False),
    ("Fahrer-Fahrzeug-Interaktion Ingenieur", "Berlin", False),
    ("Service Techniker (m/w/d)", "Berlin", False),
    ("Nachwuchsführungskraft (w/m/d)", "Berlin", False),
    ("Elektronikentwickler Hardware", "Berlin", False),
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
    # nicht-akademische Berufe (der Nutzer will nur Stellen mit Studium)
    "Warenverräumer (w/m/d) 6 Std./Wo. in 59065 Hamm", "Warenverräumerin", "Reinigungskraft (w/m/d) 10 Std./Wo.",
    "Reinigungskräfte gesucht", "Stellvertretender Filialleiter (w/m/d)", "stellv. Filialleitung", "Filialleiterin",
    "Servicekraft für die Cafeteria im Geldmuseum", "Kfz-Mechatroniker (m/w/d)", "Mechatronikerin",
    "Elektroniker für Betriebstechnik (m/w/d)", "Industrieelektronikerin", "Servicemonteur (m/w/d)", "Monteurin",
    "Lagerist (m/w/d)", "Fachlageristin", "LKW-Fahrer (m/w/d)", "Auslieferungsfahrer", "Fahrer/in", "Fahrerin Shuttle", "Fahrer (m/w/d)",
    "Schülerjob dm-Markt (w/m/d)",
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


@pytest.mark.parametrize("titel,jahre,level", [
    ("Head of Data", 3, "Mid"), ("Junior Analyst", 6, "Senior"), ("Engineer", 0, "Junior"), ("Engineer", 1, "Junior"),
    ("Engineer", 2, "Mid"), ("Engineer", 4, "Mid"), ("Engineer", 5, "Senior"), ("Engineer", 7, "Senior"),
    ("Engineer", 8, "Lead"), ("Senior Engineer", None, "Senior"),
])
def test_erfahrungslevel_aus_jahren(titel, jahre, level):
    """Jahre aus der Anzeige gewinnen; nur ohne Angabe wird aus dem Titel geschätzt."""
    assert erfahrungslevel(titel, jahre) == level
