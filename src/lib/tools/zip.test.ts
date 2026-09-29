import { buildZip, crc32, dosDateTime, entryOverhead, splitIntoParts, uniqueName } from "./zip";

const bytes = (s: string) => new TextEncoder().encode(s);

/* Reads a zip back from its central directory and checks every entry. */
async function readZip(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const v = new DataView(buf.buffer);
  const end = buf.length - 22;
  expect(v.getUint32(end, true)).toBe(0x06054b50);
  const count = v.getUint16(end + 10, true);
  let p = v.getUint32(end + 16, true);
  const files: { name: string; text: string; crcOk: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const offset = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nameLen));
    expect(v.getUint32(offset, true)).toBe(0x04034b50);
    const localNameLen = v.getUint16(offset + 26, true);
    const data = buf.slice(offset + 30 + localNameLen, offset + 30 + localNameLen + size);
    files.push({ name, text: new TextDecoder().decode(data), crcOk: crc32(data) === crc });
    p += 46 + nameLen;
  }
  return files;
}

describe("zip writer", () => {
  it("computes CRC-32 like zip tools do", () => {
    expect(crc32(bytes("hello"))).toBe(0x3610a686);
    expect(crc32(bytes(""))).toBe(0);
    // In chunks gives the same answer.
    expect(crc32(bytes("lo"), crc32(bytes("hel")))).toBe(0x3610a686);
  });

  it("encodes DOS dates", () => {
    const { date, time } = dosDateTime(new Date(2026, 8, 29, 14, 30, 10));
    expect(date).toBe(((2026 - 1980) << 9) | (9 << 5) | 29);
    expect(time).toBe((14 << 11) | (30 << 5) | 5);
  });

  it("builds a zip that reads back", async () => {
    const entries = [
      { name: "a-no-background.jpg", text: "first file" },
      { name: "café-no-background.png", text: "second" },
    ].map((e) => ({ name: e.name, data: new Blob([e.text]), crc: crc32(bytes(e.text)), size: bytes(e.text).length }));
    const zip = buildZip(entries, new Date(2026, 0, 1));
    expect(zip.type).toBe("application/zip");
    const files = await readZip(zip);
    expect(files).toEqual([
      { name: "a-no-background.jpg", text: "first file", crcOk: true },
      { name: "café-no-background.png", text: "second", crcOk: true },
    ]);
  });

  it("splits big batches into parts under the limit, in order", () => {
    const files = Array.from({ length: 10 }, (_, i) => ({ name: `p${i}.jpg`, size: 100 }));
    const per = 100 + entryOverhead("p0.jpg");
    // Room for three files per part (plus the 22-byte end record).
    const parts = splitIntoParts(files, 22 + per * 3);
    expect(parts).toEqual([[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]);
    expect(splitIntoParts(files, 10_000_000)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]);
    expect(splitIntoParts([], 1000)).toEqual([]);
  });

  it("gives a file bigger than the limit a part of its own", () => {
    const parts = splitIntoParts(
      [
        { name: "a", size: 10 },
        { name: "huge", size: 5000 },
        { name: "b", size: 10 },
      ],
      1000,
    );
    expect(parts).toEqual([[0], [1], [2]]);
  });

  it("makes names unique, ignoring case", () => {
    const used = new Set<string>();
    expect(uniqueName("a.jpg", used)).toBe("a.jpg");
    expect(uniqueName("A.jpg", used)).toBe("A (2).jpg");
    expect(uniqueName("a.jpg", used)).toBe("a (3).jpg");
    expect(uniqueName("noext", used)).toBe("noext");
    expect(uniqueName("noext", used)).toBe("noext (2)");
  });
});
