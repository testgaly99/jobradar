"""Nur künstliche Antworten: Schutz des vorbereiteten DB-Prüfeinstiegs."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest

spec = importlib.util.spec_from_file_location("sql_pruefung", Path(__file__).parent / "sql" / "pruefe.py")
pruefung = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pruefung)


@pytest.fixture(params=[0, 1, 2], ids=["normal", "optimiert", "doppelt-optimiert"])
def pruefer(request):
    # Gleicher Quellcode wie beim CLI, aber ohne Prozess-/Netzstart unter -O/-OO.
    pfad = Path(__file__).parent / "sql" / "pruefe.py"
    namespace = {"__name__": "sql_test", "__file__": str(pfad)}
    exec(compile(pfad.read_text(encoding="utf-8"), str(pfad), "exec", optimize=request.param), namespace)
    return SimpleNamespace(**namespace)


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


def test_falsche_kennung_stoppt_vor_weiteren_abfragen(pruefer):
    calls = []
    def anfrage(pfad, **kw):
        calls.append(pfad)
        return 200, {}, "fremde Datenbank"
    with pytest.raises(AssertionError, match="Testkennung"):
        pruefer.http_pruefen(anfrage)
    assert calls == ["/rpc/offline_testkennung"]


def test_pagination_prueft_auch_letzte_seite_und_echte_gesamtzahl(pruefer):
    calls = []
    def anfrage(pfad, **kw):
        start = kw["params"]["offset"]
        calls.append(start)
        rows = [{"id": str(i)} for i in range(start, min(start + 50, 103))]
        return 200, {"content-range": f"{start}-{start + len(rows) - 1}/103"}, rows
    assert pruefer.seiten(anfrage, "/jobs", {}, 103) == [str(i) for i in range(103)]
    assert calls == [0, 50, 100]


@pytest.mark.parametrize("fehler", ["count", "doppelt", "fehlt", "status"])
def test_pagination_erkennt_falsche_count_doppelte_oder_fehlende_zeilen(pruefer, fehler):
    def anfrage(pfad, **kw):
        start = kw["params"]["offset"]
        ids = range(start, min(start + 50, 51))
        rows = [{"id": "0" if fehler == "doppelt" else str(i)} for i in ids]
        if fehler == "fehlt":
            rows = rows[:-1]
        return (500 if fehler == "status" else 200), {"content-range": f"0-49/{52 if fehler == 'count' else 51}"}, rows
    with pytest.raises(AssertionError):
        pruefer.seiten(anfrage, "/jobs", {}, 51)


def kuenstliche_api(kennung, fehler=None):
    """SQL-Fixture als künstliche API; wendet die angeforderte Reihenfolge wirklich an."""
    calls = []

    def anfrage(pfad, *, params=None, daten=None, gast=False, methode=None):
        params = params or {}
        calls.append((pfad, params.copy(), daten, gast, methode))
        if pfad == "/rpc/offline_testkennung":
            return 200, {}, kennung
        if gast and (pfad.startswith("/rpc/ranking") or pfad == "/ranking_listen" or params.get("select") == "text"):
            return (200 if fehler == "gastzugriff" else 403), {}, {}
        if methode == "PATCH":
            return (204 if fehler == "schreibzugriff" else 403), {}, {}
        if pfad == "/rpc/ranking_katalog":
            return 200, {}, [{"id": "http-a", "anzahl": 600}, {"id": "http-b", "anzahl": 600}]
        if daten and daten.get("p_listen") == ["nicht-vorhanden"]:
            return 400, {}, {}
        ids = list(range(1, 1006))
        if daten and daten["p_listen"] == ["http-a"]:
            ids = ids[:600]
        if params.get("erfahrungslevel"):
            ids = [i for i in ids if i % 2 == 0]
        order = params["order"]
        if order.startswith("rang."):
            ids.sort(key=lambda i: (1006 - i, i))
        elif order.startswith("companies"):
            if ((fehler == "ignoriert-ranking" and pfad.startswith("/rpc/"))
                    or (fehler == "ignoriert-gast" and gast)):
                ids.sort()  # Simuliert API, die Größen-ORDER ignoriert.
            elif fehler == "datum-statt-groesse":
                ids.sort(key=lambda i: (i % 3, i))
            else:
                ids.sort(key=lambda i: (
                    -((i - 1) % 5) if fehler == "groesse-absteigend" else (i - 1) % 5,
                    -(i % 3) if fehler == "datum-aufsteigend" else i % 3,
                    -i if fehler == "id-absteigend" else i,
                ))
        else:
            raise AssertionError("Nicht vorbereitete Sortierung")
        total, start = len(ids), params["offset"]
        if fehler == "doppelte-seite" and start == 50:
            start = 0
        rows = [{"id": f"HTTP-Test {i:04d}:1"} for i in ids[start:start + params["limit"]]]
        return 200, {"content-range": f"{start}-{start + len(rows) - 1}/{total + (1 if fehler == 'count' else 0)}"}, rows

    return anfrage, calls


def test_http_abnahme_fuehrt_alle_seiten_und_filter_auch_optimiert_aus(pruefer):
    anfrage, calls = kuenstliche_api(pruefer.KENNUNG)
    pruefer.http_pruefen(anfrage)
    for pfad, gast, gefiltert, gesamt in [
        ("/rpc/ranking_stellen", False, False, 1005),
        ("/jobs", True, False, 1005),
        ("/rpc/ranking_stellen", False, True, 502),
    ]:
        seiten = [p["offset"] for route, p, _, g, _ in calls
                  if route == pfad and g == gast and p.get("order", "").startswith("companies")
                  and bool(p.get("erfahrungslevel")) == gefiltert]
        assert seiten == list(range(0, gesamt, 50))
    assert calls[-1][2] == {"p_listen": ["nicht-vorhanden"]}


@pytest.mark.parametrize("fehler,hinweis", [
    ("ignoriert-ranking", "Ranking-Größenfolge"),
    ("ignoriert-gast", "Gast-Größenfolge"),
    ("datum-statt-groesse", "Ranking-Größenfolge"),
    ("groesse-absteigend", "Ranking-Größenfolge"),
    ("datum-aufsteigend", "Ranking-Größenfolge"),
    ("id-absteigend", "Ranking-Größenfolge"),
    ("gastzugriff", "Gast darf keine Rankings"),
    ("schreibzugriff", "Nutzer darf keine Rankings ändern"),
    ("count", "Gesamtzahl"),
    ("doppelte-seite", "Doppelte oder fehlende Stellen"),
])
def test_http_abnahme_erkennt_fehler_auch_optimiert(pruefer, fehler, hinweis):
    anfrage, _ = kuenstliche_api(pruefer.KENNUNG, fehler)
    with pytest.raises(AssertionError, match=hinweis):
        pruefer.http_pruefen(anfrage)


def test_vorcheck_oeffnet_keine_verbindung(monkeypatch, capsys):
    monkeypatch.setattr(pruefung.shutil, "which", lambda name: None)
    monkeypatch.setattr(pruefung, "http_pruefen", lambda *a: pytest.fail("HTTP im Vorcheck"))
    monkeypatch.setattr(pruefung.subprocess, "run", lambda *a, **kw: pytest.fail("SQL im Vorcheck"))
    assert pruefung.main([]) == 2
    assert "fehlt" in capsys.readouterr().out
