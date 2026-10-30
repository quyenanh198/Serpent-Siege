export type Arena = { image: string; name: string };

const JUNGLE: Arena = { image: 'jungle-web-board', name: 'SERPENT GARDEN' };
const FALLS: Arena = { image: 'jungle-falls-board', name: 'FLOODED RUINS' };
const EMBER: Arena = { image: 'ember-temple-board', name: 'EMBER TEMPLE' };

/** Visual map for each stage; level rules and saved progress retain their existing IDs. */
export function arenaForStage(stageId: string): Arena {
  if (stageId === 'endless') return FALLS;
  if (stageId.startsWith('w2-')) return EMBER;
  const number = Number(stageId.slice(-2));
  return number % 3 === 2 || number % 3 === 0 ? FALLS : JUNGLE;
}
