import { defaultSave, type SaveData } from '../meta/save';
import { SaveStore, type Profile } from '../meta/store';
import { audio } from './audio';

/** Shared app state: the save store, the chosen profile and its save. */
export const app = {
  store: new SaveStore('', (url, init) => fetch(url, init), window.localStorage),
  profile: null as Profile | null,
  save: defaultSave(''),
};

/** Update the save in memory, then write it (local cache first, then server). */
export async function persist(save: SaveData): Promise<void> {
  app.save = { ...save, updated: Date.now() };
  audio.setVolumes(app.save.settings.sfx, app.save.settings.music);
  if (app.profile) await app.store.save(app.profile.id, app.save);
}

export function vibrate(ms: number): void {
  if (app.save.settings.vibration && 'vibrate' in navigator) navigator.vibrate(ms);
}

export const fmtGold = (g: number) => Math.floor(g).toLocaleString('en-US');
