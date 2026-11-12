import json

import pytest
import requests

from scraper import ki

GUT = {"aufgaben": ["a", "b", "c"], "muss": ["x"], "studium": "ja", "taetigkeit": "anspruchsvoll", "sprache": "de"}


class Antwort:
    def __init__(self, status=200, content=None, header=None, text="", modell="openai/gpt-oss-120b-0"):
        self.status_code, self.headers, self.text = status, header or {}, text
        self._body = {"model": modell, "choices": [{"message": {"content": content}}]}

    def json(self):
        return self._body


@pytest.fixture(autouse=True)
def _key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")


def poster(*antworten):
    """Liefert die Antworten der Reihe nach (Exceptions werden geworfen) und merkt sich die Aufrufe."""
    aufrufe, rest = [], list(antworten)

    def post(url, **kw):
        aufrufe.append(kw)
        a = rest.pop(0)
        if isinstance(a, Exception):
            raise a
        return a
    post.aufrufe = aufrufe
    return post


def test_pruefe_gueltig_und_trimmt():
    r = ki.pruefe({**GUT, "aufgaben": [" a ", "b", "c"]})
    assert r["aufgaben"] == ["a", "b", "c"] and r["muss"] == ["x"]


@pytest.mark.parametrize("kaputt", [
    {**GUT, "aufgaben": ["a", "b"]}, {**GUT, "aufgaben": ["a"] * 6}, {**GUT, "muss": ["x"] * 4},
    {**GUT, "studium": "vielleicht"}, {**GUT, "taetigkeit": "mittel"}, {**GUT, "sprache": "fr"},
    {**GUT, "aufgaben": ["a", "", "c"]}, {k: v for k, v in GUT.items() if k != "muss"},
])
def test_pruefe_ungueltig(kaputt):
    with pytest.raises(ki.Ungueltig):
        ki.pruefe(kaputt)


def test_frage_groq_gueltig():
    post = poster(Antwort(content=json.dumps(GUT)))
    assert ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None) == GUT


def test_frage_groq_wartet_bei_minutengrenze():
    schlaefe = []
    post = poster(Antwort(429, header={"retry-after": "2"}, text="rate limit"), Antwort(content=json.dumps(GUT)))
    ki.frage_groq("Text", ki.KLEIN, post=post, schlaf=schlaefe.append)
    assert schlaefe == [2]


def test_frage_groq_tagesgrenze_ist_erschoepft():
    post = poster(Antwort(429, text="Rate limit reached ... tokens per day (TPD) ..."))
    with pytest.raises(ki.Erschoepft) as e:
        ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    assert e.value.modell == ki.GROSS


@pytest.mark.parametrize("fehler", [Antwort(503), requests.ConnectionError("weg"), requests.Timeout("lahm")])
def test_frage_groq_serverfehler_ist_weg(fehler):
    with pytest.raises(ki.GroqWeg):
        ki.frage_groq("Text", ki.GROSS, post=poster(fehler), schlaf=lambda s: None)


def test_frage_groq_kaputtes_json_ist_ungueltig():
    with pytest.raises(ki.Ungueltig) as e:
        ki.frage_groq("Text", ki.GROSS, post=poster(Antwort(content="kein json")), schlaf=lambda s: None)
    assert e.value.roh == "kein json"


def test_frage_groq_schickt_nur_text():
    post = poster(Antwort(content=json.dumps(GUT)))
    ki.frage_groq("Anzeige" + "x" * 20000, ki.GROSS, post=post, schlaf=lambda s: None)
    body = post.aufrufe[0]["json"]
    assert [m["role"] for m in body["messages"]] == ["system", "user"]
    assert body["messages"][0]["content"] == ki.PROMPT
    assert body["messages"][1]["content"].startswith("Anzeige") and len(body["messages"][1]["content"]) == 12000
    assert body["model"] == ki.GROSS and "test-key" not in json.dumps(body)


