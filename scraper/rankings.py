"""Prüft vorbereitete Ranglisten-Daten, ohne Dateien oder Dienste anzusprechen.

Quellenwahl, Erlaubnisprüfung und späterer transaktionaler Import erfolgen getrennt.
Eine gültige Eingabe erteilt keine Nutzungserlaubnis und aktiviert nichts von selbst.
"""
import calendar
from datetime import date
import re
import unicodedata
from urllib.parse import unquote, urlsplit


_ID = re.compile(r"[a-z0-9][a-z0-9_-]{0,79}\Z")
_DATUM = re.compile(r"\d{4}-\d{2}-\d{2}\Z", re.ASCII)


def _text(wert, feld, limit):
    if (not isinstance(wert, str) or not wert.strip() or len(wert) > limit
            or any(unicodedata.category(c).startswith("C") for c in wert)):
        raise ValueError(f"{feld}: nichtleerer Text mit höchstens {limit} Zeichen erwartet")
    return wert.strip()


def _kennung(wert, feld):
    if not isinstance(wert, str) or not _ID.fullmatch(wert):
        raise ValueError(f"{feld}: einfache Kennung mit höchstens 80 Zeichen erwartet")
    return wert


def _datum(wert, feld):
    if not isinstance(wert, str) or not _DATUM.fullmatch(wert):
        raise ValueError(f"{feld}: Datum als JJJJ-MM-TT erwartet")
    try:
        return date.fromisoformat(wert)
    except ValueError:
        raise ValueError(f"{feld}: ungültiges Datum") from None


def _flag(wert, feld):
    if type(wert) is not bool:
        raise ValueError(f"{feld}: true oder false erwartet")
    return wert


def _quelle(wert):
    if not isinstance(wert, str) or not wert or len(wert) > 2000:
        raise ValueError("quelle_url: HTTPS-Adresse mit höchstens 2000 Zeichen erwartet")
    # urlsplit entfernt einzelne Steuerzeichen selbst. Deshalb bereits vor dem Parsen
    # prüfen, auch nach Prozent-Dekodierung (z. B. %0a), und Browser-Backslashes verbieten.
    if any(c.isspace() or unicodedata.category(c).startswith("C") or c in '\\<>"`'
           for c in unquote(wert)):
        raise ValueError("quelle_url: unerlaubte Zeichen")
    try:
        url = urlsplit(wert)
        if (url.scheme != "https" or not url.hostname or url.username is not None
                or url.password is not None or not url.netloc or url.port == 0):
            raise ValueError()
        # Validiert unter anderem nicht geschlossene IPv6-Klammern und ungültige Ports.
        host = url.hostname.encode("idna").decode("ascii")
        if ":" not in host and not re.fullmatch(r"[a-z0-9][a-z0-9.-]*", host):
            raise ValueError()
        netloc = f"[{host}]" if ":" in host else host
        if url.port is not None:
            netloc += f":{url.port}"
    except (ValueError, UnicodeError):
        raise ValueError("quelle_url: gültige HTTPS-Adresse ohne Zugangsdaten erwartet") from None
    normalisiert = url._replace(scheme="https", netloc=netloc).geturl()
    if len(normalisiert) > 2000:
        raise ValueError("quelle_url: normalisierte HTTPS-Adresse ist länger als 2000 Zeichen")
    return normalisiert


