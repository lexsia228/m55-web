/**
 * Per-file evidence identity — real PNG decode and PDF structure inspection.
 *
 * No external image/PDF dependency: PNG is decoded from IHDR + inflated IDAT
 * scanlines, PDF is inspected via object dictionaries and inflated content
 * streams. This is what proves an evidence file is a real, non-blank capture
 * rather than a same-sized placeholder.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export type PngIdentity = {
  kind: 'png';
  decoded: true;
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  byteLength: number;
  sha256: string;
  /** Mean luminance 0–255 over sampled pixels. */
  meanLuminance: number;
  /** Population standard deviation of sampled luminance. */
  luminanceStdDev: number;
  /** Distinct 16-level luminance buckets observed. */
  distinctLuminanceBuckets: number;
  sampledPixels: number;
};

export type PngDecodeFailure = {
  kind: 'png';
  decoded: false;
  byteLength: number;
  sha256: string;
  reason: string;
};

export type PdfIdentity = {
  kind: 'pdf';
  decoded: true;
  byteLength: number;
  sha256: string;
  pageCount: number;
  inflatedContentBytes: number;
  textShowingOperators: number;
  hasFontResource: boolean;
};

export type PdfDecodeFailure = {
  kind: 'pdf';
  decoded: false;
  byteLength: number;
  sha256: string;
  reason: string;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Sample at most this many pixels per image when computing content statistics. */
const MAX_SAMPLED_PIXELS = 200_000;

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function channelsForColorType(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1; // grayscale
    case 2:
      return 3; // RGB
    case 3:
      return 1; // palette index
    case 4:
      return 2; // grayscale + alpha
    case 6:
      return 4; // RGBA
    default:
      return 0;
  }
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterScanlines(
  raw: Buffer,
  width: number,
  height: number,
  bytesPerPixel: number,
): Buffer {
  const stride = width * bytesPerPixel;
  const out = Buffer.alloc(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const lineStart = y * stride;
    const prevStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const rawByte = raw[pos + x];
      const left = x >= bytesPerPixel ? out[lineStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? out[prevStart + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? out[prevStart + x - bytesPerPixel] : 0;
      let value: number;
      switch (filter) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = rawByte + left;
          break;
        case 2:
          value = rawByte + up;
          break;
        case 3:
          value = rawByte + ((left + up) >> 1);
          break;
        case 4:
          value = rawByte + paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`unsupported PNG filter type ${filter} on row ${y}`);
      }
      out[lineStart + x] = value & 0xff;
    }
    pos += stride;
  }
  return out;
}

export function readPngIdentity(absPath: string): PngIdentity | PngDecodeFailure {
  const buf = readFileSync(absPath);
  const digest = sha256(buf);
  const base = { kind: 'png' as const, byteLength: buf.byteLength, sha256: digest };

  if (buf.byteLength < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ...base, decoded: false, reason: 'missing PNG signature' };
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  const idatParts: Buffer[] = [];

  try {
    while (offset + 8 <= buf.byteLength) {
      const length = buf.readUInt32BE(offset);
      const type = buf.toString('ascii', offset + 4, offset + 8);
      const dataStart = offset + 8;
      if (dataStart + length > buf.byteLength) {
        return { ...base, decoded: false, reason: `truncated chunk ${type}` };
      }
      if (type === 'IHDR') {
        width = buf.readUInt32BE(dataStart);
        height = buf.readUInt32BE(dataStart + 4);
        bitDepth = buf[dataStart + 8];
        colorType = buf[dataStart + 9];
        interlace = buf[dataStart + 12];
      } else if (type === 'IDAT') {
        idatParts.push(buf.subarray(dataStart, dataStart + length));
      } else if (type === 'IEND') {
        break;
      }
      offset = dataStart + length + 4;
    }
  } catch (err) {
    return { ...base, decoded: false, reason: `chunk walk failed: ${(err as Error).message}` };
  }

  if (width <= 0 || height <= 0) {
    return { ...base, decoded: false, reason: 'IHDR missing or zero dimensions' };
  }
  if (interlace !== 0) {
    return { ...base, decoded: false, reason: 'interlaced PNG not supported' };
  }
  if (bitDepth !== 8) {
    return { ...base, decoded: false, reason: `unsupported bit depth ${bitDepth}` };
  }
  const channels = channelsForColorType(colorType);
  if (channels === 0 || colorType === 3) {
    return { ...base, decoded: false, reason: `unsupported color type ${colorType}` };
  }
  if (idatParts.length === 0) {
    return { ...base, decoded: false, reason: 'no IDAT data' };
  }

  let pixels: Buffer;
  try {
    const inflated = inflateSync(Buffer.concat(idatParts));
    const expected = (width * channels + 1) * height;
    if (inflated.byteLength < expected) {
      return {
        ...base,
        decoded: false,
        reason: `inflated ${inflated.byteLength} bytes, expected >= ${expected}`,
      };
    }
    pixels = unfilterScanlines(inflated, width, height, channels);
  } catch (err) {
    return { ...base, decoded: false, reason: `IDAT decode failed: ${(err as Error).message}` };
  }

  const totalPixels = width * height;
  const stride = Math.max(1, Math.floor(totalPixels / MAX_SAMPLED_PIXELS));
  const buckets = new Set<number>();
  let sum = 0;
  let sumSq = 0;
  let sampled = 0;

  for (let index = 0; index < totalPixels; index += stride) {
    const at = index * channels;
    let lum: number;
    if (channels >= 3) {
      lum = 0.299 * pixels[at] + 0.587 * pixels[at + 1] + 0.114 * pixels[at + 2];
    } else {
      lum = pixels[at];
    }
    sum += lum;
    sumSq += lum * lum;
    buckets.add(Math.floor(lum / 16));
    sampled += 1;
  }

  const mean = sampled > 0 ? sum / sampled : 0;
  const variance = sampled > 0 ? Math.max(0, sumSq / sampled - mean * mean) : 0;

  return {
    kind: 'png',
    decoded: true,
    width,
    height,
    bitDepth,
    colorType,
    byteLength: buf.byteLength,
    sha256: digest,
    meanLuminance: Number(mean.toFixed(3)),
    luminanceStdDev: Number(Math.sqrt(variance).toFixed(3)),
    distinctLuminanceBuckets: buckets.size,
    sampledPixels: sampled,
  };
}

