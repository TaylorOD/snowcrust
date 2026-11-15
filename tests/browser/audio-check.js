import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    window.audioGraphs = [];
    const NativeAudio = window.AudioContext;
    window.AudioContext = class extends NativeAudio {
      constructor() {
        super();
        this.gains = [];
        window.audioGraphs.push(this);
      }
      createGain() {
        const gain = super.createGain();
        this.gains.push(gain);
        return gain;
      }
    };
  });
  await page.clock.install({ time: new Date('2026-01-01') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5177');
  await page.locator('#primary').click();
  await page.clock.fastForward(8100);
  await page.locator('#dispatch').click();
  await page.clock.fastForward(5400);
  expect(await page.evaluate(() => window.audioGraphs.length)).toBe(0);
  await page.locator('#delivery-sound').click();
  await expect(page.locator('#delivery-sound')).toHaveText('sound on');
  await expect
    .poll(() => page.evaluate(() => window.audioGraphs[0].gains[0].gain.value))
    .toBeGreaterThan(0.3);
  await page.locator('#run-resume').click();
  await page.clock.fastForward(250);
  await expect
    .poll(() => page.evaluate(() => window.audioGraphs[0].gains[1].gain.value))
    .toBeGreaterThan(0.01);
  await page.locator('#run-pause').click();
  await expect
    .poll(() => page.evaluate(() => window.audioGraphs[0].gains[1].gain.value))
    .toBeLessThan(0.001);
  await page.locator('#delivery-sound').click();
  await expect
    .poll(() => page.evaluate(() => window.audioGraphs[0].gains[0].gain.value))
    .toBeLessThan(0.001);
  expect(await page.evaluate(() => window.audioGraphs.length)).toBe(1);
  await page.locator('#scene').screenshot({ path: 'artifacts/screenshots/delivery-sound.png' });
  console.log('sound starts only on request, pauses, mutes and reuses its audio graph');
} finally {
  await browser.close();
}
