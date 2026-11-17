"""Gemeinsame Formprüfung der vorhandenen JSON-Adapter, ohne Abrufe."""


def objekt_liste(daten, feld):
    if not isinstance(daten, dict) or not isinstance(daten.get(feld), list):
        raise ValueError(f"ATS-Antwort benötigt Liste: {feld}")
    if not all(isinstance(eintrag, dict) for eintrag in daten[feld]):
        raise ValueError(f"ATS-Liste enthält ungültigen Eintrag: {feld}")
    return daten[feld]


def stellen_id(wert):
    """None bei ungültiger ID: run.py überspringt die Stelle dann als "ungültige ID"."""
    if isinstance(wert, bool) or not isinstance(wert, (str, int)) or not str(wert).strip():
        return None
    return str(wert)
