"""Groq-Aufruf fuer die Stellen-Zusammenfassung. HTTP laeuft ueber das Argument `post`, damit Tests ihn ersetzen koennen."""
import json
import os
import re
import time
from datetime import date, timedelta
from pathlib import Path

import requests

from . import db
from .fehler import kurzfehler

GROSS = "openai/gpt-oss-120b"
QWEN = "qwen/qwen3.8-27b"
URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_ZEICHEN = 12000
VERSUCHE = 5
# Jedes Modell hat seinen eigenen, darauf abgestimmten System-Prompt
PROMPTS = {m: (Path(__file__).parent / datei).read_text(encoding="utf-8")
           for m, datei in ((GROSS, "ki_prompt.md"), (QWEN, "ki_prompt_qwen.md"))}
# Teil C (Firma/Titel aus eingefuegter Anzeige): eigener kurzer Prompt, bisher nur fuer das grosse Modell geprueft
PROMPTS_FIRMA = {GROSS: (Path(__file__).parent / "ki_prompt_firma.md").read_text(encoding="utf-8")}
# qwen lehnt bei Groq (Free Tier) Anfragen ab, deren erwartete Ausgabe ueber 1000 Tokens/Minute liegt
MAX_AUSGABE = {QWEN: 600}  # ohne Denken reichen ~250-400 Tokens; die Grenze zaehlt voll gegen das Minutenlimit


class Erschoepft(Exception):
    def __init__(self, modell):
        super().__init__(modell)
        self.modell = modell


class GroqWeg(Exception):
    def __init__(self, text, status=None, code=None):
        super().__init__(text)
        self.status = status
        self.code = code


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


