"""RLS-Test gegen das echte Supabase-Projekt. Start: py -m pytest -m supabase"""
import secrets
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


@pytest.fixture(scope="module")
def users():
    if not (URL and SERVICE and ANON):
        pytest.skip("SUPABASE_URL/SERVICE_KEY/ANON_KEY fehlen in .env")
    r = requests.get(f"{URL}/rest/v1/applications?limit=1", headers=_h(SERVICE), timeout=30)
    if r.status_code != 200:
        pytest.skip("Schema nicht angewendet (applications fehlt)")
    ids, sessions = [], []
    try:
        for _ in range(2):
            email, pw = f"rls-{secrets.token_hex(6)}@example.com", secrets.token_urlsafe(18)
            r = requests.post(f"{URL}/auth/v1/admin/users", headers=_h(SERVICE), timeout=30,
                              json={"email": email, "password": pw, "email_confirm": True})
            r.raise_for_status()
            uid = r.json()["id"]
            ids.append(uid)
            r = requests.post(f"{URL}/auth/v1/token?grant_type=password", headers=_h(ANON),
                              json={"email": email, "password": pw}, timeout=30)
            r.raise_for_status()
            sessions.append((uid, r.json()["access_token"]))
        yield sessions
    finally:
        for uid in ids:
            requests.delete(f"{URL}/auth/v1/admin/users/{uid}", headers=_h(SERVICE), timeout=30)


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

    path = f"{URL}/storage/v1/object/dokumente/{a_id}/test.txt"
    r = requests.post(path, headers={**ha, "Content-Type": "text/plain"}, data=b"hallo", timeout=30)
    assert r.status_code in (200, 201), r.text
    assert requests.get(path, headers=ha, timeout=30).content == b"hallo"
    assert requests.get(path, headers=hb, timeout=30).status_code in (400, 401, 403, 404)

    r = requests.get(f"{rest}/jobs", headers=_h(ANON), timeout=30)
    assert r.status_code != 200 or r.json() == []
