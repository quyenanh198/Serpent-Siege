import balance from './data/balance.json';
import { Path } from './path';
import { Rng } from './rng';
import type { TurretLayout } from './types';

/**
 * Pre-launch map generator (dev tool only). The game never calls this at runtime;
 * it loads the committed stage JSON files. Kept in core so tests can validate the committed maps.
 */

const W = balance.view.width;
const H = balance.view.height;
const D = balance.ball.diameter;
/** Top band reserved for the HUD. */
export const HUD_TOP = 130;

export const TURRET_POS: Record<TurretLayout, [number, number]> = {
  center: [W / 2, 700],
  bottom: [W / 2, H - 110],
};

export interface GeneratedMap {
  layout: TurretLayout;
  turret: [number, number];
  path: [number, number][];
}

const round = (pts: [number, number][]) =>
  pts.map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]);

export function generateMap(seed: number, layout: TurretLayout): GeneratedMap {
  const rng = new Rng(seed);
  const pts = layout === 'center' ? spiral(rng) : serpentine(rng);
  return { layout, turret: TURRET_POS[layout], path: round(pts) };
}

export function generateEndlessMap(seed: number): GeneratedMap {
  const rng = new Rng(seed);
  return { layout: 'center', turret: TURRET_POS.center, path: round(spiral(rng, 2.3)) };
}

function spiral(rng: Rng, turnsOverride?: number): [number, number][] {
  const [cx, cy] = TURRET_POS.center;
  const turns = turnsOverride ?? rng.range(1.5, 2.0);
  const rOuter = rng.range(285, 305);
  const rInner = rng.range(135, 160);
  const ry = 1.5;
  const a0 = rng.range(0, Math.PI * 2);
  const dir = rng.next() < 0.5 ? 1 : -1;
  const steps = Math.round(turns * 12);
  const wobble = Array.from({ length: steps + 1 }, () => rng.range(-12, 12));
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const r = rOuter - (rOuter - rInner) * t + wobble[i] * (1 - t);
    out.push([cx + r * Math.cos(a), cy + r * ry * Math.sin(a)]);
  }
  // Entry from the nearest screen edge.
  out.unshift(nearestEdge(out[0][0], out[0][1]));
  return out;
}

function nearestEdge(x: number, y: number): [number, number] {
  const options: [number, [number, number]][] = [
    [x, [-20, y]],
    [W - x, [W + 20, y]],
    [y - HUD_TOP, [x, HUD_TOP - 40]],
    [H - y, [x, H + 20]],
  ];
  options.sort((a, b) => a[0] - b[0]);
  return options[0][1];
}

function serpentine(rng: Rng): [number, number][] {
  const rows = rng.int(4, 5);
  const top = HUD_TOP + 60;
  const bottom = TURRET_POS.bottom[1] - 300;
  const gap = (bottom - top) / (rows - 1);
  const left = 70;
  const right = W - 70;
  const startLeft = rng.next() < 0.5;
  const out: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    const y = top + r * gap;
    const ltr = (r % 2 === 0) === startLeft;
    const xs = [0, 0.25, 0.5, 0.75, 1].map((f) => left + (right - left) * (ltr ? f : 1 - f));
    if (r === 0) out.push([ltr ? -20 : W + 20, y]);
    const last = r === rows - 1;
    const count = last ? 3 : xs.length;
    for (let i = 0; i < count; i++) out.push([xs[i], y + rng.range(-18, 18)]);
    if (!last) out.push([ltr ? right + 30 : left - 30, y + gap / 2]);
  }
  return out;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Rules from 03 §6. `longestSnakeBalls` is the ball count of the longest snake on the map. */
export function validateMap(
  map: { path: [number, number][]; turret: [number, number] },
  longestSnakeBalls = 52 * 4,
): ValidationResult {
  const errors: string[] = [];
  const path = new Path(map.path);
  const step = 6;
  const samples = path.samples(step);
  const [tx, ty] = map.turret;
  const entry = 80 / step;
  samples.forEach((p, i) => {
    if (i < entry) return;
    if (p.x < 25 || p.x > W - 25 || p.y < HUD_TOP - 10 || p.y > H - 25)
      errors.push(`off screen at ${i * step}px`);
    if (Math.hypot(p.x - tx, p.y - ty) < 110) errors.push(`too close to turret at ${i * step}px`);
  });
  const skip = Math.ceil((3 * D) / step);
  outer: for (let i = 0; i < samples.length; i += 2) {
    for (let j = i + skip; j < samples.length; j += 2) {
      if (Math.hypot(samples[i].x - samples[j].x, samples[i].y - samples[j].y) < 2 * D) {
        errors.push(`self overlap near ${i * step}px and ${j * step}px`);
        break outer;
      }
    }
  }
  if (path.length < 0.4 * longestSnakeBalls * D) errors.push(`too short: ${Math.round(path.length)}px`);
  // Sharpness: heading change over 3 ball widths stays under 100°.
  const span = Math.round((3 * D) / step);
  for (let i = span; i + span < samples.length; i++) {
    const a = samples[i - span];
    const b = samples[i];
    const c = samples[i + span];
    let d = Math.abs(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x));
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > (100 * Math.PI) / 180) {
      errors.push(`turn too sharp at ${i * step}px`);
      break;
    }
  }
  const end = samples[samples.length - 1];
  if (end.x < 60 || end.x > W - 60 || end.y < HUD_TOP + 40 || end.y > H - 60) errors.push('no room for goal');
  return { ok: errors.length === 0, errors: [...new Set(errors)].slice(0, 10) };
}
