const { test, expect } = require('@playwright/test');
const path = require('path');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__QFTC_TEST__ = true;
  });
  const filePath = path.resolve(__dirname, '..', 'index.html');
  await page.goto(`file://${filePath}`);
  await page.waitForFunction(() => !!window.__qftc);
});

test('water and crocWater surfaces are flush with ground platforms', async ({ page }) => {
  const result = await page.evaluate(() => {
    const screens = window.__qftc.getScreens();
    const bad = [];

    screens.forEach((s, i) => {
      const hazards = [...(s.water || []), ...(s.crocWater ? [s.crocWater] : [])];
      if (!hazards.length) return;
      const platformY = Math.min(...(s.p || []).map((p) => p.y));
      hazards.forEach((h) => {
        if (h.y !== platformY) bad.push({ screen: i, hazardY: h.y, platformY });
      });
    });

    return { ok: bad.length === 0, bad };
  });

  expect(result.ok, `Found non-flush water surfaces: ${JSON.stringify(result.bad)}`).toBeTruthy();
});

test('water hazard collision triggers right at visible surface', async ({ page }) => {
  const result = await page.evaluate(() => {
    // screen 1 has plain water
    window.__qftc._setScreen(1);
    const screen = window.__qftc.getScreens()[1];
    const w = screen.water[0];

    // Put player one pixel above the visible water line and falling.
    window.__qftc._setGameState('PLAYING');
    window.__qftc._setInvuln(0);
    window.__qftc._setPlayer({ x: w.x + 20, y: w.y - 31, vx: 0, vy: 2, gnd: false });

    const before = window.__qftc.getState();
    window.__qftc.step(16.67);
    const after = window.__qftc.getState();

    return { beforeLives: before.lives, afterLives: after.lives };
  });

  expect(result.afterLives).toBe(result.beforeLives - 1);
});

test('croc screen crocs are sleeping/closed and crossing remains feasible for bot', async ({ page }) => {
  const result = await page.evaluate(() => {
    const crocScreenIndex = 8;
    const screens = window.__qftc.getScreens();
    const crocs = screens[crocScreenIndex].crocs || [];
    const allSleepingConfigured = crocs.length > 0 && crocs.every((c) => c.sleeping === true);

    // Let bot run from start and ensure it can still win.
    window.__qftc.enableBot(true);
    const maxSteps = 60 * 180;
    for (let i = 0; i < maxSteps; i++) {
      window.__qftc.step(16.67);
      const s = window.__qftc.getState();
      if (s.victory) return { allSleepingConfigured, victory: true };
      if (s.gameOver) return { allSleepingConfigured, victory: false, reason: 'gameover' };
    }

    return { allSleepingConfigured, victory: false, reason: 'timeout' };
  });

  expect(result.allSleepingConfigured).toBeTruthy();
  expect(result.victory, `Bot could not finish with sleeping crocs (${result.reason || 'unknown'}).`).toBeTruthy();
});
