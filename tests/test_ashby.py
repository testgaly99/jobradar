import json
from pathlib import Path

from scraper import http
from scraper.ats import ADAPTER, ashby
from scraper.filter import ist_relevant

FIX = Path(__file__).parent / "fixtures" / "ashby_taktile.json"


class Antwort:
    def json(self):
        return json.loads(FIX.read_text(encoding="utf-8"))


def _stellen(monkeypatch):
    urls = []
    monkeypatch.setattr(http, "hole", lambda u: urls.append(u) or Antwort())
    stellen = ashby.hole_stellen("taktile")
    assert urls == ["https://api.ashbyhq.com/posting-api/job-board/taktile"]
    return stellen


def test_fixture(monkeypatch):
    stellen = _stellen(monkeypatch)
    assert len(stellen) == 3  # unlisted copy excluded
    for s in stellen:
        assert set(s) == {"ext_id", "titel", "ort", "remote", "url", "beschreibung_kurz"}
        assert isinstance(s["ext_id"], str) and s["url"].startswith("http")
        assert isinstance(s["remote"], bool)
        assert len(s["beschreibung_kurz"]) <= 300
    assert "unlisted-test-copy" not in [s["ext_id"] for s in stellen]
    ny, berlin, _ = stellen
    assert "United States" in ny["ort"] and ny["remote"] is True
    assert berlin["ort"].count("Germany") == 1 and "Iasi Office" in berlin["ort"] and "Dublin" in berlin["ort"]
    assert ADAPTER["ashby"] is ashby.hole_stellen


def test_new_york_remote_wird_ausgefiltert(monkeypatch):
    ny = _stellen(monkeypatch)[0]
    assert ist_relevant(ny["titel"], ny["ort"], ny["remote"]) == (False, "Ausland")
