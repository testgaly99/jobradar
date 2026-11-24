"""Einmaliges Werkzeug (Plan 6a, Task 0b, Q136): multilingual-e5-small auf Deutsch/Englisch verkleinern.

Nimmt die bereits quantisierte ONNX-Fassung (Xenova/multilingual-e5-small, onnx/model_quantized.onnx) und
behält nur die Wortbausteine, die beim Zerlegen eines öffentlichen Korpus vorkommen (plus Sondertoken und
einzelne lateinische Zeichen als Rückfall). Die Zeilen der Einbettungstabelle bleiben unverändert (gleiche
Quantisierung); für Texte aus behaltenen Bausteinen ist die Ausgabe identisch mit dem Original.

Nicht Teil des Nachtlaufs; läuft nur beim Bau. Pakete: werkzeuge/requirements.txt.

    python werkzeuge/modell_verkleinern.py --orig <ordner mit model_quantized.onnx und tokenizer.json>
        --korpus <ordner mit .txt-Dateien> --ziel web/public/modell/e5-small/
"""
import argparse
import json
from pathlib import Path

import numpy as np
import onnx
from onnx import numpy_helper
from tokenizers import Tokenizer

TABELLE = 'embeddings.word_embeddings.weight_quantized'
SONDER = ['<s>', '<pad>', '</s>', '<unk>']
# Tabelle: 384 Byte je Baustein; Rest des Modells ≈ 22,3 MB. --auffuellen 68000 ergibt ≈ 48,4 MB (Grenze 50 MB je Datei).
# Messung 2026-11-24: Auffüllen verbesserte die Prüfsätze nicht (Minimum 0,9842 mit und ohne), daher Standard aus.
MAX_WORTSCHATZ = 0


def zahlen():
    """Zahlenformen aus Lebensläufen und Anzeigen: Jahre, Spannen, Noten, Prozente, Klammern, Daten."""
    for n in range(0, 2101):
        yield f'{n} ({n} {n}) {n}% {n} % {n}, {n}. {n}: {n}+ {n}x {n}k'
    for j in range(1950, 2051):
        yield f'({j}–{j + 1}) {j}–{j + 2}, {j}-{j + 1} seit {j} since {j} 01/{j} 12.{j} {j}/{j + 1 - 2000:02d}'
    for a in range(0, 10):
        yield ' '.join(f'{a},{b} {a}.{b} {a},{b}0 {a}.{b}0' for b in range(0, 10))


def texte(korpus: Path):
    """Korpuszeilen; Wortlisten („wort anzahl“) zusätzlich in Groß-/Titel-Schreibweise."""
    yield from zahlen()
    for datei in sorted(korpus.glob('*.txt')):
        for zeile in datei.read_text(encoding='utf-8').splitlines():
            teile = zeile.split()
            if datei.name.startswith('woerter_') and len(teile) == 2 and teile[1].isdigit():
                w = teile[0]
                yield from (w, w.capitalize(), w.upper())
            elif zeile.strip():
                yield zeile


def behaltene_ids(tok: Tokenizer, vocab: list, korpus: Path, auffuellen: int = MAX_WORTSCHATZ) -> list[int]:
    ids = {i for i, (s, _) in enumerate(vocab) if s in SONDER}
    stapel = []
    for t in texte(korpus):
        stapel.append(t)
        if len(stapel) == 2000:
            for e in tok.encode_batch(stapel, add_special_tokens=False):
                ids.update(e.ids)
            stapel = []
    for e in tok.encode_batch(stapel, add_special_tokens=False):
        ids.update(e.ids)
    # Rückfall für unbekannte Wörter: alle Einzelzeichen aus Latein, Ziffern, Satzzeichen, Umlauten.
    for i, (s, _) in enumerate(vocab):
        roh = s.replace('▁', '')
        if len(roh) <= 1 and all(ord(c) < 0x250 or c in '€–—„“”‚‘’…•' for c in roh):
            ids.add(i)
    # Freien Platz bis zur Größengrenze mit den wahrscheinlichsten lateinischen Bausteinen füllen
    # (seltene Namen und Fachwörter außerhalb des Korpus, z. B. Firmennamen in Lebensläufen).
    latein = sorted((i for i, (s, _) in enumerate(vocab) if i not in ids
                     and all(ord(c) < 128 or c in '▁äöüÄÖÜßéèàçñ' for c in s)), key=lambda i: -vocab[i][1])
    ids.update(latein[:max(0, auffuellen - len(ids))])
    return sorted(ids)


def verkleinere(orig: Path, korpus: Path, ziel: Path) -> dict:
    tj = json.loads((orig / 'tokenizer.json').read_text(encoding='utf-8'))
    vocab = tj['model']['vocab']
    ids = behaltene_ids(Tokenizer.from_file(str(orig / 'tokenizer.json')), vocab, korpus)
    assert ids[:4] == [0, 1, 2, 3], 'Sondertoken müssen vorne bleiben'
    neu = {alt: n for n, alt in enumerate(ids)}
    mask_alt = next(a['id'] for a in tj['added_tokens'] if a['content'] == '<mask>')

    # Tokenizer: gleiche Bausteine und Bewertungen, neue fortlaufende Nummern; <mask> ans Ende.
    tj['model']['vocab'] = [vocab[i] for i in ids]
    tj['model']['unk_id'] = neu[tj['model']['unk_id']]
    for a in tj['added_tokens']:
        a['id'] = len(ids) if a['id'] == mask_alt else neu[a['id']]
    for sp in tj['post_processor'].get('special_tokens', {}).values():
        sp['ids'] = [neu[i] for i in sp['ids']]

    # Modell: Zeilen der quantisierten Tabelle auswählen (Skala/Nullpunkt gelten für die ganze Tabelle).
    m = onnx.load(str(orig / 'model_quantized.onnx'))
    t = next(x for x in m.graph.initializer if x.name == TABELLE)
    alt = numpy_helper.to_array(t)
    zeilen = ids + [mask_alt]
    t.CopyFrom(numpy_helper.from_array(np.ascontiguousarray(alt[zeilen]), TABELLE))

    ziel.mkdir(parents=True, exist_ok=True)
    onnx.save(m, str(ziel / 'model.onnx'))
    (ziel / 'tokenizer.json').write_text(json.dumps(tj, ensure_ascii=False), encoding='utf-8')
    return {'wortschatz_vorher': len(vocab), 'wortschatz_nachher': len(ids) + 1,
            'groesse_modell_mb': round((ziel / 'model.onnx').stat().st_size / 1e6, 1),
            'groesse_tokenizer_mb': round((ziel / 'tokenizer.json').stat().st_size / 1e6, 1)}


if __name__ == '__main__':
    a = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    a.add_argument('--orig', type=Path, required=True)
    a.add_argument('--korpus', type=Path, required=True)
    a.add_argument('--ziel', type=Path, required=True)
    args = a.parse_args()
    print(json.dumps(verkleinere(args.orig, args.korpus, args.ziel), ensure_ascii=False))
