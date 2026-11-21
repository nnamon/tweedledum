<script lang="ts">
  import { pct } from '../lib/util/format';
  import Icon from '../ui/Icon.svelte';
  import LineChart from '../ui/LineChart.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import { formatChord } from '../lib/chords/chord';
  import { keymap, store } from '../lib/state/app.svelte';
  import { SESSION_GAP_MS, dayKey, type RunRec, type SessionRec } from '../lib/state/profile';
  import { TUTOR_LESSONS } from '../lib/lessons/tutor';

  type Tab = 'session' | 'all' | 'sessions';
  let tab = $state<Tab>('session');
  let openSession = $state<string | null>(null);

  const p = $derived(store.p);
  const km = $derived(keymap());
  const nowMs = Date.now();

  const live = $derived.by(() => {
    const s = p.sessions[p.sessions.length - 1];
    return s && nowMs - s.end < SESSION_GAP_MS ? s : null;
  });

  function wpmOf(hits: number, ms: number) {
    return ms > 0 ? hits / 5 / (ms / 60000) : 0;
  }
  function accOf(hits: number, miss: number) {
    return hits + miss ? (hits / (hits + miss)) * 100 : 100;
  }
  function dur(ms: number) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
    return m ? `${m} min ${s} s` : `${s} s`;
  }
  function when(t: number) {
    return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function time(t: number) {
    return new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const totals = $derived.by(() => {
    let runs = 0, ms = 0, hits = 0, miss = 0, best = 0;
    for (const d of Object.values(p.days)) {
      runs += d.runs;
      ms += d.ms;
      hits += d.hits;
      miss += d.miss;
      best = Math.max(best, d.bestWpm);
    }
    return { runs, ms, hits, miss, best, days: Object.keys(p.days).length };
  });

  // The last 30 days with practice, oldest first.
  const chart = $derived.by(() => {
    const keys = Object.keys(p.days).sort().slice(-30);
    return {
      labels: keys.map((k) => k.slice(5).replace('-', '/')),
      best: keys.map((k) => Math.round(p.days[k].bestWpm * 10) / 10),
      avg: keys.map((k) => Math.round(wpmOf(p.days[k].hits, p.days[k].ms) * 10) / 10),
    };
  });

  function runsOf(s: SessionRec): RunRec[] {
    return p.runs.filter((r) => r.s === s.id);
  }

  const sessionChart = (runs: RunRec[]) => ({ labels: runs.map((_, i) => String(i + 1)), wpm: runs.map((r) => r.wpm), acc: runs.map((r) => r.acc) });

  /** Per-character rows, weakest first. */
  const keyRows = $derived.by(() => {
    const rows = Object.entries(p.keys)
      .filter(([, k]) => k.n + k.miss > 0)
      .map(([ch, k]) => ({
        ch,
        n: k.n,
        miss: k.miss,
        acc: accOf(k.n, k.miss),
        ms: k.timed ? k.ms / k.timed : null,
      }));
    return rows.sort((a, b) => a.acc - b.acc || (b.ms ?? 0) - (a.ms ?? 0));
  });

  function sessionKeyRows(s: SessionRec) {
    return Object.entries(s.keys)
      .map(([ch, [n, miss]]) => ({ ch, n, miss, acc: accOf(n, miss) }))
      .sort((a, b) => a.acc - b.acc || b.miss - a.miss);
  }

  const lessonsDone = $derived(Object.keys(p.lessons).length);
  const sessionsNewest = $derived([...p.sessions].reverse());
  const shownSession = $derived(openSession ? p.sessions.find((s) => s.id === openSession) ?? null : null);

  function show(ch: string) {
    return ch === ' ' ? 'space' : ch;
  }
</script>

{#snippet summaryRows(s: SessionRec)}
  <div class="group">
    <div class="row"><span class="row-main row-title">Time typing</span><span class="row-value">{dur(s.ms)}</span></div>
    <div class="row"><span class="row-main row-title">Runs</span><span class="row-value">{s.runs}</span></div>
    <div class="row"><span class="row-main row-title">Characters typed</span><span class="row-value">{s.hits}</span></div>
    <div class="row"><span class="row-main row-title">Average speed</span><span class="row-value">{wpmOf(s.hits, s.ms).toFixed(1)} wpm</span></div>
    <div class="row"><span class="row-main row-title">Fastest run</span><span class="row-value">{s.bestWpm.toFixed(1)} wpm</span></div>
    <div class="row"><span class="row-main row-title">Accuracy</span><span class="row-value">{pct(accOf(s.hits, s.miss), 1)}%</span></div>
    <div class="row"><span class="row-main row-title">Points</span><span class="row-value">{s.score}</span></div>
  </div>
{/snippet}

{#snippet runTable(runs: RunRec[], withDate: boolean)}
  <div class="group scroll-x">
    <table class="table">
      <thead><tr><th>Run</th><th>{withDate ? 'When' : 'Started'}</th><th>Time</th><th>wpm</th><th>Accuracy</th><th>Points</th></tr></thead>
      <tbody>
        {#each runs as r (r.id)}
          <tr><td>{r.label}</td><td>{withDate ? when(r.at) : time(r.at)}</td><td>{dur(r.ms)}</td><td>{r.wpm.toFixed(1)}</td><td>{pct(r.acc)}%</td><td>{r.score}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet sessionDetail(s: SessionRec)}
  {@const runs = runsOf(s)}
  <section class="section">
    <h2 class="section-head">{when(s.start)} to {time(s.end)}</h2>
    {@render summaryRows(s)}
  </section>
  {#if runs.length > 1}
    {@const c = sessionChart(runs)}
    <section class="section">
      <h2 class="section-head">Runs in order</h2>
      <div class="group"><LineChart title="Speed and accuracy of each run in this session" labels={c.labels} series={[{ name: 'wpm', values: c.wpm, tone: 'accent' }, { name: 'Accuracy %', values: c.acc, tone: 'ok' }]} /></div>
    </section>
  {/if}
  {#if runs.length}
    <section class="section">
      <h2 class="section-head">Runs</h2>
      {@render runTable([...runs].reverse(), false)}
    </section>
  {/if}
  <section class="section">
    <h2 class="section-head">Characters, least accurate first</h2>
    <div class="group scroll-x">
      <table class="table">
        <thead><tr><th>Character</th><th>Chord</th><th>Hits</th><th>Misses</th><th>Accuracy</th></tr></thead>
        <tbody>
          {#each sessionKeyRows(s).slice(0, 40) as k (k.ch)}
            {@const c = km.chordFor(k.ch)}
            <tr><td class="mono">{show(k.ch)}</td><td class="mono">{c ? formatChord(c, p.settings.notation) : 'none'}</td><td>{k.n}</td><td>{k.miss}</td><td class:low={k.acc < 90}>{pct(k.acc)}%</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/snippet}

<div class="screen">
  <h1 class="large-title">Stats</h1>
  <div class="section">
    <Segmented label="Show" bind:value={tab} options={[{ value: 'session', label: 'This session' }, { value: 'all', label: 'All time' }, { value: 'sessions', label: 'Sessions' }]} />
  </div>

  {#if tab === 'session'}
    {#if live}
      {@render sessionDetail(live)}
      <p class="section-foot pad">A session is a run of practice with less than {SESSION_GAP_MS / 60000} minutes between runs.</p>
    {:else}
      <p class="empty">No runs in this session yet. A session starts with your first run and ends after {SESSION_GAP_MS / 60000} minutes without one.</p>
    {/if}
  {:else if tab === 'all'}
    {#if totals.runs === 0}
      <p class="empty">No runs yet. Your totals, speed by day and the characters you miss most will show here.</p>
    {:else}
      <section class="section">
        <h2 class="section-head">Since {new Date(p.created).toLocaleDateString()}</h2>
        <div class="group">
          <div class="row"><span class="row-main row-title">Time typing</span><span class="row-value">{dur(totals.ms)}</span></div>
          <div class="row"><span class="row-main row-title">Days practised</span><span class="row-value">{totals.days}</span></div>
          <div class="row"><span class="row-main row-title">Sessions</span><span class="row-value">{p.sessions.length}</span></div>
          <div class="row"><span class="row-main row-title">Runs</span><span class="row-value">{totals.runs}</span></div>
          <div class="row"><span class="row-main row-title">Characters typed</span><span class="row-value">{totals.hits}</span></div>
          <div class="row"><span class="row-main row-title">Average speed</span><span class="row-value">{wpmOf(totals.hits, totals.ms).toFixed(1)} wpm</span></div>
          <div class="row"><span class="row-main row-title">Fastest run</span><span class="row-value">{totals.best.toFixed(1)} wpm</span></div>
          <div class="row"><span class="row-main row-title">Accuracy</span><span class="row-value">{pct(accOf(totals.hits, totals.miss), 1)}%</span></div>
          <div class="row"><span class="row-main row-title">Lessons practised</span><span class="row-value">{lessonsDone} of {TUTOR_LESSONS.length}</span></div>
        </div>
      </section>
      <section class="section">
        <h2 class="section-head">Speed by day</h2>
        <div class="group">
          <LineChart title="Fastest and average speed on each day of practice" labels={chart.labels} unit="wpm" series={[{ name: 'Fastest run', values: chart.best, tone: 'accent' }, { name: 'Average', values: chart.avg, tone: 'muted' }]} />
        </div>
        <p class="section-foot">The last 30 days with practice.</p>
      </section>
      <section class="section">
        <h2 class="section-head">Characters, least accurate first</h2>
        <div class="group scroll-x">
          <table class="table">
            <thead><tr><th>Character</th><th>Chord</th><th>Hits</th><th>Misses</th><th>Accuracy</th><th>Average time</th></tr></thead>
            <tbody>
              {#each keyRows as k (k.ch)}
                {@const c = km.chordFor(k.ch)}
                <tr>
                  <td class="mono">{show(k.ch)}</td>
                  <td class="mono">{c ? formatChord(c, p.settings.notation) : 'none'}</td>
                  <td>{k.n}</td><td>{k.miss}</td>
                  <td class:low={k.acc < 90}>{pct(k.acc)}%</td>
                  <td>{k.ms === null ? 'no data yet' : `${Math.round(k.ms)} ms`}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="section-foot">Average time is from the key before to this one. Pauses over 5 seconds are left out.</p>
      </section>
      <section class="section">
        <h2 class="section-head">Recent runs</h2>
        {@render runTable(p.runs.slice(-25).reverse(), true)}
      </section>
    {/if}
  {:else if shownSession}
    <div class="nav"><button class="text-button" onclick={() => (openSession = null)}><Icon name="back" size={20} /> Sessions</button></div>
    {@render sessionDetail(shownSession)}
  {:else if sessionsNewest.length === 0}
    <p class="empty">No sessions yet.</p>
  {:else}
    <section class="section">
      <h2 class="section-head">{sessionsNewest.length} sessions, newest first</h2>
      <div class="group">
        {#each sessionsNewest as s (s.id)}
          <button class="row" onclick={() => (openSession = s.id)}>
            <span class="row-main">
              <span class="row-title">{new Date(s.start).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, {time(s.start)}{dayKey(s.start) === dayKey(nowMs) && live?.id === s.id ? ' (now)' : ''}</span>
              <span class="row-sub">{s.runs} {s.runs === 1 ? 'run' : 'runs'} · {dur(s.ms)} · {pct(accOf(s.hits, s.miss))}% accuracy</span>
            </span>
            <span class="row-value">{wpmOf(s.hits, s.ms).toFixed(1)} wpm</span>
            <span class="row-chevron"><Icon name="chevron" size={13} /></span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .low {
    color: var(--tw-bad);
  }

  .pad {
    padding-top: var(--tw-space-4);
  }

  .nav {
    padding: var(--tw-space-2) var(--tw-space-2) 0;
  }

  .nav .text-button {
    gap: var(--tw-space-1);
  }
</style>
