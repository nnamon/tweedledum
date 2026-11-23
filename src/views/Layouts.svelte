<script lang="ts">
  // The layout you practise on: pick one, load your own, or open one in the editor below.
  import Icon from '../ui/Icon.svelte';
  import { keymap, store } from '../lib/state/app.svelte';
  import { exportLayoutJson, importLayout, importLayoutText, LayoutError, type ImportResult } from '../lib/chords/import';
  import { chordText } from '../lib/chords/chord';
  import { DEFAULT_LAYOUT } from '../lib/chords/layout';
  import { applyChanges, shortThumbsConfig } from '../lib/chords/profiles';
  import { configFromLayout, writeV7, type V7Config } from '../lib/chords/v7';

  let { onedit }: { onedit: (cfg: V7Config, name: string, note: string) => void } = $props();

  type Preset = { id: string; name: string; sub: string; file?: string };
  const DEFAULT_NAME = 'Twiddler default';
  const PRESETS: Preset[] = [
    { id: 'default', name: DEFAULT_NAME, sub: 'As the Twiddler 3 and 4 ship and the Typing Tutor teaches. The lessons follow it.' },
    { id: 'short', name: 'Short thumbs', sub: "The default for hands that can't reach T1 and T2: digits on 2L like a phone keypad, brackets and symbols on 1R and 1M, T3 as Control, T4 as Shift, and 24 word chords." },
    { id: 'tabspace', name: 'TabSpace', file: 'tabspace.cfg', sub: 'By Brandon Rhodes.' },
    { id: 'mirrorwalk', name: 'MirrorWalk', file: 'mirrorwalk.cfg', sub: 'By Griatch.' },
    { id: 'mirrorwalk-nomcc', name: 'MirrorWalk without multi-character chords', file: 'mirrorwalk_nomcc.cfg', sub: 'By Griatch.' },
    { id: 'delent', name: 'DelEnt', file: 'delent.cfg', sub: 'By Griatch.' },
    { id: 'teasan', name: 'TeaSan', file: 'teasan.cfg', sub: 'By Griatch.' },
  ];

  const km = $derived(keymap());
  const current = $derived(store.p.layout?.name ?? DEFAULT_NAME);
  const own = $derived(PRESETS.some((p) => p.name === current) ? null : current);

  let msg = $state<{ ok: boolean; text: string } | null>(null);
  let pasteText = $state('');
  let busy = $state('');

  function use(r: ImportResult, name: string, format = false) {
    store.p.layout = {
      name,
      entries: r.layout.entries.map((e) => [chordText(e.chord), e.output]),
      keys: (r.layout.keys ?? []).map((k) => [chordText(k.chord), k.name]),
    };
    const missing = keymap().missing('abcdefghijklmnopqrstuvwxyz0123456789 .,').filter((c) => c !== ' ');
    msg = {
      ok: true,
      text:
        `Now practising on ${name}${format ? ` (${r.format})` : ''}: ${r.layout.entries.length} chords that type text.` +
        (format && r.skipped ? ` ${r.skipped} other chords (shortcuts, keys, mouse, or two buttons in a row) were left out.` : '') +
        (missing.length ? ` It has no chord for ${missing.join(' ')}.` : ''),
    };
  }

  function fail(e: unknown) {
    msg = { ok: false, text: e instanceof LayoutError ? e.message : 'That layout could not be read. Nothing was changed.' };
  }

  async function fetchFile(file: string): Promise<Uint8Array> {
    const res = await fetch(`${import.meta.env.BASE_URL}layouts/${file}`);
    if (!res.ok) throw new LayoutError('That layout could not be loaded. Check your connection and try again.');
    return new Uint8Array(await res.arrayBuffer());
  }

  /** The preset as a Twiddler 4 config, for the editor. */
  async function configOf(p: Preset): Promise<{ cfg: V7Config; note: string }> {
    if (p.id === 'short') return { cfg: shortThumbsConfig(), note: 'Built from the Twiddler default with the Short thumbs profile.' };
    if (p.id === 'default') {
      return { cfg: applyChanges(configFromLayout(DEFAULT_LAYOUT), ['nav']).cfg, note: "The Twiddler default's typing chords and navigation keys, with the Tuner's default settings and device functions. It has no F1 to F12 or Control chords." };
    }
    const r = importLayout(await fetchFile(p.file!), p.file!);
    return { cfg: configFromLayout(r.layout), note: `${p.name}'s typing chords, with the Tuner's default settings and device functions. Shortcuts and navigation keys aren't part of a typing layout, so they aren't included.` };
  }

  async function pick(p: Preset) {
    busy = p.id;
    try {
      if (p.id === 'default') {
        store.p.layout = null;
        msg = { ok: true, text: `Now practising on ${DEFAULT_NAME}.` };
      } else if (p.id === 'short') use(importLayout(writeV7(shortThumbsConfig()), 'short-thumbs.cfg'), p.name);
      else use(importLayout(await fetchFile(p.file!), p.file!), p.name);
    } catch (e) {
      fail(e);
    } finally {
      busy = '';
    }
  }

  async function edit(p: Preset) {
    busy = p.id;
    try {
      const { cfg, note } = await configOf(p);
      onedit(cfg, p.name.replace(/[^\w-]+/g, '-'), note);
    } catch (e) {
      fail(e);
    } finally {
      busy = '';
    }
  }

  async function loadFile(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = '';
    if (!f) return;
    try {
      const r = importLayout(new Uint8Array(await f.arrayBuffer()), f.name);
      use(r, r.layout.name, true);
    } catch (err) {
      fail(err);
    }
  }

  function loadPasted() {
    try {
      const r = importLayoutText(pasteText);
      use(r, r.layout.name, true);
      pasteText = '';
    } catch (err) {
      fail(err);
    }
  }

  function saveJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportLayoutJson(km.layout)], { type: 'application/json' }));
    a.download = `${km.layout.name.replace(/[^\w-]+/g, '-')}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
</script>

<section class="section">
  <h2 class="section-head">Layout</h2>
  <p class="section-intro">The layout lessons, drills and the Chords page use. Tap one to practise on it. Edit opens it in the config editor below, to change it or download it for the Twiddler.</p>
  <div class="group" role="radiogroup" aria-label="Layout">
    {#if own}
      <div class="row choice">
        <button class="pick" role="radio" aria-checked="true">
          <span class="row-main"><span class="row-title">{own}</span><span class="row-sub">Your own layout: {km.layout.entries.length} chords that type text.</span></span>
          <span class="tick"><Icon name="check" size={20} /></span>
        </button>
      </div>
    {/if}
    {#each PRESETS as p (p.id)}
      {@const on = p.name === current}
      <div class="row choice">
        <button class="pick" role="radio" aria-checked={on} disabled={busy !== ''} onclick={() => pick(p)}>
          <span class="row-main"><span class="row-title">{p.name}</span><span class="row-sub">{p.sub}</span></span>
          <span class="tick" class:on><Icon name="check" size={20} /></span>
        </button>
        <button class="btn compact" disabled={busy !== ''} onclick={() => edit(p)} aria-label={`Edit ${p.name}`}>Edit</button>
      </div>
    {/each}
  </div>
  {#if msg}<p class="notice" class:ok={msg.ok} class:bad={!msg.ok} role="status">{msg.text}</p>{/if}

  <div class="group more">
    <label class="row"><span class="row-main"><span class="row-title link">Load your own layout</span><span class="row-sub">A Twiddler config (.cfg, versions 4, 5 and 7), a CSV from the Tuner or the Typing Tutor's JSON.</span></span><input type="file" accept=".cfg,.csv,.json,.txt" class="visually-hidden" onchange={loadFile} /></label>
    <details class="row paste">
      <summary class="row-title link">Paste a layout</summary>
      <textarea class="area" rows="4" bind:value={pasteText} placeholder={'"Thumbs","Fingers","Actions"\n"","1R","[KB]a"'} aria-label="Layout as CSV or JSON"></textarea>
      <div class="btn-row"><button class="btn" disabled={!pasteText.trim()} onclick={loadPasted}>Load pasted layout</button></div>
    </details>
    <button class="row" onclick={saveJson}><span class="row-main row-title link">Save {km.layout.name} as JSON</span></button>
  </div>
  <p class="section-foot">Only chords that type text are used for practice. The lessons introduce letters in an order chosen for the default layout. TabSpace, MirrorWalk, DelEnt and TeaSan are config files from Griatch's twiddler-configs (BSD licence).</p>
</section>

<style>
  .section-intro {
    margin-bottom: var(--tw-space-2);
    color: var(--tw-label2);
  }

  .choice {
    gap: var(--tw-space-3);
  }

  .pick {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--tw-space-3);
    min-width: 0;
    min-height: var(--tw-tap);
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: left;
  }

  .tick {
    flex: none;
    color: var(--tw-accent);
    visibility: hidden;
  }

  .tick.on,
  .pick[aria-checked='true'] .tick {
    visibility: visible;
  }

  .more {
    margin-top: var(--tw-space-4);
  }

  .paste {
    display: block;
  }

  .paste[open] {
    padding-bottom: var(--tw-space-4);
  }

  .paste .area {
    margin-bottom: var(--tw-space-3);
  }

  .paste summary {
    display: flex;
    align-items: center;
    min-height: var(--tw-tap);
    cursor: pointer;
  }

  .link {
    color: var(--tw-accent);
  }

  label.row {
    cursor: pointer;
  }
</style>
