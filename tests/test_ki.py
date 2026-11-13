import json

import pytest
import requests

from scraper import ki

GUT = {"aufgaben": ["a", "b", "c"], "abschluss": "Studium Informatik o. ä.", "erfahrung": None, "muss": ["x"],
       "studium": "ja", "taetigkeit": "anspruchsvoll", "sprache": "de"}


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
    r = ki.pruefe({**GUT, "aufgaben": [" a ", "b", "c"], "erfahrung": " 3+ Jahre B2B-Vertrieb "})
    assert r["aufgaben"] == ["a", "b", "c"] and r["muss"] == ["x"]
    assert r["abschluss"] == "Studium Informatik o. ä." and r["erfahrung"] == "3+ Jahre B2B-Vertrieb"
    assert ki.pruefe({**GUT, "abschluss": None, "muss": []})["abschluss"] is None


@pytest.mark.parametrize("kaputt", [
    {**GUT, "aufgaben": ["a", "b"]}, {**GUT, "aufgaben": ["a"] * 6}, {**GUT, "muss": ["x"] * 4},
    {**GUT, "studium": "vielleicht"}, {**GUT, "taetigkeit": "mittel"}, {**GUT, "sprache": "fr"},
    {**GUT, "aufgaben": ["a", "", "c"]}, {k: v for k, v in GUT.items() if k != "muss"},
    {k: v for k, v in GUT.items() if k != "erfahrung"}, {**GUT, "abschluss": ""}, {**GUT, "erfahrung": 3},
    {**GUT, "extra": "x"}, ["kein", "objekt"],
])
def test_pruefe_ungueltig(kaputt):
    with pytest.raises(ki.Ungueltig):
        ki.pruefe(kaputt)


@pytest.mark.parametrize("kaputt, meldung", [
    ({**GUT, "aufgaben": ["a"] * 6}, "aufgaben hat 6 Einträge, erlaubt sind 3–5."),
    ({**GUT, "muss": ["x"] * 4}, "muss hat 4 Einträge, erlaubt sind 0–3."),
    ({**GUT, "studium": "vielleicht"}, 'studium ist "vielleicht", erlaubt sind: "ja", "nein", "unklar".'),
    ({**GUT, "abschluss": ""}, "abschluss muss ein nicht-leerer Text oder null sein."),
    ({**{k: v for k, v in GUT.items() if k != "erfahrung"}, "extra": 1}, "fehlend: erfahrung; überzählig: extra"),
])
def test_pruefe_meldet_genau(kaputt, meldung):
    with pytest.raises(ki.Ungueltig) as e:
        ki.pruefe(kaputt)
    assert meldung in str(e.value)


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
    post = poster(Antwort(content="kein json"), Antwort(content="immer noch kein json"))
    with pytest.raises(ki.Ungueltig) as e:
        ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    assert e.value.roh == "immer noch kein json" and len(post.aufrufe) == 2
    assert "kein gültiges JSON" in post.aufrufe[1]["json"]["messages"][-1]["content"]


def test_frage_groq_rueckfrage_repariert():
    sechs = json.dumps({**GUT, "aufgaben": ["a"] * 6})
    post = poster(Antwort(content=sechs), Antwort(content=json.dumps(GUT)))
    protokoll = []
    assert ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None, protokoll=protokoll) == GUT
    assert len(post.aufrufe) == 2 and [r for r, _ in protokoll] == [sechs, json.dumps(GUT)]
    m = post.aufrufe[1]["json"]["messages"]
    assert [x["role"] for x in m] == ["system", "user", "assistant", "user"]
    assert m[1]["content"] == "Text" and m[2]["content"] == sechs
    assert "aufgaben hat 6 Einträge, erlaubt sind 3–5." in m[3]["content"]
    assert "nur mit dem korrigierten JSON" in m[3]["content"]


