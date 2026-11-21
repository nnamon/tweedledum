import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, Keymap } from '../chords/layout';
import { groupsFrom, keysetOf, multiChordWords, randomGroups, randomWords, weakDrill, wordsWithin } from './text';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('text', () => {
  it('makes random groups of the asked size', () => {
    const t = randomGroups({ len: 4, groups: 3, caps: false, numbers: false, punct: false }, seeded(1));
    expect(t.split(' ').map((w) => w.length)).toEqual([4, 4, 4]);
    expect(t).toMatch(/^[a-z ]+$/);
  });

  it('keeps words within a key set', () => {
    for (const w of wordsWithin('etaoinshr')) expect(w).toMatch(/^[etaoinshr]+$/);
    for (const w of randomWords(30, 'abcde', seeded(2))) expect(w).toMatch(/^[abcde]+$/);
  });

  it('draws groups from a set', () => {
    const g = groupsFrom('abc', 3, 5, seeded(3));
    expect(g).toHaveLength(5);
    for (const w of g) expect(w).toMatch(/^[abc]{3}$/);
  });

  it('builds a keyset like the tutor', () => {
    expect(keysetOf('Dab cab')).toBe('abcd');
  });

  it('builds multi-character chord words', () => {
    const w = multiChordWords(new Keymap(DEFAULT_LAYOUT), 20, seeded(4));
    expect(w).toHaveLength(20);
    expect(w.every((x) => /the|of|to|ed|in|ion|and|ing|ent|ant/.test(x))).toBe(true);
  });

  it('drills the weakest characters', () => {
    const keys = {
      a: { n: 50, miss: 0, ms: 50 * 300, timed: 50 },
      b: { n: 50, miss: 25, ms: 50 * 900, timed: 50 },
      c: { n: 50, miss: 1, ms: 50 * 300, timed: 50 },
      d: { n: 50, miss: 0, ms: 50 * 310, timed: 50 },
      e: { n: 50, miss: 0, ms: 50 * 320, timed: 50 },
      f: { n: 50, miss: 0, ms: 50 * 330, timed: 50 },
    };
    const r = weakDrill(keys, new Keymap(DEFAULT_LAYOUT), 50, seeded(5));
    expect(r.focus[0]).toBe('b');
    expect(r.text.length).toBeGreaterThanOrEqual(50);
    expect(r.text).toMatch(/^[a-f ]+$/);
  });
});
