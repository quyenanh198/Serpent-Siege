import { describe, expect, it } from 'vitest';
import { defaultSave } from '../src/meta/save';
import { SaveStore, type KeyValue } from '../src/meta/store';

/**
 * Runs against a real PocketBase with backend/pb_migrations and backend/pb_hooks, whose
 * CHAT_API_URL points at a fake Chat that knows the sessions "alice" (id 1) and "bob" (id 2).
 * Set PB_URL to enable (CI does).
 */
const PB = process.env.PB_URL;

class Mem implements KeyValue {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const as = (session: string | null) =>
  new SaveStore(
    PB!,
    (url, init) =>
      fetch(url, {
        ...init,
        headers: { ...(init?.headers ?? {}), ...(session ? { Cookie: `lb_session=${session}` } : {}) },
      }),
    new Mem(),
  );

describe.skipIf(!PB)('PocketBase integration', () => {
  it('signs in through Chat, saves and loads; each player sees only their own save', async () => {
    const who = await as('alice').whoami();
    expect(who.kind).toBe('player');
    const p = (who as { kind: 'player'; profile: { id: string; name: string } }).profile;
    expect(await as('alice').save(p.id, { ...defaultSave(p.name), gold: 77, updated: 2 })).toBe(true);
    expect((await as('alice').load(p)).gold).toBe(77);

    const bob = (await as('bob').whoami()) as { kind: 'player'; profile: { id: string; name: string } };
    expect(bob.profile.id).not.toBe(p.id);
    expect((await as('bob').load(bob.profile)).gold).toBe(0);
  });

  it('without a Chat session the player is asked to sign in', async () => {
    expect(await as(null).whoami()).toEqual({ kind: 'login' });
    const res = await fetch(`${PB}/api/serpent/save`);
    expect(res.status).toBe(401);
  });

  it('the generic records API is closed', async () => {
    expect((await fetch(`${PB}/api/collections/profiles/records`)).status).toBeGreaterThanOrEqual(400);
    const create = await fetch(`${PB}/api/collections/profiles/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    expect(create.status).toBeGreaterThanOrEqual(400);
  });
});
