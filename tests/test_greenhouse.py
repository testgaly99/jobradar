import json
from pathlib import Path

from scraper import http
from scraper.ats import ADAPTER, greenhouse

FIX = Path(__file__).parent / "fixtures" / "greenhouse_helsing.json"


class Antwort:
    def json(self):
        return json.loads(FIX.read_text(encoding="utf-8"))


def test_fixture(monkeypatch):
    urls = []
    monkeypatch.setattr(http, "hole", lambda u: urls.append(u) or Antwort())
    stellen = greenhouse.hole_stellen("helsing")
    assert urls == ["https://boards-api.greenhouse.io/v1/boards/helsing/jobs?content=true"]
    assert len(stellen) == 3
    for s in stellen:
        assert set(s) == {"ext_id", "titel", "ort", "remote", "url", "beschreibung_kurz", "text",
                          "abteilung", "arbeitsmodell", "vertragsart"}
        assert isinstance(s["ext_id"], str) and s["url"].startswith("http")
        assert 0 < len(s["beschreibung_kurz"]) <= 300
        assert "<" not in s["text"] and s["text"].startswith(s["beschreibung_kurz"])
        assert s["abteilung"] and s["vertragsart"] == ""
    assert max(len(s["text"]) for s in stellen) > 300  # kein Abschneiden
    assert [s["abteilung"] for s in stellen] == ["Finance", "Finance", "AI & Engineering"]
    assert ADAPTER["greenhouse"] is greenhouse.hole_stellen


def test_doppelt_escapte_entities(monkeypatch):
    class A:
        def json(self):
            return {"jobs": [{"id": 1, "title": "T", "absolute_url": "http://x", "location": {"name": "Berlin"},
                              "content": "&lt;p&gt;A&amp;nbsp;B &amp;amp; C&lt;/p&gt;"}]}
    monkeypatch.setattr(http, "hole", lambda u: A())
    assert greenhouse.hole_stellen("x")[0]["text"] == "A B & C"


def test_arbeitsmodell(monkeypatch):
    class A:
        def json(self):
            return {"jobs": [{"id": i, "title": "T", "absolute_url": "http://x", "location": {"name": o}, "content": ""}
                             for i, o in enumerate(["Remote - EU", "Berlin (Hybrid)", "Berlin"])]}
    monkeypatch.setattr(http, "hole", lambda u: A())
    assert [s["arbeitsmodell"] for s in greenhouse.hole_stellen("x")] == ["Remote", "Hybrid", ""]