function countOccurrences(haystack: string, needle: RegExp): number {
  const matches = haystack.match(needle);
  return matches ? matches.length : 0;
}

export function readPdfIdentity(absPath: string): PdfIdentity | PdfDecodeFailure {
  const buf = readFileSync(absPath);
  const digest = sha256(buf);
  const base = { kind: 'pdf' as const, byteLength: buf.byteLength, sha256: digest };

  if (!buf.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
    return { ...base, decoded: false, reason: 'missing %PDF- header' };
  }

  const latin = buf.toString('latin1');
  const pageCount = countOccurrences(latin, /\/Type\s*\/Page[^s]/g);
  const hasFontResource = /\/Font\b/.test(latin) || /\/BaseFont\b/.test(latin);

  let inflatedContentBytes = 0;
  let textShowingOperators = 0;
  // Lookbehind keeps the `stream` inside `endstream` from being treated as an opener.
  const streamRe = /(?<![a-zA-Z])stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin)) !== null) {
    const start = match.index + match[0].length;
    const end = latin.indexOf('endstream', start);
    if (end < 0) break;
    const slice = buf.subarray(start, end);
    try {
      const inflated = inflateSync(slice);
      inflatedContentBytes += inflated.byteLength;
      const text = inflated.toString('latin1');
      textShowingOperators += countOccurrences(text, /\b(Tj|TJ)\b/g);
    } catch {
      // Non-Flate stream (embedded font program, JPEG image) — not content text.
    }
    streamRe.lastIndex = end + 'endstream'.length;
  }

  return {
    kind: 'pdf',
    decoded: true,
    byteLength: buf.byteLength,
    sha256: digest,
    pageCount,
    inflatedContentBytes,
    textShowingOperators,
    hasFontResource,
  };
}

/** Content thresholds that separate a real capture from a blank/loading placeholder. */
export const PNG_NONBLANK_CONTRACT = {
  minDistinctLuminanceBuckets: 4,
  minLuminanceStdDev: 2,
} as const;

export const PDF_NONLOADING_CONTRACT = {
  minPageCount: 1,
  minInflatedContentBytes: 2_000,
  minTextShowingOperators: 10,
} as const;

export function pngIsNonBlank(identity: PngIdentity): boolean {
  return (
    identity.distinctLuminanceBuckets >= PNG_NONBLANK_CONTRACT.minDistinctLuminanceBuckets &&
    identity.luminanceStdDev >= PNG_NONBLANK_CONTRACT.minLuminanceStdDev
  );
}

export function pdfIsNotLoadingOnly(identity: PdfIdentity): boolean {
  return (
    identity.pageCount >= PDF_NONLOADING_CONTRACT.minPageCount &&
    identity.inflatedContentBytes >= PDF_NONLOADING_CONTRACT.minInflatedContentBytes &&
    identity.textShowingOperators >= PDF_NONLOADING_CONTRACT.minTextShowingOperators
  );
}
