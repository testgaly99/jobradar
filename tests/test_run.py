import pytest

from scraper import db, run
from tests.fakedb import FakeDB


def firma(name, typ="fake", aktiv="ja"):
    return {"name": name, "careers_url": "", "ats_typ": typ, "ats_id": name, "aktiv": aktiv,
            "kategorie": ["Tech"], "notiz": "geheim", "groesse_klasse": "<50", "mitarbeitende_ca": "",
            "hauptsitz": ""}


def stelle(i, titel="Engineer", ort="Berlin"):
    return {"ext_id": i, "titel": titel, "ort": ort, "remote": False, "url": f"http://x/{i}",
            "beschreibung_kurz": "", "text": "t", "abteilung": "", "arbeitsmodell": "", "vertragsart": ""}


@pytest.fixture
def aufbau(tmp_path, monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)

    def setze(firmen, adapter):
        monkeypatch.setattr(run, "lade_unternehmen", lambda *a: firmen)
        monkeypatch.setattr(run, "ADAPTER", adapter)
        return tmp_path, fake.t
    return setze


def test_fehler_bricht_nicht_ab(aufbau):
    def a(_):
        raise RuntimeError("kaputt")
    d, t = aufbau([firma("A", "a"), firma("B", "b")], {"a": a, "b": lambda _: [stelle("1")]})
    bericht = run.lauf("2026-11-07", d)
    assert "B:1" in t["jobs"] and set(t["companies"]) == {"A", "B"}
    fa, fb = bericht["firmen"]
    assert "RuntimeError: kaputt" in fa["fehler"] and fb["fehler"] == ""
    assert "RuntimeError" in (d / "bericht.md").read_text(encoding="utf-8")
    assert t["laeufe"] == [{"datum": "2026-11-07", "bericht": bericht}]


def test_fehler_schliesst_nichts(aufbau):
    d, t = aufbau([firma("A", "a")], {"a": lambda _: [stelle("1")]})
    run.lauf("2026-11-06", d)

    def kaputt(_):
        raise RuntimeError("x")
    run.ADAPTER["a"] = kaputt
    run.lauf("2026-11-07", d)
    assert t["jobs"]["A:1"]["status"] == "offen"


def test_stelle_hat_neue_felder_und_bericht(aufbau):
    d, t = aufbau([firma("A", "a")], {"a": lambda _: [
        stelle("1", "Senior Engineer", "Munich; Berlin"), stelle("2"), stelle("3", "Werkstudent Foo")]})
    run.lauf("2026-11-06", d)
    s = t["jobs"]["A:1"]
    assert (s["erfahrungslevel"], s["staedte"]) == ("Senior", ["München", "Berlin"])
    assert s["land"] == "Deutschland"
    assert s["steckbrief"]["erfahrung_jahre"] is None and s["steckbrief"]["sprachen"] == []
    run.ADAPTER["a"] = lambda _: [stelle("2")]
    f = run.lauf("2026-11-07", d)["firmen"][0]
    assert (f["gefunden"], f["gefiltert"], f["neu"], f["geschlossen"]) == (1, 0, 0, 1)
    assert t["jobs"]["A:1"]["status"] == "geschlossen" and "A:3" not in t["jobs"]
    assert t["companies"]["A"]["kategorie"] == ["Tech"] and not (d / "daten.json").exists()


def test_unbekannter_adapter_ist_fehler(aufbau):
    d, _ = aufbau([firma("A", "nix")], {})
    assert "kein Adapter für nix" in run.lauf("2026-11-07", d)["firmen"][0]["fehler"]


def test_filterfehler_bricht_nicht_ab(aufbau):
    d, t = aufbau([firma("A", "a"), firma("B", "b")],
                  {"a": lambda _: [stelle("1")], "b": lambda _: [stelle("1")]})
    run.lauf("2026-11-06", d)
    run.ADAPTER["a"] = lambda _: [{"ext_id": "2", "ort": "Berlin", "remote": False}]  # titel fehlt
    run.ADAPTER["b"] = lambda _: [stelle("1"), stelle("9")]
    bericht = run.lauf("2026-11-07", d)
    assert "KeyError" in bericht["firmen"][0]["fehler"]
    assert t["jobs"]["A:1"]["status"] == "offen" and "A:2" not in t["jobs"]
    assert "B:9" in t["jobs"]


def test_inaktive_firma_wird_nicht_abgerufen(aufbau):
    d, t = aufbau([firma("A", "a"), firma("B", "b", aktiv="nein")],
                  {"a": lambda _: [stelle("1")], "b": lambda _: [stelle("1")]})
    bericht = run.lauf("2026-11-06", d)
    assert [f["name"] for f in bericht["firmen"]] == ["A"] and "B:1" not in t["jobs"]
    assert t["companies"]["B"]["aktiv"] is False


def test_steckbrief_fehler_kippt_firma_nicht(aufbau, monkeypatch):
    def kaputt(*a):
        raise ValueError("x")
    monkeypatch.setattr(run, "steckbrief", kaputt)
    d, t = aufbau([firma("A", "a")], {"a": lambda _: [stelle("1")]})
    assert run.lauf("2026-11-07", d)["firmen"][0]["fehler"] == ""
    assert t["jobs"]["A:1"]["steckbrief"] is None
