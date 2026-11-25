import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT } from './layout';
import { CHANGES, COMMON_WORDS, PROFILES, applyChanges, type ChangeId } from './profiles';
import { chordLabel, configFromLayout, parseV7, readSettings, textOf, writeV7, type V7Config } from './v7';

const ALL = Object.keys(CHANGES) as ChangeId[];
const T1 = 1;
const T2 = 1 << 4;
const T3 = 1 << 8;
const T4 = 1 << 12;

/** Every chord that types the text, as the Tuner names it. */
const chordsFor = (cfg: V7Config, text: string) => cfg.chords.filter((c) => textOf(c) === text).map((c) => chordLabel(c.bits));

describe('the SmallHands profile', () => {
  it('lists every change once', () => {
    expect(PROFILES[0].changes.map((c) => c.id).sort()).toEqual([...ALL].sort());
  });

  it('puts digits, symbols and words on the fingers of the default layout', () => {
    const { cfg, report } = applyChanges(configFromLayout(DEFAULT_LAYOUT), ALL);
    expect(chordsFor(cfg, '1')).toEqual(['1L 1M 1R 2L']);
    expect(chordsFor(cfg, '5')).toEqual(['1L 1M 1R 3M']);
    expect(chordsFor(cfg, '9')).toEqual(['1L 1M 1R 4R']);
    expect(chordsFor(cfg, '0')).toEqual(['1L 1M 1R 2L 3L']);
    expect(chordsFor(cfg, '[')).toEqual(['1R 3R 4L']);
    expect(chordsFor(cfg, '~')).toEqual(['1M 3R 4L']);
    expect(chordsFor(cfg, 'for ')).toEqual(['1R 2R 3R 4M']);
    for (const w of COMMON_WORDS) expect(chordsFor(cfg, w), w).toHaveLength(1);
    expect(report.lost).toEqual([]);
    expect(report.farOnly).toEqual([]);
    // Nothing that types text is left on T1, T2 or T3 alone.
    expect(cfg.chords.filter((c) => c.type !== 1 && textOf(c) !== null && (c.bits & (T1 | T2 | T3)) !== 0).map((c) => chordLabel(c.bits))).toEqual([]);
    // T3 holds Shift and T4 Control.
    expect(readSettings(cfg).thumbs.slice(2)).toEqual([2, 1]);
    // The result is a config the Tuner reads: it survives a write and a read.
    expect(writeV7(parseV7(writeV7(cfg)))).toEqual(writeV7(cfg));
  });

  it('moves string chords off T4, which holds Shift for every letter', () => {
    // On T4, "The " came out of the Twiddler as "THE ".
    const { cfg, report } = applyChanges(configFromLayout(DEFAULT_LAYOUT), ALL);
    expect(chordsFor(cfg, 'The ')).toEqual(['2R 3R 4M']);
    expect(chordsFor(cfg, 'the ')).toEqual(['2R 3R']);
    expect(report.moved).toContain('"The ": T4 2R 3R to 2R 3R 4M');
    expect(cfg.chords.filter((c) => c.type === 7 && (c.bits & T4) !== 0)).toEqual([]);
  });

  it('swaps T3 and T4, so what needs Shift follows it to T3', async () => {
    const { actionLabel } = await import('./v7');
    const { cfg } = applyChanges(configFromLayout(DEFAULT_LAYOUT), ALL);
    const labels = cfg.chords.map((c) => `${chordLabel(c.bits)} = ${actionLabel(c)}`);
    expect(labels).toContain('T3 1M 2M 4M = Shift+Tab');
    expect(cfg.chords.filter((c) => c.type !== 1 && (c.bits & T4) !== 0).map((c) => chordLabel(c.bits))).toEqual([]);
  });

  it('teaches capitals on T3 once T3 holds Shift', async () => {
    const { importLayout } = await import('./import');
    const { Keymap } = await import('./layout');
    const { formatChord } = await import('./chord');
    const { cfg } = applyChanges(configFromLayout(DEFAULT_LAYOUT), ALL);
    const { layout } = importLayout(writeV7(cfg), 'x.cfg');
    expect(layout.holds).toEqual({ C: 'SHIFT', S: 'CTRL' });
    const km = new Keymap(layout);
    expect(formatChord(km.chordFor('A')!, 't4')).toBe('T3 F1R');
    expect(km.thumbName('C')).toBe('SHIFT');
    // The default layout keeps SHIFT on T4.
    expect(formatChord(new Keymap(DEFAULT_LAYOUT).chordFor('A')!, 't4')).toBe('T4 F1R');
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
    // The barre digits land on free spots, so nothing moves except chords following T3 and T4.
    expect(report.moved.filter((m) => !/T[34].* to .*T[34]/.test(m))).toEqual([]);
    expect(chordsFor(cfg, '5')).toEqual(['1L 1M 1R 3M']);
  });
});

describe('the SmallHands preset', () => {
  it('has the navigation keys, every character on the fingers or T4, and all 14 word chords', async () => {
    const { smallHandsConfig } = await import('./profiles');
    const { actionLabel } = await import('./v7');
    const cfg = smallHandsConfig();
    const labels = cfg.chords.map((c) => `${chordLabel(c.bits)} = ${actionLabel(c)}`);
    for (const l of ['2M 3R = Up', '2M 3M = Left', '2M 3L = Down', '2M 4M = Right', '2R 3R 4R = Home', '3R 4R = Page Up', '3L 4L = Page Down']) expect(labels).toContain(l);
    expect(labels).toContain('2L 3L 4L = End');
    expect(chordsFor(cfg, '9')).toEqual(['1L 1M 1R 4R']);
    for (const w of COMMON_WORDS) expect(chordsFor(cfg, w), w).toHaveLength(1);
    expect(cfg.chords.filter((c) => c.type !== 1 && (c.bits & (T1 | T2)) !== 0)).toEqual([]);
    const bits = cfg.chords.map((c) => c.bits);
    expect(new Set(bits).size).toBe(bits.length);
  });

  const tuner = new URL('./fixtures/local/tuner-smallhands.cfg', import.meta.url);
  it.skipIf(!existsSync(tuner))("is byte for byte what Tek Gear's Tuner saves after reading it", async () => {
    const { smallHandsConfig } = await import('./profiles');
    expect(Buffer.from(writeV7(smallHandsConfig()))).toEqual(readFileSync(tuner));
  });
});
