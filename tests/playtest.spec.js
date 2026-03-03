const { test, expect } = require('@playwright/test');
const path = require('path');

test('bot clears the game and reaches the claw', async ({ page }) => {
  // Enable deterministic bot mode before the game script runs.
  await page.addInitScript(() => {
    window.__QFTC_BOT__ = true;
  });

  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);

  // Wait for hooks.
  await page.waitForFunction(() => !!window.__qftc);

  // Run the game as a fast simulation using the exposed step/tick hook instead of real-time waiting.
  const result = await page.evaluate(() => {
    const dt = 1 / 60;
    const maxSteps = 60 * 180; // simulate up to 3 minutes of game time

    for (let i = 0; i < maxSteps; i++) {
      window.__qftc.step(dt);
      const s = window.__qftc.getState();
      if (s.victory) return { ok: true, steps: i, state: s };
      if (s.gameState === 'GAMEOVER') return { ok: false, steps: i, state: s, reason: 'gameover' };
    }

    return { ok: false, steps: maxSteps, state: window.__qftc.getState(), reason: 'timeout' };
  });

  expect(result.ok, `Bot did not reach victory (reason=${result.reason}). Screen=${result.state.screenIndex} x=${result.state.player.x} y=${result.state.player.y}`).toBeTruthy();
  expect(result.state.victory).toBeTruthy();
});
