// Reading layouts from the files people already have:
//   - Twiddler config files (.cfg): version 4 (Twiddler 2), 5 (Twiddler 3) and 7 (Twiddler 4)
//   - CSV exported by the Twiddler Tuner: the Twiddler 3 form ("Chord","Key Stroke") and the
//     Twiddler 4 form ("Thumbs","Fingers","Actions")
//   - JSON: the Tek Gear Typing Tutor's custom key map ({"chords":[{"chord","key"}]}), which is
//     also what Tweedledum exports
//
// Only chords that type text are kept: letters, digits, punctuation, space, and strings of them.
// Chords for Ctrl or Alt shortcuts, arrows, function keys and mouse actions are counted and
// skipped. Chords holding two buttons in one row are skipped too: the keypad picture and the
// lessons use one button per row.
//
// The binary formats follow the open-source parsers listed in THIRD_PARTY_NOTICES.md. All
// integers are little-endian; keys are USB HID usage codes. The chord bitmask is the same in
// every version: bit 0 T1 (NUM), 1 row 1 R, 2 row 1 M, 3 row 1 L, 4 T2 (ALT), 5 to 7 row 2 R M L,
// 8 T3 (CTRL), 9 to 11 row 3, 12 T4 (SHIFT), 13 to 15 row 4.

import { type Cell, type Chord, type Thumb, chordText, parseChord } from './chord';
import type { Entry, Layout } from './layout';

export interface ImportResult {
  layout: Layout;
  /** Chords left out because they do not type text, or use buttons the lessons do not. */
  skipped: number;
  format: string;
}

export class LayoutError extends Error {}

// ---- Keys --------------------------------------------------------------------------------------

const HID: Record<number, string> = { 0x2c: ' ', 0x2d: '-', 0x2e: '=', 0x2f: '[', 0x30: ']', 0x31: '\\', 0x33: ';', 0x34: "'", 0x35: '`', 0x36: ',', 0x37: '.', 0x38: '/' };
for (let i = 0; i < 26; i++) HID[4 + i] = String.fromCharCode(97 + i);
'1234567890'.split('').forEach((c, i) => (HID[0x1e + i] = c));

const SHIFTED: Record<string, string> = {
  '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
  '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', '`': '~', ',': '<', '.': '>', '/': '?',
};

function shift(ch: string): string {
  return SHIFTED[ch] ?? ch.toUpperCase();
}

/** The HID modifier byte and key that type a character, or null. Shifted characters use Right Shift, as the Tuner writes them. */
export function keyFor(ch: string): [mod: number, key: number] | null {
  for (const [k, c] of Object.entries(HID)) {
    if (c === ch) return [0, Number(k)];
    if (shift(c) === ch) return [0x20, Number(k)];
  }
  return null;
}

const MOD_SHIFT = 0x02 | 0x20;
const MOD_OTHER = 0xff & ~MOD_SHIFT;

/** The character a HID key with a modifier byte types, or null when it is not text. */
export function hidChar(mod: number, key: number): string | null {
  if (mod & MOD_OTHER) return null;
  const ch = HID[key];
  if (ch === undefined) return null;
  return mod & MOD_SHIFT ? shift(ch) : ch;
}

// ---- Chord bitmask -----------------------------------------------------------------------------

const THUMB_BITS: [Thumb, number][] = [['N', 0], ['A', 4], ['C', 8], ['S', 12]];

/** A chord from the config bitmask, or null when it holds two buttons in a row or extra buttons. */
export function chordFromBits(bits: number): Chord | null {
  if (bits >>> 16) return null;
  const thumbs = THUMB_BITS.filter(([, b]) => (bits >> b) & 1).map(([t]) => t);
  const rows: Cell[] = [];
  for (let r = 0; r < 4; r++) {
    const base = 1 + 4 * r;
    const held = (['R', 'M', 'L'] as const).filter((_, i) => (bits >> (base + i)) & 1);
    if (held.length > 1) return null;
    rows.push(held[0] ?? 'O');
  }
  if (rows.every((x) => x === 'O')) return null;
  return { rows: rows as Chord['rows'], thumbs };
}

