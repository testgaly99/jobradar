import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
// TypeScript-Quelle als CommonJS laden; imports kommen aus der Map (wie in offline-sperre.test.ts).
export const laden = (pfad: string, imports: Record<string, object>) => {
  const code = ts.transpileModule(readFileSync(new URL(pfad, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText as string;
  const exports = {} as Record<string, never>;
  runInNewContext(code, { exports, require: (n: string) => imports[n] ?? assert.fail(n) });
  return exports;
};

export type Antwort = { data?: unknown; error?: { code?: string; message: string } | null };
// Supabase-Attrappe: `applications` antwortet der Reihe nach, andere Tabellen leer; merkt die Aufrufe.
export function attrappe(antworten: Antwort[]) {
  const spalten: string[] = [], aufrufe: [string, unknown[]][] = [];
  const sb = { from: (tabelle: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "order", "limit", "neq", "in", "ilike", "gte", "update", "eq"]) {
      q[m] = (...a: unknown[]) => { if (tabelle === "applications") { aufrufe.push([m, a]); if (m === "select") spalten.push(String(a[0])); } return q; };
    }
    q.then = (res: (v: Antwort) => unknown) => res(tabelle === "applications" ? (antworten.shift() ?? { data: [] }) : { data: [] });
    return q;
  } };
  return { sb, spalten, aufrufe };
}
