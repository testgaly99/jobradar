"""Kaputte Anbieterantworten dürfen nicht als erfolgreicher leerer Abruf gelten."""
from types import SimpleNamespace
import pytest
from scraper import http
from scraper.ats import greenhouse, ashby, recruitee, personio, sitemap


@pytest.mark.parametrize("adapter,feld", [(greenhouse, "jobs"), (ashby, "jobs"), (recruitee, "offers")])
@pytest.mark.parametrize("wert", [{}, "", None, 42, [None], ["Text"]])
def test_json_antwort_braucht_echte_objektliste(monkeypatch, adapter, feld, wert):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(json=lambda: {feld: wert}))
    with pytest.raises(ValueError):
        adapter.hole_stellen("synthetisch")


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
    with pytest.raises(ValueError):
        adapter.hole_stellen("synthetisch")


@pytest.mark.parametrize("adapter", [personio, sitemap])
def test_falsche_xml_wurzel_ist_keine_leere_stellenliste(monkeypatch, adapter):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(content=b"<html><body>Fehler</body></html>"))
    with pytest.raises(ValueError):
        adapter.hole_stellen("synthetisch")


@pytest.mark.parametrize("adapter,xml", [(personio, b"<workzag-jobs/>"), (sitemap, b"<urlset/>")])
def test_leere_erwartete_xml_liste_bleibt_gueltig(monkeypatch, adapter, xml):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(content=xml))
    assert adapter.hole_stellen("synthetisch") == []


def test_sitemap_eintrag_ohne_link_ist_fehler(monkeypatch):
    monkeypatch.setattr(http, "hole", lambda _: SimpleNamespace(content=b"<urlset><url><loc> </loc></url></urlset>"))
    with pytest.raises(ValueError):
        sitemap.hole_stellen("synthetisch")
