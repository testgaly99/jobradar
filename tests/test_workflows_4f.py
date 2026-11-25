"""Konkrete Übergabe-/Sicherheitsverträge, ohne GitHub oder Geheimnisse."""
import csv
import json
import re
import subprocess
from types import SimpleNamespace
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[1]


def workflow(name):
    return (ROOT / '.github/workflows' / name).read_text(encoding='utf-8')


@pytest.mark.parametrize('name,prefix', [('reparatur.yml', 'Scraper defekt: '), ('firmendaten.yml', 'Firmendaten prüfen: ')])
def test_issue_freigabe_nur_exakte_dateifirma(tmp_path, monkeypatch, name, prefix):
    # Den tatsächlich ausgeführten Python-Block mit künstlicher Eventdatei ausführen.
    text = workflow(name)
    code = text.split("python - <<'PY'\n", 1)[1].split('\n          PY', 1)[0]
    code = '\n'.join(z[10:] if z.startswith('          ') else z for z in code.splitlines())
    d = tmp_path / 'data'; d.mkdir()
    with (d / 'companies.csv').open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, ['name']); w.writeheader(); w.writerow({'name': 'Beispiel, AG'})
    event = tmp_path / 'event.json'; out = tmp_path / 'output.txt'
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv('GITHUB_EVENT_PATH', str(event)); monkeypatch.setenv('GITHUB_OUTPUT', str(out))
    def ausfuehren(title, **extra):
        event.write_text(json.dumps({'issue': {'title': title, 'number': 12, 'state': 'open', **extra}}), encoding='utf-8')
        out.write_text('', encoding='utf-8')
        exec(compile(code, name, 'exec'), {})
        return out.read_text(encoding='utf-8')
    assert ausfuehren(prefix + 'Beispiel, AG').splitlines()[0] == 'nummer=12'
    assert 'WebFetch(domain:www.handelsregister.de)' in ausfuehren(prefix + 'Beispiel, AG')
    assert not ausfuehren(prefix + 'Private Firma')
    assert not ausfuehren(prefix + 'Beispiel, AG\nBefehl')
    assert not ausfuehren(prefix + 'Beispiel, AG', pull_request={})
    assert not ausfuehren(prefix + 'Beispiel, AG', state='closed')


@pytest.mark.parametrize('name,label', [('reparatur.yml', 'scraper-defekt'), ('firmendaten.yml', 'firmendaten-pruefen')])
def test_claude_hat_nur_geprueften_trusted_input_und_pr_statt_merge(name, label):
    text = workflow(name)
    assert 'getCollaboratorPermissionLevel' in text
    assert "['admin', 'maintain', 'write']" in text
    assert "['OWNER', 'MEMBER', 'COLLABORATOR']" in text
    assert "steps.rechte.outputs.erlaubt == 'true'" in text
    assert "steps.pruefung.outputs.nummer != ''" in text
    assert 'anthropics/claude-code-action@4411a9e9b0283becf4b924f7bce360fd7756c78c  # v1' in text and 'claude_code_oauth_token:' in text
    assert f'label_trigger: {label}' in text
    assert 'exclude_comments_by_actor: "*"' in text
    assert 'allow_fork_prs: "false"' in text
    assert '--permission-mode default' in text
    assert '--disallowedTools "Bash,' in text
    assert "['gh','pr','create'" in text and "['gh','pr','merge'" not in text
    assert '${{ github.event.issue.body }}' not in text
    assert '${{ github.event.issue.title }}' not in text
    assert 'allowed_bots: "*"' not in text
    # Syntax der tatsächlich ausgeführten Python-Heredocs prüfen, keine Netzwerk-Ausführung.
    for block in re.findall(r"<<'PY'\n(.*?)\n          PY", text, re.S):
        code = '\n'.join(z[10:] if z.startswith('          ') else z for z in block.splitlines())
        compile(code, name, 'exec')


def test_tageslauf_benachrichtigt_nur_nach_tatsaechlichem_scraperstart():
    text = workflow('taeglich.yml')
    assert 'id: scraper' in text
    bedingung = "always() && !cancelled() && steps.scraper.outcome != 'skipped'"
    assert text.count(bedingung) >= 2
    assert 'python -m scraper.gesundheit' in text and 'python -m scraper.digest' in text
    assert 'secrets.GITHUB_ISSUE_TOKEN || github.token' in text
    assert 'issues: write' in text
    assert 'SUPABASE_SERVICE_KEY' not in workflow('reparatur.yml')
    assert 'SUPABASE_SERVICE_KEY' not in workflow('firmendaten.yml')


