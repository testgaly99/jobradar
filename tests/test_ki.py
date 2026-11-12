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
