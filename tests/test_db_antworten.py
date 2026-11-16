"""Kaputte Leseantworten dürfen weder Bestand noch Bewerbungstexte verändern."""
from copy import deepcopy

import pytest

from scraper import db
from tests.fakedb import FakeDB


def job(id_, text="Künstlicher Bestandstext"):
    return {"ext_id": str(id_), "titel": "Engineer", "ort": "Berlin", "staedte": ["Berlin"],
            "remote": False, "url": "https://example.invalid/test", "beschreibung_kurz": "",
            "text": text, "abteilung": "Technik", "arbeitsmodell": "", "vertragsart": "",
            "erfahrungslevel": "Senior"}


@pytest.fixture
def bestand(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)
    monkeypatch.setattr(db, "_spalten", True)
    db.schreibe("Testfirma", [job(i) for i in range(1, 7)], "2026-11-01")
    return fake


@pytest.mark.parametrize("antwort", [
    {}, None, "", False, 0, [None], [{}],
    [{"id": "Testfirma:1", "status": "offen"}],
    [{"id": "Testfirma:1", "status": "unbekannt", "erstmals_gesehen": "2026-11-01"}],
    [{"id": "Testfirma:1", "status": "offen", "erstmals_gesehen": 42}],
    [{"id": "Testfirma:1", "status": "offen", "erstmals_gesehen": ""}],
    [{"id": None, "status": "offen", "erstmals_gesehen": "2026-11-01"}],
    [{"id": "Andere-Firma:1", "status": "offen", "erstmals_gesehen": "2026-11-01"}],
])
@pytest.mark.parametrize("zweite_seite", [False, True])
def test_beschaedigter_bestand_schreibt_nichts(monkeypatch, bestand, antwort, zweite_seite):
    vorher = deepcopy(bestand.t)
    writes = []
    monkeypatch.setattr(db, "SEITE", 2)

    def req(method, pfad, **kw):
        if method != "GET":
            writes.append((method, pfad))
        if method == "GET" and pfad == "jobs" and kw["params"].get("select") == "id,status,erstmals_gesehen":
            if kw["params"]["offset"] == (2 if zweite_seite else 0):
                return antwort
        return bestand(method, pfad, **kw)

    monkeypatch.setattr(db, "_req", req)
    with pytest.raises((ValueError, TypeError, KeyError)):
        db.schreibe("Testfirma", [job(1, "Neuer Text"), job(7)], "2026-11-16")
    assert writes == []
    assert bestand.t == vorher


def test_doppelte_bestands_id_auf_folgeseite_wird_nicht_ueberschrieben(monkeypatch, bestand):
    vorher = deepcopy(bestand.t)
    monkeypatch.setattr(db, "SEITE", 2)

    def req(method, pfad, **kw):
        if method == "GET" and pfad == "jobs" and kw["params"].get("offset") == 2:
            return [{"id": "Testfirma:1", "status": "offen", "erstmals_gesehen": "2026-11-15"}]
        return bestand(method, pfad, **kw)

    monkeypatch.setattr(db, "_req", req)
    with pytest.raises(ValueError):
        db.schreibe("Testfirma", [job(1)], "2026-11-16")
    assert bestand.t == vorher


@pytest.mark.parametrize("antwort", [{}, None, "", 0, [None], [{}], [{"job_id": None}],
                                      [{"job_id": ""}], [{"job_id": "Andere-Firma:9"}]])
@pytest.mark.parametrize("zweiter_chunk", [False, True])
def test_beschaedigte_bewerbungsantwort_erhaelt_gesamten_bestand(monkeypatch, bestand, antwort, zweiter_chunk):
    bestand.t["applications"] = ["Testfirma:3", "Testfirma:6"]
    vorher = deepcopy(bestand.t)
    writes = []
    monkeypatch.setattr(db, "CHUNK", 2)
    abfragen = 0

    def req(method, pfad, **kw):
        nonlocal abfragen
        if method != "GET":
            writes.append((method, pfad))
        if method == "GET" and pfad == "applications":
            abfragen += 1
            if abfragen == (2 if zweiter_chunk else 1):
                return antwort
        return bestand(method, pfad, **kw)

    monkeypatch.setattr(db, "_req", req)
    with pytest.raises((ValueError, TypeError, KeyError)):
        db.schreibe("Testfirma", [job(1, "Neuer Text"), job(7)], "2026-11-16", unveraendert=["2"])
    assert writes == []
    assert bestand.t == vorher  # auch Text, Hash, Erstdatum und letztes Sichtungsdatum


def test_null_erstdatum_und_mehrere_bewerbungen_bleiben_gueltig(bestand):
    bestand.t["jobs"]["Testfirma:1"]["erstmals_gesehen"] = None
    bestand.t["applications"] = ["Testfirma:2", "Testfirma:2"]
    assert db.schreibe("Testfirma", [job(1)], "2026-11-16") == (0, 5)
    assert bestand.t["jobs"]["Testfirma:1"]["erstmals_gesehen"] is None
    assert bestand.t["jobs"]["Testfirma:2"]["text"] == "Künstlicher Bestandstext"
    assert bestand.t["jobs"]["Testfirma:3"]["text"] is None


def test_echte_leere_antworten_bleiben_gueltig(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)
    monkeypatch.setattr(db, "_spalten", True)
    assert db.schreibe("Testfirma", [], "2026-11-16") == (0, 0)
    assert db.schreibe("Testfirma", [job(1)], "2026-11-16") == (1, 0)
    assert db.schreibe("Testfirma", [], "2026-11-17") == (0, 1)


def test_bewerbungsschutz_liest_mehr_als_1000_zeilen_vor_schreiben(monkeypatch, bestand):
    bestand.t["applications"] = ["Testfirma:1"] * 1001 + ["Testfirma:6"]
    offsets = []
    writes = []

    def req(method, pfad, **kw):
        if method == "GET" and pfad == "applications":
            offsets.append(kw["params"].get("offset"))
        if method != "GET":
            writes.append(list(offsets))
        return bestand(method, pfad, **kw)

    monkeypatch.setattr(db, "_req", req)
    assert db.schreibe("Testfirma", [], "2026-11-16") == (0, 6)
    assert offsets == [0, 1000]
    assert writes and all(o == offsets for o in writes)
    assert bestand.t["jobs"]["Testfirma:1"]["text"] == "Künstlicher Bestandstext"
    assert bestand.t["jobs"]["Testfirma:6"]["text"] == "Künstlicher Bestandstext"
    assert bestand.t["jobs"]["Testfirma:2"]["text"] is None


@pytest.mark.parametrize("antwort", [{}, None, [None], [{}], [{"job_id": 0}], [{"job_id": "Andere-Firma:9"}]])
def test_kaputte_bewerbungsfolgeseite_stoppt_vor_allem_schreiben(monkeypatch, bestand, antwort):
    bestand.t["applications"] = ["Testfirma:3"] * 3
    vorher = deepcopy(bestand.t)
    writes = []
    monkeypatch.setattr(db, "SEITE", 2)

    def req(method, pfad, **kw):
        if method != "GET":
            writes.append((method, pfad))
        if method == "GET" and pfad == "applications" and kw["params"].get("offset") == 2:
            return antwort
        return bestand(method, pfad, **kw)

    monkeypatch.setattr(db, "_req", req)
    with pytest.raises((ValueError, TypeError, KeyError)):
        db.schreibe("Testfirma", [job(1, "Geändert"), job(7)], "2026-11-16", unveraendert=["2"])
    assert writes == []
    assert bestand.t == vorher
