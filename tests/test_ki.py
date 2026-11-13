import json

import pytest
import requests

from scraper import ki

GUT = {"aufgaben": ["a", "b", "c"], "rahmen": ["Befristet auf 2 Jahre"], "abschluss": "Studium Informatik o. ä.",
       "erfahrung": None, "muss": ["x"], "benefits": ["4-Tage-Woche"], "studium": "ja", "taetigkeit": "anspruchsvoll",
       "sprache": "de"}


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
    r = ki.pruefe({**GUT, "rahmen": [" Reisen ", "Sicherheitsüberprüfung"], "benefits": []})
    assert r["rahmen"] == ["Reisen", "Sicherheitsüberprüfung"] and r["benefits"] == []
    assert list(r) == list(ki.SCHLUESSEL) and len(ki.SCHLUESSEL) == 9


@pytest.mark.parametrize("kaputt", [
    {**GUT, "aufgaben": ["a", "b"]}, {**GUT, "aufgaben": ["a"] * 6}, {**GUT, "muss": ["x"] * 4},
    {**GUT, "studium": "vielleicht"}, {**GUT, "taetigkeit": "mittel"}, {**GUT, "sprache": "fr"},
    {**GUT, "aufgaben": ["a", "", "c"]}, {k: v for k, v in GUT.items() if k != "muss"},
    {k: v for k, v in GUT.items() if k != "erfahrung"}, {**GUT, "abschluss": ""}, {**GUT, "erfahrung": 3},
    {**GUT, "extra": "x"}, ["kein", "objekt"], {**GUT, "rahmen": ["r"] * 5}, {**GUT, "benefits": ["b"] * 3},
    {**GUT, "rahmen": "Reisen"}, {**GUT, "benefits": [""]}, {k: v for k, v in GUT.items() if k != "rahmen"},
    {k: v for k, v in GUT.items() if k != "benefits"},
])
def test_pruefe_ungueltig(kaputt):
    with pytest.raises(ki.Ungueltig):
        ki.pruefe(kaputt)


@pytest.mark.parametrize("kaputt, meldung", [
    ({**GUT, "aufgaben": ["a"] * 6}, "aufgaben hat 6 Einträge, erlaubt sind 3–5."),
    ({**GUT, "muss": ["x"] * 4}, "muss hat 4 Einträge, erlaubt sind 0–3."),
    ({**GUT, "studium": "vielleicht"}, 'studium ist "vielleicht", erlaubt sind: "ja", "nein", "unklar".'),
    ({**GUT, "abschluss": ""}, "abschluss muss ein nicht-leerer Text oder null sein."),
    ({**GUT, "rahmen": ["r"] * 5}, "rahmen hat 5 Einträge, erlaubt sind 0–4."),
    ({**GUT, "benefits": ["b"] * 3}, "benefits hat 3 Einträge, erlaubt sind 0–2."),
    ({**GUT, "benefits": None}, "benefits muss eine Liste aus nicht-leeren Texten sein."),
    ({**{k: v for k, v in GUT.items() if k != "erfahrung"}, "extra": 1}, "fehlend: erfahrung; überzählig: extra"),
])
def test_pruefe_meldet_genau(kaputt, meldung):
    with pytest.raises(ki.Ungueltig) as e:
        ki.pruefe(kaputt)
    assert meldung in str(e.value)


LANG = "x" * 450


def test_kuerze_laesst_firma_und_recht_weg():
    abschn = [{"titel": "Über uns", "punkte": ["Wir sind toll"]},
              {"titel": "Deine Aufgaben", "punkte": ["Dashboards bauen", LANG, *"abcdefgh"]},
              {"titel": "Dein Profil", "punkte": ["SQL"]},
              {"titel": "Das bieten wir", "punkte": ["4-Tage-Woche"]},
              {"titel": "Wer wir sind", "punkte": ["Firmenwerbung"]},
              {"titel": "Datenschutz", "punkte": ["DSGVO"]},
              {"titel": "Chancengleichheit", "punkte": ["Gleichbehandlung"]},
              {"titel": "IMPRESSUM", "punkte": ["Anschrift"]},
              {"titel": "Kontakt", "punkte": ["Frau Muster"]},
              {"titel": "Unser Unternehmen", "punkte": ["Gegründet 1900"]},
              {"titel": "Über die Stelle", "punkte": ["Rolle im Team"]},
              {"titel": "Deine Rolle in unserem Unternehmen", "punkte": ["Prozesse verbessern"]}]
    t = ki.kuerze_fuer_ki(abschn, "ganzer Text")
    assert t.startswith("Deine Aufgaben:\n- Dashboards bauen\n- x")
    assert "\n\nDein Profil:\n- SQL\n\nDas bieten wir:\n- 4-Tage-Woche" in t and "Über die Stelle:\n- Rolle im Team" in t
    assert "- Prozesse verbessern" in t
    for weg in ("toll", "Firmenwerbung", "DSGVO", "Gleichbehandlung", "Anschrift", "Muster", "1900", "ganzer Text"):
        assert weg not in t


