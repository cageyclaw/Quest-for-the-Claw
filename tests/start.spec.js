const { test, expect } = require('@playwright/test');
const path = require('path');

test('start transitions via Space/Enter and start button', async ({ page }) => {
  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);
  await page.waitForFunction(() => !!window.__qftc);

  await page.waitForFunction(() => window.__qftc.getState().gameState === 'TITLE');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'PLAYING');

  await page.reload();
  await page.waitForFunction(() => !!window.__qftc);
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'TITLE');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'PLAYING');

  await page.reload();
  await page.waitForFunction(() => !!window.__qftc);
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'TITLE');
  await page.click('#startButton');
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'PLAYING');
});

test('debug toggle responds once per keypress', async ({ page }) => {
  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);
  await page.waitForFunction(() => !!window.__qftc);

  await expect.poll(async () => page.evaluate(() => window.__qftc.getState().debug)).toBe(false);
  await page.keyboard.press('KeyD');
  await expect.poll(async () => page.evaluate(() => window.__qftc.getState().debug)).toBe(true);
  await page.keyboard.press('KeyD');
  await expect.poll(async () => page.evaluate(() => window.__qftc.getState().debug)).toBe(false);
});
