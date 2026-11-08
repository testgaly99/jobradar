"""RLS-Test gegen das echte Supabase-Projekt. Start: py -m pytest -m supabase"""
import secrets
import time
from pathlib import Path

import pytest
import requests

pytestmark = pytest.mark.supabase


def _env():
    p = Path(__file__).resolve().parent.parent / ".env"
    out = {}
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            k, sep, v = line.partition("=")
            if sep and not line.lstrip().startswith("#"):
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


ENV = _env()
URL = ENV.get("SUPABASE_URL", "").rstrip("/")
SERVICE = ENV.get("SUPABASE_SERVICE_KEY", "")
ANON = ENV.get("SUPABASE_ANON_KEY", "")


def _h(key, token=None):
    return {"apikey": key, "Authorization": f"Bearer {token or key}"}


def _retry(fn, versuche=5, pause=3):
    """Cleanup ueberlebt kurze Netzabbrueche: nur bei ConnectionError wiederholen."""
    for i in range(versuche):
        try:
            return fn()
        except requests.ConnectionError:
            if i == versuche - 1:
                raise
            time.sleep(pause)


def _warn(what, r):
    if not r.ok:
        print(f"WARNUNG Cleanup {what}: HTTP {r.status_code}")


@pytest.fixture(scope="module")
def users():
    if not (URL and SERVICE and ANON):
        pytest.skip("SUPABASE_URL/SERVICE_KEY/ANON_KEY fehlen in .env")
    r = requests.get(f"{URL}/rest/v1/applications?limit=1", headers=_h(SERVICE), timeout=30)
    if r.status_code in (401, 403):
        pytest.fail("SUPABASE_SERVICE_KEY abgelehnt (falscher Key?)")
    if r.status_code == 404 or "PGRST205" in r.text or "42P01" in r.text:
        pytest.skip("Schema nicht angewendet (applications fehlt)")
    assert r.status_code == 200, f"Probe fehlgeschlagen: HTTP {r.status_code}"
    ids, sessions = [], []
    try:
        for _ in range(2):
            email, pw = f"rls-{secrets.token_hex(6)}@example.com", secrets.token_urlsafe(18)
            r = requests.post(f"{URL}/auth/v1/admin/users", headers=_h(SERVICE), timeout=30,
                              json={"email": email, "password": pw, "email_confirm": True})
            r.raise_for_status()
            uid = r.json()["id"]
            ids.append(uid)
            r = requests.post(f"{URL}/auth/v1/token?grant_type=password", headers=_h(ANON), timeout=30,
                              json={"email": email, "password": pw})
            if r.status_code in (401, 403):
                pytest.fail("Login fehlgeschlagen: SUPABASE_ANON_KEY (publishable key) pruefen")
            r.raise_for_status()
            sessions.append((uid, r.json()["access_token"]))
        yield sessions
    finally:
        # Datei zuerst (Nutzer-Loeschung kann an Storage-Objekten scheitern), dann Nutzer
        if ids:
            _warn("Datei", _retry(lambda: requests.delete(f"{URL}/storage/v1/object/dokumente/{ids[0]}/test.txt",
                                                            headers=_h(SERVICE), timeout=30)))
        for uid in ids:
            _warn("Nutzer", _retry(lambda: requests.delete(f"{URL}/auth/v1/admin/users/{uid}",
                                                            headers=_h(SERVICE), timeout=30)))


def test_rls_isolation(users):
    (a_id, a_tok), (b_id, b_tok) = users
    ha, hb = _h(ANON, a_tok), _h(ANON, b_tok)
    rest = f"{URL}/rest/v1"
    prefer = {"Prefer": "return=representation"}

    r = requests.post(f"{rest}/applications", headers={**ha, **prefer},
                      json={"firma": "Testfirma", "titel": "Tester"}, timeout=30)
    assert r.status_code == 201, r.text
    app_id = r.json()[0]["id"]
    r = requests.post(f"{rest}/interviews", headers={**ha, **prefer},
                      json={"application_id": app_id, "format": "video"}, timeout=30)
    assert r.status_code == 201, r.text

    r = requests.get(f"{rest}/applications", headers=hb, timeout=30)
    assert r.status_code == 200 and r.json() == []

    r = requests.patch(f"{rest}/applications?id=eq.{app_id}", headers={**hb, **prefer},
                       json={"titel": "gehackt"}, timeout=30)
    assert r.json() == []
    r = requests.get(f"{rest}/applications?id=eq.{app_id}", headers=ha, timeout=30)
    assert r.json()[0]["titel"] == "Tester"

    r = requests.post(f"{rest}/interviews", headers=hb,
                      json={"application_id": app_id, "format": "fremd"}, timeout=30)
    assert r.status_code in (401, 403), r.text

    # (a) Kind-UPDATE: B biegt eigenes Interview auf As Bewerbung um
    r = requests.post(f"{rest}/applications", headers={**hb, **prefer}, json={"firma": "B-Firma"}, timeout=30)
    assert r.status_code == 201, r.text
    b_app = r.json()[0]["id"]
    r = requests.post(f"{rest}/interviews", headers={**hb, **prefer},
                      json={"application_id": b_app}, timeout=30)
    assert r.status_code == 201, r.text
    b_iv = r.json()[0]["id"]
    r = requests.patch(f"{rest}/interviews?id=eq.{b_iv}", headers={**hb, **prefer},
                       json={"application_id": app_id}, timeout=30)
    assert 400 <= r.status_code < 500, r.text
    r = requests.get(f"{rest}/interviews?id=eq.{b_iv}&select=application_id", headers=_h(SERVICE), timeout=30)
    assert r.json()[0]["application_id"] == b_app

    # (b) Dokument-Fremdverweis
    r = requests.post(f"{rest}/documents", headers={**ha, **prefer},
                      json={"art": "cv", "name": "cv.pdf"}, timeout=30)
    assert r.status_code == 201, r.text
    a_doc = r.json()[0]["id"]
    r = requests.post(f"{rest}/applications", headers={**hb, **prefer},
                      json={"firma": "X", "cv_dokument_id": a_doc}, timeout=30)
    assert 400 <= r.status_code < 500, r.text

    # Storage
    path = f"{URL}/storage/v1/object/dokumente/{a_id}/test.txt"
    r = requests.post(path, headers={**ha, "Content-Type": "text/plain"}, data=b"hallo", timeout=30)
    assert r.status_code in (200, 201), r.text
    r = requests.get(path, headers=ha, timeout=30)
    assert r.content == b"hallo"
    r = requests.get(path, headers=hb, timeout=30)
    assert r.status_code in (400, 401, 403, 404)

    # (c) Listing fremder Ordner
    r = requests.post(f"{URL}/storage/v1/object/list/dokumente", headers=hb, timeout=30,
                      json={"prefix": f"{a_id}/"})
    assert r.status_code >= 400 or r.json() == [], "Listing zeigt fremde Dateien"

    # Anon darf jobs nicht lesen (revoke -> 401/403)
    r = requests.get(f"{rest}/jobs", headers=_h(ANON), timeout=30)
    assert r.status_code in (401, 403)
