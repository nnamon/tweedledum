import { describe, expect, it } from 'vitest';
import { formatChord } from './chord';
import { DEFAULT_LAYOUT, Keymap } from './layout';
import { addChar, addKey, pressesOf, type Burst } from './presses';

const km = new Keymap(DEFAULT_LAYOUT);

function type(text: string, start: number, gap: number, bursts: Burst[] = []): Burst[] {
  let out = bursts;
  [...text].forEach((ch, i) => (out = addChar(out, ch, start + i * gap, start + i)));
  return out;
}

const shown = (bursts: Burst[]) => bursts.flatMap((b) => pressesOf(km, b)).map((p) => `${p.text}=${p.chord ? formatChord(p.chord, 'classic') : '-'}`);

describe('what was pressed', () => {
  it('keeps a multi-character chord together and names its chord', () => {
    expect(shown(type('the ', 0, 5))).toEqual(['the =0RR0']);
  });

  it('keeps letters typed one chord at a time apart', () => {
    expect(shown(type('the', 0, 200))).toEqual(['t=M00R', 'h=000M', 'e=M000']);
  });

  it('splits two chords that land in one burst', () => {
    // "the " from its chord, then a quick single e.
    expect(shown(type('the e', 0, 5))).toEqual(['the =0RR0', 'e=M000']);
  });

  it('finds the chord for a key that types nothing', () => {
    const b = addKey(type('a', 0, 5), 'BS', 10, 1);
    expect(shown(b)).toEqual(['a=R000', 'BS=00L0']);
  });

  it('starts a new burst after a key that types nothing', () => {
    let b = addKey([], 'BS', 0, 0);
    b = addChar(b, 'a', 5, 1);
    expect(b.map((x) => x.text || x.key)).toEqual(['BS', 'a']);
  });
});
