"""Groq-Aufruf fuer die Stellen-Zusammenfassung. HTTP laeuft ueber das Argument `post`, damit Tests ihn ersetzen koennen."""
import json
import os
import re
import time
from pathlib import Path

import requests

from . import db

GROSS = "openai/gpt-oss-120b"
QWEN = "qwen/qwen3.8-27b"
URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_ZEICHEN = 12000
VERSUCHE = 5
# Jedes Modell hat seinen eigenen, darauf abgestimmten System-Prompt
PROMPTS = {m: (Path(__file__).parent / datei).read_text(encoding="utf-8")
           for m, datei in ((GROSS, "ki_prompt.md"), (QWEN, "ki_prompt_qwen.md"))}
# qwen lehnt bei Groq (Free Tier) Anfragen ab, deren erwartete Ausgabe ueber 1000 Tokens/Minute liegt
MAX_AUSGABE = {QWEN: 600}  # ohne Denken reichen ~250-400 Tokens; die Grenze zaehlt voll gegen das Minutenlimit


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


SCHLUESSEL = ("aufgaben", "rahmen", "abschluss", "erfahrung", "muss", "benefits", "studium", "taetigkeit", "sprache")
MIN_GEKUERZT = 400

# Ueberschriften mit Firmenwerbung oder Rechtstext. Ganze Ueberschrift (fullmatch, klein, ohne Satzzeichen am Ende),
# damit "Kundenkontakt", "Aufgabenvielfalt" oder "Company Benefits" erhalten bleiben.
_WEG = re.compile(
    r"(wir )?über uns|about us|wer wir sind|who we are"
    r"|((das|unser) )?(unternehmen(sprofil)?|firma)|((the|our) )?company( profile)?"
    r"|((our|unser|unsere) )?(datenschutz|privacy|data protection|impressum|chancengleichheit|gleichstellung"
    r"|equal (employment )?opportunit|diversity|diversität).*"
    r"|kontakt|contact( us)?|(ihr|dein|your) (kontakt|contact)|ansprechpartner(in)?"
    # "Über <Firma>" / "About <Company>"; alles zu Stelle, Profil, Aufgaben oder Team bleibt
    r"|(über|about) (?!.*\b(stelle|job|rolle|role|position|praktikum|internship|opportunity|profil|profile"
    r"|aufgaben?|tasks?|team|you|dich|dir|ihnen|ihr|your)\b).+")


def kuerze_fuer_ki(abschnitte: list | None, text: str) -> str:
    """Nur die fuer die Zusammenfassung relevanten Abschnitte. Ganzer Text, wenn es keine Abschnitte gibt, weniger als
    MIN_GEKUERZT Zeichen uebrig bleiben oder mehr als die Haelfte der Punkte wegfiele (Sicherheitsnetz gegen Fehlgriffe)."""
    abschnitte = abschnitte or []
    behalten = [a for a in abschnitte if not _WEG.fullmatch(a["titel"].lower().strip().rstrip(":!?. "))]
    alle, uebrig = (sum(len(a["punkte"]) for a in x) for x in (abschnitte, behalten))
    kurz = "\n\n".join(a["titel"] + ":\n" + "\n".join(f"- {p}" for p in a["punkte"]) for a in behalten)
    return kurz if len(kurz) >= MIN_GEKUERZT and uebrig * 2 >= alle else text


# Die Meldungen gehen bei der Rueckfrage woertlich an Groq, daher kurz und konkret.
def _liste(roh, name, lo, hi):
    v = roh[name]
    if not isinstance(v, list) or not all(isinstance(x, str) and x.strip() for x in v):
        raise Ungueltig(f"{name} muss eine Liste aus nicht-leeren Texten sein.")
    if not lo <= len(v) <= hi:
        raise Ungueltig(f"{name} hat {len(v)} Einträge, erlaubt sind {lo}–{hi}.")
    return [x.strip() for x in v]


def _text(roh, name):
    v = roh[name]
    if v is not None and not (isinstance(v, str) and v.strip()):
        raise Ungueltig(f"{name} muss ein nicht-leerer Text oder null sein.")
    return v and v.strip()


