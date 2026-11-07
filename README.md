# jobradar

Sammelt Stellenanzeigen aus öffentlichen Quellen und erzeugt daraus eine statische Website.

## Ordnerstruktur

| Ordner     | Inhalt                                                  |
|------------|---------------------------------------------------------|
| `scraper/` | Python-Code, der Jobbörsen abruft (eine Datei pro Quelle) |
| `data/`    | Gesammelte Rohdaten (z. B. JSON/CSV)                     |
| `site/`    | Erzeugte statische Website (HTML/CSS)                    |
| `tests/`   | Automatische Tests mit pytest                            |

## Einrichtung (Windows)

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Tests ausführen

```powershell
pytest
```

## Regeln

Die Projektregeln stehen in [CLAUDE.md](CLAUDE.md).
