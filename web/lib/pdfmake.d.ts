// pdfmake 0.3 bringt keine Typen mit; nur das, was brief-datei.ts nutzt.
declare module "pdfmake/build/pdfmake.js" {
  const pdfMake: {
    addFontContainer(container: unknown): void;
    createPdf(doc: object): { getBuffer(): Promise<Uint8Array> };
  };
  export default pdfMake;
}
declare module "pdfmake/build/standard-fonts/Helvetica.js" {
  const schrift: unknown;
  export default schrift;
}
