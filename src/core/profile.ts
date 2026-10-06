import type { Params, Resolution } from './params';

export type Pt = readonly [number, number];

const TAU = Math.PI * 2;

const ARC_SEGMENTS: Record<Resolution, number> = { draft: 32, standard: 64, fine: 128 };

export function arcSegments(res: Resolution): number {
  return ARC_SEGMENTS[res];
}

export interface DiscGeometryInput {
  pins: number;
  R: number; // pin circle radius
  rp: number; // pin radius
  e: number;
  clearance: number;
}

export function discInput(p: Params): DiscGeometryInput {
  return {
    pins: p.pins,
    R: p.pinCircleDiameter / 2,
    rp: p.pinDiameter / 2,
    e: p.eccentricity,
    clearance: p.discClearance,
  };
}

/**
 * Contracted cycloidal disc outline in its own frame (disc centre at the origin).
 * With the disc centre at e·(cos a, sin a) and the disc rotated by −a/(N−1), every
 * lobe rolls on the fixed pins at (R·cos(2πk/N), R·sin(2πk/N)).
 * The clearance is added to the pin radius, which shrinks the disc.
 */
export function discProfile(g: DiscGeometryInput, pointsPerLobe = 56): Pt[] {
  const { pins: N, R, e } = g;
  const rp = g.rp + g.clearance;
  const n = Math.max(24, (N - 1) * pointsPerLobe);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const phi = Math.atan2(Math.sin((1 - N) * t), R / (e * N) - Math.cos((1 - N) * t));
    out.push([
      R * Math.cos(t) - rp * Math.cos(t + phi) - e * Math.cos(N * t),
      -R * Math.sin(t) + rp * Math.sin(t + phi) + e * Math.sin(N * t),
    ]);
  }
  return out;
}

export function signedArea(pts: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/**
 * Largest curvature of the pin-centre epitrochoid on its convex side. The disc is that curve
 * offset inwards by the pin radius, so it develops a cusp (undercut) once the pin radius reaches
 * the smallest radius of curvature, 1 / maxConvexCurvature.
 */
export function maxConvexCurvature(g: Pick<DiscGeometryInput, 'pins' | 'R' | 'e'>): number {
  const { pins: N, R, e } = g;
  const n = Math.max(2000, N * 160);
  let best = 0;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const dx = -R * Math.sin(t) + e * N * Math.sin(N * t);
    const dy = -R * Math.cos(t) + e * N * Math.cos(N * t);
    const ddx = -R * Math.cos(t) + e * N * N * Math.cos(N * t);
    const ddy = R * Math.sin(t) - e * N * N * Math.sin(N * t);
    const speed = Math.hypot(dx, dy);
    if (speed < 1e-9) return Infinity;
    // The curve runs clockwise, so convex parts turn negatively.
    const kIn = -(dx * ddy - dy * ddx) / speed ** 3;
    if (kIn > best) best = kIn;
  }
  return best;
}

export function hasUndercut(g: DiscGeometryInput): boolean {
  if ((g.e * g.pins) / g.R >= 0.999) return true;
  return (g.rp + g.clearance) * maxConvexCurvature(g) >= 0.999;
}

export function radialExtent(pts: readonly Pt[]): { min: number; max: number } {
  let min = Infinity;
  let max = 0;
  for (const [x, y] of pts) {
    const r = Math.hypot(x, y);
    if (r < min) min = r;
    if (r > max) max = r;
  }
  return { min, max };
}

/** Largest nominal pin radius that keeps the disc free of cusps and the pins from touching. */
export function maxPinRadius(g: DiscGeometryInput): number {
  if ((g.e * g.pins) / g.R >= 0.999) return 0;
  const byCurvature = 0.999 / maxConvexCurvature(g) - g.clearance;
  const spacing = g.R * Math.sin(Math.PI / g.pins);
  return Math.max(0, Math.min(byCurvature, spacing));
}

export interface RingBoreInput {
  pins: number;
  R: number;
  rp: number;
  wallRadius: number; // bore radius between the pins
  style: 'integrated' | 'pins';
  socketFit: number;
}

/**
 * Inner outline of the ring. Star-shaped around the axis, so it is sampled by ray casting:
 * between pins the wall sits at `wallRadius`; at each pin the ray either stops at the pin
 * (integrated style) or continues into a circular socket (separate pins).
 */
export function ringBoreProfile(g: RingBoreInput, samples = 2400): Pt[] {
  const { pins: N, R, wallRadius: W } = g;
  const sector = TAU / N;
  const n = Math.max(N * 24, Math.round(samples / N) * N);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU;
    const k = Math.round(th / sector);
    const d = th - k * sector; // signed angle to the nearest pin
    let r = W;
    if (g.style === 'integrated') {
      // First intersection of the ray with the pin circle (centre R, radius rp).
      const disc = R * R * Math.cos(d) ** 2 - (R * R - g.rp * g.rp);
      if (disc >= 0) {
        const t1 = R * Math.cos(d) - Math.sqrt(disc);
        if (t1 > 0 && t1 < W) r = t1;
      }
    } else {
      const rs = g.rp + g.socketFit;
      const disc = R * R * Math.cos(d) ** 2 - (R * R - rs * rs);
      if (disc >= 0) {
        const t1 = R * Math.cos(d) - Math.sqrt(disc);
        const t2 = R * Math.cos(d) + Math.sqrt(disc);
        if (t1 <= W && t2 > W) r = t2;
      }
    }
    out.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  return out;
}

export function circlePoints(cx: number, cy: number, r: number, segments: number, start = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < segments; i++) {
    const a = start + (i / segments) * TAU;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** Circle with a flat cut on the +x side. `flat` is the distance from the centre to the flat, as a fraction of r. */
export function dShaftPoints(r: number, segments: number, flat = 0.8): Pt[] {
  const fx = r * flat;
  const a0 = Math.acos(flat);
  const out: Pt[] = [[fx, -Math.sin(a0) * r]];
  const arc = Math.max(12, segments);
  for (let i = 0; i <= arc; i++) {
    const a = a0 + (i / arc) * (TAU - 2 * a0);
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out.slice(0, -1);
}