def pruefe_ausgabe(daten, bekannte_firmen):
    """Gibt neue Zeilen für ranking_listen, ranking_ausgaben und ranking_firmen zurück.

    Eingabe: {liste: {id, name, herausgeber, aktiv?}, ausgabe: {id, jahr,
    veroeffentlicht_am, geprueft_am, quelle_url, lizenz, gueltig_bis, freigegeben?},
    firmen: [{unternehmen, rang?}]}. Daten sind ISO-Datumsstrings; bekannte_firmen
    enthält die ausdrücklich bekannten Firmennamen. Kein unscharfer Namensabgleich.
    aktiv/freigegeben sind standardmäßig false. Ungültige Eingaben ergeben ValueError.
    Weder Eingabe noch Stammdaten werden verändert; Schreiben gehört nicht hierher.
    """
    if not isinstance(daten, dict):
        raise ValueError("Ranglisten-Daten: Objekt erwartet")
    liste, ausgabe, firmen = daten.get("liste"), daten.get("ausgabe"), daten.get("firmen")
    if not isinstance(liste, dict) or not isinstance(ausgabe, dict):
        raise ValueError("liste und ausgabe: Objekte erwartet")
    if not isinstance(firmen, list):
        raise ValueError("firmen: Liste erwartet")

    liste_id = _kennung(liste.get("id"), "liste.id")
    ausgabe_id = _kennung(ausgabe.get("id"), "ausgabe.id")
    jahr = ausgabe.get("jahr")
    if type(jahr) is not int or not 1 <= jahr <= 9999:
        raise ValueError("jahr: ganze Jahreszahl zwischen 1 und 9999 erwartet")
    veroeffentlicht = _datum(ausgabe.get("veroeffentlicht_am"), "veroeffentlicht_am")
    geprueft = _datum(ausgabe.get("geprueft_am"), "geprueft_am")
    gueltig_bis = _datum(ausgabe.get("gueltig_bis"), "gueltig_bis")
    # Kalendermonate, nicht 13 * 30 Tage; Monatsende wird wie in PostgreSQL gekappt.
    monate = veroeffentlicht.year * 12 + veroeffentlicht.month - 1 + 13
    ende_jahr, ende_monat = divmod(monate, 12)
    ende_monat += 1
    max_tag = calendar.monthrange(ende_jahr, ende_monat)[1]
    max_ende = (ende_jahr, ende_monat, min(veroeffentlicht.day, max_tag))
    if not veroeffentlicht < gueltig_bis or (gueltig_bis.year, gueltig_bis.month, gueltig_bis.day) > max_ende:
        raise ValueError("gueltig_bis: nach Veröffentlichung und höchstens 13 Monate danach erwartet")
    if geprueft < veroeffentlicht or geprueft >= gueltig_bis:
        raise ValueError("geprueft_am: ab Veröffentlichung und vor gueltig_bis erwartet")

    listen_zeile = {"id": liste_id, "name": _text(liste.get("name"), "name", 200),
                    "herausgeber": _text(liste.get("herausgeber"), "herausgeber", 200),
                    "aktiv": _flag(liste.get("aktiv", False), "aktiv")}
    ausgabe_zeile = {
        "id": ausgabe_id, "liste_id": liste_id, "jahr": jahr,
        "veroeffentlicht_am": veroeffentlicht.isoformat(), "geprueft_am": geprueft.isoformat(),
        "quelle_url": _quelle(ausgabe.get("quelle_url")),
        "lizenz": _text(ausgabe.get("lizenz"), "lizenz", 1000),
        "gueltig_bis": gueltig_bis.isoformat(),
        "freigegeben": _flag(ausgabe.get("freigegeben", False), "freigegeben"),
    }
    gesehen, zuordnungen = set(), []
    for firma in firmen:
        if not isinstance(firma, dict):
            raise ValueError("firmen: je Eintrag ein Objekt erwartet")
        name = firma.get("unternehmen")
        if not isinstance(name, str) or name not in bekannte_firmen:
            raise ValueError("unternehmen: exakt bekannten Firmennamen erwartet")
        if name in gesehen:
            raise ValueError("unternehmen: doppelt in derselben Ausgabe")
        rang = firma.get("rang")
        if rang is not None and (type(rang) is not int or not 1 <= rang <= 2147483647):
            raise ValueError("rang: positive Ganzzahl oder null erwartet")
        gesehen.add(name)
        zuordnungen.append({"ausgabe_id": ausgabe_id, "unternehmen": name, "rang": rang})
    return {"ranking_listen": [listen_zeile], "ranking_ausgaben": [ausgabe_zeile],
            "ranking_firmen": zuordnungen}
