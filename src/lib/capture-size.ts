/* ============================================================================
   The real pixel size of a capture, read from the file
   ============================================================================
   The /work windows print a small technical mark with the size of the still
   and the footage behind them. Those sizes live in src/data/capture-sizes.json,
   because a page is prerendered where there is no file system, and
   work-figures.test.ts reads every file with these two readers and fails if
   the JSON and the files disagree. Re-shoot a study at a new size and the test
   says what to write. Two tiny header readers, no dependency.
   ============================================================================ */
export interface Size {
  w: number;
  h: number;
}

/** Width and height from a WebP's header (lossy VP8, lossless VP8L or extended VP8X). */
export function webpSize(b: Uint8Array): Size {
  const ascii = (a: number, z: number) => String.fromCharCode(...b.subarray(a, z));
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 12) !== 'WEBP') throw new Error('Not a WebP file');
  const u24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  const u16 = (i: number) => b[i] | (b[i + 1] << 8);
  const kind = ascii(12, 16);
  if (kind === 'VP8X') return { w: 1 + u24(24), h: 1 + u24(27) };
  if (kind === 'VP8 ') return { w: u16(26) & 0x3fff, h: u16(28) & 0x3fff };
  if (kind === 'VP8L') {
    const n = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
    return { w: (n & 0x3fff) + 1, h: ((n >>> 14) & 0x3fff) + 1 };
  }
  throw new Error(`Unknown WebP chunk ${kind}`);
}

/** The display size of an MP4's first track with a picture, from its track header (tkhd). */
export function mp4Size(b: Uint8Array): Size {
  const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  for (let i = 4; i < b.length - 4; i++) {
    // 't' 'k' 'h' 'd': the box's size sits in the four bytes before its name.
    if (b[i] !== 0x74 || b[i + 1] !== 0x6b || b[i + 2] !== 0x68 || b[i + 3] !== 0x64) continue;
    const end = i - 4 + u32(i - 4);
    // Width and height close the box as 16.16 fixed-point numbers. An audio track is 0 by 0.
    const w = u32(end - 8) / 65536,
      h = u32(end - 4) / 65536;
    if (w > 0 && h > 0) return { w: Math.round(w), h: Math.round(h) };
  }
  throw new Error('No video track header in this MP4');
}
