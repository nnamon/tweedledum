// Reading, changing and writing Twiddler 4 config files (format version 7), keeping everything in
// them: every chord, the settings and the parts of the header nobody has decoded.
//
// Layout (all integers little-endian), from nevinera/twiddling's formats/v7-cfg.md, checked against
// files from the Tuner:
//   0x00 u32  0 in factory files; the Tuner now writes a stamp here. Written as 0.
//   0x04 u8   format version, 7
//   0x05 u8   flags: bit 0 key repeat, bit 1 keyboard button mode, bit 3 haptic feedback
//   0x06 u8   touchpad: sensitivity << 3 | invert X << 2 | up direction (0 north, 1 east, 2 south, 3 west)
//   0x08 u16  chord count
//   0x0A u16  idle time before sleep, in seconds
//   0x0C u16  key repeat threshold, in 10 ms steps
//   0x40 u32  x4  modifier held by T1, T2, T3, T4
//   0x50 u8   x4  dedicated function of the mini-buttons 0L, 0M, 0R and of T0
//   0x60      32 bytes, the same in every file seen; copied unchanged
//   0x80      chords, 8 bytes each, sorted by bitmask: u32 bitmask, u8 type, then
//             type 1 (device function): u8 function code
//             type 2 (key): u8 HID modifier byte, u16 HID key
//             type 7 (string): u16 offset into the string table, at bytes 5 and 6;
//             the Tuner writes offsets past 255 there too
//   then      the string table: (u16 modifier type, u16 key) pairs, each string ended by 0, 0
//
// Bitmask: bit 0 T1, 1 to 3 row 1 R M L, 4 T2, 5 to 7 row 2, 8 T3, 9 to 11 row 3, 12 T4, 13 to 15
// row 4, 16 to 18 the mini-buttons 0L 0M 0R, 19 T0 (the Tuner shows it as T0).

import type { Chord } from './chord';
import { hidChar, keyFor } from './import';
import type { Layout } from './layout';

export interface V7Chord {
  bits: number;
  /** 1 device function, 2 key, 7 string. */
  type: number;
  /** Type 1: function code. Type 2: HID modifier byte. */
  hi: number;
  /** Type 2: HID key. */
  key: number;
  /** Type 7: the keys of the string, as [modifier word, HID key]; the word is the HID modifier byte << 8 | 2. */
  keys: [number, number][];
}

export interface V7Config {
  /** The first 128 bytes as read; fields are written back into a copy. */
  header: Uint8Array;
  chords: V7Chord[];
}

export class ConfigError extends Error {}

const HEADER = 128;

export function isV7(bytes: Uint8Array): boolean {
  return bytes.length >= HEADER && bytes[4] === 7;
}

export function parseV7(bytes: Uint8Array): V7Config {
  if (!isV7(bytes)) throw new ConfigError('This is not a Twiddler 4 config file (version 7). Nothing was changed.');
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = d.getUint16(8, true);
  const table = HEADER + 8 * count;
  if (table > bytes.length) throw new ConfigError('This config file is cut short. Nothing was changed.');
  const chords: V7Chord[] = [];
  for (let i = 0; i < count; i++) {
    const o = HEADER + 8 * i;
    const type = d.getUint8(o + 4);
    const c: V7Chord = { bits: d.getUint32(o, true), type, hi: 0, key: 0, keys: [] };
    if (type === 7) {
      for (let p = table + d.getUint16(o + 5, true); p + 4 <= bytes.length; p += 4) {
        const m = d.getUint16(p, true);
        const k = d.getUint16(p + 2, true);
        if (m === 0 && k === 0) break;
        c.keys.push([m, k]);
      }
    } else {
      c.hi = d.getUint8(o + 5);
      c.key = d.getUint16(o + 6, true);
    }
    chords.push(c);
  }
  return { header: bytes.slice(0, HEADER), chords };
}

export function writeV7(cfg: V7Config): Uint8Array {
  const chords = [...cfg.chords].sort((a, b) => a.bits - b.bits);
  // Strings go in the order of their chords, as the Tuner writes them.
  const strings: number[] = [];
  const offsets = new Map<V7Chord, number>();
  for (const c of chords) {
    if (c.type !== 7) continue;
    offsets.set(c, strings.length * 2);
    for (const [m, k] of c.keys) strings.push(m, k);
    strings.push(0, 0);
  }
  const out = new Uint8Array(HEADER + 8 * chords.length + strings.length * 2);
  const d = new DataView(out.buffer);
  out.set(cfg.header.subarray(0, HEADER));
  d.setUint32(0, 0, true);
  out[4] = 7;
  d.setUint16(8, chords.length, true);
  chords.forEach((c, i) => {
    const o = HEADER + 8 * i;
    d.setUint32(o, c.bits >>> 0, true);
    d.setUint8(o + 4, c.type);
    if (c.type === 7) d.setUint16(o + 5, offsets.get(c)!, true);
    else {
      d.setUint8(o + 5, c.hi);
      d.setUint16(o + 6, c.key, true);
    }
  });
  strings.forEach((v, i) => d.setUint16(HEADER + 8 * chords.length + i * 2, v, true));
  return out;
}

