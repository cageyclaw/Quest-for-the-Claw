const { test, expect } = require('@playwright/test');
const path = require('path');

test('start transitions via keyboard and start button', async ({ page }) => {
  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);
  await page.waitForFunction(() => !!window.__qftc);

  await page.waitForFunction(() => window.__qftc.getState().gameState === 'TITLE');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'PLAYING');

  await page.reload();
  await page.waitForFunction(() => !!window.__qftc);
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'TITLE');
  await page.click('#startButton');
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'PLAYING');
});
