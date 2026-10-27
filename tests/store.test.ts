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

/** Tiny fake of the PocketBase records API. */
function fakeServer() {
  const records = new Map<string, Record<string, unknown>>();
  let down = false;
  let n = 0;
  const fetchFn: FetchFn = async (url, init) => {
    if (down) throw new Error('offline');
    const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body });
    const m = url.match(/records\/?([^?]*)/)!;
    const id = m[1];
    const method = init?.method ?? 'GET';
    if (method === 'GET' && !id) return reply(200, { items: [...records.values()] });
    if (method === 'GET') return records.has(id) ? reply(200, records.get(id)) : reply(404, {});
    if (method === 'POST') {
      const body = JSON.parse(init!.body!);
      if ([...records.values()].some((r) => r.name === body.name)) return reply(400, {});
      const rec = { id: `r${++n}`, ...body };
      records.set(rec.id, rec);
      return reply(200, rec);
    }
    if (method === 'PATCH') {
      Object.assign(records.get(id)!, JSON.parse(init!.body!));
      return reply(200, records.get(id));
    }
    return reply(405, {});
  };
  return { records, fetchFn, setDown: (v: boolean) => (down = v) };
}

describe('save store', () => {
  it('creates, lists, saves and loads a profile', async () => {
    const srv = fakeServer();
    const store = new SaveStore('', srv.fetchFn, new Mem());
    const p = await store.createProfile('Ken');
    expect(await store.listProfiles()).toEqual([{ id: p.id, name: 'Ken' }]);
    await store.save(p.id, { ...defaultSave('Ken'), gold: 42, updated: 1 });
    // a second device sees the same progress
    const other = new SaveStore('', srv.fetchFn, new Mem());
    expect((await other.load(p)).gold).toBe(42);
  });

  it('duplicate names are refused', async () => {
    const srv = fakeServer();
    const store = new SaveStore('', srv.fetchFn, new Mem());
    await store.createProfile('Ken');
    await expect(store.createProfile('Ken')).rejects.toThrow();
  });

  it('falls back to the local cache when the server is down, then syncs the newer copy', async () => {
    const srv = fakeServer();
    const mem = new Mem();
    const store = new SaveStore('', srv.fetchFn, mem);
    const p = await store.createProfile('Ana');
    srv.setDown(true);
    expect(await store.save(p.id, { ...defaultSave('Ana'), gold: 7, updated: 5 })).toBe(false);
    expect(store.online).toBe(false);
    expect((await store.load(p)).gold).toBe(7);
    expect(await store.listProfiles()).toEqual([p]);
    srv.setDown(false);
    expect((await store.load(p)).gold).toBe(7);
    expect((srv.records.get(p.id)!.save as { gold: number }).gold).toBe(7);
  });

  it('a corrupt server save falls back to defaults and is kept in save_backup', async () => {
    const srv = fakeServer();
    const store = new SaveStore('', srv.fetchFn, new Mem());
    const p = await store.createProfile('Bo');
    srv.records.get(p.id)!.save = 'garbage';
    const s = await store.load(p);
    expect(s.gold).toBe(0);
    expect(srv.records.get(p.id)!.save_backup).toBe('garbage');
  });
});
