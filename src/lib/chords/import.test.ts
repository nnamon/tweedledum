import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chordText, parseChord } from './chord';
import { decodeStrokes, exportLayoutJson, importLayout, importLayoutText, LayoutError } from './import';
import { DEFAULT_LAYOUT, Keymap } from './layout';

const file = (p: string) => new Uint8Array(readFileSync(new URL(p, import.meta.url)));

function table(km: Keymap, chars: string): Record<string, string> {
  return Object.fromEntries([...chars].map((c) => [c, km.chordFor(c) ? chordText(km.chordFor(c)!) : '']));
}

describe('binary config files', () => {
  it('reads the Twiddler 3 factory default (version 4) as the tutor layout', () => {
    const r = importLayout(file('./fixtures/t3-default-v4.cfg'), 'default.cfg');
    expect(r.format).toMatch(/version 4/);
    const imported = new Keymap(r.layout);
    const ours = new Keymap(DEFAULT_LAYOUT);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 .,;:\'"!?-_/\\()[]{}<>=+*&^%$#@`~|';
    expect(table(imported, chars)).toEqual(table(ours, chars));
    // Multi-character chords come through as text.
    expect(imported.outputOf(parseChord('ORRO')!)).toBe('the ');
    expect(imported.outputOf(parseChord('OROM')!)).toBe('in');
    // Enter, Backspace and Delete come through as keypad labels.
    expect(imported.labelsFor(4, 'L').alone).toBe('ENT');
    expect(imported.labelsFor(3, 'L').alone).toBe('BS');
    expect(imported.labelsFor(2, 'L').alone).toBe('DEL');
  });

  it('reads a Twiddler 4 config (version 7) with a multi-character chord', () => {
    const r = importLayout(file('./fixtures/t4-multi-char.cfg'), 'multi-char.cfg');
    expect(r.format).toMatch(/version 7/);
    const km = new Keymap(r.layout);
    expect(km.outputOf(parseChord('ROOO')!)).toBe('test');
    // The other chords are mouse and device functions.
    expect(r.layout.entries).toHaveLength(1);
    expect(r.skipped).toBe(8);
  });

  it('reads a version 7 config downloaded from the Tuner, which stamps its first 4 bytes', () => {
    const bytes = file('./fixtures/t4-multi-char.cfg');
    bytes.set([0x1a, 0x53, 0x1c, 0x06], 0);
    const r = importLayout(bytes, 'tuner.cfg');
    expect(r.format).toMatch(/version 7/);
    expect(new Keymap(r.layout).outputOf(parseChord('ROOO')!)).toBe('test');
  });

  it('reads the bundled layouts', () => {
    for (const n of ['tabspace', 'mirrorwalk', 'mirrorwalk_nomcc', 'delent', 'teasan']) {
      const r = importLayout(file(`../../../public/layouts/${n}.cfg`), `${n}.cfg`);
      const km = new Keymap(r.layout);
      expect(km.missing('abcdefghijklmnopqrstuvwxyz .'), n).toEqual([]);
    }
  });

  // The Twiddler 4 factory file is Tek Gear's and not in the repository (fixtures/local is ignored by
  // git); checked when present.
  const t4 = new URL('./fixtures/local/t4-default.cfg', import.meta.url);
  it.skipIf(!existsSync(t4))('reads the Twiddler 4 factory default as the tutor layout', () => {
    const km = new Keymap(importLayout(new Uint8Array(readFileSync(t4)), 'default.cfg').layout);
    const ours = new Keymap(DEFAULT_LAYOUT);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 .,;:\'"!?-_/\\()[]{}<>=+*&^%$#@`~|';
    expect(table(km, chars)).toEqual(table(ours, chars));
  });

  // A Tuner download of the factory layout with T1 and T3 swapped, so digits are on CTRL.
  const t3num = new URL('./fixtures/local/t4-tuner-t3num.cfg', import.meta.url);
  it.skipIf(!existsSync(t3num))('reads a Tuner download with digits moved to T3', () => {
    const km = new Keymap(importLayout(new Uint8Array(readFileSync(t3num)), 't3num.cfg').layout);
    expect(table(km, '1590a')).toEqual({ '1': 'C+ROOO', '5': 'C+MOOO', '9': 'C+LOOO', '0': 'C+OLOO', a: 'ROOO' });
  });

  it('refuses other files', () => {
    expect(() => importLayout(new Uint8Array([9, 9, 9, 9]), 'x.cfg')).toThrow(LayoutError);
  });
});

describe('Tuner CSV', () => {
  it('reads the Twiddler 3 form', () => {
    const r = importLayout(file('./fixtures/t3-tuner.csv'), 'binary.csv');
    expect(r.format).toMatch(/Twiddler 3/);
    expect(r.layout.entries.length).toBeGreaterThan(20);
    expect(r.skipped).toBeGreaterThan(0);
  });

  it('reads the Twiddler 4 form', () => {
    const csv = '﻿"Thumbs","Fingers","Actions"\n"","1R","[KB]a"\n"1","1R","[KB]1"\n"4","1R","[KB]<RShift>8</RShift>"\n"3","1R","[KB]<LCtrl>a</LCtrl>"\n"","1LM","[KB]x"\n"","2R 1M","[KB]t[KB]h[KB]e[KB][SPC]"';
    const r = importLayoutText(csv);
    expect(r.format).toMatch(/Twiddler 4/);
    const km = new Keymap(r.layout);
    expect(chordText(km.chordFor('a')!)).toBe('ROOO');
    expect(chordText(km.chordFor('1')!)).toBe('N+ROOO');
    expect(chordText(km.chordFor('*')!)).toBe('S+ROOO');
    expect(km.outputOf(parseChord('MROO')!)).toBe('the ');
    expect(r.skipped).toBe(2);
  });

  it('decodes key strokes', () => {
    expect(decodeStrokes('ing[SPC]')).toBe('ing ');
    expect(decodeStrokes('<R-Shift>x</R-Shift>')).toBe('X');
    expect(decodeStrokes('<Return>')).toBeNull();
    expect(decodeStrokes('<Left GUI>r</Left GUI>')).toBeNull();
    expect(decodeStrokes('<')).toBe('<');
  });
});

describe('JSON', () => {
  it('reads the tutor key map and round-trips our export', () => {
    const r = importLayoutText('{"chords":[{"key":"a","chord":"ROOO"},{"key":"1","chord":"ROOO","m":"N"},{"key":"<Return>","chord":"OOOL"}]}');
    expect(r.layout.entries).toHaveLength(2);
    expect(r.skipped).toBe(1);
    const back = importLayoutText(exportLayoutJson(DEFAULT_LAYOUT));
    expect(back.layout.entries.length).toBe(DEFAULT_LAYOUT.entries.length);
  });
});
