"""Verkleinertes e5-small (Plan 6a, Task 0b): Größe und Genauigkeit gegen das Original (Q136, Q273)."""
import base64
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
ORDNER = ROOT / 'web/public/modell/e5-small'


def test_dateigroessen_innerhalb_der_grenzen():
    dateien = [p for p in ORDNER.iterdir() if p.is_file()]
    assert {'model.onnx', 'tokenizer.json', 'LICENSE', 'HERKUNFT.md'} <= {p.name for p in dateien}
    assert all(p.stat().st_size <= 50_000_000 for p in dateien)
    assert sum(p.stat().st_size for p in dateien) <= 60_000_000


def test_einbettungen_wie_original():
    np = pytest.importorskip('numpy')
    ort = pytest.importorskip('onnxruntime')
    tokenizers = pytest.importorskip('tokenizers')
    d = json.loads((ROOT / 'tests/fixtures/e5-pruefsaetze.json').read_text(encoding='utf-8'))
    ref = np.frombuffer(base64.b64decode(d['einbettungen_float16_base64']), dtype=np.float16).reshape(d['form']).astype(np.float32)
    tok = tokenizers.Tokenizer.from_file(str(ORDNER / 'tokenizer.json'))
    sitzung = ort.InferenceSession(str(ORDNER / 'model.onnx'))
    werte = []
    for s, r in zip(d['saetze'], ref):
        e = tok.encode(('query: ' if s['art'] == 'anforderung' else 'passage: ') + s['text'])
        ids = np.array([e.ids], dtype=np.int64)
        maske = np.array([e.attention_mask], dtype=np.int64)
        h = sitzung.run(None, {'input_ids': ids, 'attention_mask': maske, 'token_type_ids': np.zeros_like(ids)})[0][0]
        v = (h * maske[0][:, None]).sum(0) / maske.sum()
        werte.append(float(v @ r / np.linalg.norm(v) / np.linalg.norm(r)))
    # Nutzer Q273: seltene, nicht im Korpus enthaltene Namen dürfen leicht abweichen.
    assert sum(w >= 0.99 for w in werte) >= 199
    assert min(werte) >= 0.98
