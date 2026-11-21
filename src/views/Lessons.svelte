<script lang="ts">
  import Icon from '../ui/Icon.svelte';
  import Stars from '../ui/Stars.svelte';
  import { store } from '../lib/state/app.svelte';
  import { start } from '../lib/state/current.svelte';
  import { TUTOR_LESSONS } from '../lib/lessons/tutor';
  import { keysetOf } from '../lib/train/text';

  let query = $state('');

  const stages = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const out: { stage: string; lessons: typeof TUTOR_LESSONS }[] = [];
    for (const l of TUTOR_LESSONS) {
      if (q && !(`${l.n} ${l.text} ${keysetOf(l.text)} ${l.stage}`.toLowerCase().includes(q))) continue;
      let g = out.find((x) => x.stage === l.stage);
      if (!g) out.push((g = { stage: l.stage, lessons: [] }));
      g.lessons.push(l);
    }
    return out;
  });
</script>

<div class="screen">
  <h1 class="large-title">Lessons</h1>
  <p class="lede">Finishing a lesson moves you on to the next. Tap any lesson to start it.</p>
  <div class="section">
    <label class="search">
      <span class="visually-hidden">Search lessons</span>
      <input type="search" placeholder="Search by number, letters or text" bind:value={query} />
    </label>
  </div>

  {#each stages as g (g.stage)}
    <section class="section">
      <h2 class="section-head">{g.stage}</h2>
      <div class="group">
        {#each g.lessons as l (l.n)}
          {@const rec = store.p.lessons[String(l.n)]}
          <button class="row" class:current={l.n === store.p.lesson} onclick={() => start({ kind: 'lesson', n: l.n })}>
            <span class="num" class:done={!!rec}>{l.n}</span>
            <span class="row-main">
              <span class="row-title mono keys">{keysetOf(l.text)}</span>
              <span class="row-sub text">{l.text}</span>
            </span>
            <span class="row-value">
              {#if rec}
                <span class="best">{rec.bestWpm.toFixed(0)} wpm</span>
                <Stars n={Math.round(rec.bestStars / 2)} size={12} label="Best run" />
              {:else if l.n === store.p.lesson}
                <span class="best">Next</span>
              {/if}
            </span>
            <span class="row-chevron"><Icon name="chevron" size={13} /></span>
          </button>
        {/each}
      </div>
    </section>
  {:else}
    <p class="empty">No lessons match "{query}".</p>
  {/each}
</div>

<style>
  .search input {
    width: 100%;
    height: 36px;
    padding: 0 var(--tw-space-3);
    border: 0;
    border-radius: var(--tw-radius-l);
    background: var(--tw-fill3);
    font-size: var(--tw-text-body);
  }

  .num {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--tw-row-icon);
    height: var(--tw-row-icon);
    border-radius: var(--tw-radius-pill);
    background: var(--tw-fill3);
    font-size: var(--tw-text-foot);
    font-weight: var(--tw-weight-semibold);
  }

  .num.done {
    background: var(--tw-ok-soft);
    color: var(--tw-ok);
  }

  .current .num {
    background: var(--tw-accent-fill);
    color: var(--tw-on-fill);
  }

  .keys {
    font-size: var(--tw-text-sub);
  }

  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--tw-space-half);
  }

  .best {
    font-size: var(--tw-text-foot);
  }
</style>
