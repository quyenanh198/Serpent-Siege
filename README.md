# Serpent Siege

Zuma-style snake shooter for a few friends, designed first for desktop browsers with a 1280 × 800 landscape gameplay board. The menus remain portrait. A turret fires on its own;
tap or drag to aim it at a snake of 4-ball segments before the snake reaches the end of the path. Break golden
upgrade balls for run upgrades, earn gold, and buy permanent upgrades in the shop. 20 stages in 2 worlds, each with
Standard / Hard / Extreme, plus an endless mode. Three illustrated gameplay maps rotate across the stages.

Private game for the family: it runs on the Lazybutts hub (Ken's Mac mini) at
`https://chat.lazybutts.com/serpent/`, inside the family Chat. Players are Chat accounts: the game server asks Chat
who the session cookie belongs to, so there is no separate sign-in and progress follows the account to any device.

## How it plugs into Chat

- PocketBase serves the game and keeps one `profiles` record per Chat user (`chat_id`, `name`, `save`).
- `backend/pb_hooks/` adds the game's only API, `/api/serpent/me` and `/api/serpent/save`. Each request forwards just
  the `lb_session` cookie to Chat's `GET /api/me` (`CHAT_API_URL`, default `http://chat:8082`; answers cached 10 s).
  No session means `401`, and the game shows "Sign in to Lazybutts Chat".
- The generic PocketBase records API is closed to everyone except the superuser, so a player can only reach their own
  save. On the hub, Caddy also keeps the admin UI (`/_/`) and every other `/api/*` path off the internet.
- The client works under any path (`/serpent/` on the hub): assets and API calls are relative to `index.html`.
- On the hub it is deployed like the other apps: `apps/serpent-siege` submodule, `scripts/deploy.sh serpent --build`.

The standalone instructions below still work on a LAN, but every player now needs a Chat session (set `CHAT_API_URL`).

## Play on the Mac mini (OrbStack)

One-time setup, in Terminal on the Mac mini:

```sh
# 1. Install OrbStack (https://orbstack.dev) and open it once. In OrbStack settings, turn on "Start at login".
# 2. Get the code
git clone https://github.com/quyenanh198/Serpent-Siege.git ~/serpent-siege
cd ~/serpent-siege
# 3. Build and start (first build takes a few minutes)
docker compose up -d --build
# 4. Check it
curl http://127.0.0.1:8090/api/health
# 5. Create the admin account for the database UI (pick your own email + password)
docker compose exec pocketbase /pb/pocketbase superuser upsert you@example.com 'a-long-password' --dir=/pb/pb_data
```

Then on any phone or PC on the same Wi-Fi, open `http://<mac-mini-name>.local:8090` (or `http://<mac-mini-ip>:8090`).
Find the name in System Settings → General → Sharing → Local hostname. On phones, use "Add to Home Screen" for a
full-screen app icon.

- **Update to the latest version:** `cd ~/serpent-siege && ./deploy.sh`
- **Admin UI (see or fix saves):** `http://<mac-mini-name>.local:8090/_/`
- **Backups:** the database lives in `~/serpent-siege/backend/pb_data/`. Time Machine covers it, or copy that folder.
- **After a reboot:** OrbStack starts at login and the container has `restart: unless-stopped`, so the game comes back on its own.

## Development

```sh
npm ci
npm run dev        # game at http://localhost:5173 (expects PocketBase on :8090 for saves; works offline too)
node tests/fake-chat.mjs 8082 &   # fake Chat for local saves: set the cookie lb_session=alice (or bob) in the browser
npm test           # unit, balance and save tests (set PB_URL to also run the PocketBase integration test)
npm run e2e        # Playwright: new player clears stage 1, picks an upgrade, buys a shop rank
npm run lint && npm run typecheck
```

To run PocketBase locally without Docker: download it from https://pocketbase.io and run
`CHAT_API_URL=http://127.0.0.1:8082 pocketbase serve --dir=backend/pb_data --migrationsDir=backend/pb_migrations --hooksDir=backend/pb_hooks`.

### Layout

- `src/core/` deterministic game rules (no Phaser): path, snake, shooter, run upgrades, stats, difficulty, sim.
  All numbers are in `src/core/data/*.json`. Stage maps are committed JSON in `src/core/stages/`.
- `src/meta/` gold, shop, unlocks, save format and the PocketBase save store.
- `src/game/` Phaser scenes, textures, audio.
- `tools/` dev-only: `generate-maps.ts` (maps are generated before launch, never at runtime), `sim-bot.ts`,
  `tune-stages.ts`, `pacing-bot.ts` (real-game pacing check).
- `backend/pb_migrations/` the `profiles` collection schema.

### Balance tools

- `npm run sim -- 5 hard 20 10` plays stage 5 on Hard with 20 Attack and 10 Attack-speed ranks (bot with perfect aim).
- `npx tsx tools/pacing-bot.ts` plays the whole Standard campaign, buying shop ranks with the gold it earns.
- `npx tsx tools/tune-stages.ts` evens out map difficulty by writing `src/core/data/hpTweaks.json`.
