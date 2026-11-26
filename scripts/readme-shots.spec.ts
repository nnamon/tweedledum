import { expect, test, type Page } from '@playwright/test';

const DESKTOP = { width: 1200, height: 720 };
const PHONE = { width: 390, height: 680 };

// Keys go in at a learner's pace, so the speed on the run screen is one a person could type.
async function typeAtPace(page: Page, text: string) {
  let seed = 7;
  for (const ch of text) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    await page.waitForTimeout(240 + (seed % 200));
    await page.keyboard.press(ch === ' ' ? 'Space' : ch);
  }
}

async function startLesson(page: Page, n: number) {
  await page.goto('./#/lessons');
  await page.locator('button.row').filter({ has: page.locator('.num', { hasText: new RegExp(`^${n}$`) }) }).click();
  await expect(page.getByRole('heading', { name: `Lesson ${n}` })).toBeVisible();
}

for (const scheme of ['light', 'dark'] as const) {
  for (const [device, viewport] of [['desktop', DESKTOP], ['phone', PHONE]] as const) {
    test.describe(`${device} ${scheme}`, () => {
      test.use({ viewport, deviceScaleFactor: 2, colorScheme: scheme, hasTouch: device === 'phone', isMobile: device === 'phone' });
      const shot = (page: Page, name: string) => page.screenshot({ path: `assets/screenshots/${name}-${device}-${scheme}.png` });

      test('run', async ({ page }) => {
        await startLesson(page, 250);
        await typeAtPace(page, 'On clear nights you can see the lif');
        await typeAtPace(page, 'ghts of the next t');
        await shot(page, 'run');
      });

      test('practice', async ({ page }) => {
        test.skip(device !== 'phone', 'only the phone shot is used');
        await page.goto('./#/practice');
        await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
        await shot(page, 'practice');
      });

      test('chords', async ({ page }) => {
        await page.goto('./#/chords');
        await expect(page.getByText('Waiting for a key.')).toBeVisible();
        await page.keyboard.press('r');
        await expect(page.locator('.explore')).toContainText('MR00');
        await shot(page, 'chords');
      });

      test('tuner', async ({ page }) => {
        test.skip(device !== 'desktop', 'only the desktop shot is used');
        await page.goto('./#/tuner');
        await page.getByRole('radio', { name: /^SmallHands/ }).click();
        await expect(page.getByText(/Switched to SmallHands/)).toBeVisible();
        await page.getByText('SmallHands profile', { exact: true }).scrollIntoViewIfNeeded();
        await shot(page, 'tuner');
      });
    });
  }
}
