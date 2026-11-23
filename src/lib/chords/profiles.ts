// Profiles: sets of changes the Tuner applies to an open config in one go. Each change finds chords
// by what they type, so a profile applies to the factory layout, a Tuner download or a config
// built from a typing layout.

import { DEFAULT_LAYOUT } from './layout';
import {
  BUTTON_BIT, actionLabel, chordLabel, configFromLayout, emptyConfig, keyChord, readSettings, textChord, textOf, writeSettings,
  type Button, type V7Chord, type V7Config,
} from './v7';

export type ChangeId = 'system' | 'nav' | 'digits' | 'symbols' | 'thumbs' | 'words';

export interface Change {
  id: ChangeId;
  title: string;
  detail: string;
}

export interface Profile {
  id: string;
  title: string;
  detail: string;
  changes: Change[];
}

const bitsOf = (...buttons: Button[]) => buttons.reduce((n, b) => n | (1 << BUTTON_BIT[b]), 0) >>> 0;

const T1 = bitsOf('T1');
const T2 = bitsOf('T2');
const T3 = bitsOf('T3');
const T4 = bitsOf('T4');
const THUMB_BITS = T1 | T2 | T3 | T4 | bitsOf('T0');
/** Thumb buttons the short-thumbs profile moves things off. T4 stays: it holds Shift. */
const FAR = T1 | T2 | T3;

/** Keys that type nothing, where the factory layout has them: [buttons, HID modifier, HID key]. */
export const NAV_KEYS: [Button[], number, number][] = [
  [['2M', '3R'], 0, 0x52], [['2M', '3M'], 0, 0x50], [['2M', '3L'], 0, 0x51], [['2M', '4M'], 0, 0x4f],
  [['2R', '3R', '4R'], 0, 0x4a], [['2L', '3L', '4L'], 0, 0x4d], [['3R', '4R'], 0, 0x4b], [['3L', '4L'], 0, 0x4e],
  [['1R', '2R', '3R'], 0, 0x29], [['1R', '2R', '3R', '4R'], 0, 0x39], [['1M', '2M', '3M', '4M'], 0, 0x53],
  [['1M', '2M', '4M'], 0, 0x2b], [['T4', '1M', '2M', '4M'], 0x02, 0x2b],
];

/**
 * Digits on a row 1 barre: one finger across 1L, 1M and 1R, then the digit as on a phone keypad
 * turned on its side. Column L is 1 to 3, M is 4 to 6, R is 7 to 9, down rows 2 to 4.
 */
const BARRE: Button[] = ['1L', '1M', '1R'];
export const DIGITS: [string, Button[]][] = [
  ['1', [...BARRE, '2L']], ['2', [...BARRE, '3L']], ['3', [...BARRE, '4L']],
  ['4', [...BARRE, '2M']], ['5', [...BARRE, '3M']], ['6', [...BARRE, '4M']],
  ['7', [...BARRE, '2R']], ['8', [...BARRE, '3R']], ['9', [...BARRE, '4R']],
  ['0', [...BARRE, '2L', '3L']],
];

/** Brackets and the symbols that need a far thumb on the factory layout, on 1R or 1M with rows 3 and 4. */
export const SYMBOLS: [string, Button[]][] = [
  ['[', ['1R', '3R', '4L']], [']', ['1R', '3R', '4M']],
  ['{', ['1R', '3M', '4L']], ['}', ['1R', '3M', '4M']],
  ['<', ['1R', '3L', '4L']], ['>', ['1R', '3L', '4M']],
  ['|', ['1R', '3M', '4R']], ['^', ['1R', '3L', '4R']],
  ['`', ['1M', '3R', '4M']], ['~', ['1M', '3R', '4L']],
];

/**
 * Whole words worth a chord, by the share of typing they save in English web text (Peter Norvig's
 * word counts from Google's web corpus, the 20,000 most common words), after the factory word chords.
 */
export const COMMON_WORDS = ['for ', 'that ', 'this ', 'with ', 'is ', 'from ', 'you ', 'your ', 'not ', 'on ', 'are ', 'have ', 'about ', 'will '];

/** Four-finger chords for words: the given row 1 button, then row 2 R or M, then any of rows 3 and 4. */
function wordSpots(first: Button): number[] {
  const out: number[] = [];
  for (const two of ['R', 'M'] as const) for (const three of ['R', 'M', 'L'] as const) for (const four of ['R', 'M', 'L'] as const) {
    out.push(bitsOf(first, `2${two}`, `3${three}`, `4${four}`));
  }
  return out;
}

