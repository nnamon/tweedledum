import { expect, test, type Page } from '@playwright/test';

const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/shots/${test.info().project.name}-${name}.png`, fullPage: false });

async function typeText(page: Page, text: string) {
  for (const ch of text) await page.keyboard.press(ch === ' ' ? 'Space' : ch);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('lesson 1 can be typed through, and progress moves on', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
  await shot(page, 'practice');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Lesson 1' })).toBeVisible();
  await shot(page, 'train-start');

  // A miss first, then the whole lesson.
  await page.keyboard.press('z');
  await expect(page.locator('.stats')).toContainText('Misses1');
  const lesson1 = 'aa ab ac ad ba bb bc bd ca cb cc cd da db dc dd aba aca ada bab bcb bdb cac cbc cdc dad dbd dcd acb cbd dab cab dba dac adc bad cda abcd baba acad bacd dacb caac dbcd bada dcab baca dada cada';
  await typeText(page, lesson1.slice(0, 20));
  await shot(page, 'train-mid');
  await typeText(page, lesson1.slice(20));
  await expect(page.getByRole('heading', { name: 'Lesson 1 finished' })).toBeVisible();
  await shot(page, 'train-summary');
  await page.getByRole('button', { name: /Next lesson/ }).click();
  await expect(page.getByRole('heading', { name: 'Lesson 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).first().click();

  await page.goto('./#/stats');
  await expect(page.getByText('Characters typed')).toBeVisible();
  await shot(page, 'stats-session');
  await page.getByText('All time').click();
  await shot(page, 'stats-all');
});

test('progress code moves progress to a fresh browser', async ({ page, browser }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Lesson 1' })).toBeVisible();
  await typeText(page, 'aa ab ac ad ba bb bc bd ca cb cc cd da db dc dd aba aca ada bab bcb bdb cac cbc cdc dad dbd dcd acb cbd dab cab dba dac adc bad cda abcd baba acad bacd dacb caac dbcd bada dcab baca dada cada');
  await expect(page.getByRole('heading', { name: 'Lesson 1 finished' })).toBeVisible();
  await page.goto('./#/settings');
  await page.getByRole('button', { name: /Copy progress code/ }).click();
  const code = await page.getByLabel('Progress code', { exact: true }).inputValue();
  expect(code.startsWith('TWD1.')).toBe(true);
  await shot(page, 'settings');

  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto('./#/settings');
  await p2.getByLabel('Progress code to load').fill(code);
  p2.once('dialog', (d) => d.accept());
  await p2.getByRole('button', { name: 'Load code' }).click();
  await expect(p2.getByText(/Progress loaded: 1 runs/)).toBeVisible();
  await p2.goto('./#/practice');
  await expect(p2.getByText('Lesson 2', { exact: true })).toBeVisible();
  await other.close();
});

test('chords screen shows the chord of a pressed key', async ({ page }) => {
  await page.goto('./#/chords');
  await expect(page.getByText('Waiting for a key.')).toBeVisible();
  await page.keyboard.press('r');
  await expect(page.locator('.explore')).toContainText('MR00');
  await shot(page, 'chords');
});

test('screens render', async ({ page }) => {
  await page.goto('./#/lessons');
  await expect(page.getByRole('heading', { name: 'Basic Level 3' })).toBeVisible();
  await shot(page, 'lessons');
  await page.goto('./#/setup/dictLetters');
  await shot(page, 'setup-dict');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(/Listen and type/)).toBeVisible();
  await shot(page, 'train-dict');
  await page.goto('./#/setup/quiz');
  await page.getByRole('button', { name: 'Start' }).click();
  await shot(page, 'train-quiz');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/practice');
  await shot(page, 'practice-dark');
  await page.goto('./#/setup/random');
  await page.getByRole('button', { name: 'Start' }).click();
  await shot(page, 'train-dark');
});

test('a bundled layout loads and changes the chords', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByRole('button', { name: /^Twiddler default/ }).click();
  await expect(page.getByRole('heading', { name: 'Tuner' })).toBeVisible();
  await page.getByRole('radio', { name: /^TabSpace/ }).click();
  await expect(page.getByRole('radio', { name: /^TabSpace/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /^Twiddler default/ })).toHaveAttribute('aria-checked', 'false');
  await shot(page, 'layouts');
  await page.goto('./#/chords');
  await expect(page.getByText('Waiting for a key.')).toBeVisible();
  await page.keyboard.press('e');
  // TabSpace types e with row 2 M alone.
  await expect(page.locator('.explore')).toContainText('0M00');
  await shot(page, 'chords-tabspace');
});

test('a Tuner config file loads and moves with the progress code', async ({ page, browser }) => {
  // A version 7 file as the Tuner downloads it, with a stamp in bytes 0 to 3: a on row 1 R, and
  // 1 on CTRL (T3) with row 1 R.
  const cfg = Buffer.alloc(128 + 16);
  cfg.set([0x1a, 0x53, 0x1c, 0x06, 7], 0);
  cfg.writeUInt16LE(2, 8);
  cfg.writeUInt32LE(0x002, 128);
  cfg.set([2, 0, 0x04], 132);
  cfg.writeUInt32LE(0x102, 136);
  cfg.set([2, 0, 0x1e], 140);

  await page.goto('./#/tuner');
  await page.locator('input[type=file][accept*=".csv"]').setInputFiles({ name: 'T3Num.cfg', mimeType: 'application/octet-stream', buffer: cfg });
  await expect(page.getByText('Opened T3Num.cfg: 2 chords.')).toBeVisible();
  await expect(page.getByLabel('Config name')).toHaveValue('T3Num');
  await expect(page.getByRole('radio', { name: /^T3Num/ })).toHaveAttribute('aria-checked', 'true');
  await page.goto('./#/settings');
  await page.getByRole('button', { name: /Copy progress code/ }).click();
  const code = await page.getByLabel('Progress code', { exact: true }).inputValue();

  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto('./#/settings');
  await p2.getByLabel('Progress code to load').fill(code);
  p2.once('dialog', (d) => d.accept());
  await p2.getByRole('button', { name: 'Load code' }).click();
  await expect(p2.getByText(/Progress loaded/)).toBeVisible();
  await p2.goto('./#/chords');
  await expect(p2.getByText('Waiting for a key.')).toBeVisible();
  await p2.keyboard.press('1');
  await expect(p2.locator('.explore')).toContainText('C+R000');
  await other.close();
});

test('learn chords counts a word chord only when it comes in one burst', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('button', { name: /Learn chords/ }).click();
  await expect(page.getByRole('heading', { name: 'Learn chords' })).toBeVisible();
  await expect(page.getByText('0 of 11 learnt', { exact: false })).toBeVisible();
  await shot(page, 'learn-pick');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('.target')).toHaveText('the␣');
  // A new chord is shown on the keypad, so a burst counts as right with the chord shown.
  await page.keyboard.type('the ');
  await expect(page.locator('.feedback')).toHaveText('the␣: right, with the chord shown.');
  await expect(page.locator('.target')).toHaveText('The␣');
  await shot(page, 'learn-card');
  await page.keyboard.type('The ', { delay: 200 });
  await expect(page.locator('.feedback')).toContainText('The␣ was typed letter by letter.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Session finished' })).toBeVisible();
  await expect(page.getByText('Letter by letter: 1')).toBeVisible();
});

test('the Tuner builds, swaps, edits and downloads a Twiddler 4 config', async ({ page }) => {
  await page.goto('./#/tuner');
  await expect(page.getByLabel('Config name')).toHaveValue('Twiddler default');

  await page.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(page.getByText(/Swapped T1 and T3 in every chord/)).toBeVisible();
  await page.getByPlaceholder('Search by buttons or action').fill('T3 1R');
  await expect(page.locator('.list .row').first()).toContainText('1');

  await page.getByPlaceholder('Search by buttons or action').fill('');
  await page.getByRole('button', { name: 'Add a chord' }).click();
  await page.getByRole('button', { name: '0L', exact: true }).click();
  await page.getByLabel('Text the chord types').fill('hello ');
  await page.locator('.draft').scrollIntoViewIfNeeded();
  await shot(page, 'editor-chord');
  await page.getByRole('button', { name: 'Save chord' }).click();
  await expect(page.getByText('0L = "hello ".')).toBeVisible();
  await shot(page, 'editor');

  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download/ }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe('1.cfg');
  const bytes = new Uint8Array(await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c)));
  expect(bytes[4]).toBe(7);

  // Edits change what you practise on, with no extra step.
  await page.goto('./#/chords');
  await expect(page.getByText('Waiting for a key.')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('.explore')).toContainText('C+R000');
});

test('the Tuner applies the SmallHands profile and can undo it', async ({ page }) => {
  await page.goto('./#/practice');
  await page.getByRole('link', { name: 'Tuner' }).first().click();
  await expect(page.getByRole('heading', { name: 'Tuner' })).toBeVisible();
  await page.getByLabel(/Common word chords/).uncheck();
  await page.getByRole('button', { name: 'Apply 5 changes' }).click();
  await expect(page.getByText(/SmallHands: \d+ chords added or moved/)).toBeVisible();
  await page.getByText(/^Added or moved/).click();
  await expect(page.locator('.report')).toContainText('1L 1M 1R 2L = 1');
  // Common word chords was switched off, so no word chord is added.
  await expect(page.locator('.report')).not.toContainText('"for "');
  await shot(page, 'tuner-profile');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Undid the SmallHands profile.')).toBeVisible();
  await page.getByPlaceholder('Search by buttons or action').fill('1L 1M 1R 2L');
  await expect(page.locator('.list')).toContainText('No chords match');

  await page.getByRole('button', { name: 'Apply 5 changes' }).click();
  await page.getByRole('button', { name: 'Apply 5 changes' }).click();
  await expect(page.getByText('SmallHands: nothing to change.', { exact: false })).toBeVisible();

  await page.goto('./#/chords');

  await expect(page.getByText('Waiting for a key.')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('.explore')).toContainText('BL00');
});

test('left hand mirrors the keypad picture and keeps the chords', async ({ page }) => {
  const order = async () => {
    const xs = await page.locator('.pad g.key').evaluateAll((gs) =>
      gs.filter((g) => g.getAttribute('data-key')!.startsWith('1')).map((g) => ({ k: g.getAttribute('data-key'), x: (g.querySelector('rect') as SVGRectElement).x.baseVal.value })),
    );
    return xs.sort((a, b) => a.x - b.x).map((o) => o.k).join(' ');
  };
  await page.goto('./#/chords');
  await expect(page.locator('.pad g.key').first()).toBeVisible();
  expect(await order()).toBe('1R 1M 1L');

  await page.goto('./#/settings');
  await page.getByRole('radiogroup', { name: 'Hand' }).getByText('Left hand').click();
  await page.goto('./#/chords');
  expect(await order()).toBe('1L 1M 1R');
  await expect(page.locator('.pad .side')).toHaveText('front, left hand');
  await page.keyboard.press('a');
  await expect(page.locator('.pad g.key.on')).toHaveAttribute('data-key', '1R');

  await page.goto('./#/settings');
  await page.getByRole('radiogroup', { name: 'Keypad view' }).getByText(/Back/).click();
  await page.goto('./#/chords');
  expect(await order()).toBe('1R 1M 1L');
});

test('Settings opens in the middle of a lesson and the lesson carries on', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Lesson 1' })).toBeVisible();
  await typeText(page, 'aa ab');
  await expect(page.locator('.stats')).toContainText('Hits5');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/#\/train\/settings$/);
  await expect(page.getByText('Paused')).toBeVisible();
  // Keys typed in Settings don't reach the lesson.
  await page.keyboard.press('Space');
  await page.getByRole('radiogroup', { name: 'Hand' }).getByText('Left hand').click();
  await page.getByRole('button', { name: 'Lesson 1' }).click();

  await expect(page.locator('.stats')).toContainText('Hits5');
  await expect(page.locator('.stats')).toContainText('Misses0');
  await expect(page.locator('.pad .side')).toHaveText('front, left hand');
  await typeText(page, ' ');
  await expect(page.locator('.stats')).toContainText('Hits6');

  // The browser's back button closes Settings too.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.goBack();
  await expect(page.locator('.stats')).toContainText('Hits6');
});

test('Settings shows the version', async ({ page }) => {
  await page.goto('./#/settings');
  await expect(page.getByText(/^Tweedledum \d+\.\d+\.\d+$/)).toBeVisible();
  await expect(page.getByText(/This is the newest version\.|is on the site/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update and reload' })).toBeVisible();
});

test('the SmallHands preset loads for practice and opens in the editor', async ({ page }) => {
  await page.goto('./#/tuner');
  await page.getByRole('radio', { name: /^SmallHands/ }).click();
  await expect(page.getByRole('radio', { name: /^SmallHands/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/Switched to SmallHands: 118 chords/)).toBeVisible();
  await shot(page, 'preset');
  await page.getByPlaceholder('Search by buttons or action').fill('about');
  await expect(page.locator('.list')).toContainText('1R 2M 3M 4M');
  const dl = page.waitForEvent('download');
  await page.getByRole('radiogroup', { name: 'Slot on the Twiddler' }).getByText('2').click();
  await page.getByRole('button', { name: /Download/ }).click();
  expect((await dl).suggestedFilename()).toBe('2.cfg');
  await page.goto('./#/chords');
  await expect(page.getByText('Waiting for a key.')).toBeVisible();
  await page.keyboard.press('9');
  await expect(page.locator('.explore')).toContainText('B00R');
});

test('the Chords page sorts multi-character chords and shows their spaces', async ({ page }) => {
  await page.goto('./#/tuner');
  await page.getByRole('radio', { name: /^SmallHands/ }).click();
  await page.goto('./#/chords');
  const words = page.locator('.list-section', { has: page.getByRole('heading', { name: 'Words and word parts' }) });
  await expect(words.locator('.chip').first()).toContainText('about␣');
  await expect(page.getByRole('heading', { name: 'Other multi-character chords' })).toHaveCount(0);
  await words.getByRole('button', { name: /^for/ }).click();
  await expect(page.locator('.explore')).toContainText('Ends with a space');
  await words.getByRole('button', { name: /^in 0R0M/ }).click();
  await expect(page.locator('.explore')).toContainText('No space after');
  await shot(page, 'chords-multi');

  // MirrorWalk has a string that isn't a word, listed apart.
  await page.goto('./#/tuner');
  await page.getByRole('radio', { name: /^MirrorWalk Griatch/ }).click();
  await expect(page.getByLabel('Config name')).toHaveValue('MirrorWalk');
  await page.goto('./#/chords');
  const other = page.locator('.list-section', { has: page.getByRole('heading', { name: 'Other multi-character chords' }) });
  await expect(other).toContainText('...␣');
  await expect(words).not.toContainText('...');
});

test('ticking a layout makes it the config file', async ({ page }) => {
  // Ticking SmallHands used to change only the practice layout, so Download gave whatever config
  // was open before.
  await page.goto('./#/tuner');
  await page.getByRole('radio', { name: /^SmallHands/ }).click();
  await expect(page.getByLabel('Config name')).toHaveValue('SmallHands');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download 1\.cfg SmallHands, 118 chords/ }).click();
  const bytes = Buffer.concat(await (await (await dl).createReadStream()).toArray());
  // 1 on a row 1 barre with 2L (bitmask 0x8e, a key chord for HID 0x1e), and nothing on T1 1R.
  const chords = new Map<number, number>();
  for (let o = 128; o + 8 <= 128 + 8 * bytes.readUInt16LE(8); o += 8) chords.set(bytes.readUInt32LE(o), bytes.readUInt16LE(o + 6));
  expect(chords.get(0x8e)).toBe(0x1e);
  expect(chords.has(0x0003)).toBe(false);
});

test('switching layouts asks before replacing changes, and Undo brings them back', async ({ page }) => {
  await page.goto('./#/tuner');
  await page.getByRole('button', { name: 'Mirror', exact: true }).click();
  await expect(page.getByRole('radio', { name: /^Twiddler default.*edited/ })).toBeVisible();
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('radio', { name: /^TabSpace/ }).click();
  await expect(page.getByLabel('Config name')).toHaveValue('Twiddler default');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('radio', { name: /^TabSpace/ }).click();
  await expect(page.getByLabel('Config name')).toHaveValue('TabSpace');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('Config name')).toHaveValue('Twiddler default');
  await expect(page.getByRole('radio', { name: /^Twiddler default.*edited/ })).toHaveAttribute('aria-checked', 'true');
});

test('a config saved apart from the ticked layout is replaced by it', async ({ page }) => {
  // Before 0.3.6 the open config and the practice layout were chosen apart. A profile with the
  // Twiddler default open and SmallHands ticked opens SmallHands.
  await page.goto('./#/tuner');
  await expect(page.getByLabel('Config name')).toHaveValue('Twiddler default');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tweedledum.profile.v1') ?? '{}').config?.name)).toBe('Twiddler default');
  // The app saves its own copy when the page is hidden, so change the stored profile as the next page loads.
  await page.addInitScript(() => {
    const p = JSON.parse(localStorage.getItem('tweedledum.profile.v1')!);
    if (p.config?.name !== 'Twiddler default') return;
    p.layout = { name: 'SmallHands', entries: [['ROOO', 'a']], keys: [] };
    p.config.name = 'Twiddler-default';
    delete p.config.edited;
    localStorage.setItem('tweedledum.profile.v1', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.getByLabel('Config name')).toHaveValue('SmallHands');
  await expect(page.getByText(/The open config, Twiddler-default, was not the ticked layout/)).toBeVisible();
});

test('the Chords page keeps a history of presses, with a multi-character chord as one entry', async ({ page }) => {
  await page.goto('./#/chords');
  // Tapping a chord in the list leaves focus on its button; presses still count after that.
  await page.getByRole('button', { name: /^b 0R00/ }).click();
  await page.keyboard.type('the '); // one burst, as the Twiddler sends it
  await page.waitForTimeout(200);
  await page.keyboard.press('w');
  await page.waitForTimeout(200);
  await page.keyboard.press('Backspace');
  const rows = page.locator('.press');
  await expect(rows).toHaveText([/^BS\s*00L0$/, /^w\s*M00M$/, /^the␣\s*0RR0$/]);
  await expect(page.locator('.explore')).toContainText('BS');
  await rows.nth(2).click();
  await expect(page.locator('.explore')).toContainText('Ends with a space');
  await shot(page, 'chords-pressed');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(rows).toHaveCount(0);
});

test('an unedited built-in layout saved by an older version is rebuilt on opening', async ({ page }) => {
  // SmallHands saved by 0.3.6 had digits on 2L. Opening the Tuner rebuilds it with this version's.
  await page.goto('./#/tuner');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tweedledum.profile.v1') ?? '{}').config?.name)).toBe('Twiddler default');
  await page.addInitScript(() => {
    const p = JSON.parse(localStorage.getItem('tweedledum.profile.v1')!);
    if (p.config?.name !== 'Twiddler default') return;
    // Keep the default's bytes but call it SmallHands: a stale, unedited copy.
    p.config.name = 'SmallHands';
    p.config.edited = false;
    p.layout = { name: 'SmallHands', entries: [['ROOO', 'a']], keys: [] };
    localStorage.setItem('tweedledum.profile.v1', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.getByText(/SmallHands changed in this version/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Download 1\.cfg SmallHands, 118 chords/ })).toBeVisible();
  await page.goto('./#/chords');
  await expect(page.getByText('Waiting for a key.')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('.explore')).toContainText('BL00');
  await expect(page.getByText('B is a barre')).toBeVisible();
  await shot(page, 'chords-barre');
});