/** Bytes in the string table. */
export function stringTableSize(cfg: V7Config): number {
  return cfg.chords.filter((c) => c.type === 7).reduce((n, c) => n + 4 * (c.keys.length + 1), 0);
}

// ---- Buttons -------------------------------------------------------------------------------------

export type Button = 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | `${0 | 1 | 2 | 3 | 4}${'L' | 'M' | 'R'}`;

export const BUTTON_BIT: Record<Button, number> = {
  T1: 0, '1R': 1, '1M': 2, '1L': 3,
  T2: 4, '2R': 5, '2M': 6, '2L': 7,
  T3: 8, '3R': 9, '3M': 10, '3L': 11,
  T4: 12, '4R': 13, '4M': 14, '4L': 15,
  '0L': 16, '0M': 17, '0R': 18, T0: 19,
};

export const THUMBS: Button[] = ['T0', 'T1', 'T2', 'T3', 'T4'];
/** The Twiddler 4's names for the thumb buttons in the tutor's notation. */
export const THUMB_NAMES: Record<string, string> = { T1: 'NUM', T2: 'ALT', T3: 'CTRL', T4: 'SHIFT' };

export function has(bits: number, b: Button): boolean {
  return ((bits >>> BUTTON_BIT[b]) & 1) === 1;
}

export function toggle(bits: number, b: Button): number {
  return (bits ^ (1 << BUTTON_BIT[b])) >>> 0;
}

/** The chord as the Tuner writes it: thumbs, then finger buttons by row ("T1 T4 4R"). */
export function chordLabel(bits: number): string {
  const thumbs = THUMBS.filter((t) => has(bits, t));
  const fingers: string[] = [];
  for (const row of [0, 1, 2, 3, 4]) for (const col of ['L', 'M', 'R'] as const) if (has(bits, `${row}${col}` as Button)) fingers.push(`${row}${col}`);
  return [...thumbs, ...fingers].join(' ') || '(none)';
}

// ---- What chords do ------------------------------------------------------------------------------

/** HID keys that type no character, by name. */
export const KEY_NAMES: Record<number, string> = {
  0x28: 'Enter', 0x29: 'Escape', 0x2a: 'Backspace', 0x2b: 'Tab', 0x2c: 'Space', 0x39: 'Caps Lock',
  0x46: 'Print Screen', 0x47: 'Scroll Lock', 0x48: 'Pause', 0x49: 'Insert', 0x4a: 'Home', 0x4b: 'Page Up',
  0x4c: 'Delete', 0x4d: 'End', 0x4e: 'Page Down', 0x4f: 'Right', 0x50: 'Left', 0x51: 'Down', 0x52: 'Up',
  0x53: 'Num Lock', 0x65: 'Menu',
};
for (let i = 0; i < 12; i++) KEY_NAMES[0x3a + i] = `F${i + 1}`;

const MOD_NAMES: [number, string][] = [
  [0x01, 'Ctrl'], [0x10, 'Right Ctrl'], [0x04, 'Alt'], [0x40, 'Right Alt'], [0x08, 'Cmd'], [0x80, 'Right Cmd'], [0x02, 'Shift'], [0x20, 'Right Shift'],
];

/** Device functions by code, named as the Tuner names them. */
export const DEVICE_FUNCTIONS: Record<number, string> = {
  0x01: 'Sleep now', 0x02: 'Print system info', 0x04: 'Show or cycle config', 0x05: 'Show or cycle Bluetooth host',
  0x06: 'Clear Bluetooth pairings', 0x0a: 'Show battery level', 0x0b: 'Show or cycle touchpad mode', 0x0c: 'Toggle keyboard LEDs',
};

function keyName(mod: number, key: number): string {
  const ch = hidChar(mod, key);
  if (ch !== null) return ch === ' ' ? 'Space' : ch;
  const mods = MOD_NAMES.filter(([b]) => mod & b).map(([, n]) => n);
  const base = hidChar(0, key);
  const name = KEY_NAMES[key] ?? (base !== null ? base : `key 0x${key.toString(16)}`);
  return [...mods, name].join('+');
}

