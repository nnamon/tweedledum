import { describe, expect, it } from 'vitest';
import { chordT4, chordText, fingerKeys, parseChord } from './chord';
import { chordFromBits } from './import';
import { DEFAULT_LAYOUT, Keymap } from './layout';
import { LESSONS } from '../lessons/lessons';

describe('parseChord', () => {
  it('reads the tutor notation', () => {
    expect(chordText(parseChord('LROO')!)).toBe('LROO');
    expect(chordText(parseChord('0R00')!)).toBe('OROO');
    expect(chordText(parseChord('mc-ORRO')!)).toBe('ORRO');
    expect(chordText(parseChord('S+N+ROOO')!)).toBe('N+S+ROOO');
    expect(chordText(parseChord('NUM+ROOO')!)).toBe('N+ROOO');
    expect(chordText(parseChord('NS ROOO')!)).toBe('N+S+ROOO');
  });

  it('reads and writes the Twiddler 4 notation', () => {
    expect(chordText(parseChord('T1 F1R')!)).toBe('N+ROOO');
    expect(chordText(parseChord('F1M F2R')!)).toBe('MROO');
    expect(chordText(parseChord('T14 F4L')!)).toBe('N+S+OOOL');
    expect(chordT4(parseChord('N+S+LROO')!)).toBe('T14 F1L F2R');
    expect(parseChord('F1L F1R')).toBeNull();
  });

  it('refuses anything else', () => {
    expect(parseChord('LRO')).toBeNull();
    expect(parseChord('OOOO')).toBeNull();
    expect(parseChord('X+LROO')).toBeNull();
  });
});

describe('default layout', () => {
  const km = new Keymap(DEFAULT_LAYOUT);

  it('has the tutor chords for letters, digits and capitals', () => {
    expect(chordText(km.chordFor('a')!)).toBe('ROOO');
    expect(chordText(km.chordFor('i')!)).toBe('LROO');
    expect(chordText(km.chordFor(' ')!)).toBe('LOOO');
    expect(chordText(km.chordFor('1')!)).toBe('N+ROOO');
    expect(chordText(km.chordFor('0')!)).toBe('N+OLOO');
    expect(chordText(km.chordFor('A')!)).toBe('S+ROOO');
    expect(chordText(km.chordFor('T')!)).toBe('S+MOOR');
  });

  it('types every character of every lesson', () => {
    for (const l of LESSONS) expect(km.missing(l.text), `lesson ${l.n}`).toEqual([]);
  });

  it('labels the keypad as the tutor does', () => {
    expect(km.labelsFor(2, 'R')).toEqual({ alone: 'b', withRow1: { L: 'i', M: 'r', R: '.' } });
    expect(km.labelsFor(1, 'L')).toEqual({ alone: ' ', withRow1: {} });
    expect(km.labelsFor(4, 'M')).toEqual({ alone: 'h', withRow1: { L: 'n', M: 'w' } });
    expect(km.labelsFor(2, 'L').alone).toBe('DEL');
    expect(km.labelsFor(4, 'L')).toEqual({ alone: 'ENT', withRow1: { L: 'q', M: 'z', R: '-' } });
  });

  it('finds multi-character chords', () => {
    expect(km.multiAt('see the dog', 4)?.output).toBe('the ');
    expect(km.multiAt('and', 0)?.output).toBe('and ');
    expect(km.multiAt('sinks', 1)?.output).toBe('in');
    expect(km.multiAt('sing', 1)?.output).toBe('ing ');
  });
});

describe('a barre', () => {
  it('reads and writes a row with all three buttons held', () => {
    const c = parseChord('BLOO')!;
    expect(c.rows).toEqual(['B', 'L', 'O', 'O']);
    expect(chordText(c)).toBe('BLOO');
    expect(chordT4(c)).toBe('F1B F2L');
    expect(fingerKeys(c)).toEqual(['1L', '1M', '1R', '2L']);
    expect(parseChord('F1L F1M F1R F2L')).toEqual(c);
    expect(parseChord('F1B F2L')).toEqual(c);
  });

  it('comes from a config bitmask with all three of a row, but not two', () => {
    expect(chordFromBits(0x8e)?.rows).toEqual(['B', 'L', 'O', 'O']);
    expect(chordFromBits(0x86)).toBeNull();
    expect(parseChord('F1L F1M F2L')).toBeNull();
  });
});
