import pytest
import copy

from scraper import db, run
from tests.fakedb import FakeDB


def firma(name, typ="fake", aktiv="ja"):
    return {"name": name, "careers_url": "", "ats_typ": typ, "ats_id": name, "aktiv": aktiv,
            "kategorie": ["Tech"], "notiz": "geheim", "groesse_klasse": "<50", "mitarbeitende_ca": "",
            "hauptsitz": ""}


def stelle(i, titel="Engineer", ort="Berlin"):
    return {"ext_id": i, "titel": titel, "ort": ort, "remote": False, "url": f"http://x/{i}",
            "beschreibung_kurz": "", "text": "t", "abteilung": "", "arbeitsmodell": "", "vertragsart": ""}


@pytest.fixture
def aufbau(tmp_path, monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)  # Tests rufen Groq nie wirklich

    def setze(firmen, adapter):
        monkeypatch.setattr(run, "lade_unternehmen", lambda *a: firmen)
        monkeypatch.setattr(run, "ADAPTER", adapter)
        return tmp_path, fake.t
    return setze


def test_fehler_bricht_nicht_ab(aufbau):
    def a(_, **k):
        raise RuntimeError("kaputt")
    d, t = aufbau([firma("A", "a"), firma("B", "b")], {"a": a, "b": lambda _, **k: [stelle("1")]})
    bericht = run.lauf("2026-11-07", d)
    assert "B:1" in t["jobs"] and set(t["companies"]) == {"A", "B"}
    fa, fb = bericht["firmen"]
    assert fa["fehler"] == "Abruf: RuntimeError" and fb["fehler"] == ""
    assert "RuntimeError" in (d / "bericht.md").read_text(encoding="utf-8")
    assert t["laeufe"] == [{"datum": "2026-11-07", "bericht": bericht}]


def test_fehler_schliesst_nichts(aufbau):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1")]})
    run.lauf("2026-11-06", d)

    def kaputt(_, **k):
        raise RuntimeError("x")
    run.ADAPTER["a"] = kaputt
    run.lauf("2026-11-07", d)
    assert t["jobs"]["A:1"]["status"] == "offen"


def test_stelle_hat_neue_felder_und_bericht(aufbau):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [
        stelle("1", "Senior Engineer", "Munich; Berlin"), stelle("2"), stelle("3", "Werkstudent Foo")]})
    run.lauf("2026-11-06", d)
    s = t["jobs"]["A:1"]
    assert (s["erfahrungslevel"], s["staedte"]) == ("Senior", ["München", "Berlin"])
    assert s["land"] == "Deutschland"
    assert s["steckbrief"]["erfahrung_jahre"] is None and s["steckbrief"]["sprachen"] == []
    run.ADAPTER["a"] = lambda _, **k: [stelle("2")]
    f = run.lauf("2026-11-07", d)["firmen"][0]
    assert (f["gefunden"], f["gefiltert"], f["neu"], f["geschlossen"]) == (1, 0, 0, 1)
    assert t["jobs"]["A:1"]["status"] == "geschlossen" and "A:3" not in t["jobs"]
    assert t["companies"]["A"]["kategorie"] == ["Tech"] and not (d / "daten.json").exists()


def test_unbekannter_adapter_ist_fehler(aufbau):
    d, _ = aufbau([firma("A", "nix")], {})
    assert run.lauf("2026-11-07", d)["firmen"][0]["fehler"] == "Adapterwahl: LookupError"


def test_filterfehler_bricht_nicht_ab(aufbau):
    d, t = aufbau([firma("A", "a"), firma("B", "b")],
                  {"a": lambda _, **k: [stelle("1")], "b": lambda _, **k: [stelle("1")]})
    run.lauf("2026-11-06", d)
    run.ADAPTER["a"] = lambda _, **k: [{"ext_id": "2", "ort": "Berlin", "remote": False}]  # titel fehlt
    run.ADAPTER["b"] = lambda _, **k: [stelle("1"), stelle("9")]
    bericht = run.lauf("2026-11-07", d)
    assert bericht["firmen"][0]["fehler"] == "Antwortprüfung: alle 1 Stellen übersprungen (Format geändert?)"
    assert bericht["firmen"][0]["uebersprungen"] == {"ohne Titel": 1}
    assert t["jobs"]["A:1"]["status"] == "offen" and "A:2" not in t["jobs"]  # nichts geschlossen
    assert "B:9" in t["jobs"]


