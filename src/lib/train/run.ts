// One run of typing: a target text, typed one character at a time. A wrong key is a miss and
// the cursor stays where it is, as in the Tek Gear tutor. Scoring follows the tutor too.

export interface KeyEvent {
  /** The character that was expected. */
  ch: string;
  ok: boolean;
  /** For a hit: ms since the previous hit, or since the run started. Misses: 0. */
  ms: number;
}

export type PressResult = 'hit' | 'miss' | 'done' | 'ignored';

/** Keys that are never typing: modifiers, locks, navigation. */
const IGNORED = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'NumLock', 'ScrollLock', 'Fn', 'FnLock',
  'Hyper', 'Super', 'OS', 'Tab', 'Escape', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp',
  'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ContextMenu', 'Unidentified', 'Dead',
  'Process', 'Compose',
]);

/** Points for one hit, from the tutor: streaks of 5, 10, 20 and over 20 pay more. */
export function hitScore(streak: number, hits: number, misses: number): number {
  const lead = hits - misses;
  if (lead <= 0) return 0;
  if (streak < 5) return 1;
  if (streak === 5) return 2 * streak + lead;
  if (streak === 10) return 4 * streak + lead;
  if (streak === 20) return 8 * streak + lead;
  if (streak > 20) return streak * streak + lead;
  return 0;
}

/** Words per minute: five characters to a word, counting correct characters only. */
export function wpmOf(hits: number, ms: number): number {
  if (ms < 30) return 0;
  return hits / 5 / (ms / 60000);
}

/** Accuracy in percent: hits out of all key presses. */
export function accuracyOf(hits: number, misses: number): number {
  const all = hits + misses;
  return all === 0 ? 100 : (hits / all) * 100;
}

/** Stars out of 5 for speed, from the tutor: 20, 30, 40, 50 and 60 wpm. */
export function speedStars(wpm: number): number {
  if (wpm < 20) return 0;
  if (wpm < 30) return 1;
  if (wpm < 40) return 2;
  if (wpm < 50) return 3;
  if (wpm < 60) return 4;
  return 5;
}

/** Stars out of 5 for accuracy, from the tutor: 20, 30, 60, 70 and 86 percent. */
export function accuracyStars(acc: number): number {
  if (acc < 20) return 0;
  if (acc < 30) return 1;
  if (acc < 60) return 2;
  if (acc < 70) return 3;
  if (acc < 86) return 4;
  return 5;
}

/** Normalises a key from a keyboard event to the character it types, or null. */
export function keyChar(key: string): string | null {
  if (IGNORED.has(key)) return null;
  if (key === 'Enter') return '\n';
  if (key === 'Spacebar') return ' ';
  // Typographic quotes from phones' smart punctuation count as the plain ones.
  if (key === '’' || key === '‘') return "'";
  if (key === '“' || key === '”') return '"';
  return [...key].length === 1 ? key : null;
}

export class Run {
  readonly target: string;
  pos = 0;
  hits = 0;
  misses = 0;
  streak = 0;
  bestStreak = 0;
  score = 0;
  /** Misses at the current position, for hints that appear after mistakes. */
  missesHere = 0;
  startedAt: number | null = null;
  endedAt: number | null = null;
  /** Set while the run is paused (Settings open); the clock does not count that time. */
  pausedAt: number | null = null;
  private lastHitAt: number | null = null;
  readonly events: KeyEvent[] = [];
  /** Positions that had at least one miss, for marking the text. */
  readonly missed = new Set<number>();
  /** Characters typed in place of each missed position: shown on the line, for the record. */
  readonly wrong: string[] = [];

  constructor(target: string) {
    this.target = target;
  }

  get done(): boolean {
    return this.pos >= this.target.length;
  }

  get expected(): string {
    return this.target[this.pos] ?? '';
  }

  elapsed(now: number): number {
    if (this.startedAt === null) return 0;
    return (this.endedAt ?? this.pausedAt ?? now) - this.startedAt;
  }

  /** Stops the clock without ending the run. A run that has not started stays unstarted. */
  pause(now: number) {
    if (this.startedAt !== null && this.endedAt === null && this.pausedAt === null) this.pausedAt = now;
  }

  /** Restarts the clock. Shifting the start keeps the paused time out of wpm and key times. */
  resume(now: number) {
    if (this.pausedAt === null) return;
    const gap = now - this.pausedAt;
    this.pausedAt = null;
    if (this.startedAt !== null) this.startedAt += gap;
    if (this.lastHitAt !== null) this.lastHitAt += gap;
  }

  wpm(now: number): number {
    return wpmOf(this.hits, this.elapsed(now));
  }

  accuracy(): number {
    return accuracyOf(this.hits, this.misses);
  }

  /** Starts the clock without a key, for runs that start on a prompt such as dictation. */
  start(now: number) {
    if (this.startedAt === null) {
      this.startedAt = now;
      this.lastHitAt = now;
    }
  }

  press(ch: string, now: number): PressResult {
    if (this.done) return 'ignored';
    // The first key starts the clock, as in the tutor.
    if (this.startedAt === null) {
      this.startedAt = now;
      this.lastHitAt = now;
    }
    const want = this.expected;
    const ok = ch === want || (want === '\n' && ch === '\r');
    if (ok) {
      const ms = now - (this.lastHitAt ?? now);
      this.lastHitAt = now;
      this.pos++;
      this.hits++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.missesHere = 0;
      this.score += hitScore(this.streak, this.hits, this.misses);
      this.events.push({ ch: want, ok: true, ms });
      if (this.done) {
        this.endedAt = now;
        return 'done';
      }
      return 'hit';
    }
    this.misses++;
    this.missesHere++;
    this.streak = 0;
    this.missed.add(this.pos);
    this.wrong[this.pos] = ch;
    this.events.push({ ch: want, ok: false, ms: 0 });
    return 'miss';
  }

  /** Ends the run early (timed tests, or the person stops). */
  stop(now: number) {
    if (this.endedAt === null) this.endedAt = this.pausedAt ?? now;
    if (this.startedAt === null) this.startedAt = now;
  }
}
