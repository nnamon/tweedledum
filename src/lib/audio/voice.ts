// Spoken prompts. Letters, digits and most punctuation have recorded clips (public/voice/, from
// BeepBeep, made with the Kokoro-82M voice am_michael), so they play offline and sound the same
// on every device. Words and anything without a clip use the device's speech voice.

const CLIPS: Record<string, string> = {
  '.': 'period', ',': 'comma', '?': 'question-mark', "'": 'apostrophe', '!': 'exclamation',
  '/': 'slash', ')': 'close-bracket', ':': 'colon', ';': 'semicolon', '-': 'dash', '_': 'underscore',
  '"': 'quote', '@': 'at',
};

/** How a character is said by the device voice. */
const NAMES: Record<string, string> = {
  ' ': 'space', '.': 'period', ',': 'comma', '?': 'question mark', "'": 'apostrophe', '!': 'exclamation mark',
  '/': 'slash', '\\': 'backslash', '(': 'open bracket', ')': 'close bracket', ':': 'colon', ';': 'semicolon',
  '-': 'dash', '_': 'underscore', '"': 'quote', '@': 'at', '#': 'hash', '$': 'dollar', '%': 'percent',
  '&': 'ampersand', '*': 'star', '+': 'plus', '=': 'equals', '<': 'less than', '>': 'greater than',
  '[': 'open square bracket', ']': 'close square bracket', '{': 'open brace', '}': 'close brace',
  '^': 'caret', '`': 'backtick', '|': 'bar', '~': 'tilde', '\n': 'enter',
};

export function charName(ch: string): string {
  if (NAMES[ch]) return NAMES[ch];
  if (/[A-Z]/.test(ch)) return `capital ${ch}`;
  return ch;
}

function clipFor(ch: string): string | null {
  if (/^[a-z0-9]$/i.test(ch)) return ch.toUpperCase();
  return CLIPS[ch] ?? null;
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function voices(): SpeechSynthesisVoice[] {
  if (!speechAvailable()) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
}

export interface VoiceOptions {
  rate: number;
  voiceName: string;
}

let epoch = 0;
let audio: HTMLAudioElement | null = null;
const cache = new Map<string, HTMLAudioElement>();

/** Stops anything being said and anything queued. */
export function stopVoice() {
  epoch++;
  if (speechAvailable()) speechSynthesis.cancel();
  if (audio) {
    audio.pause();
    audio = null;
  }
}

function playClip(name: string, rate: number): Promise<boolean> {
  let a = cache.get(name);
  if (!a) {
    a = new Audio(`${import.meta.env.BASE_URL}voice/${name}.mp3`);
    a.preload = 'auto';
    cache.set(name, a);
  }
  const el = a;
  el.currentTime = 0;
  el.playbackRate = Math.min(2, Math.max(0.5, rate));
  audio = el;
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      el.onended = null;
      el.onerror = null;
      resolve(ok);
    };
    el.onended = () => done(true);
    el.onerror = () => done(false);
    el.play().catch(() => done(false));
  });
}

function speak(text: string, o: VoiceOptions): Promise<void> {
  if (!speechAvailable()) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = o.rate;
    u.lang = 'en-GB';
    const v = o.voiceName ? speechSynthesis.getVoices().find((x) => x.name === o.voiceName) : undefined;
    if (v) u.voice = v;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
    // Some browsers never fire onend for a cancelled utterance.
    setTimeout(resolve, 4000 + text.length * 150);
  });
}

export async function sayChar(ch: string, o: VoiceOptions): Promise<void> {
  const name = clipFor(ch);
  // A capital: "capital" by the device voice, then the letter clip.
  if (/^[A-Z]$/.test(ch)) await speak('capital', o);
  if (name && (await playClip(name, o.rate))) return;
  await speak(charName(ch), o);
}

/** Says a group of characters one by one, with a pause between them. Stops if stopVoice runs. */
export async function sayChars(text: string, o: VoiceOptions, gapMs: number): Promise<void> {
  const mine = ++epoch;
  for (const ch of text) {
    if (mine !== epoch) return;
    await sayChar(ch, o);
    await new Promise((r) => setTimeout(r, gapMs));
  }
}

/** Says a word or phrase with the device voice. */
export async function sayText(text: string, o: VoiceOptions): Promise<void> {
  const mine = ++epoch;
  if (speechAvailable()) speechSynthesis.cancel();
  if (mine !== epoch) return;
  await speak(text, o);
}
