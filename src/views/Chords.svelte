<script lang="ts">
  import Keypad from '../ui/Keypad.svelte';
  import { formatChord, type Chord } from '../lib/chords/chord';
  import { keymap, store } from '../lib/state/app.svelte';
  import { keyChar } from '../lib/train/run';
  import { charName, sayChar } from '../lib/audio/voice';

  const km = $derived(keymap());
  const settings = $derived(store.p.settings);

  let selected = $state<{ out: string; chord: Chord | null; pressed: boolean } | null>(null);
  let say = $state(false);

  function onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button')) {
      if (e.key !== ' ') return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const ch = keyChar(e.key);
    if (ch === null) return;
    e.preventDefault();
    selected = { out: ch, chord: km.chordFor(ch), pressed: true };
    if (say) void sayChar(ch, { rate: settings.voiceRate, voiceName: settings.voiceName });
  }

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

  <div class="layout">
    <div class="pad-col">
      <div class="explore group" aria-live="polite">
        {#if selected}
          <span class="out mono" class:multi={selected.out.length > 1}>{@render text(selected.out)}</span>
          <span class="desc">
            {#if selected.out.length > 1}{spaceNote(selected.out)}{:else if charName(selected.out) !== selected.out}{charName(selected.out)}{/if}
            {#if selected.chord}
              <span class="mono chord">{formatChord(selected.chord, settings.notation)}</span>
            {:else}
              <span>The layout in use has no chord for this.</span>
            {/if}
          </span>
        {:else}
          <span class="desc">Waiting for a key.</span>
        {/if}
      </div>
      <Keypad {km} chord={selected?.chord ?? null} view={settings.view} hand={settings.hand} notation={settings.notation} />
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
                class:on={selected?.out === e.output && !selected.pressed}
                onclick={() => (selected = { out: e.output, chord: e.chord, pressed: false })}
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
