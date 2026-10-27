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

const API = '/api/serpent';
const CACHE = 'serpent-siege:cache:';
const LAST_PROFILE = 'serpent-siege:me';

/** Who is playing, as the server sees it. */
export type Who =
  | { kind: 'player'; profile: Profile }
  /** Not signed in to Chat (the game lives inside the Lazybutts Chat and uses its accounts). */
  | { kind: 'login' }
  /** Server unreachable and this device has never signed in: play locally until it is back. */
  | { kind: 'offline' };

/**
 * Saves live in PocketBase, one profile per Chat account. The server works out the player from
 * the Chat session cookie (see backend/pb_hooks), so the client never sends a player id. Every
 * save is also cached locally, so a short server outage never loses a run; the newer copy wins
 * on the next load.
 */
export class SaveStore {
  online = true;

  constructor(
    private readonly base: string,
    private readonly fetchFn: FetchFn,
    private readonly storage: KeyValue,
  ) {}

  /** The signed-in Chat player. Offline, the last player seen on this device keeps playing. */
  async whoami(): Promise<Who> {
    try {
      const res = await this.fetchFn(`${this.base}${API}/me`);
      if (res.status === 401) {
        this.online = true;
        return { kind: 'login' };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const me = (await res.json()) as Profile;
      const profile = { id: me.id, name: me.name };
      this.online = true;
      this.storage.setItem(LAST_PROFILE, JSON.stringify(profile));
      return { kind: 'player', profile };
    } catch {
      this.online = false;
      const last = this.lastProfile();
      return last ? { kind: 'player', profile: last } : { kind: 'offline' };
    }
  }

  /** Load the player's save: server copy unless the local cache is newer (e.g. saved while offline). */
  async load(profile: Profile): Promise<SaveData> {
    const cached = this.readCache(profile.id);
    try {
      const res = await this.fetchFn(`${this.base}${API}/save`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rec = (await res.json()) as { save: unknown; save_backup?: unknown };
      this.online = true;
      let server = rec.save == null ? defaultSave(profile.name) : migrateSave(rec.save, profile.name);
      if (!server) {
        // Corrupt save: keep the old one in save_backup and start fresh.
        server = defaultSave(profile.name);
        await this.patch({ save: server, save_backup: rec.save });
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
      await this.patch({ save });
      this.writeCache(profileId, save, false);
      this.online = true;
      return true;
    } catch {
      this.online = false;
      return false;
    }
  }

  private async patch(body: Record<string, unknown>): Promise<void> {
    const res = await this.fetchFn(`${this.base}${API}/save`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  private lastProfile(): Profile | null {
    try {
      const p = JSON.parse(this.storage.getItem(LAST_PROFILE) ?? 'null') as Profile | null;
      return p && typeof p.id === 'string' && typeof p.name === 'string' ? p : null;
    } catch {
      return null;
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
