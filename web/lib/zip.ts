import { crc32 } from "node:zlib";

// Minimaler ZIP-Schreiber: nur STORED (ohne Kompression), UTF-8-Namen, keine ZIP64 (Dateien < 4 GB).
export function zip(dateien: { name: string; data: Buffer | string }[]): Buffer {
  const teile: Buffer[] = [], zentral: Buffer[] = [];
  let pos = 0;
  const t = new Date();
  const zeit = (t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1);
  const datum = ((t.getFullYear() - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate();
  for (const d of dateien) {
    const name = Buffer.from(d.name, "utf8"), daten = Buffer.from(d.data), crc = crc32(daten);
    const lokal = Buffer.alloc(30);
    lokal.writeUInt32LE(0x04034b50, 0);
    lokal.writeUInt16LE(20, 4);
    lokal.writeUInt16LE(0x800, 6); // Bit 11: Name ist UTF-8
    lokal.writeUInt16LE(zeit, 10);
    lokal.writeUInt16LE(datum, 12);
    lokal.writeUInt32LE(crc, 14);
    lokal.writeUInt32LE(daten.length, 18);
    lokal.writeUInt32LE(daten.length, 22);
    lokal.writeUInt16LE(name.length, 26);
    const z = Buffer.alloc(46);
    z.writeUInt32LE(0x02014b50, 0);
    z.writeUInt16LE(20, 4);
    z.writeUInt16LE(20, 6);
    z.writeUInt16LE(0x800, 8);
    z.writeUInt16LE(zeit, 12);
    z.writeUInt16LE(datum, 14);
    z.writeUInt32LE(crc, 16);
    z.writeUInt32LE(daten.length, 20);
    z.writeUInt32LE(daten.length, 24);
    z.writeUInt16LE(name.length, 28);
    z.writeUInt32LE(pos, 42);
    zentral.push(z, name);
    teile.push(lokal, name, daten);
    pos += 30 + name.length + daten.length;
  }
  const zd = Buffer.concat(zentral);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0);
  ende.writeUInt16LE(dateien.length, 8);
  ende.writeUInt16LE(dateien.length, 10);
  ende.writeUInt32LE(zd.length, 12);
  ende.writeUInt32LE(pos, 16);
  return Buffer.concat([...teile, zd, ende]);
}
