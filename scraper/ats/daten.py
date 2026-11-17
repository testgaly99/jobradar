"""Gemeinsame Formprüfung der vorhandenen JSON-Adapter, ohne Abrufe."""


def objekt_liste(daten, feld):
    """Keine Liste: ganze Antwort kaputt. Einzelne Nicht-Objekte werden zur Übersprungen-Meldung."""
    if not isinstance(daten, dict) or not isinstance(daten.get(feld), list):
        raise ValueError(f"ATS-Antwort benötigt Liste: {feld}")
    return [e if isinstance(e, dict) else {"uebersprungen": "kein Objekt"} for e in daten[feld]]


def stellen_id(wert):
    """None bei ungültiger ID: run.py überspringt die Stelle dann als "ungültige ID"."""
    if isinstance(wert, bool) or not isinstance(wert, (str, int)) or not str(wert).strip():
        return None
    return str(wert)