// ---- Binary .cfg -------------------------------------------------------------------------------

/** Keys that do not type text but are worth a label on the keypad picture. */
const HID_NAMES: Record<number, string> = { 0x28: 'ENT', 0x29: 'ESC', 0x2a: 'BS', 0x2b: 'TAB', 0x4c: 'DEL' };
const TAG_NAMES: Record<string, string> = { return: 'ENT', enter: 'ENT', escape: 'ESC', esc: 'ESC', backspace: 'BS', bksp: 'BS', tab: 'TAB', delete: 'DEL', del: 'DEL' };

/** The keypad label for a lone named key in a Tuner field ("<Return>"), or null. */
export function strokeName(raw: string): string | null {
  const m = /^(?:\[KB\])?<([A-Za-z ]+)>$/.exec(raw.trim());
  return m ? (TAG_NAMES[m[1].toLowerCase().replace(/\s/g, '')] ?? null) : null;
}

class Builder {
  entries: Entry[] = [];
  keys: { chord: Chord; name: string }[] = [];
  skipped = 0;
  /** A chord that types no text: kept as a label when it is a known key. */
  key(chord: Chord | null, name: string | null) {
    this.skipped++;
    if (chord && name) this.keys.push({ chord, name });
  }
  add(chord: Chord | null, output: string | null) {
    if (!chord || !output) {
      this.skipped++;
      return;
    }
    this.entries.push({ chord, output });
  }
}

function hidString(pairs: [number, number][]): string | null {
  let s = '';
  for (const [m, k] of pairs) {
    const ch = hidChar(m, k);
    if (ch === null) return null;
    s += ch;
  }
  return s || null;
}

function readV4V5(d: DataView, b: Builder) {
  const ver = d.getUint8(0);
  const chords: [number, number, number][] = [];
  const strings: (string | null)[] = [];
  const readStringAt = (o: number): string | null => {
    const len = d.getUint16(o, true);
    const pairs: [number, number][] = [];
    for (let i = 0; i < (len - 2) / 2; i++) pairs.push([d.getUint8(o + 2 + 2 * i), d.getUint8(o + 3 + 2 * i)]);
    return hidString(pairs);
  };
  if (ver === 4) {
    const stringOffset = d.getUint16(5, true);
    for (let o = 16; o + 4 <= d.byteLength; o += 4) {
      const bits = d.getUint16(o, true);
      const m = d.getUint8(o + 2);
      const k = d.getUint8(o + 3);
      if (bits === 0 && m === 0 && k === 0) break;
      chords.push([bits, m, k]);
    }
    for (let o = stringOffset; o + 2 <= d.byteLength; ) {
      const len = d.getUint16(o, true);
      if (len === 0) break;
      strings.push(readStringAt(o));
      o += len;
    }
  } else {
    const count = d.getUint16(2, true);
    let o = 16;
    for (let i = 0; i < count; i++, o += 4) chords.push([d.getUint16(o, true), d.getUint8(o + 2), d.getUint8(o + 3)]);
    const nStrings = chords.filter((c) => c[1] === 0xff).length;
    for (let i = 0; i < nStrings; i++) strings.push(readStringAt(d.getUint32(o + 4 * i, true)));
  }
  for (const [bits, m, k] of chords) {
    const out = m === 0xff ? (strings[k] ?? null) : hidChar(m, k);
    if (out === null && m === 0 && HID_NAMES[k]) b.key(chordFromBits(bits), HID_NAMES[k]);
    else b.add(chordFromBits(bits), out);
  }
}

