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
  await page.getByRole('button', { name: 'TabSpace' }).click();
  await expect(page.getByText(/Loaded TabSpace/)).toBeVisible();
  await page.goto('./#/chords');
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

  await page.goto('./#/settings');
  await page.locator('input[type=file][accept*=".cfg"]').setInputFiles({ name: 'T3Num.cfg', mimeType: 'application/octet-stream', buffer: cfg });
  await expect(page.getByText(/Loaded T3Num.*version 7/)).toBeVisible();
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

test('config editor builds, swaps, edits and downloads a Twiddler 4 config', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByRole('button', { name: /Config editor/ }).click();
  await page.getByRole('button', { name: /Start from the layout in use/ }).click();
  await expect(page.getByText(/Started from Twiddler default/)).toBeVisible();

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
  expect(file.suggestedFilename()).toBe('Twiddler-default.cfg');
  const bytes = new Uint8Array(await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c)));
  expect(bytes[4]).toBe(7);

  await page.getByRole('button', { name: 'Practise with this config' }).click();
  await expect(page.getByText(/Lessons and drills now use/)).toBeVisible();
  await page.goto('./#/chords');
  await page.keyboard.press('1');
  await expect(page.locator('.explore')).toContainText('C+R000');
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
