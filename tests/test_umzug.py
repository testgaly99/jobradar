from scraper import db, umzug
from tests.fakedb import FakeDB


def stelle(id_, firma, status="offen", erst="2026-01-01"):
    return {"id": id_, "unternehmen": firma, "titel": "T", "ort": "Berlin", "remote": False, "url": "u",
            "beschreibung_kurz": "k", "erstmals_gesehen": erst, "zuletzt_gesehen": "2026-01-05", "status": status}


def test_umzug(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)
    fake.t["companies"]["A"] = {"name": "A"}
    fake.t["jobs"]["A:1"] = {"id": "A:1", "unternehmen": "A", "titel": "neu", "text": "x",
                             "erstmals_gesehen": "2026-03-01", "status": "offen"}
    fake.t["jobs"]["A:2"] = {"id": "A:2", "unternehmen": "A", "erstmals_gesehen": "2026-01-01", "status": "offen"}
    alt = {"A:1": stelle("A:1", "A"), "A:2": stelle("A:2", "A", erst="2026-02-01"),
           "A:3": stelle("A:3", "A"), "A:4": stelle("A:4", "A", status="geschlossen"),
           "B:1": stelle("B:1", "B")}
    assert umzug.umziehen(alt) == (1, 2, 1)
    j = fake.t["jobs"]
    assert j["A:1"]["erstmals_gesehen"] == "2026-01-01" and j["A:1"]["titel"] == "neu" and j["A:1"]["text"] == "x"
    assert j["A:2"]["erstmals_gesehen"] == "2026-01-01"  # der fruehere Wert bleibt
    assert j["A:3"]["status"] == "offen" and j["A:3"]["sichtbar"] is True
    assert j["A:4"] == {**j["A:4"], "status": "geschlossen", "sichtbar": False, "text": None}
    assert "B:1" not in j
    assert umzug.umziehen(alt) == (0, 0, 1)
