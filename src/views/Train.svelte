<script lang="ts">
  import { pct } from '../lib/util/format';
  import { onMount } from 'svelte';
  import Icon from '../ui/Icon.svelte';
  import Keypad from '../ui/Keypad.svelte';
  import Stars from '../ui/Stars.svelte';
  import { formatChord, type Chord } from '../lib/chords/chord';
  import { keymap, store } from '../lib/state/app.svelte';
  import { current } from '../lib/state/current.svelte';
  import { back, go } from '../lib/app/router.svelte';
  import { EXERCISES, nextLesson, planFor, type Plan } from '../lib/train/exercise';
  import { Run, accuracyStars, keyChar, speedStars } from '../lib/train/run';
  import { dayKey, recordRun, type RunRec } from '../lib/state/profile';
  import { charName, sayChar, sayChars, sayText, stopVoice } from '../lib/audio/voice';
  import { missTone } from '../lib/audio/tone';

  const settings = $derived(store.p.settings);
  const km = $derived(keymap());
  const voice = $derived({ rate: settings.voiceRate, voiceName: settings.voiceName });

  let plan = $state<Plan | null>(null);
  let error = $state<string | null>(null);
  let run = $state.raw<Run>(new Run(''));
  /** Bumped after every key, so the screen reads the run again. */
  let version = $state(0);
  let now = $state(performance.now());
  let lastHitAt = $state(performance.now());
  let missFlash = $state(false);
  let summary = $state<null | {
    rec: RunRec;
    stars: [number, number];
    bestLesson: boolean;
    bestToday: boolean;
    misses: { ch: string; n: number }[];
    timeUp: boolean;
  }>(null);
  let summaryAt = 0;
  let input: HTMLInputElement | undefined = $state();

  function newPlan() {
    const ex = current.ex;
    if (!ex) {
      go('practice');
      return;
    }
    const p = planFor(ex, store.p, keymap());
    if ('error' in p) {
      error = p.error;
      plan = null;
      return;
    }
    error = null;
    plan = p;
    run = new Run(p.text);
    summary = null;
    version++;
    lastHitAt = performance.now();
    stopVoice();
    if (p.mode === 'listen') setTimeout(() => speakChunk(), 500);
    else if (settings.sayNext) void sayChar(p.text[0], voice);
    queueMicrotask(() => input?.focus());
  }

  /** Same text again. */
  function again() {
    if (!plan) return;
    run = new Run(plan.text);
    summary = null;
    version++;
    lastHitAt = performance.now();
    if (plan.mode === 'listen') setTimeout(() => speakChunk(), 400);
    queueMicrotask(() => input?.focus());
  }

  onMount(() => {
    newPlan();
    const t = setInterval(() => {
      now = performance.now();
      if (plan?.seconds && run.startedAt !== null && !run.done && !summary && run.elapsed(now) >= plan.seconds * 1000) finish(true);
    }, 200);
    return () => {
      clearInterval(t);
      stopVoice();
    };
  });

  // ---- Chunks for dictation ----
  function chunkAt(pos: number): { start: number; end: number } {
    const text = run.target;
    let start = pos;
    while (start > 0 && text[start - 1] !== ' ') start--;
    let end = pos;
    while (end < text.length && text[end] !== ' ') end++;
    return { start, end };
  }

  function speakChunk() {
    if (!plan || plan.mode !== 'listen' || run.done) return;
    const pos = run.target[run.pos] === ' ' ? run.pos + 1 : run.pos;
    const { start, end } = chunkAt(Math.min(pos, run.target.length - 1));
    const word = run.target.slice(start, end);
    if (plan.spell) void sayChars(word, voice, settings.letterGapMs);
    else void sayText(word, voice);
  }

  // ---- Keys ----
  function onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLElement && e.target !== input && e.target.closest('input, textarea, select')) return;
    if (e.metaKey || e.ctrlKey) return;
    if (summary) {
      if (e.key === 'Enter' && performance.now() - summaryAt > 800) {
        e.preventDefault();
        primary();
      }
      return;
    }
    if (e.key === 'Tab' && plan?.mode === 'listen') {
      e.preventDefault();
      speakChunk();
      return;
    }
    if (e.key === 'Escape') {
      leave();
      return;
    }
    const ch = keyChar(e.key);
    if (ch === null) return;
    e.preventDefault();
    press(ch);
  }

  // Keyboards on some phones send key "Unidentified": read the typed text from the field instead.
  function onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const text = el.value;
    el.value = '';
    if (summary) return;
    for (const ch of text) press(ch);
  }

  function press(ch: string) {
    if (!plan || run.done) return;
    const t = performance.now();
    const before = run.pos;
    const r = run.press(ch, t);
    now = t;
    version++;
    if (r === 'hit' || r === 'done') {
      lastHitAt = t;
      if (settings.sayPressed && plan.mode !== 'listen') void sayChar(ch, voice);
    }
    if (r === 'miss') {
      if (settings.missSound) missTone();
      missFlash = true;
      setTimeout(() => (missFlash = false), 180);
      return;
    }
    if (r === 'done') {
      finish(false);
      return;
    }
    if (plan.mode === 'listen') {
      // A new word starts after a space: say it.
      if (run.target[before] === ' ') speakChunk();
    } else if (settings.sayNext && !settings.sayPressed) {
      void sayChar(run.expected, voice);
    }
  }

  function finish(timeUp: boolean) {
    if (!plan || summary) return;
    const t = performance.now();
    run.stop(t);
    version++;
    stopVoice();
    const ms = run.elapsed(t);
    const wpm = run.wpm(t);
    const acc = run.accuracy();
    const p = store.p;
    const prevLessonBest = plan.lesson !== undefined ? (p.lessons[String(plan.lesson)]?.bestWpm ?? 0) : 0;
    const prevToday = p.days[dayKey(Date.now())]?.bestWpm ?? 0;
    const stars: [number, number] = [speedStars(wpm), accuracyStars(acc)];
    const rec = recordRun(p, {
      kind: plan.kind,
      label: plan.label,
      lesson: plan.lesson,
      at: Date.now() - ms,
      ms,
      hits: run.hits,
      miss: run.misses,
      score: run.score,
      wpm,
      acc,
      streak: run.bestStreak,
      events: run.events,
    });
    if (plan.lesson !== undefined) {
      const l = p.lessons[String(plan.lesson)];
      if (l) l.bestStars = Math.max(l.bestStars, stars[0] + stars[1]);
      const next = nextLesson(plan.lesson);
      if (next !== null && plan.lesson >= p.lesson) p.lesson = next;
    }
    const counts = new Map<string, number>();
    for (const e of run.events) if (!e.ok) counts.set(e.ch, (counts.get(e.ch) ?? 0) + 1);
    summary = {
      rec,
      stars,
      bestLesson: plan.lesson !== undefined && run.hits > 0 && wpm > prevLessonBest && prevLessonBest > 0,
      bestToday: run.hits > 0 && wpm > prevToday && prevToday > 0,
      misses: [...counts].map(([ch, n]) => ({ ch, n })).sort((a, b) => b.n - a.n).slice(0, 8),
      timeUp,
    };
    summaryAt = performance.now();
  }

  function primary() {
    if (!summary || !plan) return;
    if (plan.kind === 'lesson' && plan.lesson !== undefined) {
      const next = nextLesson(plan.lesson);
      if (next !== null) {
        current.ex = { kind: 'lesson', n: next };
        newPlan();
        return;
      }
    }
    if (plan.kind === 'lesson' || plan.kind === 'custom') again();
    else newPlan();
  }

  function leave() {
    stopVoice();
    back(['practice']);
  }

  // ---- What the screen shows ----
  const view = $derived.by(() => {
    void version;
    const r = run;
    const pos = r.pos;
    const text = r.target;
    return { pos, text, done: r.done, missesHere: r.missesHere, hits: r.hits, misses: r.misses, score: r.score, streak: r.streak };
  });

  const elapsed = $derived.by(() => {
    void version;
    return Math.max(0, run.elapsed(now));
  });
  const wpm = $derived(elapsed > 0 ? (view.hits / 5) / (elapsed / 60000) : 0);
  const acc = $derived(view.hits + view.misses === 0 ? 100 : (view.hits / (view.hits + view.misses)) * 100);

  const expected = $derived(view.text[view.pos] ?? '');
  const atWordStart = $derived(view.pos === 0 || view.text[view.pos - 1] === ' ');
  const multiEntry = $derived(
    plan && (plan.kind === 'multi' || settings.showMulti) && atWordStart && plan.mode === 'copy' ? km.multiAt(view.text, view.pos) : null,
  );
  const nextChord = $derived<Chord | null>(expected ? km.chordFor(expected) : null);

  const waitedLong = $derived(now - lastHitAt > settings.hintDelayMs);
  const showHint = $derived.by(() => {
    if (!plan || view.done) return false;
    if (plan.mode === 'quiz') return true;
    if (view.missesHere >= 6) return true;
    if (plan.mode === 'listen') return view.missesHere >= 3;
    switch (settings.hints) {
      case 'always':
        return true;
      case 'mistake':
        return view.missesHere > 0;
      case 'delay':
        return view.missesHere > 0 || waitedLong;
      case 'never':
        return false;
    }
  });
  /** In listen mode the character is revealed after three misses on it. */
  const reveal = $derived(plan?.mode === 'copy' || view.missesHere >= 3);

  // The line: the typed part on the left, the rest on the right, the cursor between them.
  const WINDOW = 48;
  const line = $derived.by(() => {
    const t = view.text;
    const pos = view.pos;
    const mode = plan?.mode ?? 'copy';
    const before: { ch: string; missed: boolean }[] = [];
    for (let i = Math.max(0, pos - WINDOW); i < pos; i++) before.push({ ch: t[i], missed: run.missed.has(i) });
    const after: string[] = [];
    if (mode === 'copy') {
      for (let i = pos + 1; i < Math.min(t.length, pos + WINDOW); i++) after.push(t[i]);
    } else if (mode === 'listen') {
      // Only the rest of the current word, as blanks.
      const { end } = chunkAt(Math.min(pos, t.length - 1));
      for (let i = pos + 1; i < end; i++) after.push('_');
    }
    return { before, after };
  });

  const progress = $derived(view.text.length ? view.pos / view.text.length : 0);
  const remaining = $derived(plan?.seconds ? Math.max(0, plan.seconds - Math.floor(elapsed / 1000)) : null);

  function vis(ch: string): string {
    return ch === ' ' ? ' ' : ch;
  }

  function fmtTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  const info = $derived(plan ? EXERCISES[plan.kind] : null);
  const missingChars = $derived(plan ? km.missing(plan.text).filter((c) => c !== ' ') : []);
