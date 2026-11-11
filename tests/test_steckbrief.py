from scraper.steckbrief import steckbrief


def sb(text, abschnitte=None):
    return steckbrief(abschnitte or [], text)


def test_erfahrung():
    assert sb("We want 3+ years of experience in sales")["erfahrung_jahre"] == 3
    assert sb("mindestens 5 Jahre Berufserfahrung")["erfahrung_jahre"] == 5
    assert sb("5–7 years of experience")["erfahrung_jahre"] == 5
    assert sb("Join us, we are great")["erfahrung_jahre"] is None
    assert sb("Founded 10 years ago. You have 4 years of experience.")["erfahrung_jahre"] == 4


def test_gehalt():
    erwartet = {"min": 70000, "max": 85000, "waehrung": "EUR", "zeitraum": "Jahr"}
    assert sb("€70.000 – €85.000 brutto pro Jahr")["gehalt"] == erwartet
    assert sb("70k-85k EUR")["gehalt"] == erwartet
    assert sb("90-110k CHF")["gehalt"] == {"min": 90000, "max": 110000, "waehrung": "CHF", "zeitraum": "Jahr"}
    assert sb("5.500 € pro Monat")["gehalt"] == {"min": 5500, "max": 5500, "waehrung": "EUR", "zeitraum": "Monat"}
    assert sb("Relocation support up to €2,500 and €9/day meal card")["gehalt"] is None
    assert sb("kein Gehalt genannt")["gehalt"] is None


def test_sprachen():
    assert sb("German (C1)")["sprachen"] == [{"sprache": "Deutsch", "niveau": "C1"}]
    assert sb("fließend Englisch")["sprachen"] == [{"sprache": "Englisch", "niveau": "fließend"}]
    assert sb("fluent German and native French")["sprachen"] == [
        {"sprache": "Deutsch", "niveau": "fließend"}, {"sprache": "Französisch", "niveau": "Muttersprache"}]
    assert sb("offices in Germany and English-speaking markets")["sprachen"] == []


def test_sicherheit():
    assert sb("Ü2")["sicherheitsueberpruefung"] is True
    assert sb("Active security clearance")["sicherheitsueberpruefung"] is True
    assert sb("Sicherheitsüberprüfung nötig")["sicherheitsueberpruefung"] is True
    assert sb("nothing")["sicherheitsueberpruefung"] is False


def test_abschnitte_zaehlen_mit():
    assert sb("", [{"titel": "Profil", "punkte": ["3+ years of experience"]}])["erfahrung_jahre"] == 3


def test_erfahrung_ohne_bezug_ist_none():
    for t in ("for the past 12 years we grew", "3 years contract", "within 2 years", "5–7 years"):
        assert sb(t)["erfahrung_jahre"] is None


def test_gehalt_kaputte_zahlen_und_falsche_treffer():
    assert sb("01.09.2026 – 30.09.2026 EUR")["gehalt"] is None
    assert sb("1.2.3 - 4.5.6 EUR")["gehalt"] is None
    for t in ("€50.000–100.000 Budget", "EUR 1.000-2.000 sign-on bonus", "€5.000 per year bonus"):
        assert sb(t)["gehalt"] is None


def test_lange_anzeige_ist_schnell():
    import time
    t = ("1 2 3 4 5 " * 5000)[:50000]
    start = time.perf_counter()
    sb(t)
    assert time.perf_counter() - start < 1