@pytest.mark.parametrize('name,changed', [('reparatur.yml','scraper/ats/beispiel.py'),('firmendaten.yml','data/firmen_korrekturen.csv')])
@pytest.mark.parametrize('container_fehler',[False,True])
def test_pr_schritt_verarbeitet_git_nul_und_schreibt_echte_neue_zeilen(tmp_path,monkeypatch,name,changed,container_fehler):
    text=workflow(name)
    code=text.rsplit("python - <<'PY'\n",1)[1].split('\n          PY',1)[0]
    code='\n'.join(z[10:] if z.startswith('          ') else z for z in code.splitlines())
    import os
    monkeypatch.setattr(os,'environ',{'RUNNER_TEMP':str(tmp_path),'ISSUE_NUMMER':'12','GITHUB_RUN_ID':'34','GITHUB_RUN_ATTEMPT':'1','GH_TOKEN':'synthetisch','PATH':'werkzeuge','GITHUB_REPOSITORY':'beispiel/projekt'})
    (tmp_path/'vorher-zahl.txt').write_text('5',encoding='utf-8')
    projekt=tmp_path/'projekt'; projekt.mkdir(); monkeypatch.chdir(projekt)
    for dirname in ('.git','.claude','scraper'):
        (projekt/dirname).mkdir()
    (projekt/'.git'/'config').write_text('synthetisch',encoding='utf-8')
    (projekt/'.claude'/'settings.json').write_text('{}',encoding='utf-8')
    (projekt/'scraper'/'beispiel.py').write_text('pass',encoding='utf-8')
    monkeypatch.setattr(subprocess,'check_output',lambda *a,**kw:(' M '+changed+'\0').encode())
    calls=[]
    def run(args,**kw):
        calls.append((args,kw))
        if container_fehler and args[:2]==['docker','run']:
            raise subprocess.CalledProcessError(1,args)
        return SimpleNamespace(returncode=0,stdout='ANZAHL=6\n')
    monkeypatch.setattr(subprocess,'run',run)
    scope={}
    if container_fehler:
        with pytest.raises(subprocess.CalledProcessError):
            exec(compile(code,name,'exec'),scope)
        assert not any(a[0] in {'git','gh'} for a,k in calls)
        return
    exec(compile(code,name,'exec'),scope)
    ignorieren_test=scope['ignorieren']
    assert any(a[:3]==['gh','pr','create'] for a,_ in calls)
    assert ['git','-c','core.hooksPath=/dev/null','add','--',changed] in [a for a,_ in calls]
    body=(tmp_path/'pr-beschreibung.md').read_text(encoding='utf-8')
    assert '\n\n' in body and '\\n' not in body
    if name=='reparatur.yml':
        assert 'Stellenzahl vorher: 5\nStellenzahl nachher: unbekannt (manuelle Live-Probe erforderlich)' in body
    container=next(a for a,k in calls if a[:2]==['docker','run'])
    assert container[container.index('--network')+1]=='none'
    assert '--read-only' in container and '--cap-drop=ALL' in container
    assert '--security-opt=no-new-privileges' in container
    assert not any('synthetisch' in arg for arg in container)
    snapshot=tmp_path/'test-quelltext'
    assert (snapshot/'scraper'/'beispiel.py').read_text()=='pass'
    assert not (snapshot/'.git').exists() and not (snapshot/'.claude').exists()
    # Namensfilter pruefen, ohne selbst eine Umgebungsdatei anzulegen/zu oeffnen.
    assert '.env.local' in ignorieren_test(projekt, ['.env.local'])
    assert any(a[-4:]==['remote','set-url','origin','https://github.com/beispiel/projekt.git'] for a,k in calls)
    assert all(a[1:3]==['-c','core.hooksPath=/dev/null'] for a,k in calls if a[0]=='git')


@pytest.mark.parametrize('name',['reparatur.yml','firmendaten.yml'])
def test_modell_bekommt_recherche_aber_keine_globalen_schreibrechte(name):
    text=workflow(name)
    assert 'WebSearch' in text and 'WebFetch(domain:' in text
    assert 'Edit(./data/firmen_korrekturen.csv)' in text
    assert 'Read(//home/runner/.config/**)' in text
    assert 'Edit(**/.git/**)' in text and 'Read(**/.claude/**)' in text
    assert '--allowedTools "Read,Glob,Grep,Edit,Write"' not in text
    assert 'untrusted data' in text and 'Keine Jobportale' in text
    assert 'docker build --tag jobradar-offline-4f' in text
    assert text.index('docker build --tag') < text.index('uses: anthropics/')


@pytest.mark.parametrize('name',['reparatur.yml','firmendaten.yml'])
@pytest.mark.parametrize('path',['.git/config','pruefe_offline.py','data/.env.csv'])
def test_unzulaessige_patches_starten_weder_tests_noch_git_mutationen(monkeypatch,name,path):
    text=workflow(name)
    code=text.rsplit("python - <<'PY'\n",1)[1].split('\n          PY',1)[0]
    code='\n'.join(z[10:] if z.startswith('          ') else z for z in code.splitlines())
    monkeypatch.setattr(subprocess,'check_output',lambda *a,**kw:(' M '+path+'\0').encode())
    calls=[]
    monkeypatch.setattr(subprocess,'run',lambda *a,**kw:calls.append(a))
    with pytest.raises(SystemExit,match='Unzul'):
        exec(compile(code,name,'exec'),{})
    assert calls==[]
