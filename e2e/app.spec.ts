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
