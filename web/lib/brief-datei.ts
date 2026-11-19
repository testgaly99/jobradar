// Brief als PDF und Word, im Browser erzeugt. Die Pakete werden erst beim Aufruf geladen (import()), nie mit der Seite.
import type { Werte } from "./anschreiben.ts";

export type Brief = { absender: string; empfaenger: string[]; ortDatum: string; betreff: string; text: string };
export type Briefkopf = { name: string | null; strasse: string | null; plz_ort: string | null; telefon: string | null; email: string | null; linkedin: string | null };

const MM_PT = 72 / 25.4;      // Millimeter → Punkt (PDF)
const MM_TWIP = 1440 / 25.4;  // Millimeter → Twip (Word)
const RAND = { links: 25, rechts: 20, oben: 20, unten: 20 };

export function briefAus(kopf: Briefkopf, ausgefuellt: { betreff: string; text: string }, werte: Werte): Brief {
  const ort = (kopf.plz_ort ?? "").trim().replace(/^\d{4,5}\s*/, "");
  const absender = [kopf.name, kopf.strasse, kopf.plz_ort, kopf.telefon, kopf.email, kopf.linkedin].map((s) => s?.trim()).filter(Boolean).join(" · ");
  return {
    absender,
    empfaenger: [werte.firma, ...(werte.ansprechpartner ? [`z. Hd. ${werte.ansprechpartner}`] : [])],
    ortDatum: ort ? `${ort}, ${werte.datum}` : werte.datum,
    betreff: ausgefuellt.betreff,
    text: ausgefuellt.text,
  };
}

export async function briefPdf(b: Brief): Promise<Uint8Array> {
  const m = await import("pdfmake/build/pdfmake.js");
  const pdfMake = m.default ?? m;
  const schrift = await import("pdfmake/build/standard-fonts/Helvetica.js");
  pdfMake.addFontContainer(schrift.default ?? schrift);
  const doc = {
    pageSize: "A4",
    pageMargins: [RAND.links * MM_PT, RAND.oben * MM_PT, RAND.rechts * MM_PT, RAND.unten * MM_PT],
    defaultStyle: { font: "Helvetica", fontSize: 11, lineHeight: 1.2 },
    content: [
      { text: b.absender, fontSize: 8, margin: [0, 0, 0, 24] },
      { text: b.empfaenger.join("\n"), margin: [0, 0, 0, 24] },
      { text: b.ortDatum, alignment: "right", margin: [0, 0, 0, 24] },
      { text: b.betreff, bold: true, margin: [0, 0, 0, 16] },
      { text: b.text },
    ],
  };
  return new Uint8Array(await pdfMake.createPdf(doc).getBuffer());
}

export async function briefDocx(b: Brief): Promise<Uint8Array> {
  const { AlignmentType, Document, Packer, Paragraph, TextRun } = await import("docx");
  const absatz = (text: string, o: { fett?: boolean; rechts?: boolean; klein?: boolean; abstand?: number } = {}) => new Paragraph({
    alignment: o.rechts ? AlignmentType.RIGHT : undefined,
    spacing: { after: o.abstand ?? 0 },
    children: [new TextRun({ text, bold: o.fett, size: o.klein ? 16 : 22, font: "Arial" })],
  });
  const zeilen = b.text.split("\n");
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: {
        left: Math.round(RAND.links * MM_TWIP), right: Math.round(RAND.rechts * MM_TWIP),
        top: Math.round(RAND.oben * MM_TWIP), bottom: Math.round(RAND.unten * MM_TWIP) } } },
      children: [
        absatz(b.absender, { klein: true, abstand: 480 }),
        ...b.empfaenger.map((z, i) => absatz(z, { abstand: i === b.empfaenger.length - 1 ? 480 : 0 })),
        absatz(b.ortDatum, { rechts: true, abstand: 480 }),
        absatz(b.betreff, { fett: true, abstand: 320 }),
        ...zeilen.map((z) => absatz(z)),
      ],
    }],
  });
  return new Uint8Array(await Packer.toArrayBuffer(doc));
}

export async function textAusDocx(daten: ArrayBuffer): Promise<string> {
  const m = await import("mammoth");
  const mammoth = m.default ?? m;
  // Browser-Fassung liest arrayBuffer, Node-Fassung (Tests) buffer.
  const eingabe = { arrayBuffer: daten, buffer: daten };
  const { value } = await mammoth.extractRawText(eingabe as { arrayBuffer: ArrayBuffer });
  return value.replace(/\n{3,}/g, "\n\n").trim();
}
