<script lang="ts">
  // The Twiddler keypad, drawn from the layout in use. Each finger button shows what it types
  // alone (large) and what it types with each row-1 button held (small, in the colour of that
  // row-1 button: L red, M blue, R green). The buttons of `chord` are filled; the buttons of
  // `multi` (a multi-character chord) are ringed.
  //
  // Front: the keypad as you look at it, with L on the right and R on the left; the L, M and R
  // names follow this view, as in Tek Gear's documents. Back: mirrored, as your fingers find the
  // buttons from behind.
  import type { Chord, Col, Thumb } from '../lib/chords/chord';
  import { chordWords, THUMB_NAMES } from '../lib/chords/chord';
  import type { Keymap } from '../lib/chords/layout';

  let {
    km,
    chord = null,
    multi = null,
    view = 'front',
    notation = 'classic',
    showLabels = true,
    caption = '',
  }: {
    km: Keymap;
    chord?: Chord | null;
    multi?: Chord | null;
    view?: 'front' | 'back';
    notation?: 'classic' | 't4';
    showLabels?: boolean;
    caption?: string;
  } = $props();

  const KEY_W = 36;
  const KEY_H = 46;
  const COL_X = [70, 110, 150];
  const ROW_Y = [170, 224, 278, 332];

  const cols = $derived<Col[]>(view === 'front' ? ['R', 'M', 'L'] : ['L', 'M', 'R']);

  // Thumb buttons, left to right in the front view: NUM, ALT, CTRL, SHIFT (T1 to T4).
  const THUMB_POS: { t: Thumb; x: number; y: number }[] = [
    { t: 'N', x: 54, y: 42 },
    { t: 'A', x: 82, y: 80 },
    { t: 'C', x: 138, y: 80 },
    { t: 'S', x: 166, y: 42 },
  ];
  const thumbs = $derived(view === 'front' ? THUMB_POS : THUMB_POS.map((p) => ({ ...p, x: 220 - p.x })));
  const T4_NUM: Record<Thumb, string> = { N: 'T1', A: 'T2', C: 'T3', S: 'T4' };

  function held(c: Chord | null, row: number, col: Col): boolean {
    return !!c && c.rows[row - 1] === col;
  }

  function show(s: string | null | undefined): string {
    if (!s) return '';
    if (s === ' ') return 'SP';
    if (s === '\n') return 'ENT';
    return s.trim().length ? s.trim().slice(0, 4) : s;
  }

  const label = $derived(chord ? `Chord: ${chordWords(chord)}` : 'Twiddler keypad');
</script>

<figure class="pad">
  <svg viewBox="0 0 220 380" role="img" aria-label={label}>
    <path
      class="body"
      d="M30 12 Q110 -4 190 12 Q214 20 210 62 Q206 112 186 142 L186 334 Q186 372 110 374 Q34 372 34 334 L34 142 Q14 112 10 62 Q6 20 30 12 Z"
    />
    <circle class="stick" cx="110" cy="40" r="11" />
    {#each [88, 110, 132] as x (x)}
      <circle class="mini" cx={x} cy="122" r="6" />
    {/each}

    {#each thumbs as p (p.t)}
      {@const on = !!chord?.thumbs.includes(p.t)}
      {@const ring = !!multi?.thumbs.includes(p.t)}
      <g class="thumb" class:on class:ring>
        <circle cx={p.x} cy={p.y} r="15" />
        <text x={p.x} y={p.y + (notation === 't4' ? -1 : 3)} text-anchor="middle" class="t-label" font-size="7.5">{THUMB_NAMES[p.t]}</text>
        {#if notation === 't4'}
          <text x={p.x} y={p.y + 8} text-anchor="middle" class="t-num" font-size="7">{T4_NUM[p.t]}</text>
        {/if}
      </g>
    {/each}

    {#each ROW_Y as y, ri (y)}
      {#each cols as col, ci (col)}
        {@const row = ri + 1}
        {@const x = COL_X[ci]}
        {@const on = held(chord, row, col)}
        {@const ring = held(multi, row, col)}
        {@const labels = showLabels ? km.labelsFor(row, col) : { alone: null, withRow1: {} }}
        <g class="key" class:on class:ring>
          <rect x={x - KEY_W / 2} y={y - KEY_H / 2} width={KEY_W} height={KEY_H} rx="11" />
          {#if showLabels}
            <text x={x} y={y - 4} text-anchor="middle" class="alone" font-size="15">{show(labels.alone)}</text>
            {#if row === 1}
              <rect class="swatch c-{col}" x={x - 6} y={y + 9} width="12" height="5" rx="2" />
            {:else}
              {@const order = view === 'front' ? (['L', 'M', 'R'] as Col[]) : (['R', 'M', 'L'] as Col[])}
              <text x={x} y={y + 14} text-anchor="middle" class="partners" font-size="10.5">
                {#each order as first (first)}
                  <tspan class="c-{first}" dx={first === order[0] ? 0 : 2}>{show(labels.withRow1[first]) || ''}</tspan>
                {/each}
              </text>
            {/if}
          {/if}
        </g>
      {/each}
    {/each}
    <text x="110" y="366" text-anchor="middle" class="side" font-size="9">{view === 'front' ? 'front' : 'back'}</text>
  </svg>
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
  .pad {
    margin: 0;
    width: 100%;
    max-width: 260px;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .body {
    fill: var(--tw-pad-body);
    stroke: var(--tw-pad-edge);
    stroke-width: 1.5;
  }

  .stick {
    fill: var(--tw-pad-edge);
  }

  .mini {
    fill: var(--tw-pad-thumb);
    stroke: var(--tw-pad-key-edge);
  }

  .thumb circle,
  .key rect:first-child {
    fill: var(--tw-pad-key);
    stroke: var(--tw-pad-key-edge);
    stroke-width: 1;
  }

  .thumb circle {
    fill: var(--tw-pad-thumb);
  }

  .t-label {
    font-family: var(--tw-sans);
    font-weight: var(--tw-weight-semibold);
    letter-spacing: 0;
    fill: var(--tw-pad-key-text);
  }

  .t-num {
    font-family: var(--tw-mono);
    fill: var(--tw-label2);
  }

  .alone {
    font-family: var(--tw-sans);
    font-weight: var(--tw-weight-semibold);
    letter-spacing: 0;
    fill: var(--tw-pad-key-text);
  }

  .partners {
    font-family: var(--tw-mono);
    font-weight: var(--tw-weight-bold);
    letter-spacing: 0;
  }

  .c-L {
    fill: var(--tw-col-l);
  }

  .c-M {
    fill: var(--tw-col-m);
  }

  .c-R {
    fill: var(--tw-col-r);
  }

  .on circle,
  .on rect:first-child {
    fill: var(--tw-pad-press);
    stroke: var(--tw-pad-press);
  }

  .on text,
  .on tspan {
    fill: var(--tw-pad-press-text);
  }

  .on .swatch {
    fill: var(--tw-pad-press-text);
  }

  .ring circle,
  .ring rect:first-child {
    stroke: var(--tw-ic-purple);
    stroke-width: 3;
    stroke-dasharray: 4 3;
  }

  .side {
    font-family: var(--tw-sans);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    fill: var(--tw-label2);
  }

  figcaption {
    margin-top: var(--tw-space-2);
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
    text-align: center;
  }
</style>
