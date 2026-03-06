const { test, expect } = require('@playwright/test');
const path = require('path');

async function loadGame(page) {
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

test('pressing Space detaches from vine every time while attached', async ({ page }) => {
  await loadGame(page);

  const result = await page.evaluate(() => {
    const vineScreens = [1, 3, 5, 7, 10];
    const details = [];

    window.__qftc.enableBot(true);
    window.__qftc.enableBot(false);

    for (const screenIndex of vineScreens) {
      // Let simulation advance to vary vine angle, then snap to vine as an attached state.
      for (let i = 0; i < 45; i++) window.__qftc.step(16.67);

      const attached = window.__qftc.attachToVineForTest(screenIndex, 0);
      if (!attached) {
        details.push({ screenIndex, attached: false, detached: false, reason: 'missing-vine' });
        return { ok: false, details };
      }

      window.__qftc.setInput({ Space: true, ArrowRight: false, ArrowLeft: false });
      window.__qftc.step(16.67);
      const afterDetach = window.__qftc.getState();
      window.__qftc.setInput({ Space: false });

      const detached = afterDetach.player.vine === null;
      details.push({
        screenIndex,
        attached: true,
        detached,
        x: afterDetach.player.x,
        y: afterDetach.player.y,
        vy: afterDetach.player.vy,
      });

      if (!detached) return { ok: false, details };
    }

    return { ok: true, details };
  });

  expect(result.ok, `Vine detach regression details: ${JSON.stringify(result.details)}`).toBeTruthy();
});
