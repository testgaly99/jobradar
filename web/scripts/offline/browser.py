"""Wiederholbare Chrome-Prüfung am isolierten Server, nur künstliche Daten."""
import base64
import json
import sys
import time
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from persoenlich import pruefe_persoenlich

BASE = "http://localhost:3002"
LOG = Path(sys.argv[1])
STARTZEILE = len(LOG.read_text().splitlines()) if LOG.exists() else 0

def b64(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")

def session(context, mode="normal"):
    now = int(time.time())
    uid = str(uuid.uuid5(uuid.NAMESPACE_URL, "offline:" + mode)) if mode.startswith(("tracker-", "dokument-", "export-", "konto-", "import-")) else "00000000-0000-4000-8000-000000000001"
    email = "offline-admin@example.invalid" if mode.startswith("konto-admin-") else "offline@example.invalid"
    claims = {"sub": uid, "aud": "authenticated", "role": "authenticated",
              "email": email, "mode": mode, "iat": now, "exp": now + 3600, "iss": "https://offline.example.invalid/auth/v1"}
    context.offline_claims = claims
    token = b64({"alg": "HS256", "typ": "JWT"}) + "." + b64(claims) + "." + b64("offline")
    value = {"access_token": token, "refresh_token": "offline", "token_type": "bearer", "expires_in": 3600,
             "expires_at": now + 3600, "user": {"id": claims["sub"], "email": claims["email"]}}
    context.add_cookies([{"name": "sb-offline-auth-token", "value": "base64-" + b64(value), "url": BASE}])

def context(browser, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    def route(r):
        url = r.request.url
        if url.startswith(BASE + "/"):
            return r.continue_()
        claims = getattr(ctx, "offline_claims", {})
        if url == "https://offline.example.invalid/auth/v1/user" and claims:
            return r.fulfill(status=200, json={"id": claims["sub"], "email": claims["email"], "aud": "authenticated", "role": "authenticated"})
        if url.startswith("https://offline.example.invalid/storage/v1/object/") and claims.get("mode", "").startswith("dokument-"):
            method = r.request.method
            with LOG.open("a", encoding="utf-8") as log:
                log.write(json.dumps({"mode": claims["mode"], "ereignis": "browser-speicher", "methode": method, "pfad": url.split("offline.example.invalid", 1)[1]}) + "\n")
            if method == "POST" and "/object/dokumente/" in url:
                return r.fulfill(status=500, json={"message": "synthetischer Uploadfehler"}) if claims["mode"].startswith("dokument-uploadfehler-") else r.fulfill(status=200, json={"Key": "dokumente/offline.pdf"})
            if method == "DELETE" and url.endswith("/object/dokumente"):
                return r.fulfill(status=200, json=[])
            if method == "GET" and "/object/sign/dokumente/" in url:
                return r.fulfill(status=200, body=b"%PDF-1.4\n% rein synthetisches Browserbeispiel\n%%EOF", headers={"content-type": "application/pdf", "content-disposition": 'attachment; filename="synthetisch.pdf"'})
        return r.abort()
    ctx.route("**/*", route)
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
            for ranking in [False, True]:
                page.goto(BASE + "/stellen?sort=groesse" + ("&liste=test-b" if ranking else ""))
                expect(page.locator("#stellenliste > li")).to_have_count(50)
                expect(page.locator("#stellenliste > li").first).to_contain_text("Größentest 0:0")
                page.get_by_role("link", name="Weiter", exact=True).click()
                expect(page.locator("#stellenliste > li").first).to_contain_text("Größentest 0:50")
                expect(page.locator("#stellenliste > li").nth(7)).to_contain_text("Größentest 1:0")
                page.get_by_role("link", name="Weiter", exact=True).click()
                expect(page.locator("#stellenliste > li")).to_have_count(12)
                expect(page.locator("#stellenliste > li").last).to_contain_text("Größentest 99:0")
                expect(page.get_by_text("Seite 3 von 3", exact=True)).to_be_visible()
            assert not errors, errors
            user.close()
            print(f"OK {width}px: Gast, Filter, Detailseite, ungültige Auswahl; Größe über drei Seiten mit/ohne Ranking")
            for fall in ["merken-fehler", "merken-leer", "beworben-konflikt"]:
                probe = context(browser, width)
                session(probe, f"{fall}-{width}")
                seite = probe.new_page()
                seite.goto(BASE + "/stellen/Testfirma%20A%3A1")
                if fall == "beworben-konflikt":
                    seite.get_by_role("button", name="Ich habe mich beworben", exact=True).click()
                    expect(seite.get_by_role("alert")).to_contain_text("Der Status konnte nicht gespeichert werden")
                    expect(seite.get_by_role("link", name="Beworben ✓ · Zur Bewerbung", exact=True)).to_be_visible()
                else:
                    seite.get_by_role("button", name="Gemerkt ✓", exact=True).click()
                    if fall == "merken-fehler":
                        expect(seite.get_by_role("alert")).to_contain_text("Das Merken konnte nicht zurückgenommen werden")
                        expect(seite.get_by_role("button", name="Gemerkt ✓", exact=True)).to_be_visible()
                    else:
                        expect(seite.get_by_role("button", name="Merken", exact=True)).to_be_visible()
                probe.close()
            print(f"OK {width}px: Entmerken-Fehler, erfolgreiches Entmerken, paralleler Statusfortschritt")
            pruefe_persoenlich(browser, width, context, session, BASE, LOG)
        records = [json.loads(line) for line in LOG.read_text().splitlines()[STARTZEILE:]]
        assert not any("ranking_" in r.get("pfad", "") and r["mode"] == "gast" for r in records)
        assert not any(r["mode"].startswith("merken-fehler-") and r.get("methode") == "DELETE" for r in records)
        konflikte = [r for r in records if r.get("ereignis") == "statusupdate"]
        assert len(konflikte) == 2 and all(r["status"] == "im_gespraech" and not r["passend"] for r in konflikte)
    finally:
        browser.close()
