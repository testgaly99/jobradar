"""Live-Test: loescheNutzerMit (web/lib/nutzer-loeschen-kern.ts) per Node-Skript. Start: py -m pytest -m supabase"""
import os
import secrets
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
import requests

from tests.test_rls import ENV, SERVICE, URL, _h, _warn

pytestmark = pytest.mark.supabase
ROOT = Path(__file__).resolve().parent.parent
N_DATEIEN = 101


def _liste(uid):
    """Alle Objekte unter <uid>/ (seitenweise)."""
    out, offset = [], 0
    while True:
        r = requests.post(f"{URL}/storage/v1/object/list/dokumente", headers=_h(SERVICE), timeout=30,
                          json={"prefix": f"{uid}/", "limit": 100, "offset": offset})
        r.raise_for_status()
        out += r.json()
        if len(r.json()) < 100:
            return out
        offset += 100


def test_konto_loeschen_komplett():
    if not (URL and SERVICE):
        pytest.skip("SUPABASE_URL/SERVICE_KEY fehlen in .env")
    r = requests.get(f"{URL}/rest/v1/applications?limit=1", headers=_h(SERVICE), timeout=30)
    if r.status_code == 404 or "PGRST205" in r.text:
        pytest.skip("Schema nicht angewendet")
    uid = None
    try:
        r = requests.post(f"{URL}/auth/v1/admin/users", headers=_h(SERVICE), timeout=30,
                          json={"email": f"loeschtest-{secrets.token_hex(6)}@example.com",
                                "password": secrets.token_urlsafe(18), "email_confirm": True})
        r.raise_for_status()
        uid = r.json()["id"]
        rest, prefer = f"{URL}/rest/v1", {"Prefer": "return=representation"}
        h = {**_h(SERVICE), **prefer}
        # service key: owner_id explizit, weil auth.uid() leer ist
        app = requests.post(f"{rest}/applications", headers=h, timeout=30,
                            json={"owner_id": uid, "firma": "Testfirma", "titel": "T"})
        assert app.status_code == 201, app.text
        app_id = app.json()[0]["id"]
        for tabelle, body in [("contacts", {"name": "K"}), ("interviews", {"application_id": app_id}),
                              ("documents", {"art": "cv", "name": "cv.pdf"})]:
            r = requests.post(f"{rest}/{tabelle}", headers=h, json={"owner_id": uid, **body}, timeout=30)
            assert r.status_code == 201, r.text

        def hoch(i):
            return requests.post(f"{URL}/storage/v1/object/dokumente/{uid}/d{i:03}.txt", timeout=60,
                                 headers={**_h(SERVICE), "Content-Type": "text/plain"}, data=b"x").status_code
        with ThreadPoolExecutor(8) as ex:
            assert set(ex.map(hoch, range(N_DATEIEN))) == {200}
        assert len(_liste(uid)) == N_DATEIEN

        p = subprocess.run(["node", str(ROOT / "tests" / "loeschen_live.mts"), uid], cwd=ROOT, timeout=180,
                           capture_output=True, text=True,
                           env={**os.environ, "SUPABASE_URL": URL, "SUPABASE_SERVICE_KEY": SERVICE})
        assert p.returncode == 0, p.stderr[-1500:]

        for t in ("applications", "contacts", "interviews", "documents"):
            r = requests.get(f"{rest}/{t}?owner_id=eq.{uid}&select=id", headers=_h(SERVICE), timeout=30)
            assert r.json() == [], t
        assert _liste(uid) == []
        assert requests.get(f"{URL}/auth/v1/admin/users/{uid}", headers=_h(SERVICE), timeout=30).status_code == 404
    finally:
        if uid:
            try:
                for o in _liste(uid):
                    _warn("Datei", requests.delete(f"{URL}/storage/v1/object/dokumente/{uid}/{o['name']}",
                                                   headers=_h(SERVICE), timeout=30))
            except Exception as e:  # Cleanup darf die eigentliche Meldung nicht verdecken
                print("WARNUNG Cleanup Dateien:", e)
            try:
                _warn("Nutzer", requests.delete(f"{URL}/auth/v1/admin/users/{uid}", headers=_h(SERVICE), timeout=30))
            except Exception as e:
                print("WARNUNG Cleanup Nutzer:", e)
