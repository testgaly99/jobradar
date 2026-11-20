"""Bewerbungssystem (ATS) einer Firma aus einem Karriere-Link erkennen (Phase 4b).

Reine Textprüfung: kein Abruf, keine DNS-Abfrage, nichts wird gespeichert. Erkannt werden nur
Greenhouse, Ashby und Personio mit direktem URL-Muster (Plan docs/plans/2026-11-15-firmenportal-erkennung.md).
Ein Treffer ist nur ein Kandidat: Er beweist weder die Firma noch, dass das Board existiert.
"""
from dataclasses import dataclass
import re
from urllib.parse import urlsplit

MAX_LAENGE = 4096
_BOARD = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,99}")
_LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")
_KODIERT_UNSICHER = re.compile(r"%(?:2e|2f|5c|[01][0-9a-f]|7f)", re.I)
_NUMMER = re.compile(r"[0-9]+")
_GREENHOUSE = {"boards.greenhouse.io", "job-boards.greenhouse.io"}
_PERSONIO = ".jobs.personio.de"


@dataclass(frozen=True)
class Kandidat:
    ats_typ: str
    ats_id: str
    herkunft: str = "direktes URL-Muster"


@dataclass(frozen=True)
class Ergebnis:
    status: str  # "erkannt" | "nicht_erkannt" | "ungueltig"
    grund: str
    kandidat: Kandidat | None = None


def _ungueltig(grund):
    return Ergebnis("ungueltig", grund)


def _nicht(grund):
    return Ergebnis("nicht_erkannt", grund)


def _board(typ, segmente, erlaubt):
    """Erstes Pfadsegment als Boardkennung, wenn der Rest einem erlaubten Muster folgt."""
    if not segmente or not segmente[0]:
        return _nicht(f"{typ}-Link ohne Boardkennung")
    if not _BOARD.fullmatch(segmente[0]) or not erlaubt(segmente[1:]):
        return _nicht(f"{typ}-Link mit nicht unterstütztem Pfad oder Kennung")
    return Ergebnis("erkannt", f"{typ}-Board aus dem Link", Kandidat(typ.lower(), segmente[0]))


def erkenne_portal(url: str) -> Ergebnis:
    if not isinstance(url, str):
        return _ungueltig("Kein Text")
    s = url.strip()
    if not s:
        return _ungueltig("Leere Eingabe")
    if len(s) > MAX_LAENGE:
        return _ungueltig("Link zu lang")
    # Nur ASCII: verhindert Doppelgänger-Zeichen im Host (z. B. Kelvin-Zeichen statt K).
    if not s.isascii() or any(ord(z) < 0x21 or ord(z) == 0x7F for z in s) or "\\" in s:
        return _ungueltig("Sonder-, Leer-, Steuerzeichen oder Backslash im Link")
    if not s.lower().startswith("https://"):
        return _ungueltig("Nur vollständige https-Links")
    try:
        teile = urlsplit(s)
        port = teile.port
    except ValueError:
        return _ungueltig("Ungültiger Host oder Port")
    if "@" in teile.netloc:
        return _ungueltig("Link mit Zugangsdaten")
    if port not in (None, 443):
        return _ungueltig("Nur Standardport 443")
    host = (teile.hostname or "").lower()
    if not host:
        return _ungueltig("Link ohne Host")
    pfad = teile.path
    segmente = pfad.strip("/").split("/") if pfad.strip("/") else []
    if any(x in (".", "..") for x in pfad.split("/")) or _KODIERT_UNSICHER.search(pfad):
        return _ungueltig("Unsicherer Pfad (Punkte oder kodierte Trennzeichen)")

    if host in _GREENHOUSE:
        return _board("Greenhouse", segmente, lambda r: r == [] or (len(r) == 2 and r[0] == "jobs" and _NUMMER.fullmatch(r[1])))
    if host == "jobs.ashbyhq.com":
        return _board("Ashby", segmente, lambda r: len(r) <= 1 or (len(r) == 2 and r[1] == "application"))
    if host.endswith(_PERSONIO):
        kennung = host[: -len(_PERSONIO)]
        if not _LABEL.fullmatch(kennung):
            return _nicht("Personio-Host ohne gültige Kennung")
        if not (segmente == [] or (len(segmente) == 2 and segmente[0] == "job" and _NUMMER.fullmatch(segmente[1]))):
            return _nicht("Personio-Link mit nicht unterstütztem Pfad")
        return Ergebnis("erkannt", "Personio-Kennung aus dem Host", Kandidat("personio", kennung))
    return _nicht("Kein unterstütztes Bewerbungssystem (nur Greenhouse, Ashby, Personio mit direktem Link)")
