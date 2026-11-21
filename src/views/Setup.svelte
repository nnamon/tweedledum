<script lang="ts">
  import Icon from '../ui/Icon.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import { store } from '../lib/state/app.svelte';
  import { start } from '../lib/state/current.svelte';
  import { back } from '../lib/app/router.svelte';
  import { EXERCISES, learnedChars, type Exercise } from '../lib/train/exercise';
  import { keysetOf, wordsWithin } from '../lib/train/text';
  import { speechAvailable } from '../lib/audio/voice';

  let { kind }: { kind: Exercise['kind'] } = $props();
  const info = $derived(EXERCISES[kind]);
  const o = $derived(store.p.options);
  const learned = $derived(learnedChars(store.p));

  const SETS = $derived([
    { label: 'a to z', value: 'abcdefghijklmnopqrstuvwxyz' },
    { label: 'Met in lessons', value: learned.replace(/[^a-z0-9]/g, '') },
    { label: 'Digits', value: '0123456789' },
    { label: 'Punctuation', value: ".,;:'\"!?-" },
  ]);

  const learnedWords = $derived(wordsWithin(learned).length);
</script>

<div class="screen">
  <div class="nav"><button class="text-button" onclick={() => back(['practice'])}><Icon name="back" size={20} /> Practice</button></div>
  <h1 class="large-title">{info.title}</h1>
  <p class="lede">{info.blurb}</p>

  {#if kind === 'random'}
    <section class="section">
      <h2 class="section-head">Groups</h2>
      <div class="group">
        <label class="row"><span class="row-main row-title">Characters in a group</span>
          <select class="row-field" bind:value={o.random.len}>{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as n (n)}<option value={n}>{n}</option>{/each}</select>
        </label>
        <label class="row"><span class="row-main row-title">Groups</span>
          <select class="row-field" bind:value={o.random.groups}>{#each [5, 10, 15, 20, 30] as n (n)}<option value={n}>{n}</option>{/each}</select>
        </label>
        <label class="row"><span class="row-main row-title">Capitals</span><input type="checkbox" role="switch" class="switch" bind:checked={o.random.caps} /></label>
        <label class="row"><span class="row-main row-title">Digits</span><input type="checkbox" role="switch" class="switch" bind:checked={o.random.numbers} /></label>
        <label class="row"><span class="row-main row-title">Punctuation</span><input type="checkbox" role="switch" class="switch" bind:checked={o.random.punct} /></label>
      </div>
      <p class="section-foot">Punctuation adds <span class="mono">, : ! . ? - ( ) [ ] _</span>, as the tutor's text generator does.</p>
    </section>
  {:else if kind === 'custom'}
    <section class="section">
      <h2 class="section-head">Text to type</h2>
      <textarea class="area" rows="8" bind:value={o.custom.text} placeholder="Paste or write the text here." aria-label="Text to type"></textarea>
      <p class="section-foot">Line breaks become spaces. Keys: <span class="mono">{keysetOf(o.custom.text) || 'none yet'}</span></p>
    </section>
  {:else if kind === 'weak'}
    <section class="section">
      <h2 class="section-head">Length</h2>
      <Segmented label="Length" bind:value={o.weak.length} options={[{ value: 40, label: 'Short' }, { value: 80, label: 'Medium' }, { value: 160, label: 'Long' }]} />
      <p class="section-foot">The drill picks the letters you miss most and type slowest, from every run so far. With fewer than four letters practised, it uses a to h.</p>
    </section>
  {:else if kind === 'timed'}
    <section class="section">
      <h2 class="section-head">Time</h2>
      <Segmented label="Time" bind:value={o.timed.seconds} options={[{ value: 30, label: '30 s' }, { value: 60, label: '1 min' }, { value: 120, label: '2 min' }, { value: 300, label: '5 min' }]} />
    </section>
    <section class="section">
      <h2 class="section-head">Words</h2>
      <Segmented label="Words" bind:value={o.timed.source} options={[{ value: 'common', label: 'All common words' }, { value: 'learned', label: 'Letters met so far' }]} />
      <p class="section-foot">{learnedWords} common words use only the letters met up to lesson {store.p.lesson}.</p>
    </section>
  {:else if kind === 'dictLetters' || kind === 'quiz'}
    {@const opt = kind === 'quiz' ? o.quiz : o.dictLetters}
    <section class="section">
      <h2 class="section-head">Characters</h2>
      <div class="btn-row">
        {#each SETS as s (s.label)}
          <button class="btn compact" class:tint={opt.set === s.value} onclick={() => (opt.set = s.value)}>{s.label}</button>
        {/each}
      </div>
      <div class="group field">
        <label class="row"><span class="row-title">Use</span><input class="row-field mono" bind:value={opt.set} aria-label="Characters to use" /></label>
      </div>
      <p class="section-foot">Type or edit the characters to use. Keys: <span class="mono">{keysetOf(opt.set) || 'none'}</span></p>
    </section>
    {#if kind === 'dictLetters'}
      <section class="section">
        <h2 class="section-head">Groups</h2>
        <div class="group">
          <label class="row"><span class="row-main row-title">Characters in a group</span>
            <select class="row-field" bind:value={o.dictLetters.group}>{#each [1, 2, 3, 4, 5, 6] as n (n)}<option value={n}>{n}</option>{/each}</select>
          </label>
          <label class="row"><span class="row-main row-title">Groups</span>
            <select class="row-field" bind:value={o.dictLetters.groups}>{#each [5, 10, 20, 30] as n (n)}<option value={n}>{n}</option>{/each}</select>
          </label>
        </div>
        <p class="section-foot">Each group is read out letter by letter. Type it, then a space; the next group follows. Press Tab to hear a group again. A character shows after three misses on it.</p>
      </section>
    {:else}
      <section class="section">
        <h2 class="section-head">Questions</h2>
        <Segmented label="Questions" bind:value={o.quiz.count} options={[{ value: 10, label: '10' }, { value: 26, label: '26' }, { value: 50, label: '50' }]} />
        <p class="section-foot">The keypad shows a chord with its labels hidden. Type the character it makes.</p>
      </section>
    {/if}
  {:else if kind === 'dictWords'}
    <section class="section">
      <h2 class="section-head">Words</h2>
      <Segmented label="Words" bind:value={o.dictWords.source} options={[{ value: 'common', label: 'All common words' }, { value: 'learned', label: 'Letters met so far' }]} />
      <p class="section-foot">{learnedWords} common words use only the letters met up to lesson {store.p.lesson}.</p>
    </section>
    <section class="section">
      <h2 class="section-head">How many</h2>
      <Segmented label="How many" bind:value={o.dictWords.count} options={[{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 40, label: '40' }]} />
      <p class="section-foot">Each word is read out. Type it, then a space. Press Tab to hear it again. A character shows after three misses on it.</p>
    </section>
    {#if !speechAvailable()}
      <p class="notice bad">This browser has no speech voice, so words cannot be read out. Letter dictation still works: it uses recorded clips.</p>
    {/if}
  {/if}

  <div class="section start">
    <button class="btn primary wide" onclick={() => start({ kind } as Exercise)}><Icon name="play" size={18} filled /> Start</button>
  </div>
</div>

<style>
  .nav {
    padding: 0 var(--tw-space-2);
  }

  .nav .text-button {
    gap: var(--tw-space-1);
  }

  .field {
    margin-top: var(--tw-space-3);
  }

  .field .row-field {
    text-align: left;
  }

  .start {
    display: flex;
    justify-content: center;
  }

  .wide {
    min-width: 220px;
  }
</style>
