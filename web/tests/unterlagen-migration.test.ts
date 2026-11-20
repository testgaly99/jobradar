import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../../supabase/migrations/023_unterlagen.sql", import.meta.url), "utf8").toLowerCase();
const TABELLEN = ["briefkopf", "anschreiben_vorlagen", "bewerbung_anlagen"];

test("RLS an, eigene Zeilen, kein Zugriff für Gäste", () => {
  for (const t of TABELLEN) {
    assert.match(sql, new RegExp(`alter table public\\.${t}\\s+enable row level security`), t);
    assert.match(sql, new RegExp(`create policy \\w+ on public\\.${t} for all to authenticated[\\s\\S]*?owner_id = \\(select auth\\.uid\\(\\)\\)`), t);
    assert.match(sql, new RegExp(`revoke all on [^;]*public\\.${t}[^;]* from anon`), t);
  }
});

test("Anlagen-Haken nur auf eigene Bewerbung und eigenes Dokument", () => {
  const policy = sql.slice(sql.indexOf("on public.bewerbung_anlagen for all"));
  assert.match(policy, /with check[\s\S]*exists \(select 1 from public\.applications a where a\.id = application_id and a\.owner_id = \(select auth\.uid\(\)\)\)/);
  assert.match(policy, /exists \(select 1 from public\.documents d where d\.id = document_id and d\.owner_id = \(select auth\.uid\(\)\)\)/);
});

test("Angehakte Dokumente sind vor dem Löschen geschützt, nichts wird gelöscht", () => {
  assert.match(sql, /document_id uuid not null references public\.documents\(id\) on delete restrict/);
  assert.doesNotMatch(sql, /drop table/);
});

test("Grenzen und neue Spalten", () => {
  assert.match(sql, /char_length\(text\) <= 20000/);
  assert.match(sql, /anrede in \('frau','herr','ohne'\)/);
  assert.match(sql, /anlage_art in \('zeugnis','zertifikat','sonstiges'\)/);
});
