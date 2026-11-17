// Ohne "server-only", damit node:test es importieren kann; actions.ts nutzt den Wrapper lib/groq.ts.
// Firma und Titel aus eingefügtem Anzeigentext (nur gpt-oss-120b, sonst null).
// Diese Anleitung muss mit scraper/ki_prompt_firma.md identisch sein (tests/groq.test.ts prüft das), weil Vercel nur web/ bündelt.
export const PROMPT_FIRMA = `
Lies die Stellenanzeige. Antworte nur mit diesem JSON-Objekt:
{"firma": Text oder null, "titel": Text oder null}

- firma: Name des einstellenden Unternehmens, so wie er in der Anzeige steht.
- titel: Stellentitel, so wie er in der Anzeige steht (inkl. Zusätzen wie "(m/w/d)").
- Steht etwas nicht in der Anzeige: null. Nichts erfinden, nichts übersetzen.
`;

export async function erkenneFirmaTitel(
  text: string, holen: typeof fetch = fetch, key = process.env.GROQ_API_KEY,
): Promise<{ firma: string; titel: string } | null> {
  if (!key) return null;
  try {
    const r = await holen("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: PROMPT_FIRMA }, { role: "user", content: text.slice(0, 12000) }],
        response_format: { type: "json_object" }, reasoning_effort: "low", temperature: 0.2,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const j = JSON.parse((await r.json()).choices[0].message.content);
    const firma = typeof j.firma === "string" ? j.firma.trim() : "";
    const titel = typeof j.titel === "string" ? j.titel.trim() : "";
    return firma && titel ? { firma, titel } : null;
  } catch { return null; }
}
