import hashlib

import pytest

from scraper import db
from tests.fakedb import FakeDB


@pytest.fixture
def fake(monkeypatch):
    f = FakeDB()
    monkeypatch.setattr(db, "_req", f)
    return f


def job(ext_id, titel="Dev", text="Text", **kw):
    return {"ext_id": ext_id, "titel": titel, "ort": "Berlin", "remote": False, "url": f"https://x/{ext_id}",
            "beschreibung_kurz": "", "text": text, "abteilung": "Eng", "arbeitsmodell": "", "vertragsart": "",
            "erfahrungslevel": "Mid", "staedte": ["Berlin"], **kw}


def test_neue_stelle(fake):
    assert db.schreibe("acme", [job("1")], "2026-11-08") == (1, 0)
    s = fake.t["jobs"]["acme:1"]
    assert s["erstmals_gesehen"] == s["zuletzt_gesehen"] == "2026-11-08"
    assert (s["status"], s["sichtbar"], s["unternehmen"]) == ("offen", True, "acme")
    assert s["text_hash"] == hashlib.sha256(b"Text").hexdigest() and "ext_id" not in s
    assert list(db.lade_offene("acme")) == ["acme:1"]


def test_bleibt_offen(fake):
    db.schreibe("acme", [job("1")], "2026-11-07")
    assert db.schreibe("acme", [job("1", titel="Neu")], "2026-11-08") == (0, 0)
    s = fake.t["jobs"]["acme:1"]
    assert (s["status"], s["titel"]) == ("offen", "Neu")
    assert (s["erstmals_gesehen"], s["zuletzt_gesehen"]) == ("2026-11-07", "2026-11-08")


def test_fehlt_ohne_bewerbung(fake):
    db.schreibe("acme", [job("1")], "2026-11-07")
    assert db.schreibe("acme", [], "2026-11-08") == (0, 1)
    s = fake.t["jobs"]["acme:1"]
    assert (s["status"], s["text"], s["sichtbar"]) == ("geschlossen", None, False)
    assert s["zuletzt_gesehen"] == "2026-11-07"
    assert db.schreibe("acme", [], "2026-11-09") == (0, 0)  # nicht erneut geschlossen


def test_fehlt_mit_bewerbung(fake):
    db.schreibe("acme", [job("1"), job("2")], "2026-11-07")
    fake.t["applications"].append("acme:1")
    db.schreibe("acme", [], "2026-11-08")
    s, t = fake.t["jobs"]["acme:1"], fake.t["jobs"]["acme:2"]
    assert (s["status"], s["text"], s["sichtbar"]) == ("geschlossen", "Text", True)
    assert (t["status"], t["text"], t["sichtbar"]) == ("geschlossen", None, False)


def test_taucht_wieder_auf(fake):
    db.schreibe("acme", [job("1")], "2026-11-07")
    db.schreibe("acme", [], "2026-11-08")
    assert db.schreibe("acme", [job("1", text="Neuer Text")], "2026-11-09") == (0, 0)  # nicht "neu"
    s = fake.t["jobs"]["acme:1"]
    assert (s["status"], s["sichtbar"], s["text"]) == ("offen", True, "Neuer Text")
    assert (s["erstmals_gesehen"], s["zuletzt_gesehen"]) == ("2026-11-07", "2026-11-09")


def test_hash_aendert_sich_nur_bei_neuem_text(fake):
    db.schreibe("acme", [job("1")], "2026-11-07")
    h = fake.t["jobs"]["acme:1"]["text_hash"]
    db.schreibe("acme", [job("1", titel="Anders")], "2026-11-08")
    assert fake.t["jobs"]["acme:1"]["text_hash"] == h
    db.schreibe("acme", [job("1", text="Anderer Text")], "2026-11-09")
    assert fake.t["jobs"]["acme:1"]["text_hash"] != h


def test_andere_firma_unberuehrt(fake):
    db.schreibe("foo", [job("1")], "2026-11-07")
    vorher = dict(fake.t["jobs"]["foo:1"])
    db.schreibe("acme", [], "2026-11-08")
    assert fake.t["jobs"]["foo:1"] == vorher


def test_sync_companies(fake):
    f = {"name": "Neu", "careers_url": "u", "ats_typ": "ashby", "ats_id": "n", "mitarbeitende_ca": "900",
         "groesse_klasse": "250-999", "kategorie": ["A", "B"], "hauptsitz": "Berlin", "aktiv": "ja", "notiz": "x"}
    db.sync_companies([f, {**f, "name": "Zwei", "mitarbeitende_ca": "", "aktiv": "nein"}])
    assert fake.t["companies"]["Neu"] == {
        "name": "Neu", "careers_url": "u", "ats_typ": "ashby", "ats_id": "n", "mitarbeitende_ca": 900,
        "groesse_klasse": "250-999", "kategorie": ["A", "B"], "hauptsitz": "Berlin", "aktiv": True}
    assert fake.t["companies"]["Zwei"]["mitarbeitende_ca"] is None and fake.t["companies"]["Zwei"]["aktiv"] is False


