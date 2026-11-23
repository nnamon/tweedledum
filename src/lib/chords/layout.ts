// A layout: what each chord types. The default is the layout the Tek Gear Typing Tutor teaches.

import { type Chord, type Col, parseChord, chordText, withThumb, chordSize } from './chord';

export interface Entry {
  chord: Chord;
  /** What the chord types: one character, or several for a multi-character chord ("the "). */
  output: string;
}

export interface Layout {
  name: string;
  entries: Entry[];
  /** Chords for keys that do not type text (Enter, Backspace...), with a short label for the keypad picture. */
  keys?: { chord: Chord; name: string }[];
}

// The tutor's chord list (tutor.mytwiddler.com/tutor2, read on 21 November 2026), the entries
// that type text. Mode O is no thumb button, N is NUM, S is SHIFT. The tutor also lists digits
// in mode O on the chords of a to h; those are the same chords with NUM, so they are left out.
// Keys such as Tab, Return, the arrows and the function keys are left out: lessons never ask for
// them.
const TUTOR: [mode: string, chord: string, output: string][] = [
  ['O', 'ROOO', 'a'], ['O', 'OROO', 'b'], ['O', 'OORO', 'c'], ['O', 'OOOR', 'd'],
  ['O', 'MOOO', 'e'], ['O', 'OMOO', 'f'], ['O', 'OOMO', 'g'], ['O', 'OOOM', 'h'],
  ['O', 'LROO', 'i'], ['O', 'LORO', 'j'], ['O', 'LOOR', 'k'], ['O', 'LMOO', 'l'],
  ['O', 'LOMO', 'm'], ['O', 'LOOM', 'n'], ['O', 'LLOO', 'o'], ['O', 'LOLO', 'p'],
  ['O', 'LOOL', 'q'], ['O', 'MROO', 'r'], ['O', 'MORO', 's'], ['O', 'MOOR', 't'],
  ['O', 'MMOO', 'u'], ['O', 'MOMO', 'v'], ['O', 'MOOM', 'w'], ['O', 'MLOO', 'x'],
  ['O', 'MOLO', 'y'], ['O', 'MOOL', 'z'],
  ['O', 'LOOO', ' '],
  ['O', 'ROLO', '!'], ['O', 'ROMO', '"'], ['O', 'OMOL', '#'], ['O', 'OLRO', '$'],
  ['O', 'OORM', '%'], ['O', 'OLOL', '&'], ['O', 'RMOO', "'"], ['O', 'OLLO', '('],
  ['O', 'ORLO', ')'], ['O', 'OOLM', '*'], ['O', 'OOML', '+'], ['O', 'RORO', ','],
  ['O', 'ROOL', '-'], ['O', 'RROO', '.'], ['O', 'MMMO', '/'], ['O', 'OORL', ':'],
  ['O', 'ROOR', ';'], ['O', 'OOMR', '='], ['O', 'RLOO', '?'], ['O', 'OOLR', '@'],
  ['O', 'LLLO', '\\'], ['O', 'OROL', '_'],
  ['N', 'OLOO', '0'], ['N', 'ROOO', '1'], ['N', 'OROO', '2'], ['N', 'OORO', '3'],
  ['N', 'OOOR', '4'], ['N', 'MOOO', '5'], ['N', 'OMOO', '6'], ['N', 'OOMO', '7'],
  ['N', 'OOOM', '8'], ['N', 'LOOO', '9'],
  ['N', 'MOOL', '<'], ['N', 'RORO', '>'], ['N', 'RMOO', '['], ['N', 'ROOM', ']'],
  ['N', 'LMOO', '^'], ['N', 'ROLO', '`'], ['N', 'ROOL', '{'], ['N', 'LLRO', '|'],
  ['N', 'LLOR', '}'], ['N', 'LLMO', '~'],
  // Multi-character chords.
  ['O', 'ORRO', 'the '], ['S', 'ORRO', 'The '], ['O', 'ORMO', 'of '], ['O', 'OROR', 'to '],
  ['O', 'OMOR', 'ed '], ['O', 'OROM', 'in'], ['O', 'OLOM', 'ion '], ['O', 'ROOM', 'and '],
  ['O', 'OOMM', 'ing '], ['O', 'MOMM', 'ent '], ['O', 'RORR', 'ant '],
];

