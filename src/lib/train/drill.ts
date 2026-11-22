// Learning chords one at a time, with spaced repetition. Each chord has a box from 0 to 5: typing
// it right without the hint moves it up a box, a miss sends it back to 0. A session reviews the
// lowest boxes first and brings in a few new chords.
//
// A multi-character chord types its letters in one burst, a few milliseconds apart. Typing the
// same letters one chord at a time leaves gaps of 100 ms or more, so the gaps show which was used.

import { chordText, type Chord } from '../chords/chord';
import type { Keymap } from '../chords/layout';

export type DrillGroup = 'words' | 'letters' | 'digits' | 'symbols';

export const DRILL_GROUPS: { id: DrillGroup; label: string }[] = [
  { id: 'words', label: 'Word chords' },
  { id: 'letters', label: 'Letters' },
  { id: 'digits', label: 'Digits' },
  { id: 'symbols', label: 'Symbols' },
];

export interface Card {
  /** Where its record is kept: the chord and what it types, so a new layout starts afresh. */
  id: string;
  output: string;
  chord: Chord;
}

export interface ChordRec {
  box: number;
  /** Times typed right with the chord. */
  good: number;
  /** Times answered at all. */
  seen: number;
  last: number;
}

export const TOP_BOX = 5;
/** The longest gap between the characters of one chord's burst. */
export const BURST_MS = 80;

/** Letters in order of how often English uses them, so the common ones come first. */
const LETTER_ORDER = 'etaoinshrdlcumwfgypbvkjxqz';

export function cardId(chord: Chord, output: string): string {
  return `${chordText(chord)}|${output}`;
}

/** The chords of one group in the layout, in the order to learn them. */
export function cardsFor(km: Keymap, group: DrillGroup): Card[] {
  const card = (output: string, chord: Chord): Card => ({ id: cardId(chord, output), output, chord });
  if (group === 'words') {
    const seen = new Set<string>();
    const out: Card[] = [];
    for (const e of km.layout.entries) {
      if (e.output.length < 2 || seen.has(e.output)) continue;
      seen.add(e.output);
      out.push(card(e.output, e.chord));
    }
    return out;
  }
  const chars =
    group === 'letters'
      ? [...LETTER_ORDER]
      : group === 'digits'
        ? [...'1234567890']
        : [...new Set(km.layout.entries.map((e) => e.output))].filter((o) => o.length === 1 && !/[a-zA-Z0-9 ]/.test(o)).sort();
  return chars.flatMap((c) => {
    const chord = km.chordFor(c);
    return chord ? [card(c, chord)] : [];
  });
}

/**
 * The cards for one session: chords already met, lowest box and longest unseen first, then up to
 * `maxNew` new ones. Each new card comes three times, spread through the session.
 */
export function buildSession(cards: Card[], recs: Record<string, ChordRec>, size = 20, maxNew = 3): Card[] {
  const met = cards.filter((c) => recs[c.id]);
  const fresh = cards.filter((c) => !recs[c.id]);
  // Bring in new chords only once the ones met are mostly learnt.
  const shaky = met.filter((c) => recs[c.id].box < 2).length;
  const newCards = fresh.slice(0, Math.max(0, maxNew - shaky));
  const reviews = [...met].sort((a, b) => recs[a.id].box - recs[b.id].box || recs[a.id].last - recs[b.id].last);

  const slots: Card[] = [];
  for (const c of newCards) slots.push(c, c, c);
  for (let i = 0; slots.length < size && reviews.length > 0; i++) {
    slots.push(reviews[i % reviews.length]);
    if (i >= reviews.length * 3) break;
  }
  if (slots.length === 0) return [];
  // Interleave so the same card never comes twice in a row where it can be helped.
  return spread(slots.slice(0, Math.max(size, newCards.length * 3)));
}

/** Orders cards so repeats are apart: each step takes the card with most copies left, not the last one. */
function spread(cards: Card[]): Card[] {
  const left = new Map<string, { card: Card; n: number }>();
  for (const c of cards) {
    const e = left.get(c.id);
    if (e) e.n++;
    else left.set(c.id, { card: c, n: 1 });
  }
  const out: Card[] = [];
  while (left.size) {
    const prev = out[out.length - 1]?.id;
    let best: { card: Card; n: number } | undefined;
    for (const e of left.values()) if ((e.card.id !== prev || left.size === 1) && (!best || e.n > best.n)) best = e;
    out.push(best!.card);
    if (--best!.n === 0) left.delete(best!.card.id);
  }
  return out;
}

/** Whether characters typed at these times came from one chord. */
export function isBurst(times: number[]): boolean {
  for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] > BURST_MS) return false;
  return true;
}

export type Answer = 'chord' | 'letters' | 'hinted' | 'miss';

/** The record after one answer. */
export function grade(rec: ChordRec | undefined, answer: Answer, now: number): ChordRec {
  const r = rec ? { ...rec } : { box: 0, good: 0, seen: 0, last: now };
  r.seen++;
  r.last = now;
  if (answer === 'chord') {
    r.good++;
    r.box = Math.min(TOP_BOX, r.box + 1);
  } else if (answer === 'hinted') {
    r.good++;
  } else if (answer === 'miss') {
    r.box = 0;
  }
  return r;
}

/** How many of the cards are learnt: in box 3 or higher. */
export function learntCount(cards: Card[], recs: Record<string, ChordRec>): number {
  return cards.filter((c) => (recs[c.id]?.box ?? 0) >= 3).length;
}
