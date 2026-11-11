from scraper.abschnitte import abschnitte
from scraper.filter import land


def test_h3_und_liste():
    html = "<p>Intro</p><h3>Aufgaben</h3><ul><li>Bauen</li><li>Testen</li></ul><h3>Profil</h3><p>Du kannst Python.</p>"
    assert abschnitte(html) == [{"titel": "Über die Stelle", "punkte": ["Intro"]},
                                {"titel": "Aufgaben", "punkte": ["Bauen", "Testen"]},
                                {"titel": "Profil", "punkte": ["Du kannst Python."]}]


def test_strong_absatz_ist_ueberschrift():
    assert abschnitte("<p><strong>Dein Profil</strong></p><p>Gut <b>in</b> Python</p><ul><li>SQL</li></ul>") == [
        {"titel": "Dein Profil", "punkte": ["Gut in Python", "SQL"]}]


def test_nur_fliesstext():
    assert abschnitte("<p>Eins</p><p>Zwei</p>") == [{"titel": "Beschreibung", "punkte": ["Eins", "Zwei"]}]
    assert abschnitte("Nur Text ohne Tags") == [{"titel": "Beschreibung", "punkte": ["Nur Text ohne Tags"]}]


def test_script_style_entities_leer():
    r = abschnitte("<style>p{}</style><p>A &amp; B<script>alert(1)</script></p><h2>Leer</h2>")
    assert r == [{"titel": "Über die Stelle", "punkte": ["A & B"]}]
    assert "alert" not in str(r) and "p{}" not in str(r)
    assert abschnitte("") == [] and abschnitte(None) == []


def test_kaputtes_html_stuerzt_nicht_ab():
    r = abschnitte('<h3>Titel<ul><li>Eins<li>Zwei<img src=x onerror=alert(1)><p>offen')
    assert r[0]["titel"] == "Titel" and "Eins" in r[0]["punkte"] and "Zwei" in r[0]["punkte"]
    assert "onerror" not in str(r) and "<" not in str(r)


def test_land():
    assert land("Berlin; London") == "Deutschland"
    assert land("Vienna, Austria") == "Österreich"
    assert land("Zürich, Switzerland") == "Schweiz"
    assert land("Wien; Zürich") == "Österreich"
    assert land("Zürich; Berlin") == "Deutschland"
    assert land("Remote - Europe") == "" and land("") == ""


def test_ungeschlossenes_strong_leckt_nicht():
    assert abschnitte("<p><strong>Titel<p>Text A<p>Text B") == [{"titel": "Titel", "punkte": ["Text A", "Text B"]}]


def test_fetter_listenpunkt_ist_punkt():
    assert abschnitte("<h3>Skills</h3><ul><li><strong>Python</strong></li><li>SQL</li></ul>") == [
        {"titel": "Skills", "punkte": ["Python", "SQL"]}]
