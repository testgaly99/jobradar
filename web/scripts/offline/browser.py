"""Wiederholbare Chrome-Prüfung am isolierten Server, nur künstliche Daten."""
import base64
import json
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3002"

def b64(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")

def session(context):
    now = int(time.time())
    claims = {"sub": "00000000-0000-4000-8000-000000000001", "aud": "authenticated", "role": "authenticated",
              "email": "offline@example.com", "iat": now, "exp": now + 3600, "iss": "https://offline.example.invalid/auth/v1"}
    token = b64({"alg": "HS256", "typ": "JWT"}) + "." + b64(claims) + "." + b64("offline")
    value = {"access_token": token, "refresh_token": "offline", "token_type": "bearer", "expires_in": 3600,
             "expires_at": now + 3600, "user": {"id": claims["sub"], "email": claims["email"]}}
    context.add_cookies([{"name": "sb-offline-auth-token", "value": "base64-" + b64(value), "url": BASE}])

def context(browser, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(BASE + "/") else r.abort())
    return ctx

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    try:
        for width in [1280, 390]:
            guest = context(browser, width)
            page = guest.new_page()
            page.goto(BASE + "/stellen?liste=test-a")
            expect(page.locator("#stellenliste > li")).to_have_count(3)
            expect(page.locator('input[name="liste"]')).to_have_count(0)
            guest.close()
            user = context(browser, width)
            session(user)
            page = user.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(BASE + "/stellen")
            expect(page.locator("#stellenliste > li")).to_have_count(3)
            if width < 900:
                page.locator('details.filterblock > summary').click()
            page.locator('input[name="liste"][value="test-a"]').check()
            expect(page.locator("#stellenliste > li")).to_have_count(2)
            page.get_by_role("link", name="Datenanalyse", exact=True).click()
            expect(page.get_by_role("heading", name="Datenanalyse", exact=True)).to_be_visible()
            expect(page.locator('section.steckbrief').get_by_text("Senior (ab 0 Jahren)", exact=True)).to_be_visible()
            page.goto(BASE + "/stellen?liste=veraltet")
            expect(page.get_by_role("status")).to_contain_text("nicht mehr verfügbar")
            expect(page.locator("#stellenliste > li")).to_have_count(0)
            assert not errors, errors
            user.close()
            print(f"OK {width}px: Gast, Filter, Detailseite, ungültige Auswahl")
        records = [json.loads(line) for line in Path(sys.argv[1]).read_text().splitlines()]
        assert not any("ranking_" in r["pfad"] and r["mode"] == "gast" for r in records)
    finally:
        browser.close()