def test_kuerze_englisch_und_about_firma():
    abschn = [{"titel": "About Acme", "punkte": ["Acme is great"]}, {"titel": "About us", "punkte": ["us"]},
              {"titel": "Who we are", "punkte": ["we"]}, {"titel": "About the role", "punkte": ["Build APIs", LANG, *"abdefgh"]},
              {"titel": "What you bring", "punkte": ["Go"]}, {"titel": "Equal Opportunity Employer", "punkte": ["eeo"]},
              {"titel": "Privacy Notice", "punkte": ["gdpr"]}, {"titel": "Our Diversity Statement", "punkte": ["div"]},
              {"titel": "Contact", "punkte": ["mail"]}, {"titel": "The Company", "punkte": ["co"]},
              {"titel": "About you", "punkte": ["curious"]}]
    t = ki.kuerze_fuer_ki(abschn, "voll")
    assert "About the role:" in t and "What you bring:\n- Go" in t and "About you:\n- curious" in t
    for weg in ("Acme", "About us", "Who we are", "eeo", "gdpr", "div", "mail", "- co", "voll"):
        assert weg not in t


@pytest.mark.parametrize("titel", [
    "Kundenkontakt und Beratung", "Dein Kontakt zu Kunden", "Your contact at work", "Aufgabenvielfalt",
    "Deine Vielfalt an Aufgaben", "Unternehmen & Aufgaben", "Company Benefits", "Über das Praktikum",
    "About the opportunity", "Über Ihr Profil", "Dein Profil", "About the team", "Über den Job", "Beschreibung"])
def test_kuerze_behaelt(titel):
    assert ki.kuerze_fuer_ki([{"titel": titel, "punkte": [LANG]}], "voll").startswith(titel + ":\n- x")


@pytest.mark.parametrize("titel", [
    "Über uns", "Wir über uns", "Über das Unternehmen", "Über die Firma", "About us", "About the company", "About Acme",
    "Über Acme GmbH", "Das Unternehmen", "Unser Unternehmen", "Unternehmensprofil", "The company", "Company",
    "Wer wir sind:", "Who we are", "Datenschutz", "Datenschutzhinweise", "Privacy Notice", "Chancengleichheit",
    "Equal Opportunity Employer", "Our Diversity Statement", "Diversität", "Impressum", "Kontakt", "Contact us",
    "Dein Kontakt", "Ansprechpartnerin"])
def test_kuerze_verwirft(titel):
    assert ki.kuerze_fuer_ki([{"titel": titel, "punkte": [LANG]}], "voll") == "voll"


def test_kuerze_mehr_als_haelfte_weg_ist_ganzer_text():
    abschn = [{"titel": "Aufgaben", "punkte": [LANG, "a"]}, {"titel": "Über uns", "punkte": ["u1", "u2", "u3"]}]
    assert ki.kuerze_fuer_ki(abschn, "voll") == "voll"
    assert ki.kuerze_fuer_ki(abschn[:1] + [{"titel": "Über uns", "punkte": ["u1", "u2"]}], "voll") != "voll"


@pytest.mark.parametrize("abschn", [None, [], [{"titel": "Aufgaben", "punkte": ["kurz"]}],
                                    [{"titel": "Über uns", "punkte": [LANG]}, {"titel": "Aufgaben", "punkte": ["a"]}]])
def test_kuerze_faellt_auf_ganzen_text_zurueck(abschn):
    assert ki.kuerze_fuer_ki(abschn, "ganzer Text") == "ganzer Text"


def test_frage_groq_gueltig():
    post = poster(Antwort(content=json.dumps(GUT)))
    assert ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None) == GUT


