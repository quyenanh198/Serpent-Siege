import { buildStageRecipe, stageSpeed } from './difficulty';
import type { RunUpgradeId } from './runUpgrades';
import { World } from './sim';
import type { ShopRanks } from './stats';
import type { Difficulty, StageData } from './types';

/** Upgrade preference for the bot: raw damage first. */
const PRIORITY: RunUpgradeId[] = [
  'damage',
  'rapid',
  'multishot',
  'headHunter',
  'keen',
  'deadly',
  'pierce',
  'explosive',
  'chain',
  'frost',
  'rewind',
  'ricochet',
];

/** Aims at the front-most visible ball every few frames. */
export function botStep(w: World, frame: number): void {
  if (w.state === 'choosing') {
    const best = [...w.offer].sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b))[0];
    w.choose(w.offer.indexOf(best));
    return;
  }
  if (frame % 6 === 0 && w.ballCount > 0) w.setAim(w.ballX[0], w.ballY[0]);
  w.step();
}

export interface BotResult {
  won: boolean;
  time: number;
  destroyed: number;
  picks: number;
}

export function playStage(
  stage: StageData,
  difficulty: Difficulty,
  ranks: ShopRanks,
  seed: number,
  maxSeconds = 900,
): BotResult {
  const w = new World({
    path: stage.path,
    turret: stage.turret,
    ranks,
    seed,
    recipe: buildStageRecipe(stage, difficulty, seed),
    speed: stageSpeed(stage, difficulty),
  });
  let picks = 0;
  for (let f = 0; f < maxSeconds * 60 && (w.state === 'playing' || w.state === 'choosing'); f++) {
    if (w.state === 'choosing') picks++;
    botStep(w, f);
  }
  return { won: w.state === 'won', time: Math.round(w.time), destroyed: w.destroyed.length, picks };
}
