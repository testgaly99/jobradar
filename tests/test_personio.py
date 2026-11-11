from pathlib import Path

from scraper import http
from scraper.ats import ADAPTER, personio

FIX = Path(__file__).parent / "fixtures" / "personio_plato.xml"


class Antwort:
    content = FIX.read_bytes()


def _stellen(monkeypatch):
    urls = []
    monkeypatch.setattr(http, "hole", lambda u: urls.append(u) or Antwort())
    stellen = personio.hole_stellen("platoapp")
    assert urls == ["https://platoapp.jobs.personio.de/xml"]
    return stellen


def test_personio_fixture(monkeypatch):
    stellen = _stellen(monkeypatch)
    assert len(stellen) == 4
    for s in stellen:
        assert set(s) == {"ext_id", "titel", "ort", "remote", "url", "beschreibung_kurz", "text",
                          "abteilung", "arbeitsmodell", "vertragsart", "abschnitte"}
        assert s["url"] == f"https://platoapp.jobs.personio.de/job/{s['ext_id']}"
        assert s["beschreibung_kurz"] == s["text"][:300]
    erste, *_, mehrere = stellen
    assert (erste["ort"], erste["remote"], erste["vertragsart"]) == ("Berlin", False, "Vollzeit")
    assert erste["abteilung"] == "Sales"
    assert (mehrere["ort"], mehrere["remote"], mehrere["vertragsart"]) == ("Berlin, Remote", True, "Befristet")
    assert ADAPTER["personio"] is personio.hole_stellen


def test_personio_html_wird_text(monkeypatch):
    for s in _stellen(monkeypatch):
        assert "<" not in s["text"] and "&amp;" not in s["text"]
    assert "Sales & Growth" in _stellen(monkeypatch)[3]["text"]


def test_personio_abschnitte(monkeypatch):
    for s in _stellen(monkeypatch):
        assert s["abschnitte"]
    assert _stellen(monkeypatch)[0]["abschnitte"][0]["titel"] == "Your responsibilities"


def test_personio_url(monkeypatch):
    _stellen(monkeypatch)
