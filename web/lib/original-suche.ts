const GESCHLECHTER = /(^|[ ([{,;:–—-])(?:m\/w\/d|w\/m\/d|m\/f\/d|f\/m\/d|d\/m\/w|d\/w\/m|m\/w\/x)(?=$|[ )\]},;:–—.!?-])/g;
const GESCHLECHTER_KLAMMER = /\( *(?:all genders|gn) *\)/g;
const GENDERZEICHEN = /([\p{L}\p{M}])[*:_]in(?:nen)?(?=$|[ )\]},;:–—.!?/-])/gu;
const FUELLWOERTER = new Set("und and of für for the der die das im in m w d".split(" "));
const PROGRAMMIERSPRACHEN = new Set(["c++", "c#", "f#"]);

function kleinschreibung(s: string): string {
  // Dieselben Regeln in Python: NFC, Kleinschreibung, Eszett und finales Sigma.
  return s.normalize("NFC").toLowerCase().replace(/ß/g, "ss").replace(/ς/g, "σ");
}

function normWoerter(s: string): string {
  return s.split(/[^\p{L}\p{M}\p{N}+#]+/u)
    .flatMap((wort) => PROGRAMMIERSPRACHEN.has(wort) ? [wort] : wort.split(/[+#]+/))
    .filter(Boolean).join(" ");
}

export function normTitelStreng(s: string): string {
  const klein = kleinschreibung(s).replace(/\p{White_Space}+/gu, " ");
  return normWoerter(klein.replace(/ *\/ */g, "/")
    .replace(GESCHLECHTER, "$1").replace(GESCHLECHTER_KLAMMER, " ").replace(GENDERZEICHEN, "$1"));
}

function wortmenge(norm: string): Set<string> {
  return new Set(norm.split(" ").filter((wort) => wort && !FUELLWOERTER.has(wort)));
}

function wortAehnlichkeit(a: Set<string>, b: Set<string>): number {
  const gemeinsam = [...a].filter((wort) => b.has(wort)).length;
  const kuerzer = Math.min(a.size, b.size);
  return kuerzer ? gemeinsam / kuerzer : 0;
}

export function aehnlichkeit(a: string, b: string): number {
  return wortAehnlichkeit(wortmenge(normTitelStreng(a)), wortmenge(normTitelStreng(b)));
}

export function vergleiche<T extends { titel: string; ort?: string | null }>(
  titel: string, ort: string | null, kandidaten: T[],
): { art: "eindeutig"; treffer: T } | { art: "auswahl"; treffer: T[] } | { art: "keine" } {
  const gesucht = normTitelStreng(titel);
  if (!gesucht) return { art: "keine" };

  const suchwoerter = wortmenge(gesucht);
  const suchort = normWoerter(kleinschreibung(ort ?? ""));
  const exakt: T[] = [];
  const aehnlich: { kandidat: T; wert: number }[] = [];
  for (const kandidat of kandidaten) {
    const ortKandidat = normWoerter(kleinschreibung(kandidat.ort ?? ""));
    if (suchort && ortKandidat && suchort !== ortKandidat) continue;

    const titelKandidat = normTitelStreng(kandidat.titel);
    if (gesucht === titelKandidat) {
      exakt.push(kandidat);
    } else {
      const wert = wortAehnlichkeit(suchwoerter, wortmenge(titelKandidat));
      if (wert >= 0.5) aehnlich.push({ kandidat, wert });
    }
  }

  if (exakt.length === 1) return { art: "eindeutig", treffer: exakt[0] };
  aehnlich.sort((a, b) => b.wert - a.wert);
  const treffer = [...exakt, ...aehnlich.map(({ kandidat }) => kandidat)].slice(0, 5);
  return treffer.length ? { art: "auswahl", treffer } : { art: "keine" };
}

export function ausTabTitel(tabTitel: string, host: string): { firma?: string; titel?: string } {
  if (!/^(?:[a-z0-9-]+\.)*indeed\.(?:com|de)$/i.test(host)) return {};

  // Synthetische Form bis zur Prüfung echter Tab-Titel (Task 0).
  const teile = tabTitel.trim().split(/ (\||-|–) /);
  if (teile.length !== 5 || teile[1] !== teile[3] || teile[4].toLowerCase() !== "indeed") return {};

  const titel = teile[0].trim();
  const firma = /^bei (.+)$/i.exec(teile[2].trim())?.[1].trim();
  return firma && normTitelStreng(titel) && normWoerter(firma) ? { firma, titel } : {};
}
