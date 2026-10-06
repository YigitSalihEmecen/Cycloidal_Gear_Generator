import type { Params } from './params';
import {
  discInput,
  discProfile,
  hasUndercut,
  maxPinRadius,
  radialExtent,
  type DiscGeometryInput,
  type Pt,
} from './profile';

const TAU = Math.PI * 2;

/** Everything that is derived from the parameters and does not change while the drive turns. */
export interface Model {
  p: Params;
  N: number;
  lobes: number;
  ratio: number;
  R: number;
  rp: number;
  e: number;
  geom: DiscGeometryInput;
  /** Disc outline in its own frame (disc centre at the origin). */
  outline: Pt[];
  valid: boolean; // false when the outline is degenerate (cusp or e·N ≥ R)
  undercut: boolean;
  tipRadius: number; // largest disc radius about its own centre
  rootRadius: number; // smallest disc radius about its own centre
  wallRadius: number; // ring bore radius between the pins
  ringOuterRadius: number;
  holeRadius: number;
  boreRadius: number;
  camLobeRadius: number;
  camCoreRadius: number;
  stackHeight: number;
  ringThickness: number;
  carrierGap: number;
  /** z centre of each disc, bottom to top. */
  discZ: number[];
  ringZ: number;
  carrierZ: number;
  carrierBottom: number;
  camBottom: number;
  camTop: number;
  discPhase: number[]; // eccentric phase of each disc
}

export function buildModel(p: Params, pointsPerLobe = 56): Model {
  const N = p.pins;
  const geom = discInput(p);
  const { R, rp, e } = geom;
  const lobes = N - 1;

  const lambda = (e * N) / R;
  const outline = lambda < 0.999 ? discProfile(geom, pointsPerLobe) : [];
  const undercut = outline.length === 0 || hasUndercut(geom);
  const valid = outline.length > 0 && !undercut;
  const ext = outline.length ? radialExtent(outline) : { min: 0, max: 0 };

  const wallRadius = Math.max(R, ext.max + e + 0.2);
  const ringOuterRadius = p.ringOuterDiameter / 2;

  const holeRadius = p.outputPinDiameter / 2 + e + p.holeClearance;
  const boreRadius = p.boreDiameter / 2;
  const camLobeRadius = boreRadius - p.camClearance;
  const camCoreRadius = Math.max(0.1, camLobeRadius - e);

  const n = p.discCount;
  const stackHeight = n * p.discThickness + (n - 1) * p.discGap;
  const ringThickness = stackHeight + 2 * p.ringOverhang;
  const ringZ = 0;
  const bottom = -stackHeight / 2;
  const discZ = Array.from({ length: n }, (_, k) => bottom + p.discThickness / 2 + k * (p.discThickness + p.discGap));
  const carrierGap = 0.5;
  const carrierBottom = ringThickness / 2 + carrierGap;
  const carrierZ = carrierBottom + p.carrierThickness / 2;
  const camBottom = -ringThickness / 2;
  const camTop = p.carrierEnabled ? carrierBottom + p.carrierThickness : ringThickness / 2;

  return {
    p, N, lobes, ratio: lobes, R, rp, e, geom, outline, valid, undercut,
    tipRadius: ext.max, rootRadius: ext.min, wallRadius, ringOuterRadius,
    holeRadius, boreRadius, camLobeRadius, camCoreRadius,
    stackHeight, ringThickness, carrierGap, discZ, ringZ, carrierZ, carrierBottom, camBottom, camTop,
    discPhase: Array.from({ length: n }, (_, k) => (TAU * k) / n),
  };
}

export interface DiscPose {
  x: number;
  y: number;
  rot: number;
}

export interface Pose {
  discs: DiscPose[];
  camRot: number;
  carrierRot: number;
}

/**
 * Kinematics for an input (cam) angle. The ring is fixed, each disc centre orbits at
 * radius e and the disc counter-rotates by 1/(N−1) of the cam angle. The carrier follows the discs.
 */
export function poseAt(m: Model, input: number): Pose {
  const discs = m.discPhase.map((d) => {
    const a = input + d;
    return { x: m.e * Math.cos(a), y: m.e * Math.sin(a), rot: -a / m.lobes };
  });
  return { discs, camRot: input, carrierRot: -input / m.lobes };
}

/** Angular position of output hole j on disc k, in that disc's own frame. */
export function holeAngle(m: Model, discIndex: number, j: number): number {
  return (TAU * j) / m.p.outputPins + m.discPhase[discIndex] / m.lobes;
}

export function holeCenter(m: Model, discIndex: number, j: number): Pt {
  const a = holeAngle(m, discIndex, j);
  const r = m.p.outputPitchDiameter / 2;
  return [r * Math.cos(a), r * Math.sin(a)];
}

