import json
from pathlib import Path

import pytest

from scraper.titel_vergleich import aehnlichkeit, norm_titel_streng, vergleiche


FAELLE = json.loads(
    (Path(__file__).parent / "fixtures" / "titel-vergleich.json").read_text(encoding="utf-8")
)


@pytest.mark.parametrize("fall", FAELLE, ids=[fall["fall"] for fall in FAELLE])
def test_vergleiche(fall):
    kandidaten = fall["kandidaten"]
    erwartet = fall["erwartet"]
    ergebnis = vergleiche(fall["titel"], fall["ort"], kandidaten)
    assert ergebnis["art"] == erwartet["art"]
    treffer = ergebnis.get("treffer", [])
    if ergebnis["art"] == "eindeutig":
        treffer = [treffer]
    assert len(treffer) == len(erwartet["indizes"])
    assert all(antwort is kandidaten[index] for antwort, index in zip(treffer, erwartet["indizes"]))


def test_norm_titel_streng():
    assert norm_titel_streng(" Développeur*in – C++ (m/w/d) ") == "développeur c++"


def test_aehnlichkeit():
    assert aehnlichkeit("Data Analyst", "Data Analyst Controlling (m/w/d)") == 1
    assert aehnlichkeit("Head of Data and Analytics", "Data Analytics") == 1
    assert aehnlichkeit("Data Engineer", "Data Analyst") == 0.5
    for fuellwort in "und and of für for the der die das im in m w d".split():
        assert aehnlichkeit(f"Sales {fuellwort}", f"Finance {fuellwort}") == 0
    assert aehnlichkeit("Data Data Analyst", "Analyst Data") == 1
    assert aehnlichkeit("", "") == 0
