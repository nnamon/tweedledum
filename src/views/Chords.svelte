<script lang="ts">
  import Keypad from '../ui/Keypad.svelte';
  import { formatChord, type Chord } from '../lib/chords/chord';
  import { keymap, store } from '../lib/state/app.svelte';
  import { keyChar } from '../lib/train/run';
  import { BURST_MS } from '../lib/train/drill';
  import { addChar, addKey, keyLabel, pressesOf, type Burst, type Press } from '../lib/chords/presses';
  import { charName, sayChar, sayText } from '../lib/audio/voice';

  const km = $derived(keymap());
  const settings = $derived(store.p.settings);

  /** What was pressed on the Twiddler, oldest first. */
  let bursts = $state<Burst[]>([]);
  let nextId = 0;
  /** A chord picked from the lists, shown instead of the last press until the next key. */
  let picked = $state<Press | null>(null);
  let say = $state(false);
  let settle: ReturnType<typeof setTimeout> | null = null;

  const presses = $derived(bursts.flatMap((b) => pressesOf(km, b)));
  const history = $derived(presses.slice(-12).reverse());
  const shown = $derived(picked ?? presses[presses.length - 1] ?? null);

  const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'NumLock', 'Fn', 'FnLock', 'Hyper', 'Super', 'OS']);

  function onKey(e: KeyboardEvent) {
    // Typing into a field is not a Twiddler press. Buttons and switches don't count as fields, so
    // tapping a chord in the list doesn't stop the page from listening.
    const t = e.target;
    if (t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type !== 'checkbox')) return;
    if (MODIFIERS.has(e.key)) return;
    const now = performance.now();
    const ch = e.key === 'Enter' ? null : keyChar(e.key);
    const mods = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.metaKey && 'Cmd'].filter(Boolean).join('+');
    if (ch !== null && !mods) {
      e.preventDefault();
      bursts = addChar(bursts, ch, now, nextId++);
    } else {
      const label = keyLabel(e.key) ?? (mods && ch ? ch.toUpperCase() : null);
      if (!label) return;
      if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
      bursts = addKey(bursts, mods ? `${mods}+${label}` : label, now, nextId++);
    }
    if (bursts.length > 40) bursts = bursts.slice(-40);
    picked = null;
    if (settle) clearTimeout(settle);
    settle = setTimeout(speak, BURST_MS + 20);
  }

  /** Says what the last burst typed once it has all arrived. */
  function speak() {
    const last = bursts[bursts.length - 1];
    if (!say || !last || last.key !== undefined) return;
    const o = { rate: settings.voiceRate, voiceName: settings.voiceName };
    void (last.text.length === 1 ? sayChar(last.text, o) : sayText(last.text, o));
  }

  function clearHistory() {
    bursts = [];
    picked = null;
  }

  const hasBarre = $derived(km.layout.entries.some((e) => e.chord.rows.includes('B')));

  const groups = $derived.by(() => {
    const singles = km.layout.entries.filter((e) => e.output.length === 1);
    const letters = singles.filter((e) => /[a-z]/.test(e.output)).sort((a, b) => a.output.localeCompare(b.output));
    const digits = singles.filter((e) => /[0-9]/.test(e.output)).sort((a, b) => a.output.localeCompare(b.output));
    const other = singles.filter((e) => !/[a-z0-9]/.test(e.output));
    const multi = km.layout.entries.filter((e) => e.output.length > 1).sort((a, b) => byText(a.output, b.output));
    const isWord = (t: string) => /^[A-Za-z']+ ?$/.test(t);
    const words = multi.filter((e) => isWord(e.output));
    const strings = multi.filter((e) => !isWord(e.output));
    return [
      { head: 'Letters', items: letters, foot: 'Capitals: hold SHIFT with the letter chord.' },
      { head: 'Digits', items: digits, foot: '' },
      { head: 'Space and punctuation', items: other, foot: '' },
      { head: 'Words and word parts', items: words, foot: strings.length ? '' : 'One chord types the whole string, spaces included. ␣ marks a space.' },
      { head: 'Other multi-character chords', items: strings, foot: 'One chord types the whole string, spaces included. ␣ marks a space.' },
    ].filter((g) => g.items.length);
  });

  /** Alphabetical, ignoring leading spaces and case, with "the " just before "The ". */
  function byText(a: string, b: string): number {
    return a.trimStart().localeCompare(b.trimStart(), 'en', { sensitivity: 'base' }) || (a < b ? 1 : a > b ? -1 : 0);
  }

  /** The text split at spaces, so each space can be drawn as a faint ␣. */
  function parts(s: string): { text: string; space: boolean }[] {
    if (s === ' ') return [{ text: 'space', space: false }];
    return s.split(/( )/).filter(Boolean).map((t) => ({ text: t === ' ' ? '␣' : t, space: t === ' ' }));
  }

  /** Where a multi-character chord's spaces fall, so you know whether to press space yourself. */
  function spaceNote(s: string): string {
    const before = s.startsWith(' ');
    const after = s.endsWith(' ');
    if (before && after) return 'With a space before and after';
    if (after) return 'Ends with a space';
    if (before) return 'Starts with a space';
    return 'No space after';
  }
</script>

<svelte:window onkeydown={onKey} />

{#snippet text(s: string)}{#each parts(s) as p, i (i)}{#if p.space}<span class="sp" aria-label="space">{p.text}</span>{:else}{p.text}{/if}{/each}{/snippet}

<div class="screen wide">
  <h1 class="large-title">Chords</h1>
  <p class="lede">{km.layout.name}, {km.layout.entries.length} chords that type text. Press a key on your Twiddler to see its chord, or pick one below.</p>
  {#if hasBarre}<p class="lede">{settings.notation === 't4' ? 'F1B' : 'B'} is a barre: all three buttons of a row held with one finger.</p>{/if}

  <div class="layout">
    <div class="pad-col">
      <div class="explore group" aria-live="polite">
        {#if shown}
          <span class="out mono" class:multi={shown.text.length > 1}>{#if shown.key}{shown.text}{:else}{@render text(shown.text)}{/if}</span>
          <span class="desc">
            {#if shown.key}Key{:else if shown.text.length > 1}{spaceNote(shown.text)}{:else if charName(shown.text) !== shown.text}{charName(shown.text)}{/if}
            {#if shown.chord}
              <span class="mono chord">{formatChord(shown.chord, settings.notation)}</span>
            {:else}
              <span>{shown.key ? 'No chord for this key in the layout in use.' : 'The layout in use has no chord for this.'}</span>
            {/if}
          </span>
        {:else}
          <span class="desc">Waiting for a key.</span>
        {/if}
      </div>
      <Keypad {km} chord={shown?.chord ?? null} view={settings.view} hand={settings.hand} notation={settings.notation} />
      {#if history.length}
        <section class="pressed" aria-label="Pressed">
          <div class="pressed-head"><h2 class="section-head">Pressed, newest first</h2><button class="text-button" onclick={clearHistory}>Clear</button></div>
          <div class="group">
            {#each history as p, i (p.id)}
              <button class="row press" class:latest={picked ? picked.id === p.id : i === 0} onclick={() => (picked = p)}>
                <span class="row-main mono p-out">{#if p.key}{p.text}{:else}{@render text(p.text)}{/if}</span>
                <span class="mono p-chord">{p.chord ? formatChord(p.chord, settings.notation) : 'no chord'}</span>
              </button>
            {/each}
          </div>
        </section>
      {/if}
      <label class="row say"><span class="row-main row-title">Say keys aloud</span><input type="checkbox" role="switch" class="switch" bind:checked={say} /></label>
    </div>

    <div class="lists">
      {#each groups as g (g.head)}
        <section class="list-section">
          <h2 class="section-head">{g.head}</h2>
          <div class="chips">
            {#each g.items as e (e.output + formatChord(e.chord, 'classic'))}
              <button
                class="chip"
                class:on={picked?.text === e.output && !picked.key}
                onclick={() => (picked = { id: 'pick', text: e.output, chord: e.chord })}
              >
                <span class="c-out mono">{@render text(e.output)}</span>
                <span class="c-chord mono">{formatChord(e.chord, settings.notation)}</span>
              </button>
            {/each}
          </div>
          {#if g.foot}<p class="section-foot">{g.foot}</p>{/if}
        </section>
      {/each}
    </div>
  </div>
</div>

<style>
  .layout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tw-space-6);
    padding: var(--tw-space-4);
  }

  .pad-col {
    display: flex;
    flex: 0 1 280px;
    flex-direction: column;
    align-items: center;
    gap: var(--tw-space-3);
    margin: 0 auto;
  }

  .explore {
    display: flex;
    align-items: center;
    gap: var(--tw-space-3);
    width: 100%;
    min-height: 72px;
    padding: var(--tw-space-3) var(--tw-space-4);
  }

  .out {
    min-width: 0;
    font-size: var(--tw-text-large-title);
    font-weight: var(--tw-weight-bold);
    overflow-wrap: anywhere;
  }

  .out.multi {
    font-size: var(--tw-text-title);
  }

  .sp {
    font-weight: var(--tw-weight-regular);
    color: var(--tw-label3);
  }

  .chip.on .sp {
    color: var(--tw-on-fill);
    opacity: 0.6;
  }

  .desc {
    display: flex;
    flex-direction: column;
    font-size: var(--tw-text-sub);
    color: var(--tw-label2);
  }

  .chord {
    font-size: var(--tw-text-body);
    color: var(--tw-label);
  }

  .pressed {
    width: 100%;
  }

  .pressed-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: var(--tw-space-2);
  }

  .pressed-head .section-head {
    padding-bottom: 0;
  }

  .press {
    min-height: var(--tw-tap);
  }

  .press.latest {
    background: var(--tw-accent-fill);
    color: var(--tw-on-fill);
  }

  .press.latest .p-chord,
  .press.latest .sp {
    color: var(--tw-on-fill);
  }

  .p-out {
    min-width: 0;
    font-weight: var(--tw-weight-semibold);
    overflow-wrap: anywhere;
  }

  .p-chord {
    flex: none;
    font-size: var(--tw-text-sub);
    color: var(--tw-label2);
  }

  .say {
    border-radius: var(--tw-radius-xl);
    background: var(--tw-surface);
  }

  .lists {
    flex: 1 1 360px;
    min-width: 0;
  }

  .list-section + .list-section {
    margin-top: var(--tw-space-5);
  }

  .chips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: var(--tw-space-1-5);
  }

  .chip {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: var(--tw-space-1-5) var(--tw-space-2);
    border-radius: var(--tw-radius-m);
    background: var(--tw-surface);
    text-align: left;
  }

  .chip:hover {
    background: var(--tw-surface-2);
  }

  .chip.on {
    background: var(--tw-accent-fill);
    color: var(--tw-on-fill);
  }

  .c-out {
    max-width: 100%;
    overflow-wrap: anywhere;
    font-size: var(--tw-text-body);
    font-weight: var(--tw-weight-semibold);
  }

  .c-chord {
    font-size: var(--tw-text-caption);
    color: var(--tw-label2);
  }

  .chip.on .c-chord {
    color: var(--tw-on-fill);
  }
</style>
