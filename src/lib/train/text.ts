// Text for the exercises: random groups (as the tutor's text generator makes them), words, and
// drills built from the person's own statistics.

import { COMMON_WORDS } from '../lessons/words';
import type { Keymap } from '../chords/layout';
import type { KeyStat } from '../state/profile';

export type Rng = () => number;

export function pick<T>(xs: readonly T[], rng: Rng = Math.random): T {
  return xs[Math.floor(rng() * xs.length)];
}

export function shuffle<T>(xs: T[], rng: Rng = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The distinct characters of a text, sorted, as the tutor shows a lesson's key set. Space excluded. */
export function keysetOf(text: string): string {
  return [...new Set(text.toLowerCase().replace(/\s/g, ''))].sort().join('');
}

/** The tutor's random text: lower case letters, optionally capitals, digits and ,:!.?-()[]_ */
export function randomGroups(o: { len: number; groups: number; caps: boolean; numbers: boolean; punct: boolean }, rng: Rng = Math.random): string {
  let chars = 'abcdefghijklmnopqrstuvwxyz';
  if (o.caps) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (o.numbers) chars += '0123456789';
  if (o.punct) chars += ',:!.?-()[]_';
  const groups: string[] = [];
  for (let g = 0; g < o.groups; g++) {
    let w = '';
    for (let i = 0; i < o.len; i++) w += chars[Math.floor(rng() * chars.length)];
    groups.push(w);
  }
  return groups.join(' ');
}

/** Groups of characters drawn from a set, for letter dictation and the chord reading quiz. */
export function groupsFrom(set: string, size: number, count: number, rng: Rng = Math.random): string[] {
  const chars = [...new Set(set.replace(/\s/g, ''))];
  if (chars.length === 0) return [];
  const out: string[] = [];
  for (let g = 0; g < count; g++) {
    let w = '';
    for (let i = 0; i < size; i++) {
      let c = pick(chars, rng);
      // Avoid the same character twice in a row when there is a choice.
      if (chars.length > 1 && c === w[w.length - 1]) c = pick(chars, rng);
      w += c;
    }
    out.push(w);
  }
  return out;
}

/** Common words that use only the given characters. */
export function wordsWithin(chars: string): string[] {
  const set = new Set(chars.toLowerCase());
  return COMMON_WORDS.filter((w) => [...w].every((c) => set.has(c)));
}

/** Random common words, from the whole list or from those within a character set. */
export function randomWords(count: number, within: string | null, rng: Rng = Math.random): string[] {
  const pool = within ? wordsWithin(within) : COMMON_WORDS;
  if (pool.length === 0) return [];
  // Favour the commoner words: the list is in frequency order.
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng();
    const idx = Math.floor(r * r * pool.length);
    let w = pool[idx];
    if (w === out[out.length - 1]) w = pick(pool, rng);
    out.push(w);
  }
  return out;
}

/** Words that contain a multi-character chord of the layout, mixed with the chord words themselves. */
export function multiChordWords(km: Keymap, count: number, rng: Rng = Math.random): string[] {
  const parts = km.multi.map((e) => e.output.trim()).filter((s) => s.length > 1 && /^[a-z]+$/i.test(s));
  if (parts.length === 0) return [];
  const pool = COMMON_WORDS.filter((w) => parts.some((p) => w.includes(p.toLowerCase())));
  const whole = [...new Set(parts.map((p) => p.toLowerCase()))];
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(rng() < 0.4 || pool.length === 0 ? pick(whole, rng) : pick(pool, rng));
  return out;
}

/** How much a character needs practice: its miss rate, and how slow it is against the others. */
export function weakness(k: KeyStat | undefined, medianMs: number): number {
  if (!k || k.n + k.miss < 3) return 1;
  const missRate = k.miss / (k.n + k.miss);
  const avg = k.timed ? k.ms / k.timed : medianMs;
  const slow = medianMs > 0 ? avg / medianMs : 1;
  return missRate * 4 + slow;
}

/**
 * A drill on the characters that need most practice: the weakest letters of those already
 * practised, in common words where possible and in short groups otherwise.
 */
export function weakDrill(keys: Record<string, KeyStat>, km: Keymap, length: number, rng: Rng = Math.random): { text: string; focus: string[] } {
  const typed = Object.keys(keys).filter((c) => /^[a-z]$/.test(c) && km.chordFor(c));
  const pool = typed.length >= 4 ? typed : [...'abcdefgh'];
  const times = pool
    .map((c) => keys[c])
    .filter((k) => k && k.timed > 0)
    .map((k) => k.ms / k.timed)
    .sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;
  const ranked = pool.map((c) => ({ c, w: weakness(keys[c], median) })).sort((a, b) => b.w - a.w);
  const focus = ranked.slice(0, Math.min(5, ranked.length)).map((r) => r.c);
  const known = pool.join('');
  const words = wordsWithin(known).filter((w) => focus.some((f) => w.includes(f)));
  const out: string[] = [];
  let len = 0;
  while (len < length) {
    let w: string;
    if (words.length && rng() < 0.6) w = pick(words, rng);
    else {
      w = '';
      const n = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) w += rng() < 0.6 ? pick(focus, rng) : pick(pool, rng);
    }
    out.push(w);
    len += w.length + 1;
  }
  return { text: out.join(' '), focus };
}

/** Characters that lessons up to and including n have used. */
export function learnedUpTo(lessons: { n: number; text: string }[], n: number): string {
  return keysetOf(lessons.filter((l) => l.n <= n).map((l) => l.text).join(''));
}
