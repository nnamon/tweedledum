// Everything the app remembers lives in one Profile object. It is saved in this browser, and it
// can be copied to another copy of the app as a code or a file (transfer.ts). Nothing is sent to
// a server.

import type { ChordRec } from '../train/drill';

export type Theme = 'system' | 'light' | 'dark';
export type View = 'front' | 'back';
export type Hand = 'right' | 'left';
export type HintMode = 'always' | 'mistake' | 'delay' | 'never';

export interface Settings {
  theme: Theme;
  /** Keypad picture: front shows the buttons as you look at them, back as your fingers find them. */
  view: View;
  /** The hand you wear the Twiddler on. Left mirrors the keypad picture; chords are unchanged. */
  hand: Hand;
  /** How chords are written: classic (LROO, N+ROOO) or Twiddler 4 (F1L F2R, T1 F1R). */
  notation: 'classic' | 't4';
  hints: HintMode;
  /** For hints 'delay': how long to wait on one character before showing its chord. */
  hintDelayMs: number;
  /** Show the multi-character chord for words that have one. */
  showMulti: boolean;
  /** Say the next character aloud (the tutor's helper audio). */
  sayNext: boolean;
  /** Say each character as you type it. */
  sayPressed: boolean;
  /** A short low tone on a wrong key. */
  missSound: boolean;
  /** Speech rate for dictation and spoken words, 0.5 to 2. */
  voiceRate: number;
  /** Name of the device voice for words, or '' for the default. */
  voiceName: string;
  /** Pause between letters in letter dictation, ms. */
  letterGapMs: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  view: 'front',
  hand: 'right',
  notation: 'classic',
  hints: 'always',
  hintDelayMs: 1500,
  showMulti: false,
  sayNext: false,
  sayPressed: false,
  missSound: true,
  voiceRate: 1,
  voiceName: '',
  letterGapMs: 450,
};

/** Per character: hits, misses, and time to type it (ms summed over timed hits). */
export interface KeyStat {
  n: number;
  miss: number;
  ms: number;
  timed: number;
}

export interface LessonRec {
  runs: number;
  bestWpm: number;
  bestAcc: number;
  bestScore: number;
  /** Speed stars plus accuracy stars from the best run, 0 to 10. */
  bestStars: number;
  last: number;
}

export interface RunRec {
  id: string;
  /** The session this run belongs to. */
  s: string;
  at: number;
  kind: string;
  label: string;
  ms: number;
  hits: number;
  miss: number;
  score: number;
  wpm: number;
  acc: number;
  streak: number;
}

/** A sitting: runs with less than SESSION_GAP_MS between them. */
export interface SessionRec {
  id: string;
  start: number;
  end: number;
  runs: number;
  ms: number;
  hits: number;
  miss: number;
  score: number;
  bestWpm: number;
  /** Per character in this session: [hits, misses]. */
  keys: Record<string, [number, number]>;
}

export interface DayRec {
  runs: number;
  ms: number;
  hits: number;
  miss: number;
  bestWpm: number;
}

export interface SavedLayout {
  name: string;
  /** [chord in tutor notation, output] */
  entries: [string, string][];
  /** [chord, keypad label] for keys that type no text. */
  keys?: [string, string][];
}

/** Options last used on each exercise screen. */
export interface ExerciseOptions {
  random: { len: number; groups: number; caps: boolean; numbers: boolean; punct: boolean };
  custom: { text: string };
  dictLetters: { set: string; group: number; groups: number };
  dictWords: { source: 'common' | 'learned'; count: number };
  timed: { seconds: number; source: 'common' | 'learned' };
  quiz: { set: string; count: number };
  weak: { length: number };
}

export const DEFAULT_OPTIONS: ExerciseOptions = {
  random: { len: 5, groups: 10, caps: false, numbers: false, punct: false },
  custom: { text: '' },
  dictLetters: { set: 'abcdefghijklmnopqrstuvwxyz', group: 3, groups: 10 },
  dictWords: { source: 'common', count: 20 },
  timed: { seconds: 60, source: 'common' },
  quiz: { set: 'abcdefghijklmnopqrstuvwxyz', count: 26 },
  weak: { length: 60 },
};

