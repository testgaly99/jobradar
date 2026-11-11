import json
from pathlib import Path

from scraper import http
from scraper.ats import ADAPTER, recruitee
from scraper.filter import ist_relevant

FIX = Path(__file__).parent / "fixtures" / "recruitee_quantum.json"


class Antwort:
    def json(self):
        return json.loads(FIX.read_text(encoding="utf-8"))


def _stellen(monkeypatch):
    urls = []
    monkeypatch.setattr(http, "hole", lambda u: urls.append(u) or Antwort())
    stellen = recruitee.hole_stellen("career.quantum-systems.com")
    assert urls == ["https://career.quantum-systems.com/api/offers/"]
    return stellen


def test_recruitee_fixture(monkeypatch):
    stellen = _stellen(monkeypatch)
    assert len(stellen) == 3
    for s in stellen:
        assert set(s) == {"ext_id", "titel", "ort", "remote", "url", "beschreibung_kurz", "text",
                          "abteilung", "arbeitsmodell", "vertragsart", "abschnitte"}
        assert s["url"].startswith("https://career.quantum-systems.com/o/")
        assert s["beschreibung_kurz"] == s["text"][:300]
        assert "<" not in s["text"] and s["abschnitte"]
    erste, befristet, _ = stellen
    assert (erste["ext_id"], erste["ort"], erste["remote"]) == ("2819908", "Gilching, Germany", False)
    assert (erste["abteilung"], erste["arbeitsmodell"], erste["vertragsart"]) == ("Software", "Vor Ort", "Vollzeit")
    assert befristet["vertragsart"] == "Befristet"
    assert ADAPTER["recruitee"] is recruitee.hole_stellen


def test_recruitee_ausland_im_ort(monkeypatch):
    stellen = _stellen(monkeypatch)
    assert stellen[2]["ort"] == "Kyiv, Ukraine"
    assert ist_relevant(stellen[2]["titel"], stellen[2]["ort"], stellen[2]["remote"]) == (False, "Ausland")
    assert ist_relevant(stellen[0]["titel"], stellen[0]["ort"], stellen[0]["remote"])[0]


def test_recruitee_nur_veroeffentlichte(monkeypatch):
    daten = json.loads(FIX.read_text(encoding="utf-8"))
    daten["offers"][1]["status"] = "closed"
    antwort = Antwort()
    antwort.json = lambda: daten
    monkeypatch.setattr(http, "hole", lambda u: antwort)
    assert len(recruitee.hole_stellen("x.recruitee.com")) == 2