export const CHANGES: Record<ChangeId, Change> = {
  system: {
    id: 'system', title: 'Device functions on their usual buttons',
    detail: 'Sleep, Bluetooth and battery, where the Tuner puts them',
  },
  nav: {
    id: 'nav', title: 'Arrows and navigation keys',
    detail: 'On the factory chords. Only keys the config has no chord for are added.',
  },
  digits: {
    id: 'digits', title: 'Digits on a row 1 barre',
    detail: 'Hold 1L 1M 1R together, then 2L 3L 4L for 1 2 3, 2M 3M 4M for 4 5 6, 2R 3R 4R for 7 8 9, and 2L 3L for 0',
  },
  symbols: {
    id: 'symbols', title: 'Brackets and symbols on 1R and 1M',
    detail: '[ ] { } < > | ^ ` ~',
  },
  thumbs: {
    id: 'thumbs', title: 'T3 holds Control, T4 holds Shift',
    detail: 'Removes the chords on T3 alone',
  },
  words: {
    id: 'words', title: 'Common word chords',
    detail: COMMON_WORDS.map((w) => w.trim()).join(', '),
  },
};

export const PROFILES: Profile[] = [
  {
    id: 'short-thumbs',
    title: 'Short thumbs',
    detail:
      "For hands that can't reach T1 and T2. Digit and symbol chords that use T1, T2 or T3 move to the fingers. " +
      "The word chords start with 1R and row 2, and each types its word and a space. They are the words that save the most typing in Peter Norvig's counts of English web text. " +
      'Applying it changes what you practise on too, so Learn chords picks up the new ones.',
    changes: [CHANGES.system, CHANGES.nav, CHANGES.digits, CHANGES.symbols, CHANGES.thumbs, CHANGES.words],
  },
];

export interface Report {
  /** Chords added or moved, as "1R 2R 3R 4M = for ". */
  placed: string[];
  /** Chords taken off, with what they did. */
  removed: string[];
  /** Chords that had to move out of the way, and where to. */
  moved: string[];
  /** Characters the config typed before and no longer types. */
  lost: string[];
  /** Characters that only chords with T1 or T2 still type. */
  farOnly: string[];
}

/** Single characters the config types, with the chords that type them. */
function typed(cfg: V7Config): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const c of cfg.chords) {
    const t = textOf(c);
    if (t === null || [...t].length !== 1) continue;
    out.set(t, [...(out.get(t) ?? []), c.bits]);
  }
  return out;
}

const show = (t: string) => (t === ' ' ? 'Space' : t);

/**
 * Applies the changes in a fixed order: device functions, digits, symbols, words, then the thumb
 * modifiers, which remove what is left on T3 alone.
 */
