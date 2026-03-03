const { test, expect } = require('@playwright/test');
const path = require('path');

test('bot clears the game and reaches the claw', async ({ page }) => {
  await page.addInitScript(() => {
    window.__QFTC_BOT__ = true;
  });

  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);

  await page.waitForFunction(() => window.__qftc && window.__qftc.getState().gameState !== 'TITLE');
  await page.waitForFunction(() => window.__qftc.getState().victory === true, null, { timeout: 60000 });

  const state = await page.evaluate(() => window.__qftc.getState());
  expect(state.victory).toBeTruthy();
});
