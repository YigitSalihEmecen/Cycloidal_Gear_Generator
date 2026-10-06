import type { Pt } from './profile';
import { circlePoints } from './profile';
import { holeCenter, mountHoleRadius, type Model } from './model';

export interface Profile2D {
  name: string;
  outline: Pt[];
  circles: { cx: number; cy: number; r: number }[];
  /** Extra closed polylines that are cut out (for example the ring bore). */
  cutouts: Pt[][];
}

/** Flat cut profiles for laser cutting, CNC or vector tools. Parts are in their own frames, centred on the origin. */
export function profiles2D(m: Model, ringBore: Pt[]): Profile2D[] {
  const { p } = m;
  const out: Profile2D[] = [];
  for (let k = 0; k < p.discCount; k++) {
    const circles: Profile2D['circles'] = [];
    if (p.boreDiameter > 0) circles.push({ cx: 0, cy: 0, r: m.boreRadius });
    for (let j = 0; j < p.outputPins; j++) {
      const [cx, cy] = holeCenter(m, k, j);
      circles.push({ cx, cy, r: m.holeRadius });
    }
    out.push({ name: `disc_${k + 1}`, outline: m.outline, circles, cutouts: [] });
  }
  const mr = mountHoleRadius(m);
  const mount: Profile2D['circles'] = [];
  for (let i = 0; i < p.mountHoles; i++) {
    const a = (i / p.mountHoles) * Math.PI * 2 + Math.PI / p.mountHoles;
    mount.push({ cx: mr * Math.cos(a), cy: mr * Math.sin(a), r: p.mountHoleDiameter / 2 });
  }
  out.push({
    name: 'outer_ring',
    outline: circlePoints(0, 0, m.ringOuterRadius, 360),
    circles: mount,
    cutouts: [ringBore],
  });
  return out;
}

const f = (v: number) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(4).replace(/\.?0+$/, ''));

function pathOf(pts: readonly Pt[]): string {
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(-y)}`).join('L') + 'Z';
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(-cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

/** One SVG sheet per profile. Units are millimetres, fill-rule evenodd turns inner shapes into holes. */
export function toSvg(prof: Profile2D): string {
  const all = prof.outline;
  let max = 0;
  for (const [x, y] of all) max = Math.max(max, Math.abs(x), Math.abs(y));
  const half = Math.ceil(max + 2);
  const d = [pathOf(prof.outline), ...prof.cutouts.map(pathOf), ...prof.circles.map((c) => circlePath(c.cx, c.cy, c.r))].join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${half * 2}mm" height="${half * 2}mm" viewBox="${-half} ${-half} ${half * 2} ${half * 2}">
  <title>${prof.name}</title>
  <path d="${d}" fill="none" stroke="#e00000" stroke-width="0.1" fill-rule="evenodd"/>
</svg>
`;
}

/** Minimal ASCII DXF (POLYLINE + CIRCLE entities) that LibreCAD, Fusion, FreeCAD and laser software read. */
export function toDxf(prof: Profile2D): string {
  const rows: (string | number)[] = [0, 'SECTION', 2, 'ENTITIES'];
  const poly = (pts: readonly Pt[]) => {
    rows.push(0, 'POLYLINE', 8, 'CUT', 66, 1, 70, 1);
    for (const [x, y] of pts) rows.push(0, 'VERTEX', 8, 'CUT', 10, x.toFixed(5), 20, y.toFixed(5));
    rows.push(0, 'SEQEND', 8, 'CUT');
  };
  poly(prof.outline);
  prof.cutouts.forEach(poly);
  for (const c of prof.circles) rows.push(0, 'CIRCLE', 8, 'CUT', 10, c.cx.toFixed(5), 20, c.cy.toFixed(5), 30, 0, 40, c.r.toFixed(5));
  rows.push(0, 'ENDSEC', 0, 'EOF');
  return rows.join('\n') + '\n';
}
