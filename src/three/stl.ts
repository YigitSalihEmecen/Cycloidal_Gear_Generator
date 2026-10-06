import * as THREE from 'three';

export type StlOrientation = { flip?: boolean };

/** Binary STL (little-endian) for one or more geometries, moved so the part sits on z = 0. */
export function geometryToBinaryStl(source: THREE.BufferGeometry, opts: StlOrientation = {}): ArrayBuffer {
  const g = source.index ? source.toNonIndexed() : source.clone();
  if (opts.flip) g.rotateX(Math.PI);
  g.computeBoundingBox();
  g.translate(0, 0, -(g.boundingBox?.min.z ?? 0));

  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const triCount = Math.floor(pos.count / 3);
  const buf = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buf);
  const header = 'Cycloidal Gear Generator, units mm';
  for (let i = 0; i < header.length; i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, triCount, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  let o = 84;
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    n.subVectors(b, a).cross(c.clone().sub(a)).normalize();
    if (!Number.isFinite(n.x + n.y + n.z)) n.set(0, 0, 1);
    view.setFloat32(o, n.x, true);
    view.setFloat32(o + 4, n.y, true);
    view.setFloat32(o + 8, n.z, true);
    o += 12;
    for (const v of [a, b, c]) {
      view.setFloat32(o, v.x, true);
      view.setFloat32(o + 4, v.y, true);
      view.setFloat32(o + 8, v.z, true);
      o += 12;
    }
    view.setUint16(o, 0, true);
    o += 2;
  }
  g.dispose();
  return buf;
}
