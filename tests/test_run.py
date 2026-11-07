import json

import pytest

from scraper import run


def firma(name, typ="fake", aktiv="ja"):
    return {"name": name, "ats_typ": typ, "ats_id": name, "aktiv": aktiv,
            "kategorie": ["Tech"], "notiz": "geheim", "groesse_klasse": "<50"}


def stelle(i, titel="Engineer", ort="Berlin"):
    return {"ext_id": i, "titel": titel, "ort": ort, "remote": False,
            "url": f"http://x/{i}", "beschreibung_kurz": ""}


@pytest.fixture
def aufbau(tmp_path, monkeypatch):
    def setze(firmen, adapter):
        monkeypatch.setattr(run, "lade_unternehmen", lambda *a: firmen)
        monkeypatch.setattr(run, "ADAPTER", adapter)
        return tmp_path
    return setze


def lies(pfad):
    return json.loads(pfad.read_text(encoding="utf-8"))


def test_fehler_bricht_nicht_ab(aufbau):
    def a(_):
        raise RuntimeError("kaputt")
    d = aufbau([firma("A", "a"), firma("B", "b")], {"a": a, "b": lambda _: [stelle("1")]})
    bericht = run.lauf("2026-11-07", d, d)
    assert "B:1" in lies(d / "jobs.json")
    fa, fb = bericht["firmen"]
    assert "RuntimeError: kaputt" in fa["fehler"] and fb["fehler"] == ""
    assert "RuntimeError" in (d / "bericht.md").read_text(encoding="utf-8")


def test_fehler_schliesst_nichts(aufbau):
    d = aufbau([firma("A", "a")], {"a": lambda _: [stelle("1")]})
    run.lauf("2026-11-06", d, d)

    def kaputt(_):
        raise RuntimeError("x")
    run.ADAPTER["a"] = kaputt
    run.lauf("2026-11-07", d, d)
    assert lies(d / "jobs.json")["A:1"]["status"] == "offen"


def test_daten_json_enthaelt_nur_offene(aufbau):
    d = aufbau([firma("A", "a")], {"a": lambda _: [stelle("1"), stelle("2"), stelle("3", "Werkstudent Foo")]})
    run.lauf("2026-11-06", d, d)
    run.ADAPTER["a"] = lambda _: [stelle("2")]
    bericht = run.lauf("2026-11-07", d, d)
    daten = lies(d / "daten.json")
    assert [s["id"] for s in daten["stellen"]] == ["A:2"]
    assert daten["stand"] == "2026-11-07"
    assert "notiz" not in daten["unternehmen"][0]
    assert daten["unternehmen"][0]["kategorie"] == ["Tech"]
    f = bericht["firmen"][0]
    assert (f["gefunden"], f["gefiltert"], f["neu"], f["geschlossen"]) == (1, 0, 0, 1)


def test_unbekannter_adapter_ist_fehler(aufbau):
    d = aufbau([firma("A", "nix")], {})
    assert "kein Adapter für nix" in run.lauf("2026-11-07", d, d)["firmen"][0]["fehler"]


def test_filterfehler_bricht_nicht_ab(aufbau):
    d = aufbau([firma("A", "a"), firma("B", "b")],
               {"a": lambda _: [stelle("1")], "b": lambda _: [stelle("1")]})
    run.lauf("2026-11-06", d, d)
    run.ADAPTER["a"] = lambda _: [{"ext_id": "2", "ort": "Berlin", "remote": False}]  # titel fehlt
    run.ADAPTER["b"] = lambda _: [stelle("1"), stelle("9")]
    bericht = run.lauf("2026-11-07", d, d)
    jobs = lies(d / "jobs.json")
    assert "KeyError" in bericht["firmen"][0]["fehler"]
    assert jobs["A:1"]["status"] == "offen" and "A:2" not in jobs
    assert "B:9" in jobs


def test_inaktive_firma_nicht_in_daten_json(aufbau):
    firmen = [firma("A", "a"), firma("B", "b")]
    d = aufbau(firmen, {"a": lambda _: [stelle("1")], "b": lambda _: [stelle("1")]})
    run.lauf("2026-11-06", d, d)
    firmen[1]["aktiv"] = "nein"
    run.lauf("2026-11-07", d, d)
    assert [s["id"] for s in lies(d / "daten.json")["stellen"]] == ["A:1"]
    assert lies(d / "jobs.json")["B:1"]["status"] == "offen"
