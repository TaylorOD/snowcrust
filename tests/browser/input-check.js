import { expect } from '@playwright/test';

// Exercise the real input controller in a small browser fixture. The model's
// collision and movement tests cover what happens after these actions arrive.
export async function checkDeliveryInputs(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 }, hasTouch: true });
  await page.route('**/__input_check__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<link rel="stylesheet" href="/src/styles/delivery.css"><div id="scene" tabindex="0" style="position:relative;width:800px;height:600px;touch-action:none"></div><input id="typing">'
    })
  );
  try {
    await page.goto(new URL('__input_check__', baseUrl).href);
    await page.evaluate(async () => {
      const { createDeliveryControls } = await import('/src/ui/delivery-controls.js');
      window.inputLog = [];
      window.controls = createDeliveryControls(document.getElementById('scene'), {
        action: (name) => window.inputLog.push(name),
        pause: () => window.inputLog.push('pause'),
        resume: () => {},
        retry: () => {}
      });
      window.controls.show('input check');
      window.controls.paused(false);
    });
    const log = () => page.evaluate(() => window.inputLog);
    const clear = () =>
      page.evaluate(() => {
        window.inputLog = [];
      });
    await page.locator('#scene').focus();
    for (const key of [
      'ArrowLeft',
      'a',
      'ArrowRight',
      'd',
      'ArrowUp',
      'w',
      'ArrowDown',
      's',
      'Space',
      'Escape'
    ])
      await page.keyboard.press(key);
    expect(await log()).toEqual([
      'left',
      'left',
      'right',
      'right',
      'jump',
      'jump',
      'duck',
      'duck',
      'hook',
      'pause'
    ]);

    await clear();
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowRight');
    await page.keyboard.up('ArrowRight');
    expect(await log()).toEqual(['right']);

    await clear();
    await page.locator('#typing').fill('');
    await page.keyboard.type('wasd ');
    expect(await log()).toEqual([]);
    await page.locator('#run-hook').focus();
    await page.keyboard.press('Space');
    expect(await log()).toEqual(['hook']);

    await clear();
    const client = await page.context().newCDPSession(page);
    for (const [dx, dy] of [
      [-100, 0],
      [100, 0],
      [0, -100],
      [0, 100],
      [10, 10]
    ]) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 350, y: 300, id: 1 }]
      });
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 350 + dx, y: 300 + dy, id: 1 }]
      });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    expect(await log()).toEqual(['left', 'right', 'jump', 'duck']);
    await clear();
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 350, y: 300, id: 1 }]
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    expect(await log()).toEqual([]);
    await client.detach();

    // Model a visibility event explicitly. This tests the handler, not real
    // operating system tab switching or mobile app suspension.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await log()).toEqual(['pause']);
    await clear();
    await page.evaluate(() => window.controls.hide());
    await page.keyboard.press('a');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(await log()).toEqual([]);
  } finally {
    await page.close();
  }
}