def pruefe(roh: dict) -> dict:
    if not isinstance(roh, dict):
        raise Ungueltig("Die Antwort muss ein JSON-Objekt sein.")
    fehlt, zuviel = [k for k in SCHLUESSEL if k not in roh], [k for k in roh if k not in SCHLUESSEL]
    if fehlt or zuviel:
        raise Ungueltig(f"Falsche Schlüssel (fehlend: {', '.join(fehlt) or '-'}; überzählig: {', '.join(zuviel) or '-'}).")
    erg = {"aufgaben": _liste(roh, "aufgaben", 3, 5), "rahmen": _liste(roh, "rahmen", 0, 4),
           "abschluss": _text(roh, "abschluss"), "erfahrung": _text(roh, "erfahrung"),
           "muss": _liste(roh, "muss", 0, 3), "benefits": _liste(roh, "benefits", 0, 2)}
    for name, erlaubt in (("studium", ("ja", "nein", "unklar")), ("taetigkeit", ("anspruchsvoll", "einfach")),
                          ("sprache", ("de", "en"))):
        if roh[name] not in erlaubt:
            werte = ", ".join(f'"{w}"' for w in erlaubt)
            raise Ungueltig(f"{name} ist {json.dumps(roh[name], ensure_ascii=False)}, erlaubt sind: {werte}.")
        erg[name] = roh[name]
    return erg


def anfrage(text, modell, post=requests.post, schlaf=time.sleep):
    """Schickt den Text (oder eine fertige Nachrichtenliste ohne System-Prompt) an Groq
    und gibt (rohe Antwort, Modellname laut Groq) zurueck."""
    if modell not in PROMPTS:
        raise ValueError(f"Kein System-Prompt für Modell {modell!r} (bekannt: {', '.join(PROMPTS)})")
    db._lade_env()
    nachrichten = [{"role": "user", "content": text[:MAX_ZEICHEN]}] if isinstance(text, str) else text
    body = {"model": modell, "messages": [{"role": "system", "content": PROMPTS[modell]}, *nachrichten],
            "response_format": {"type": "json_object"}, "temperature": 0.2,
            "max_completion_tokens": MAX_AUSGABE.get(modell, 1500)}
    if modell.startswith("openai/gpt-oss"):
        body["reasoning_effort"] = "low"  # qwen denkt ohne die Angabe nicht mit; mit ihr sprengt das Denken die Ausgabegrenze
    kopf = {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"}
    letzte429 = ""
    pausen = [5, 15, 30]  # Wartezeiten bei Verbindungsabbruch/Timeout/5xx, danach GroqWeg
    for _ in range(VERSUCHE):
        try:
            r = post(URL, headers=kopf, json=body, timeout=60)
            if r.status_code >= 500:
                raise requests.ConnectionError(f"HTTP {r.status_code}")
        except requests.RequestException as e:
            if not pausen:
                raise GroqWeg(type(e).__name__) from e
            schlaf(pausen.pop(0))
            continue
        if r.status_code == 429:
            if re.search(r"per day|\b[TR]PD\b", r.text):  # nur das Tageslimit beendet die Auswertung; Minutenlimits sind voruebergehend
                raise Erschoepft(modell)
            letzte429 = r.text[:200]
            try:
                warte = float(r.headers.get("retry-after", 10))
            except ValueError:
                warte = 10
            schlaf(min(warte, 60))
            continue
        if r.status_code == 413:  # eine einzelne Stelle ist zu gross: ueberspringen (Ungueltig), nicht abbrechen
            raise Ungueltig("Anfrage zu groß für das Modell (HTTP 413).")
        if r.status_code >= 400:
            try:
                fehler = r.json().get("error") or {}
            except ValueError:
                fehler = {}
            # Groq verwirft Ausgaben, die kein JSON sind, mit 400; das ist eine ungueltige Antwort (Rueckfrage), kein Ausfall
            if fehler.get("code") == "json_validate_failed":
                return fehler.get("failed_generation", ""), modell
            raise GroqWeg(f"HTTP {r.status_code} {fehler.get('code', '')}".strip())
        j = r.json()
        return j["choices"][0]["message"]["content"], j.get("model", modell)
    raise GroqWeg(f"HTTP 429 {letzte429}".strip())


def _auswerten(roh):
    try:
        return pruefe(json.loads(roh))
    except (ValueError, TypeError) as e:
        raise Ungueltig(f"Die Antwort ist kein gültiges JSON ({e}).", roh) from e
    except Ungueltig as e:
        e.roh = roh
        raise


def frage_groq(text, modell, post=requests.post, schlaf=time.sleep, protokoll=None):
    """Ist die Antwort ungueltig, wird Groq einmal im selben Gespraech mit dem konkreten Fehler zurueckgefragt.
    `protokoll` (Liste) bekommt jede Antwort als (roh, modell), z. B. fuer die Probe-Seite."""
    protokoll = [] if protokoll is None else protokoll
    nachrichten = [{"role": "user", "content": text[:MAX_ZEICHEN]}]
    for runde in range(2):
        protokoll.append(anfrage(nachrichten, modell, post, schlaf))
        roh = protokoll[-1][0]
        try:
            return _auswerten(roh)
        except Ungueltig as e:
            if runde:
                raise
            nachrichten += [{"role": "assistant", "content": roh},
                            {"role": "user", "content": f"{e} Antworte erneut nur mit dem korrigierten JSON."}]
