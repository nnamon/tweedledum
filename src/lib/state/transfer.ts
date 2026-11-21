// Moving a profile between copies of the app, with no server: a progress code to copy and paste,
// or a file. The code is the profile as JSON, compressed (deflate) where the browser can, in
// base64url with a prefix: "TWD1." compressed, "TWD0." plain.

import { normaliseProfile, type Profile } from './profile';

const COMPRESSED = 'TWD1.';
const PLAIN = 'TWD0.';

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replaceAll('-', '+').replaceAll('_', '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function canCompress(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

export async function exportCode(p: Profile): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  if (canCompress()) return COMPRESSED + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
  return PLAIN + toBase64Url(bytes);
}

/** The profile as a file's text: readable JSON. */
export function exportFile(p: Profile): string {
  return JSON.stringify(p, null, 1);
}

export class ImportError extends Error {}

/**
 * Reads a progress code or a progress file's text. Whitespace and line breaks in a pasted code
 * are ignored. Throws ImportError with a sentence to show when it cannot be read.
 */
export async function importText(text: string): Promise<Profile> {
  const t = text.trim();
  let json: string;
  if (t.startsWith('{')) {
    json = t;
  } else {
    const code = t.replace(/\s+/g, '');
    try {
      if (code.startsWith(COMPRESSED)) {
        if (!canCompress()) throw new ImportError('This browser cannot read compressed progress codes. Use a progress file instead.');
        json = new TextDecoder().decode(await pipe(fromBase64Url(code.slice(COMPRESSED.length)), new DecompressionStream('deflate-raw')));
      } else if (code.startsWith(PLAIN)) {
        json = new TextDecoder().decode(fromBase64Url(code.slice(PLAIN.length)));
      } else {
        throw new ImportError('That is not a Tweedledum progress code. Codes start with TWD1.');
      }
    } catch (e) {
      if (e instanceof ImportError) throw e;
      throw new ImportError('That progress code is damaged or cut short. Copy the whole code and try again.');
    }
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ImportError('That file is not a Tweedledum progress file.');
  }
  try {
    return normaliseProfile(raw);
  } catch {
    throw new ImportError('That file is not a Tweedledum progress file.');
  }
}
