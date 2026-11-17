"""Echte Adapterkette mit künstlichen Antworten: kaputte Flags werden übersprungen, gültige Stellen übernommen, nichts geschlossen."""
from copy import deepcopy
from types import SimpleNamespace

import pytest

from scraper import db, http, run
from scraper.ats import ashby, recruitee
from tests.fakedb import FakeDB


def vorbereiten(monkeypatch, adapter, feld):
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)
    monkeypatch.setattr(db, "_spalten", True)
    monkeypatch.setattr(run, "ADAPTER", {"synthetisch": adapter.hole_stellen})
    firma = {"name": "Testfirma", "ats_typ": "synthetisch", "ats_id": "synthetisch"}
    daten = [{
        "id": str(i), "title": "Engineer", "isListed": True, "location": "Berlin", "city": "Berlin",
        "jobUrl": "https://example.invalid/test", "careers_url": "https://example.invalid/test",
        "descriptionPlain": "Künstlicher Bestandstext", "description": "Künstlicher Bestandstext",
    } for i in [1, 2]]
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(json=lambda: {feld: daten}))
    assert run._firma(firma, "2026-11-15")["fehler"] == ""
    assert len(fake.t["jobs"]) == 2
    return firma, fake, daten


def pruefe_uebersprungen(firma, fake, daten, kaputt, teilweise, grund):
    bestand = deepcopy(fake.t["jobs"])
    gueltig = {**daten[0], "descriptionPlain": "Geänderter Text", "description": "Geänderter Text"}
    daten[:] = [gueltig, kaputt] if teilweise else [kaputt]
    bericht = run._firma(firma, "2026-11-16")
    assert bericht["fehler"] == ("" if teilweise else "Antwortprüfung: alle 1 Stellen übersprungen (Format geändert?)")
    assert bericht["uebersprungen"] == {grund: 1}
    assert bericht["geschlossen"] == bericht["neu"] == 0
    assert fake.t["jobs"]["Testfirma:2"] == bestand["Testfirma:2"]  # nicht geschlossen, Text bleibt
    if teilweise:
        assert fake.t["jobs"]["Testfirma:1"]["text"] == "Geänderter Text"
        assert fake.t["jobs"]["Testfirma:1"]["zuletzt_gesehen"] == "2026-11-16"
    else:
        assert fake.t["jobs"] == bestand


@pytest.mark.parametrize("aenderung", [
    None, {}, {"isListed": None}, {"isListed": 0}, {"isListed": 1}, {"isListed": ""},
    {"isListed": "false"}, {"isListed": {}}, {"isListed": []},
])
@pytest.mark.parametrize("teilweise", [False, True])
def test_ashby_kaputtes_islisted_wird_uebersprungen(monkeypatch, aenderung, teilweise):
    firma, fake, daten = vorbereiten(monkeypatch, ashby, "jobs")
    kaputt = {k: v for k, v in daten[1].items() if k != "isListed"}
    kaputt = {} if aenderung is None else {**kaputt, **aenderung}
    pruefe_uebersprungen(firma, fake, daten, kaputt, teilweise, "isListed ungültig")


@pytest.mark.parametrize("status", [None, 0, False, True, {}, [], "", " \t\n"])
@pytest.mark.parametrize("teilweise", [False, True])
def test_recruitee_kaputter_status_wird_uebersprungen(monkeypatch, status, teilweise):
    firma, fake, daten = vorbereiten(monkeypatch, recruitee, "offers")
    pruefe_uebersprungen(firma, fake, daten, {**daten[1], "status": status}, teilweise, "Status ungültig")


@pytest.mark.parametrize("adapter,feld,unveroeffentlicht", [
    (ashby, "jobs", {"isListed": False}),
    (recruitee, "offers", {"status": "closed"}),
    (recruitee, "offers", {"status": "draft"}),
])
@pytest.mark.parametrize("leer", [False, True])
def test_gueltige_leere_oder_unveroeffentlichte_antwort_behaelt_schliessregel(monkeypatch, adapter, feld, unveroeffentlicht, leer):
    firma, fake, daten = vorbereiten(monkeypatch, adapter, feld)
    text = fake.t["jobs"]["Testfirma:1"]["text"]
    daten[:] = [] if leer else [daten[0], unveroeffentlicht]
    bericht = run._firma(firma, "2026-11-16")
    assert bericht["fehler"] == ""
    assert bericht["geschlossen"] == (2 if leer else 1)
    assert fake.t["jobs"]["Testfirma:2"]["status"] == "geschlossen"
    assert fake.t["jobs"]["Testfirma:2"]["text"] is None
    if not leer:
        assert fake.t["jobs"]["Testfirma:1"]["status"] == "offen"
        assert fake.t["jobs"]["Testfirma:1"]["text"] == text
