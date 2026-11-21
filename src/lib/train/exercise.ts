// The exercises, and how each becomes a plan for one run.

import { TUTOR_LESSONS } from '../lessons/tutor';
import type { Keymap } from '../chords/layout';
import type { Profile } from '../state/profile';
import { groupsFrom, keysetOf, learnedUpTo, multiChordWords, randomGroups, randomWords, weakDrill } from './text';

export type Exercise =
  | { kind: 'lesson'; n: number }
  | { kind: 'random' }
  | { kind: 'custom' }
  | { kind: 'multi' }
  | { kind: 'weak' }
  | { kind: 'timed' }
  | { kind: 'dictLetters' }
  | { kind: 'dictWords' }
  | { kind: 'quiz' };

/**
 * How a run shows its text:
 * - copy: the text is on screen; type it.
 * - listen: the text is hidden; each chunk is spoken when the cursor reaches it.
 * - quiz: the text is hidden; the keypad shows the chord of the next character.
 */
export type Mode = 'copy' | 'listen' | 'quiz';

export interface Plan {
  kind: Exercise['kind'];
  label: string;
  lesson?: number;
  text: string;
  mode: Mode;
  /** listen: speak chunks letter by letter (true) or as words (false). */
  spell?: boolean;
  /** Stop after this many seconds (timed test). */
  seconds?: number;
  /** A short line under the title. */
  note?: string;
}

export interface ExerciseInfo {
  kind: Exercise['kind'];
  title: string;
  /** One sentence: what to do. */
  blurb: string;
  icon: string;
  colour: string;
  /** Has a setup screen with options before starting. */
  setup: boolean;
}

export const EXERCISES: Record<Exercise['kind'], ExerciseInfo> = {
  lesson: { kind: 'lesson', title: 'Lessons', blurb: 'The 69 lessons of the Twiddler Typing Tutor, from four letters to full sentences.', icon: 'book', colour: 'blue', setup: false },
  random: { kind: 'random', title: 'Random text', blurb: 'Groups of random characters. Choose the group length and add capitals, digits or punctuation.', icon: 'shuffle', colour: 'indigo', setup: true },
  custom: { kind: 'custom', title: 'Your own text', blurb: 'Paste any text and type it.', icon: 'text', colour: 'teal', setup: true },
  multi: { kind: 'multi', title: 'Multi-character chords', blurb: 'Words with a chord of their own, such as "the " and "ing ". The keypad shows the word chord.', icon: 'sparkles', colour: 'purple', setup: false },
  weak: { kind: 'weak', title: 'Weak keys', blurb: 'A drill on the characters you miss most or type slowest, from your own statistics.', icon: 'target', colour: 'red', setup: true },
  timed: { kind: 'timed', title: 'Timed test', blurb: 'Common words for a fixed time. Measures your speed.', icon: 'timer', colour: 'orange', setup: true },
  dictLetters: { kind: 'dictLetters', title: 'Letter dictation', blurb: 'Hear letters read out and type them without seeing them.', icon: 'ear', colour: 'green', setup: true },
  dictWords: { kind: 'dictWords', title: 'Word dictation', blurb: 'Hear words read out and type them without seeing them.', icon: 'waveform', colour: 'pink', setup: true },
  quiz: { kind: 'quiz', title: 'Chord reading', blurb: 'The keypad shows a chord. Type what it types, to learn to read the chord pictures.', icon: 'grid', colour: 'grey', setup: true },
};

export function lessonText(n: number): string {
  return TUTOR_LESSONS.find((l) => l.n === n)?.text ?? '';
}

/** Characters the person has met: the lessons up to the current one, at least a to h. */
export function learnedChars(p: Profile): string {
  return learnedUpTo(TUTOR_LESSONS, Math.max(p.lesson, 1)) || 'abcdefgh';
}

/** Builds the plan for a run. Returns null with a reason when it cannot start. */
export function planFor(ex: Exercise, p: Profile, km: Keymap): Plan | { error: string } {
  const o = p.options;
  switch (ex.kind) {
    case 'lesson': {
      const l = TUTOR_LESSONS.find((x) => x.n === ex.n);
      if (!l) return { error: 'That lesson does not exist.' };
      return { kind: 'lesson', label: `Lesson ${l.n}`, lesson: l.n, text: l.text, mode: 'copy', note: `${l.stage} · keys ${keysetOf(l.text)}` };
    }
    case 'random':
      return { kind: 'random', label: 'Random text', text: randomGroups(o.random), mode: 'copy' };
    case 'custom': {
      const text = o.custom.text.replace(/\s+/g, ' ').trim();
      if (!text) return { error: 'Paste some text first.' };
      return { kind: 'custom', label: 'Your own text', text, mode: 'copy' };
    }
    case 'multi': {
      const words = multiChordWords(km, 16);
      if (words.length === 0) return { error: 'The layout in use has no multi-character chords for words.' };
      return { kind: 'multi', label: 'Multi-character chords', text: words.join(' '), mode: 'copy' };
    }
    case 'weak': {
      const r = weakDrill(p.keys, km, o.weak.length);
      return { kind: 'weak', label: 'Weak keys', text: r.text, mode: 'copy', note: `Focus: ${r.focus.join(' ')}` };
    }
    case 'timed': {
      const words = randomWords(200, o.timed.source === 'learned' ? learnedChars(p) : null);
      if (words.length === 0) return { error: 'No common words use only the letters you have met. Choose all common words.' };
      return { kind: 'timed', label: `Timed test, ${o.timed.seconds} seconds`, text: words.join(' '), mode: 'copy', seconds: o.timed.seconds };
    }
    case 'dictLetters': {
      const set = o.dictLetters.set.replace(/\s/g, '');
      const groups = groupsFrom(set, o.dictLetters.group, o.dictLetters.groups);
      if (groups.length === 0) return { error: 'Choose at least one character to hear.' };
      return { kind: 'dictLetters', label: 'Letter dictation', text: groups.join(' '), mode: 'listen', spell: true, note: `Characters: ${keysetOf(set)}` };
    }
    case 'dictWords': {
      const words = randomWords(o.dictWords.count, o.dictWords.source === 'learned' ? learnedChars(p) : null);
      if (words.length === 0) return { error: 'No common words use only the letters you have met. Choose all common words.' };
      return { kind: 'dictWords', label: 'Word dictation', text: words.join(' '), mode: 'listen', spell: false };
    }
    case 'quiz': {
      const set = [...new Set(o.quiz.set.replace(/\s/g, ''))].filter((c) => km.chordFor(c));
      if (set.length === 0) return { error: 'Choose at least one character the layout can type.' };
      const chars: string[] = [];
      while (chars.length < o.quiz.count) chars.push(...[...set].sort(() => Math.random() - 0.5));
      return { kind: 'quiz', label: 'Chord reading', text: chars.slice(0, o.quiz.count).join(''), mode: 'quiz' };
    }
  }
}

/** The lesson after n, or null after the last. */
export function nextLesson(n: number): number | null {
  const i = TUTOR_LESSONS.findIndex((l) => l.n === n);
  return i >= 0 && i + 1 < TUTOR_LESSONS.length ? TUTOR_LESSONS[i + 1].n : null;
}
