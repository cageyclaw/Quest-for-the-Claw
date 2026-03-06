const { test, expect } = require('@playwright/test');
const path = require('path');

test('bot hook runs a short simulation without crashing', async ({ page }) => {
  // Enable deterministic bot mode before the game script runs.
  await page.addInitScript(() => {
    window.__QFTC_BOT__ = true;
  });

  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);

  // Wait for hooks.
  await page.waitForFunction(() => !!window.__qftc);

  const result = await page.evaluate(() => {
    const dt = 1 / 60;
    const steps = 60 * 10; // simulate ~10 seconds of game time
    for (let i = 0; i < steps; i++) {
      window.__qftc.step(dt);
    }
    return window.__qftc.getState();
  });

  expect(result).toBeTruthy();
  expect(result.gameState).toBeTruthy();
  expect(Number.isFinite(result.screenIndex)).toBeTruthy();
});
