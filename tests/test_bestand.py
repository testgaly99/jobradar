from scraper.bestand import abgleichen, lade, speichere


def job(ext_id, titel="Dev", **kw):
    return {"ext_id": ext_id, "titel": titel, "ort": "Berlin", "remote": False,
            "url": f"https://x/{ext_id}", "beschreibung_kurz": "", **kw}


def test_neue_stelle():
    r = abgleichen({}, "acme", [job("1")], "2026-11-08")
    s = r["acme:1"]
    assert s["erstmals_gesehen"] == s["zuletzt_gesehen"] == "2026-11-08"
    assert s["status"] == "offen" and s["unternehmen"] == "acme" and s["id"] == "acme:1"
    assert "ext_id" not in s


def test_stelle_bleibt_offen():
    b = abgleichen({}, "acme", [job("1")], "2026-11-07")
    r = abgleichen(b, "acme", [job("1", titel="Neu")], "2026-11-08")
    s = r["acme:1"]
    assert (s["status"], s["titel"]) == ("offen", "Neu")
    assert (s["erstmals_gesehen"], s["zuletzt_gesehen"]) == ("2026-11-07", "2026-11-08")


def test_fehlende_wird_geschlossen():
    b = abgleichen({}, "acme", [job("1")], "2026-11-07")
    orig = {k: dict(v) for k, v in b.items()}
    r = abgleichen(b, "acme", [], "2026-11-08")
    assert r["acme:1"]["status"] == "geschlossen"
    assert r["acme:1"]["zuletzt_gesehen"] == "2026-11-07"
    assert b == orig  # Eingabe nicht mutiert
    r2 = abgleichen(r, "acme", [], "2026-11-09")
    assert r2 == r


def test_andere_firma_unberuehrt():
    b = abgleichen({}, "foo", [job("1")], "2026-11-07")
    r = abgleichen(b, "acme", [], "2026-11-08")
    assert r["foo:1"] == b["foo:1"]


def test_geschlossene_taucht_wieder_auf():
    b = abgleichen({}, "acme", [job("1")], "2026-11-07")
    b = abgleichen(b, "acme", [], "2026-11-08")
    r = abgleichen(b, "acme", [job("1")], "2026-11-09")
    s = r["acme:1"]
    assert s["status"] == "offen" and s["erstmals_gesehen"] == "2026-11-07"
    assert s["zuletzt_gesehen"] == "2026-11-09"


def test_speichern_und_laden(tmp_path):
    p = tmp_path / "bestand.json"
    assert lade(p) == {}
    b = abgleichen({}, "acme", [job("2", titel="Köln Ärzte"), job("1")], "2026-11-08")
    speichere(p, b)
    text = p.read_text(encoding="utf-8")
    assert "Köln Ärzte" in text and text.endswith("\n")
    assert lade(p) == b
    assert list(lade(p)) == ["acme:1", "acme:2"]
    assert [f.name for f in tmp_path.iterdir()] == ["bestand.json"]
