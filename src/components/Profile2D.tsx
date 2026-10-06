import { useEffect, useMemo, useRef } from 'react';
import { holeCenter, poseAt, type Model } from '../core/model';
import { circlePoints, dShaftPoints, ringBoreProfile, type Pt } from '../core/profile';
import type { Playback } from '../state/playback';

const f = (v: number) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(3).replace(/\.?0+$/, ''));
const path = (pts: readonly Pt[]) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const deg = (r: number) => (r * 180) / Math.PI;

export default function Profile2D({ model: m, playback }: { model: Model; playback: Playback }) {
  const { p } = m;
  const discRefs = useRef<(SVGGElement | null)[]>([]);
  const camRef = useRef<SVGGElement>(null);
  const carrierRef = useRef<SVGGElement>(null);
  const pinRefs = useRef<(SVGCircleElement | null)[]>([]);

  const ringD = useMemo(() => {
    const bore = ringBoreProfile({ pins: m.N, R: m.R, rp: m.rp, wallRadius: m.wallRadius, style: p.ringStyle, socketFit: p.socketFit }, 1600);
    return path(circlePoints(0, 0, m.ringOuterRadius, 180)) + path(bore);
  }, [m, p.ringStyle, p.socketFit]);

  const discD = useMemo(() => {
    const out = m.outline.length ? path(m.outline) : '';
    return out;
  }, [m]);

  const holesD = useMemo(() => {
    return p.discCount > 0
      ? Array.from({ length: p.discCount }, (_, k) => {
          const parts: string[] = [];
          if (p.boreDiameter > 0) parts.push(path(circlePoints(0, 0, m.boreRadius, 72)));
          for (let j = 0; j < p.outputPins; j++) {
            const [hx, hy] = holeCenter(m, k, j);
            parts.push(path(circlePoints(hx, hy, m.holeRadius, 48)));
          }
          return parts.join('');
        })
      : [];
  }, [m, p.discCount, p.boreDiameter, p.outputPins]);

  const shaftD = useMemo(() => {
    if (p.shaftDiameter <= 0) return '';
    return path(p.shaftStyle === 'd' ? dShaftPoints(p.shaftDiameter / 2, 48) : circlePoints(0, 0, p.shaftDiameter / 2, 48));
  }, [p.shaftDiameter, p.shaftStyle]);

  const pinPositions = useMemo(
    () => Array.from({ length: m.N }, (_, k) => [m.R * Math.cos((2 * Math.PI * k) / m.N), m.R * Math.sin((2 * Math.PI * k) / m.N)] as const),
    [m.N, m.R],
  );

  // Subsampled outline used to highlight pins that are currently carrying load.
  const probe = useMemo(() => m.outline.filter((_, i) => i % 2 === 0), [m.outline]);

  useEffect(() => {
    const gap = (m.rp + p.discClearance + 0.05) ** 2;
    return playback.subscribe((a) => {
      const pose = poseAt(m, a);
      pose.discs.forEach((d, k) => {
        discRefs.current[k]?.setAttribute('transform', `translate(${f(d.x)} ${f(d.y)}) rotate(${f(deg(d.rot))})`);
      });
      camRef.current?.setAttribute('transform', `rotate(${f(deg(pose.camRot))})`);
      carrierRef.current?.setAttribute('transform', `rotate(${f(deg(pose.carrierRot))})`);
      const d0 = pose.discs[0];
      if (!d0 || !probe.length) return;
      const c = Math.cos(-d0.rot);
      const s = Math.sin(-d0.rot);
      pinPositions.forEach(([px, py], i) => {
        const qx = (px - d0.x) * c - (py - d0.y) * s;
        const qy = (px - d0.x) * s + (py - d0.y) * c;
        let hot = false;
        for (let j = 0; j < probe.length; j++) {
          const dx = probe[j][0] - qx;
          const dy = probe[j][1] - qy;
          if (dx * dx + dy * dy <= gap) {
            hot = true;
            break;
          }
        }
        pinRefs.current[i]?.classList.toggle('hot', hot);
      });
    });
  }, [playback, m, p.discClearance, probe, pinPositions]);

  const extent = m.ringOuterRadius * 1.06;
  const pitch = p.outputPitchDiameter / 2;

  if (!m.valid) {
    return <div className="profile2d empty">Fix the errors in the Checks panel to see the profile.</div>;
  }

  return (
    <div className="profile2d">
      <svg viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`} role="img" aria-label="Top-down profile of the cycloidal drive">
        <g transform="scale(1 -1)">
          <path className="p2-ring" d={ringD} fillRule="evenodd" />
          <circle className="p2-guide" r={m.R} />
          {p.ringStyle === 'pins' &&
            pinPositions.map(([x, y], i) => <circle key={`s${i}`} className="p2-socket" cx={x} cy={y} r={m.rp + p.socketFit} />)}
          {p.mountHoles > 0 &&
            Array.from({ length: p.mountHoles }, (_, i) => {
              const a = (i / p.mountHoles) * Math.PI * 2 + Math.PI / p.mountHoles;
              const r = (m.wallRadius + m.rp + m.ringOuterRadius) / 2;
              return <circle key={`m${i}`} className="p2-mount" cx={r * Math.cos(a)} cy={r * Math.sin(a)} r={p.mountHoleDiameter / 2} />;
            })}
          {pinPositions.map(([x, y], i) => (
            <circle key={`p${i}`} ref={(el) => void (pinRefs.current[i] = el)} className="p2-pin" cx={x} cy={y} r={m.rp} />
          ))}
          {Array.from({ length: p.discCount }, (_, k) => (
            <g key={`d${k}`} ref={(el) => void (discRefs.current[k] = el)} className={`p2-disc p2-disc-${k % 4}`} style={{ opacity: k === 0 ? 1 : 0.55 }}>
              <path d={discD + holesD[k]} fillRule="evenodd" />
            </g>
          ))}
          {p.camEnabled && (
            <g ref={camRef} className="p2-cam">
              {Array.from({ length: p.discCount }, (_, k) => (
                <circle key={k} cx={m.e * Math.cos(m.discPhase[k])} cy={m.e * Math.sin(m.discPhase[k])} r={Math.max(0.1, m.camLobeRadius)} />
              ))}
              {shaftD && <path className="p2-shaft" d={shaftD} />}
            </g>
          )}
          {p.carrierEnabled && p.outputPins > 0 && (
            <g ref={carrierRef}>
              {Array.from({ length: p.outputPins }, (_, j) => {
                const a = (j / p.outputPins) * Math.PI * 2;
                return <circle key={j} className="p2-out" cx={pitch * Math.cos(a)} cy={pitch * Math.sin(a)} r={p.outputPinDiameter / 2} />;
              })}
            </g>
          )}
          <path className="p2-axis" d={`M${-m.ringOuterRadius} 0H${m.ringOuterRadius}M0 ${-m.ringOuterRadius}V${m.ringOuterRadius}`} />
        </g>
      </svg>
      <dl className="p2-legend">
        <div><dt><i className="sw sw-ring" />Ring</dt><dd>Ø{f(m.ringOuterRadius * 2)}</dd></div>
        <div><dt><i className="sw sw-guide" />Pin circle</dt><dd>Ø{f(m.R * 2)}</dd></div>
        <div><dt><i className="sw sw-disc" />Disc tip</dt><dd>Ø{f(m.tipRadius * 2)}</dd></div>
        <div><dt><i className="sw sw-hot" />Loaded pin</dt><dd>disc 1</dd></div>
      </dl>
    </div>
  );
}
