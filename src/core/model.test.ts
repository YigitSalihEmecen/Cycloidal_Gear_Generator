import { describe, expect, it } from 'vitest';
import { analyse, buildModel, holeCenter, poseAt } from './model';
import { DEFAULT_PARAMS, PRESETS, decodeParams, encodeParams, presetParams } from './params';
import { maxPinRadius, ringBoreProfile, signedArea } from './profile';

const TAU = Math.PI * 2;

function worldOutline(m: ReturnType<typeof buildModel>, x: number, y: number, rot: number) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return m.outline.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c] as const);
}

describe('cycloidal kinematics', () => {
  for (const preset of PRESETS) {
    it(`discs roll on the pins without penetration (${preset.name})`, () => {
      const m = buildModel(presetParams(preset.id));
      expect(m.valid).toBe(true);
      const pins = Array.from({ length: m.N }, (_, k) => [m.R * Math.cos((TAU * k) / m.N), m.R * Math.sin((TAU * k) / m.N)]);
      let touching = Infinity;
      for (const input of [0, 0.7, 2.1, 3.9, 5.5]) {
        const pose = poseAt(m, input);
        for (const d of pose.discs) {
          for (const [x, y] of worldOutline(m, d.x, d.y, d.rot)) {
            for (const [px, py] of pins) {
              const dist = Math.hypot(x - px, y - py) - m.rp;
              touching = Math.min(touching, dist);
            }
          }
        }
      }
      // never inside a pin, and the gap equals the clearance (within polygon sampling error)
      expect(touching).toBeGreaterThan(m.p.discClearance - 0.02);
      expect(touching).toBeLessThan(m.p.discClearance + 0.05);
    });

    it(`output pins sit inside the disc holes for every phase (${preset.name})`, () => {
      const m = buildModel(presetParams(preset.id));
      for (const input of [0, 1.3, 4.4]) {
        const pose = poseAt(m, input);
        pose.discs.forEach((d, k) => {
          for (let j = 0; j < m.p.outputPins; j++) {
            const [hx, hy] = holeCenter(m, k, j);
            const wx = d.x + hx * Math.cos(d.rot) - hy * Math.sin(d.rot);
            const wy = d.y + hx * Math.sin(d.rot) + hy * Math.cos(d.rot);
            const a = TAU * (j / m.p.outputPins) + pose.carrierRot;
            const px = (m.p.outputPitchDiameter / 2) * Math.cos(a);
            const py = (m.p.outputPitchDiameter / 2) * Math.sin(a);
            // hole centre is exactly one eccentricity away from the pin
            expect(Math.hypot(wx - px, wy - py)).toBeCloseTo(m.e, 6);
          }
        });
      }
    });
  }

  it('reduces by N-1 and reverses direction', () => {
    const m = buildModel(DEFAULT_PARAMS);
    expect(m.ratio).toBe(9);
    expect(poseAt(m, TAU * 9).carrierRot).toBeCloseTo(-TAU);
  });
});

describe('profiles', () => {
  const turning = (pts: readonly (readonly [number, number])[]) => {
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const c = pts[(i + 2) % pts.length];
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      sum += Math.atan2(Math.sin(t2 - t1), Math.cos(t2 - t1));
    }
    return Math.abs(sum);
  };

  it('flags undercut when the pin outgrows the tip curvature', () => {
    const m = buildModel({ ...DEFAULT_PARAMS, pinDiameter: 44 });
    expect(m.undercut).toBe(true);
    expect(analyse(m).checks.some((c) => c.severity === 'error')).toBe(true);
  });

  it('curvature limit matches the real outline (turning number stays 2π until the limit)', () => {
    const base = { ...DEFAULT_PARAMS, eccentricity: 4, pins: 10, pinCircleDiameter: 100 };
    const limit = maxPinRadius(buildModel(base).geom) * 2;
    expect(limit).toBeGreaterThan(5);
    const ok = buildModel({ ...base, pinDiameter: limit * 0.9 }, 400);
    const bad = buildModel({ ...base, pinDiameter: limit * 1.3 }, 400);
    expect(ok.undercut).toBe(false);
    expect(turning(ok.outline)).toBeCloseTo(Math.PI * 2, 1);
    if (bad.undercut) expect(turning(bad.outline)).toBeGreaterThan(Math.PI * 2 + 0.5);
  });

  it('never suggests a pin larger than the pin spacing', () => {
    const m = buildModel(DEFAULT_PARAMS);
    expect(maxPinRadius(m.geom)).toBeLessThanOrEqual(m.R * Math.sin(Math.PI / m.N) + 1e-9);
  });

  it('rejects e*N >= R', () => {
    const m = buildModel({ ...DEFAULT_PARAMS, eccentricity: 6 });
    expect(m.valid).toBe(false);
  });

  it('keeps the disc inside the ring bore', () => {
    const m = buildModel(DEFAULT_PARAMS);
    expect(m.tipRadius + m.e).toBeLessThanOrEqual(m.wallRadius);
  });

  it('builds a closed ring bore for both styles', () => {
    const m = buildModel(DEFAULT_PARAMS);
    for (const style of ['integrated', 'pins'] as const) {
      const bore = ringBoreProfile({ pins: m.N, R: m.R, rp: m.rp, wallRadius: m.wallRadius, style, socketFit: 0.1 });
      expect(Math.abs(signedArea(bore))).toBeGreaterThan(Math.PI * (m.R - m.rp) ** 2 * 0.9);
    }
  });

  it('default preset passes every check', () => {
    const r = analyse(buildModel(DEFAULT_PARAMS));
    expect(r.checks.filter((c) => c.severity === 'error')).toEqual([]);
  });
});

describe('url state', () => {
  it('round-trips changed values', () => {
    const p = { ...DEFAULT_PARAMS, pins: 16, ringStyle: 'pins' as const, camEnabled: false };
    expect(decodeParams(encodeParams(p))).toEqual(p);
  });
  it('clamps and ignores junk', () => {
    const p = decodeParams('pins=9999&nope=1&ringStyle=wat');
    expect(p.pins).toBe(60);
    expect(p.ringStyle).toBe('integrated');
  });
});

describe('presets', () => {
  for (const preset of PRESETS) {
    it(`${preset.name} has no errors`, () => {
      const r = analyse(buildModel(presetParams(preset.id)));
      expect(r.checks.filter((c) => c.severity === 'error')).toEqual([]);
    });
  }
});
