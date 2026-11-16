from types import SimpleNamespace
import json
import pytest
import requests

from scraper import db, run, ki, http
from scraper.fehler import kurzfehler

MARKER = "synthetischer-vertraulicher-testwert"


@pytest.mark.parametrize("status,code", [(400, "42703"), (404, "PGRST202"), (401, "PGRST301"), (500, "XX000")])
def test_db_fehler_enthaelt_status_code_aber_keine_rohantwort(monkeypatch, status, code):
    monkeypatch.setattr(db, "_lade_env", lambda: None)
    monkeypatch.setenv("SUPABASE_URL", "https://datenbank.example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", MARKER)

    class Antwort:
        ok = False
        status_code = status
        headers = {"Authorization": MARKER}
        def json(self):
            return {"code": code, "message": MARKER, "details": MARKER, "hint": MARKER}
        @property
        def text(self):
            pytest.fail("Rohtext darf für diese öffentliche Fehlermeldung nicht gelesen werden")
    monkeypatch.setattr(requests, "request", lambda *a, **k: Antwort())
    with pytest.raises(RuntimeError) as exc:
        db._req("GET", "jobs", params={"unternehmen": MARKER})
    meldung = kurzfehler(exc.value)
    assert str(status) in meldung and code in meldung and "GET jobs" in meldung
    assert MARKER not in meldung and MARKER not in str(exc.value)


@pytest.mark.parametrize("jsonwert", [None, [], {"code": MARKER, "message": MARKER}])
def test_ungeeignete_fehlerkoerper_geben_keine_rohwerte_aus(monkeypatch, jsonwert):
    monkeypatch.setattr(db, "_lade_env", lambda: None)
    monkeypatch.setenv("SUPABASE_URL", "https://datenbank.example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", MARKER)
    monkeypatch.setattr(requests, "request", lambda *a, **k: SimpleNamespace(ok=False, status_code=500, text=MARKER, json=lambda: jsonwert))
    with pytest.raises(RuntimeError) as exc:
        db._req("POST", "jobs?geheim=" + MARKER)
    assert MARKER not in str(exc.value)
    assert "500" in str(exc.value)


def test_transportfehler_verraet_weder_url_noch_beliebige_ausnahmedetails(monkeypatch):
    monkeypatch.setattr(db, "_lade_env", lambda: None)
    monkeypatch.setenv("SUPABASE_URL", "https://datenbank.example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", MARKER)
    def kaputt(*a, **k):
        raise requests.Timeout("https://example.invalid/?token=" + MARKER)
    monkeypatch.setattr(requests, "request", kaputt)
    with pytest.raises(RuntimeError) as exc:
        db._req("PATCH", "jobs")
    assert "Timeout" in str(exc.value) and "PATCH jobs" in str(exc.value)
    assert MARKER not in str(exc.value) and exc.value.__suppress_context__


def test_firmenbericht_erhaelt_klasse_httpstatus_schritt_aber_keinen_rohtext(monkeypatch):
    def kaputt(*a, **k):
        raise requests.HTTPError(MARKER, response=SimpleNamespace(status_code=503))
    monkeypatch.setattr(db, "lade_offene", lambda _: [])
    monkeypatch.setattr(run, "ADAPTER", {"synthetisch": kaputt})
    zeile = run._firma({"name": "Testfirma", "ats_typ": "synthetisch", "ats_id": "test"}, "2026-11-16")
    bericht = {"stand": "2026-11-16", "firmen": [zeile]}
    assert "HTTPError" in zeile["fehler"] and "503" in zeile["fehler"] and "Abruf" in zeile["fehler"]
    assert MARKER not in json.dumps(bericht) + run._markdown(bericht)


def test_oeffentliche_hinweise_enthalten_keine_ausnahmetexte(monkeypatch, capsys):
    def kaputt(*a, **k):
        raise RuntimeError(MARKER)
    monkeypatch.setattr(db, "firmen_ohne_logo", kaputt)
    run._logos([])
    monkeypatch.setattr(db, "ki_spalten_da", kaputt)
    run._ki("2026-11-16")
    monkeypatch.setattr(db, "_req", kaputt)
    db.snapshot_nachruesten()
    ausgabe = capsys.readouterr().out
    assert MARKER not in ausgabe
    assert "Logos" in ausgabe and "KI-Schritt" in ausgabe and "snapshot_nachruesten" in ausgabe
    assert ausgabe.count("RuntimeError") == 3


