// The layouts built into the Tuner. The third-party ones are config files in public/layouts.

import { importLayout, LayoutError } from './import';
import { DEFAULT_LAYOUT, type Layout } from './layout';
import { applyChanges, shortThumbsConfig } from './profiles';
import { configFromLayout, writeV7, type V7Config } from './v7';

export type Preset = { id: string; name: string; sub: string; file?: string };

export const DEFAULT_NAME = 'Twiddler default';

export const PRESETS: Preset[] = [
  { id: 'default', name: DEFAULT_NAME, sub: 'The factory layout. The lessons are written for it.' },
  { id: 'short', name: 'Short thumbs', sub: 'The default with nothing on T1 or T2' },
  { id: 'tabspace', name: 'TabSpace', file: 'tabspace.cfg', sub: 'Brandon Rhodes' },
  { id: 'mirrorwalk', name: 'MirrorWalk', file: 'mirrorwalk.cfg', sub: 'Griatch' },
  { id: 'mirrorwalk-nomcc', name: 'MirrorWalk without multi-character chords', file: 'mirrorwalk_nomcc.cfg', sub: 'Griatch' },
  { id: 'delent', name: 'DelEnt', file: 'delent.cfg', sub: 'Griatch' },
  { id: 'teasan', name: 'TeaSan', file: 'teasan.cfg', sub: 'Griatch' },
];

export async function fetchPreset(file: string): Promise<Uint8Array> {
  const res = await fetch(`${import.meta.env.BASE_URL}layouts/${file}`);
  if (!res.ok) throw new LayoutError('That layout could not be loaded. Check your connection and try again.');
  return new Uint8Array(await res.arrayBuffer());
}

/** The preset's typing layout, for practice. */
export async function presetLayout(p: Preset): Promise<Layout> {
  if (p.id === 'default') return DEFAULT_LAYOUT;
  if (p.id === 'short') return importLayout(writeV7(shortThumbsConfig()), 'short-thumbs.cfg').layout;
  return importLayout(await fetchPreset(p.file!), p.file!).layout;
}

/**
 * The preset as a Twiddler 4 config, with a note on what it leaves out. A typing layout has no
 * navigation keys, so the default gets the factory ones from the profile's 'nav' change.
 */
export async function presetConfig(p: Preset): Promise<{ cfg: V7Config; note: string }> {
  if (p.id === 'short') return { cfg: shortThumbsConfig(), note: 'It has no F1 to F12.' };
  if (p.id === 'default') return { cfg: applyChanges(configFromLayout(DEFAULT_LAYOUT), ['nav']).cfg, note: 'It has no F1 to F12 or Control chords.' };
  return { cfg: configFromLayout(await presetLayout(p)), note: 'Its shortcuts and navigation keys are not included.' };
}
