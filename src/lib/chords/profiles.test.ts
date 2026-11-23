import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT } from './layout';
import { CHANGES, COMMON_WORDS, PROFILES, TERMINAL_WORDS, applyChanges, type ChangeId } from './profiles';
import { chordLabel, configFromLayout, parseV7, readSettings, textOf, writeV7, type V7Config } from './v7';

const ALL = Object.keys(CHANGES) as ChangeId[];
const T1 = 1;
const T2 = 1 << 4;
const T3 = 1 << 8;

/** Every chord that types the text, as the Tuner names it. */
const chordsFor = (cfg: V7Config, text: string) => cfg.chords.filter((c) => textOf(c) === text).map((c) => chordLabel(c.bits));

describe('the short-thumbs profile', () => {
  it('lists every change once', () => {
    expect(PROFILES[0].changes.map((c) => c.id).sort()).toEqual([...ALL].sort());
  });

  it('puts digits, symbols and words on the fingers of the default layout', () => {
    const { cfg, report } = applyChanges(configFromLayout(DEFAULT_LAYOUT), ALL);
    expect(chordsFor(cfg, '1')).toEqual(['2L 3R 4R']);
    expect(chordsFor(cfg, '9')).toEqual(['2L 3L 4L']);
    expect(chordsFor(cfg, '0')).toEqual(['2L 4R']);
    expect(chordsFor(cfg, '[')).toEqual(['1R 3R 4L']);
    expect(chordsFor(cfg, '~')).toEqual(['1M 3R 4L']);
    expect(chordsFor(cfg, 'for ')).toEqual(['1R 2R 3R 4M']);
    for (const w of [...COMMON_WORDS, ...TERMINAL_WORDS]) expect(chordsFor(cfg, w), w).toHaveLength(1);
    expect(report.lost).toEqual([]);
    expect(report.farOnly).toEqual([]);
    // Nothing that types text is left on T1, T2 or T3 alone.
    expect(cfg.chords.filter((c) => c.type !== 1 && textOf(c) !== null && (c.bits & (T1 | T2 | T3)) !== 0).map((c) => chordLabel(c.bits))).toEqual([]);
    expect(readSettings(cfg).thumbs.slice(2)).toEqual([1, 2]);
    // The result is a config the Tuner reads: it survives a write and a read.
    expect(writeV7(parseV7(writeV7(cfg)))).toEqual(writeV7(cfg));
  });

  it('keeps every chord on its own buttons', () => {
    const { cfg } = applyChanges(configFromLayout(DEFAULT_LAYOUT), ALL);
    const bits = cfg.chords.map((c) => c.bits);
    expect(new Set(bits).size).toBe(bits.length);
  });

  it('changes nothing a second time', () => {
    const once = applyChanges(configFromLayout(DEFAULT_LAYOUT), ALL).cfg;
    const twice = applyChanges(once, ALL);
    expect(writeV7(twice.cfg)).toEqual(writeV7(once));
    expect(twice.report.placed).toEqual([]);
    expect(twice.report.removed).toEqual([]);
  });

  it('applies only the changes asked for', () => {
    const start = configFromLayout(DEFAULT_LAYOUT);
    const { cfg } = applyChanges(start, ['words']);
    expect(cfg.chords.length - start.chords.length).toBe(COMMON_WORDS.length);
    expect(readSettings(cfg)).toEqual(readSettings(start));
  });

  const t3num = new URL('./fixtures/local/t4-tuner-t3num.cfg', import.meta.url);
  it.skipIf(!existsSync(t3num))('moves a Tuner download with digits on T3 onto the fingers', () => {
    const { cfg, report } = applyChanges(parseV7(new Uint8Array(readFileSync(t3num))), ALL);
    expect(report.lost).toEqual([]);
    // End was on 2L 3L 4L, where 9 goes.
    expect(report.moved).toEqual(['End: 2L 3L 4L to 2L 3M']);
    expect(chordsFor(cfg, '5')).toEqual(['2L 3M 4M']);
  });
});

describe('the Short thumbs preset', () => {
  it('has the navigation keys, every character on the fingers or T4, and all 24 word chords', async () => {
    const { shortThumbsConfig } = await import('./profiles');
    const { actionLabel } = await import('./v7');
    const cfg = shortThumbsConfig();
    const labels = cfg.chords.map((c) => `${chordLabel(c.bits)} = ${actionLabel(c)}`);
    for (const l of ['2M 3R = Up', '2M 3M = Left', '2M 3L = Down', '2M 4M = Right', '2R 3R 4R = Home', '3R 4R = Page Up', '3L 4L = Page Down']) expect(labels).toContain(l);
    // End was on 2L 3L 4L, where 9 goes, and moved out of the way.
    expect(labels.filter((l) => l.endsWith('= End'))).toHaveLength(1);
    expect(chordsFor(cfg, '9')).toEqual(['2L 3L 4L']);
    for (const w of [...COMMON_WORDS, ...TERMINAL_WORDS]) expect(chordsFor(cfg, w), w).toHaveLength(1);
    expect(cfg.chords.filter((c) => c.type !== 1 && (c.bits & (T1 | T2 | T3)) !== 0)).toEqual([]);
    const bits = cfg.chords.map((c) => c.bits);
    expect(new Set(bits).size).toBe(bits.length);
  });
});
