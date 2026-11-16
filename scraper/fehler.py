"""Öffentliche Diagnose ohne beliebige Ausnahmetexte, URLs oder Antwortkörper."""
import re


def _status(wert):
    return wert if type(wert) is int and 100 <= wert <= 599 else None


def _code(wert):
    if isinstance(wert, str) and (re.fullmatch(r"(?:[0-9A-Z]{5}|PGRST\d{3})", wert)
                               or wert in {"model_decommissioned", "model_not_found", "invalid_api_key", "rate_limit_exceeded"}):
        return wert
    return None


class DatenbankFehler(RuntimeError):
    def __init__(self, method, pfad, status=None, code=None, ursache=None):
        self.status, self.code = _status(status), _code(code)
        methode = method if method in {"GET", "POST", "PATCH", "DELETE"} else "HTTP"
        ziel = pfad if pfad in {"jobs", "companies", "applications", "laeufe", "rpc/snapshot_nachruesten"} else "Abfrage"
        klasse = ursache if isinstance(ursache, str) and re.fullmatch(r"[A-Za-z_]{1,64}", ursache) else ""
        # Das bisherige Statusformat bleibt für die vorhandenen Migrations-Fallbacks erhalten.
        super().__init__(f"Supabase {methode} {ziel}: {self.status or '-'} {self.code or '-'} {klasse}".rstrip())


def kurzfehler(e, _tiefe=0):
    if isinstance(e, DatenbankFehler):
        return f"{type(e).__name__}: {e}"
    teile = [type(e).__name__]
    status = _status(getattr(e, "status", None)) or _status(getattr(getattr(e, "response", None), "status_code", None))
    if status:
        teile.append(f"HTTP {status}")
    code = _code(getattr(e, "code", None))
    if code:
        teile.append(code)
    ursache = e.__cause__
    if ursache is not None and ursache is not e and _tiefe < 2:
        teile.append("Ursache " + kurzfehler(ursache, _tiefe + 1))
    return ": ".join(teile)
