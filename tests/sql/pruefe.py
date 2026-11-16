"""Vorbereitete isolierte DB-Abnahme. Standard: nur Werkzeugvorcheck, keine Verbindung.

Einrichtung/Ausführung erst nach Freigabe; siehe tests/sql/README.md.
Keine Umgebungsdateien, frei wählbare Ziele, Proxys oder echten Schlüssel.
"""
import argparse
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
KENNUNG = "jobradar_ranking_test:nur-kuenstliche-daten"
# Öffentlich und nur für den Wegwerf-Testserver; niemals für ein echtes System verwenden.
TEST_SIGNATUR = "oeffentliche-kuenstliche-testsignatur-nur-lokal-2026"


def sql_aufruf(name, geerbt=None):
    if name not in {"vorpruefung.sql", "rankings.sql", "groesse.sql"}:
        raise ValueError("Nur die festen Abnahmeskripte, keine Migration/Fixture")
    geerbt = os.environ if geerbt is None else geerbt
    env = {k: geerbt[k] for k in ("PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP") if k in geerbt}
    env.update(PGOPTIONS="-c jobradar.offline_test=rankings", PGPASSFILE=os.devnull, PGSERVICEFILE=os.devnull)
    args = ["psql", "-X", "-w", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", "5433",
            "-U", "jobradar_test_admin", "-d", "jobradar_ranking_test", "-f", str(ROOT / "tests/sql" / name)]
    return args, env


def http_url(pfad, params):
    if not pfad.startswith("/") or pfad.startswith("//") or any(c in pfad for c in (":", "..", "\\", "\r", "\n", "?", "#")):
        raise ValueError("Nur feste relative API-Pfade erlaubt")
    return "http://127.0.0.1:3003" + pfad + ("?" + urlencode(params) if params else "")


