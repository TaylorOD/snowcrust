import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  for (const [device, width, height] of [
    ['desktop', 1440, 1050],
    ['mobile', 390, 844]
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.liveBuffers = 0;
      for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
        const create = Context.prototype.createBuffer,
          remove = Context.prototype.deleteBuffer;
        Context.prototype.createBuffer = function () {
          const buffer = create.call(this);
          if (buffer) window.liveBuffers++;
          return buffer;
        };
        Context.prototype.deleteBuffer = function (buffer) {
          if (buffer) window.liveBuffers--;
          return remove.call(this, buffer);
        };
      }
    });
    await page.clock.install({ time: new Date('2026-01-01') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5177');
    let warmBuffers = 0;
    const callers = new Set();
    for (let i = 0; i < (device === 'desktop' ? 12 : 6); i++) {
      const caller = await page.locator('#caller-name').textContent();
      callers.add(caller);
      await page.locator('#special').click();
      await page.locator('#primary').click();
      await page.clock.fastForward(8100);
      await page.locator('#primary').click();
      await page.locator('#bite').click();
      await page.locator('#assisted-delivery').check();
      await page.locator('#dispatch').click();
      await page.clock.fastForward(5400);
      await page.clock.fastForward(2200);
      const time = await page.locator('#order-clock').textContent();
      const name = caller.toLowerCase().replaceAll(' ', '-');
      if (i < 6)
        await page
          .locator('#scene')
          .screenshot({ path: `artifacts/screenshots/door-${name}-${device}.png` });
      await page.locator('#handover').click();
      await page.clock.fastForward(4000);
      await expect(page.locator('#customer-reaction')).toContainText('bite');
      if (i < 6)
        await page
          .locator('#scene')
          .screenshot({ path: `artifacts/screenshots/box-${name}-${device}.png` });
      await page.clock.fastForward(2500);
      await expect(page.locator('body')).toHaveAttribute('data-mode', 'dispatched');
      await expect(page.locator('#order-clock')).toHaveText(time);
      const buffers = await page.evaluate(() => window.liveBuffers);
      if (i === 5) {
        warmBuffers = buffers;
        expect(buffers).toBeGreaterThan(0);
      }
      if (i > 5) expect(buffers).toBe(warmBuffers);
      await page.locator('#primary').click();
    }
    expect(callers.size).toBe(6);
    expect(errors).toEqual([]);
    await page.close();
  }
  console.log(
    'all customer doorsteps, bite reveal, frozen receipt and repeated delivery GPU buffers passed'
  );
} finally {
  await browser.close();
}