def test_inaktive_firma_wird_nicht_abgerufen(aufbau):
    d, t = aufbau([firma("A", "a"), firma("B", "b", aktiv="nein")],
                  {"a": lambda _, **k: [stelle("1")], "b": lambda _, **k: [stelle("1")]})
    bericht = run.lauf("2026-11-06", d)
    assert [f["name"] for f in bericht["firmen"]] == ["A"] and "B:1" not in t["jobs"]
    assert t["companies"]["B"]["aktiv"] is False


def test_steckbrief_fehler_kippt_firma_nicht(aufbau, monkeypatch):
    def kaputt(*a):
        raise ValueError("x")
    monkeypatch.setattr(run, "steckbrief", kaputt)
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1")]})
    assert run.lauf("2026-11-07", d)["firmen"][0]["fehler"] == ""
    assert t["jobs"]["A:1"]["steckbrief"] is None


def test_firma_reicht_bekannte_durch(aufbau, monkeypatch):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1")]})
    run.lauf("2026-11-06", d)
    gesehen = []

    def adapter(_, bekannte=frozenset()):
        gesehen.append(bekannte)
        return [{"ext_id": "1", "unveraendert": True}, stelle("2")]
    run.ADAPTER["a"] = adapter
    geprueft = []
    orig = run.ist_relevant
    monkeypatch.setattr(run, "ist_relevant", lambda *a: geprueft.append(a[0]) or orig(*a))
    f = run.lauf("2026-11-07", d)["firmen"][0]
    assert gesehen == [frozenset({"1"})] and len(geprueft) == 1
    assert (f["gefunden"], f["neu"], f["geschlossen"], f["fehler"]) == (2, 1, 0, "")
    assert t["jobs"]["A:1"]["zuletzt_gesehen"] == "2026-11-07" and "A:2" in t["jobs"]


def test_logo_einmal_je_firma_ohne_logo(aufbau, monkeypatch, capsys):
    f = {**firma("A", "a"), "careers_url": "https://a.de/jobs"}
    d, t = aufbau([f, {**firma("B", "a"), "careers_url": "https://b.de"}], {"a": lambda _, **k: []})
    abrufe = []
    monkeypatch.setattr(run, "hole_logo", lambda u: abrufe.append(u) or ("https://a.de/i.png" if "a.de" in u else None))
    run.lauf("2026-11-07", d)
    assert t["companies"]["A"]["logo_url"] == "https://a.de/i.png" and "logo_url" not in t["companies"]["B"]
    run.lauf("2026-11-08", d)  # A hat Logo, B wird erneut versucht
    assert abrufe == ["https://a.de/jobs", "https://b.de", "https://b.de"]


def test_logo_spalte_fehlt_oder_fehler_kippt_lauf_nicht(aufbau, monkeypatch, capsys):
    f = {**firma("A", "a"), "careers_url": "https://a.de"}
    d, t = aufbau([f], {"a": lambda _, **k: []})
    abrufe = []
    monkeypatch.setattr(run, "hole_logo", lambda u: abrufe.append(u))
    monkeypatch.setattr(db, "_req", fake := FakeDB())
    fake.ohne_logo_spalte = True
    run.lauf("2026-11-07", d)
    assert abrufe == [] and "Migration 006" in capsys.readouterr().out
    fake.ohne_logo_spalte = False
    monkeypatch.setattr(run, "hole_logo", lambda u: 1 / 0)
    assert run.lauf("2026-11-08", d)["firmen"][0]["fehler"] == ""
    assert "Logos fehlgeschlagen" in capsys.readouterr().out


def test_lauf_ohne_key_blendet_trotzdem_aus(aufbau, monkeypatch):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: []})
    t["jobs"]["X:1"] = {"id": "X:1", "unternehmen": "X", "status": "offen", "sichtbar": True, "studium": "nein"}
    monkeypatch.setattr(run.ki, "auswerten", lambda *a, **k: 1 / 0)
    bericht = run.lauf("2026-11-07", d)
    assert t["jobs"]["X:1"]["sichtbar"] is False
    assert "GROQ_API_KEY" in bericht["ki"]["hinweis"] and bericht["ki"]["ausgeblendet"] == 1
    assert "KI:" in (d / "bericht.md").read_text(encoding="utf-8")


