import { expect, test } from '@playwright/test';

// The document is pinned; screens scroll inside <main>. A regression: #app had no height, so
// <main> grew to its content and nothing could scroll on a phone.
for (const path of ['#/practice', '#/lessons', '#/settings', '#/chords']) {
  test(`${path} scrolls`, async ({ page, browserName, isMobile }) => {
    await page.goto(`./${path}`);
    const main = page.locator('main');
    const box = await main.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await main.evaluate((m) => m.scrollHeight > m.clientHeight)).toBe(true);
    // Playwright has no mouse wheel in mobile WebKit; the size checks above cover it there.
    if (browserName === 'webkit' && isMobile) return;
    const before = await main.evaluate((m) => m.scrollTop);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeGreaterThan(before);
  });
}

test('touch drag scrolls Practice', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch events need Chromium');
  await page.goto('./#/practice');
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize()!;
  const x = vp.width / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: vp.height - 150 }] });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: vp.height - 150 - i * 40 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.locator('main').evaluate((m) => m.scrollTop)).toBeGreaterThan(0);
});
