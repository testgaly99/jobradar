import test from "node:test";
import assert from "node:assert/strict";
import { firmenTrend } from "../lib/firmentrend.ts";

const lauf = (datum: string, ...firmen: object[]) => ({ datum, bericht: { stand: datum, firmen } });
const f = (o: object) => ({ name: "Acme", fehler: "", gefunden: 10, gefiltert: 2, neu: 0, geschlossen: 0, ...o });

test("firmenTrend: letzter Lauf je Woche, Erstaufnahme zählt nicht als neu, Fehler-Läufe fallen weg", () => {
  const t = firmenTrend([
    lauf("2026-11-12", f({ gefunden: 13, neu: 2, geschlossen: 1 }), { name: "Andere", gefunden: 99 }),
    lauf("2026-11-07", f({ neu: 8 })), // Erstaufnahme (Sa, KW 45)
    lauf("2026-11-08", f({ gefunden: 11, neu: 1 })), // So, KW 45
    lauf("2026-11-10", f({ fehler: "Timeout", gefunden: 0 })),
  ], "Acme", "2026-11-12");
  assert.deepEqual(t.punkte, [{ datum: "2026-11-08", offen: 9 }, { datum: "2026-11-12", offen: 11 }]);
  assert.equal(t.neu, 3);
  assert.equal(t.geschlossen, 1);
  assert.equal(t.seit, "2026-11-07");
});

test("firmenTrend: unbekannte Firma und kaputte Berichte ergeben leere Kurve", () => {
  const t = firmenTrend([{ datum: "2026-11-12", bericht: null }, lauf("2026-11-11", f({}))], "Fremd", "2026-11-12");
  assert.deepEqual(t, { punkte: [], neu: 0, geschlossen: 0, seit: null });
});