function readV7(d: DataView, b: Builder) {
  const count = d.getUint16(8, true);
  const table = 128 + 8 * count;
  for (let i = 0; i < count; i++) {
    const o = 128 + 8 * i;
    const bits = d.getUint32(o, true);
    const type = d.getUint8(o + 4);
    const chord = chordFromBits(bits);
    if (type === 2) {
      const m = d.getUint8(o + 5);
      const k = d.getUint8(o + 6);
      const out = hidChar(m, k);
      if (out === null && m === 0 && HID_NAMES[k]) b.key(chord, HID_NAMES[k]);
      else b.add(chord, out);
    } else if (type === 7) {
      const pairs: [number, number][] = [];
      let ok = true;
      for (let p = table + d.getUint16(o + 5, true); p + 4 <= d.byteLength; p += 4) {
        const t = d.getUint8(p);
        const m = d.getUint8(p + 1);
        const k = d.getUint8(p + 2);
        if (t === 0 && m === 0 && k === 0) break;
        if (t !== 2) ok = false;
        pairs.push([m, k]);
      }
      b.add(chord, ok ? hidString(pairs) : null);
    } else {
      b.skipped++;
    }
  }
}

export function importConfig(bytes: Uint8Array, name: string): ImportResult {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const b = new Builder();
  let format: string;
  try {
    // Version 7 has its version in byte 4; v4 and v5 files hold 1 or 16 there. Bytes 0 to 3 are
    // zero in factory files and a stamp in files downloaded from the Tuner.
    if (bytes.length >= 128 && bytes[4] === 7) {
      readV7(d, b);
      format = 'Twiddler 4 config (version 7)';
    } else if (bytes[0] === 4 || bytes[0] === 5) {
      readV4V5(d, b);
      format = bytes[0] === 4 ? 'Twiddler 2 config (version 4)' : 'Twiddler 3 config (version 5)';
    } else {
      throw new LayoutError("Tweedledum can't read this config file version, only versions 4, 5 and 7. Nothing was changed.");
    }
  } catch (e) {
    if (e instanceof LayoutError) throw e;
    throw new LayoutError('This config file is damaged or cut short. Nothing was changed.');
  }
  return finish(b, name, format);
}

// ---- Text formats ------------------------------------------------------------------------------

/** Splits CSV into rows of fields. Handles quotes, doubled quotes and a byte order mark. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const NAMED: Record<string, string> = { space: ' ', spc: ' ', spacebar: ' ' };

/**
 * The text a Tuner key stroke field types, or null when it holds anything else. Reads literal
 * characters, [SPC], <Space>, and shift tags around text (<LShift>8</LShift>, <R-Shift>x</R-Shift>).
 */
export function decodeStrokes(raw: string): string | null {
  let s = raw.replace(/\[KB\]/g, '');
  let out = '';
  let shifted = 0;
  while (s.length) {
    if (s.startsWith('[SPC]')) {
      out += ' ';
      s = s.slice(5);
      continue;
    }
    const tag = /^<(\/?)([^<>]+)>/.exec(s);
    if (tag && s.length > 1) {
      const closing = tag[1] === '/';
      const name = tag[2].toLowerCase().replace(/[^a-z]/g, '');
      s = s.slice(tag[0].length);
      if (/^(l|r|left|right)?shift$/.test(name)) {
        shifted += closing ? -1 : 1;
        continue;
      }
      if (!closing && NAMED[name] !== undefined) {
        out += NAMED[name];
        continue;
      }
      return null;
    }
    const ch = [...s][0];
    s = s.slice(ch.length);
    out += shifted > 0 ? shift(ch) : ch;
  }
  return out === '' ? null : out;
}

/** Twiddler 4 Tuner fields: thumbs "12" and fingers "1R 2M". */
function chordFromT4(thumbs: string, fingers: string): Chord | null {
  const t: Thumb[] = [];
  for (const d of thumbs.replace(/[^0-9]/g, '')) {
    const th = ({ '1': 'N', '2': 'A', '3': 'C', '4': 'S' } as Record<string, Thumb>)[d];
    if (!th) return null;
    t.push(th);
  }
  const rows: Cell[] = ['O', 'O', 'O', 'O'];
  for (const part of fingers.trim().toUpperCase().split(/\s+/).filter(Boolean)) {
    const m = /^F?([1-4])([LMR])$/.exec(part);
    if (!m) return null;
    const r = Number(m[1]) - 1;
    if (rows[r] !== 'O') return null;
    rows[r] = m[2] as Cell;
  }
  if (rows.every((x) => x === 'O')) return null;
  return parseChord([...t, rows.join('')].join('+'));
}