export function mountHoleRadius(m: Model): number {
  return (m.wallRadius + m.rp + m.ringOuterRadius) / 2;
}

export type Severity = 'error' | 'warn' | 'ok';

export interface Check {
  severity: Severity;
  title: string;
  detail: string;
}

export interface Report {
  maxPinDiameter: number;
  discOuterDiameter: number;
  discRootDiameter: number;
  assemblyHeight: number;
  checks: Check[];
}

export function analyse(m: Model): Report {
  const { p } = m;
  const checks: Check[] = [];
  const err = (title: string, detail: string) => checks.push({ severity: 'error', title, detail });
  const warn = (title: string, detail: string) => checks.push({ severity: 'warn', title, detail });

  const lambda = (m.e * m.N) / m.R;
  let maxPin = 0;
  if (lambda >= 0.999) {
    err('Eccentricity too high', `e × N must stay below the pin circle radius. Reduce e to under ${(m.R / m.N).toFixed(2)} mm.`);
  } else {
    maxPin = maxPinRadius(m.geom) * 2;
    if (m.undercut) {
      err('Profile undercut', `The pins are too large for this profile. Keep pin Ø at or below ${maxPin.toFixed(1)} mm.`);
    }
  }

  const pinSpacing = 2 * m.R * Math.sin(Math.PI / m.N);
  if (pinSpacing < p.pinDiameter + (p.ringStyle === 'pins' ? 2 * p.socketFit : 0) + 0.4) {
    err('Pins overlap', `Neighbouring pins are ${pinSpacing.toFixed(1)} mm apart centre to centre. Use fewer or smaller pins.`);
  } else if (p.ringStyle === 'pins' && pinSpacing < p.pinDiameter + 2.4) {
    warn('Thin walls between sockets', `Only ${(pinSpacing - p.pinDiameter).toFixed(1)} mm of ring material between pins.`);
  }

  if (m.valid) {
    if (m.rootRadius - m.boreRadius < 2) {
      err('Bore too large', `The cam bore leaves ${(m.rootRadius - m.boreRadius).toFixed(1)} mm of disc material. Reduce the bore or enlarge the pin circle.`);
    }
    if (p.outputPins > 0) {
      const pitch = p.outputPitchDiameter / 2;
      if (pitch - m.holeRadius < m.boreRadius + 1.5) {
        err('Output holes hit the bore', 'Increase the output pitch Ø, or reduce the bore or output pin Ø.');
      } else if (pitch + m.holeRadius > m.rootRadius - 1.5) {
        err('Output holes reach the disc edge', 'Reduce the output pitch Ø or the pin Ø.');
      }
      const chord = 2 * pitch * Math.sin(Math.PI / p.outputPins);
      if (p.outputPins > 1 && chord < 2 * m.holeRadius + 1.5) {
        err('Output holes overlap', 'Use fewer output pins or a larger pitch Ø.');
      }
    }
    if (m.wallRadius + m.rp + 2 > m.ringOuterRadius) {
      err('Ring wall too thin', `Increase the ring outer Ø to at least ${(2 * (m.wallRadius + m.rp + 2)).toFixed(1)} mm.`);
    } else if (p.mountHoles > 0) {
      const mr = mountHoleRadius(m);
      const room = (m.ringOuterRadius - m.wallRadius - m.rp) / 2;
      if (p.mountHoleDiameter / 2 + 1 > room) warn('Mount holes are tight', 'Reduce the mount hole Ø or enlarge the ring.');
      else if (p.mountHoles > 1 && 2 * mr * Math.sin(Math.PI / p.mountHoles) < p.mountHoleDiameter + 1.5) {
        warn('Mount holes overlap', 'Use fewer mount holes.');
      }
    }
    if (p.camEnabled) {
      if (m.camCoreRadius - p.shaftDiameter / 2 < 1) {
        warn('Thin cam wall', 'The shaft hole is close to the cam surface. Reduce the shaft Ø, the eccentricity, or enlarge the bore.');
      }
    }
  }

  if (p.discThickness < 2) warn('Thin discs', 'Discs under 2 mm are fragile when printed.');
  if (p.discCount === 1) warn('Single disc', 'A single disc is unbalanced. Expect vibration at speed.');
  if (p.ringStyle === 'pins' && p.pinDiameter < 3) warn('Tiny pins', 'Roller pins under 3 mm are hard to source and seat.');

  if (!checks.length) {
    checks.push({ severity: 'ok', title: 'No problems found', detail: 'The disc profile, clearances and wall thicknesses look good.' });
  }

  return {
    maxPinDiameter: maxPin,
    discOuterDiameter: m.tipRadius * 2,
    discRootDiameter: m.rootRadius * 2,
    assemblyHeight: m.p.carrierEnabled ? m.carrierBottom + m.p.carrierThickness + m.ringThickness / 2 : m.ringThickness,
    checks,
  };
}