export interface Profile {
  /** Format version. */
  v: 1;
  /** Random id of this profile, kept when it moves to another copy of the app. */
  id: string;
  created: number;
  updated: number;
  settings: Settings;
  options: ExerciseOptions;
  /** A layout loaded by the person, or null for the default. */
  layout: SavedLayout | null;
  /** Lesson to continue from. */
  lesson: number;
  lessons: Record<string, LessonRec>;
  keys: Record<string, KeyStat>;
  days: Record<string, DayRec>;
  sessions: SessionRec[];
  runs: RunRec[];
  /** Learn chords: how well each chord is known, by `chord|output`. */
  chords: Record<string, ChordRec>;
  /** The Twiddler 4 config open in the Tuner, or null. */
  config: SavedConfig | null;
}

export interface SavedConfig {
  name: string;
  /** The .cfg file, in base64. */
  data: string;
  /** The config slot on the Twiddler 4, which names the file: 1.cfg, 2.cfg or 3.cfg. */
  slot: 1 | 2 | 3;
}

function slotOf(v: unknown): 1 | 2 | 3 {
  return v === 2 || v === 3 ? v : 1;
}

/** Runs kept in full. Older runs still count in the day, session, lesson and key totals. */
export const MAX_RUNS = 2000;
/** Sessions kept. */
export const MAX_SESSIONS = 500;
/** A gap longer than this between runs starts a new session. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

export function newId(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function emptyProfile(now = Date.now()): Profile {
  return {
    v: 1,
    id: newId(),
    created: now,
    updated: now,
    settings: { ...DEFAULT_SETTINGS },
    options: structuredClone(DEFAULT_OPTIONS),
    layout: null,
    lesson: 1,
    lessons: {},
    keys: {},
    days: {},
    sessions: [],
    runs: [],
    chords: {},
    config: null,
  };
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isPair(e: unknown): e is [string, string] {
  return Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string';
}

function num(x: unknown, fallback: number): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : fallback;
}

function settingsOf(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(isObj(raw) ? raw : {}) } as Settings;
  if (s.hand !== 'left' && s.hand !== 'right') s.hand = DEFAULT_SETTINGS.hand;
  return s;
}

function chordsOf(raw: unknown): Record<string, ChordRec> {
  const out: Record<string, ChordRec> = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!isObj(v)) continue;
    out[k] = { box: Math.min(5, Math.max(0, Math.round(num(v.box, 0)))), good: num(v.good, 0), seen: num(v.seen, 0), last: num(v.last, 0) };
  }
  return out;
}

/** Fills what an older or damaged profile lacks with defaults. Throws when it is not a profile. */
export function normaliseProfile(raw: unknown): Profile {
  if (!isObj(raw) || raw.v !== 1) throw new Error('not a profile');
  const base = emptyProfile(num(raw.created, Date.now()));
  const p: Profile = {
    ...base,
    id: typeof raw.id === 'string' ? raw.id : base.id,
    updated: num(raw.updated, base.updated),
    settings: settingsOf(raw.settings),
    options: structuredClone(DEFAULT_OPTIONS),
    layout: null,
    lesson: Math.max(1, Math.round(num(raw.lesson, 1))),
    lessons: isObj(raw.lessons) ? (raw.lessons as Profile['lessons']) : {},
    keys: isObj(raw.keys) ? (raw.keys as Profile['keys']) : {},
    days: isObj(raw.days) ? (raw.days as Profile['days']) : {},
    sessions: Array.isArray(raw.sessions) ? (raw.sessions as SessionRec[]) : [],
    runs: Array.isArray(raw.runs) ? (raw.runs as RunRec[]) : [],
    chords: chordsOf(raw.chords),
    config: isObj(raw.config) && typeof raw.config.data === 'string' ? { name: typeof raw.config.name === 'string' ? raw.config.name : 'Config', data: raw.config.data, slot: slotOf(raw.config.slot) } : null,
  };
  if (isObj(raw.options)) {
    for (const k of Object.keys(DEFAULT_OPTIONS) as (keyof ExerciseOptions)[]) {
      const o = raw.options[k];
      if (isObj(o)) (p.options as unknown as Record<string, unknown>)[k] = { ...DEFAULT_OPTIONS[k], ...o };
    }
  }
  if (isObj(raw.layout) && Array.isArray(raw.layout.entries)) {
    p.layout = {
      name: typeof raw.layout.name === 'string' ? raw.layout.name : 'Imported layout',
      entries: (raw.layout.entries as unknown[]).filter(isPair),
      keys: Array.isArray(raw.layout.keys) ? (raw.layout.keys as unknown[]).filter(isPair) : [],
    };
  }
  // Lesson 69 was the last until 0.1.4 added more, so finishing it moved nobody on.
  if (p.lesson === 69 && p.lessons['69']) p.lesson = 70;
  return p;
}

