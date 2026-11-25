<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '../ui/Icon.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Layouts from './Layouts.svelte';
  import { chordText } from '../lib/chords/chord';
  import { exportLayoutJson, importLayout, importLayoutText, LayoutError } from '../lib/chords/import';
  import { keymap, store } from '../lib/state/app.svelte';
  import { DEFAULT_NAME, PRESETS, presetConfig, type Preset } from '../lib/chords/presets';
  import {
    ConfigError, DEDICATED, KEY_NAMES, THUMB_MODIFIERS, THUMB_NAMES, actionLabel, chordLabel, configFromLayout, fromBase64,
    has, keyChord, mirror, parseV7, readSettings, swapThumbs, textChord, textOf, toBase64, toggle, writeSettings, writeV7,
    type Button, type V7Chord, type V7Config, type V7Settings,
  } from '../lib/chords/v7';
  import { PROFILES, applyChanges, type ChangeId, type Report } from '../lib/chords/profiles';

  // One selection: the ticked layout is the config file, and the config file is what lessons,
  // drills and the Chords page use. Every change to the config updates the practice layout.

  const settings = $derived(store.p.settings);

  function load(): V7Config | null {
    if (!store.p.config) return null;
    try {
      return parseV7(fromBase64(store.p.config.data));
    } catch {
      return null;
    }
  }

  let cfg = $state<V7Config | null>(load());
  let name = $state(store.p.config?.name ?? '');
  let slot = $state<1 | 2 | 3>(store.p.config?.slot ?? 1);
  let edited = $state(store.p.config?.edited ?? false);
  let message = $state<{ text: string; ok: boolean } | null>(null);
  let query = $state('');
  let busy = $state(false);

  const current = $derived(store.p.layout?.name ?? DEFAULT_NAME);
  const s = $derived(cfg ? readSettings(cfg) : null);
  const sorted = $derived(cfg ? [...cfg.chords].sort((a, b) => a.bits - b.bits) : []);
  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => `${chordLabel(c.bits)} ${actionLabel(c)}`.toLowerCase().includes(q));
  });

  function save() {
    if (cfg) store.p.config = { name: name || 'Config', data: toBase64(writeV7(cfg)), slot, edited };
  }

  /** Lessons, drills and the Chords page use the chords in the config that type text. */
  function practiseOn(next: V7Config, layoutName: string) {
    const r = importLayout(writeV7(next), `${layoutName}.cfg`);
    store.p.layout = {
      name: layoutName,
      entries: r.layout.entries.map((e) => [chordText(e.chord), e.output]),
      keys: (r.layout.keys ?? []).map((k) => [chordText(k.chord), k.name]),
      ...(r.layout.holds ? { holds: r.layout.holds as Record<string, string> } : {}),
    };
  }

  /** An edit to the open config. */
  function commit(next: V7Config) {
    cfg = next;
    edited = true;
    save();
    practiseOn(next, name || 'Config');
  }

  /** A new config from the layout list or a file. The default layout keeps the lessons' own copy. */
  function select(next: V7Config, nextName: string, text: string) {
    if (cfg) undo = { cfg, name, edited, what: `the switch to ${nextName}` };
    cfg = next;
    name = nextName;
    edited = false;
    report = null;
    draft = null;
    save();
    if (nextName === DEFAULT_NAME) store.p.layout = null;
    else practiseOn(next, nextName);
    message = { text, ok: true };
  }

  /** Picking another layout replaces the open config. Ask only when there are changes to lose. */
  function mayReplace(nextName: string): boolean {
    return !edited || confirm(`Switch to ${nextName}? Your changes to ${name} will be replaced. Download ${fileName()} first to keep them.`);
  }

  async function choose(p: Preset) {
    if (!mayReplace(p.name)) return;
    busy = true;
    try {
      const { cfg: next, note } = await presetConfig(p);
      select(next, p.name, `Switched to ${p.name}: ${next.chords.length} chords. ${note}`);
    } catch (e) {
      message = { text: e instanceof LayoutError ? e.message : 'That layout could not be loaded. Nothing was changed.', ok: false };
    } finally {
      busy = false;
    }
  }

  /** A Twiddler 4 file opens as it is; other formats keep their typing chords. */
  function openFile(bytes: Uint8Array, fileName: string) {
    const nextName = fileName.replace(/\.[a-z0-9]+$/i, '') || 'Config';
    if (!mayReplace(nextName)) return;
    try {
      if (bytes[4] === 7) {
        const next = parseV7(bytes);
        select(next, nextName, `Opened ${fileName}: ${next.chords.length} chords.`);
        return;
      }
      const r = importLayout(bytes, fileName);
      const next = configFromLayout(r.layout);
      select(next, nextName, `Opened ${fileName} (${r.format}): ${r.layout.entries.length} chords that type text, with the Tuner's default settings and device functions.${r.skipped ? ` ${r.skipped} other chords (shortcuts, keys, mouse, or two buttons in a row) were left out.` : ''}`);
    } catch (e) {
      message = { text: e instanceof LayoutError || e instanceof ConfigError ? e.message : 'That file could not be read. Nothing was changed.', ok: false };
    }
  }

  function openPasted(text: string): boolean {
    try {
      const r = importLayoutText(text);
      if (!mayReplace(r.layout.name)) return false;
      select(configFromLayout(r.layout), r.layout.name, `Opened the pasted layout (${r.format}): ${r.layout.entries.length} chords that type text.`);
      return true;
    } catch (e) {
      message = { text: e instanceof LayoutError ? e.message : 'That layout could not be read. Nothing was changed.', ok: false };
      return false;
    }
  }

  let pasteText = $state('');

  async function loadFile(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = '';
    if (f) openFile(new Uint8Array(await f.arrayBuffer()), f.name);
  }

  function saveJson() {
    const km = keymap();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportLayoutJson(km.layout)], { type: 'application/json' }));
    a.download = `${km.layout.name.replace(/[^\w-]+/g, '-')}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // A config that doesn't match the ticked layout (saved by 0.3.4 or earlier, when they were
  // chosen apart) is replaced by the ticked layout's config. Undo brings it back.
  onMount(async () => {
    const preset = PRESETS.find((p) => p.name === current);
    // An unedited built-in layout is rebuilt, so a change to it in a new version reaches you.
    if (cfg && name === current && !edited && preset) {
      const before = cfg;
      try {
        const { cfg: next } = await presetConfig(preset);
        if (toBase64(writeV7(next)) !== toBase64(writeV7(before))) {
          select(next, current, `${current} changed in this version, so the config was rebuilt. Download it again for the Twiddler.`);
        }
      } catch {
        // Offline: keep the saved copy.
      }
      return;
    }
    if (cfg && name === current) return;
    const old = cfg ? { name } : null;
    busy = true;
    try {
      const { cfg: next } = preset ? await presetConfig(preset) : { cfg: configFromLayout(keymap().layout) };
      select(next, current, old ? `The open config, ${old.name}, was not the ticked layout. It is now ${current}.` : `${current}: ${next.chords.length} chords.`);
      if (!old) {
        undo = null;
        message = null;
      }
    } catch {
      message = { text: 'The ticked layout could not be loaded. Check your connection and reload.', ok: false };
    } finally {
      busy = false;
    }
  });

  /** The Twiddler 4 reads its configs from 1.cfg, 2.cfg and 3.cfg. */
  function fileName(): string {
    return `${slot}.cfg`;
  }

  function setSlot(v: 1 | 2 | 3) {
    slot = v;
    save();
  }

  function download() {
    if (!cfg) return;
    const url = URL.createObjectURL(new Blob([writeV7(cfg) as BlobPart], { type: 'application/octet-stream' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function rename(e: Event) {
    name = (e.currentTarget as HTMLInputElement).value;
    if (cfg) commit(cfg);
  }

  // ---- Tools ----

  type ThumbId = 'T1' | 'T2' | 'T3' | 'T4';
  let swapA = $state<ThumbId>('T1');
  let swapB = $state<ThumbId>('T3');

  function clashNote(clashes: V7Chord[]): string {
    if (clashes.length === 0) return '';
    return ` ${clashes.length} stayed where they were, because a device function has those buttons: ${clashes.map((c) => `${chordLabel(c.bits)} (${actionLabel(c)})`).join(', ')}.`;
  }

  function doSwap() {
    if (!cfg || swapA === swapB) return;
    const r = swapThumbs(cfg, swapA, swapB);
    bulk(r.cfg, `the swap of ${swapA} and ${swapB}`);
    message = { text: `Swapped ${swapA} and ${swapB} in every chord and in the thumb modifiers.${clashNote(r.clashes)}`, ok: r.clashes.length === 0 };
  }

  function doMirror() {
    if (!cfg) return;
    const r = mirror(cfg);
    bulk(r.cfg, 'the mirror');
    message = { text: `Swapped the L and R columns in every chord.${clashNote(r.clashes)}`, ok: r.clashes.length === 0 };
  }

  // ---- Undo, for changes to many chords at once and for switching layouts ----

  let undo = $state<{ cfg: V7Config; name: string; edited: boolean; what: string } | null>(null);

  function bulk(next: V7Config, what: string) {
    if (cfg) undo = { cfg, name, edited, what };
    commit(next);
  }

  function doUndo() {
    if (!undo) return;
    const u = undo;
    cfg = u.cfg;
    name = u.name;
    edited = u.edited;
    save();
    if (u.name === DEFAULT_NAME && !u.edited) store.p.layout = null;
    else practiseOn(u.cfg, u.name);
    message = { text: `Undid ${u.what}.`, ok: true };
    undo = null;
    report = null;
  }

  // ---- Profiles ----

  const profile = PROFILES[0];
  let chosen = $state<ChangeId[]>(profile.changes.map((c) => c.id));
  let report = $state<Report | null>(null);

  function applyProfile() {
    if (!cfg || chosen.length === 0) return;
    const r = applyChanges(cfg, chosen);
    bulk(r.cfg, `the ${profile.title} profile`);
    report = r.report;
    const n = r.report.placed.length + r.report.removed.length + r.report.moved.length;
    message = n === 0
      ? { text: `${profile.title}: nothing to change. The config already has everything chosen.`, ok: true }
      : { text: `${profile.title}: ${r.report.placed.length} chords added or moved, ${r.report.removed.length} removed, ${r.report.moved.length} moved out of the way.`, ok: r.report.lost.length === 0 };
  }

  function pick(id: ChangeId, on: boolean) {
    chosen = on ? [...chosen, id] : chosen.filter((c) => c !== id);
  }

  // ---- Settings ----

  function setS(patch: Partial<V7Settings>) {
    if (!cfg || !s) return;
    commit(writeSettings(cfg, { ...s, ...patch }));
  }

  function setThumb(i: number, v: number) {
    if (!s) return;
    const thumbs = [...s.thumbs] as V7Settings['thumbs'];
    thumbs[i] = v;
    setS({ thumbs });
  }

  function setDedicated(i: number, v: number) {
    if (!s) return;
    const dedicated = [...s.dedicated] as V7Settings['dedicated'];
    dedicated[i] = v;
    setS({ dedicated });
  }

  const withCurrent = (table: Record<number, string>, v: number) => (v in table ? table : { ...table, [v]: `Code ${v}` });
  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement | HTMLSelectElement).value);

  // ---- One chord ----

  type Draft = { original: V7Chord | null; bits: number; kind: 'text' | 'key' | 'device'; text: string; key: number; mods: number };
  let draft = $state<Draft | null>(null);

  const MODS: [number, string][] = [[0x01, 'Ctrl'], [0x04, 'Alt'], [0x02, 'Shift'], [0x08, 'Cmd']];
  const keyOptions = Object.entries(KEY_NAMES).map(([k, v]) => ({ k: Number(k), v })).sort((a, b) => a.k - b.k);
  const letterKeys = Array.from({ length: 26 }, (_, i) => ({ k: 4 + i, v: String.fromCharCode(97 + i) }));
  const digitKeys = '1234567890'.split('').map((d, i) => ({ k: 0x1e + i, v: d }));

  function edit(c: V7Chord) {
    const text = textOf(c);
    if (c.type === 1) draft = { original: c, bits: c.bits, kind: 'device', text: '', key: 0, mods: 0 };
    else if (text !== null) draft = { original: c, bits: c.bits, kind: 'text', text, key: 0x28, mods: 0 };
    else if (c.type === 2) draft = { original: c, bits: c.bits, kind: 'key', text: '', key: c.key, mods: c.hi };
    else draft = { original: c, bits: c.bits, kind: 'device', text: '', key: 0, mods: 0 };
  }

  function addNew() {
    draft = { original: null, bits: 0, kind: 'text', text: '', key: 0x28, mods: 0 };
  }

  const clash = $derived(draft && cfg ? cfg.chords.find((c) => c.bits === draft!.bits && c !== draft!.original) ?? null : null);

  const draftError = $derived.by(() => {
    if (!draft) return '';
    if (draft.bits === 0) return 'Choose at least one button.';
    if (draft.kind === 'text') {
      if (!draft.text) return 'Type what the chord should type.';
      if (!textChord(draft.bits, draft.text)) return 'Some of these characters have no key on a US keyboard.';
    }
    if (clash && clash.type === 1) return `These buttons belong to a device function (${actionLabel(clash)}).`;
    return '';
  });

  function saveDraft() {
    if (!cfg || !draft || draftError) return;
    const d = draft;
    const replaced = clash;
    let next: V7Chord;
    if (d.kind === 'text') next = textChord(d.bits, d.text)!;
    else if (d.kind === 'key') next = keyChord(d.bits, d.mods, d.key);
    else next = { ...d.original!, bits: d.bits };
    const chords = cfg.chords.filter((c) => c !== d.original && c.bits !== d.bits);
    commit({ ...cfg, chords: [...chords, next] });
    message = { text: `${chordLabel(next.bits)} = ${actionLabel(next)}${replaced ? `, replacing ${actionLabel(replaced)}` : ''}.`, ok: true };
    draft = null;
  }

  function deleteDraft() {
    if (!cfg || !draft?.original) return;
    const gone = draft.original;
    commit({ ...cfg, chords: cfg.chords.filter((c) => c !== gone) });
    message = { text: `Deleted ${chordLabel(gone.bits)} (${actionLabel(gone)}).`, ok: true };
    draft = null;
  }

  function flip(b: Button) {
    if (draft) draft.bits = toggle(draft.bits, b);
  }

  // Finger columns as the keypad picture shows them.
  const mirrored = $derived((settings.view === 'back') !== (settings.hand === 'left'));
  const cols = $derived<('L' | 'M' | 'R')[]>(mirrored ? ['L', 'M', 'R'] : ['R', 'M', 'L']);
  const PAD_THUMBS: Button[] = ['T0', 'T1', 'T2', 'T3', 'T4'];
</script>

<div class="screen wide">
  <h1 class="large-title">Tuner</h1>

  <Layouts {current} {edited} {busy} chords={cfg?.chords.length ?? 0} onpick={choose} />

  {#if message}
    <div class="section">
      <p class="notice" class:bad={!message.ok} role="status">
        {message.text}
        {#if undo}<button class="text-button undo" onclick={doUndo}>Undo</button>{/if}
      </p>
    </div>
  {/if}

  {#if cfg && s}
    <section class="section">
      <h2 class="section-head">Config file for the Twiddler 4</h2>
      <div class="group">
        <label class="row"><span class="row-main row-title">Name</span><input class="row-field" value={name} oninput={rename} aria-label="Config name" /></label>
        <div class="row"><span class="row-main row-title">Chords</span><span class="row-value">{cfg.chords.length}</span></div>
        <div class="row"><span class="row-main row-title">Slot on the Twiddler</span>
          <span class="slot"><Segmented label="Slot on the Twiddler" options={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]} value={slot} onchange={(v: 1 | 2 | 3) => setSlot(v)} /></span>
        </div>
        <button class="row link" onclick={download}><Icon name="download" size={18} /><span class="row-main"><span class="row-title">Download {fileName()}</span><span class="row-sub">{name || 'Config'}, {cfg.chords.length} chords</span></span></button>
      </div>
      <p class="section-foot">Copy the download to the Twiddler to replace that slot's config. Changes you make below are also what you practise on.</p>
    </section>

    <section class="section">
      <div class="group">
        <label class="row"><span class="row-main"><span class="row-title link">Open a layout file</span><span class="row-sub">.cfg for the Twiddler 2, 3 or 4, a Tuner CSV or Typing Tutor JSON</span></span><input type="file" accept=".cfg,.csv,.json,.txt" class="visually-hidden" onchange={loadFile} /></label>
        <details class="row paste">
          <summary class="row-title link">Paste a layout</summary>
          <textarea class="area" rows="4" bind:value={pasteText} placeholder={'"Thumbs","Fingers","Actions"\n"","1R","[KB]a"'} aria-label="Layout as CSV or JSON"></textarea>
          <div class="btn-row"><button class="btn" disabled={!pasteText.trim()} onclick={() => openPasted(pasteText) && (pasteText = '')}>Load pasted layout</button></div>
        </details>
        <button class="row" onclick={saveJson}><span class="row-main row-title link">Save {name || 'Config'} as JSON</span></button>
      </div>
    </section>
  {/if}

  {#if cfg && s}
    <section class="section">
      <h2 class="section-head">{profile.title} profile</h2>
      <div class="group">
        {#each profile.changes as c (c.id)}
          <label class="row">
            <span class="row-main"><span class="row-title">{c.title}</span><span class="row-sub">{c.detail}</span></span>
            <input type="checkbox" role="switch" class="switch" checked={chosen.includes(c.id)} onchange={(e) => pick(c.id, e.currentTarget.checked)} />
          </label>
        {/each}
      </div>
      <p class="section-foot">{profile.detail}</p>
      <div class="btn-row apply"><button class="btn" onclick={applyProfile} disabled={chosen.length === 0}>Apply {chosen.length} {chosen.length === 1 ? 'change' : 'changes'}</button></div>
      {#if report}
        <div class="report" aria-label="What the profile changed">
          {#if report.lost.length}<p class="notice bad">No chord types these any more: {report.lost.join(' ')}</p>{/if}
          {#if report.farOnly.length}<p class="notice warn">Only chords with T1 or T2 type these: {report.farOnly.join(' ')}</p>{/if}
          {#each [['Added or moved', report.placed], ['Moved out of the way', report.moved], ['Removed', report.removed]] as [head, list] (head)}
            {#if list.length}
              <details>
                <summary>{head} ({list.length})</summary>
                <ul class="mono">{#each list as line (line)}<li>{line}</li>{/each}</ul>
              </details>
            {/if}
          {/each}
        </div>
      {/if}
    </section>

    <section class="section">
      <h2 class="section-head">Move many chords</h2>
      <div class="group">
        <div class="row tools">
          <span class="row-main row-title">Swap thumb buttons</span>
          <select bind:value={swapA} aria-label="First thumb button">{#each ['T1', 'T2', 'T3', 'T4'] as t (t)}<option value={t}>{t} ({THUMB_NAMES[t]})</option>{/each}</select>
          <span>and</span>
          <select bind:value={swapB} aria-label="Second thumb button">{#each ['T1', 'T2', 'T3', 'T4'] as t (t)}<option value={t}>{t} ({THUMB_NAMES[t]})</option>{/each}</select>
          <button class="btn compact" onclick={doSwap} disabled={swapA === swapB}>Swap</button>
        </div>
        <div class="row tools">
          <span class="row-main"><span class="row-title">Mirror</span><span class="row-sub">Swap the L and R columns, to move a layout to the other hand.</span></span>
          <button class="btn compact" onclick={doMirror}>Mirror</button>
        </div>
      </div>
      <p class="section-foot">Device functions such as Sleep and Clear Bluetooth stay on their buttons. The Tuner puts them back if they move.</p>
    </section>

    <section class="section">
      <h2 class="section-head">Thumb buttons</h2>
      <div class="group">
        {#each ['T1', 'T2', 'T3', 'T4'] as t, i (t)}
          <label class="row"><span class="row-main row-title">{t} ({THUMB_NAMES[t]}) holds</span>
            <select class="row-field" value={s.thumbs[i]} onchange={(e) => setThumb(i, num(e))}>{#each Object.entries(withCurrent(THUMB_MODIFIERS, s.thumbs[i])) as [v, l] (v)}<option value={Number(v)}>{l}</option>{/each}</select>
          </label>
        {/each}
        {#each ['0L', '0M', '0R', 'T0'] as b, i (b)}
          <label class="row"><span class="row-main row-title">{b} pressed alone</span>
            <select class="row-field" value={s.dedicated[i]} onchange={(e) => setDedicated(i, num(e))}>{#each Object.entries(withCurrent(DEDICATED, s.dedicated[i])) as [v, l] (v)}<option value={Number(v)}>{l}</option>{/each}</select>
          </label>
        {/each}
      </div>
      <p class="section-foot">A thumb button's modifier applies when it is held with a chord that has no meaning of its own. 0L, 0M and 0R are the three small buttons above the keypad.</p>
    </section>

    <section class="section">
      <h2 class="section-head">Settings</h2>
      <div class="group">
        <div class="row"><span class="row-main row-title">Button mode</span>
          <Segmented label="Button mode" options={[{ value: 'chord', label: 'Chording' }, { value: 'key', label: 'Keyboard' }]} value={s.keyboardMode ? 'key' : 'chord'} onchange={(v: string) => setS({ keyboardMode: v === 'key' })} />
        </div>
        <label class="row"><span class="row-main row-title">Key repeat</span><input type="checkbox" role="switch" class="switch" checked={s.keyRepeat} onchange={(e) => setS({ keyRepeat: e.currentTarget.checked })} /></label>
        <label class="row"><span class="row-main row-title">Repeat after (ms)</span><input class="row-field" type="number" min="100" max="5000" step="10" value={s.repeatMs} onchange={(e) => setS({ repeatMs: num(e) })} /></label>
        <label class="row"><span class="row-main row-title">Haptic feedback</span><input type="checkbox" role="switch" class="switch" checked={s.haptic} onchange={(e) => setS({ haptic: e.currentTarget.checked })} /></label>
        <label class="row"><span class="row-main row-title">Sleep after (minutes)</span><input class="row-field" type="number" min="1" max="1000" step="1" value={Math.round(s.idleSeconds / 60)} onchange={(e) => setS({ idleSeconds: num(e) * 60 })} /></label>
        <div class="row"><span class="row-main row-title">Touchpad up</span>
          <Segmented label="Touchpad up" options={[{ value: 0, label: 'North' }, { value: 1, label: 'East' }, { value: 2, label: 'South' }, { value: 3, label: 'West' }]} value={s.up} onchange={(v: number) => setS({ up: v })} />
        </div>
        <label class="row"><span class="row-main row-title">Invert touchpad X axis</span><input type="checkbox" role="switch" class="switch" checked={s.invertX} onchange={(e) => setS({ invertX: e.currentTarget.checked })} /></label>
        <label class="row"><span class="row-main row-title">Touchpad sensitivity</span><input type="range" min="0" max="31" value={s.sensitivity} onchange={(e) => setS({ sensitivity: num(e) })} /><span class="row-value">{s.sensitivity}</span></label>
      </div>
    </section>

    <section class="section">
      <h2 class="section-head">Chords</h2>
      {#if draft}
        <div class="group draft" aria-label="Edit chord">
          <div class="pad-grid">
            <div class="thumbs">
              {#each PAD_THUMBS as t (t)}
                <button class="key" class:on={has(draft.bits, t)} aria-pressed={has(draft.bits, t)} onclick={() => flip(t)}>{t}{THUMB_NAMES[t] ? ` ${THUMB_NAMES[t]}` : ''}</button>
              {/each}
            </div>
            {#each [0, 1, 2, 3, 4] as row (row)}
              <div class="frow" class:mini={row === 0}>
                {#each cols as col (col)}
                  {@const b = `${row}${col}` as Button}
                  <button class="key" class:on={has(draft.bits, b)} aria-pressed={has(draft.bits, b)} onclick={() => flip(b)}>{b}</button>
                {/each}
              </div>
            {/each}
          </div>
          <div class="draft-side">
            <p class="mono chosen">{chordLabel(draft.bits)}</p>
            {#if draft.kind === 'device'}
              <p>{draft.original ? actionLabel(draft.original) : ''}. Only its buttons can change here.</p>
            {:else}
              <Segmented label="Action" options={[{ value: 'text', label: 'Types text' }, { value: 'key', label: 'Presses a key' }]} bind:value={draft.kind} />
              {#if draft.kind === 'text'}
                <label class="field"><span>Text</span><input class="mono" bind:value={draft.text} placeholder="the " aria-label="Text the chord types" /></label>
                <p class="row-sub">One character or several. Spaces count: "the " ends with one.</p>
              {:else}
                <label class="field"><span>Key</span>
                  <select bind:value={draft.key} aria-label="Key">
                    {#each [...keyOptions, ...letterKeys, ...digitKeys] as o (o.k)}<option value={o.k}>{o.v}</option>{/each}
                  </select>
                </label>
                <div class="mods">
                  {#each MODS as [bit, label] (bit)}
                    <label><input type="checkbox" checked={(draft.mods & bit) !== 0} onchange={(e) => draft && (draft.mods = e.currentTarget.checked ? draft.mods | bit : draft.mods & ~bit)} /> {label}</label>
                  {/each}
                </div>
              {/if}
            {/if}
            {#if draftError}<p class="notice warn">{draftError}</p>
            {:else if clash}<p class="notice warn">{chordLabel(clash.bits)} already does {actionLabel(clash)}. Saving replaces it.</p>{/if}
            <div class="btn-row">
              <button class="btn primary" onclick={saveDraft} disabled={!!draftError}>Save chord</button>
              {#if draft.original}<button class="btn danger" onclick={deleteDraft}>Delete</button>{/if}
              <button class="btn" onclick={() => (draft = null)}>Cancel</button>
            </div>
          </div>
        </div>
      {:else}
        <div class="btn-row"><button class="btn" onclick={addNew}>Add a chord</button></div>
      {/if}
      <label class="search">
        <span class="visually-hidden">Search chords</span>
        <input type="search" placeholder="Search by buttons or action" bind:value={query} />
      </label>
      <div class="group list">
        {#each shown as c (c.bits + ':' + c.type)}
          <button class="row" onclick={() => edit(c)}>
            <span class="mono chord-col">{chordLabel(c.bits)}</span>
            <span class="row-main row-title act" class:device={c.type === 1}>{actionLabel(c)}</span>
            <span class="row-chevron"><Icon name="chevron" size={13} /></span>
          </button>
        {:else}
          <p class="empty">No chords match "{query}".</p>
        {/each}
      </div>
      <p class="section-foot">Buttons as the Tuner names them: T0 to T4 are thumb buttons, then row and column, with row 0 the small buttons above the keypad.</p>
    </section>
  {/if}
</div>

<style>
  .undo {
    margin-left: var(--tw-space-2);
  }

  .link {
    color: var(--tw-accent);
  }

  .paste {
    display: block;
  }

  .paste[open] {
    padding-bottom: var(--tw-space-4);
  }

  .paste .area {
    margin-bottom: var(--tw-space-3);
  }

  .paste summary {
    display: flex;
    align-items: center;
    min-height: var(--tw-tap);
    cursor: pointer;
  }

  label.row {
    cursor: pointer;
  }

  .row.link {
    gap: var(--tw-space-2);
  }

  .apply {
    margin-top: var(--tw-space-3);
  }

  .slot :global(.seg-i) {
    min-width: var(--tw-tap);
  }

  .report {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-2);
    margin-top: var(--tw-space-3);
  }

  .report summary {
    min-height: var(--tw-tap);
    padding: var(--tw-space-3) 0;
    cursor: pointer;
    font-weight: var(--tw-weight-semibold);
  }

  .report ul {
    padding-left: var(--tw-space-4);
    font-size: var(--tw-text-sub);
    color: var(--tw-label2);
  }

  .tools {
    flex-wrap: wrap;
    gap: var(--tw-space-2);
  }

  .tools select {
    height: var(--tw-tap);
    padding: 0 var(--tw-space-2);
    border: 0;
    border-radius: var(--tw-radius-m);
    background: var(--tw-fill3);
  }

  .search input {
    width: 100%;
    height: 36px;
    margin: var(--tw-space-3) 0;
    padding: 0 var(--tw-space-3);
    border: 0;
    border-radius: var(--tw-radius-l);
    background: var(--tw-fill3);
    font-size: var(--tw-text-body);
  }

  .chord-col {
    flex: none;
    width: calc(var(--tw-tap) * 3);
    font-size: var(--tw-text-sub);
    color: var(--tw-accent);
  }

  .act.device {
    color: var(--tw-label2);
  }

  .empty {
    padding: var(--tw-space-4);
    color: var(--tw-label2);
  }

  .draft {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tw-space-6);
    margin-bottom: var(--tw-space-3);
    padding: var(--tw-space-4);
  }

  .pad-grid {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-2);
  }

  .thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tw-space-1-5);
    max-width: calc(var(--tw-tap) * 5);
    margin-bottom: var(--tw-space-2);
  }

  .frow {
    display: flex;
    gap: var(--tw-space-1-5);
  }

  .frow.mini {
    margin-bottom: var(--tw-space-2);
  }

  .key {
    min-width: var(--tw-tap);
    height: var(--tw-tap);
    padding: 0 var(--tw-space-2);
    border: var(--tw-hairline) solid var(--tw-pad-key-edge);
    border-radius: var(--tw-radius-m);
    background: var(--tw-pad-key);
    color: var(--tw-pad-key-text);
    font-size: var(--tw-text-foot);
    font-weight: var(--tw-weight-semibold);
  }

  .key.on {
    border-color: var(--tw-pad-press);
    background: var(--tw-pad-press);
    color: var(--tw-pad-press-text);
  }

  .draft-side {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--tw-space-3);
    min-width: calc(var(--tw-tap) * 6);
  }

  .chosen {
    font-size: var(--tw-text-title-s);
    font-weight: var(--tw-weight-semibold);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-1);
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .field input,
  .field select {
    height: var(--tw-tap);
    padding: 0 var(--tw-space-3);
    border: 0;
    border-radius: var(--tw-radius-m);
    background: var(--tw-fill3);
    color: var(--tw-label);
    font-size: var(--tw-text-body);
  }

  .mods {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tw-space-4);
  }
</style>
