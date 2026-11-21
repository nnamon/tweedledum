<script lang="ts" module>
  // Line icons on a 24 px grid, drawn for Tweedledum in the weight of Apple's SF Symbols.
  export const ICONS: Record<string, string> = {
    keyboard: 'M3 6.5h18v11H3z M6.5 10h1 M10 10h1 M13.5 10h1 M17 10h.5 M6.5 13.5h11',
    book: 'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z M12 6.5v13',
    chart: 'M4 20V4 M4 20h16 M8 16v-4 M12 16V8 M16 16v-6',
    gear: 'M18.84 10.50 L21.11 10.74 L21.11 13.26 L18.84 13.50 L17.90 15.77 L19.34 17.55 L17.55 19.34 L15.77 17.90 L13.50 18.84 L13.26 21.11 L10.74 21.11 L10.50 18.84 L8.23 17.90 L6.45 19.34 L4.66 17.55 L6.10 15.77 L5.16 13.50 L2.89 13.26 L2.89 10.74 L5.16 10.50 L6.10 8.23 L4.66 6.45 L6.45 4.66 L8.23 6.10 L10.50 5.16 L10.74 2.89 L13.26 2.89 L13.50 5.16 L15.77 6.10 L17.55 4.66 L19.34 6.45 L17.90 8.23Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    grid: 'M6 5h3v4H6z M10.5 5h3v4h-3z M15 5h3v4h-3z M6 10.5h3v4H6z M10.5 10.5h3v4h-3z M15 10.5h3v4h-3z M6 16h3v4H6z M10.5 16h3v4h-3z M15 16h3v4h-3z',
    shuffle: 'M3 7h3.5c4 0 6.5 10 11 10H21 M3 17h3.5c1.6 0 2.9-1.6 4-3.5 M13.5 10.5c1.1-1.9 2.4-3.5 4-3.5H21 M18 4l3 3-3 3 M18 14l3 3-3 3',
    text: 'M5 6h14 M5 10h14 M5 14h14 M5 18h9',
    sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
    target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    timer: 'M12 7.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M12 14V10.5 M10 3.5h4 M12 3.5v4',
    ear: 'M7 9a5 5 0 0 1 10 0c0 3-2.5 4-3 6.5S12.5 20 10.5 20 7.5 18.5 7.5 17 M10 9.5a2 2 0 0 1 4 0c0 1.2-1 1.6-1.5 2.4',
    waveform: 'M3 12h1.5 M6.5 9v6 M9.5 5v14 M12.5 8v8 M15.5 10v4 M18.5 7v10 M21 12h-.5',
    play: 'M8 5.5v13l10.5-6.5z',
    replay: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3 M4 4v4.5h4.5',
    close: 'M6 6l12 12 M18 6L6 18',
    chevron: 'M9 5l7 7-7 7',
    back: 'M15 5l-7 7 7 7',
    star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
    speaker: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    copy: 'M8 8h11v12H8z M5 16V4h11',
    download: 'M12 4v11 M7.5 10.5L12 15l4.5-4.5 M5 19.5h14',
    upload: 'M12 15V4 M7.5 8.5L12 4l4.5 4.5 M5 19.5h14',
    pause: 'M8 5.5v13 M16 5.5v13',
  };
</script>

<script lang="ts">
  let { name, size = 24, filled = false, label }: { name: string; size?: number; filled?: boolean; label?: string } = $props();
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <path d={ICONS[name] ?? ''} />
</svg>

<style>
  .icon {
    flex: none;
    display: block;
  }
</style>