def test_frage_groq_wartet_bei_minutengrenze():
    schlaefe = []
    post = poster(Antwort(429, header={"retry-after": "2"}, text="rate limit"), Antwort(content=json.dumps(GUT)))
    ki.frage_groq("Text", ki.GROSS, post=post, schlaf=schlaefe.append)
    assert schlaefe == [2]


def test_frage_groq_tagesgrenze_ist_erschoepft():
    post = poster(Antwort(429, text="Rate limit reached ... tokens per day (TPD) ..."))
    with pytest.raises(ki.Erschoepft) as e:
        ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    assert e.value.modell == ki.GROSS


@pytest.mark.parametrize("fehler", [Antwort(503), requests.ConnectionError("weg"), requests.Timeout("lahm")])
def test_frage_groq_serverfehler_ist_weg(fehler):
    with pytest.raises(ki.GroqWeg):
        ki.frage_groq("Text", ki.GROSS, post=poster(*[fehler] * 4), schlaf=lambda s: None)


def test_anfrage_wiederholt_bei_verbindungsabbruch():
    post, waits = poster(requests.ConnectionError("x"), requests.ConnectionError("x"), Antwort(content="ok")), []
    assert ki.anfrage("Text", ki.GROSS, post=post, schlaf=waits.append)[0] == "ok"
    assert waits == [5, 15] and len(post.aufrufe) == 3


def test_anfrage_gibt_nach_vier_abbruechen_auf():
    post, waits = poster(*[requests.ConnectionError("x")] * 4), []
    with pytest.raises(ki.GroqWeg):
        ki.anfrage("Text", ki.GROSS, post=post, schlaf=waits.append)
    assert len(post.aufrufe) == 4 and waits == [5, 15, 30]


def test_anfrage_wiederholt_bei_5xx():
    waits = []
    assert ki.anfrage("Text", ki.GROSS, post=poster(Antwort(503), Antwort(content="ok")), schlaf=waits.append)[0] == "ok"
    assert waits == [5]


def test_anfrage_401_ohne_wiederholung():
    post, waits = poster(Antwort(401)), []
    with pytest.raises(ki.GroqWeg):
        ki.anfrage("Text", ki.GROSS, post=post, schlaf=waits.append)
    assert len(post.aufrufe) == 1 and waits == []


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
    assert body["messages"][0]["content"] == ki.PROMPTS[ki.GROSS]
    assert body["messages"][1]["content"].startswith("Anzeige") and len(body["messages"][1]["content"]) == 12000
    assert body["model"] == ki.GROSS and "test-key" not in json.dumps(body)


def test_anfrage_gibt_roh_und_modell():
    post = poster(Antwort(content="irgendwas", modell="m-1"))
    assert ki.anfrage("Text", ki.GROSS, post=post, schlaf=lambda s: None) == ("irgendwas", "m-1")


@pytest.mark.parametrize("text", ["Request too large ... tokens per minute (TPM)", "output tokens per minute", ""])
def test_anfrage_fuenf_minuten_429_ist_groqweg_nicht_erschoepft(text):
    waits = []
    post = poster(*[Antwort(429, header={"retry-after": "100"}, text=text) for _ in range(5)])
    with pytest.raises(ki.GroqWeg) as e:
        ki.anfrage("Text", ki.GROSS, post=post, schlaf=waits.append)
    assert not isinstance(e.value, ki.Erschoepft) and "429" in str(e.value) and "test-key" not in str(e.value)
    assert waits == [60] * 4  # nach dem letzten Versuch keine Pause mehr