def test_anfrage_gibt_roh_und_modell():
    post = poster(Antwort(content="irgendwas", modell="m-1"))
    assert ki.anfrage("Text", ki.GROSS, post=post, schlaf=lambda s: None) == ("irgendwas", "m-1")


def test_anfrage_nach_fuenf_429_erschoepft():
    post = poster(*[Antwort(429, header={"retry-after": "1"}) for _ in range(5)])
    with pytest.raises(ki.Erschoepft):
        ki.anfrage("Text", ki.KLEIN, post=post, schlaf=lambda s: None)


def _fake_stellen():
    titel = ["Werkstudent Data", "Assistenz Vertrieb", "Sales Manager"] + ["Ingenieur"] * 57
    return [{"id": f"s{i:02d}", "unternehmen": f"Firma{i % 6}", "titel": titel[i],
             "text": "x the " * 6 if i % 6 == 3 and i < 60 and i // 6 < 10 else "Wir suchen."} for i in range(60)]


def test_waehle_probe_mischt():
    from scraper.ki_probe import waehle_probe
    stellen = _fake_stellen()
    p = waehle_probe(stellen)
    assert len(p) == 20 and len({s["id"] for s in p}) == 20
    assert len({s["unternehmen"] for s in p}) >= 5
    assert sum(s["text"].count(" the ") >= 5 for s in p) >= 4
    for wort in ("Werkstudent", "Assistenz", "Sales"):
        assert any(wort in s["titel"] for s in p)
    assert p == waehle_probe(list(reversed(stellen)))


def test_probe_html_unveraendert_und_ungueltig(tmp_path):
    from scraper.ki_probe import probe
    stellen = [{"id": "1", "unternehmen": "F", "titel": "T<b>", "url": "http://x", "text": "t"},
               {"id": "2", "unternehmen": "F", "titel": "U", "url": "http://y", "text": "t"},
               {"id": "3", "unternehmen": "F", "titel": "V", "url": "http://z", "text": "t"}]
    antw = iter([(json.dumps(GUT), "modell-A"), ("kein <json>", "modell-B"), ki.Erschoepft("m")])

    def fake(text, modell):
        a = next(antw)
        if isinstance(a, Exception):
            raise a
        return a

    out = tmp_path / "p.html"
    zeilen = probe(stellen, out, anfrage=fake)
    h = out.read_text(encoding="utf-8")
    assert len(zeilen) == 3 and "modell-A" in h and "T&lt;b&gt;" in h
    assert "ungültig" in h and "kein &lt;json&gt;" in h and "Tageslimit" in h


def test_probe_zeigt_roh_unnormalisiert(tmp_path):
    from scraper.ki_probe import probe
    roh = json.dumps({**GUT, "aufgaben": ["  mit Leerraum  ", "b", "c"], "extra": "zusatz"})
    out = tmp_path / "p.html"
    probe([{"id": "1", "unternehmen": "F", "titel": "T", "url": "u", "text": "t"}], out, anfrage=lambda t, m: (roh, "m"))
    h = out.read_text(encoding="utf-8")
    assert "<li>  mit Leerraum  </li>" in h
    assert "Rohantwort von Groq" in h and "&quot;extra&quot;: &quot;zusatz&quot;" in h


def test_probe_faengt_beliebige_fehler(tmp_path):
    from scraper.ki_probe import probe
    antw = iter([(json.dumps(GUT), "m")])

    def fake(t, m):
        try:
            return next(antw)
        except StopIteration:
            raise KeyError("GROQ_API_KEY")

    stellen = [{"id": str(i), "unternehmen": "F", "titel": f"T{i}", "url": "u", "text": "t"} for i in range(3)]
    out = tmp_path / "p.html"
    zeilen = probe(stellen, out, anfrage=fake)
    h = out.read_text(encoding="utf-8")
    assert len(zeilen) == 2 and "KeyError" in h and ">T0<" in h and ">T2<" not in h
