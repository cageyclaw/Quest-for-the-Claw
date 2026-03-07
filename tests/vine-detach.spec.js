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

test('space immediately detaches from vine and applies detach cooldown', async ({ page }) => {
  await loadGame(page, { testMode: true });

  await page.waitForFunction(() => !!window.__qftc._forceAttachVine);

  const result = await page.evaluate(() => {
    window.__qftc.enableBot(true);
    window.__qftc.enableBot(false);

    const attached = window.__qftc._forceAttachVine();
    const before = window.__qftc.getState();

    window.__qftc.setInput({ Space: true });
    window.__qftc.step(16.67);
    const detached = window.__qftc.getState();

    // Keep player near vine tip while holding space to ensure no instant re-grab.
    const anchor = { ...detached.player };
    for (let i = 0; i < 3; i++) {
      window.__qftc.step(16.67);
    }
    const cooldownWindow = window.__qftc.getState();

    window.__qftc.setInput({ Space: false });

    return { attached, before, detached, cooldownWindow, anchor };
  });

  expect(result.attached).toBeTruthy();
  expect(result.before.player.vine).not.toBeNull();
  expect(result.detached.player.vine).toBeNull();
  expect(result.detached.player.detachCooldownFrames).toBeGreaterThan(0);
  expect(Math.abs(result.detached.player.vx) + Math.abs(result.detached.player.vy)).toBeGreaterThan(0.1);
  expect(result.cooldownWindow.player.vine).toBeNull();
});
