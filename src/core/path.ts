export type Vec = { x: number; y: number };

/**
 * Catmull-Rom path through control points, pre-sampled into an arc-length table
 * so pointAt(distance) is a binary search.
 */
export class Path {
  readonly length: number;
  private readonly xs: Float64Array;
  private readonly ys: Float64Array;
  private readonly ds: Float64Array;

  constructor(points: [number, number][], samplesPerSpan = 40) {
    if (points.length < 2) throw new Error('path needs at least 2 points');
    const pts = points.map(([x, y]) => ({ x, y }));
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < samplesPerSpan; s++) {
        const t = s / samplesPerSpan;
        xs.push(catmull(p0.x, p1.x, p2.x, p3.x, t));
        ys.push(catmull(p0.y, p1.y, p2.y, p3.y, t));
      }
    }
    xs.push(pts[pts.length - 1].x);
    ys.push(pts[pts.length - 1].y);
    this.xs = Float64Array.from(xs);
    this.ys = Float64Array.from(ys);
    this.ds = new Float64Array(xs.length);
    for (let i = 1; i < xs.length; i++) {
      this.ds[i] = this.ds[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    }
    this.length = this.ds[this.ds.length - 1];
  }

  /** Point at arc distance d (clamped to [0, length]). Writes into out to avoid allocation. */
  pointAt(d: number, out: Vec = { x: 0, y: 0 }): Vec {
    const ds = this.ds;
    if (d <= 0) {
      out.x = this.xs[0];
      out.y = this.ys[0];
      return out;
    }
    if (d >= this.length) {
      out.x = this.xs[ds.length - 1];
      out.y = this.ys[ds.length - 1];
      return out;
    }
    let lo = 0;
    let hi = ds.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ds[mid] <= d) lo = mid;
      else hi = mid;
    }
    const t = (d - ds[lo]) / (ds[hi] - ds[lo] || 1);
    out.x = this.xs[lo] + (this.xs[hi] - this.xs[lo]) * t;
    out.y = this.ys[lo] + (this.ys[hi] - this.ys[lo]) * t;
    return out;
  }

  /** Dense sample of the curve, used for drawing and validation. */
  samples(step = 8): Vec[] {
    const out: Vec[] = [];
    for (let d = 0; d < this.length; d += step) out.push(this.pointAt(d));
    out.push(this.pointAt(this.length));
    return out;
  }
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}
