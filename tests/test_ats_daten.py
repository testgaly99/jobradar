"""Kaputte Anbieterantworten dürfen nicht als erfolgreicher leerer Abruf gelten."""
from types import SimpleNamespace
import pytest
from scraper import http
from scraper.ats import greenhouse, ashby, recruitee, personio, sitemap


@pytest.mark.parametrize("adapter,feld", [(greenhouse, "jobs"), (ashby, "jobs"), (recruitee, "offers")])
@pytest.mark.parametrize("wert", [{}, "", None, 42])
def test_json_antwort_braucht_echte_objektliste(monkeypatch, adapter, feld, wert):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(json=lambda: {feld: wert}))
    with pytest.raises(ValueError):
        adapter.hole_stellen("synthetisch")


@pytest.mark.parametrize("adapter,feld", [(greenhouse, "jobs"), (ashby, "jobs"), (recruitee, "offers")])
@pytest.mark.parametrize("eintrag", [None, "Text", 42, []])
def test_einzelnes_nicht_objekt_wird_uebersprungen(monkeypatch, adapter, feld, eintrag):
    gut = {"id": 1, "title": "Engineer", "isListed": True, "jobUrl": "u", "absolute_url": "u", "careers_url": "u"}
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(json=lambda: {feld: [eintrag, gut]}))
    stellen = adapter.hole_stellen("synthetisch")
    assert stellen[0] == {"uebersprungen": "kein Objekt"} and stellen[1]["ext_id"] == "1"


@pytest.mark.parametrize("adapter,feld", [(greenhouse, "jobs"), (ashby, "jobs"), (recruitee, "offers")])
def test_echte_leere_json_liste_bleibt_gueltig(monkeypatch, adapter, feld):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(json=lambda: {feld: []}))
    assert adapter.hole_stellen("synthetisch") == []


@pytest.mark.parametrize("adapter,feld", [(greenhouse, "jobs"), (ashby, "jobs"), (recruitee, "offers")])
@pytest.mark.parametrize("id_", [None, True, {}, []])
def test_quell_id_wird_nicht_durch_str_zu_scheinbar_gueltiger_id(monkeypatch, adapter, feld, id_):
    job = {"id": id_, "title": "Engineer", "absolute_url": "https://example.invalid/test",
           "isListed": True, "jobUrl": "https://example.invalid/test", "careers_url": "https://example.invalid/test"}
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(json=lambda: {feld: [job]}))
    assert adapter.hole_stellen("synthetisch")[0]["ext_id"] is None  # run.py überspringt sie als "ungültige ID"


@pytest.mark.parametrize("adapter,feld", [(greenhouse, "jobs"), (ashby, "jobs"), (recruitee, "offers")])
def test_fehlende_einzelfelder_kippen_nicht_die_ganze_liste(monkeypatch, adapter, feld):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(json=lambda: {feld: [{"isListed": True}]}))
    s = adapter.hole_stellen("synthetisch")[0]
    assert s["ext_id"] is None and s["titel"] is None and s["url"] is None


@pytest.mark.parametrize("adapter", [personio, sitemap])
def test_falsche_xml_wurzel_ist_keine_leere_stellenliste(monkeypatch, adapter):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(content=b"<html><body>Fehler</body></html>"))
    with pytest.raises(ValueError):
        adapter.hole_stellen("synthetisch")


@pytest.mark.parametrize("adapter,xml", [(personio, b"<workzag-jobs/>"), (sitemap, b"<urlset/>")])
def test_leere_erwartete_xml_liste_bleibt_gueltig(monkeypatch, adapter, xml):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(content=xml))
    assert adapter.hole_stellen("synthetisch") == []


def test_personio_stelle_ohne_id_kippt_nicht_die_ganze_liste(monkeypatch):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(content=b"<workzag-jobs><position/></workzag-jobs>"))
    assert personio.hole_stellen("synthetisch")[0]["ext_id"] == ""


def test_sitemap_eintrag_ohne_link_ist_fehler(monkeypatch):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(content=b"<urlset><url><loc> </loc></url></urlset>"))
    with pytest.raises(ValueError):
        sitemap.hole_stellen("synthetisch")
