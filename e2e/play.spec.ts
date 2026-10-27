import { expect, test, type Page } from '@playwright/test';

/** In-memory stand-in for the PocketBase profiles API. */
async function fakeServer(page: Page) {
  const records = new Map<string, Record<string, unknown>>();
  await page.route('**/api/collections/profiles/records**', async (route) => {
    const req = route.request();
    const id = new URL(req.url()).pathname.split('/records/')[1];
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'GET' && !id) return json(200, { items: [...records.values()] });
    if (req.method() === 'GET') return json(200, records.get(id));
    if (req.method() === 'POST') {
      const rec = { id: `p${records.size + 1}`, ...req.postDataJSON() };
      records.set(rec.id, rec);
      return json(200, rec);
    }
    if (req.method() === 'PATCH') {
      Object.assign(records.get(id)!, req.postDataJSON());
      return json(200, records.get(id));
    }
    return json(405, {});
  });
  return records;
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

test('new player clears stage 1, picks an upgrade, earns gold and buys a rank', async ({ page }) => {
  const records = await fakeServer(page);
  page.on('dialog', (d) => d.accept('Tester'));
  await page.goto('/');
  await page.waitForTimeout(1000);
  await tap(page, 360, 420); // + New player (no profiles yet)
  await page.waitForTimeout(800);
  await tap(page, 360, 560); // Stages
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
    [...records.values()][0].save as {
      gold: number;
      shop: { attack: number };
      stages: Record<string, { cleared: string[] }>;
    };
  expect(save().stages['w1-01'].cleared).toEqual(['standard']);
  const gold = save().gold;
  expect(gold).toBeGreaterThan(0);

  // A first clear of stage 1 pays enough for one Attack rank (cost 10).
  expect(gold).toBeGreaterThanOrEqual(10);
  await tap(page, 360, 1030); // Shop
  await page.waitForTimeout(500);
  await tap(page, 570, 340); // Buy Attack
  await page.waitForTimeout(500);
  expect(save().shop.attack).toBe(1);
});
