import type { TurretLayout } from '../core/types';

export const PLAY_W = 1280;
export const PLAY_H = 800;

/** Stage 1 follows the bridge shown on the web board, from serpent gate to hostage. */
export const FIRST_BRIDGE: [number, number][] = [
  [240, 130],
  [270, 208],
  [430, 242],
  [650, 238],
  [890, 240],
  [1080, 280],
  [1140, 365],
  [1085, 468],
  [900, 522],
  [680, 540],
  [460, 530],
  [285, 568],
  [245, 650],
  [370, 698],
  [610, 694],
  [860, 690],
  [1095, 655],
];

/** Other authored stages retain their routes, expanded to use the landscape board. */
export function landscapePath(path: [number, number][], stageId?: string): [number, number][] {
  if (stageId === 'w1-01') return FIRST_BRIDGE;
  return path.map(([x, y]) => [Math.round(100 + x * 1.5), Math.round(95 + y * 0.48)]);
}

export function landscapeTurret(layout: TurretLayout): [number, number] {
  return layout === 'bottom' ? [640, 716] : [640, 400];
}
