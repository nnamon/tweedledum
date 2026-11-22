<script lang="ts">
  import { pct } from '../lib/util/format';
  import NavRow from '../ui/NavRow.svelte';
  import Stars from '../ui/Stars.svelte';
  import { store } from '../lib/state/app.svelte';
  import { start } from '../lib/state/current.svelte';
  import { go } from '../lib/app/router.svelte';
  import { EXERCISES, type Exercise } from '../lib/train/exercise';
  import { LESSONS } from '../lib/lessons/lessons';
  import { keysetOf } from '../lib/train/text';
  import { dayKey } from '../lib/state/profile';

  const lessonN = $derived(store.p.lesson);
  const lesson = $derived(LESSONS.find((l) => l.n === lessonN) ?? LESSONS[0]);
  const rec = $derived(store.p.lessons[String(lesson.n)]);
  const today = $derived(store.p.days[dayKey(Date.now())]);

  function open(kind: Exercise['kind']) {
    if (kind === 'lesson') go('lessons');
    else if (EXERCISES[kind].setup) go('setup', kind);
    else start({ kind } as Exercise);
  }

  const groups: { head: string; kinds: Exercise['kind'][]; foot?: string }[] = [
    { head: 'Lessons and texts', kinds: ['lesson', 'random', 'custom', 'multi'] },
    { head: 'Listening', kinds: ['dictLetters', 'dictWords'] },
    { head: 'Drills', kinds: ['weak', 'timed', 'quiz'] },
  ];

  function mins(ms: number): string {
    const m = Math.round(ms / 60000);
    return m === 1 ? '1 minute' : `${m} minutes`;
  }
</script>

<div class="screen">
  <h1 class="large-title">Practice</h1>
  {#if store.warning}<p class="notice warn">{store.warning}</p>{/if}
  {#if store.saveFailed}<p class="notice bad">This browser won't save your progress. Copy a progress code in Settings before you close the page.</p>{/if}

  <section class="section">
    <div class="group continue">
      <div class="cont-main">
        <span class="cont-label">Next lesson</span>
        <span class="cont-title">Lesson {lesson.n}</span>
        <span class="row-sub">{lesson.stage} · keys <span class="mono">{keysetOf(lesson.text)}</span></span>
        {#if rec}
          <span class="row-sub">Best {rec.bestWpm.toFixed(0)} wpm, {pct(rec.bestAcc)}% accuracy · <Stars n={Math.round(rec.bestStars / 2)} size={13} label="Best run" /></span>
        {/if}
      </div>
      <button class="btn primary" onclick={() => start({ kind: 'lesson', n: lesson.n })}>Start</button>
    </div>
    <p class="section-foot">
      {#if today}
        Today: {today.runs} {today.runs === 1 ? 'run' : 'runs'}, {mins(today.ms)}, best {today.bestWpm.toFixed(0)} wpm.
      {:else}
        No runs yet today.
      {/if}
    </p>
  </section>

  {#each groups as g (g.head)}
    <section class="section">
      <h2 class="section-head">{g.head}</h2>
      <div class="group">
        {#each g.kinds as k (k)}
          {@const e = EXERCISES[k]}
          <NavRow icon={e.icon} colour={e.colour} title={e.title} sub={e.blurb} onclick={() => open(k)} />
        {/each}
      </div>
      {#if g.foot}<p class="section-foot">{g.foot}</p>{/if}
    </section>
  {/each}

  <section class="section">
    <h2 class="section-head">Chords</h2>
    <div class="group">
      <NavRow icon="sparkles" colour="indigo" title="Learn chords" sub="One chord at a time, with spaced repetition: word chords, letters, digits or symbols. Word chords only count when typed as one chord." onclick={() => go('learn')} />
    </div>
  </section>

  <section class="section">
    <h2 class="section-head">Reference</h2>
    <div class="group">
      <NavRow icon="keyboard" colour="teal" title="Chord chart and key explorer" sub="Every chord of the layout in use. Press any key on your Twiddler to see its chord." onclick={() => go('chords')} />
    </div>
  </section>
</div>

<style>
  .continue {
    display: flex;
    align-items: center;
    gap: var(--tw-space-4);
    padding: var(--tw-space-4);
  }

  .cont-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .cont-label {
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .cont-title {
    font-size: var(--tw-text-title);
    font-weight: var(--tw-weight-bold);
    line-height: var(--tw-leading-title);
  }
</style>