function fromTutor(): Layout {
  const entries: Entry[] = TUTOR.map(([mode, chord, output]) => {
    const c = parseChord(mode === 'O' ? chord : `${mode}+${chord}`);
    if (!c) throw new Error(`bad chord ${mode} ${chord}`);
    return { chord: c, output };
  });
  const keys = ([['OLOO', 'DEL'], ['OOLO', 'BS'], ['OOOL', 'ENT'], ['MMOM', 'TAB'], ['RRRO', 'ESC']] as const).map(([c, name]) => ({ chord: parseChord(c)!, name }));
  return { name: 'Twiddler default', entries, keys };
}

export const DEFAULT_LAYOUT: Layout = fromTutor();

/** A layout with fast lookups both ways. */
export class Keymap {
  readonly layout: Layout;
  private byOutput = new Map<string, Chord>();
  private byChord = new Map<string, string>();
  private keyNames = new Map<string, string>();
  /** Multi-character outputs, longest first. */
  readonly multi: Entry[];

  constructor(layout: Layout) {
    this.layout = layout;
    for (const e of layout.entries) {
      const prev = this.byOutput.get(e.output);
      // Where two chords type the same thing, the one with fewer buttons is taught.
      if (!prev || chordSize(e.chord) < chordSize(prev)) this.byOutput.set(e.output, e.chord);
      const key = chordText(e.chord);
      if (!this.byChord.has(key)) this.byChord.set(key, e.output);
    }
    for (const k of layout.keys ?? []) this.keyNames.set(chordText(k.chord), k.name);
    this.multi = layout.entries.filter((e) => e.output.length > 1).sort((a, b) => b.output.length - a.output.length);
  }

  /**
   * The chord for one character. A capital letter with no chord of its own is SHIFT with the
   * small letter's chord.
   */
  chordFor(ch: string): Chord | null {
    const direct = this.byOutput.get(ch);
    if (direct) return direct;
    const lower = ch.toLowerCase();
    if (lower !== ch) {
      const base = this.byOutput.get(lower);
      if (base) return withThumb(base, 'S');
    }
    return null;
  }

  /** The chord for a key that types nothing, by its keypad label (ENT, BS), or null. */
  chordForKey(name: string): Chord | null {
    return (this.layout.keys ?? []).find((k) => k.name === name)?.chord ?? null;
  }

  /** What a chord types, or null. */
  outputOf(c: Chord): string | null {
    return this.byChord.get(chordText(c)) ?? null;
  }

  /** The longest multi-character chord whose output starts the text, or null. */
  multiAt(text: string, at: number): Entry | null {
    for (const e of this.multi) {
      if (text.startsWith(e.output, at)) return e;
      // A word at the end of the text has no space after it.
      if (e.output.endsWith(' ') && at + e.output.length - 1 === text.length && text.startsWith(e.output.trimEnd(), at)) return e;
    }
    return null;
  }

  /** Characters of the text this layout cannot type. */
  missing(text: string): string[] {
    const out = new Set<string>();
    for (const ch of text) if (!this.chordFor(ch)) out.add(ch);
    return [...out];
  }

  /**
   * The labels for a finger button on the keypad picture: what it types alone, and what it
   * types with each row-1 button held, which is how the default layout groups its letters.
   */
  labelsFor(row: number, col: Col): { alone: string | null; withRow1: Partial<Record<Col, string>> } {
    const rows: Chord['rows'] = ['O', 'O', 'O', 'O'];
    rows[row - 1] = col;
    const single: Chord = { rows, thumbs: [] };
    const alone = this.outputOf(single) ?? this.keyNames.get(chordText(single)) ?? null;
    const withRow1: Partial<Record<Col, string>> = {};
    if (row > 1) {
      for (const first of ['L', 'M', 'R'] as Col[]) {
        const r: Chord['rows'] = [...rows] as Chord['rows'];
        r[0] = first;
        const out = this.outputOf({ rows: r, thumbs: [] });
        if (out && out.length === 1) withRow1[first] = out;
      }
    }
    return { alone, withRow1 };
  }
}