function addStroke(b: Builder, chord: Chord | null, field: string) {
  const out = decodeStrokes(field);
  if (out === null && strokeName(field)) b.key(chord, strokeName(field));
  else b.add(chord, out);
}

function importCsv(text: string, name: string): ImportResult {
  const rows = parseCsv(text);
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const b = new Builder();
  if (head[0] === 'thumbs' && head[1] === 'fingers') {
    for (const r of rows.slice(1)) addStroke(b, chordFromT4(r[0] ?? '', r[1] ?? ''), r[2] ?? '');
    return finish(b, name, 'Twiddler 4 Tuner CSV');
  }
  const body = head[0] === 'chord' ? rows.slice(1) : rows;
  for (const r of body) addStroke(b, parseChord(r[0] ?? ''), r[1] ?? '');
  return finish(b, name, 'Twiddler 3 Tuner CSV');
}

function importJson(text: string, name: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new LayoutError('That file is not valid JSON. Nothing was changed.');
  }
  const obj = raw as { chords?: unknown; name?: unknown };
  if (!obj || !Array.isArray(obj.chords)) throw new LayoutError('That JSON file has no "chords" list. Nothing was changed.');
  const b = new Builder();
  for (const item of obj.chords as { chord?: unknown; key?: unknown; m?: unknown }[]) {
    if (typeof item?.chord !== 'string' || typeof item?.key !== 'string') {
      b.skipped++;
      continue;
    }
    // The tutor's own list has a mode field: O, N, S, NA.
    const mode = typeof item.m === 'string' && item.m !== 'O' ? `${item.m}+` : '';
    b.add(parseChord(mode + item.chord), item.key.startsWith('<') && item.key.length > 1 ? decodeStrokes(item.key) : item.key);
  }
  return finish(b, typeof obj.name === 'string' ? obj.name : name, 'JSON key map');
}

function finish(b: Builder, name: string, format: string): ImportResult {
  // The first chord for each button combination wins, as on the device.
  const seen = new Set<string>();
  const entries = b.entries.filter((e) => {
    const k = chordText(e.chord);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const skipped = b.skipped + (b.entries.length - entries.length);
  if (entries.length === 0) throw new LayoutError('No chords that type text were found in that file. Nothing was changed.');
  const keys = b.keys.filter((k) => {
    const c = chordText(k.chord);
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
  return { layout: { name: name.replace(/\.[a-z0-9]+$/i, '') || 'Imported layout', entries, keys }, skipped, format };
}

/** Reads a layout file by its content. */
export function importLayout(bytes: Uint8Array, fileName: string): ImportResult {
  const head = new TextDecoder().decode(bytes.subarray(0, 64)).replace(/^﻿/, '').trimStart();
  if (head.startsWith('{')) return importJson(new TextDecoder().decode(bytes), fileName);
  if (head.startsWith('"') || /^chord/i.test(head) || /^thumbs/i.test(head)) return importCsv(new TextDecoder().decode(bytes), fileName);
  return importConfig(bytes, fileName);
}

/** Reads a layout pasted as text: JSON or CSV. */
export function importLayoutText(text: string, name = 'Pasted layout'): ImportResult {
  const t = text.trim();
  if (t.startsWith('{')) return importJson(t, name);
  return importCsv(t, name);
}

/** The layout as JSON, in the tutor's key map form with the thumb buttons written into the chord. */
export function exportLayoutJson(layout: Layout): string {
  return JSON.stringify({ name: layout.name, chords: layout.entries.map((e) => ({ chord: chordText(e.chord), key: e.output })) }, null, 1);
}