def test_ausblenden_vor_der_ki(aufbau, monkeypatch):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: []})
    monkeypatch.setenv("GROQ_API_KEY", "k")
    reihe = []
    monkeypatch.setattr(db, "nein_ausblenden", lambda: reihe.append("aus") or 0)
    monkeypatch.setattr(run.ki, "auswerten", lambda *a, **k: reihe.append("auswerten") or {})
    monkeypatch.setattr(run.ki, "nachfuellen", lambda **kw: reihe.append("nachfuellen") or 0)
    run.lauf("2026-11-07", d)
    assert reihe == ["aus", "auswerten", "nachfuellen"]


def test_lauf_mit_key_wertet_aus(aufbau, monkeypatch):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: []})
    monkeypatch.setenv("GROQ_API_KEY", "k")
    fristen = []
    monkeypatch.setattr(run.ki, "auswerten", lambda heute, **k: fristen.append(("auswerten", k.get("frist_s"))) or {"ausgewertet": 2, "fehler": 0, "wartend": 5})
    monkeypatch.setattr(run.ki, "nachfuellen", lambda **k: fristen.append(("nachfuellen", k.get("frist_s"))) or 1)
    ki_ = run.lauf("2026-11-07", d)["ki"]
    assert fristen == [("auswerten", 3600), ("nachfuellen", 3600)]  # vorhandenes Schrittbudget auch beim Nachfüllen
    assert ki_ == {"ausgewertet": 2, "fehler": 0, "wartend": 5, "nachgefuellt": 1, "ausgeblendet": 0}
    assert "ausgewertet: 2" in (d / "bericht.md").read_text(encoding="utf-8")


def test_lauf_ohne_ki_spalten_wertet_nicht_aus(aufbau, monkeypatch):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: []})
    monkeypatch.setenv("GROQ_API_KEY", "k")
    monkeypatch.setattr(db, "_req", fake := FakeDB())
    fake.ohne_ki_spalten = True
    monkeypatch.setattr(run.ki, "auswerten", lambda *a, **k: 1 / 0)
    assert "009" in run.lauf("2026-11-07", d)["ki"]["hinweis"]


def test_ki_fehler_kippt_lauf_nicht(aufbau, monkeypatch, capsys):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1")]})
    monkeypatch.setenv("GROQ_API_KEY", "k")

    def kaputt(*a, **k):
        raise RuntimeError("boom")
    monkeypatch.setattr(run.ki, "auswerten", kaputt)
    monkeypatch.setattr(run.ki, "nachfuellen", kaputt)
    monkeypatch.setattr(db, "nein_ausblenden", kaputt)
    bericht = run.lauf("2026-11-07", d)
    assert bericht["firmen"][0]["fehler"] == "" and "A:1" in t["jobs"] and t["laeufe"]
    ausgabe = capsys.readouterr().out
    assert ausgabe.count("RuntimeError") == 3 and "boom" not in ausgabe
    for schritt in ("ausblenden", "auswerten", "nachfuellen"):
        assert f"KI {schritt} fehlgeschlagen: RuntimeError" in ausgabe


@pytest.mark.parametrize("antwort", [None, {}, "keine Liste"])
def test_kaputte_gesamtantwort_veraendert_keine_vorhandenen_stellen(aufbau, antwort):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1"), stelle("2")]})
    run.lauf("2026-11-06", d)
    vorher = copy.deepcopy(t["jobs"])
    run.ADAPTER["a"] = lambda _, **k: antwort
    bericht = run.lauf("2026-11-07", d)["firmen"][0]
    assert bericht["fehler"].startswith("Antwortprüfung: ValueError")
    assert (bericht["neu"], bericht["geschlossen"]) == (0, 0)
    assert t["jobs"] == vorher


