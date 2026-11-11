// Aufruf: node tests/loeschen_live.mts <uid>; Env: SUPABASE_URL, SUPABASE_SERVICE_KEY
import { createClient } from "../web/node_modules/@supabase/supabase-js/dist/index.mjs";
import { loescheNutzerMit } from "../web/lib/nutzer-loeschen-kern.ts";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await loescheNutzerMit(sb, process.argv[2]);
