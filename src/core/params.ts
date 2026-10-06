/** All lengths are millimetres, all angles radians unless a name says otherwise. */

export type RingStyle = 'integrated' | 'pins';
export type Resolution = 'draft' | 'standard' | 'fine';
export type ShaftStyle = 'round' | 'd';

export interface Params {
  // Reducer
  pins: number; // N: ring pins. The disc gets N-1 lobes, so the ratio is N-1 : 1.
  pinCircleDiameter: number; // 2R
  pinDiameter: number; // 2*rp
  eccentricity: number; // e
  discClearance: number; // radial gap between disc and pins (print tolerance)
  // Discs
  discCount: number; // 1..4, phased 360/n apart
  discThickness: number;
  discGap: number; // axial gap between stacked discs
  boreDiameter: number; // centre hole that carries the eccentric cam
  // Output
  outputPins: number; // 0 disables output holes
  outputPinDiameter: number;
  outputPitchDiameter: number;
  holeClearance: number; // radial clearance inside the output holes
  // Ring
  ringStyle: RingStyle;
  ringOuterDiameter: number;
  ringOverhang: number; // ring is this much taller than the disc stack, on each side
  socketFit: number; // extra radius of the pin sockets (pins style only)
  mountHoles: number;
  mountHoleDiameter: number;
  // Cam
  camEnabled: boolean;
  camClearance: number; // radial clearance between cam lobe and disc bore
  shaftDiameter: number; // 0 = solid cam
  shaftStyle: ShaftStyle;
  // Carrier
  carrierEnabled: boolean;
  carrierThickness: number;
  // Mesh quality
  resolution: Resolution;
}

export const DEFAULT_PARAMS: Params = {
  pins: 10,
  pinCircleDiameter: 100,
  pinDiameter: 10,
  eccentricity: 2,
  discClearance: 0.15,
  discCount: 2,
  discThickness: 8,
  discGap: 0.4,
  boreDiameter: 20,
  outputPins: 6,
  outputPinDiameter: 5,
  outputPitchDiameter: 50,
  holeClearance: 0.2,
  ringStyle: 'integrated',
  ringOuterDiameter: 130,
  ringOverhang: 1.5,
  socketFit: 0.1,
  mountHoles: 6,
  mountHoleDiameter: 4.5,
  camEnabled: true,
  camClearance: 0.2,
  shaftDiameter: 5,
  shaftStyle: 'd',
  carrierEnabled: true,
  carrierThickness: 4,
  resolution: 'standard',
};

export interface NumericMeta {
  key: keyof Params;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
}

export const META: Record<string, NumericMeta> = {
  pins: { key: 'pins', label: 'Ring pins', min: 4, max: 60, step: 1, hint: 'N. The disc has N − 1 lobes, which sets the ratio.' },
  pinCircleDiameter: { key: 'pinCircleDiameter', label: 'Pin circle Ø', unit: 'mm', min: 20, max: 300, step: 0.5, hint: 'Diameter of the circle through the pin centres.' },
  pinDiameter: { key: 'pinDiameter', label: 'Pin Ø', unit: 'mm', min: 1, max: 40, step: 0.1, hint: 'Rolling pin diameter. Too large causes undercut.' },
  eccentricity: { key: 'eccentricity', label: 'Eccentricity', unit: 'mm', min: 0.2, max: 12, step: 0.05, hint: 'Cam offset. Controls lobe depth.' },
  discClearance: { key: 'discClearance', label: 'Disc clearance', unit: 'mm', min: 0, max: 1, step: 0.01, hint: 'Shrinks the disc profile so printed parts do not bind.' },
  discCount: { key: 'discCount', label: 'Discs', min: 1, max: 4, step: 1, hint: 'More discs balance the load and the vibration.' },
  discThickness: { key: 'discThickness', label: 'Disc thickness', unit: 'mm', min: 1, max: 40, step: 0.5 },
  discGap: { key: 'discGap', label: 'Disc gap', unit: 'mm', min: 0, max: 3, step: 0.05, hint: 'Axial space between neighbouring discs.' },
  boreDiameter: { key: 'boreDiameter', label: 'Cam bore Ø', unit: 'mm', min: 0, max: 80, step: 0.5, hint: 'Centre hole for the eccentric cam or a bearing.' },
  outputPins: { key: 'outputPins', label: 'Output pins', min: 0, max: 16, step: 1, hint: '0 removes the output holes.' },
  outputPinDiameter: { key: 'outputPinDiameter', label: 'Output pin Ø', unit: 'mm', min: 1, max: 20, step: 0.1, hint: 'The disc holes are sized as pin Ø + 2e + clearance.' },
  outputPitchDiameter: { key: 'outputPitchDiameter', label: 'Output pitch Ø', unit: 'mm', min: 10, max: 200, step: 0.5 },
  holeClearance: { key: 'holeClearance', label: 'Hole clearance', unit: 'mm', min: 0, max: 1, step: 0.01 },
  ringOuterDiameter: { key: 'ringOuterDiameter', label: 'Ring outer Ø', unit: 'mm', min: 30, max: 400, step: 0.5 },
  ringOverhang: { key: 'ringOverhang', label: 'Ring overhang', unit: 'mm', min: 0, max: 10, step: 0.1, hint: 'Ring height beyond the disc stack, per side.' },
  socketFit: { key: 'socketFit', label: 'Socket fit', unit: 'mm', min: 0, max: 0.6, step: 0.01, hint: 'Extra radius on the pin sockets.' },
  mountHoles: { key: 'mountHoles', label: 'Mount holes', min: 0, max: 16, step: 1 },
  mountHoleDiameter: { key: 'mountHoleDiameter', label: 'Mount hole Ø', unit: 'mm', min: 1, max: 12, step: 0.1 },
  camClearance: { key: 'camClearance', label: 'Cam clearance', unit: 'mm', min: 0, max: 1, step: 0.01 },
  shaftDiameter: { key: 'shaftDiameter', label: 'Shaft Ø', unit: 'mm', min: 0, max: 30, step: 0.1, hint: 'Input shaft hole in the cam. 0 for a solid cam.' },
  carrierThickness: { key: 'carrierThickness', label: 'Carrier thickness', unit: 'mm', min: 1, max: 20, step: 0.5 },
};