def test_batches(fake, monkeypatch):
    monkeypatch.setattr(db, "BATCH", 2)
    aufrufe = []
    monkeypatch.setattr(db, "_req", lambda *a, **k: aufrufe.append(k.get("json")) or fake(*a, **k))
    db.schreibe("acme", [job(str(i)) for i in range(5)], "2026-11-08")
    assert [len(a) for a in aufrufe if isinstance(a, list)] == [2, 2, 1]


def test_paging_liest_alle_und_schliesst_nichts(fake, monkeypatch):
    jobs = [job(str(i)) for i in range(5)]
    db.schreibe("acme", jobs, "2026-11-07")
    monkeypatch.setattr(db, "SEITE", 2)
    assert len(db.lade_offene("acme")) == 5
    assert db.schreibe("acme", jobs, "2026-11-08") == (0, 0)
    assert {z["status"] for z in fake.t["jobs"].values()} == {"offen"}


def test_fehlgeschlagener_upsert_schliesst_nichts(fake, monkeypatch):
    db.schreibe("acme", [job("1"), job("2")], "2026-11-07")
    aufrufe = []

    def kaputt(method, pfad, **kw):
        aufrufe.append(method)
        if method == "POST":
            raise RuntimeError("Supabase POST jobs: 500")
        return fake(method, pfad, **kw)
    monkeypatch.setattr(db, "_req", kaputt)
    with pytest.raises(RuntimeError):
        db.schreibe("acme", [job("3")], "2026-11-08")
    assert "PATCH" not in aufrufe
    assert {z["status"] for z in fake.t["jobs"].values()} == {"offen"}


def test_bewerbungspruefung_in_chunks(fake, monkeypatch):
    # Ids mit Komma und Anfuehrungszeichen pruefen das Quoting mit
    db.schreibe("acme", [job(i) for i in ("1", "2", "3", 'a,"b', "5")], "2026-11-07")
    fake.t["applications"].append('acme:a,"b')
    monkeypatch.setattr(db, "CHUNK", 2)
    assert db.schreibe("acme", [], "2026-11-08") == (0, 5)
    for i, z in fake.t["jobs"].items():
        assert (z["text"], z["sichtbar"]) == (("Text", True) if i == 'acme:a,"b' else (None, False))
        assert z["status"] == "geschlossen"


def test_spalten_fehlen_wird_uebersprungen(fake, capsys):
    fake.ohne_spalten = True
    db._spalten = None
    db.schreibe("acme", [job("1", abschnitte=[{"titel": "A", "punkte": ["x"]}], land="Deutschland")], "2026-11-01")
    db.schreibe("acme", [job("2")], "2026-11-01")
    assert "abschnitte" not in fake.t["jobs"]["acme:1"] and fake.pruefungen == 1  # nur einmal geprueft
    assert capsys.readouterr().out.count("Migration 005") == 1


def test_spalten_da_werden_geschrieben(fake):
    db._spalten = None
    db.schreibe("acme", [job("1", abschnitte=[{"titel": "A", "punkte": ["x"]}], land="Deutschland")], "2026-11-01")
    assert fake.t["jobs"]["acme:1"]["abschnitte"] == [{"titel": "A", "punkte": ["x"]}]
    assert fake.t["jobs"]["acme:1"]["land"] == "Deutschland"


def test_snapshot_nachruesten_normal(fake, capsys):
    db.snapshot_nachruesten()
    assert fake.nachgeruestet == 1
    assert "nachgerüstet: 3" in capsys.readouterr().out


def test_snapshot_nachruesten_funktion_fehlt(fake, capsys):
    fake.ohne_funktion = True
    db.snapshot_nachruesten()  # wirft nicht
    assert "Migration 005 offen" in capsys.readouterr().out


def test_snapshot_nachruesten_anderer_fehler_bricht_nicht(monkeypatch, capsys):
    def kaputt(*a, **k):
        raise RuntimeError("Supabase POST rpc/snapshot_nachruesten: 500 boom")
    monkeypatch.setattr(db, "_req", kaputt)
    db.snapshot_nachruesten()
    assert "fehlgeschlagen" in capsys.readouterr().out
