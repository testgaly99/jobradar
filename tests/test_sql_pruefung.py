"""Nur künstliche Antworten: Schutz des vorbereiteten DB-Prüfeinstiegs."""
import importlib.util
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location("sql_pruefung", Path(__file__).parent / "sql" / "pruefe.py")
pruefung = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pruefung)


def test_psql_nutzt_nur_festes_lokales_ziel_und_keine_geerbten_zugangsdaten():
    args, env = pruefung.sql_aufruf("rankings.sql", {"PATH": "werkzeuge", "PGHOST": "fremd", "PGPASSWORD": "synthetisch", "PGSERVICE": "live", "NODE_OPTIONS": "fremd"})
    assert args[:3] == ["psql", "-X", "-w"]
    assert args[args.index("-h") + 1] == "127.0.0.1"
    assert args[args.index("-p") + 1] == "5433"
    assert args[args.index("-d") + 1] == "jobradar_ranking_test"
    assert env["PATH"] == "werkzeuge"
    assert not {"PGHOST", "PGPASSWORD", "PGSERVICE", "NODE_OPTIONS"} & env.keys()
    assert env["PGOPTIONS"] == "-c jobradar.offline_test=rankings"
    assert env["PGPASSFILE"] == pruefung.os.devnull


@pytest.mark.parametrize("name", ["../rankings.sql", "011_globale_groesse.sql", "http_daten.sql", "fremd.sql"])
def test_sql_laesst_weder_migration_noch_beliebige_datei_zu(name):
    with pytest.raises(ValueError):
        pruefung.sql_aufruf(name, {})


@pytest.mark.parametrize("pfad", ["https://fremd.invalid", "//fremd.invalid", "/../auth", "/jobs\nX: wert"])
def test_http_pfad_kann_ziel_nicht_aendern(pfad):
    with pytest.raises(ValueError):
        pruefung.http_url(pfad, {})


def test_weiterleitungen_werden_nicht_verfolgt():
    with pytest.raises(RuntimeError, match="Weiterleitung"):
        pruefung.KeineWeiterleitung().redirect_request(None, None, 302, "test", {}, "https://fremd.invalid")


def test_falsche_kennung_stoppt_vor_weiteren_abfragen():
    calls = []
    def anfrage(pfad, **kw):
        calls.append(pfad)
        return 200, {}, "fremde Datenbank"
    with pytest.raises(AssertionError, match="Testkennung"):
        pruefung.http_pruefen(anfrage)
    assert calls == ["/rpc/offline_testkennung"]


def test_pagination_prueft_auch_letzte_seite_und_echte_gesamtzahl():
    calls = []
    def anfrage(pfad, **kw):
        start = kw["params"]["offset"]
        calls.append(start)
        rows = [{"id": str(i)} for i in range(start, min(start + 50, 103))]
        return 200, {"content-range": f"{start}-{start + len(rows) - 1}/103"}, rows
    assert pruefung.seiten(anfrage, "/jobs", {}, 103) == [str(i) for i in range(103)]
    assert calls == [0, 50, 100]


@pytest.mark.parametrize("fehler", ["count", "doppelt", "fehlt", "status"])
def test_pagination_erkennt_falsche_count_doppelte_oder_fehlende_zeilen(fehler):
    def anfrage(pfad, **kw):
        start = kw["params"]["offset"]
        ids = range(start, min(start + 50, 51))
        rows = [{"id": "0" if fehler == "doppelt" else str(i)} for i in ids]
        if fehler == "fehlt":
            rows = rows[:-1]
        return (500 if fehler == "status" else 200), {"content-range": f"0-49/{52 if fehler == 'count' else 51}"}, rows
    with pytest.raises(AssertionError):
        pruefung.seiten(anfrage, "/jobs", {}, 51)


def test_vorcheck_oeffnet_keine_verbindung(monkeypatch, capsys):
    monkeypatch.setattr(pruefung.shutil, "which", lambda name: None)
    monkeypatch.setattr(pruefung, "http_pruefen", lambda *a: pytest.fail("HTTP im Vorcheck"))
    monkeypatch.setattr(pruefung.subprocess, "run", lambda *a, **kw: pytest.fail("SQL im Vorcheck"))
    assert pruefung.main([]) == 2
    assert "fehlt" in capsys.readouterr().out
