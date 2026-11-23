import { describe, expect, it } from 'vitest';
import { SESSION_GAP_MS, emptyProfile, recordRun, type RunResult } from './profile';
import { exportCode, exportFile, importText, ImportError } from './transfer';

function run(at: number, over: Partial<RunResult> = {}): RunResult {
  return {
    kind: 'lesson',
    label: 'Lesson 1',
    lesson: 1,
    at,
    ms: 10_000,
    hits: 3,
    miss: 1,
    score: 3,
    wpm: 3.6,
    acc: 75,
    streak: 2,
    events: [
      { ch: 'a', ok: true, ms: 0 },
      { ch: 'b', ok: false, ms: 0 },
      { ch: 'b', ok: true, ms: 400 },
      { ch: 'c', ok: true, ms: 9000 },
    ],
    ...over,
  };
}

describe('recordRun', () => {
  it('adds to the session, day, lesson and keys', () => {
    const p = emptyProfile(0);
    const t = new Date(2026, 10, 21, 9).getTime();
    recordRun(p, run(t));
    recordRun(p, run(t + 60_000, { wpm: 9 }));
    expect(p.sessions).toHaveLength(1);
    expect(p.sessions[0].runs).toBe(2);
    expect(p.sessions[0].keys.b).toEqual([2, 2]);
    expect(p.days['2026-11-21'].runs).toBe(2);
    expect(p.days['2026-11-21'].bestWpm).toBe(9);
    expect(p.lessons['1'].runs).toBe(2);
    expect(p.lessons['1'].bestWpm).toBe(9);
    // The 9 s hit is a pause: counted, not timed.
    expect(p.keys.c).toEqual({ n: 2, miss: 0, ms: 0, timed: 0 });
    expect(p.keys.b).toEqual({ n: 2, miss: 2, ms: 800, timed: 2 });
  });

  it('starts a new session after a long gap', () => {
    const p = emptyProfile(0);
    recordRun(p, run(0));
    recordRun(p, run(10_000 + SESSION_GAP_MS + 1));
    expect(p.sessions).toHaveLength(2);
    expect(p.runs[1].s).toBe(p.sessions[1].id);
  });
});

describe('transfer', () => {
  it('round-trips through a code and a file', async () => {
    const p = emptyProfile(5);
    recordRun(p, run(1000));
    p.settings.view = 'back';
    const code = await exportCode(p);
    expect(code.startsWith('TWD1.')).toBe(true);
    expect(await importText(code)).toEqual(p);
    // Line breaks from a chat app are ignored.
    expect(await importText(code.slice(0, 20) + '\n ' + code.slice(20))).toEqual(p);
    expect(await importText(exportFile(p))).toEqual(p);
  });

  it('says what is wrong with a bad code', async () => {
    await expect(importText('hello')).rejects.toBeInstanceOf(ImportError);
    await expect(importText('TWD1.abc')).rejects.toThrow(/damaged/);
    await expect(importText('{"v":2}')).rejects.toThrow(/not a Tweedledum/);
  });

  it('fills settings a newer version added', async () => {
    const p = emptyProfile(5) as unknown as Record<string, unknown>;
    delete (p.settings as Record<string, unknown>).voiceRate;
    const back = await importText(JSON.stringify(p));
    expect(back.settings.voiceRate).toBe(1);
  });

  it('loads a profile from before the hand setting as right-handed, and keeps left', async () => {
    const p = emptyProfile(5) as unknown as Record<string, unknown>;
    delete (p.settings as Record<string, unknown>).hand;
    expect((await importText(JSON.stringify(p))).settings.hand).toBe('right');
    (p.settings as Record<string, unknown>).hand = 'left';
    expect((await importText(JSON.stringify(p))).settings.hand).toBe('left');
    (p.settings as Record<string, unknown>).hand = 'sideways';
    expect((await importText(JSON.stringify(p))).settings.hand).toBe('right');
  });

  it('moves someone who finished lesson 69 on to lesson 70, and leaves others where they are', async () => {
    const rec = { runs: 1, bestWpm: 20, bestAcc: 0.95, bestScore: 100, bestStars: 6, last: 1 };
    const done = { ...emptyProfile(5), lesson: 69, lessons: { '69': rec } };
    expect((await importText(JSON.stringify(done))).lesson).toBe(70);
    const midway = { ...emptyProfile(5), lesson: 40, lessons: { '39': rec } };
    expect((await importText(JSON.stringify(midway))).lesson).toBe(40);
  });

  it('loads a config saved before slots as slot 1, and keeps a chosen slot', async () => {
    const old = { ...emptyProfile(5), config: { name: 'Mine', data: 'AAAA' } };
    expect((await importText(JSON.stringify(old))).config).toEqual({ name: 'Mine', data: 'AAAA', slot: 1 });
    const three = { ...emptyProfile(5), config: { name: 'Mine', data: 'AAAA', slot: 3 } };
    expect((await importText(JSON.stringify(three))).config?.slot).toBe(3);
    const bad = { ...emptyProfile(5), config: { name: 'Mine', data: 'AAAA', slot: 7 } };
    expect((await importText(JSON.stringify(bad))).config?.slot).toBe(1);
  });
});
