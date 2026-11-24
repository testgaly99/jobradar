"""Persönliche Abläufe am echten UI, alle Dienste antworten nur synthetisch."""
import csv
import io
import json
from playwright.sync_api import expect


def pruefe_persoenlich(browser, width, context, session, base, log):
    startzeile = len(log.read_text(encoding="utf-8").splitlines()) if log.exists() else 0

    def lesen():
        return [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines()[startzeile:]]

    def starten(fall, pfad):
        ctx = context(browser, width)
        session(ctx, f"{fall}-{width}")
        page = ctx.new_page()
        page.goto(base + pfad)
        return ctx, page

    def dokument(page, name):
        return page.locator("ul.eintraege > li").filter(has=page.get_by_text(name, exact=True))

    def warnung(page):
        return page.locator('[role="alert"]:not(#__next-route-announcer__):visible')

    def hochladen(page):
        page.get_by_label("Versionsname", exact=True).fill("CV Offline neu")
        page.get_by_label("Versionsdatum", exact=True).fill("2026-11-16")
        page.get_by_label("Datei (höchstens 50 MB)", exact=True).set_input_files({
            "name": "fiktiv.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n% nur synthetisch\n%%EOF"})
        page.get_by_role("button", name="Hochladen", exact=True).click()

    bewerbung = "/bewerbung/00000000-0000-4000-8000-000000000031"
    portal_link = "https://www.indeed.de/viewjob?jk=offline"
    original_link = "https://karriere.example.invalid/stellen/offline"
    offen_meldung = "Original wird heute Nacht auf der Karriereseite der Firma gesucht."

    ctx, p = starten("original-formular", "/bewerbungen/neu")
    link = p.get_by_label("Link zur Anzeige", exact=True)
    firma = p.get_by_label("Firma", exact=True)
    titel = p.get_by_label("Titel", exact=True)
    text = p.locator(".linkform textarea")
    linkedin = "https://www.linkedin.com/jobs/view/456789/"
    link.fill(linkedin)
    text.fill("Künstlicher Anzeigentext aus Formular.")
    p.get_by_role("button", name="Anlegen", exact=True).click()
    dialog = p.get_by_role("dialog")
    p.wait_for_function("""() => !document.querySelector('.linkform input[type=url]').value ||
      Boolean(document.querySelector('.linkform .meldung.info'))""")
    expect(dialog).not_to_be_visible()
    expect(link).to_have_value(linkedin)
    expect(text).to_have_value("Künstlicher Anzeigentext aus Formular.")
    expect(p.get_by_text("Aus diesem Link kann jobradar die Firma nicht lesen.", exact=False)).to_be_visible()
    expect(firma).to_have_attribute("required", "")
    expect(titel).to_have_attribute("required", "")
    assert not any(r.get("ereignis") == "original-formular-anlegen" for r in lesen())
    linkedin = "https://www.linkedin.com/jobs/view/456790/"
    link.fill(linkedin)
    firma.fill("Prüffirma aus Formular")
    p.get_by_role("button", name="Anlegen", exact=True).click()
    expect(p.get_by_text("Aus diesem Link kann jobradar die Firma nicht lesen.", exact=False)).to_be_visible()
    expect(dialog).not_to_be_visible()
    expect(link).to_have_value(linkedin)
    expect(firma).to_have_value("Prüffirma aus Formular")
    expect(text).to_have_value("Künstlicher Anzeigentext aus Formular.")
    expect(titel).to_have_attribute("required", "")
    assert not any(r.get("ereignis") == "original-formular-anlegen" for r in lesen())
    titel.fill("Prüftitel aus Formular")
    p.get_by_role("button", name="Anlegen", exact=True).click()
    expect(dialog.get_by_role("heading", name="Bewerbung angelegt", exact=True)).to_be_visible()
    dialog.get_by_role("link", name="Zur Bewerbung", exact=True).click()
    expect(p.get_by_role("heading", name="Prüffirma aus Formular: Prüftitel aus Formular", exact=True)).to_be_visible()
    expect(p.get_by_role("link", name="Anzeige öffnen", exact=True)).to_have_attribute("href", linkedin)
    p.get_by_text("Snapshot der Anzeige", exact=True).click()
    expect(p.get_by_text("Künstlicher Anzeigentext aus Formular.", exact=True)).to_be_visible()
    anlagen = [r["patch"] for r in lesen() if r.get("ereignis") == "original-formular-anlegen"]
    assert len(anlagen) == 1 and anlagen[0]["portal_link"] == linkedin and anlagen[0]["original_suche"] == "offen", anlagen
    ctx.close()
    print(f"OK {width}px: Portal-Rückfrage erhält Formulareingaben und legt nach Ergänzung genau eine Bewerbung an")

    ctx, p = starten("original-offen", bewerbung)
    expect(p.get_by_text(offen_meldung, exact=True)).to_be_visible()
    expect(p.get_by_role("link", name="Anzeige öffnen", exact=True)).to_have_attribute("href", portal_link)
    ctx.close()

    for fall in ["original-lokal", "original-keine", "original-extern"]:
        ctx, p = starten(fall, bewerbung)
        auswahl = p.get_by_role("region", name="Welche dieser Stellen ist es?", exact=True)
        expect(auswahl).to_be_visible()
        expect(auswahl.get_by_role("listitem")).to_have_count(2)
        anzeige = p.get_by_role("link", name="Anzeige öffnen", exact=True)
        expect(anzeige).to_have_attribute("href", portal_link)
        if fall == "original-lokal":
            zeile = auswahl.get_by_role("listitem").filter(has_text="Prüf-Original vor Ort")
            expect(zeile).to_contain_text("Teststadt")
            zeile.get_by_role("button", name="Diese Stelle wählen", exact=True).click()
            expect(anzeige).to_have_attribute("href", original_link)
        elif fall == "original-keine":
            auswahl.get_by_role("button", name="Keine davon", exact=True).click()
            expect(p.get_by_text("Original nicht gefunden.", exact=True)).to_be_visible()
        else:
            zeile = auswahl.get_by_role("listitem").filter(has_text="Prüf-Original im Nachtlauf")
            zeile.get_by_role("button", name="Diese Stelle wählen", exact=True).click()
            expect(p.get_by_text(offen_meldung, exact=True)).to_be_visible()
        expect(auswahl).to_have_count(0)
        p.reload()
        expect(p.get_by_role("heading", name="Prüffirma Kanban: Fiktive Datenanalyse", exact=True)).to_be_visible()
        expect(anzeige).to_have_attribute("href", original_link if fall == "original-lokal" else portal_link)
        if fall == "original-lokal":
            p.get_by_text("Snapshot der Anzeige", exact=True).click()
            expect(p.get_by_text("Künstlicher Text von der Originalstelle.", exact=True)).to_be_visible()
        ctx.close()

    ctx, p = starten("original-dublette", bewerbung)
    doppelt = p.get_by_role("link", name="Diese Stelle hast du schon", exact=True)
    expect(doppelt).to_have_attribute("href", "/bewerbung/00000000-0000-4000-8000-000000000035")
    doppelt.click()
    expect(p.get_by_role("heading", name="Prüffirma Kanban: Schon gespeichertes Original", exact=True)).to_be_visible()
    ctx.close()

    ctx, p = starten("original-beobachten", bewerbung)
    beobachten = p.get_by_role("button", name="Firma dauerhaft beobachten", exact=True)
    expect(beobachten).to_be_visible()
    beobachten.click()
    expect(warnung(p)).to_contain_text("Der Firmenname muss 2 bis 80 Zeichen lang sein.")
    ctx.close()

    patches = {r["mode"].removesuffix(f"-{width}"): r["patch"] for r in lesen() if r.get("ereignis") == "original-schreiben"}
    assert set(patches) == {"original-formular", "original-lokal", "original-keine", "original-extern"}, patches
    assert patches["original-formular"] == {"original_suche": "offen", "original_vorschlaege": None,
                                          "original_wahl": None, "original_dublette": None}, patches
    assert patches["original-lokal"]["job_id"] == "Prüffirma Kanban:offline", patches
    assert patches["original-lokal"]["snapshot_text"] == "Künstlicher Text von der Originalstelle.", patches
    assert patches["original-lokal"]["portal_link"] == portal_link, patches
    assert patches["original-keine"]["original_vorschlaege"] is None, patches
    assert patches["original-extern"] == {"original_wahl": 1, "original_suche": "offen"}, patches
    assert not {"firma", "titel", "status", "beworben_am"}.intersection(patches["original-keine"]), patches
    print(f"OK {width}px: Originalsuche offen, lokale/externe Auswahl, Ablehnung, Dublettenlink, Beobachten-Fehler")

    # Der Gast kommt an keine privaten Seiten oder Exportdaten.
    guest = context(browser, width)
    p = guest.new_page()
    for pfad in ["/bewerbungen", "/unterlagen", "/konto", "/export"]:
        p.goto(base + pfad)
        expect(p).to_have_url(base + "/login")
    guest.close()

    # Echte Tastaturbedienung des Boards, Undo und persistierter Kommentar.
    ctx, p = starten("tracker-normal", "/bewerbungen")
    board = p.get_by_role("region", name="Kanban-Ansicht", exact=True)
    griff = board.get_by_role("button", name="Prüffirma Kanban verschieben (Pfeil links/rechts)", exact=True)
    expect(p.locator(".detail-unter" if width < 832 else ".detail-spalte")).to_be_visible()
    griff.press("ArrowRight")
    expect(board.get_by_role("region", name="Im Gespräch", exact=True).locator("article")).to_have_count(1)
    expect(p.locator(".board-meldungen").get_by_role("status")).to_contain_text("Verschoben nach Im Gespräch")
    p.get_by_role("button", name="Rückgängig", exact=True).click()
    expect(board.get_by_role("region", name="Beworben", exact=True).locator("article")).to_have_count(1)
    griff.press("ArrowLeft")
    expect(warnung(p)).to_contain_text("Gemerkt")
    expect(board.get_by_role("region", name="Beworben", exact=True).locator("article")).to_have_count(1)
    board.get_by_role("button", name="Kommentar zu Prüffirma Kanban hinzufügen", exact=True).click()
    kommentar = board.get_by_role("textbox", name="Kommentar zu Prüffirma Kanban", exact=True)
    kommentar.fill("Nur künstlicher Prüfkommentar")
    kommentar.press("Enter")
    expect(board.get_by_role("button", name="Kommentar ändern: Nur künstlicher Prüfkommentar", exact=True)).to_be_visible()
    p.reload()
    expect(board.get_by_role("button", name="Kommentar ändern: Nur künstlicher Prüfkommentar", exact=True)).to_be_visible()
    ctx.close()

    ctx, p = starten("tracker-schreibfehler", "/bewerbungen")
    board = p.get_by_role("region", name="Kanban-Ansicht", exact=True)
    board.get_by_role("button", name="Prüffirma Kanban verschieben (Pfeil links/rechts)", exact=True).press("ArrowRight")
    expect(warnung(p)).to_contain_text("erneut")
    expect(board.get_by_role("region", name="Beworben", exact=True).locator("article")).to_have_count(1)
    expect(board.get_by_role("region", name="Im Gespräch", exact=True).locator("article")).to_have_count(0)
    p.reload()
    expect(board.get_by_role("region", name="Beworben", exact=True).locator("article")).to_have_count(1)
    ctx.close()
    ctx, p = starten("tracker-ladefehler", "/bewerbungen")
    expect(warnung(p).filter(has_text="Bewerbungen konnten nicht geladen werden").first).to_be_visible()
    expect(p.get_by_role("region", name="Kanban-Ansicht", exact=True)).to_have_count(0)
    ctx.close()
    print(f"OK {width}px: Gastschutz, Tracker-Detail, Tastaturzug/Undo, Gemerkt-Schutz, Kommentar, Lade-/Schreibfehler")

    # Upload, signierter Download, abgebrochene Löschung und Referenzschutz.
    ctx, p = starten("dokument-normal", "/unterlagen")
    expect(dokument(p, "CV Offline verwendet")).to_be_visible()
    hochladen(p)
    neu = dokument(p, "CV Offline neu")
    expect(neu).to_be_visible()
    p.once("dialog", lambda dialog: dialog.dismiss())
    neu.get_by_role("button", name="Löschen", exact=True).click()
    expect(neu).to_be_visible()
    p.once("dialog", lambda dialog: dialog.accept())
    dokument(p, "CV Offline verwendet").get_by_role("button", name="Löschen", exact=True).click()
    expect(warnung(p)).to_contain_text("noch in einer Bewerbung verwendet")
    expect(dokument(p, "CV Offline verwendet")).to_be_visible()
    p.once("dialog", lambda dialog: dialog.accept())
    neu.get_by_role("button", name="Löschen", exact=True).click()
    expect(neu).to_have_count(0)
    expect(dokument(p, "CV Offline verwendet")).to_be_visible()
    # Externer Dokumentaufruf zuletzt: reale PDF-Viewer verlassen ebenfalls die App.
    with p.expect_download() as download:
        dokument(p, "CV Offline verwendet").get_by_role("button", name="Herunterladen", exact=True).click()
    assert download.value.suggested_filename == "synthetisch.pdf"
    assert download.value.failure() is None
    ctx.close()

    for fall, meldung in [("dokument-uploadfehler", "Hochladen hat nicht geklappt"),
                          ("dokument-metadatenfehler", "Dokument konnte nicht gespeichert werden")]:
        ctx, p = starten(fall, "/unterlagen")
        hochladen(p)
        expect(warnung(p)).to_contain_text(meldung)
        expect(dokument(p, "CV Offline neu")).to_have_count(0)
        ctx.close()
    ctx, p = starten("dokument-downloadfehler", "/unterlagen")
    dokument(p, "CV Offline verwendet").get_by_role("button", name="Herunterladen", exact=True).click()
    expect(warnung(p)).to_contain_text("Download hat nicht geklappt")
    ctx.close()
    print(f"OK {width}px: Dokument-Upload/Download/Löschen, Abbruch, Referenzschutz, Upload-/Metadaten-/Downloadfehler")

    # Download statt bloßer HTTP-Erfolg; alle 1001 Zeilen müssen enthalten sein.
    ctx, p = starten("export-viele", "/konto")
    with p.expect_download() as download:
        p.get_by_role("link", name="Als Excel-Tabelle herunterladen", exact=True).click()
    datei = download.value
    assert datei.suggested_filename.startswith("jobradar-bewerbungen-") and datei.suggested_filename.endswith(".csv")
    assert datei.failure() is None
    with open(datei.path(), encoding="utf-8-sig") as inhalt:
        rows = list(csv.reader(io.StringIO(inhalt.read()), delimiter=";"))
    assert len(rows) == 1002, len(rows)
    assert any("Exportzeile 1" == wert for wert in rows[1])
    assert any("Exportzeile 1001" == wert for wert in rows[-1])
    assert any("CV Offline verwendet" == wert for wert in rows[1])
    assert any("Fiktiver Kontakt" in wert for wert in rows[1])
    assert any("Fiktive Gesprächspartner" in wert for wert in rows[1])
    ctx.close()
    ctx, p = starten("export-fehler", "/konto")
    p.get_by_role("link", name="Als Excel-Tabelle herunterladen", exact=True).click()
    expect(p.get_by_text("Export fehlgeschlagen", exact=True)).to_be_visible()
    ctx.close()
    print(f"OK {width}px: CSV-Download mit 1001 Bewerbungen, Dokumentnamen, kontrollierter Exportfehler")

    # Adminschutz, explizite Bestätigung, Abbruch und vollständiger Löschpfad.
    ctx, p = starten("konto-admin", "/konto")
    expect(p.get_by_text("Das Admin-Konto kann nicht gelöscht werden.", exact=False)).to_be_visible()
    expect(p.get_by_role("button", name="Konto endgültig löschen", exact=True)).to_have_count(0)
    ctx.close()
    ctx, p = starten("konto-normal", "/konto")
    konto_uid = ctx.offline_claims["sub"]
    p.get_by_text("Konto löschen", exact=True).click()
    p.get_by_label("Tippe LÖSCHEN ein", exact=True).fill("falsch")
    p.get_by_role("button", name="Konto endgültig löschen", exact=True).click()
    expect(warnung(p)).to_contain_text("Bitte tippe LÖSCHEN ein")
    vor_bestaetigung = lesen()
    assert not any(r.get("mode") == f"konto-normal-{width}" and r.get("admin") and r.get("methode") == "DELETE" for r in vor_bestaetigung)
    p.get_by_text("Konto löschen", exact=True).click()
    p.get_by_label("Tippe LÖSCHEN ein", exact=True).fill("LÖSCHEN")
    p.get_by_role("button", name="Konto endgültig löschen", exact=True).click()
    expect(p).to_have_url(base + "/login?geloescht=1")
    p.goto(base + "/konto")
    expect(p).to_have_url(base + "/login")
    ctx.close()
    ctx, p = starten("konto-fehler", "/konto")
    p.get_by_text("Konto löschen", exact=True).click()
    p.get_by_label("Tippe LÖSCHEN ein", exact=True).fill("LÖSCHEN")
    p.get_by_role("button", name="Konto endgültig löschen", exact=True).click()
    expect(warnung(p)).to_contain_text("Löschen fehlgeschlagen")
    expect(p.get_by_role("heading", name="Konto", exact=True)).to_be_visible()
    ctx.close()

    records = lesen()
    def eintraege(fall, ereignis="persoenlich"):
        return [r for r in records if r.get("mode") == f"{fall}-{width}" and r.get("ereignis") == ereignis]
    for fall in ["konto-normal", "konto-fehler"]:
        deletions = [r for r in eintraege(fall) if r.get("admin") and r["methode"] == "DELETE"]
        expected = ["/rest/v1/applications", "/rest/v1/documents"]
        if fall == "konto-normal":
            expected += ["/storage/v1/object/dokumente", f"/auth/v1/admin/users/{konto_uid}"]
            assert [r["pfad"] for r in deletions] == expected
        else:
            assert [r["pfad"] for r in deletions] == expected
            assert not any(r["pfad"].startswith("/storage/") or r["pfad"].startswith("/auth/v1/admin/") for r in eintraege(fall))
    assert not any(r.get("admin") and r["methode"] == "DELETE" for r in eintraege("konto-admin"))
    assert not any(r["pfad"] == "/rest/v1/documents" and r["methode"] == "POST" for r in eintraege("dokument-uploadfehler"))
    assert any(r["methode"] == "DELETE" for r in eintraege("dokument-metadatenfehler", "browser-speicher"))
    tracker_patches = [r["patch"] for r in eintraege("tracker-normal", "tracker-schreiben")]
    assert [p["status"] for p in tracker_patches if "status" in p] == ["im_gespraech", "beworben"]
    assert any(p.get("kommentar") == "Nur künstlicher Prüfkommentar" for p in tracker_patches)
    print(f"OK {width}px: Admin-/Bestätigungsschutz, Konto-Löschreihenfolge, Abbruch vor Dateien/Auth, Abmeldung")

    # Der neue Browserknopf benutzt dieselbe authentifizierte HTTP-Route wie dieser echte Fetch.
    import_daten = {"link": "https://karriere.example.invalid/stellen/123", "firma": "Importierte Prüffirma", "titel": "Importierte Anzeige", "text": "Nur künstlicher Anzeigentext"}
    posten = """async (daten) => {
        const r = await fetch('/api/stellen-import', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(daten)});
        return {status: r.status, body: await r.json()};
    }"""
    ctx, p = starten("import-neu", "/bewerbungen/import?link=https%3A%2F%2Fexample.invalid#titel=Ungeprüft")
    expect(p.locator("#stellen-import-status")).to_have_attribute("data-import-status", "bereit")
    vor_import = lesen()
    assert not any(r.get("mode") == f"import-neu-{width}" and r.get("methode") in ["POST", "PATCH", "DELETE"] for r in vor_import)
    gesperrt = p.evaluate(posten, {**import_daten, "link": "https://www.linkedin.com/jobs/view/123/"})
    assert gesperrt["status"] == 400, gesperrt
    neu = p.evaluate(posten, import_daten)
    assert neu["status"] == 201 and neu["body"]["vorhanden"] is False, neu
    nochmal = p.evaluate(posten, import_daten)
    assert nochmal["status"] == 200 and nochmal["body"] == {"id": neu["body"]["id"], "vorhanden": True}, nochmal
    fremd = ctx.request.post(base + "/api/stellen-import", headers={"Origin": "https://fremd.example.invalid"}, data=import_daten)
    assert fremd.status == 403
    p.goto(base + "/bewerbungen")
    board = p.get_by_role("region", name="Kanban-Ansicht", exact=True)
    expect(board.get_by_role("region", name="Gemerkt", exact=True).locator("article")).to_have_count(1)
    expect(board.get_by_text("Importierte Anzeige", exact=True)).to_be_visible()
    ctx.close()
    ctx, p = starten("import-fortgeschritten", "/bewerbungen/import")
    bestehend = p.evaluate(posten, import_daten)
    assert bestehend["status"] == 200 and bestehend["body"]["vorhanden"] is True, bestehend
    p.goto(base + "/bewerbungen")
    board = p.get_by_role("region", name="Kanban-Ansicht", exact=True)
    expect(board.get_by_role("region", name="Im Gespräch", exact=True).locator("article")).to_have_count(1)
    expect(board.get_by_text("Vorhandene Bewerbung", exact=True)).to_be_visible()
    expect(board.get_by_text("Importierte Anzeige", exact=True)).to_have_count(0)
    ctx.close()
    guest = context(browser, width)
    p = guest.new_page()
    p.goto(base + "/bewerbungen/import")
    expect(p).to_have_url(base + "/login")
    nicht_angemeldet = p.evaluate(posten, import_daten)
    assert nicht_angemeldet["status"] == 401, nicht_angemeldet
    guest.close()
    records = lesen()
    neu_schreiben = [r for r in eintraege("import-neu") if r.get("pfad") == "/rest/v1/applications" and r.get("methode") in ["POST", "PATCH", "DELETE"]]
    assert len(neu_schreiben) == 1 and neu_schreiben[0]["methode"] == "POST"
    assert not any(r.get("methode") in ["POST", "PATCH", "DELETE"] for r in eintraege("import-fortgeschritten"))
    print(f"OK {width}px: Import-API neu/doppelt, bestehender Status bleibt, fremder Origin/Gast abgewiesen, GET/Fragment schreibt nichts")
