<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '../ui/Icon.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import { keymap, replaceProfile, saveNow, store } from '../lib/state/app.svelte';
  import { emptyProfile } from '../lib/state/profile';
  import { exportCode, exportFile, importText, ImportError } from '../lib/state/transfer';
  import { exportLayoutJson, importLayout, importLayoutText, LayoutError, type ImportResult } from '../lib/chords/import';
  import { chordText } from '../lib/chords/chord';
  import { sayChars, sayText, speechAvailable, voices } from '../lib/audio/voice';
  import { RUNNING, isNewer, published, updateAndReload, type Published } from '../lib/app/update';
  import { go } from '../lib/app/router.svelte';

  const s = $derived(store.p.settings);
  const km = $derived(keymap());

  // ---- Progress ----
  let code = $state('');
  let copied = $state(false);
  let pasted = $state('');
  let progressMsg = $state<{ ok: boolean; text: string } | null>(null);

  async function makeCode() {
    saveNow();
    code = await exportCode($state.snapshot(store.p));
    copied = false;
  }

  async function copyCode() {
    if (!code) await makeCode();
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
    } catch {
      progressMsg = { ok: false, text: "The browser won't copy to the clipboard. Select the code and copy it yourself." };
    }
  }

  function download(name: string, text: string, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function saveFile() {
    saveNow();
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    download(`tweedledum-progress-${stamp}.json`, exportFile($state.snapshot(store.p)));
  }

  function describe(runs: number, updated: number): string {
    return runs ? `${runs} runs, last changed ${new Date(updated).toLocaleString()}` : 'no runs';
  }

  async function load(text: string) {
    progressMsg = null;
    try {
      const p = await importText(text);
      const here = describe(store.p.runs.length, store.p.updated);
      const there = describe(p.runs.length, p.updated);
      if (!confirm(`Loading replaces the progress in this browser (${here}) with the loaded progress (${there}). Continue?`)) return;
      replaceProfile(p);
      pasted = '';
      code = '';
      progressMsg = { ok: true, text: `Progress loaded: ${there}.` };
    } catch (e) {
      progressMsg = { ok: false, text: e instanceof ImportError ? e.message : 'That progress could not be read. Nothing was changed.' };
    }
  }

  async function loadFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (f) await load(await f.text());
  }

  function resetAll() {
    if (!confirm('Delete all progress in this browser: runs, sessions, statistics, settings and the loaded layout? Copy a progress code first if you may want it back.')) return;
    replaceProfile(emptyProfile());
    code = '';
    progressMsg = { ok: true, text: 'All progress in this browser was deleted.' };
  }

  // ---- Layout ----
  const BUNDLED = [
    { file: 'tabspace.cfg', name: 'TabSpace' },
    { file: 'mirrorwalk.cfg', name: 'MirrorWalk' },
    { file: 'mirrorwalk_nomcc.cfg', name: 'MirrorWalk without multi-character chords' },
    { file: 'delent.cfg', name: 'DelEnt' },
    { file: 'teasan.cfg', name: 'TeaSan' },
  ];
  let layoutMsg = $state<{ ok: boolean; text: string } | null>(null);
  let layoutText = $state('');

  function apply(r: ImportResult, name?: string) {
    store.p.layout = {
      name: name ?? r.layout.name,
      entries: r.layout.entries.map((e) => [chordText(e.chord), e.output]),
      keys: (r.layout.keys ?? []).map((k) => [chordText(k.chord), k.name]),
    };
    const k = keymap();
    const missing = k.missing('abcdefghijklmnopqrstuvwxyz0123456789 .,').filter((c) => c !== ' ');
    layoutMsg = {
      ok: true,
      text:
        `Loaded ${name ?? r.layout.name} (${r.format}): ${r.layout.entries.length} chords that type text.` +
        (r.skipped ? ` ${r.skipped} other chords (shortcuts, keys, mouse, or two buttons in a row) were left out.` : '') +
        (missing.length ? ` It has no chord for ${missing.join(' ')}.` : ''),
    };
  }

  function fail(e: unknown) {
    layoutMsg = { ok: false, text: e instanceof LayoutError ? e.message : 'That layout could not be read. Nothing was changed.' };
  }

  async function loadBundled(file: string, name: string) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}layouts/${file}`);
      if (!res.ok) throw new Error();
      apply(importLayout(new Uint8Array(await res.arrayBuffer()), file), name);
    } catch (e) {
      fail(e instanceof LayoutError ? e : new LayoutError('That layout could not be loaded. Check your connection and try again.'));
    }
  }

  async function loadLayoutFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!f) return;
    try {
      apply(importLayout(new Uint8Array(await f.arrayBuffer()), f.name));
    } catch (err) {
      fail(err);
    }
  }

  function loadLayoutText() {
    try {
      apply(importLayoutText(layoutText));
      layoutText = '';
    } catch (err) {
      fail(err);
    }
  }

  function useDefault() {
    store.p.layout = null;
    layoutMsg = { ok: true, text: 'Back to the Twiddler default layout.' };
  }

  // ---- Version ----
  let site = $state<Published | null | 'checking'>('checking');
  let reloading = $state(false);
  onMount(() => {
    void published().then((v) => (site = v));
  });
  function reload() {
    reloading = true;
    saveNow();
    void updateAndReload();
  }

  // ---- Voice ----
  let voiceList = $state<SpeechSynthesisVoice[]>([]);
  onMount(() => {
    voiceList = voices();
    if (speechAvailable()) speechSynthesis.onvoiceschanged = () => (voiceList = voices());
  });
  function testVoice() {
    void sayChars('abc', { rate: s.voiceRate, voiceName: s.voiceName }, s.letterGapMs).then(() => sayText('typing', { rate: s.voiceRate, voiceName: s.voiceName }));
  }
</script>

<div class="screen">
  <h1 class="large-title">Settings</h1>

  <section class="section">
    <h2 class="section-head">Version</h2>
    <div class="group">
      <div class="row">
        <span class="row-main">
          <span class="row-title">Tweedledum {RUNNING.version}</span>
          <span class="row-sub" role="status">
            {#if site === 'checking'}Checking the site for a newer version.
            {:else if site === null}Couldn't reach the site to check for a newer version.
            {:else if isNewer(site)}Version {site.version} ({site.build}) is on the site. Reload to update.
            {:else}This is the newest version.{/if}
          </span>
        </span>
        <span class="mono small">{RUNNING.build}</span>
      </div>
      <button class="row" onclick={reload} disabled={reloading}><span class="row-main row-title link">{reloading ? 'Reloading' : 'Update and reload'}</span><Icon name="replay" size={20} /></button>
    </div>
    <p class="section-foot">Reloading ends a run in progress. Your progress is saved first.</p>
  </section>

  <section class="section" id="progress">
    <h2 class="section-head">Progress</h2>
    <div class="group pad">
      <p class="para">Your progress is saved in this browser only. To carry on in another browser or device, copy a progress code or save a progress file here, then load it there. Nothing is sent to a server.</p>
      <div class="btn-row">
        <button class="btn tint" onclick={copyCode}><Icon name="copy" size={18} /> {copied ? 'Code copied' : 'Copy progress code'}</button>
        <button class="btn" onclick={saveFile}><Icon name="download" size={18} /> Save progress file</button>
      </div>
      {#if code}
        <textarea class="area code" readonly rows="4" value={code} aria-label="Progress code" onfocus={(e) => (e.target as HTMLTextAreaElement).select()}></textarea>
        <p class="small">{code.length} characters. The code holds everything: settings, layout, runs and statistics.</p>
      {/if}
    </div>
    <h3 class="section-head sub-head">Load progress</h3>
    <div class="group pad">
      <textarea class="area code" rows="3" bind:value={pasted} placeholder="Paste a progress code (TWD1.) or the text of a progress file" aria-label="Progress code to load"></textarea>
      <div class="btn-row">
        <button class="btn primary" disabled={!pasted.trim()} onclick={() => load(pasted)}>Load code</button>
        <label class="btn"><Icon name="upload" size={18} /> Load progress file<input type="file" accept=".json,application/json,text/plain" class="visually-hidden" onchange={loadFile} /></label>
      </div>
    </div>
    {#if progressMsg}<p class="notice" class:ok={progressMsg.ok} class:bad={!progressMsg.ok} role="status">{progressMsg.text}</p>{/if}
    <p class="section-foot">Loading replaces the progress in this browser. You're asked first.</p>
  </section>

  <section class="section">
    <h2 class="section-head">Layout</h2>
    <div class="group">
      <div class="row"><span class="row-main"><span class="row-title">{km.layout.name}</span><span class="row-sub">{km.layout.entries.length} chords that type text{store.p.layout ? '' : ', as the Twiddler 3 and 4 ship and the Typing Tutor teaches'}</span></span></div>
      {#if store.p.layout}
        <button class="row" onclick={useDefault}><span class="row-main row-title link">Use the Twiddler default</span></button>
      {/if}
      <label class="row"><span class="row-main row-title link">Load a layout file</span><span class="row-sub">.cfg, .csv or .json</span><input type="file" accept=".cfg,.csv,.json,.txt" class="visually-hidden" onchange={loadLayoutFile} /></label>
      <button class="row" onclick={() => download(`${km.layout.name.replace(/[^\w-]+/g, '-')}.json`, exportLayoutJson(km.layout))}><span class="row-main row-title link">Save this layout as JSON</span></button>
      <button class="row" onclick={() => go('tuner')}><span class="row-main"><span class="row-title link">Tuner</span><span class="row-sub">Edit a Twiddler 4 config: chords, thumb buttons, settings and profiles{store.p.config ? `. Open: ${store.p.config.name}` : ''}.</span></span><span class="row-chevron"><Icon name="chevron" size={13} /></span></button>
    </div>
    <p class="section-foot">Reads Twiddler config files (version 4 for Twiddler 2, 5 for Twiddler 3, 7 for Twiddler 4), CSV exported from the Twiddler Tuner, and the Typing Tutor's JSON key map. Only chords that type text are used. The lessons were written for the default layout.</p>

    <h3 class="section-head sub-head">Other layouts</h3>
    <div class="group">
      {#each BUNDLED as b (b.file)}
        <button class="row" onclick={() => loadBundled(b.file, b.name)}><span class="row-main row-title link">{b.name}</span></button>
      {/each}
    </div>
    <p class="section-foot">Config files from Griatch's twiddler-configs (BSD licence). TabSpace is by Brandon Rhodes; DelEnt, TeaSan and this MirrorWalk config are by Griatch.</p>

    <h3 class="section-head sub-head">Paste a layout</h3>
    <textarea class="area" rows="4" bind:value={layoutText} placeholder={'"Thumbs","Fingers","Actions"\n"","1R","[KB]a"'} aria-label="Layout as CSV or JSON"></textarea>
    <div class="btn-row top"><button class="btn" disabled={!layoutText.trim()} onclick={loadLayoutText}>Load pasted layout</button></div>
    {#if layoutMsg}<p class="notice" class:ok={layoutMsg.ok} class:bad={!layoutMsg.ok} role="status">{layoutMsg.text}</p>{/if}
  </section>

  <section class="section">
    <h2 class="section-head">Keypad picture</h2>
    <div class="group pad">
      <Segmented label="Hand" bind:value={s.hand} options={[{ value: 'right', label: 'Right hand' }, { value: 'left', label: 'Left hand' }]} />
      <Segmented label="Keypad view" bind:value={s.view} options={[{ value: 'front', label: 'Front, facing you' }, { value: 'back', label: 'Back, as you hold it' }]} />
      <Segmented label="Chord notation" bind:value={s.notation} options={[{ value: 'classic', label: 'Classic: N+LROO' }, { value: 't4', label: 'Twiddler 4: T1 F1L F2R' }]} />
    </div>
    <p class="section-foot">L, M and R are named as you look at the front of the keypad, as Tek Gear's documents do, and row 1 is under your index finger. Left hand mirrors the picture but doesn't change the chords. NUM, ALT, CTRL and SHIFT are T1 to T4 on the Twiddler 4.</p>
  </section>

  <section class="section">
    <h2 class="section-head">Hints</h2>
    <div class="group pad">
      <Segmented label="Show the next chord" bind:value={s.hints} options={[{ value: 'always', label: 'Always' }, { value: 'delay', label: 'After a pause' }, { value: 'mistake', label: 'After a miss' }, { value: 'never', label: 'Never' }]} />
    </div>
    <div class="group top">
      {#if s.hints === 'delay'}
        <label class="row"><span class="row-main row-title">Pause before the hint</span>
          <select class="row-field" bind:value={s.hintDelayMs}>{#each [500, 1000, 1500, 2000, 3000, 5000] as ms (ms)}<option value={ms}>{ms / 1000} s</option>{/each}</select>
        </label>
      {/if}
      <label class="row"><span class="row-main"><span class="row-title">Show multi-character chords</span><span class="row-sub">When a word has its own chord, ring it on the keypad.</span></span><input type="checkbox" role="switch" class="switch" bind:checked={s.showMulti} /></label>
    </div>
    <p class="section-foot">Dictation shows a character after three misses on it, whatever this setting. Every mode shows the chord after six misses on one character.</p>
  </section>

  <section class="section">
    <h2 class="section-head">Sound</h2>
    <div class="group">
      <label class="row"><span class="row-main"><span class="row-title">Tone on a miss</span></span><input type="checkbox" role="switch" class="switch" bind:checked={s.missSound} /></label>
      <label class="row"><span class="row-main"><span class="row-title">Say the next character</span><span class="row-sub">The tutor's helper audio.</span></span><input type="checkbox" role="switch" class="switch" bind:checked={s.sayNext} /></label>
      <label class="row"><span class="row-main"><span class="row-title">Say each character you type</span></span><input type="checkbox" role="switch" class="switch" bind:checked={s.sayPressed} /></label>
      <label class="row"><span class="row-main row-title">Speech rate</span>
        <select class="row-field" bind:value={s.voiceRate}>{#each [0.6, 0.8, 1, 1.2, 1.5, 1.8] as r (r)}<option value={r}>{r}×</option>{/each}</select>
      </label>
      <label class="row"><span class="row-main row-title">Pause between dictated letters</span>
        <select class="row-field" bind:value={s.letterGapMs}>{#each [200, 300, 450, 700, 1000, 1500] as ms (ms)}<option value={ms}>{ms} ms</option>{/each}</select>
      </label>
      {#if voiceList.length}
        <label class="row"><span class="row-main row-title">Voice for words</span>
          <select class="row-field" bind:value={s.voiceName}>
            <option value="">Device default</option>
            {#each voiceList as v (v.name)}<option value={v.name}>{v.name}</option>{/each}
          </select>
        </label>
      {/if}
      <button class="row" onclick={testVoice}><span class="row-main row-title link">Test the voice</span><Icon name="speaker" size={20} /></button>
    </div>
    <p class="section-foot">Letters, digits and most punctuation are recorded clips that work offline. Words use the voice of your device{speechAvailable() ? '' : ', which this browser does not have'}.</p>
  </section>

  <section class="section">
    <h2 class="section-head">Appearance</h2>
    <div class="group pad">
      <Segmented label="Theme" bind:value={s.theme} options={[{ value: 'system', label: 'Automatic' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
    </div>
  </section>

  <section class="section">
    <h2 class="section-head">About</h2>
    <div class="group pad about">
      <p>Lessons 1 to 69 and the default layout come from the Tek Gear Twiddler Typing Tutor; lessons 70 to 344 were written for Tweedledum. Letter clips are from BeepBeep, made with the Kokoro-82M voice. Tweedledum is not made by or connected with Tek Gear.</p>
      <p><a href="https://github.com/nnamon/tweedledum" target="_blank" rel="noopener">Source code on GitHub</a></p>
    </div>
  </section>

  <section class="section">
    <h2 class="section-head">Start again</h2>
    <div class="group">
      <button class="row" onclick={resetAll}><span class="row-main row-title danger-text">Delete all progress in this browser</span></button>
    </div>
  </section>
</div>

<style>
  .pad {
    display: flex;
    flex-direction: column;
    gap: var(--tw-space-3);
    padding: var(--tw-space-4);
  }

  .para,
  .about p {
    font-size: var(--tw-text-sub);
    line-height: var(--tw-leading-sub);
  }

  .about {
    gap: var(--tw-space-2);
  }

  .code {
    background: var(--tw-surface-2);
    font-size: var(--tw-text-caption);
    word-break: break-all;
  }

  .small {
    font-size: var(--tw-text-foot);
    color: var(--tw-label2);
  }

  .sub-head {
    margin-top: var(--tw-space-4);
  }

  .top {
    margin-top: var(--tw-space-3);
  }

  .link {
    color: var(--tw-accent);
  }

  .danger-text {
    color: var(--tw-bad);
  }

  label.btn {
    cursor: pointer;
  }

  label.row {
    cursor: pointer;
  }
</style>
