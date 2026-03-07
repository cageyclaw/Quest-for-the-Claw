const { test, expect } = require('@playwright/test');
const path = require('path');

async function loadGame(page, { testMode = false } = {}) {
  if (testMode) {
    await page.addInitScript(() => {
      window.__QFTC_TEST__ = true;
    });
  }

  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);
  await page.waitForFunction(() => !!window.__qftc);
}

test('start overlay does not consume Space after entering PLAYING', async ({ page }) => {
  await loadGame(page);

  // First Space starts the game from TITLE.
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__qftc.getState().gameState === 'PLAYING');

  // Advance until player is grounded, then press Space again to jump.
  await page.waitForFunction(() => {
    for (let i = 0; i < 180; i++) window.__qftc.step(16.67);
    return window.__qftc.getState().player.gnd;
  });

  await page.keyboard.down('Space');
  const stateDuringJump = await page.evaluate(() => {
    window.__qftc.step(16.67);
    return window.__qftc.getState();
  });
  await page.keyboard.up('Space');

  expect(stateDuringJump.gameState).toBe('PLAYING');
  expect(stateDuringJump.player.vy).toBeLessThan(0);
  expect(stateDuringJump.player.gnd).toBeFalsy();
});

test('space detaches from vine after auto-grab', async ({ page }) => {
  await loadGame(page, { testMode: true });

  await page.waitForFunction(() => !!window.__qftc._forceAttachVine);

  const result = await page.evaluate(() => {
    window.__qftc.enableBot(true);
    window.__qftc.enableBot(false);

    const attached = window.__qftc._forceAttachVine();
    const before = window.__qftc.getState();

    window.__qftc.setInput({ Space: true });
    for (let i = 0; i < 5; i++) window.__qftc.step(16.67);
    const mid = window.__qftc.getState();
    window.__qftc.step(16.67);
    window.__qftc.setInput({ Space: false });

    const after = window.__qftc.getState();
    return { attached, before, mid, after };
  });

  expect(result.attached).toBeTruthy();
  expect(result.before.player.vine).not.toBeNull();
  expect(result.mid.player.vine).not.toBeNull();
  expect(result.after.player.vine).toBeNull();
  expect(Math.abs(result.after.player.vx) + Math.abs(result.after.player.vy)).toBeGreaterThan(0.1);
});
