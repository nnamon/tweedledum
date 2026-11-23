// What was pressed on the Twiddler, for the Chords page. A multi-character chord sends its letters
// a few milliseconds apart, so keys that arrive in one burst are kept together and matched back
// to the chord that typed them.

import { type Chord } from './chord';
import { type Keymap } from './layout';
import { BURST_MS } from '../train/drill';

/** Keys that arrived together: text, or one key that types nothing. */
export type Burst = { id: number; text: string; at: number; key?: string };

/** One chord's worth of what was pressed. */
export type Press = { id: string; text: string; chord: Chord | null; key?: string };

/** Labels for keys that type nothing, by KeyboardEvent.key. Those with a keypad label can have a chord. */
const KEY_LABELS: Record<string, string> = {
  Enter: 'ENT', Backspace: 'BS', Delete: 'DEL', Tab: 'TAB', Escape: 'ESC',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Home: 'Home', End: 'End', PageUp: 'Page Up', PageDown: 'Page Down', Insert: 'Insert',
};

export function keyLabel(key: string): string | null {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  return /^F([1-9]|1[0-9]|2[0-4])$/.test(key) ? key : null;
}

/** Adds a typed character, joining the last burst when it came within BURST_MS. */
export function addChar(bursts: Burst[], ch: string, at: number, id: number): Burst[] {
  const last = bursts[bursts.length - 1];
  if (last && last.key === undefined && at - last.at <= BURST_MS) {
    return [...bursts.slice(0, -1), { ...last, text: last.text + ch, at }];
  }
  return [...bursts, { id, text: ch, at }];
}

export function addKey(bursts: Burst[], label: string, at: number, id: number): Burst[] {
  return [...bursts, { id, text: '', at, key: label }];
}

/**
 * The chords one burst came from: the longest multi-character chord at each point, otherwise one
 * character. Two quick single-letter chords that land in one burst come apart again here.
 */
export function pressesOf(km: Keymap, b: Burst): Press[] {
  if (b.key !== undefined) return [{ id: `${b.id}`, text: b.key, chord: km.chordForKey(b.key), key: b.key }];
  const out: Press[] = [];
  let i = 0;
  while (i < b.text.length) {
    const m = km.multi.find((e) => b.text.startsWith(e.output, i));
    const text = m ? m.output : b.text[i];
    out.push({ id: `${b.id}:${i}`, text, chord: m ? m.chord : km.chordFor(text) });
    i += text.length;
  }
  return out;
}
