// Version checks and reloads. Every build writes version.json next to index.html. The service
// worker does not cache it, so a fetch always reaches the site.

export interface Published {
  version: string;
  build: string;
}

export const RUNNING: Published = { version: __APP_VERSION__, build: __APP_BUILD__ };

/** The version on the site, or null when the site can't be reached (offline, or a dev server). */
export async function published(): Promise<Published | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const v = (await res.json()) as Partial<Published>;
    return typeof v.version === 'string' && typeof v.build === 'string' ? { version: v.version, build: v.build } : null;
  } catch {
    return null;
  }
}

export function isNewer(site: Published, running: Published = RUNNING): boolean {
  return site.version !== running.version || site.build !== running.build;
}

/**
 * Fetches the newest service worker, waits up to 10 s for it to take over, then reloads. The
 * worker activates as soon as it installs (registerType 'autoUpdate'), so the reload gets the new
 * files. Without a service worker this is a plain reload.
 */
export async function updateAndReload(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update();
      const sw = reg.installing ?? reg.waiting;
      if (sw) {
        await new Promise<void>((resolve) => {
          const done = () => sw.state === 'activated' || sw.state === 'redundant';
          if (done()) resolve();
          sw.addEventListener('statechange', () => done() && resolve());
          setTimeout(resolve, 10000);
        });
      }
    }
  } catch {
    // An update that fails still reloads; the old files stay in use.
  }
  location.reload();
}
