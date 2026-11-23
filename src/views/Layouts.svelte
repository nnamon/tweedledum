<script lang="ts">
  // The layout list at the top of the Tuner. Picking a row makes it the config file and the
  // practice layout at once; the Tuner does the work.
  import Icon from '../ui/Icon.svelte';
  import { PRESETS, type Preset } from '../lib/chords/presets';

  let {
    current,
    edited,
    busy,
    chords,
    onpick,
  }: {
    current: string;
    edited: boolean;
    busy: boolean;
    chords: number;
    onpick: (p: Preset) => void;
  } = $props();

  const own = $derived(PRESETS.some((p) => p.name === current) ? null : current);
</script>

<section class="section">
  <h2 class="section-head">Layout</h2>
  <div class="group" role="radiogroup" aria-label="Layout">
    {#if own}
      <button class="row" role="radio" aria-checked="true">
        <span class="row-main"><span class="row-title">{own}</span><span class="row-sub">Your file, {chords} chords{edited ? ', edited' : ''}</span></span>
        <span class="tick"><Icon name="check" size={20} /></span>
      </button>
    {/if}
    {#each PRESETS as p (p.id)}
      {@const on = p.name === current}
      <button class="row" role="radio" aria-checked={on} disabled={busy} onclick={() => !on && onpick(p)}>
        <span class="row-main"><span class="row-title">{p.name}</span><span class="row-sub">{p.sub}{on && edited ? ', edited' : ''}</span></span>
        <span class="tick" class:on><Icon name="check" size={20} /></span>
      </button>
    {/each}
  </div>
  <p class="section-foot">The ticked layout is the config file below and the one lessons, drills and the Chords page use. TabSpace, MirrorWalk, DelEnt and TeaSan come from Griatch's twiddler-configs (BSD licence).</p>
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
</style>
