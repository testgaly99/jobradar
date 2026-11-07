from pathlib import Path

from scraper.companies import lade_unternehmen

ROOT = Path(__file__).resolve().parent.parent
SPALTEN = ["name", "careers_url", "ats_typ", "ats_id", "groesse_klasse",
           "mitarbeitende_ca", "kategorie", "hauptsitz", "aktiv", "notiz"]
GROESSEN = {"<50", "50–249", "250–999", "1.000+"}


def _erlaubte_kategorien():
    zeilen = (ROOT / "data" / "kategorien.md").read_text(encoding="utf-8").splitlines()
    i = zeilen.index("## Kategorien")
    return set(zeilen[i + 1].split(" · "))


def test_companies_gueltig():
    firmen = lade_unternehmen(str(ROOT / "data" / "companies.csv"))
    erlaubt = _erlaubte_kategorien()
    assert len(firmen) >= 1
    for f in firmen:
        assert all(s in f for s in SPALTEN)
        assert f["groesse_klasse"] in GROESSEN
        assert f["kategorie"] and all(k in erlaubt for k in f["kategorie"])
        assert f["aktiv"] in ("ja", "nein")


def test_bom_wird_toleriert(tmp_path):
    p = tmp_path / "c.csv"
    p.write_text("name,kategorie\nA,Tech\n", encoding="utf-8-sig")
    firmen = lade_unternehmen(str(p))
    assert list(firmen[0])[0] == "name"
