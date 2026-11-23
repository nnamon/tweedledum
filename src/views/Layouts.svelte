<script lang="ts">
  // The layout lessons, drills and the Chords page use.
  import Icon from '../ui/Icon.svelte';
  import { keymap, store } from '../lib/state/app.svelte';
  import { exportLayoutJson, importLayout, importLayoutText, LayoutError, type ImportResult } from '../lib/chords/import';
  import { chordText } from '../lib/chords/chord';
  import type { Layout } from '../lib/chords/layout';
  import { DEFAULT_NAME, PRESETS, presetLayout, type Preset } from '../lib/chords/presets';

  const km = $derived(keymap());
  const current = $derived(store.p.layout?.name ?? DEFAULT_NAME);
  const own = $derived(PRESETS.some((p) => p.name === current) ? null : current);

  let msg = $state<{ ok: boolean; text: string } | null>(null);
  let pasteText = $state('');
  let busy = $state(false);

  function save(layout: Layout, name: string) {
    store.p.layout = {
      name,
      entries: layout.entries.map((e) => [chordText(e.chord), e.output]),
      keys: (layout.keys ?? []).map((k) => [chordText(k.chord), k.name]),
    };
  }

  /** A file of the user's own: say what was read, since nothing else on screen does. */
  function useOwn(r: ImportResult) {
    save(r.layout, r.layout.name);
    const missing = keymap().missing('abcdefghijklmnopqrstuvwxyz0123456789 .,').filter((c) => c !== ' ');
    msg = {
      ok: true,
      text:
        `Now practising on ${r.layout.name} (${r.format}): ${r.layout.entries.length} chords that type text.` +
        (r.skipped ? ` ${r.skipped} other chords (shortcuts, keys, mouse, or two buttons in a row) were left out.` : '') +
        (missing.length ? ` It has no chord for ${missing.join(' ')}.` : ''),
    };
  }

  function fail(e: unknown) {
    msg = { ok: false, text: e instanceof LayoutError ? e.message : 'That layout could not be read. Nothing was changed.' };
  }

  async function pick(p: Preset) {
    busy = true;
    msg = null;
    try {
      if (p.name === DEFAULT_NAME) store.p.layout = null;
      else save(await presetLayout(p), p.name);
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
    }
  }

  async function loadFile(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = '';
    if (!f) return;
    try {
      useOwn(importLayout(new Uint8Array(await f.arrayBuffer()), f.name));
    } catch (err) {
      fail(err);
    }
  }

  function loadPasted() {
    try {
      useOwn(importLayoutText(pasteText));
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
  <h2 class="section-head">Practice layout</h2>
  <div class="group" role="radiogroup" aria-label="Practice layout">
    {#if own}
      <button class="row" role="radio" aria-checked="true">
        <span class="row-main"><span class="row-title">{own}</span><span class="row-sub">Your file, {km.layout.entries.length} chords</span></span>
        <span class="tick"><Icon name="check" size={20} /></span>
      </button>
    {/if}
    {#each PRESETS as p (p.id)}
      {@const on = p.name === current}
      <button class="row" role="radio" aria-checked={on} disabled={busy} onclick={() => pick(p)}>
        <span class="row-main"><span class="row-title">{p.name}</span><span class="row-sub">{p.sub}</span></span>
        <span class="tick" class:on><Icon name="check" size={20} /></span>
      </button>
    {/each}
  </div>
  <p class="section-foot">Lessons, drills and the Chords page use this layout, and only its chords that type text. TabSpace, MirrorWalk, DelEnt and TeaSan come from Griatch's twiddler-configs (BSD licence).</p>
  {#if msg}<p class="notice" class:ok={msg.ok} class:bad={!msg.ok} role="status">{msg.text}</p>{/if}

  <div class="group more">
    <label class="row"><span class="row-main"><span class="row-title link">Load a layout file</span><span class="row-sub">.cfg for the Twiddler 2, 3 or 4, a Tuner CSV or Typing Tutor JSON</span></span><input type="file" accept=".cfg,.csv,.json,.txt" class="visually-hidden" onchange={loadFile} /></label>
    <details class="row paste">
      <summary class="row-title link">Paste a layout</summary>
      <textarea class="area" rows="4" bind:value={pasteText} placeholder={'"Thumbs","Fingers","Actions"\n"","1R","[KB]a"'} aria-label="Layout as CSV or JSON"></textarea>
      <div class="btn-row"><button class="btn" disabled={!pasteText.trim()} onclick={loadPasted}>Load pasted layout</button></div>
    </details>
    <button class="row" onclick={saveJson}><span class="row-main row-title link">Save {km.layout.name} as JSON</span></button>
  </div>
</section>

<style>
  .tick {
    flex: none;
    color: var(--tw-accent);
    visibility: hidden;
  }

  .tick.on,
  .row[aria-checked='true'] .tick {
    visibility: visible;
  }

  .more {
    margin-top: var(--tw-space-6);
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
