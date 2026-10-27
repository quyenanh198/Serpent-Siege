export type Difficulty = 'standard' | 'hard' | 'expert';
export const DIFFICULTIES: Difficulty[] = ['standard', 'hard', 'expert'];

export type TurretLayout = 'center' | 'bottom';
export type SegmentType = 'normal' | 'armored' | 'shielded';

export interface StageSnake {
  /** Standard segment count; Hard/Expert scale it. */
  segments: number;
  /** Base snake speed in px/s (Standard). */
  speed: number;
  hpFrontMult: number;
  hpTailMult: number;
  firstUpgradeAfter: number;
  upgradeEvery: [number, number];
  /** Share of special segments on Standard (difficulty adds more). */
  types: Partial<Record<Exclude<SegmentType, 'normal'>, number>>;
}

export interface StageData {
  id: string;
  /** 1-based stage number across all worlds. */
  number: number;
  world: number;
  seed: number;
  boss: boolean;
  turretLayout: TurretLayout;
  turret: [number, number];
  path: [number, number][];
  goal: { picture: string };
  snake: StageSnake;
}

export interface EndlessData {
  id: 'endless';
  seed: number;
  turretLayout: TurretLayout;
  turret: [number, number];
  path: [number, number][];
  goal: { picture: string };
}

/** One unit in the recipe the snake is built from (front to tail). */
export interface UnitSpec {
  kind: 'segment' | 'upgrade';
  type: SegmentType;
  maxHp: number;
  /** Segment index along the snake (0 = front); upgrade balls take the index of the segment before them. */
  index: number;
}