export function applyChanges(start: V7Config, ids: ChangeId[]): { cfg: V7Config; report: Report } {
  const want = new Set(ids);
  const before = typed(start);
  let chords = start.chords.map((c) => ({ ...c }));
  let header = start.header;
  const report: Report = { placed: [], removed: [], moved: [], lost: [], farOnly: [] };
  const at = (bits: number) => chords.find((c) => c.bits === bits);
  const describe = (c: V7Chord) => `${chordLabel(c.bits)} = ${actionLabel(c)}`;

  // Spots any chosen change will fill, so nothing moved out of the way lands on one.
  const reserved = new Set<number>();
  if (want.has('digits')) DIGITS.forEach(([, b]) => reserved.add(bitsOf(...b)));
  if (want.has('symbols')) SYMBOLS.forEach(([, b]) => reserved.add(bitsOf(...b)));
  if (want.has('words')) wordSpots('1R').forEach((b) => reserved.add(b));
  const displaced: V7Chord[] = [];

  /** Puts the chord on its buttons, moving aside whatever was there unless it is a device function. */
  const put = (next: V7Chord): boolean => {
    const old = at(next.bits);
    if (old && old.type === 1 && next.type !== 1) return false;
    if (old) {
      chords = chords.filter((c) => c !== old);
      if (label(old) !== label(next)) displaced.push(old);
    }
    chords.push(next);
    return true;
  };

  if (want.has('system')) {
    for (const sys of emptyConfig().chords.filter((c) => c.type === 1)) {
      const now = chords.find((c) => c.type === 1 && c.hi === sys.hi);
      if (now?.bits === sys.bits) continue;
      if (now) chords = chords.filter((c) => c !== now);
      put({ ...sys });
      report.placed.push(describe(sys));
    }
  }

  if (want.has('nav')) {
    for (const [buttons, mod, key] of NAV_KEYS) {
      if (chords.some((c) => c.type === 2 && c.hi === mod && c.key === key)) continue;
      const next = keyChord(bitsOf(...buttons), mod, key);
      if (at(next.bits)) continue;
      chords.push(next);
      report.placed.push(describe(next));
    }
  }

  const placeChars = (table: [string, Button[]][]) => {
    for (const [ch, buttons] of table) {
      const next = textChord(bitsOf(...buttons), ch)!;
      if (at(next.bits) && label(at(next.bits)!) === label(next)) continue;
      if (!put(next)) continue;
      report.placed.push(describe(next));
    }
    for (const [ch] of table) {
      for (const c of chords.filter((c) => textOf(c) === ch && (c.bits & FAR) !== 0)) {
        chords = chords.filter((x) => x !== c);
        report.removed.push(describe(c));
      }
    }
  };
  if (want.has('digits')) placeChars(DIGITS);
  if (want.has('symbols')) placeChars(SYMBOLS);

  const placeWords = (words: string[], spots: number[]) => {
    const have = new Set(chords.map((c) => textOf(c)));
    const free = spots.filter((b) => !at(b));
    for (const w of words) {
      if (have.has(w)) continue;
      const bits = free.shift();
      if (bits === undefined) break;
      const next = textChord(bits, w)!;
      chords.push(next);
      report.placed.push(describe(next));
    }
  };
  if (want.has('words')) placeWords(COMMON_WORDS, wordSpots('1R'));

  if (want.has('thumbs')) {
    for (const c of chords.filter((c) => c.type !== 1 && (c.bits & THUMB_BITS) === T3)) {
      chords = chords.filter((x) => x !== c);
      report.removed.push(describe(c));
    }
    const s = readSettings({ header, chords });
    s.thumbs[2] = 1;
    s.thumbs[3] = 2;
    header = writeSettings({ header, chords }, s).header;
  }

  // Whatever had to move aside goes to a free finger-only chord, fewest fingers first, unless the
  // config still does the same thing elsewhere.
  for (const old of displaced) {
    if (chords.some((c) => label(c) === label(old))) {
      report.removed.push(`${describe(old)} (also on ${chords.filter((c) => label(c) === label(old)).map((c) => chordLabel(c.bits)).join(', ')})`);
      continue;
    }
    const bits = fingerSpots().find((b) => !at(b) && !reserved.has(b));
    if (bits === undefined) {
      report.removed.push(describe(old));
      continue;
    }
    const moved = { ...old, bits };
    chords.push(moved);
    report.moved.push(`${actionLabel(old)}: ${chordLabel(old.bits)} to ${chordLabel(bits)}`);
  }

  const cfg = { header, chords };
  const after = typed(cfg);
  report.lost = [...before.keys()].filter((t) => !after.has(t)).map(show);
  report.farOnly = [...after.entries()].filter(([, list]) => list.every((b) => (b & (T1 | T2)) !== 0)).map(([t]) => show(t));
  return { cfg, report };
}

/** What a chord does, for comparing two chords. */
function label(c: V7Chord): string {
  if (c.type === 1) return `fn ${c.hi}`;
  const t = textOf(c);
  return t !== null ? `"${t}"` : `${c.type}:${c.hi}:${c.key}:${c.keys.join(',')}`;
}

/** Finger-only chords with one button in each of 2 or 3 rows, fewest fingers first. */
function fingerSpots(): number[] {
  const cols = ['R', 'M', 'L'] as const;
  const out: number[] = [];
  for (const n of [2, 3]) {
    const rows = [1, 2, 3, 4];
    const pick = (from: number[], k: number): number[][] => (k === 0 ? [[]] : from.flatMap((r, i) => pick(from.slice(i + 1), k - 1).map((rest) => [r, ...rest])));
    for (const set of pick(rows, n)) {
      let combos: number[] = [0];
      for (const r of set) combos = combos.flatMap((b) => cols.map((c) => b | (1 << BUTTON_BIT[`${r}${c}` as Button])));
      out.push(...combos);
    }
  }
  return out.map((b) => b >>> 0);
}

/** The Short thumbs preset: the Twiddler default layout with the whole profile applied. */
export function shortThumbsConfig(): V7Config {
  return applyChanges(configFromLayout(DEFAULT_LAYOUT), PROFILES[0].changes.map((c) => c.id)).cfg;
}
