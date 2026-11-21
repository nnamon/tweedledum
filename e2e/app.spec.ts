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
