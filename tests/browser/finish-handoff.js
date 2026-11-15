import { expect } from '@playwright/test';

export async function finishHandoff(page, clock = true) {
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'arriving');
  if (clock) await page.clock.fastForward(2200);
  await expect(page.locator('#handover')).toBeEnabled();
  const time = await page.locator('#order-clock').textContent();
  await page.locator('#handover').click();
  if (clock) await page.clock.fastForward(6500);
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'dispatched', { timeout: 10000 });
  await expect(page.locator('#order-clock')).toHaveText(time);
}
