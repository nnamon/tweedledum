import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, Keymap } from '../chords/layout';
import { emptyProfile } from '../state/profile';
import { EXERCISES, nextLesson, planFor, type Exercise } from './exercise';

describe('planFor', () => {
  const km = new Keymap(DEFAULT_LAYOUT);

  it('builds a typeable plan for every exercise', () => {
    const p = emptyProfile();
    p.options.custom.text = 'Hello there, 42 times.';
    for (const kind of Object.keys(EXERCISES) as Exercise['kind'][]) {
      const ex = (kind === 'lesson' ? { kind, n: 1 } : { kind }) as Exercise;
      const plan = planFor(ex, p, km);
      expect('error' in plan, kind).toBe(false);
      if ('error' in plan) continue;
      expect(plan.text.length, kind).toBeGreaterThan(0);
      expect(km.missing(plan.text), kind).toEqual([]);
    }
  });

  it('says why it cannot start', () => {
    const p = emptyProfile();
    expect(planFor({ kind: 'custom' }, p, km)).toEqual({ error: 'Paste some text first.' });
    p.options.dictLetters.set = '';
    expect('error' in planFor({ kind: 'dictLetters' }, p, km)).toBe(true);
  });

  it('runs through the lessons in order', () => {
    expect(nextLesson(1)).toBe(2);
    expect(nextLesson(69)).toBe(70);
    expect(nextLesson(344)).toBeNull();
  });

  it('keeps timed words within the letters met so far when asked', () => {
    const p = emptyProfile();
    p.lesson = 8;
    p.options.timed.source = 'learned';
    const plan = planFor({ kind: 'timed' }, p, km);
    if ('error' in plan) throw new Error(plan.error);
    expect(plan.text).toMatch(/^[a-z ]+$/);
  });
});
