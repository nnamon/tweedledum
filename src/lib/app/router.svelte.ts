// Screens live in the URL hash, so the browser's back button works and a reload stays put.

export type Tab = 'practice' | 'lessons' | 'chords' | 'tuner' | 'stats' | 'settings';

function parse(): string[] {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean).map(decodeURIComponent);
  return parts.length ? parts : ['practice'];
}

export const route = $state<{ path: string[] }>({ path: typeof location === 'undefined' ? ['practice'] : parse() });

if (typeof window !== 'undefined') {
  addEventListener('hashchange', () => {
    route.path = parse();
  });
}

export function go(...path: string[]) {
  const h = '#/' + path.map(encodeURIComponent).join('/');
  if (location.hash !== h) location.hash = h;
  else route.path = path;
}

export function back(fallback: string[] = ['practice']) {
  if (history.length > 1) history.back();
  else go(...fallback);
}
