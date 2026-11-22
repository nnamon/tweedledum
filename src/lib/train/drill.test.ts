import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, Keymap } from '../chords/layout';
import { BURST_MS, buildSession, cardsFor, grade, isBurst, learntCount, type ChordRec } from './drill';

const km = new Keymap(DEFAULT_LAYOUT);

describe('learn chords', () => {
  it('finds each group in the default layout', () => {
    const words = cardsFor(km, 'words').map((c) => c.output);
    expect(words).toContain('the ');
    expect(words).toContain('ing ');
    expect(words.every((w) => w.length > 1)).toBe(true);
    expect(cardsFor(km, 'letters').map((c) => c.output).join('')).toBe('etaoinshrdlcumwfgypbvkjxqz');
    expect(cardsFor(km, 'digits')).toHaveLength(10);
    const symbols = cardsFor(km, 'symbols').map((c) => c.output);
    expect(symbols).toContain('?');
    expect(symbols.some((s) => /[a-z0-9 ]/i.test(s))).toBe(false);
  });

  it('tells one chord from letters typed one by one', () => {
    expect(isBurst([0, 8, 15, 22])).toBe(true);
    expect(isBurst([0, 8, 8 + BURST_MS + 1])).toBe(false);
    expect(isBurst([0, 180, 350, 520])).toBe(false);
    expect(isBurst([5])).toBe(true);
  });

  it('moves a chord up a box for a clean answer and back to 0 for a miss', () => {
    let r = grade(undefined, 'chord', 1);
    expect(r).toEqual({ box: 1, good: 1, seen: 1, last: 1 });
    r = grade(r, 'chord', 2);
    r = grade(r, 'hinted', 3);
    expect(r.box).toBe(2);
    r = grade(r, 'letters', 4);
    expect(r.box).toBe(2);
    r = grade(r, 'miss', 5);
    expect(r).toEqual({ box: 0, good: 3, seen: 5, last: 5 });
    for (let i = 0; i < 9; i++) r = grade(r, 'chord', 6 + i);
    expect(r.box).toBe(5);
  });

  it('starts with 3 new chords, three times each, never the same twice in a row', () => {
    const cards = cardsFor(km, 'letters');
    const s = buildSession(cards, {});
    expect(s.map((c) => c.output).sort().join('')).toBe('aaaeeettt');
    for (let i = 1; i < s.length; i++) expect(s[i].id).not.toBe(s[i - 1].id);
  });

  it('reviews weak chords first and holds back new ones while many are shaky', () => {
    const cards = cardsFor(km, 'letters');
    const rec = (box: number, last: number): ChordRec => ({ box, good: 1, seen: 1, last });
    const recs: Record<string, ChordRec> = { [cards[0].id]: rec(4, 1), [cards[1].id]: rec(0, 2), [cards[2].id]: rec(0, 3), [cards[3].id]: rec(1, 4) };
    const s = buildSession(cards, recs);
    // Three shaky chords leave no room for a new one.
    expect(s.every((c) => recs[c.id])).toBe(true);
    expect(s.filter((c) => c.output === 't').length).toBeGreaterThanOrEqual(s.filter((c) => c.output === 'e').length);
    expect(learntCount(cards, recs)).toBe(1);
  });
});