@pytest.mark.parametrize("kaputt,grund", [
    (None, "kein Objekt"), ([], "kein Objekt"), ({}, "ungültige ID"),
    (stelle("9", titel=""), "ohne Titel"), (stelle("9", titel=" \t "), "ohne Titel"), (stelle("9", titel=42), "ohne Titel"),
    ({**stelle("9"), "url": None}, "ohne URL"), ({**stelle("9"), "url": " "}, "ohne URL"),
    (stelle(""), "ungültige ID"), (stelle(42), "ungültige ID"), ({**stelle("9"), "unveraendert": "ja"}, "ungültige Markierung"),
    ({"ext_id": "unbekannt", "unveraendert": True}, "unbekannte ID"),
    (stelle("3"), "doppelte ID"), ({"uebersprungen": "isListed ungültig"}, "isListed ungültig"),
    ({"uebersprungen": "https://geheim.invalid/roh"}, "ungültige Meldung"), ({"uebersprungen": ["x"]}, "ungültige Meldung"),
])
def test_kaputte_einzelstelle_wird_uebersprungen_und_verhindert_schliessen(aufbau, kaputt, grund):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1"), stelle("2")]})
    run.lauf("2026-11-06", d)
    vorher = copy.deepcopy(t["jobs"])
    run.ADAPTER["a"] = lambda _, **k: [stelle("3"), kaputt]
    bericht = run.lauf("2026-11-07", d)["firmen"][0]
    assert bericht["fehler"] == "" and bericht["uebersprungen"] == {grund: 1}
    assert (bericht["neu"], bericht["geschlossen"]) == (1, 0)
    assert t["jobs"]["A:3"]["status"] == "offen"
    assert {k: v for k, v in t["jobs"].items() if k != "A:3"} == vorher  # A:1/A:2 bleiben offen und unverändert
    assert f"A: 1 Stellen übersprungen ({grund}: 1), nichts geschlossen" in (d / "bericht.md").read_text(encoding="utf-8")


def test_gueltige_stellen_trotz_kaputter_stelle_uebernommen(aufbau):
    d, t = aufbau([firma("A", "a"), firma("B", "b")],
                  {"a": lambda _, **k: [stelle("1")], "b": lambda _, **k: [stelle("1")]})
    run.lauf("2026-11-06", d)
    run.ADAPTER["a"] = lambda _, **k: [stelle("3"), {**stelle("4"), "url": ""}, stelle("5", titel=""), stelle("3")]
    run.ADAPTER["b"] = lambda _, **k: [stelle("1"), stelle("2")]
    bericht = run.lauf("2026-11-07", d)
    a = bericht["firmen"][0]
    assert a["fehler"] == "" and a["uebersprungen"] == {"ohne URL": 1, "ohne Titel": 1, "doppelte ID": 1}
    assert "A:3" in t["jobs"] and "A:4" not in t["jobs"] and t["jobs"]["A:1"]["status"] == "offen"
    assert "A: 3 Stellen übersprungen (ohne URL: 1, ohne Titel: 1, doppelte ID: 1), nichts geschlossen" in (d / "bericht.md").read_text(encoding="utf-8")
    assert "B:2" in t["jobs"] and not bericht["firmen"][1]["fehler"]


@pytest.mark.parametrize("antwort", [[{}], [None, stelle("")], [{"uebersprungen": "doppelte ID"}] * 3])
def test_alle_stellen_uebersprungen_ist_firmenfehler(aufbau, antwort):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1")]})
    run.lauf("2026-11-06", d)
    vorher = copy.deepcopy(t["jobs"])
    run.ADAPTER["a"] = lambda _, **k: antwort
    bericht = run.lauf("2026-11-07", d)["firmen"][0]
    assert bericht["fehler"] == f"Antwortprüfung: alle {len(antwort)} Stellen übersprungen (Format geändert?)"
    assert (bericht["neu"], bericht["geschlossen"]) == (0, 0)
    assert t["jobs"] == vorher


def test_sauberer_lauf_schliesst_weiterhin(aufbau):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1"), stelle("2")]})
    run.lauf("2026-11-06", d)
    run.ADAPTER["a"] = lambda _, **k: [stelle("1"), {}]
    run.lauf("2026-11-07", d)
    assert t["jobs"]["A:2"]["status"] == "offen"
    run.ADAPTER["a"] = lambda _, **k: [stelle("1")]
    bericht = run.lauf("2026-11-08", d)["firmen"][0]
    assert bericht["uebersprungen"] == {} and bericht["geschlossen"] == 1
    assert t["jobs"]["A:2"]["status"] == "geschlossen"


def test_echte_leere_liste_bleibt_erfolgreich_mit_bisheriger_schliesslogik(aufbau):
    d, t = aufbau([firma("A", "a")], {"a": lambda _, **k: [stelle("1")]})
    run.lauf("2026-11-06", d)
    run.ADAPTER["a"] = lambda _, **k: []
    bericht = run.lauf("2026-11-07", d)["firmen"][0]
    assert bericht["fehler"] == "" and bericht["gefunden"] == 0 and bericht["geschlossen"] == 1
    assert t["jobs"]["A:1"]["status"] == "geschlossen"
