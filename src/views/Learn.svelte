<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '../ui/Icon.svelte';
  import Keypad from '../ui/Keypad.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import { back } from '../lib/app/router.svelte';
  import { formatChord } from '../lib/chords/chord';
  import { keymap, store } from '../lib/state/app.svelte';
  import { keyChar } from '../lib/train/run';
  import { DRILL_GROUPS, TOP_BOX, buildSession, cardsFor, grade, isBurst, learntCount, type Answer, type Card, type DrillGroup } from '../lib/train/drill';

  /** Without a miss, the chord shows after this long. */
  const HINT_AFTER_MS = 3000;

  const km = $derived(keymap());
  const settings = $derived(store.p.settings);
  let group = $state<DrillGroup>('words');
  const cards = $derived(cardsFor(km, group));

  let phase = $state<'pick' | 'card' | 'done'>('pick');
  let queue = $state<Card[]>([]);
  let at = $state(0);
  let typed = $state<number[]>([]);
  let hinted = $state(false);
  let missed = $state(false);
  let feedback = $state<{ text: string; ok: boolean } | null>(null);
  let tally = $state({ chord: 0, hinted: 0, letters: 0, miss: 0 });
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let input: HTMLInputElement | undefined = $state();

  const card = $derived(queue[at]);
  const shown = (s: string) => s.replace(/ /g, '␣');

  function start() {
    queue = buildSession(cards, store.p.chords);
    if (queue.length === 0) return;
    at = 0;
    tally = { chord: 0, hinted: 0, letters: 0, miss: 0 };
    feedback = null;
    phase = 'card';
    beginCard();
  }

  function beginCard() {
    typed = [];
    missed = false;
    clearTimeout(hintTimer);
    // A chord seen for the first time shows straight away.
    hinted = !store.p.chords[queue[at].id];
    if (!hinted) hintTimer = setTimeout(() => (hinted = true), HINT_AFTER_MS);
    queueMicrotask(() => input?.focus());
  }

  function record(answer: Answer) {
    const c = queue[at];
    store.p.chords[c.id] = grade(store.p.chords[c.id], answer, Date.now());
  }

  function press(ch: string, t: number) {
    if (phase !== 'card' || !card) return;
    const want = card.output[typed.length];
    if (ch !== want) {
      if (!missed) {
        record('miss');
        tally.miss++;
        // Seen again later in the session.
        queue.splice(Math.min(queue.length, at + 4), 0, card);
      }
      missed = true;
      hinted = true;
      typed = [];
      feedback = { text: `You typed ${ch === ' ' ? 'space' : ch}. The chord for ${shown(card.output)} is ${formatChord(card.chord, settings.notation)}.`, ok: false };
      return;
    }
    typed = [...typed, t];
    if (typed.length < card.output.length) return;

    let answer: Answer = hinted ? 'hinted' : 'chord';
    if (card.output.length > 1 && !isBurst(typed)) answer = 'letters';
    if (!missed) {
      record(answer);
      tally[answer]++;
    }
    const what = shown(card.output);
    if (missed) feedback = { text: `${what}: right. It comes back later.`, ok: true };
    else if (answer === 'letters') {
      feedback = { text: `${what} was typed letter by letter. It has one chord: ${formatChord(card.chord, settings.notation)}. It comes back later.`, ok: false };
      queue.splice(Math.min(queue.length, at + 4), 0, card);
    } else feedback = { text: answer === 'chord' ? `${what}: right.` : `${what}: right, with the chord shown.`, ok: true };
    next();
  }

  function next() {
    if (at + 1 >= queue.length) {
      clearTimeout(hintTimer);
      phase = 'done';
      return;
    }
    at++;
    beginCard();
  }

  function onKey(e: KeyboardEvent) {
    if (phase !== 'card') return;
    if (e.metaKey || e.ctrlKey) return;
    if (e.key === 'Escape') {
      stop();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      hinted = true;
      return;
    }
    const ch = keyChar(e.key);
    if (ch === null) return;
    e.preventDefault();
    press(ch, performance.now());
  }

  // Keyboards on some phones send key "Unidentified": read the typed text from the field instead.
  function onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const t = performance.now();
    for (const ch of el.value) press(ch, t);
    el.value = '';
  }

  function stop() {
    clearTimeout(hintTimer);
    phase = tally.chord + tally.hinted + tally.letters + tally.miss > 0 ? 'done' : 'pick';
  }

  onMount(() => {
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      clearTimeout(hintTimer);
    };
  });

  function dots(box: number): string {
    return '●'.repeat(box) + '○'.repeat(TOP_BOX - box);
  }
</script>

