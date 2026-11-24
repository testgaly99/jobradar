"""Plan 6a, Task 4: Aufruf des unveränderten Claude-Code-Programms (Abo-Token), nur mit Attrappe."""
import json
from types import SimpleNamespace

import pytest

from scraper import claude_cli

GEHEIM = 'Lebenslauf von Max Muster mit Gehalt 12345'


def _run(stdout='', returncode=0, stderr='', merken=None):
    def run(cmd, **kw):
        if merken is not None:
            merken.append((cmd, kw))
        return SimpleNamespace(stdout=stdout, stderr=stderr, returncode=returncode)
    return run


def _huelle(result, is_error=False, subtype='success'):
    return json.dumps({'type': 'result', 'subtype': subtype, 'is_error': is_error, 'result': result})


def test_aufruf_haiku_json_ohne_werkzeuge_prompt_ueber_stdin(capsys):
    aufrufe = []
    antwort = claude_cli.frage(GEHEIM, run=_run(_huelle('```json\n{"ok": 1}\n```'), merken=aufrufe))
    cmd, kw = aufrufe[0]
    assert antwort == {'ok': 1}
    assert cmd[:2] == ['claude', '-p'] and cmd[cmd.index('--model') + 1] == 'haiku'
    assert cmd[cmd.index('--output-format') + 1] == 'json' and cmd[cmd.index('--tools') + 1] == ''
    assert '--no-session-persistence' in cmd and GEHEIM not in ' '.join(cmd) and kw['input'] == GEHEIM
    assert GEHEIM not in capsys.readouterr().out


def test_mit_datei_nur_lesen_dieser_datei(tmp_path):
    aufrufe, datei = [], tmp_path / 'cv.pdf'
    claude_cli.frage('Lies', bilder=[datei], run=_run(_huelle('[]'), merken=aufrufe))
    cmd = aufrufe[0][0]
    assert cmd[cmd.index('--tools') + 1] == 'Read' and cmd[cmd.index('--allowedTools') + 1] == f'Read({datei})'


@pytest.mark.parametrize('stdout,code', [
    (_huelle('API Error: Rate limit reached', is_error=True), 0),      # Fehlerbericht: Exitcode 0 trotz Limit
    (_huelle('Claude AI usage limit reached|1760000000', is_error=True), 1),
    ('', 1),
])
def test_limit_und_fehler_brechen_ab(stdout, code, capsys):
    with pytest.raises((claude_cli.AboLimit, claude_cli.ClaudeFehler)):
        claude_cli.frage(GEHEIM, run=_run(stdout, code, stderr='usage limit' if not stdout else ''))
    assert GEHEIM not in capsys.readouterr().out


def test_limit_wird_als_limit_erkannt():
    with pytest.raises(claude_cli.AboLimit):
        claude_cli.frage('x', run=_run(_huelle('API Error: Rate limit reached', is_error=True)))


def test_kein_json_ist_fehler_ohne_antworttext():
    with pytest.raises(claude_cli.UngueltigeAntwort) as e:
        claude_cli.frage('x', run=_run(_huelle('Hier ist dein ' + GEHEIM)))
    assert GEHEIM not in str(e.value)