export function dayKey(t: number): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface RunResult {
  kind: string;
  label: string;
  /** Lesson number, for tutor lessons. */
  lesson?: number;
  at: number;
  ms: number;
  hits: number;
  miss: number;
  score: number;
  wpm: number;
  acc: number;
  streak: number;
  events: { ch: string; ok: boolean; ms: number }[];
}

/** A hit slower than this is a pause, not typing: it counts as a hit but not in the timing. */
export const PAUSE_MS = 5000;

/**
 * Adds a finished run to the profile: the run list, its session, the day, the lesson and the
 * per-character totals. Returns the run's record.
 */
export function recordRun(p: Profile, r: RunResult): RunRec {
  // Session: continue the last one if it ended recently.
  let s = p.sessions[p.sessions.length - 1];
  if (!s || r.at - s.end > SESSION_GAP_MS) {
    s = { id: newId(), start: r.at, end: r.at, runs: 0, ms: 0, hits: 0, miss: 0, score: 0, bestWpm: 0, keys: {} };
    p.sessions.push(s);
    if (p.sessions.length > MAX_SESSIONS) p.sessions.splice(0, p.sessions.length - MAX_SESSIONS);
  }
  const end = r.at + r.ms;
  s.end = Math.max(s.end, end);
  s.runs++;
  s.ms += r.ms;
  s.hits += r.hits;
  s.miss += r.miss;
  s.score += r.score;
  s.bestWpm = Math.max(s.bestWpm, r.wpm);

  for (const e of r.events) {
    const k = (p.keys[e.ch] ??= { n: 0, miss: 0, ms: 0, timed: 0 });
    const sk = (s.keys[e.ch] ??= [0, 0]);
    if (e.ok) {
      k.n++;
      sk[0]++;
      if (e.ms > 0 && e.ms < PAUSE_MS) {
        k.ms += e.ms;
        k.timed++;
      }
    } else {
      k.miss++;
      sk[1]++;
    }
  }

  const dk = dayKey(r.at);
  const d = (p.days[dk] ??= { runs: 0, ms: 0, hits: 0, miss: 0, bestWpm: 0 });
  d.runs++;
  d.ms += r.ms;
  d.hits += r.hits;
  d.miss += r.miss;
  d.bestWpm = Math.max(d.bestWpm, r.wpm);

  if (r.lesson !== undefined) {
    const key = String(r.lesson);
    const l = (p.lessons[key] ??= { runs: 0, bestWpm: 0, bestAcc: 0, bestScore: 0, bestStars: 0, last: 0 });
    l.runs++;
    l.bestWpm = Math.max(l.bestWpm, r.wpm);
    l.bestAcc = Math.max(l.bestAcc, r.acc);
    l.bestScore = Math.max(l.bestScore, r.score);
    l.last = r.at;
  }

  const rec: RunRec = {
    id: newId(),
    s: s.id,
    at: r.at,
    kind: r.kind,
    label: r.label,
    ms: Math.round(r.ms),
    hits: r.hits,
    miss: r.miss,
    score: r.score,
    wpm: Math.round(r.wpm * 10) / 10,
    acc: Math.round(r.acc * 10) / 10,
    streak: r.streak,
  };
  p.runs.push(rec);
  if (p.runs.length > MAX_RUNS) p.runs.splice(0, p.runs.length - MAX_RUNS);
  p.updated = Date.now();
  return rec;
}