<div class="learn">
  <header class="bar">
    <button class="text-button" onclick={() => (phase === 'card' ? stop() : back())}><Icon name="back" size={20} /> {phase === 'card' ? 'Stop' : 'Back'}</button>
    <h1>Learn chords</h1>
    <span class="count">{phase === 'card' ? `${at + 1} of ${queue.length}` : ''}</span>
  </header>

  {#if phase === 'pick'}
    <p class="lede">
      Type each chord you're shown. A chord you type right without the keypad moves up a box, and a miss sends it back to the start. Word chords only count when the whole word comes in one chord.
    </p>
    <section class="section">
      <Segmented label="Chords to learn" options={DRILL_GROUPS.map((g) => ({ value: g.id, label: g.label }))} bind:value={group} />
    </section>
    {#if cards.length === 0}
      <p class="notice warn">The layout in use has no chords in this group.</p>
    {:else}
      <section class="section">
        <div class="btn-row"><button class="btn primary" onclick={start}>Start</button></div>
        <p class="section-foot">{learntCount(cards, store.p.chords)} of {cards.length} learnt (box 3 or higher).</p>
      </section>
      <section class="section">
        <div class="group grid">
          {#each cards as c (c.id)}
            {@const rec = store.p.chords[c.id]}
            <div class="cell">
              <span class="mono out">{shown(c.output)}</span>
              <span class="mono chord">{formatChord(c.chord, settings.notation)}</span>
              <span class="dots" class:new={!rec} aria-label={rec ? `Box ${rec.box} of ${TOP_BOX}` : 'Not met yet'}>{rec ? dots(rec.box) : 'new'}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {:else if phase === 'card' && card}
    <section class="prompt" aria-live="polite">
      <p class="target mono">
        {#each [...card.output] as ch, i (i)}<span class:done={i < typed.length}>{ch === ' ' ? '␣' : ch}</span>{/each}
      </p>
      {#if hinted}
        <p class="hint mono">{formatChord(card.chord, settings.notation)}</p>
      {:else}
        <p class="hint muted">Press Tab to see the chord.</p>
      {/if}
      {#if feedback}<p class="feedback" class:bad={!feedback.ok}>{feedback.text}</p>{/if}
    </section>
    <input bind:this={input} class="catcher" inputmode="none" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Typing area: type with your Twiddler" oninput={onInput} />
    <section class="pad">
      <Keypad {km} chord={hinted ? card.chord : null} view={settings.view} hand={settings.hand} notation={settings.notation} />
    </section>
  {:else if phase === 'done'}
    <section class="section">
      <div class="group summary">
        <h2>Session finished</h2>
        <ul>
          <li>Typed with the chord: {tally.chord}</li>
          <li>With the chord shown: {tally.hinted}</li>
          {#if group === 'words'}<li>Letter by letter: {tally.letters}</li>{/if}
          <li>Missed: {tally.miss}</li>
          <li>Learnt: {learntCount(cards, store.p.chords)} of {cards.length}</li>
        </ul>
        <div class="btn-row">
          <button class="btn primary" onclick={start}>Another session</button>
          <button class="btn" onclick={() => (phase = 'pick')}>Choose chords</button>
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .learn {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-3);
    max-width: var(--tw-reading);
    min-height: 100%;
    margin: 0 auto;
    padding: var(--tw-space-2) var(--tw-space-4) var(--tw-space-8);
  }

  .bar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--tw-space-2);
  }

  .bar .text-button {
    gap: var(--tw-space-1);
    justify-self: start;
  }

  h1 {
    font-size: var(--tw-text-body);
    font-weight: var(--tw-weight-semibold);
  }

  .count {
    justify-self: end;
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--tw-tap) * 2), 1fr));
  }

  .cell {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-half);
    padding: var(--tw-space-2) var(--tw-space-3);
    box-shadow: inset calc(-1 * var(--tw-hairline)) calc(-1 * var(--tw-hairline)) 0 var(--tw-sep);
  }

  .out {
    font-size: var(--tw-text-body);
    font-weight: var(--tw-weight-semibold);
  }

  .chord {
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .dots {
    font-size: var(--tw-text-caption);
    letter-spacing: var(--tw-space-half);
    color: var(--tw-accent);
  }

  .dots.new {
    letter-spacing: normal;
    color: var(--tw-label3);
  }

  .prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--tw-space-2);
    padding: var(--tw-space-6) 0 var(--tw-space-2);
    text-align: center;
  }

  .target {
    font-size: var(--tw-text-hero);
    font-weight: var(--tw-weight-semibold);
    line-height: 1;
  }

  .target .done {
    color: var(--tw-ok);
  }

  .hint {
    font-size: var(--tw-text-title);
    color: var(--tw-accent);
  }

  .hint.muted {
    font-size: var(--tw-text-sub);
    color: var(--tw-label2);
  }

  .feedback {
    font-size: var(--tw-text-sub);
    color: var(--tw-ok);
  }

  .feedback.bad {
    color: var(--tw-bad);
  }

  .catcher {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .pad {
    display: flex;
    justify-content: center;
  }

  .summary {
    padding: var(--tw-space-4);
  }

  .summary h2 {
    font-size: var(--tw-text-title-s);
    font-weight: var(--tw-weight-semibold);
  }

  .summary ul {
    margin: var(--tw-space-3) 0;
    padding-left: var(--tw-space-5);
  }
</style>