class KeineWeiterleitung(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("HTTP-Weiterleitung im isolierten Test verweigert")


def test_token():
    def b64(data):
        return base64.urlsafe_b64encode(data).decode().rstrip("=")
    header = b64(b'{"alg":"HS256","typ":"JWT"}')
    claims = b64(json.dumps({"role": "authenticated", "sub": "00000000-0000-4000-8000-000000000001",
                            "exp": int(time.time()) + 600}).encode())
    text = header + "." + claims
    return text + "." + b64(hmac.new(TEST_SIGNATUR.encode(), text.encode(), hashlib.sha256).digest())


def http_anfrage(pfad, *, params=None, daten=None, gast=False, methode=None):
    headers = {"Accept": "application/json", "Prefer": "count=exact", "Content-Type": "application/json"}
    if not gast:
        headers["Authorization"] = "Bearer " + test_token()
    body = None if daten is None else json.dumps(daten).encode()
    req = Request(http_url(pfad, params or {}), data=body, headers=headers, method=methode)
    # Explizit kein System-/Umgebungsproxy und keine Redirects zu fremden Zielen.
    opener = build_opener(ProxyHandler({}), KeineWeiterleitung())
    try:
        response = opener.open(req, timeout=10)
    except HTTPError as error:
        response = error
    with response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise RuntimeError("Testantwort zu groß")
        return response.status, {k.lower(): v for k, v in response.headers.items()}, json.loads(raw)


def seiten(anfrage, pfad, params, gesamt, **kw):
    ids = []
    for offset in range(0, gesamt, 50):
        status, headers, daten = anfrage(pfad, params={**params, "offset": offset, "limit": 50}, **kw)
        assert status in (200, 206), "HTTP-Seitenstatus"
        assert headers.get("content-range", "").endswith("/" + str(gesamt)), "Exakte Gesamtzahl"
        assert isinstance(daten, list) and len(daten) == min(50, gesamt - offset), "Unvollständige Seite"
        ids.extend(row["id"] for row in daten)
    assert len(ids) == len(set(ids)) == gesamt, "Doppelte oder fehlende Stellen"
    return ids


def http_pruefen(anfrage=http_anfrage):
    status, _, kennung = anfrage("/rpc/offline_testkennung", gast=True)
    assert status == 200 and kennung == KENNUNG, "Isolierte Testkennung fehlt; Abbruch vor Datenabfragen"
    for pfad, daten in [("/ranking_listen", None), ("/rpc/ranking_katalog", {}),
                        ("/rpc/ranking_stellen", {"p_listen": ["http-a"]})]:
        status, _, _ = anfrage(pfad, daten=daten, gast=True)
        assert status in (401, 403), "Gast darf keine Rankings lesen"
    status, _, _ = anfrage("/jobs", params={"select": "text", "limit": 1}, gast=True)
    assert status in (401, 403), "Gast darf keinen Anzeigentext lesen"
    status, _, _ = anfrage("/ranking_listen", params={"id": "eq.http-a"},
                          daten={"name": "Unerlaubte Änderung"}, methode="PATCH")
    assert status == 403, "Angemeldeter Nutzer darf keine Rankings ändern"
    status, _, katalog = anfrage("/rpc/ranking_katalog", daten={})
    assert status == 200 and {r["id"]: r["anzahl"] for r in katalog} == {"http-a": 600, "http-b": 600}, "Katalogzahlen"
    rpc = "/rpc/ranking_stellen"
    auswahl = {"p_listen": ["http-a", "http-b"]}
    erwartet = [f"HTTP-Test {i:04d}:1" for i in range(1, 1006)]
    ranking = {"select": "id,companies", "order": "companies->groesse_rang.asc,erstmals_gesehen.desc,id.asc"}
    assert seiten(anfrage, rpc, ranking, 1005, daten=auswahl) == erwartet, "Globale Ranking-Größenfolge"
    standard = {"select": "id,erstmals_gesehen,companies!inner(groesse_klasse,kategorie,aktiv)",
                "status": "eq.offen", "sichtbar": "eq.true", "companies.aktiv": "eq.true",
                "order": "companies(groesse_rang).asc,erstmals_gesehen.desc,id.asc"}
    assert seiten(anfrage, "/jobs", standard, 1005, gast=True) == erwartet, "Globale Gast-Größenfolge"
    gefiltert = seiten(anfrage, rpc, {**ranking, "erfahrungslevel": "in.(Senior)", "staedte": "ov.{Berlin}"}, 502, daten=auswahl)
    assert gefiltert == erwartet[1::2], "Filter UND, Listen ODER ohne Duplikate"
    rang = seiten(anfrage, rpc, {"select": "id", "order": "rang.asc.nullslast,unternehmen.asc,id.asc"},
                  600, daten={"p_listen": ["http-a"]})
    assert rang == list(reversed(erwartet[:600])), "Globale Rangfolge"
    status, _, _ = anfrage(rpc, daten={"p_listen": ["nicht-vorhanden"]})
    assert status == 400, "Ungültige Liste muss fehlschlagen"
    print("PostgREST: Gast-/Schreibschutz, Katalog, Größen-/Rangfolge, Filter und alle Seiten bestanden.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sql", action="store_true", help="Nur eingerichtete künstliche Testdatenbank prüfen")
    parser.add_argument("--http", action="store_true", help="Nur eingerichteten künstlichen PostgREST prüfen")
    args = parser.parse_args(argv)
    if not args.sql and not args.http:
        fehlt = [name for name in ("psql", "postgrest") if shutil.which(name) is None]
        print("Verbindungsfreier Vorcheck: " + ("fehlt: " + ", ".join(fehlt) if fehlt else "Werkzeuge gefunden; Einrichtung noch nicht geprüft"))
        return 2 if fehlt else 0
    if args.sql:
        for name in ("vorpruefung.sql", "rankings.sql", "groesse.sql"):
            cmd, env = sql_aufruf(name)
            subprocess.run(cmd, env=env, cwd=ROOT, check=True, timeout=60)
    if args.http:
        http_pruefen()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
