import { describe, expect, it } from 'vitest';
import { Run, accuracyStars, hitScore, keyChar, speedStars, wpmOf } from './run';

describe('Run', () => {
  it('advances on hits and stays on misses', () => {
    const r = new Run('ab');
    expect(r.press('a', 1000)).toBe('hit');
    expect(r.press('x', 1100)).toBe('miss');
    expect(r.pos).toBe(1);
    expect(r.missesHere).toBe(1);
    expect(r.press('b', 1500)).toBe('done');
    expect(r.hits).toBe(2);
    expect(r.misses).toBe(1);
    expect(r.missed.has(1)).toBe(true);
    expect(r.elapsed(9999)).toBe(500);
  });

  it('times each hit from the previous hit', () => {
    const r = new Run('abc');
    r.press('a', 0);
    r.press('b', 300);
    r.press('z', 350);
    r.press('c', 700);
    expect(r.events.filter((e) => e.ok).map((e) => e.ms)).toEqual([0, 300, 400]);
    expect(r.events.filter((e) => !e.ok).map((e) => e.ch)).toEqual(['c']);
  });

  it('ignores presses after the end', () => {
    const r = new Run('a');
    r.press('a', 0);
    expect(r.press('a', 10)).toBe('ignored');
  });
});

describe('scoring from the tutor', () => {
  it('pays 1 point below a streak of 5, more at 5, 10, 20 and over 20', () => {
    expect(hitScore(1, 1, 0)).toBe(1);
    expect(hitScore(5, 5, 0)).toBe(15);
    expect(hitScore(6, 6, 0)).toBe(0);
    expect(hitScore(10, 10, 0)).toBe(50);
    expect(hitScore(20, 20, 0)).toBe(180);
    expect(hitScore(21, 21, 0)).toBe(462);
    expect(hitScore(3, 2, 2)).toBe(0);
  });

  it('gives stars at the tutor thresholds', () => {
    expect([19, 20, 30, 40, 50, 60, 120].map(speedStars)).toEqual([0, 1, 2, 3, 4, 5, 5]);
    expect([19, 20, 30, 60, 70, 86, 100].map(accuracyStars)).toEqual([0, 1, 2, 3, 4, 5, 5]);
  });

  it('counts five characters to a word', () => {
    expect(wpmOf(50, 60000)).toBe(10);
  });
});

describe('keyChar', () => {
  it('keeps characters and drops modifiers', () => {
    expect(keyChar('a')).toBe('a');
    expect(keyChar(' ')).toBe(' ');
    expect(keyChar('Shift')).toBeNull();
    expect(keyChar('Backspace')).toBeNull();
    expect(keyChar('’')).toBe("'");
  });
});
