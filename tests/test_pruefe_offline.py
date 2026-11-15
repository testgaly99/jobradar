"""Schutztests ohne echte Netzwerk-, Prozess- oder Umgebungsdateizugriffe."""
import os
import sys

import pytest

import pruefe_offline as offline


@pytest.fixture
def projekt(tmp_path):
    (tmp_path / "tests").mkdir()
    for name in ["test_ok.py", "test_rls.py", "test_konto_loeschen.py"]:
        (tmp_path / "tests" / name).write_text("raise AssertionError('Nicht importieren')", encoding="utf-8")
    return tmp_path


def test_gezielte_auswahl_erhaelt_alle_schutzeinstellungen(projekt):
    args = offline.argumente(["tests/test_ok.py::test_eins", "-k", "eins", "--collect-only"], projekt)
    assert f"--ignore={projekt / 'tests/test_rls.py'}" in args
    assert f"--ignore={projekt / 'tests/test_konto_loeschen.py'}" in args
    assert "no:cacheprovider" in args
    assert "addopts=" in args
    assert str(projekt / "pytest.ini") in args
    assert args[-4:] == [str(projekt / "tests/test_ok.py") + "::test_eins", "-k", "eins", "--collect-only"]


def test_standard_prueft_tests_auch_bei_filterargument(projekt):
    args = offline.argumente(["-k", "eins"], projekt)
    assert str(projekt / "tests") in args
    assert f"--ignore={projekt / 'tests/test_rls.py'}" in args


@pytest.mark.parametrize("auswahl", [
    "tests/test_rls.py", "tests/test_rls.py::test_eins",
    "tests/test_konto_loeschen.py", "tests/../tests/test_rls.py",
    "../ausserhalb.py", ".", "tests/fehlt.py",
])
def test_live_und_ungeeignete_pfade_werden_vor_sammlung_abgelehnt(projekt, auswahl):
    with pytest.raises(SystemExit) as fehler:
        offline.argumente([auswahl], projekt)
    assert fehler.value.code == 2


def test_absolute_live_auswahl_wird_abgelehnt(projekt):
    with pytest.raises(SystemExit):
        offline.argumente([str(projekt / "tests/test_rls.py")], projekt)


def test_hardlink_auf_live_datei_wird_ebenfalls_abgelehnt(projekt):
    alias = projekt / "tests/test_alias.py"
    os.link(projekt / "tests/test_rls.py", alias)
    with pytest.raises(SystemExit):
        offline.argumente([str(alias)], projekt)
    assert offline.Sammlung(projekt).pytest_ignore_collect(alias)


@pytest.mark.parametrize("args", [["-p", "fremdes_plugin"], ["-o", "addopts=live"], ["-c", "andere.ini"]])
def test_beliebige_pytest_optionen_werden_nicht_durchgereicht(projekt, args):
    with pytest.raises(SystemExit):
        offline.argumente(args, projekt)


def test_sammlung_ignoriert_live_dateien_und_pfade_ausserhalb(projekt):
    sammlung = offline.Sammlung(projekt)
    assert sammlung.pytest_ignore_collect(projekt / "tests/test_rls.py")
    assert sammlung.pytest_ignore_collect(projekt / "tests/test_konto_loeschen.py")
    assert sammlung.pytest_ignore_collect(projekt.parent / "test_fremd.py")
    assert not sammlung.pytest_ignore_collect(projekt / "tests/test_ok.py")


@pytest.mark.parametrize("name", ["test_rls", "tests.test_rls", "tests.test_konto_loeschen", "tests.TEST_RLS", "tests.TEST_KONTO_LOESCHEN"])
def test_indirekter_live_import_wird_vor_dateizugriff_abgelehnt(name):
    with pytest.raises(ImportError, match="Live-Test"):
        offline.LiveImportSperre().find_spec(name)
    assert offline.LiveImportSperre().find_spec("tests.test_rankings") is None


@pytest.mark.parametrize("name", ["synthetisch.env", "ordner/.env.local", b"ordner/.env.test"])
def test_geschuetzte_dateinamen_werden_ohne_oeffnen_geprueft(name):
    with pytest.raises(offline.OfflineZugriff, match="Umgebungsdatei"):
        offline.pruefe_zugriff("open", (name, "r", 0))
    assert offline.pruefe_zugriff("open", ("fixture.json", "r", 0)) is None
    assert offline.pruefe_zugriff("open", (1, "w", 0)) is None


@pytest.mark.parametrize("ereignis", ["socket.__new__", "socket.getaddrinfo", "socket.connect", "socket.sendto", "subprocess.Popen", "os.system", "os.exec", "os.posix_spawn", "os.spawn", "os.startfile", "os.startfile/2", "os.fork", "os.forkpty"])
def test_netz_und_prozessereignisse_ohne_echte_aktion_gesperrt(ereignis):
    with pytest.raises(offline.OfflineZugriff):
        offline.pruefe_zugriff(ereignis, ())


def test_geerbte_pytest_plugins_und_optionen_werden_deaktiviert(monkeypatch):
    monkeypatch.setenv("PYTEST_ADDOPTS", "--irgendein-argument")
    monkeypatch.setenv("PYTEST_PLUGINS", "synthetisches_plugin")
    monkeypatch.setenv("PYTEST_DISABLE_PLUGIN_AUTOLOAD", "0")
    offline.testumgebung()
    assert "PYTEST_ADDOPTS" not in os.environ
    assert "PYTEST_PLUGINS" not in os.environ
    assert os.environ["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] == "1"


def test_tatsaechlich_aktiver_runner_blockiert_audit_ereignisse():
    if not any(isinstance(finder, offline.LiveImportSperre) for finder in sys.meta_path):
        pytest.skip("Aktive Sperren werden beim Lauf über pruefe_offline geprüft")
    # sys.audit meldet nur ein künstliches Ereignis; es wird keine Datei geöffnet
    # und weder ein Socket noch ein Kindprozess gestartet.
    for ereignis, args in [("open", ("synthetisch.env", "r", 0)), ("socket.connect", ()), ("subprocess.Popen", ())]:
        with pytest.raises(offline.OfflineZugriff):
            sys.audit(ereignis, *args)
