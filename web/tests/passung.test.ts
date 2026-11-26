import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import einwilligungen from "../lib/cv-einwilligung.json" with { type: "json" };
import { passungVerfuegbar } from "../lib/passung.ts";

// Attrappe je Tabelle: cv_einwilligung liefert eine Zeile, documents eine Liste.
function sb(einw: unknown, cvs: unknown[], aufrufe: string[] = []) {
  return createClient("https://datenbank.example.invalid", "test-ohne-zugangsdaten", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      aufrufe.push(url.pathname);
      const body = url.pathname.endsWith("cv_einwilligung") ? (einw ? [einw] : []) : cvs;
      return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
    } },
  });
}
const FASSUNG = einwilligungen.admin.fassung;

test("passungVerfuegbar: Admin mit aktueller Einwilligung und CV", async () => {
  assert.equal(await passungVerfuegbar(sb({ fassung: FASSUNG }, [{ id: "1" }]), { admin: true }), true);
});
test("passungVerfuegbar: false ohne Konto und für Nicht-Admins, ohne die Datenbank zu fragen", async () => {
  const aufrufe: string[] = [];
  assert.equal(await passungVerfuegbar(sb({ fassung: FASSUNG }, [{ id: "1" }], aufrufe), null), false);
  assert.equal(await passungVerfuegbar(sb({ fassung: FASSUNG }, [{ id: "1" }], aufrufe), { admin: false }), false);
  assert.equal(aufrufe.length, 0);
});
test("passungVerfuegbar: false ohne Einwilligung, mit alter Fassung oder ohne CV", async () => {
  assert.equal(await passungVerfuegbar(sb(null, [{ id: "1" }]), { admin: true }), false);
  assert.equal(await passungVerfuegbar(sb({ fassung: "admin-alt" }, [{ id: "1" }]), { admin: true }), false);
  assert.equal(await passungVerfuegbar(sb({ fassung: FASSUNG }, []), { admin: true }), false);
});