/** What the chord does, in words. */
export function actionLabel(c: V7Chord): string {
  if (c.type === 1) return DEVICE_FUNCTIONS[c.hi] ?? `Device function ${c.hi}`;
  if (c.type === 2) return keyName(c.hi, c.key);
  if (c.type === 7) {
    const text = textOf(c);
    return text !== null ? `"${text}"` : c.keys.map(([m, k]) => keyName(m >> 8, k)).join(', ');
  }
  return `Type ${c.type}`;
}

/** The text a key or string chord types, or null when it holds other keys. */
export function textOf(c: V7Chord): string | null {
  const pairs: [number, number][] = c.type === 2 ? [[c.hi, c.key]] : c.type === 7 ? c.keys.map(([m, k]) => [m >> 8, k]) : [];
  if (pairs.length === 0) return null;
  let s = '';
  for (const [m, k] of pairs) {
    const ch = hidChar(m, k);
    if (ch === null) return null;
    s += ch;
  }
  return s;
}

/** A chord that types the text, or null when a character has no key. */
export function textChord(bits: number, text: string): V7Chord | null {
  const keys: [number, number][] = [];
  for (const ch of text) {
    const k = keyFor(ch);
    if (!k) return null;
    keys.push(k);
  }
  if (keys.length === 0) return null;
  if (keys.length === 1) return { bits, type: 2, hi: keys[0][0], key: keys[0][1], keys: [] };
  return { bits, type: 7, hi: 0, key: 0, keys: keys.map(([m, k]) => [(m << 8) | 2, k]) };
}

export function keyChord(bits: number, mod: number, key: number): V7Chord {
  return { bits, type: 2, hi: mod, key, keys: [] };
}

// ---- Settings ------------------------------------------------------------------------------------

export interface V7Settings {
  keyRepeat: boolean;
  keyboardMode: boolean;
  haptic: boolean;
  /** 0 to 31. */
  sensitivity: number;
  invertX: boolean;
  /** 0 north, 1 east, 2 south, 3 west. */
  up: number;
  idleSeconds: number;
  repeatMs: number;
  /** Modifier codes held by T1 to T4. */
  thumbs: [number, number, number, number];
  /** Dedicated function codes of 0L, 0M, 0R and T0. */
  dedicated: [number, number, number, number];
}

/** Thumb modifier codes. Others are kept as they are. */
export const THUMB_MODIFIERS: Record<number, string> = { 0: 'None', 1: 'Left Control', 2: 'Left Shift', 3: 'Left Option (Alt)', 4: 'Left Command' };
/** Dedicated function codes. Others are kept as they are. */
export const DEDICATED: Record<number, string> = { 0: 'None', 9: 'Mouse left button', 10: 'Mouse right button', 11: 'Mouse middle button' };

export function readSettings(cfg: V7Config): V7Settings {
  const h = cfg.header;
  const d = new DataView(h.buffer, h.byteOffset, h.byteLength);
  return {
    keyRepeat: (h[5] & 1) !== 0,
    keyboardMode: (h[5] & 2) !== 0,
    haptic: (h[5] & 8) !== 0,
    sensitivity: h[6] >> 3,
    invertX: (h[6] & 4) !== 0,
    up: h[6] & 3,
    idleSeconds: d.getUint16(0x0a, true),
    repeatMs: d.getUint16(0x0c, true) * 10,
    thumbs: [0, 1, 2, 3].map((i) => d.getUint32(0x40 + 4 * i, true)) as V7Settings['thumbs'],
    dedicated: [0, 1, 2, 3].map((i) => h[0x50 + i]) as V7Settings['dedicated'],
  };
}

export function writeSettings(cfg: V7Config, s: V7Settings): V7Config {
  const h = cfg.header.slice();
  const d = new DataView(h.buffer);
  h[5] = (h[5] & ~0x0b) | (s.keyRepeat ? 1 : 0) | (s.keyboardMode ? 2 : 0) | (s.haptic ? 8 : 0);
  h[6] = ((Math.max(0, Math.min(31, Math.round(s.sensitivity))) << 3) | (s.invertX ? 4 : 0) | (s.up & 3)) & 0xff;
  d.setUint16(0x0a, Math.max(0, Math.min(0xffff, Math.round(s.idleSeconds))), true);
  d.setUint16(0x0c, Math.max(0, Math.min(0xffff, Math.round(s.repeatMs / 10))), true);
  s.thumbs.forEach((v, i) => d.setUint32(0x40 + 4 * i, v, true));
  s.dedicated.forEach((v, i) => (h[0x50 + i] = v));
  return { ...cfg, header: h };
}

// ---- Changing many chords ------------------------------------------------------------------------

/** Device-function chords stay on their buttons: the Tuner puts the system ones back if they move. */
function fixed(c: V7Chord): boolean {
  return c.type === 1;
}

