import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildModel } from '../core/model';
import { DEFAULT_PARAMS, PRESETS, presetParams } from '../core/params';
import { flatFiles } from '../export/bundle';
import { buildParts } from './parts';
import { geometryToBinaryStl } from './stl';

/** Every undirected edge of a closed mesh is shared by an even number of triangles. */
function isClosed(g: THREE.BufferGeometry): boolean {
  const pos = g.toNonIndexed().getAttribute('position');
  const key = (i: number) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
  const edges = new Map<string, number>();
  for (let t = 0; t < pos.count; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = key(t + e);
      const b = key(t + ((e + 1) % 3));
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }
  return [...edges.values()].every((n) => n % 2 === 0);
}

describe('part geometry', () => {
  for (const preset of PRESETS) {
    it(`builds closed solids (${preset.name})`, () => {
      const m = buildModel(presetParams(preset.id), 28);
      const set = buildParts({ ...m, p: { ...m.p, resolution: 'draft' } });
      expect(set.discs).toHaveLength(m.p.discCount);
      expect(set.ring).not.toBeNull();
      for (const g of [set.ring!.geometry, ...set.discs.map((d) => d.geometry)]) {
        g.computeBoundingBox();
        expect(g.attributes.position.count).toBeGreaterThan(100);
        expect(isClosed(g)).toBe(true);
      }
    });
  }

  it('writes a valid binary STL resting on z = 0', () => {
    const m = buildModel(DEFAULT_PARAMS);
    const set = buildParts(m);
    const buf = geometryToBinaryStl(set.discs[0].geometry);
    const view = new DataView(buf);
    const tris = view.getUint32(80, true);
    expect(buf.byteLength).toBe(84 + tris * 50);
    let minZ = Infinity;
    for (let t = 0; t < tris; t++) {
      for (let v = 0; v < 3; v++) minZ = Math.min(minZ, view.getFloat32(84 + t * 50 + 12 + v * 12 + 8, true));
    }
    expect(minZ).toBeCloseTo(0, 5);
  });

  it('flips the carrier so its pins point up', () => {
    const set = buildParts(buildModel(DEFAULT_PARAMS));
    const g = set.carrier!.geometry.clone();
    const before = new THREE.Box3().setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute);
    const buf = geometryToBinaryStl(set.carrier!.geometry, { flip: true });
    const view = new DataView(buf);
    let maxZ = -Infinity;
    const tris = view.getUint32(80, true);
    for (let t = 0; t < tris; t++) for (let v = 0; v < 3; v++) maxZ = Math.max(maxZ, view.getFloat32(84 + t * 50 + 12 + v * 12 + 8, true));
    expect(maxZ).toBeCloseTo(before.max.z - before.min.z, 3);
  });

  it('exports SVG and DXF profiles', () => {
    const m = buildModel(DEFAULT_PARAMS);
    for (const fmt of ['svg', 'dxf'] as const) {
      const files = flatFiles(m, fmt);
      expect(files.map((f) => f.file)).toEqual(['disc_1.' + fmt, 'disc_2.' + fmt, 'outer_ring.' + fmt]);
    }
  });
});
