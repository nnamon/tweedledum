import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importLayout } from './import';
import { Keymap } from './layout';
import {
  actionLabel, chordLabel, mirror, parseV7, readSettings, stringTableSize, swapThumbs, textChord, textOf, writeSettings, writeV7,
} from './v7';

const dir = new URL('./fixtures/v7/', import.meta.url);
const read = (name: string) => new Uint8Array(readFileSync(new URL(name, dir)));
const files = readdirSync(dir).filter((f) => f.endsWith('.cfg'));

/** The file as this module writes it: the same, with bytes 0 to 3 zero. */
function expected(bytes: Uint8Array): Uint8Array {
  const out = bytes.slice();
  out.set([0, 0, 0, 0], 0);
  return out;
}

describe('version 7 config files', () => {
  it('writes every test file back byte for byte', () => {
    expect(files.length).toBe(18);
    for (const f of files) expect(writeV7(parseV7(read(f))), f).toEqual(expected(read(f)));
  });

  const local = ['../local/t4-default.cfg', '../local/t4-tuner-t3num.cfg'].filter((f) => existsSync(new URL(f, dir)));
  it.skipIf(local.length === 0)('writes the factory file and a Tuner download back byte for byte', () => {
    for (const f of local) expect(writeV7(parseV7(read(f))), f).toEqual(expected(read(f)));
  });

  // Uploaded to the Tuner, saved there and downloaded on 23 November 2026. It is mostly the factory
  // layout, so it stays out of the repository with the other local files.
  const long = new URL('../local/tuner-long-strings.cfg', dir);
  it.skipIf(!existsSync(long))('reads and writes a Tuner file whose strings run past byte 255', () => {
    const f = new Uint8Array(readFileSync(long));
    const cfg = parseV7(f);
    expect(stringTableSize(cfg)).toBe(508);
    expect(textOf(cfg.chords.find((c) => chordLabel(c.bits) === '1R 2R 3L 4L')!)).toBe('not ');
    expect(writeV7(cfg)).toEqual(expected(f));
  });

  it('reads each setting the test files change', () => {
    const base = readSettings(parseV7(read('empty.cfg')));
    expect(base).toEqual({
      keyRepeat: true, keyboardMode: false, haptic: true, sensitivity: 4, invertX: false, up: 0,
      idleSeconds: 600, repeatMs: 1000, thumbs: [0, 3, 1, 2], dedicated: [10, 11, 9, 9],
    });
    const changed = (f: string) => {
      const s = readSettings(parseV7(read(f)));
      return Object.fromEntries(Object.entries(s).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(base[k as keyof typeof base])));
    };
    expect(changed('key-repeat-disabled.cfg')).toEqual({ keyRepeat: false });
    expect(changed('key-repeat-1020.cfg')).toEqual({ repeatMs: 1020 });
    expect(changed('button-mode-keyboard.cfg')).toEqual({ keyboardMode: true });
    expect(changed('haptic-feedback-off.cfg')).toEqual({ haptic: false });
    expect(changed('idle-time-8m.cfg')).toEqual({ idleSeconds: 480 });
    expect(changed('nav-invert-x-axis.cfg')).toEqual({ invertX: true });
    expect(changed('nav-up-east.cfg')).toEqual({ up: 1 });
    expect(changed('nav-sensitivity-lowered.cfg')).toEqual({ sensitivity: 0 });
    expect(changed('no-right-mouse-button.cfg')).toEqual({ dedicated: [0, 11, 9, 9] });
    expect(changed('no-t0-dedicated.cfg')).toEqual({ dedicated: [10, 11, 9, 0] });
  });

  it('writes a changed setting the way the Tuner does', () => {
    const cfg = parseV7(read('empty.cfg'));
    const s = readSettings(cfg);
    expect(writeV7(writeSettings(cfg, { ...s, idleSeconds: 480 }))).toEqual(expected(read('idle-time-8m.cfg')));
    expect(writeV7(writeSettings(cfg, { ...s, keyRepeat: false }))).toEqual(expected(read('key-repeat-disabled.cfg')));
    expect(writeV7(writeSettings(cfg, { ...s, up: 1 }))).toEqual(expected(read('nav-up-east.cfg')));
    expect(writeV7(writeSettings(cfg, { ...s, dedicated: [10, 11, 9, 0] }))).toEqual(expected(read('no-t0-dedicated.cfg')));
  });

  it('adds chords the way the Tuner does', () => {
    const add = (f: string, ...extra: ReturnType<typeof textChord>[]) => {
      const cfg = parseV7(read('empty.cfg'));
      return writeV7({ ...cfg, chords: [...cfg.chords, ...extra.map((c) => c!)] });
    };
    expect(add('x', textChord(0x2, 'c'))).toEqual(expected(read('single-unmodified-key.cfg')));
    expect(add('x', textChord(0x2, '@'))).toEqual(expected(read('shifted-key.cfg')));
    expect(add('x', textChord(0x2, 'test'))).toEqual(expected(read('multi-char.cfg')));
    expect(add('x', textChord(1 << 16, 'l'), textChord(1 << 17, 'm'), textChord(1 << 18, 'r'))).toEqual(expected(read('mini-buttons.cfg')));
  });

  it('names chords and what they do', () => {
    const cfg = parseV7(read('modifier-key.cfg'));
    const labels = cfg.chords.map((c) => `${chordLabel(c.bits)} = ${actionLabel(c)}`);
    expect(labels).toContain('1R = Ctrl+c');
    expect(labels).toContain('T1 T4 4R = Clear Bluetooth pairings');
    expect(labels).toContain('T0 T2 T3 = Sleep now');
    expect(textOf(parseV7(read('multi-char.cfg')).chords.find((c) => c.type === 7)!)).toBe('test');
  });

  it('swaps T1 and T3 in every chord but the system ones, and their modifiers', () => {
    const cfg = parseV7(read('empty.cfg'));
    const one = { ...cfg, chords: [...cfg.chords, textChord(0b11, '1')!, textChord(0x102, 'x')!] };
    const { cfg: out, clashes } = swapThumbs(one, 'T1', 'T3');
    expect(clashes).toEqual([]);
    const byText = (t: string) => out.chords.find((c) => textOf(c) === t)!.bits;
    expect(byText('1')).toBe(0x102);
    expect(byText('x')).toBe(0b11);
    // Bluetooth Clear stays on T1 T4 4R.
    expect(out.chords.some((c) => c.type === 1 && c.bits === 0x3001)).toBe(true);
    expect(readSettings(out).thumbs).toEqual([1, 3, 0, 2]);
  });

  it('leaves a chord in place when the swap would land it on a system chord', () => {
    const cfg = parseV7(read('empty.cfg'));
    // T3 T4 4R would become T1 T4 4R, where Bluetooth Clear is.
    const one = { ...cfg, chords: [...cfg.chords, textChord(0x3100, 'z')!] };
    const { cfg: out, clashes } = swapThumbs(one, 'T1', 'T3');
    expect(clashes.map((c) => textOf(c))).toEqual(['z']);
    expect(out.chords.find((c) => textOf(c) === 'z')!.bits).toBe(0x3100);
  });

  it('mirrors L and R', () => {
    const cfg = parseV7(read('mini-buttons.cfg'));
    const { cfg: out } = mirror(cfg);
    const at = (t: string) => chordLabel(out.chords.find((c) => textOf(c) === t)!.bits);
    expect(at('l')).toBe('0R');
    expect(at('r')).toBe('0L');
    expect(at('m')).toBe('0M');
  });

  it('gives the same typing layout after a round trip', () => {
    const f = read('single-unmodified-key.cfg');
    const a = new Keymap(importLayout(f, 'a.cfg').layout);
    const b = new Keymap(importLayout(writeV7(parseV7(f)), 'b.cfg').layout);
    expect(b.layout.entries).toEqual(a.layout.entries);
  });
});

describe('a config from a typing layout', () => {
  it('has the default layout, the system chords and the Tuner default settings', async () => {
    const { DEFAULT_LAYOUT } = await import('./layout');
    const { configFromLayout, emptyConfig } = await import('./v7');
    const cfg = configFromLayout(DEFAULT_LAYOUT);
    expect(readSettings(cfg)).toEqual(readSettings(emptyConfig()));
    expect(cfg.chords.filter((c) => c.type === 1)).toHaveLength(8);
    const back = new Keymap(importLayout(writeV7(cfg), 'x.cfg').layout);
    const ours = new Keymap(DEFAULT_LAYOUT);
    for (const ch of 'abcxyz019 .,?!"(){}~') expect(back.chordFor(ch), ch).toEqual(ours.chordFor(ch));
    expect(back.outputOf(ours.chordFor('t')!)).toBe('t');
    expect(textOf(cfg.chords.find((c) => textOf(c) === 'the ')!)).toBe('the ');
  });
});
