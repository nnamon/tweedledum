<script lang="ts">
  // A small line chart: one or two series over evenly spaced points, with a y axis from 0.
  let {
    series,
    labels,
    unit = '',
    height = 160,
    title,
  }: {
    series: { name: string; values: (number | null)[]; tone: 'accent' | 'ok' | 'muted' }[];
    labels: string[];
    unit?: string;
    height?: number;
    title: string;
  } = $props();

  const W = 600;
  const PAD_L = 34;
  const PAD_B = 22;
  const PAD_T = 10;

  const max = $derived(Math.max(10, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))));
  const top = $derived(Math.ceil(max / 10) * 10);
  const n = $derived(Math.max(1, labels.length));

  function x(i: number): number {
    return n === 1 ? (PAD_L + W) / 2 : PAD_L + (i * (W - PAD_L - 6)) / (n - 1);
  }
  function y(v: number): number {
    return PAD_T + (1 - v / top) * (height - PAD_T - PAD_B);
  }
  function path(values: (number | null)[]): string {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  }
  const ticks = $derived([0, top / 2, top]);
  const every = $derived(Math.max(1, Math.ceil(n / 6)));
</script>

<figure class="chart">
  <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={title} preserveAspectRatio="none">
    {#each ticks as t (t)}
      <line class="grid" x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} />
      <text class="axis" x={PAD_L - 6} y={y(t) + 4} text-anchor="end" font-size="11">{t}</text>
    {/each}
    {#each labels as l, i (i)}
      {#if i % every === 0 || i === n - 1}
        <text class="axis" x={x(i)} y={height - 6} text-anchor="middle" font-size="11">{l}</text>
      {/if}
    {/each}
    {#each series as s (s.name)}
      <path class="line {s.tone}" d={path(s.values)} />
      {#each s.values as v, i (i)}
        {#if v !== null}<circle class="dot {s.tone}" cx={x(i)} cy={y(v)} r="2.5" />{/if}
      {/each}
    {/each}
  </svg>
  <figcaption>
    {#each series as s (s.name)}<span class="key {s.tone}">{s.name}</span>{/each}
    {#if unit}<span class="unit">{unit}</span>{/if}
  </figcaption>
</figure>

<style>
  .chart {
    margin: 0;
    padding: var(--tw-space-3) var(--tw-space-3) var(--tw-space-2);
  }

  svg {
    display: block;
    width: 100%;
    height: var(--tw-chart-h);
  }

  .grid {
    stroke: var(--tw-sep);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .axis {
    fill: var(--tw-label2);
    font-family: var(--tw-sans);
  }

  .line {
    fill: none;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .line.accent,
  .dot.accent {
    stroke: var(--tw-accent-fill);
    fill: var(--tw-accent-fill);
  }

  .line.ok,
  .dot.ok {
    stroke: var(--tw-ok-fill);
    fill: var(--tw-ok-fill);
  }

  .line.muted,
  .dot.muted {
    stroke: var(--tw-ic-grey);
    fill: var(--tw-ic-grey);
  }

  .line.accent,
  .line.ok,
  .line.muted {
    fill: none;
  }

  figcaption {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tw-space-4);
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .key::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 3px;
    margin-right: var(--tw-space-1-5);
    vertical-align: middle;
    border-radius: var(--tw-radius-pill);
    background: var(--tw-ic-grey);
  }

  .key.accent::before {
    background: var(--tw-accent-fill);
  }

  .key.ok::before {
    background: var(--tw-ok-fill);
  }

  .unit {
    margin-left: auto;
  }
</style>
