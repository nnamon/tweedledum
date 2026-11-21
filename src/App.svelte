<script lang="ts">
  import Icon from './ui/Icon.svelte';
  import Practice from './views/Practice.svelte';
  import Lessons from './views/Lessons.svelte';
  import Chords from './views/Chords.svelte';
  import Stats from './views/Stats.svelte';
  import Settings from './views/Settings.svelte';
  import Setup from './views/Setup.svelte';
  import Train from './views/Train.svelte';
  import { go, route, type Tab } from './lib/app/router.svelte';
  import { store } from './lib/state/app.svelte';
  import { current } from './lib/state/current.svelte';
  import { EXERCISES, type Exercise } from './lib/train/exercise';

  const TABS: { id: Tab; title: string; icon: string }[] = [
    { id: 'practice', title: 'Practice', icon: 'keyboard' },
    { id: 'lessons', title: 'Lessons', icon: 'book' },
    { id: 'chords', title: 'Chords', icon: 'grid' },
    { id: 'stats', title: 'Stats', icon: 'chart' },
    { id: 'settings', title: 'Settings', icon: 'gear' },
  ];

  const page = $derived(route.path[0]);
  const training = $derived(page === 'train');
  const tab = $derived<Tab>(page === 'setup' ? 'practice' : (TABS.find((t) => t.id === page)?.id ?? 'practice'));

  // The run screen needs an exercise; after a reload there is none, so go back to Practice.
  $effect(() => {
    if (training && !current.ex) go('practice');
  });

  // The theme follows the system unless Settings pins it.
  $effect(() => {
    const t = store.p.settings.theme;
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  });

  let main: HTMLElement | undefined = $state();
  $effect(() => {
    void route.path.join('/');
    main?.scrollTo(0, 0);
  });

  const setupKind = $derived(route.path[1] as Exercise['kind'] | undefined);
</script>

<div class="app" class:training>
  {#if !training}
    <nav class="sidebar" aria-label="Sections">
      <div class="brand">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="28" height="28" />
        <span>Tweedledum</span>
        <span class="ver">{__APP_VERSION__}</span>
      </div>
      <ul>
        {#each TABS as t (t.id)}
          <li>
            <a href={`#/${t.id}`} class:on={tab === t.id} aria-current={tab === t.id ? 'page' : undefined}>
              <Icon name={t.icon} size={18} />{t.title}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  {/if}

  <main bind:this={main}>
    {#if training}
      {#if current.ex}<Train />{/if}
    {:else if page === 'setup' && setupKind && EXERCISES[setupKind]}
      {#key setupKind}<Setup kind={setupKind} />{/key}
    {:else if tab === 'lessons'}
      <Lessons />
    {:else if tab === 'chords'}
      <Chords />
    {:else if tab === 'stats'}
      <Stats />
    {:else if tab === 'settings'}
      <Settings />
    {:else}
      <Practice />
    {/if}
  </main>

  {#if !training}
    <nav class="tabbar" aria-label="Sections">
      {#each TABS as t (t.id)}
        <a href={`#/${t.id}`} class:on={tab === t.id} aria-current={tab === t.id ? 'page' : undefined}>
          <Icon name={t.icon} size={24} />
          <span>{t.title}</span>
        </a>
      {/each}
    </nav>
  {/if}
</div>

<style>
  .app {
    display: flex;
    height: 100%;
  }

  main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--tw-safe-top) var(--tw-safe-right) calc(var(--tw-tabbar) + var(--tw-space-4)) var(--tw-safe-left);
    -webkit-overflow-scrolling: touch;
  }

  .training main {
    padding-bottom: var(--tw-safe-bottom);
  }

  .sidebar {
    display: none;
  }

  .tabbar {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    display: flex;
    height: var(--tw-tabbar);
    padding-bottom: var(--tw-safe-bottom);
    border-top: var(--tw-hairline) solid var(--tw-sep);
    background: var(--tw-dock);
    backdrop-filter: var(--tw-material-blur);
    -webkit-backdrop-filter: var(--tw-material-blur);
  }

  .tabbar a {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--tw-space-half);
    color: var(--tw-label2);
    font-size: var(--tw-text-tiny);
    font-weight: var(--tw-weight-medium);
  }

  .tabbar a.on {
    color: var(--tw-accent);
  }

  @media (min-width: 820px) {
    .tabbar {
      display: none;
    }

    main {
      padding-bottom: var(--tw-space-8);
    }

    .sidebar {
      display: flex;
      flex: none;
      flex-direction: column;
      width: var(--tw-sidebar);
      padding: calc(var(--tw-safe-top) + var(--tw-space-4)) var(--tw-space-3) var(--tw-space-4) calc(var(--tw-safe-left) + var(--tw-space-3));
      border-right: var(--tw-hairline) solid var(--tw-sep);
      background: var(--tw-sidebar-bg);
      backdrop-filter: var(--tw-material-blur);
      -webkit-backdrop-filter: var(--tw-material-blur);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--tw-space-2);
      padding: 0 var(--tw-space-2) var(--tw-space-4);
      font-size: var(--tw-text-callout);
      font-weight: var(--tw-weight-semibold);
    }

    .brand .ver {
      font-size: var(--tw-text-foot);
      font-weight: var(--tw-weight-regular);
      color: var(--tw-label2);
    }

    .brand img {
      border-radius: var(--tw-radius-m);
    }

    .sidebar ul {
      display: flex;
      flex-direction: column;
      gap: var(--tw-space-half);
    }

    .sidebar a {
      display: flex;
      align-items: center;
      gap: var(--tw-space-2);
      min-height: 32px;
      padding: 0 var(--tw-space-2);
      border-radius: var(--tw-radius-m);
      color: var(--tw-label);
      font-size: var(--tw-text-sub);
    }

    .sidebar a :global(svg) {
      color: var(--tw-accent);
    }

    .sidebar a:hover {
      background: var(--tw-hover);
    }

    .sidebar a.on {
      background: var(--tw-fill2);
      font-weight: var(--tw-weight-semibold);
    }
  }
</style>
