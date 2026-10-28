import { expect, test, type Page } from '@playwright/test';

/** In-memory stand-in for the game's API: one signed-in Chat player. */
async function fakeServer(page: Page) {
  const record: { id: string; name: string; save: unknown } = { id: 'p1', name: 'Tester', save: null };
  await page.route('**/api/serpent/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/api/serpent/me')) return json(200, { id: record.id, name: record.name });
    if (path.endsWith('/api/serpent/save') && req.method() === 'GET') return json(200, record);
    if (path.endsWith('/api/serpent/save') && req.method() === 'PATCH') {
      Object.assign(record, req.postDataJSON());
      return json(200, { ok: true });
    }
    return json(404, {});
  });
  return record;
}

/** Click at game coordinates (720×1280 canvas). */
async function tap(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + (x * box.width) / 720, box.y + (y * box.height) / 1280);
}

type Win = {
  __ss?: {
    world: {
      state: string;
      ballCount: number;
      ballX: Float64Array;
      ballY: Float64Array;
      setAim(x: number, y: number): void;
      stacks: Record<string, number>;
      snake: { units: { hp: number }[] };
    };
  };
};

test('a new Chat player clears stage 1, picks an upgrade, earns gold and buys a rank', async ({ page }) => {
  const record = await fakeServer(page);
  await page.goto('/');
  await page.waitForTimeout(1500); // signs in as the Chat player and opens the title screen
  await tap(page, 360, 625); // Stages
  await page.waitForTimeout(400);
  await tap(page, 195, 280); // stage 1-1
  await page.waitForTimeout(300);
  await tap(page, 360, 510); // Standard
  await page.waitForFunction(() => (window as unknown as Win).__ss?.world.ballCount);

  // Aim like a player would (tap where the front ball is); weaken the snake so the test is quick.
  await page.evaluate(() => {
    const w = (window as unknown as Win).__ss!.world;
    w.snake.units.forEach((u) => (u.hp = Math.min(u.hp, 10)));
    setInterval(() => w.ballCount && w.setAim(w.ballX[0], w.ballY[0]), 100);
  });
  await page.waitForFunction(() => (window as unknown as Win).__ss!.world.state === 'choosing');
  await page.keyboard.press('1');
  expect(await page.evaluate(() => Object.keys((window as unknown as Win).__ss!.world.stacks).length)).toBe(
    1,
  );
  // Keep picking until the stage is won.
  for (let i = 0; i < 120; i++) {
    const state = await page.evaluate(() => (window as unknown as Win).__ss!.world.state);
    if (state === 'won') break;
    if (state === 'choosing') await page.keyboard.press('1');
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
  const save = () =>
    record.save as {
      gold: number;
      shop: { attack: number };
      stages: Record<string, { cleared: string[] }>;
    };
  expect(save().stages['w1-01'].cleared).toEqual(['standard']);
  const gold = save().gold;
  expect(gold).toBeGreaterThan(0);

  // A first clear of stage 1 pays enough for one Attack rank (cost 10).
  expect(gold).toBeGreaterThanOrEqual(10);
  await tap(page, 360, 1085); // Shop
  await page.waitForTimeout(500);
  await tap(page, 570, 340); // Buy Attack
  await page.waitForTimeout(500);
  expect(save().shop.attack).toBe(1);
});