def test_ki_stopphinweise_behalten_status_ohne_rohe_antwort(monkeypatch, capsys):
    def kaputt(*a, **k):
        raise ki.GroqWeg(MARKER, 503)
    monkeypatch.setattr(db, "ki_kandidaten", lambda: [{"id": "test:1", "text_hash": "h", "ki_hash": None, "ki_modell": None, "erstmals_gesehen": "2026-11-16"}])
    monkeypatch.setattr(db, "lade_anzeige", lambda _: ("Künstlicher Text", []))
    ki.auswerten("2026-11-16", frage=kaputt)
    monkeypatch.setattr(db, "bewerbungen_ohne_firma", lambda: [{"id": "test", "snapshot_text": "Künstlich"}])
    ki.nachfuellen(frage_ft=kaputt)
    ausgabe = capsys.readouterr().out
    assert MARKER not in ausgabe and ausgabe.count("503") == 2 and ausgabe.count("GroqWeg") == 2


@pytest.mark.parametrize("ok,status", [(False, 502), (True, 200)])
def test_nicht_json_antwort_bleibt_bereinigt(monkeypatch, ok, status):
    monkeypatch.setattr(db, "_lade_env", lambda: None)
    monkeypatch.setenv("SUPABASE_URL", "https://datenbank.example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", MARKER)
    def kaputt():
        raise ValueError(MARKER)
    monkeypatch.setattr(requests, "request", lambda *a, **k: SimpleNamespace(ok=ok, status_code=status, text=MARKER, json=kaputt))
    with pytest.raises(RuntimeError) as exc:
        db._req("GET", "jobs")
    assert MARKER not in str(exc.value) and str(status) in str(exc.value)


def test_bekannte_ki_codes_und_status_in_ursachenkette_bleiben_ohne_rohtext():
    e = ki.GroqWeg(MARKER, 400, "model_decommissioned")
    assert kurzfehler(e) == "GroqWeg: HTTP 400: model_decommissioned"
    assert MARKER not in kurzfehler(ki.GroqWeg(MARKER, 500, MARKER))
    try:
        try:
            raise requests.HTTPError(MARKER, response=SimpleNamespace(status_code=503))
        except requests.HTTPError as ursache:
            raise RuntimeError(MARKER) from ursache
    except RuntimeError as fehler:
        assert kurzfehler(fehler) == "RuntimeError: Ursache HTTPError: HTTP 503"


def test_bereinigte_datenbankfehler_erhalten_migrations_fallbacks(monkeypatch, capsys):
    monkeypatch.setattr(db, "_lade_env", lambda: None)
    monkeypatch.setenv("SUPABASE_URL", "https://datenbank.example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", MARKER)
    monkeypatch.setattr(db, "_spalten", None)
    monkeypatch.setattr(requests, "request", lambda *a, **k: SimpleNamespace(ok=False, status_code=400, json=lambda: {"code": "42703", "message": MARKER}))
    assert db._spalten_da() is False and db.ki_spalten_da() is False and db.firmen_ohne_logo() == set()
    monkeypatch.setattr(requests, "request", lambda *a, **k: SimpleNamespace(ok=False, status_code=404, json=lambda: {"code": "PGRST202", "message": MARKER}))
    db.snapshot_nachruesten()
    ausgabe = capsys.readouterr().out
    assert "Migration 005" in ausgabe and "Migration 006" in ausgabe and "Migration 009" in ausgabe
    assert MARKER not in ausgabe


def test_steckbrief_warnung_bleibt_bereinigt_ohne_firmenabbruch(monkeypatch, capsys):
    def kaputt(*a, **k):
        raise ValueError(MARKER)
    monkeypatch.setattr(db, "lade_offene", lambda _: [])
    monkeypatch.setattr(db, "schreibe", lambda *a: (0, 0))
    monkeypatch.setattr(run, "steckbrief", kaputt)
    monkeypatch.setattr(run, "ADAPTER", {"synthetisch": lambda *a, **k: [{"ext_id": "1", "titel": "Engineer", "url": "https://example.invalid", "ort": "Berlin", "remote": False, "text": "Künstlich"}]})
    bericht = run._firma({"name": "Testfirma", "ats_typ": "synthetisch", "ats_id": "test"}, "2026-11-16")
    assert not bericht["fehler"]
    ausgabe = capsys.readouterr().out
    assert MARKER not in ausgabe and "ValueError" in ausgabe and "Steckbrief" in ausgabe


def test_robots_fehler_behaelt_httpstatus_ohne_urspruengliche_adresse(monkeypatch):
    monkeypatch.setattr(http, "_robots", {})
    monkeypatch.setattr(http, "_get", lambda *a: SimpleNamespace(status_code=503))
    with pytest.raises(http.RobotsNichtErreichbar) as exc:
        http.hole("https://example.invalid/" + MARKER)
    assert kurzfehler(exc.value) == "RobotsNichtErreichbar: HTTP 503"
