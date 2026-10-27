import { defaultSave, migrateSave, type SaveData } from './save';

export interface Profile {
  id: string;
  name: string;
}

/** Minimal storage + fetch interfaces so the store can be tested without a browser. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type FetchFn = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const COLLECTION = '/api/collections/profiles/records';
const CACHE = 'serpent-siege:cache:';
const PROFILES = 'serpent-siege:profiles';

/**
 * Saves live in PocketBase (`profiles` collection: name, save JSON). Every save is also cached
 * locally, so a short server outage never loses a run; the newer copy wins on the next load.
 */
export class SaveStore {
  online = true;

  constructor(
    private readonly base: string,
    private readonly fetchFn: FetchFn,
    private readonly storage: KeyValue,
  ) {}

  async listProfiles(): Promise<Profile[]> {
    try {
      const res = await this.fetchFn(`${this.base}${COLLECTION}?perPage=200&sort=name&fields=id,name`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { items: Profile[] };
      this.online = true;
      const list = body.items.map((p) => ({ id: p.id, name: p.name }));
      this.storage.setItem(PROFILES, JSON.stringify(list));
      return list;
    } catch {
      this.online = false;
      return this.cachedProfiles();
    }
  }

  async createProfile(name: string): Promise<Profile> {
    const save = defaultSave(name);
    const res = await this.fetchFn(`${this.base}${COLLECTION}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, save }),
    });
    if (!res.ok)
      throw new Error(res.status === 400 ? 'That name is taken or invalid.' : `Server error ${res.status}`);
    const rec = (await res.json()) as { id: string; name: string };
    const profile = { id: rec.id, name: rec.name };
    this.storage.setItem(
      PROFILES,
      JSON.stringify([...this.cachedProfiles().filter((p) => p.id !== rec.id), profile]),
    );
    this.writeCache(profile.id, save, false);
    return profile;
  }

  /** Load a profile's save: server copy unless the local cache is newer (e.g. saved while offline). */
  async load(profile: Profile): Promise<SaveData> {
    const cached = this.readCache(profile.id);
    try {
      const res = await this.fetchFn(`${this.base}${COLLECTION}/${profile.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rec = (await res.json()) as { save: unknown; save_backup?: unknown };
      this.online = true;
      let server = migrateSave(rec.save, profile.name);
      if (!server) {
        // Corrupt save: keep the old one in save_backup and start fresh.
        server = defaultSave(profile.name);
        await this.patch(profile.id, { save: server, save_backup: rec.save });
      }
      if (cached && cached.save.updated > server.updated) {
        await this.save(profile.id, cached.save);
        return cached.save;
      }
      this.writeCache(profile.id, server, false);
      return server;
    } catch {
      this.online = false;
      return cached?.save ?? defaultSave(profile.name);
    }
  }

  /** Save locally at once, then to the server. Returns whether the server write worked. */
  async save(profileId: string, save: SaveData): Promise<boolean> {
    this.writeCache(profileId, save, true);
    try {
      await this.patch(profileId, { save });
      this.writeCache(profileId, save, false);
      this.online = true;
      return true;
    } catch {
      this.online = false;
      return false;
    }
  }

  private async patch(id: string, body: Record<string, unknown>): Promise<void> {
    const res = await this.fetchFn(`${this.base}${COLLECTION}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  private cachedProfiles(): Profile[] {
    try {
      return JSON.parse(this.storage.getItem(PROFILES) ?? '[]') as Profile[];
    } catch {
      return [];
    }
  }

  private readCache(id: string): { save: SaveData; dirty: boolean } | null {
    try {
      const raw = JSON.parse(this.storage.getItem(CACHE + id) ?? 'null') as {
        save: unknown;
        dirty: boolean;
      } | null;
      const name = (raw?.save as { profile?: unknown } | undefined)?.profile;
      const save = raw && migrateSave(raw.save, typeof name === 'string' ? name : '');
      return save ? { save, dirty: raw.dirty } : null;
    } catch {
      return null;
    }
  }

  private writeCache(id: string, save: SaveData, dirty: boolean): void {
    try {
      this.storage.setItem(CACHE + id, JSON.stringify({ save, dirty }));
    } catch {
      // Storage full or blocked: the server copy still exists.
    }
  }
}