@pytest.mark.parametrize("text", ["tokens per day (TPD)", "requests per day (RPD)"])
def test_anfrage_tageslimit_sofort_erschoepft(text):
    post = poster(Antwort(429, text=text))
    with pytest.raises(ki.Erschoepft):
        ki.anfrage("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    assert len(post.aufrufe) == 1


def test_anfrage_minuten_429_dann_ok():
    post = poster(Antwort(429, header={"retry-after": "3"}, text="tokens per minute (TPM)"), Antwort(content="ok"))
    assert ki.anfrage("Text", ki.GROSS, post=post, schlaf=lambda s: None)[0] == "ok"


def test_anfrage_413_ist_ungueltig_ohne_wiederholung():
    post = poster(Antwort(413, text="Request too large for model"))
    with pytest.raises(ki.Ungueltig) as e:
        ki.anfrage("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    assert "zu groß" in str(e.value) and len(post.aufrufe) == 1


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


def test_waehle_probe_andere_stichprobe_gleiche_mischung():
    from scraper.ki_probe import waehle_probe
    stellen = _fake_stellen()
    a, b = waehle_probe(stellen), waehle_probe(stellen, stichprobe=1)
    assert len(b) == 20 and len({s["unternehmen"] for s in b}) >= 5
    assert sum(s["text"].count(" the ") >= 5 for s in b) >= 4
    for wort in ("Werkstudent", "Assistenz", "Sales"):
        assert any(wort in s["titel"] for s in b)
    assert len({s["id"] for s in a} & {s["id"] for s in b}) <= 8
    assert b == waehle_probe(list(reversed(stellen)), stichprobe=1)


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
    assert "<th>Rahmen</th>" in h and "<th>Benefits</th>" in h
    assert "<li>Befristet auf 2 Jahre</li>" in h and "<li>4-Tage-Woche</li>" in h


def test_probe_sendet_gekuerzten_text(tmp_path):
    from scraper.ki_probe import probe
    abschn = [{"titel": "Über uns", "punkte": ["Werbung <toll>"]}, {"titel": "Aufgaben", "punkte": ["APIs & mehr", LANG]}]
    stelle = {**_stelle(1), "text": "ganzer Text", "abschnitte": abschn}
    post = poster(Antwort(content=json.dumps({**GUT, "rahmen": [" Reisen "], "benefits": []})))
    out = tmp_path / "p.html"
    probe([stelle], out, post=post, schlaf=lambda s: None)
    gesendet = post.aufrufe[0]["json"]["messages"][1]["content"]
    assert gesendet == ki.kuerze_fuer_ki(abschn, "ganzer Text") and "Werbung" not in gesendet
    h = out.read_text(encoding="utf-8")
    assert "An Groq gesendet" in h and "APIs &amp; mehr" in h and "Werbung" not in h and "ganzer Text" not in h
    assert "<li> Reisen </li>" in h


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


def test_probe_nutzt_angegebenes_modell(tmp_path):
    from scraper.ki_probe import probe
    post = poster(Antwort(content=json.dumps(GUT)))
    probe([_stelle(1)], tmp_path / "p.html", post=post, schlaf=lambda s: None, modell=ki.QWEN)
    body = post.aufrufe[0]["json"]
    assert body["model"] == ki.QWEN and body["messages"][0]["content"] == ki.PROMPTS[ki.QWEN]


def test_jedes_modell_eigene_promptdatei():
    from pathlib import Path
    ordner = Path(ki.__file__).parent
    assert ki.PROMPTS[ki.GROSS] == (ordner / "ki_prompt.md").read_text(encoding="utf-8")
    assert ki.PROMPTS[ki.QWEN] == (ordner / "ki_prompt_qwen.md").read_text(encoding="utf-8")


def test_anfrage_unbekanntes_modell_fehler():
    post = poster()
    with pytest.raises(ValueError, match="Kein System-Prompt"):
        ki.anfrage("Text", "irgendein/modell", post=post, schlaf=lambda s: None)
    assert post.aufrufe == []


def test_anfrage_ausgabegrenze_je_modell():
    post = poster(Antwort(content="a"), Antwort(content="b"))
    ki.anfrage("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    ki.anfrage("Text", ki.QWEN, post=post, schlaf=lambda s: None)
    assert [a["json"]["max_completion_tokens"] for a in post.aufrufe] == [1500, 600]
    assert [a["json"].get("reasoning_effort") for a in post.aufrufe] == ["low", None]


def _fehler400(code, **mehr):
    a = Antwort(400)
    a._body = {"error": {"message": "x", "code": code, **mehr}}
    return a


def test_json_validate_failed_fuehrt_zur_rueckfrage():
    post = poster(_fehler400("json_validate_failed", failed_generation='{"kaputt": '), Antwort(content=json.dumps(GUT)))
    protokoll = []
    assert ki.frage_groq("Text", ki.QWEN, post=post, schlaf=lambda s: None, protokoll=protokoll)["sprache"] == "de"
    assert protokoll[0] == ('{"kaputt": ', ki.QWEN)
    assert post.aufrufe[1]["json"]["messages"][2] == {"role": "assistant", "content": '{"kaputt": '}


def test_anderer_400_nennt_code():
    with pytest.raises(ki.GroqWeg, match="HTTP 400 model_decommissioned"):
        ki.anfrage("Text", ki.GROSS, post=poster(_fehler400("model_decommissioned")), schlaf=lambda s: None)


# --- Warteschlange, Auswertung, Nachfuellen (Task 4) ---

def test_warteschlange_reihenfolge():
    h = "2026-11-12"
    z = [dict(id="alt", text_hash="1", ki_hash=None, ki_modell=None, erstmals_gesehen="2026-11-01"),
         dict(id="neu", text_hash="3", ki_hash=None, ki_modell=None, erstmals_gesehen=h),
         dict(id="grenze", text_hash="7", ki_hash=None, ki_modell=None, erstmals_gesehen="2026-11-10"),
         dict(id="geaendert", text_hash="4", ki_hash="alt", ki_modell=ki.GROSS, erstmals_gesehen="2026-10-01"),
         dict(id="fertig", text_hash="5", ki_hash="5", ki_modell=ki.GROSS, erstmals_gesehen=h),
         dict(id="kaputt", text_hash="6", ki_hash="6", ki_modell="fehler", erstmals_gesehen=h),
         dict(id="b", text_hash="8", ki_hash=None, ki_modell=None, erstmals_gesehen="2026-11-01"),
         dict(id="a", text_hash="9", ki_hash=None, ki_modell=None, erstmals_gesehen="2026-11-01")]
    assert ki.warteschlange(z, h) == [("neu", 1), ("grenze", 1), ("geaendert", 1), ("a", 2), ("alt", 2), ("b", 2)]


@pytest.fixture
def kidb(monkeypatch):
    from scraper import db
    from tests.fakedb import FakeDB
    fake = FakeDB()
    monkeypatch.setattr(db, "_req", fake)

    def stelle(id_, erstmals="2026-11-12", **kw):
        fake.t["jobs"][id_] = {"id": id_, "unternehmen": "acme", "status": "offen", "sichtbar": True, "text": f"Text {id_}",
                               "text_hash": f"h{id_}", "ki_hash": None, "ki_modell": None, "erstmals_gesehen": erstmals, **kw}
    fake.stelle = stelle
    return fake


def test_auswerten_speichert_und_kuerzt(kidb):
    abschn = [{"titel": "Aufgaben", "punkte": ["x" * 500]}, {"titel": "Über uns", "punkte": ["Werbung"]}]
    kidb.stelle("1", abschnitte=abschn)
    gesendet = []
    erg = ki.auswerten("2026-11-12", frage=lambda t, m: gesendet.append((t, m)) or GUT)
    assert erg == {"ausgewertet": 1, "fehler": 0, "wartend": 0}
    assert gesendet == [(ki.kuerze_fuer_ki(abschn, "Text 1"), ki.GROSS)] and "Werbung" not in gesendet[0][0]
    z = kidb.t["jobs"]["1"]
    assert (z["ki_modell"], z["ki_hash"], z["studium"]) == (ki.GROSS, "h1", "ja")


def test_auswerten_ungueltig_wird_fehler(kidb):
    kidb.stelle("1")
    kidb.stelle("2", erstmals="2026-11-11")

    def frage(t, m):
        if t == "Text 1":
            raise ki.Ungueltig("kaputt")
        return GUT
    assert ki.auswerten("2026-11-12", frage=frage) == {"ausgewertet": 1, "fehler": 1, "wartend": 0}
    z = kidb.t["jobs"]["1"]
    assert (z["ki"], z["ki_modell"], z["ki_hash"]) == (None, "fehler", "h1")


@pytest.mark.parametrize("ausnahme", [ki.Erschoepft(ki.GROSS), ki.GroqWeg("HTTP 401")])
def test_auswerten_erschoepft_oder_weg_stoppt(kidb, ausnahme):
    for i in "123":
        kidb.stelle(i)
    aufrufe = []

    def frage(t, m):
        aufrufe.append(t)
        if len(aufrufe) == 2:
            raise ausnahme
        return GUT
    assert ki.auswerten("2026-11-12", frage=frage) == {"ausgewertet": 1, "fehler": 0, "wartend": 2}
    assert len(aufrufe) == 2 and kidb.t["jobs"]["2"]["ki_hash"] is None


def test_auswerten_andere_ausnahme_naechste_stelle(kidb, capsys):
    kidb.stelle("1")
    kidb.stelle("2", erstmals="2026-11-11")

    def frage(t, m):
        if t == "Text 1":
            raise KeyError("x")
        return GUT
    assert ki.auswerten("2026-11-12", frage=frage) == {"ausgewertet": 1, "fehler": 0, "wartend": 1}
    assert "KeyError" in capsys.readouterr().out and kidb.t["jobs"]["1"]["ki_hash"] is None


def test_auswerten_frist(kidb):
    for i in "123":
        kidb.stelle(i)
    zeit = iter([0, 0, 50, 101, 200])
    aufrufe = []
    erg = ki.auswerten("2026-11-12", frage=lambda t, m: aufrufe.append(t) or GUT, frist_s=100, uhr=lambda: next(zeit))
    assert len(aufrufe) == 2 and erg == {"ausgewertet": 2, "fehler": 0, "wartend": 1}


def test_firma_titel_eigener_prompt():
    post = poster(Antwort(content='{"firma": " Acme GmbH ", "titel": "Data Analyst (m/w/d)"}'))
    assert ki.firma_titel("Anzeige", post=post, schlaf=lambda s: None) == ("Acme GmbH", "Data Analyst (m/w/d)")
    body = post.aufrufe[0]["json"]
    assert body["model"] == ki.GROSS and body["messages"][0]["content"] == ki.PROMPTS_FIRMA[ki.GROSS]
    assert body["messages"][1] == {"role": "user", "content": "Anzeige"}
    assert "firma" in ki.PROMPTS_FIRMA[ki.GROSS] and "titel" in ki.PROMPTS_FIRMA[ki.GROSS]


@pytest.mark.parametrize("roh", ['{"firma": null}', '{"firma": 3, "titel": null}', "kein json", "[1]"])
def test_firma_titel_ungueltig(roh):
    with pytest.raises(ki.Ungueltig):
        ki.firma_titel("Anzeige", post=poster(Antwort(content=roh)), schlaf=lambda s: None)


def test_firma_titel_unbekanntes_modell():
    with pytest.raises(ValueError, match="Kein System-Prompt"):
        ki.firma_titel("Anzeige", ki.QWEN, post=poster(), schlaf=lambda s: None)


def test_nachfuellen(kidb):
    kidb.t["applications"] = [
        {"id": "a1", "firma": None, "titel": None, "snapshot_text": "Anzeige 1"},
        {"id": "a2", "firma": None, "titel": None, "snapshot_text": "Anzeige 2"},
        {"id": "a3", "firma": None, "titel": None, "snapshot_text": "Anzeige 3"},
        {"id": "a4", "firma": "Selbst", "titel": None, "snapshot_text": "Anzeige 4"}]
    gesendet = []

    def ft(text):
        gesendet.append(text)
        if text == "Anzeige 2":
            raise ki.Ungueltig("x")
        return ("Acme", "Dev") if text == "Anzeige 1" else (None, None)
    assert ki.nachfuellen(frage_ft=ft) == 1
    assert gesendet == ["Anzeige 1", "Anzeige 2", "Anzeige 3"]
    assert kidb.t["applications"][0] == {"id": "a1", "firma": "Acme", "titel": "Dev", "snapshot_text": "Anzeige 1"}
    assert kidb.t["applications"][2]["firma"] is None


def test_nachfuellen_erschoepft_stoppt(kidb):
    kidb.t["applications"] = [{"id": f"a{i}", "firma": None, "titel": None, "snapshot_text": f"A{i}"} for i in (1, 2)]
    gesendet = []

    def ft(text):
        gesendet.append(text)
        raise ki.Erschoepft(ki.GROSS)
    assert ki.nachfuellen(frage_ft=ft) == 0 and gesendet == ["A1"]


def test_json_validate_failed_ohne_inhalt_ist_ungueltig():
    post = poster(_fehler400("json_validate_failed"), Antwort(content=json.dumps(GUT)))
    with pytest.raises(ki.Ungueltig):
        ki.frage_groq("Text", ki.GROSS, post=post, schlaf=lambda s: None)
    assert len(post.aufrufe) == 1


def test_tageslimit_gross_klein_egal():
    with pytest.raises(ki.Erschoepft):
        ki.anfrage("Text", ki.GROSS, post=poster(Antwort(429, text="Limit Tokens Per Day reached")), schlaf=lambda s: None)


@pytest.mark.parametrize("body", [["kaputt"], "text", {"error": "nur text"}])
def test_400_ohne_dict_ist_groqweg(body):
    a = Antwort(400)
    a._body = body
    with pytest.raises(ki.GroqWeg, match="HTTP 400"):
        ki.anfrage("Text", ki.GROSS, post=poster(a), schlaf=lambda s: None)
