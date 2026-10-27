import { describe, expect, it } from 'vitest';
import { defaultSave } from '../src/meta/save';
import { SaveStore, type FetchFn, type KeyValue } from '../src/meta/store';

class Mem implements KeyValue {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

/** Tiny fake of the /api/serpent routes: the "session" decides who is calling. */
function fakeServer() {
  const records = new Map<number, { id: string; name: string; save: unknown; save_backup?: unknown }>();
  let down = false;
  const as =
    (chatId: number | null, name = `user${chatId}`): FetchFn =>
    async (url, init) => {
      if (down) throw new Error('offline');
      const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body });
      if (chatId === null) return reply(401, { error: 'not_logged_in' });
      if (!records.has(chatId)) records.set(chatId, { id: `r${chatId}`, name, save: null });
      const rec = records.get(chatId)!;
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/serpent/me')) return reply(200, { id: rec.id, name: rec.name });
      if (url.endsWith('/api/serpent/save') && method === 'GET') return reply(200, rec);
      if (url.endsWith('/api/serpent/save') && method === 'PATCH') {
        Object.assign(rec, JSON.parse(init!.body!));
        return reply(200, { ok: true });
      }
      return reply(404, {});
    };
  return { records, as, setDown: (v: boolean) => (down = v) };
}

describe('save store', () => {
  it('signs in as the Chat account, saves and loads; another device sees the same progress', async () => {
    const srv = fakeServer();
    const store = new SaveStore('', srv.as(7, 'Ken'), new Mem());
    const who = await store.whoami();
    expect(who).toEqual({ kind: 'player', profile: { id: 'r7', name: 'Ken' } });
    const p = who.kind === 'player' ? who.profile : null;
    expect((await store.load(p!)).gold).toBe(0); // first visit: fresh save
    await store.save(p!.id, { ...defaultSave('Ken'), gold: 42, updated: 1 });
    const other = new SaveStore('', srv.as(7, 'Ken'), new Mem());
    expect((await other.load(p!)).gold).toBe(42);
  });

  it('players only ever reach their own save', async () => {
    const srv = fakeServer();
    const a = new SaveStore('', srv.as(1), new Mem());
    const b = new SaveStore('', srv.as(2), new Mem());
    const pa = (await a.whoami()) as { kind: 'player'; profile: { id: string; name: string } };
    const pb = (await b.whoami()) as { kind: 'player'; profile: { id: string; name: string } };
    await a.save(pa.profile.id, { ...defaultSave('a'), gold: 5, updated: 1 });
    expect((await b.load(pb.profile)).gold).toBe(0);
  });

  it('asks to sign in to Chat without a session', async () => {
    const srv = fakeServer();
    expect(await new SaveStore('', srv.as(null), new Mem()).whoami()).toEqual({ kind: 'login' });
  });

  it('falls back to the local cache when the server is down, then syncs the newer copy', async () => {
    const srv = fakeServer();
    const mem = new Mem();
    const store = new SaveStore('', srv.as(3, 'Ana'), mem);
    const who = await store.whoami();
    const p = who.kind === 'player' ? who.profile : null;
    srv.setDown(true);
    expect(await store.save(p!.id, { ...defaultSave('Ana'), gold: 7, updated: 5 })).toBe(false);
    expect(store.online).toBe(false);
    expect((await store.load(p!)).gold).toBe(7);
    // Offline, the last player on this device keeps playing.
    expect(await store.whoami()).toEqual({ kind: 'player', profile: p });
    srv.setDown(false);
    expect((await store.load(p!)).gold).toBe(7);
    expect((srv.records.get(3)!.save as { gold: number }).gold).toBe(7);
  });

  it('offline on a device that never signed in plays locally', async () => {
    const srv = fakeServer();
    srv.setDown(true);
    expect(await new SaveStore('', srv.as(4), new Mem()).whoami()).toEqual({ kind: 'offline' });
  });

  it('a corrupt server save falls back to defaults and is kept in save_backup', async () => {
    const srv = fakeServer();
    const store = new SaveStore('', srv.as(5, 'Bo'), new Mem());
    const who = await store.whoami();
    srv.records.get(5)!.save = 'garbage';
    const s = await store.load((who as { kind: 'player'; profile: { id: string; name: string } }).profile);
    expect(s.gold).toBe(0);
    expect(srv.records.get(5)!.save_backup).toBe('garbage');
  });
});
