"""Groq-Aufruf fuer die Stellen-Zusammenfassung. HTTP laeuft ueber das Argument `post`, damit Tests ihn ersetzen koennen."""
import json
import os
import time
from pathlib import Path

import requests

from . import db

GROSS = "openai/gpt-oss-120b"
KLEIN = "openai/gpt-oss-20b"
URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_ZEICHEN = 12000
VERSUCHE = 5
PROMPT = (Path(__file__).parent / "ki_prompt.md").read_text(encoding="utf-8")


class Erschoepft(Exception):
    def __init__(self, modell):
        super().__init__(modell)
        self.modell = modell


class GroqWeg(Exception):
    pass


class Ungueltig(Exception):
    def __init__(self, text, roh=""):
        super().__init__(text)
        self.roh = roh


def _liste(roh, name, lo, hi):
    v = roh.get(name)
    if not isinstance(v, list) or not all(isinstance(x, str) and x.strip() for x in v):
        raise Ungueltig(f"{name}: keine Liste aus Texten")
    v = [x.strip() for x in v]
    if not lo <= len(v) <= hi:
        raise Ungueltig(f"{name}: {len(v)} Eintraege, erlaubt {lo}-{hi}")
    return v


def pruefe(roh: dict) -> dict:
    if not isinstance(roh, dict):
        raise Ungueltig("kein Objekt")
    erg = {"aufgaben": _liste(roh, "aufgaben", 3, 5), "muss": _liste(roh, "muss", 0, 3)}
    for name, erlaubt in (("studium", ("ja", "nein", "unklar")), ("taetigkeit", ("anspruchsvoll", "einfach")),
                          ("sprache", ("de", "en"))):
        if roh.get(name) not in erlaubt:
            raise Ungueltig(f"{name}: {roh.get(name)!r}")
        erg[name] = roh[name]
    return erg


def anfrage(text, modell, post=requests.post, schlaf=time.sleep):
    """Schickt den Text an Groq und gibt (rohe Antwort, Modellname laut Groq) zurueck."""
    db._lade_env()
    body = {"model": modell, "messages": [{"role": "system", "content": PROMPT},
                                          {"role": "user", "content": text[:MAX_ZEICHEN]}],
            "response_format": {"type": "json_object"}, "temperature": 0.2,
            "max_completion_tokens": 1500, "reasoning_effort": "low"}
    kopf = {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"}
    for _ in range(VERSUCHE):
        try:
            r = post(URL, headers=kopf, json=body, timeout=60)
        except requests.RequestException as e:
            raise GroqWeg(type(e).__name__) from e
        if r.status_code == 429:
            if "per day" in r.text:
                raise Erschoepft(modell)
            try:
                warte = float(r.headers.get("retry-after", 10))
            except ValueError:
                warte = 10
            schlaf(min(warte, 60))
            continue
        if r.status_code >= 400:
            raise GroqWeg(f"HTTP {r.status_code}")
        j = r.json()
        return j["choices"][0]["message"]["content"], j.get("model", modell)
    raise Erschoepft(modell)


def frage_groq(text, modell, post=requests.post, schlaf=time.sleep):
    roh, _ = anfrage(text, modell, post, schlaf)
    try:
        return pruefe(json.loads(roh))
    except (ValueError, TypeError) as e:
        raise Ungueltig(f"kein JSON: {e}", roh) from e
    except Ungueltig as e:
        e.roh = roh
        raise