const NUMERIC_KEYS = Object.keys(META) as (keyof Params)[];

export function clampParam(key: keyof Params, value: number): number {
  const m = META[key as string];
  if (!m) return value;
  const v = Math.min(m.max, Math.max(m.min, Number.isFinite(value) ? value : m.min));
  const places = m.step >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(m.step)));
  return Number(v.toFixed(places));
}

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  params: Partial<Params>;
}

export const PRESETS: Preset[] = [
  { id: 'starter', name: 'Starter 9:1', blurb: 'Balanced two-disc drive, good first print.', params: {} },
  {
    id: 'compact',
    name: 'Compact joint 15:1',
    blurb: 'Small footprint for a robot joint.',
    params: {
      pins: 16, pinCircleDiameter: 60, pinDiameter: 4, eccentricity: 1, discThickness: 6,
      boreDiameter: 14, outputPins: 6, outputPinDiameter: 3, outputPitchDiameter: 34,
      ringOuterDiameter: 78, shaftDiameter: 5, mountHoles: 6, mountHoleDiameter: 3.4, carrierThickness: 3,
    },
  },
  {
    id: 'heavy',
    name: 'Heavy duty 3-disc',
    blurb: 'Three phased discs for smoother torque.',
    params: {
      pins: 12, pinCircleDiameter: 120, pinDiameter: 8, eccentricity: 2.5, discCount: 3, discThickness: 10,
      boreDiameter: 26, outputPins: 8, outputPinDiameter: 8, outputPitchDiameter: 64,
      ringOuterDiameter: 156, shaftDiameter: 8, mountHoles: 8, mountHoleDiameter: 5.5, carrierThickness: 6,
    },
  },
  {
    id: 'sockets',
    name: 'Roller pins 20:1',
    blurb: 'Separate steel-rod pins in printed sockets.',
    params: {
      pins: 21, pinCircleDiameter: 120, pinDiameter: 6, eccentricity: 1.5, ringStyle: 'pins', discThickness: 8,
      boreDiameter: 22, outputPins: 6, outputPinDiameter: 6, outputPitchDiameter: 60,
      ringOuterDiameter: 148, shaftDiameter: 6, socketFit: 0.12, mountHoles: 8, mountHoleDiameter: 4.5,
    },
  },
  {
    id: 'single',
    name: 'Single disc 7:1',
    blurb: 'Simplest build. Expect some vibration.',
    params: {
      pins: 8, pinCircleDiameter: 80, pinDiameter: 8, eccentricity: 2, discCount: 1, discThickness: 12,
      boreDiameter: 18, outputPins: 5, outputPinDiameter: 5, outputPitchDiameter: 44,
      ringOuterDiameter: 106, shaftDiameter: 5, mountHoles: 6,
    },
  },
];

export function presetParams(id: string): Params {
  const p = PRESETS.find((x) => x.id === id);
  return { ...DEFAULT_PARAMS, ...p?.params };
}

/** Compact, versioned URL-hash encoding that only stores values that differ from the defaults. */
export function encodeParams(p: Params): string {
  const diff: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_PARAMS) as (keyof Params)[]) {
    if (p[k] !== DEFAULT_PARAMS[k]) diff[k] = p[k];
  }
  const keys = Object.keys(diff);
  if (!keys.length) return '';
  return keys.map((k) => `${k}=${encodeURIComponent(String(diff[k]))}`).join('&');
}

export function decodeParams(hash: string): Params {
  const out: Params = { ...DEFAULT_PARAMS };
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  for (const [k, raw] of q) {
    if (!(k in DEFAULT_PARAMS)) continue;
    const key = k as keyof Params;
    const def = DEFAULT_PARAMS[key];
    if (typeof def === 'number' && NUMERIC_KEYS.includes(key)) {
      (out as unknown as Record<string, unknown>)[key] = clampParam(key, Number(raw));
    } else if (typeof def === 'boolean') {
      (out as unknown as Record<string, unknown>)[key] = raw === 'true';
    } else if (key === 'ringStyle' && (raw === 'integrated' || raw === 'pins')) {
      out.ringStyle = raw;
    } else if (key === 'shaftStyle' && (raw === 'round' || raw === 'd')) {
      out.shaftStyle = raw;
    } else if (key === 'resolution' && (raw === 'draft' || raw === 'standard' || raw === 'fine')) {
      out.resolution = raw;
    }
  }
  return out;
}
