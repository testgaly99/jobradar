"""Gemeinsame künstliche Beispiele, keine Modell- oder Datenbankaufrufe."""
import copy
import json
from pathlib import Path

import pytest
from scraper.ki import pruefe, Ungueltig
from scraper.steckbrief import steckbrief

BEISPIELE = json.loads((Path(__file__).parent / "fixtures/stellendaten_vertrag.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("fall", BEISPIELE["steckbriefe"], ids=lambda f: f["name"])
def test_steckbrief_schreiber_entspricht_gemeinsamer_rohform(fall):
    assert steckbrief(fall["abschnitte"], fall["text"]) == fall["roh"]


@pytest.mark.parametrize("fall", BEISPIELE["kiFaelle"], ids=lambda f: f["name"])
def test_ki_schreiber_gegen_gemeinsame_gueltige_und_kaputte_daten(fall):
    roh = copy.deepcopy(BEISPIELE["kiBasis"]) | copy.deepcopy(fall["aenderungen"])
    vorher = copy.deepcopy(roh)
    if fall["pythonGueltig"]:
        assert pruefe(roh) == roh | fall.get("normalisiert", {})
    else:
        with pytest.raises(Ungueltig):
            pruefe(roh)
    assert roh == vorher
