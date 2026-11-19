// Packt die Chrome-Erweiterung beim Build als ZIP für den Download auf der Konto-Seite (Q63).
// Läuft als "prebuild"/"predev"; schreibt zusätzlich die Version nach lib/erweiterung-version.json.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { zipSync } from "fflate";

const ORDNER = "jobradar-erweiterung";
// Nur was die Erweiterung zur Laufzeit braucht: keine Tests, keine Testdaten.
const WEGLASSEN = (name) => /\.test\.(mjs|js|ts)$/.test(name) || name === "fixtures" || name === "tests";

/** @param {string} quelle @param {string} ziel @returns {{ version: string, dateien: string[] }} */
export function packeErweiterung(quelle, ziel) {
  if (!existsSync(join(quelle, "manifest.json"))) {
    throw new Error("Ordner browser-erweiterung/chrome nicht gefunden – in Vercel ‚Include files outside the root directory‘ einschalten");
  }
  const dateien = {};
  const sammle = (pfad) => {
    for (const name of readdirSync(pfad)) {
      if (WEGLASSEN(name)) continue;
      const voll = join(pfad, name);
      if (statSync(voll).isDirectory()) sammle(voll);
      else dateien[`${ORDNER}/${relative(quelle, voll).replaceAll("\\", "/")}`] = readFileSync(voll);
    }
  };
  sammle(quelle);
  mkdirSync(dirname(ziel), { recursive: true });
  // Feste Zeit: gleicher Inhalt ergibt dieselbe ZIP-Datei.
  writeFileSync(ziel, zipSync(dateien, { mtime: new Date("2026-01-01T00:00:00Z") }));
  const version = JSON.parse(readFileSync(join(quelle, "manifest.json"), "utf8")).version;
  return { version, dateien: Object.keys(dateien) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const web = join(dirname(fileURLToPath(import.meta.url)), "..");
  const { version, dateien } = packeErweiterung(join(web, "..", "browser-erweiterung", "chrome"), join(web, "public", "downloads", `${ORDNER}.zip`));
  writeFileSync(join(web, "lib", "erweiterung-version.json"), JSON.stringify({ version }) + "\n");
  console.log(`Erweiterung ${version} gepackt (${dateien.length} Dateien).`);
}
