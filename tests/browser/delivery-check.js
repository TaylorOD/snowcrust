import { finishHandoff } from './finish-handoff.js';
import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 1050],
    ['mobile', 390, 844]
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: 'reduce',
      hasTouch: name === 'mobile'
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    await page.clock.install({ time: new Date('2026-01-01') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5177');
    await page.locator('#primary').click();
    await page.clock.fastForward(8100);
    await page.locator('#dispatch').click();
    await page.clock.fastForward(5400);
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'running');
    const time = await page.locator('#order-clock').textContent();
    await page.clock.fastForward(10000);
    await expect(page.locator('#order-clock')).toHaveText(time);
    await page.locator('#run-resume').click();
    if (name === 'desktop') await page.keyboard.press('ArrowLeft');
    else {
      const client = await page.context().newCDPSession(page);
      const bounds = await page.locator('#scene').boundingBox();
      const start = { x: bounds.x + 220, y: bounds.y + 200, id: 1 };
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ ...start, x: start.x - 110 }]
      });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
    }
    await page.clock.runFor(700);
    await expect(page.locator('body')).toHaveAttribute('data-run-lane', '-1');
    await page
      .locator('#scene')
      .screenshot({ path: 'artifacts/screenshots/delivery-' + name + '.png' });
    if (name === 'mobile') {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.clock.runFor(100);
      const hud = await page.locator('.run-hud').boundingBox();
      expect(hud.y).toBeGreaterThanOrEqual(0);
      await page.screenshot({ path: 'artifacts/screenshots/delivery-rotated.png' });
      await page.setViewportSize({ width, height });
      await page.clock.runFor(100);
    }
    await page.locator('[data-run="right"]').click();
    await page.clock.runFor(700);
    await page.locator('#run-pause').click();
    const distance = await page.locator('body').getAttribute('data-run-distance');
    await page.clock.fastForward(5000);
    await expect(page.locator('body')).toHaveAttribute('data-run-distance', distance);
    await page.locator('#run-resume').click();
    for (let i = 0; i < 280; i++) await page.clock.fastForward(250);
    await finishHandoff(page);
    await page
      .locator('#scene')
      .screenshot({ path: 'artifacts/screenshots/handoff-' + name + '.png' });
    await expect(page.locator('#receipt-condition')).toContainText('pizza condition');
    const receipt = await page.locator('#receipt-condition').textContent();
    const recordedTime = await page.locator('#receipt-time').textContent();
    await page.locator('#replay').click();
    await page.clock.fastForward(5400);
    await finishHandoff(page);
    await expect(page.locator('#receipt-condition')).toHaveText(receipt);
    await expect(page.locator('#receipt-time')).toHaveText(recordedTime);
    await page.locator('#practice').click();
    await expect(page.locator('#run-address')).toContainText('practice');
    await page.locator('#run-assist').check();
    await page.locator('#run-resume').click();
    for (let i = 0; i < 380; i++) await page.clock.fastForward(250);
    await finishHandoff(page);
    await expect(page.locator('#practice-summary')).toContainText('original receipt kept');
    await page.screenshot({
      path: 'artifacts/screenshots/practice-' + name + '.png',
      fullPage: true
    });
    await expect(page.locator('#receipt-condition')).toHaveText(receipt);
    await expect(page.locator('#receipt-time')).toHaveText(recordedTime);
    await page.locator('#reset').click();
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'prep');
    await expect(page.locator('#run-panel')).toBeHidden();
    await expect(page.locator('#order-clock')).toHaveText('2:00 left');
    expect(errors).toEqual([]);
    await page.close();
  }
  console.log('playable delivery, controls, pause, arrival and reset passed');
} finally {
  await browser.close();
}
