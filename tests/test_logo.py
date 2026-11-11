from scraper import logo

BASIS = "https://firma.de/karriere/"


def test_apple_touch_icon_bevorzugt():
    h = '<link rel="icon" href="/f.ico"><link rel="Apple-Touch-Icon-Precomposed" href="/a.png">'
    assert logo.logo_url(h, BASIS) == "https://firma.de/a.png"


def test_nur_icon_relativ():
    assert logo.logo_url('<link rel="shortcut icon" href="img/f.png">', BASIS) == "https://firma.de/karriere/img/f.png"


def test_kein_link():
    assert logo.logo_url("<html><head></head></html>", BASIS) is None


def test_data_uri_und_fremde_schemata():
    assert logo.logo_url('<link rel="icon" href="data:image/png;base64,AAA">', BASIS) is None
    assert logo.logo_url('<link rel="icon" href="javascript:x">', BASIS) is None


def test_hole_logo_fehler_ist_none(monkeypatch):
    def boese(_):
        raise RuntimeError("404")
    monkeypatch.setattr(logo.http, "hole", boese)
    assert logo.hole_logo("https://x.de") is None
