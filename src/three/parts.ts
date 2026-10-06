import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  arcSegments,
  circlePoints,
  dShaftPoints,
  ringBoreProfile,
  type Pt,
} from '../core/profile';
import { holeCenter, mountHoleRadius, type Model } from '../core/model';

export type PartKind = 'ring' | 'pins' | 'discs' | 'cam' | 'carrier';

export interface PartGeometry {
  /** Stable file stem used for exports. */
  name: string;
  kind: PartKind;
  geometry: THREE.BufferGeometry;
  /** How many identical copies the assembly uses. */
  count: number;
  /** Rotation that lays the part in its printing orientation. */
  printFlip?: boolean;
}

export interface PartSet {
  ring: PartGeometry | null;
  pin: PartGeometry | null; // one roller pin, used N times
  discs: PartGeometry[];
  cam: PartGeometry | null;
  carrier: PartGeometry | null;
}

function toVec(pts: readonly Pt[]): THREE.Vector2[] {
  return pts.map(([x, y]) => new THREE.Vector2(x, y));
}

function extrude(outline: readonly Pt[], holes: readonly (readonly Pt[])[], depth: number, z0: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(toVec(outline));
  for (const h of holes) shape.holes.push(new THREE.Path(toVec(h)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, z0);
  return g;
}

function cylinderZ(x: number, y: number, r: number, z0: number, z1: number, segs: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, segs, 1, false).toNonIndexed();
  g.rotateX(Math.PI / 2);
  g.translate(x, y, (z0 + z1) / 2);
  return g;
}

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = list.map((g) => {
    const c = g.index ? g.toNonIndexed() : g;
    c.deleteAttribute('uv');
    return c;
  });
  return mergeGeometries(clean, false) ?? new THREE.BufferGeometry();
}

export function buildParts(m: Model): PartSet {
  const { p } = m;
  const seg = arcSegments(p.resolution);
  const set: PartSet = { ring: null, pin: null, discs: [], cam: null, carrier: null };
  if (!m.valid) return set;

  // Discs: every disc has the same outline; the output holes are rotated per disc phase.
  const boreHole = p.boreDiameter > 0 ? circlePoints(0, 0, m.boreRadius, seg * 2) : null;
  for (let k = 0; k < p.discCount; k++) {
    const holes: Pt[][] = [];
    if (boreHole) holes.push(boreHole as Pt[]);
    for (let j = 0; j < p.outputPins; j++) {
      const [hx, hy] = holeCenter(m, k, j);
      holes.push(circlePoints(hx, hy, m.holeRadius, seg));
    }
    set.discs.push({
      name: `disc_${k + 1}`,
      kind: 'discs',
      count: 1,
      geometry: extrude(m.outline, holes, p.discThickness, -p.discThickness / 2),
    });
  }

  // Ring
  {
    const bore = ringBoreProfile(
      { pins: m.N, R: m.R, rp: m.rp, wallRadius: m.wallRadius, style: p.ringStyle, socketFit: p.socketFit },
      p.resolution === 'draft' ? 1200 : p.resolution === 'standard' ? 2400 : 4800,
    );
    const holes: Pt[][] = [bore];
    if (p.mountHoles > 0) {
      const mr = mountHoleRadius(m);
      for (let i = 0; i < p.mountHoles; i++) {
        const a = (i / p.mountHoles) * Math.PI * 2 + Math.PI / p.mountHoles;
        holes.push(circlePoints(mr * Math.cos(a), mr * Math.sin(a), p.mountHoleDiameter / 2, seg));
      }
    }
    const outer = circlePoints(0, 0, m.ringOuterRadius, seg * 3);
    set.ring = {
      name: 'outer_ring',
      kind: 'ring',
      count: 1,
      geometry: extrude(outer, holes, m.ringThickness, -m.ringThickness / 2),
    };
  }

  if (p.ringStyle === 'pins') {
    set.pin = {
      name: 'ring_pin',
      kind: 'pins',
      count: m.N,
      geometry: cylinderZ(0, 0, m.rp, -m.ringThickness / 2, m.ringThickness / 2, seg),
    };
  }

  // Cam
  if (p.camEnabled && p.boreDiameter > 0 && m.camLobeRadius > m.e + 0.3) {
    const shaft: Pt[] | null =
      p.shaftDiameter > 0
        ? p.shaftStyle === 'd'
          ? dShaftPoints(p.shaftDiameter / 2, seg)
          : circlePoints(0, 0, p.shaftDiameter / 2, seg)
        : null;
    const holes = shaft ? [shaft] : [];
    const parts: THREE.BufferGeometry[] = [
      extrude(circlePoints(0, 0, m.camCoreRadius, seg * 2), holes, m.camTop - m.camBottom, m.camBottom),
    ];
    for (let k = 0; k < p.discCount; k++) {
      const a = m.discPhase[k];
      parts.push(
        extrude(
          circlePoints(m.e * Math.cos(a), m.e * Math.sin(a), m.camLobeRadius, seg * 2),
          holes,
          p.discThickness,
          m.discZ[k] - p.discThickness / 2,
        ),
      );
    }
    set.cam = { name: 'eccentric_cam', kind: 'cam', count: 1, geometry: merge(parts) };
  }

  // Carrier (plate + output pins)
  if (p.carrierEnabled && p.outputPins > 0) {
    const pitch = p.outputPitchDiameter / 2;
    const pinR = p.outputPinDiameter / 2;
    const plateR = pitch + pinR + 3;
    const holeR = p.boreDiameter > 0 ? m.camCoreRadius + 0.4 : 0;
    const holes = holeR > 0 && holeR < plateR - 2 ? [circlePoints(0, 0, holeR, seg)] : [];
    const parts: THREE.BufferGeometry[] = [
      extrude(circlePoints(0, 0, plateR, seg * 2), holes, p.carrierThickness, m.carrierBottom),
    ];
    const pinBottom = -m.stackHeight / 2;
    for (let j = 0; j < p.outputPins; j++) {
      const a = (j / p.outputPins) * Math.PI * 2;
      parts.push(cylinderZ(pitch * Math.cos(a), pitch * Math.sin(a), pinR, pinBottom, m.carrierBottom + 0.01, seg));
    }
    set.carrier = { name: 'output_carrier', kind: 'carrier', count: 1, printFlip: true, geometry: merge(parts) };
  }

  return set;
}

export function disposeParts(set: PartSet | null) {
  if (!set) return;
  set.ring?.geometry.dispose();
  set.pin?.geometry.dispose();
  set.cam?.geometry.dispose();
  set.carrier?.geometry.dispose();
  set.discs.forEach((d) => d.geometry.dispose());
}