def anfrage(text, modell, post=requests.post, schlaf=time.sleep, prompts=PROMPTS):
    """Schickt den Text (oder eine fertige Nachrichtenliste ohne System-Prompt) an Groq
    und gibt (rohe Antwort, Modellname laut Groq) zurueck."""
    if modell not in prompts:
        raise ValueError(f"Kein System-Prompt für Modell {modell!r} (bekannt: {', '.join(prompts)})")
    db._lade_env()
    nachrichten = [{"role": "user", "content": text[:MAX_ZEICHEN]}] if isinstance(text, str) else text
    body = {"model": modell, "messages": [{"role": "system", "content": prompts[modell]}, *nachrichten],
            "response_format": {"type": "json_object"}, "temperature": 0.2,
            "max_completion_tokens": MAX_AUSGABE.get(modell, 1500)}
    if modell.startswith("openai/gpt-oss"):
        body["reasoning_effort"] = "low"  # qwen denkt ohne die Angabe nicht mit; mit ihr sprengt das Denken die Ausgabegrenze
    kopf = {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"}
    pausen = [5, 15, 30]  # Wartezeiten bei Verbindungsabbruch/Timeout/5xx, danach GroqWeg
    for versuch in range(1, VERSUCHE + 1):
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
            if re.search(r"per day|\b[TR]PD\b", r.text, re.I):  # nur das Tageslimit beendet die Auswertung; Minutenlimits sind voruebergehend
                raise Erschoepft(modell)
            try:
                warte = float(r.headers.get("retry-after", 10))
            except ValueError:
                warte = 10
            if versuch < VERSUCHE:  # nach dem letzten Versuch nicht mehr warten
                schlaf(min(warte, 60))
            continue
        if r.status_code == 413:  # eine einzelne Stelle ist zu gross: ueberspringen (Ungueltig), nicht abbrechen
            raise Ungueltig("Anfrage zu groß für das Modell (HTTP 413).")
        if r.status_code >= 400:
            try:
                fehler = r.json()["error"]
            except (ValueError, KeyError, TypeError, IndexError):
                fehler = {}
            if not isinstance(fehler, dict):
                fehler = {}
            # Groq verwirft Ausgaben, die kein JSON sind, mit 400; das ist eine ungueltige Antwort (Rueckfrage), kein Ausfall
            if fehler.get("code") == "json_validate_failed":
                if not fehler.get("failed_generation"):  # ohne Inhalt gibt es nichts zum Zurueckfragen
                    raise Ungueltig("Groq hat keine Antwort geliefert (json_validate_failed ohne Inhalt).")
                return fehler["failed_generation"], modell
            raise GroqWeg(f"HTTP {r.status_code} {fehler.get('code', '')}".strip(), r.status_code, fehler.get("code"))
        j = r.json()
        return j["choices"][0]["message"]["content"] or "", j.get("model", modell)
    raise GroqWeg("HTTP 429 (Minutenlimit)", 429)  # nie den Rohtext: er enthaelt die Organisations-ID


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
        try:
            protokoll.append(anfrage(nachrichten, modell, post, schlaf))
        except GroqWeg as e:  # Groq lehnt die Rueckfrage ab (z. B. 400): nur diese Stelle ist kaputt, nicht Groq
            if runde and e.status and 400 <= e.status < 500 and e.status not in (401, 429):
                raise Ungueltig(f"Groq lehnt die Rückfrage ab ({e}).") from e
            raise
        roh = protokoll[-1][0]
        try:
            return _auswerten(roh)
        except Ungueltig as e:
            if runde:
                raise
            nachrichten += [{"role": "assistant", "content": roh},
                            {"role": "user", "content": f"{e} Antworte erneut nur mit dem korrigierten JSON."}]


def firma_titel(text, modell=GROSS, post=requests.post, schlaf=time.sleep):
    """Teil C: (firma, titel) aus einer eingefuegten Anzeige; je None, wenn sie nicht drinsteht."""
    roh = anfrage(text, modell, post, schlaf, prompts=PROMPTS_FIRMA)[0]
    try:
        j = json.loads(roh)
    except (ValueError, TypeError) as e:
        raise Ungueltig("Die Antwort ist kein gültiges JSON.", roh) from e
    if not isinstance(j, dict) or set(j) != {"firma", "titel"}:
        raise Ungueltig("Falsche Schlüssel.", roh)
    if not all(v is None or isinstance(v, str) for v in j.values()):
        raise Ungueltig("firma/titel müssen Text oder null sein.", roh)
    return (j["firma"] or "").strip() or None, (j["titel"] or "").strip() or None


def warteschlange(zeilen, heute):
    """[(id, gruppe)] aller Stellen ohne aktuelle Auswertung. Gruppe 1: neu (letzte 2 Tage) oder Text geaendert,
    Gruppe 2: uebriger Rueckstand. Je Gruppe neueste zuerst, dann id."""
    grenze = (date.fromisoformat(heute) - timedelta(days=2)).isoformat()
    offen = [z for z in zeilen if z["ki_hash"] != z["text_hash"]]  # gleicher Hash = fertig, auch bei ki_modell "fehler"
    gruppe = {z["id"]: 1 if (z["erstmals_gesehen"] or "") >= grenze or z["ki_hash"] is not None else 2 for z in offen}
    offen.sort(key=lambda z: z["id"])
    offen.sort(key=lambda z: z["erstmals_gesehen"] or "", reverse=True)  # stabil: id-Reihenfolge bleibt
    offen.sort(key=lambda z: gruppe[z["id"]])
    return [(z["id"], gruppe[z["id"]]) for z in offen]


def auswerten(heute, frage=frage_groq, frist_s=5400, uhr=time.monotonic):
    """Wertet die Warteschlange mit dem grossen Modell aus, bis sie leer ist, das Tageskontingent erschoepft ist,
    Groq ausfaellt oder frist_s um ist. Eine einzelne Stelle kippt nie den Lauf."""
    start, zeilen = uhr(), db.ki_kandidaten()
    hashes, schlange = {z["id"]: z["text_hash"] for z in zeilen}, warteschlange(zeilen, heute)
    erg = {"ausgewertet": 0, "fehler": 0}
    for job_id, _ in schlange:
        if uhr() - start > frist_s:
            print("Hinweis: KI-Frist abgelaufen, Rest folgt beim nächsten Lauf.")
            break
        try:
            text, abschnitte = db.lade_anzeige(job_id)
            if not text:
                continue
            try:
                ergebnis = frage(kuerze_fuer_ki(abschnitte, text), GROSS)
            except Ungueltig:
                db.speichere_ki(job_id, None, "fehler", hashes[job_id])
                erg["fehler"] += 1
                continue
            db.speichere_ki(job_id, ergebnis, GROSS, hashes[job_id])
            erg["ausgewertet"] += 1
        except (Erschoepft, GroqWeg) as e:
            print(f"Hinweis: KI-Auswertung beendet ({kurzfehler(e)}), Rest folgt beim nächsten Lauf.")
            break
        except Exception as e:  # nur diese Stelle auslassen; sie bleibt in der Warteschlange
            print(f"Hinweis: KI-Auswertung fehlgeschlagen: {kurzfehler(e)}")
    erg["wartend"] = len(schlange) - erg["ausgewertet"] - erg["fehler"]
    return erg


def nachfuellen(frage_ft=firma_titel, frist_s=5400, uhr=time.monotonic):
    """Teil C: fehlende Firma/Titel nachfüllen, bis Frist/Kontingent erreicht; Anzahl Erfolge.
    Eine laufende Frage wird noch verarbeitet, danach startet keine weitere bei abgelaufener Frist.
    """
    start, n = uhr(), 0
    for a in db.bewerbungen_ohne_firma():
        if uhr() - start >= frist_s:
            print("Hinweis: Nachfüll-Frist abgelaufen, Rest folgt beim nächsten Lauf.")
            break
        try:
            firma, titel = frage_ft(a["snapshot_text"])
        except (Erschoepft, GroqWeg) as e:
            print(f"Hinweis: Nachfüllen beendet ({kurzfehler(e)}).")
            break
        except Exception as e:  # Ungueltig o. Ae.: der naechste Lauf versucht es erneut
            print(f"Hinweis: Nachfüllen fehlgeschlagen: {kurzfehler(e)}")
            continue
        if firma or titel:
            db.setze_firma_titel(a["id"], firma, titel)
            n += 1
    return n
