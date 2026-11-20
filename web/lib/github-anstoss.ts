// Stößt den GitHub-Workflow "Anzeigen lesen" an (echter Browser für Karriereseiten, die per JavaScript laden).
// Ohne Eingaben: der Lauf liest die markierten Bewerbungen selbst, damit keine Adresse in öffentliche Protokolle gerät.
// Ohne Schlüssel oder bei Fehlern passiert nichts weiter: der Nachtlauf erledigt es dann.
import { USER_AGENT } from "./ats-abruf.ts";

type Env = Record<string, string | undefined>;

export async function anzeigeLesenAnstossen(dep: { env?: Env; holen?: typeof fetch } = {}): Promise<boolean> {
  const env = dep.env ?? process.env;
  const token = env.GITHUB_DISPATCH_TOKEN;
  if (!token) return false;
  const repo = env.GITHUB_REPO || "testgaly99/jobradar";
  try {
    const r = await (dep.holen ?? fetch)(`https://api.github.com/repos/${repo}/actions/workflows/anzeige-lesen.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": USER_AGENT },
      body: JSON.stringify({ ref: env.GITHUB_DISPATCH_REF || "main" }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) console.error("anzeigeLesenAnstossen: GitHub", r.status);
    return r.ok;
  } catch {
    console.error("anzeigeLesenAnstossen: nicht erreichbar");
    return false;
  }
}
