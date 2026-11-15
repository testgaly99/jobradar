"""Vorhandene Python-Tests ohne Live-Zugriffe: py -B -m pruefe_offline.

Schützt vor versehentlichen Zugriffen der Tests, keine Sandbox für feindlichen
Python-/Native-Code. Schutz wird erst in main() für diesen Prozess aktiviert.
"""
import argparse
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
LIVE = ("test_rls.py", "test_konto_loeschen.py")
PROZESSEREIGNISSE = {
    "subprocess.Popen", "os.system", "os.exec", "os.posix_spawn", "os.spawn",
    "os.startfile", "os.startfile/2",
    "os.fork", "os.forkpty",
}


class OfflineZugriff(PermissionError):
    """Ein im Offline-Lauf unzulässiger Zugriff wurde vor Ausführung gestoppt."""


def pruefe_zugriff(ereignis, args):
    # Python meldet open vor dem Dateizugriff; Dateideskriptoren bleiben erlaubt.
    if ereignis == "open" and args and isinstance(args[0], (str, bytes, os.PathLike)):
        if ".env" in Path(os.fsdecode(args[0])).name.lower():
            raise OfflineZugriff("Umgebungsdatei im Offline-Test gesperrt")
    if ereignis.startswith("socket."):
        raise OfflineZugriff("Netzwerkzugriff im Offline-Test gesperrt")
    if ereignis in PROZESSEREIGNISSE:
        raise OfflineZugriff("Prozessstart im Offline-Test gesperrt")


class LiveImportSperre:
    def find_spec(self, fullname, path=None, target=None):
        if fullname.rsplit(".", 1)[-1].casefold() in {Path(name).stem for name in LIVE}:
            raise ImportError("Live-Testmodul im Offline-Lauf gesperrt")
        return None


def ist_live(pfad, root):
    if pfad.name in LIVE:
        return True
    for name in LIVE:
        try:
            if pfad.is_file() and pfad.samefile(root / "tests" / name):
                return True
        except OSError:
            pass
    return False


class Sammlung:
    def __init__(self, root):
        self.root = root.resolve()

    def pytest_ignore_collect(self, collection_path):
        pfad = Path(collection_path).resolve()
        return not pfad.is_relative_to(self.root / "tests") or ist_live(pfad, self.root)


def argumente(argv, root=ROOT):
    parser = argparse.ArgumentParser(description="Bestehende Tests ohne Live-Zugriffe ausführen")
    parser.add_argument("pfade", nargs="*", help="Testpfade unter tests/, optional mit ::Testname")
    parser.add_argument("-k", metavar="AUSDRUCK", help="Tests nach Namen auswählen")
    parser.add_argument("--collect-only", action="store_true", help="Nur Offline-Tests sammeln")
    auswahl = parser.parse_args(argv)
    root = root.resolve()
    pfade = []
    for eintrag in auswahl.pfade or ["tests"]:
        name, trenner, testname = eintrag.partition("::")
        try:
            pfad = (root / name).resolve()
            if (not pfad.is_relative_to(root / "tests") or not pfad.exists()
                    or ist_live(pfad, root)
                    or (pfad.is_file() and not (pfad.name.startswith("test_") and pfad.suffix == ".py"))):
                parser.error("Nur vorhandene Offline-Testpfade innerhalb tests/ sind erlaubt")
        except (OSError, ValueError, RuntimeError):
            parser.error("Testpfad konnte nicht sicher aufgelöst werden")
        pfade.append(str(pfad) + (trenner + testname if trenner else ""))
    args = ["-q", "-p", "no:cacheprovider", "-c", str(root / "pytest.ini"),
            "--rootdir", str(root), "-o", "addopts="]
    args.extend(f"--ignore={root / 'tests' / name}" for name in LIVE)
    args.extend(pfade)
    if auswahl.k is not None:
        args.extend(["-k", auswahl.k])
    if auswahl.collect_only:
        args.append("--collect-only")
    return args


def testumgebung():
    for name in ("PYTEST_ADDOPTS", "PYTEST_PLUGINS"):
        os.environ.pop(name, None)
    os.environ["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] = "1"


def main(argv=None):
    # Erst Auswahl prüfen: ungültige Optionen/Pfade importieren noch kein pytest.
    args = argumente(sys.argv[1:] if argv is None else argv)
    testumgebung()
    sys.dont_write_bytecode = True
    sys.addaudithook(pruefe_zugriff)
    sys.meta_path.insert(0, LiveImportSperre())

    import requests
    from scraper import db

    def kein_http(*args, **kwargs):
        raise OfflineZugriff("HTTP-Aufruf im Offline-Test gesperrt")

    requests.sessions.Session.request = kein_http
    db._lade_env = lambda *args, **kwargs: None

    import pytest

    print("Offline-Prüfung: Live-Module, Umgebungsdateien, Netzwerk und Prozessstarts gesperrt.")
    return int(pytest.main(args, plugins=[Sammlung(ROOT)]))


if __name__ == "__main__":
    # CLI und Tests verwenden dieselben Klassen, auch beim Start mit `-m`.
    import pruefe_offline

    raise SystemExit(pruefe_offline.main())
