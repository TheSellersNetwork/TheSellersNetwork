/*
  A small store-only (no compression) zip writer for downloading many photos at
  once. JPEG and PNG are already compressed, so storing them is as small as
  zipping them and far quicker. The file data stays as Blobs and the zip is
  assembled as a Blob of Blobs, so the photos are not copied into one big
  in-memory buffer. No zip64: parts are kept well under 4 GB.
*/

export type ZipEntry = { name: string; data: Blob; crc: number; size: number };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/* CRC-32 as zip uses it. Pass the previous result to continue over several chunks. */
export function crc32(bytes: Uint8Array, previous = 0): number {
  let c = (previous ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* MS-DOS date and time fields, local time, two-second resolution. */
export function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.min(2107, Math.max(1980, d.getFullYear()));
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const LOCAL_HEADER = 30;
const CENTRAL_HEADER = 46;
const END_RECORD = 22;
const UTF8_FLAG = 0x0800;

/* Bytes a file adds to a zip: its data, its name twice and its two headers. */
export function entryOverhead(name: string): number {
  const n = new TextEncoder().encode(name).length;
  return LOCAL_HEADER + CENTRAL_HEADER + 2 * n;
}

/*
  Splits files into zip parts of at most limit bytes each, keeping their order.
  A single file bigger than the limit gets a part of its own.
*/
export function splitIntoParts(files: { name: string; size: number }[], limit: number): number[][] {
  const parts: number[][] = [];
  let current: number[] = [];
  let bytes = END_RECORD;
  files.forEach((f, i) => {
    const add = f.size + entryOverhead(f.name);
    if (current.length > 0 && bytes + add > limit) {
      parts.push(current);
      current = [];
      bytes = END_RECORD;
    }
    current.push(i);
    bytes += add;
  });
  if (current.length) parts.push(current);
  return parts;
}

/* Makes names unique within one zip or folder: "a.jpg", "a (2).jpg", "a (3).jpg". */
export function uniqueName(name: string, used: Set<string>): string {
  const key = (s: string) => s.toLowerCase();
  if (!used.has(key(name))) {
    used.add(key(name));
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!used.has(key(candidate))) {
      used.add(key(candidate));
      return candidate;
    }
  }
}

function header(size: number) {
  const buf = new ArrayBuffer(size);
  return { buf, view: new DataView(buf) };
}

/* Builds a zip file from entries whose CRC and size are already known. */
export function buildZip(entries: ZipEntry[], when = new Date()): Blob {
  const { time, date } = dosDateTime(when);
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const { buf: lb, view: l } = header(LOCAL_HEADER);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true); // version needed
    l.setUint16(6, UTF8_FLAG, true);
    l.setUint16(8, 0, true); // stored
    l.setUint16(10, time, true);
    l.setUint16(12, date, true);
    l.setUint32(14, e.crc, true);
    l.setUint32(18, e.size, true);
    l.setUint32(22, e.size, true);
    l.setUint16(26, name.length, true);
    l.setUint16(28, 0, true);
    parts.push(lb, name, e.data);

    const { buf: cb, view: c } = header(CENTRAL_HEADER);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true); // version made by
    c.setUint16(6, 20, true); // version needed
    c.setUint16(8, UTF8_FLAG, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, time, true);
    c.setUint16(14, date, true);
    c.setUint32(16, e.crc, true);
    c.setUint32(20, e.size, true);
    c.setUint32(24, e.size, true);
    c.setUint16(28, name.length, true);
    // extra, comment, disk, internal and external attributes stay 0
    c.setUint32(42, offset, true);
    central.push(cb, name);

    offset += LOCAL_HEADER + name.length + e.size;
    centralSize += CENTRAL_HEADER + name.length;
  }
  const { buf: eb, view: end } = header(END_RECORD);
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, eb], { type: "application/zip" });
}
