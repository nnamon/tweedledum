// The live profile, saved in this browser after every change.

import { parseChord } from '../chords/chord';
import { DEFAULT_LAYOUT, Keymap, type Layout } from '../chords/layout';
import { emptyProfile, normaliseProfile, type Profile } from './profile';

const KEY = 'tweedledum.profile.v1';

function load(): { p: Profile; warning: string | null } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { p: normaliseProfile(JSON.parse(raw)), warning: null };
  } catch {
    return { p: emptyProfile(), warning: 'Your saved progress in this browser could not be read, so the app started fresh. If you have a progress code or file, load it in Settings.' };
  }
  return { p: emptyProfile(), warning: null };
}

const first = load();

export const store = $state<{ p: Profile; warning: string | null; saveFailed: boolean }>({ p: first.p, warning: first.warning, saveFailed: false });

let timer: ReturnType<typeof setTimeout> | null = null;

export function saveNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  try {
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(store.p)));
    store.saveFailed = false;
  } catch {
    store.saveFailed = true;
  }
}

/** Saves a moment after the last change, and when the page is hidden. */
export function startAutosave() {
  $effect.root(() => {
    $effect(() => {
      JSON.stringify(store.p);
      if (timer) clearTimeout(timer);
      timer = setTimeout(saveNow, 400);
    });
  });
  addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
}

/** Replaces the whole profile, as after loading a progress code. */
export function replaceProfile(p: Profile) {
  store.p = p;
  saveNow();
}

let cachedFor: unknown = undefined;
let cached: Keymap = new Keymap(DEFAULT_LAYOUT);

export function layout(): Layout {
  const saved = store.p.layout;
  if (!saved) return DEFAULT_LAYOUT;
  const entries = saved.entries.flatMap(([c, output]) => {
    const chord = parseChord(c);
    return chord ? [{ chord, output }] : [];
  });
  const keys = (saved.keys ?? []).flatMap(([c, name]) => {
    const chord = parseChord(c);
    return chord ? [{ chord, name }] : [];
  });
  return { name: saved.name, entries, keys, holds: saved.holds as Layout['holds'] };
}

/** The keymap for the layout in use, rebuilt only when the layout changes. */
export function keymap(): Keymap {
  const saved = store.p.layout;
  if (saved !== cachedFor) {
    cachedFor = saved;
    cached = new Keymap(layout());
  }
  return cached;
}
