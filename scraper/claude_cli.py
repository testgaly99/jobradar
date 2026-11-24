"""Plan 6a, Task 4: das unveränderte Claude-Code-Programm (`claude -p`, Abo-Token) aufrufen.

Kein Agent SDK, keine eigenen API-Aufrufe (Abo-Bedingungen, docs/plans/2026-11-16-cv-abgleich.md). Gibt nie Prompt
oder Antwort aus. Jedes `is_error` beendet den Lauf: laut offenem Fehlerbericht meldet ein Ratenlimit sonst
Exitcode 0 mit `subtype: success` (Agentenprotokoll 2026-11-24, Task 0).
"""
import json
import re
import subprocess


class AboLimit(Exception):
    """Abo-Kontingent erschöpft: sofort aufhören, Rest in der nächsten Nacht."""


class ClaudeFehler(Exception):
    """Sonstiger Fehler von Claude Code: ebenfalls aufhören."""


class UngueltigeAntwort(Exception):
    """Claude Code lief, die Antwort ist aber kein JSON: nur diesen Aufruf als ungeprüft werten (Review Focus 3)."""


_LIMIT = re.compile(r'limit|rate|usage|quota|overloaded|429', re.I)


def frage(prompt, bilder=(), run=subprocess.run, timeout=900):
    cmd = ['claude', '-p', '--model', 'haiku', '--output-format', 'json', '--no-session-persistence']
    if bilder:
        cmd += ['--tools', 'Read', '--allowedTools', ','.join(f'Read({p})' for p in bilder)]
    else:
        cmd += ['--tools', '']
    try:
        r = run(cmd, input=prompt, capture_output=True, text=True, encoding='utf-8', timeout=timeout)
    except (OSError, subprocess.SubprocessError) as e:
        raise ClaudeFehler(f'Claude Code nicht ausführbar ({type(e).__name__})') from None
    try:
        huelle = json.loads(r.stdout or '')
    except ValueError:
        huelle = None
    meldung = (str(huelle.get('result', '')) if isinstance(huelle, dict) else '') + ' ' + (r.stderr or '')
    if r.returncode != 0 or not isinstance(huelle, dict) or huelle.get('is_error'):
        if _LIMIT.search(meldung):
            raise AboLimit('Abo-Limit erreicht')
        raise ClaudeFehler(f'Claude Code meldet einen Fehler (Exitcode {r.returncode})')
    text = re.sub(r'^\s*```(?:json)?\s*|\s*```\s*$', '', str(huelle.get('result', '')))
    try:
        return json.loads(text)
    except ValueError:
        raise UngueltigeAntwort('Antwort ist kein JSON') from None