def test_frage_groq_rueckfrage_bleibt_ungueltig():
    post = poster(Antwort(content=json.dumps({**GUT, "aufgaben": ["a"] * 6})),
                  Antwort(content=json.dumps({**GUT, "sprache": "fr"})))
    with pytest.raises(ki.Ungueltig) as e:
        ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    assert len(post.aufrufe) == 2 and '"fr"' in e.value.roh and "sprache" in str(e.value)


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


def test_waehle_probe_versatz_andere_stichprobe_gleiche_mischung():
    from scraper.ki_probe import waehle_probe
    stellen = _fake_stellen()
    a, b = waehle_probe(stellen), waehle_probe(stellen, versatz=30)
    assert len(b) == 20 and len({s["unternehmen"] for s in b}) >= 5
    assert sum(s["text"].count(" the ") >= 5 for s in b) >= 4
    for wort in ("Werkstudent", "Assistenz", "Sales"):
        assert any(wort in s["titel"] for s in b)
    assert len({s["id"] for s in a} & {s["id"] for s in b}) <= 8


def _stelle(i, titel="T"):
    return {"id": str(i), "unternehmen": "F", "titel": titel, "url": f"http://x/{i}", "text": "t"}


def test_probe_html_unveraendert_und_ungueltig(tmp_path):
    from scraper.ki_probe import probe
    post = poster(Antwort(content=json.dumps(GUT), modell="modell-A"),
                  Antwort(content="kein <json>"), Antwort(content="kein <json> 2", modell="modell-B"),
                  Antwort(429, text="tokens per day"))
    out = tmp_path / "p.html"
    zeilen = probe([_stelle(1, "T<b>"), _stelle(2), _stelle(3)], out, post=post, schlaf=lambda s: None)
    h = out.read_text(encoding="utf-8")
    assert len(zeilen) == 3 and "modell-A" in h and "modell-B" in h and "T&lt;b&gt;" in h
    assert "ungültig" in h and "kein &lt;json&gt; 2" in h and "Tageslimit" in h
    assert "<th>Abschluss</th>" in h and "<th>Erfahrung</th>" in h and "Studium Informatik o. ä." in h


def test_probe_zeigt_roh_unnormalisiert(tmp_path):
    from scraper.ki_probe import probe
    roh = json.dumps({**GUT, "aufgaben": ["  mit Leerraum  ", "b", "c"], "erfahrung": "3+ <Jahre>"})
    out = tmp_path / "p.html"
    probe([_stelle(1)], out, post=poster(Antwort(content=roh)), schlaf=lambda s: None)
    h = out.read_text(encoding="utf-8")
    assert "<li>  mit Leerraum  </li>" in h and "3+ &lt;Jahre&gt;" in h
    assert "Rohantwort von Groq" in h and "nach Rückfrage" not in h


def test_probe_zeigt_rueckfrage(tmp_path):
    from scraper.ki_probe import probe
    erst = json.dumps({**GUT, "aufgaben": ["erste"] * 6})
    zweit = json.dumps({**GUT, "aufgaben": ["  final  ", "b", "c"]})
    out = tmp_path / "p.html"
    zeilen = probe([_stelle(1)], out, post=poster(Antwort(content=erst), Antwort(content=zweit)),
                   schlaf=lambda s: None)
    h = out.read_text(encoding="utf-8")
    assert zeilen[0][1]["gueltig"] and "nach Rückfrage" in h
    assert "Erste Antwort" in h and "Nach Rückfrage" in h and "&quot;erste&quot;" in h
    assert "<li>  final  </li>" in h and "<li>erste</li>" not in h


def test_probe_faengt_beliebige_fehler(tmp_path):
    from scraper.ki_probe import probe
    out = tmp_path / "p.html"
    zeilen = probe([_stelle(i, f"T{i}") for i in range(3)], out,
                   post=poster(Antwort(content=json.dumps(GUT)), KeyError("GROQ_API_KEY")), schlaf=lambda s: None)
    h = out.read_text(encoding="utf-8")
    assert len(zeilen) == 2 and "KeyError" in h and ">T0<" in h and ">T2<" not in h
