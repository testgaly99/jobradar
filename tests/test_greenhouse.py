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
        assert set(s) == {"ext_id", "titel", "ort", "remote", "url", "beschreibung_kurz"}
        assert isinstance(s["ext_id"], str) and s["url"].startswith("http")
        assert 0 < len(s["beschreibung_kurz"]) <= 300
        assert "<" not in s["beschreibung_kurz"]
    assert ADAPTER["greenhouse"] is greenhouse.hole_stellen
