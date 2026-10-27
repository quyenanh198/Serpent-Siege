import { describe, expect, it } from 'vitest';
import { defaultSave } from '../src/meta/save';
import { SaveStore, type KeyValue } from '../src/meta/store';

/** Runs against a real PocketBase with backend/pb_migrations applied. Set PB_URL to enable (CI does). */
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

describe.skipIf(!PB)('PocketBase integration', () => {
  const store = () => new SaveStore(PB!, (url, init) => fetch(url, init), new Mem());
  const name = `test-${Date.now()}`;

  it('create profile, save, load, update', async () => {
    const a = store();
    const p = await a.createProfile(name);
    expect((await a.listProfiles()).some((x) => x.id === p.id)).toBe(true);
    expect(await a.save(p.id, { ...defaultSave(name), gold: 77, updated: 2 })).toBe(true);
    const b = store();
    expect((await b.load(p)).gold).toBe(77);
    await expect(a.createProfile(name)).rejects.toThrow();
  });

  it('delete is refused for non-admins', async () => {
    const list = await store().listProfiles();
    const res = await fetch(`${PB}/api/collections/profiles/records/${list[0].id}`, { method: 'DELETE' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