</script>

<svelte:window onkeydown={onKey} />

<div class="train" class:flash={missFlash}>
  <header class="bar">
    <button class="text-button" onclick={leave}><Icon name="back" size={20} /> Back</button>
    <div class="title">
      <h1>{plan?.label ?? info?.title ?? 'Practice'}</h1>
      {#if plan?.note}<p class="sub">{plan.note}</p>{/if}
    </div>
    <div class="bar-end">
      {#if plan?.mode === 'listen'}
        <button class="btn compact tint" onclick={speakChunk} title="Say it again (Tab)"><Icon name="replay" size={18} /> Again</button>
      {:else if plan && plan.kind !== 'lesson' && plan.kind !== 'custom'}
        <button class="btn compact" onclick={newPlan} title="New text"><Icon name="shuffle" size={18} /> New</button>
      {/if}
    </div>
  </header>

  {#if error}
    <div class="notice bad" role="alert">{error}</div>
    <div class="btn-row center"><button class="btn" onclick={leave}>Back</button></div>
  {:else if plan}
    <dl class="stats" aria-label="This run">
      <div><dt>{remaining !== null ? 'Left' : 'Time'}</dt><dd>{remaining !== null ? `${remaining} s` : fmtTime(elapsed)}</dd></div>
      <div><dt>wpm</dt><dd>{wpm.toFixed(0)}</dd></div>
      <div><dt>Accuracy</dt><dd>{pct(acc)}%</dd></div>
      <div class="extra"><dt>Hits</dt><dd>{view.hits}</dd></div>
      <div><dt>Misses</dt><dd class:bad={view.misses > 0}>{view.misses}</dd></div>
      <div><dt>Score</dt><dd>{view.score}</dd></div>
      <div class="streak extra" class:hot={view.streak >= 5}><dt>Streak</dt><dd>{view.streak}</dd></div>
    </dl>

    {#if missingChars.length}
      <p class="notice warn">The layout in use has no chord for {missingChars.map((c) => `"${c}"`).join(', ')}. Those characters cannot be typed.</p>
    {/if}

    <div class="line-wrap" aria-live="off">
      <div class="line mono" class:hidden-text={plan.mode !== 'copy'}>
        <span class="before">
          {#each line.before as b, i (i)}<span class:missed={b.missed}>{vis(b.ch)}</span>{/each}
        </span>
        {#if !view.done}
          <span class="cursor" class:space={expected === ' '}>{reveal || plan.mode === 'copy' ? (expected === ' ' ? '␣' : expected) : plan.mode === 'quiz' ? '?' : '_'}</span>
        {/if}
        <span class="after">{#each line.after as a, i (i)}{vis(a)}{/each}</span>
      </div>
      {#if !plan.seconds}
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)} aria-label="Progress">
          <span style:width={`${progress * 100}%`}></span>
        </div>
      {/if}
    </div>

    <input
      bind:this={input}
      class="catcher"
      inputmode="none"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Typing area: type with your Twiddler"
      oninput={onInput}
    />

    {#if summary}
      <section class="summary group" aria-labelledby="sum-title">
        <h2 id="sum-title">{summary.timeUp ? 'Time is up' : `${plan.label} finished`}</h2>
        <div class="sum-grid">
          <div><span class="big">{summary.rec.wpm.toFixed(1)}</span><span class="unit">wpm</span><Stars n={summary.stars[0]} label="Speed" /></div>
          <div><span class="big">{pct(summary.rec.acc)}%</span><span class="unit">accuracy</span><Stars n={summary.stars[1]} label="Accuracy" /></div>
          <div><span class="big">{summary.rec.score}</span><span class="unit">points</span></div>
          <div><span class="big">{fmtTime(summary.rec.ms)}</span><span class="unit">time</span></div>
        </div>
        <ul class="sum-notes">
          {#if summary.bestLesson}<li>Your fastest run of this lesson.</li>{/if}
          {#if summary.bestToday}<li>Your fastest run today.</li>{/if}
          <li>Longest streak: {summary.rec.streak} characters.</li>
          {#if summary.misses.length}
            <li>
              Missed most:
              {#each summary.misses as m (m.ch)}
                {@const c = km.chordFor(m.ch)}
                <span class="miss-chip mono" title={charName(m.ch)}>{m.ch === ' ' ? 'space' : m.ch} ×{m.n}{c ? ` · ${formatChord(c, settings.notation)}` : ''}</span>
              {/each}
            </li>
          {:else}
            <li>No misses.</li>
          {/if}
        </ul>
        <div class="btn-row">
          {#if plan.kind === 'lesson' && plan.lesson !== undefined && nextLesson(plan.lesson) !== null}
            <button class="btn primary" onclick={primary}>Next lesson ({nextLesson(plan.lesson)})</button>
            <button class="btn" onclick={again}>Repeat lesson {plan.lesson}</button>
          {:else if plan.kind === 'lesson' || plan.kind === 'custom'}
            <button class="btn primary" onclick={again}>Again</button>
          {:else}
            <button class="btn primary" onclick={newPlan}>New run</button>
            <button class="btn" onclick={again}>Same text again</button>
          {/if}
          <button class="btn" onclick={leave}>Back</button>
        </div>
        <p class="hint-foot">Press Enter for the first button.</p>
      </section>
    {:else}
      <section class="help">
        <div class="next" aria-live="polite">
          {#if plan.mode === 'listen' && !reveal}
            <p class="next-char">Listen and type. Press Tab or Again to hear it again.</p>
          {:else if showHint && nextChord}
            <p class="next-char">
              <span class="mono key">{expected === ' ' ? 'space' : plan.mode === 'quiz' ? '?' : expected}</span>
              <span class="mono chord">{formatChord(nextChord, settings.notation)}</span>
            </p>
            {#if view.missesHere >= 6 && settings.hints === 'never'}<p class="sub">Shown after 6 misses on one character.</p>{/if}
          {:else if !showHint}
            <p class="next-char muted">Hints are hidden. {settings.hints === 'mistake' ? 'They show after a miss.' : settings.hints === 'delay' ? 'They show after a pause.' : ''}</p>
          {/if}
          {#if multiEntry}
            <p class="multi"><span class="mono">"{multiEntry.output.replace(/ $/, '␣')}"</span> has its own chord: <span class="mono">{formatChord(multiEntry.chord, settings.notation)}</span></p>
          {/if}
          {#if view.pos === 0 && run.startedAt === null}
            <p class="sub">The clock starts with your first key.</p>
          {/if}
        </div>
        <Keypad
          {km}
          chord={showHint ? (plan.kind === 'multi' && multiEntry ? multiEntry.chord : nextChord) : null}
          multi={multiEntry && plan.kind !== 'multi' ? multiEntry.chord : null}
          view={settings.view}
          hand={settings.hand}
          notation={settings.notation}
          showLabels={plan.mode !== 'quiz'}
        />
      </section>
    {/if}
  {/if}
</div>

<style>
  .train {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-3);
    max-width: var(--tw-wide);
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

  .bar-end {
    justify-self: end;
  }

  .title {
    text-align: center;
  }

  h1 {
    font-size: var(--tw-text-body);
    font-weight: var(--tw-weight-semibold);
  }

  .sub {
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--tw-space-1) var(--tw-space-6);
    margin: 0;
    padding: var(--tw-space-3) var(--tw-space-4);
    border-radius: var(--tw-radius-xl);
    background: var(--tw-surface);
  }

  .stats div {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 56px;
  }

  .stats dt {
    font-size: var(--tw-text-caption);
    color: var(--tw-label2);
  }

  .stats dd {
    margin: 0;
    font-size: var(--tw-text-title-s);
    font-weight: var(--tw-weight-semibold);
  }

  .stats dd.bad {
    color: var(--tw-bad);
  }

  .streak.hot dd {
    color: var(--tw-star);
  }

  .line-wrap {
    padding: var(--tw-space-4) 0 var(--tw-space-2);
    border-radius: var(--tw-radius-xl);
    background: var(--tw-surface);
    transition: background-color var(--tw-transition);
  }

  .flash .line-wrap {
    background: var(--tw-bad-soft);
  }

  .line {
    display: flex;
    align-items: baseline;
    overflow: hidden;
    font-size: var(--tw-text-practice);
    line-height: 1.4;
    white-space: pre;
  }

  .before {
    display: flex;
    flex: 0 0 40%;
    justify-content: flex-end;
    overflow: hidden;
    color: var(--tw-label3);
  }

  .before .missed {
    color: var(--tw-bad);
  }

  .after {
    flex: 1;
    overflow: hidden;
    color: var(--tw-label);
  }

  .hidden-text .after {
    color: var(--tw-label3);
  }

  .cursor {
    flex: none;
    border-radius: var(--tw-radius-s);
    background: var(--tw-accent-soft);
    color: var(--tw-accent);
    box-shadow: inset 0 -3px 0 var(--tw-accent);
  }

  .cursor.space {
    color: var(--tw-label3);
  }

  .progress {
    height: 3px;
    margin: var(--tw-space-3) var(--tw-space-4) 0;
    border-radius: var(--tw-radius-pill);
    background: var(--tw-fill3);
  }

  .progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--tw-accent-fill);
  }

  .catcher {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .help {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    gap: var(--tw-space-6);
  }

  .next {
    flex: 1 1 260px;
    max-width: 420px;
    padding-top: var(--tw-space-4);
  }

  .next-char {
    display: flex;
    align-items: baseline;
    gap: var(--tw-space-4);
    font-size: var(--tw-text-title);
  }

  .next-char.muted {
    font-size: var(--tw-text-sub);
    color: var(--tw-label2);
  }

  .next-char .key {
    font-size: var(--tw-text-hero);
    font-weight: var(--tw-weight-bold);
    line-height: 1;
  }

  .next-char .chord {
    color: var(--tw-label2);
  }

  .multi {
    margin-top: var(--tw-space-3);
    padding: var(--tw-space-2) var(--tw-space-3);
    border-radius: var(--tw-radius-m);
    background: var(--tw-fill3);
    font-size: var(--tw-text-sub);
  }

  .summary {
    padding: var(--tw-space-5) var(--tw-space-4);
  }

  .summary h2 {
    font-size: var(--tw-text-title);
    line-height: var(--tw-leading-title);
    text-align: center;
  }

  .sum-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--tw-space-4) var(--tw-space-8);
    margin: var(--tw-space-4) 0;
  }

  .sum-grid div {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .big {
    font-size: var(--tw-text-stat);
    font-weight: var(--tw-weight-bold);
    line-height: var(--tw-leading-title);
  }

  .unit {
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .sum-notes {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-1);
    max-width: var(--tw-reading);
    margin: 0 auto var(--tw-space-4);
    font-size: var(--tw-text-sub);
  }

  .miss-chip {
    display: inline-block;
    margin: var(--tw-space-half) var(--tw-space-1);
    padding: 0 var(--tw-space-1-5);
    border-radius: var(--tw-radius-s);
    background: var(--tw-bad-soft);
    font-size: var(--tw-text-foot);
  }

  .summary .btn-row,
  .center {
    justify-content: center;
  }

  .hint-foot {
    margin-top: var(--tw-space-2);
    font-size: var(--tw-text-caption);
    color: var(--tw-label2);
    text-align: center;
  }

  @media (max-width: 520px) {
    .stats {
      gap: var(--tw-space-1) var(--tw-space-3);
      padding: var(--tw-space-2) var(--tw-space-3);
    }

    .stats dd {
      font-size: var(--tw-text-body);
    }

    .stats .extra {
      display: none;
    }

    .stats div {
      min-width: 48px;
    }

    .next-char .key {
      font-size: var(--tw-text-large-title);
    }

    .help {
      gap: var(--tw-space-2);
    }

    .next {
      padding-top: 0;
    }

    .help :global(.pad) {
      max-width: 210px;
    }
  }

  @media (min-width: 900px) {
    .line {
      font-size: var(--tw-text-practice-wide);
    }
  }
</style>