function moveAll(cfg: V7Config, map: (bits: number) => number): { cfg: V7Config; clashes: V7Chord[] } {
  const stay = cfg.chords.filter(fixed);
  const taken = new Set(stay.map((c) => c.bits));
  const clashes: V7Chord[] = [];
  const moved: V7Chord[] = [];
  for (const c of cfg.chords) {
    if (fixed(c)) continue;
    const bits = map(c.bits);
    if (taken.has(bits)) {
      clashes.push(c);
      moved.push(c);
    } else moved.push({ ...c, bits });
  }
  return { cfg: { ...cfg, chords: [...stay, ...moved] }, clashes };
}

/**
 * Exchanges two thumb buttons in every chord except device functions, and their held modifiers. A
 * chord that would land on a device function's buttons stays where it is and is returned.
 */
export function swapThumbs(cfg: V7Config, a: 'T1' | 'T2' | 'T3' | 'T4', b: 'T1' | 'T2' | 'T3' | 'T4'): { cfg: V7Config; clashes: V7Chord[] } {
  const ba = BUTTON_BIT[a];
  const bb = BUTTON_BIT[b];
  const r = moveAll(cfg, (bits) => {
    const x = (bits >>> ba) & 1;
    const y = (bits >>> bb) & 1;
    return ((bits & ~((1 << ba) | (1 << bb))) | (x << bb) | (y << ba)) >>> 0;
  });
  const s = readSettings(r.cfg);
  const ia = Number(a[1]) - 1;
  const ib = Number(b[1]) - 1;
  [s.thumbs[ia], s.thumbs[ib]] = [s.thumbs[ib], s.thumbs[ia]];
  return { cfg: writeSettings(r.cfg, s), clashes: r.clashes };
}

/** Exchanges the L and R columns in every chord except device functions, as the Tuner's Mirror does. */
export function mirror(cfg: V7Config): { cfg: V7Config; clashes: V7Chord[] } {
  return moveAll(cfg, (bits) => {
    let out = bits;
    for (const row of [0, 1, 2, 3, 4]) {
      const l = BUTTON_BIT[`${row}L` as Button];
      const r = BUTTON_BIT[`${row}R` as Button];
      const x = (bits >>> l) & 1;
      const y = (bits >>> r) & 1;
      out = (out & ~((1 << l) | (1 << r))) | (x << r) | (y << l);
    }
    return out >>> 0;
  });
}

// ---- From a typing layout -------------------------------------------------------------------------

/**
 * The Tuner's "v7 Empty" config: default settings and the 8 system chords, and no others. From
 * nevinera/twiddling's fixtures/v7/empty.cfg (MIT licence).
 */
const EMPTY = 'AAAAAAcJIAAIAFgCZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAQAAAAIAAAAKCwkJAAAAAAAAAAAAAAAAAAECAwQFBgcICQoMDQ8RFBYYGh2AgICAgICAgICAgIABMAAAAQYAAAIACAABAgAABAAIAAEKAAAIAAgAAQwAABABCAABAQAAACAIAAEFAAAAQAgAAQQAAACACAABCwAA';

const THUMB_BUTTON = { N: 'T1', A: 'T2', C: 'T3', S: 'T4' } as const;
const KEY_CODES: Record<string, number> = { ENT: 0x28, ESC: 0x29, BS: 0x2a, TAB: 0x2b, DEL: 0x4c };

export function chordBits(c: Chord): number {
  let bits = 0;
  for (const t of c.thumbs) bits |= 1 << BUTTON_BIT[THUMB_BUTTON[t]];
  c.rows.forEach((cell, i) => {
    if (cell !== 'O') bits |= 1 << BUTTON_BIT[`${i + 1}${cell}` as Button];
  });
  return bits >>> 0;
}

export function emptyConfig(): V7Config {
  return parseV7(fromBase64(EMPTY));
}

/**
 * A config with the Tuner's default settings and system chords, and the chords of a typing layout.
 * Chords for shortcuts, arrows and other keys a typing layout leaves out are not in it.
 */
export function configFromLayout(layout: Layout): V7Config {
  const cfg = emptyConfig();
  const taken = new Set(cfg.chords.map((c) => c.bits));
  const add = (c: V7Chord | null) => {
    if (c && !taken.has(c.bits)) {
      taken.add(c.bits);
      cfg.chords.push(c);
    }
  };
  for (const e of layout.entries) add(textChord(chordBits(e.chord), e.output));
  for (const k of layout.keys ?? []) if (KEY_CODES[k.name]) add(keyChord(chordBits(k.chord), 0, KEY_CODES[k.name]));
  return cfg;
}

// ---- Storage -------------------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
