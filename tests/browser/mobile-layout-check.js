import { expect } from '@playwright/test';

// Check the actual page at small sizes, including after controls scroll it.
// This supplements visual review and does not measure physical phone speed.
export async function checkMobileLayout(browser, baseUrl) {
  const page = await browser.newPage({
    viewport: { width: 320, height: 568 },
    reducedMotion: 'reduce',
    hasTouch: true
  });
  const fits = async (selector) => {
    const bounds = await page.locator(selector).boundingBox();
    expect(bounds).not.toBeNull();
    const { width, height } = page.viewportSize();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(-1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height + 1);
  };
  try {
    await page.clock.install({ time: new Date('2026-01-01') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto(baseUrl);
    await page.locator('[data-topping="anchovy"]').click();
    await fits('#scene');
    await page.locator('#sprinkle').click();
    await expect(page.locator('body')).toHaveAttribute('data-toppings', '5');
    await fits('#scene');
    await page.screenshot({ path: 'artifacts/screenshots/mobile-prep-small.png' });
    await page.locator('#primary').click();
    await page.clock.fastForward(8100);
    await page.locator('#dispatch').click();
    await page.clock.runFor(50);
    const pickup = await page.locator('#scene').boundingBox();
    expect(pickup.y).toBeGreaterThanOrEqual(-1);
    expect(pickup.y).toBeLessThan(50);
    await page.clock.fastForward(5400);
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [844, 390],
      [768, 1024]
    ]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(100);
      await fits('#run-resume');
      for (const button of await page.locator('[data-run]').all()) {
        const bounds = await button.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
      }
      const prompt = await page.locator('#run-prompt').boundingBox();
      const buttons = await page.locator('.run-buttons').boundingBox();
      expect(prompt.y + prompt.height).toBeLessThanOrEqual(buttons.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width
      );
      await page.screenshot({ path: `artifacts/screenshots/mobile-start-${width}.png` });
      if (width === 320) {
        const client = await page.context().newCDPSession(page);
        const x = prompt.x + prompt.width / 2;
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y: prompt.y + prompt.height - 20, id: 1 }]
        });
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: prompt.y + 30, id: 1 }]
        });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect
          .poll(() => page.locator('#run-prompt').evaluate((el) => el.scrollTop))
          .toBeGreaterThan(0);
        await client.detach();
      }
      await page.locator('#run-resume').click();
      await page.clock.runFor(100);
      await fits('#run-pause');
      await fits('#delivery-sound');
      await page.locator('#run-pause').click();
      await fits('#run-retry');
      await page.locator('#run-retry').click();
      await page.clock.runFor(20);
      await expect(page.locator('#run-condition')).toHaveText('box 100%');
      await page.locator('#run-pause').click();
    }
  } finally {
    await page.close();
  }
}
