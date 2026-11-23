// A chord: which finger button is held in each of the four rows, and which thumb buttons.
//
// The finger buttons sit in four rows (row 1 under the index finger, row 4 under the little
// finger) of three columns, named L, M and R. A row with no button held is O, and a row with
// all three held at once (a barre, one finger across the row) is B. A chord is written as four letters, one per row, from row 1 to row 4: "LROO" holds L on row 1 and R on row 2.
// Thumb buttons are written first and joined with "+": "N+ROOO" is NUM with R on row 1.
//
// This is the notation of the Tek Gear Typing Tutor, which has no barre; B is ours. Zero is read
// as O, so "0R00" is "OROO".

export type Col = 'L' | 'M' | 'R';
/** A row: one button, none (O), or all three (B, a barre). */
export type Cell = Col | 'O' | 'B';
/** Thumb buttons: NUM, ALT, CTRL and SHIFT. */
export type Thumb = 'N' | 'A' | 'C' | 'S';

export const COLS: readonly Col[] = ['L', 'M', 'R'];
export const THUMBS: readonly Thumb[] = ['N', 'A', 'C', 'S'];
export const THUMB_NAMES: Record<Thumb, string> = { N: 'NUM', A: 'ALT', C: 'CTRL', S: 'SHIFT' };

export interface Chord {
  rows: [Cell, Cell, Cell, Cell];
  /** Thumb buttons held, in the order N, A, C, S. */
  thumbs: Thumb[];
}

const THUMB_WORDS: Record<string, Thumb> = {
  N: 'N', NUM: 'N', NUMBER: 'N',
  A: 'A', ALT: 'A',
  C: 'C', CTRL: 'C', CONTROL: 'C',
  S: 'S', SHIFT: 'S',
};

function sortThumbs(t: Iterable<Thumb>): Thumb[] {
  const set = new Set(t);
  return THUMBS.filter((x) => set.has(x));
}

/**
 * Reads a chord in the tutor's notation. Accepts "LROO", "0R00", "mc-ORRO", "N+ROOO",
 * "NUM+SHIFT+ROOO" and "NS ROOO" (a group of thumb letters before the rows). Returns null for
 * anything else.
 */
export function parseChord(text: string): Chord | null {
  let s = text.trim().toUpperCase();
  if (/(^|\s)F[1-4][LMRB]/.test(s)) return parseT4(s);
  if (s.startsWith('MC-')) s = s.slice(3);
  const thumbs: Thumb[] = [];
  const parts = s.split(/[+\s]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const rowsText = parts.pop()!.replaceAll('0', 'O');
  for (const p of parts) {
    const word = THUMB_WORDS[p];
    if (word) {
      thumbs.push(word);
      continue;
    }
    // A run of thumb letters, as the tutor's mode field writes them: "NS", "NA".
    if (/^[NACS]+$/.test(p)) {
      for (const ch of p) thumbs.push(ch as Thumb);
      continue;
    }
    // "O" is the tutor's mode for no thumb button.
    if (p === 'O') continue;
    return null;
  }
  if (!/^[OLMRB]{4}$/.test(rowsText)) return null;
  const rows = rowsText.split('') as Chord['rows'];
  if (rows.every((r) => r === 'O') && thumbs.length === 0) return null;
  return { rows, thumbs: sortThumbs(thumbs) };
}

/** Reads the Twiddler 4 notation: "T1 F1R F2M", "T14 F1R", "F1L F2R", and "F1B" or "F1L F1M F1R" for a barre. */
function parseT4(s: string): Chord | null {
  const held: Set<Col>[] = [new Set(), new Set(), new Set(), new Set()];
  const thumbs: Thumb[] = [];
  const nums: Record<string, Thumb> = { '1': 'N', '2': 'A', '3': 'C', '4': 'S' };
  for (const part of s.split(/[\s+]+/).filter(Boolean)) {
    const t = /^T([1-4]+)$/.exec(part);
    if (t) {
      for (const d of t[1]) thumbs.push(nums[d]);
      continue;
    }
    const f = /^F([1-4])([LMRB])$/.exec(part);
    if (!f) return null;
    const r = Number(f[1]) - 1;
    for (const c of f[2] === 'B' ? COLS : [f[2] as Col]) held[r].add(c);
  }
  const rows = held.map(cellOf);
  if (rows.some((x) => x === null) || rows.every((x) => x === 'O')) return null;
  return { rows: rows as Chord['rows'], thumbs: sortThumbs(thumbs) };
}

/** The cell for the buttons held in one row, or null for two of the three, which a chord can't hold. */
export function cellOf(held: Set<Col>): Cell | null {
  if (held.size === 0) return 'O';
  if (held.size === 3) return 'B';
  if (held.size === 1) return [...held][0];
  return null;
}

/** The columns a cell holds. */
export function colsOf(cell: Cell): Col[] {
  return cell === 'O' ? [] : cell === 'B' ? [...COLS] : [cell];
}

export function chordText(c: Chord): string {
  const rows = c.rows.join('');
  return c.thumbs.length ? `${c.thumbs.join('+')}+${rows}` : rows;
}

export function sameChord(a: Chord, b: Chord): boolean {
  return chordText(a) === chordText(b);
}

export function withThumb(c: Chord, t: Thumb): Chord {
  return { rows: [...c.rows] as Chord['rows'], thumbs: sortThumbs([...c.thumbs, t]) };
}

/** The finger buttons a chord holds, as "1R", "2L" (row then column). */
export function fingerKeys(c: Chord): string[] {
  const out: string[] = [];
  c.rows.forEach((cell, i) => {
    for (const col of colsOf(cell)) out.push(`${i + 1}${col}`);
  });
  return out;
}

/** How many buttons a chord holds, thumbs included. */
export function chordSize(c: Chord): number {
  return fingerKeys(c).length + c.thumbs.length;
}

/** A chord read aloud in words, for screen readers: "NUM, row 1 right, row 2 middle". */
export function chordWords(c: Chord): string {
  const names: Record<Col, string> = { L: 'left', M: 'middle', R: 'right' };
  const parts = c.thumbs.map((t) => THUMB_NAMES[t]);
  c.rows.forEach((cell, i) => {
    if (cell === 'B') parts.push(`row ${i + 1} all three`);
    else if (cell !== 'O') parts.push(`row ${i + 1} ${names[cell]}`);
  });
  return parts.join(', ');
}

/**
 * A chord in the Twiddler 4 notation: thumb buttons as T and their numbers (NUM is T1, ALT T2,
 * CTRL T3, SHIFT T4), finger buttons as F, the row and the column: "T1 F1R F2M".
 */
export function chordT4(c: Chord): string {
  const nums: Record<Thumb, string> = { N: '1', A: '2', C: '3', S: '4' };
  const parts: string[] = [];
  if (c.thumbs.length) parts.push(`T${c.thumbs.map((t) => nums[t]).join('')}`);
  c.rows.forEach((cell, i) => {
    if (cell !== 'O') parts.push(`F${i + 1}${cell}`);
  });
  return parts.join(' ');
}

export type Notation = 'classic' | 't4';

/**
 * A chord for people to read. Classic notation writes an empty row as 0, as Tek Gear's manuals
 * do ("N+R000"), so it cannot be mistaken for a letter; the stored form uses O, as the tutor does.
 */
export function formatChord(c: Chord, notation: Notation): string {
  return notation === 't4' ? chordT4(c) : chordText(c).replace(/O/g, '0');
}
