// Empacotador ZIP mínimo (método "store", sem compressão) em TS puro — funciona
// no browser e em node (bun). Evita dependência externa (risco de divergência de
// lockfile no Lovable). Suficiente para empacotar .md / .mmd / .pdf de um projeto.

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
function toBytes(data: Uint8Array | string): Uint8Array {
  return typeof data === 'string' ? enc.encode(data) : data;
}

export interface ZipEntry {
  /** Caminho dentro do zip (use '/' para subpastas). */
  name: string;
  data: Uint8Array | string;
}

/** Gera o conteúdo de um arquivo .zip (store) a partir das entradas. */
export function makeZip(entries: ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
  const concat = (arrs: Uint8Array[]) => {
    const total = arrs.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    for (const a of arrs) { out.set(a, p); p += a.length; }
    return out;
  };

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const dataBytes = toBytes(e.data);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header
    const local = concat([
      u32(0x04034b50),     // assinatura
      u16(20),             // versão necessária
      u16(0x0800),         // flag: nome em UTF-8
      u16(0),              // método: store
      u16(0), u16(0),      // hora/data (fixas)
      u32(crc),
      u32(size),           // tamanho comprimido (== store)
      u32(size),           // tamanho descomprimido
      u16(nameBytes.length),
      u16(0),              // extra field length
      nameBytes,
    ]);
    chunks.push(local, dataBytes);

    // Central directory record
    central.push(concat([
      u32(0x02014b50),
      u16(20), u16(20),
      u16(0x0800),
      u16(0),
      u16(0), u16(0),
      u32(crc),
      u32(size), u32(size),
      u16(nameBytes.length),
      u16(0), u16(0),      // extra, comment
      u16(0), u16(0),      // disk, internal attrs
      u32(0),              // external attrs
      u32(offset),         // offset do local header
      nameBytes,
    ]));

    offset += local.length + dataBytes.length;
  }

  const centralBytes = concat(central);
  const eocd = concat([
    u32(0x06054b50),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralBytes.length),
    u32(offset),
    u16(0),
  ]);

  return concat([...chunks, centralBytes, eocd]);
}
