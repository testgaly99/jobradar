# Herkunft des Modells

- **Grundmodell:** [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small), Stand `614241f622`, Lizenz MIT (siehe `LICENSE`).
- **ONNX-Fassung:** [Xenova/multilingual-e5-small](https://huggingface.co/Xenova/multilingual-e5-small), Stand `761b726dd3`, Datei `onnx/model_quantized.onnx` (118 MB) und `tokenizer.json`; Umwandlung des MIT-Modells.
- **Verkleinert am 2026-11-24** mit `werkzeuge/modell_verkleinern.py` (Plan 6a, Task 0b, Q136, Q273): nur Wortbausteine behalten, die in einem öffentlichen Korpus vorkommen, dazu Sondertoken und lateinische Einzelzeichen. Die Zeilen der quantisierten Einbettungstabelle bleiben unverändert.
- **Korpus (nicht im Repo):** 867 öffentliche Stellenanzeigen aus jobradar, je 50.000 deutsche und englische Wörter aus [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (MIT), 599 Firmennamen der öffentlichen Firmenliste, Zahlenformen 0–2100, Jahresspannen, Noten, Prozente. Keine Lebensläufe.
- **Ergebnis:** Wortschatz 250.002 → 35.925, Modell 118 → 36,1 MB, Tokenizer 17 → 1,5 MB. Prüfung mit 200 Sätzen (`tests/fixtures/e5-pruefsaetze.json`): 199 exakt gleich zerlegt, Mittel 0,99992, Minimum 0,9842 (seltener Firmenname).
- **Nutzung:** Anforderungen mit `query: `, Belege mit `passage: `, Mittelwert über die Bausteine, L2-normiert, Ähnlichkeit = Skalarprodukt. Nie zur Laufzeit von Hugging Face laden.
