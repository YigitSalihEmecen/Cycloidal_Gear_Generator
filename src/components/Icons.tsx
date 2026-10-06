import { useMemo } from 'react';
import { discProfile } from '../core/profile';

const I = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const IconPlay = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>;
export const IconPause = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4.5" height="16" rx="1.2" /><rect x="13.5" y="4" width="4.5" height="16" rx="1.2" /></svg>;
export const IconDownload = () => <I d="M12 3v12m0 0 4.5-4.5M12 15 7.5 10.5M4 20h16" />;
export const IconLink = () => <I d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />;
export const IconReset = () => <I d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4.5H8" />;
export const IconFit = () => <I d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />;
export const IconClose = () => <I d="M6 6l12 12M18 6 6 18" />;
export const IconCheck = () => <I d="m5 12.5 4.5 4.5L19 7.5" />;
export const IconAlert = () => <I d="M12 4 2.8 19.5h18.4L12 4Zm0 6v4.5m0 3v.01" />;
export const IconSun = () => <I d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />;
export const IconMoon = () => <I d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />;
export const IconAuto = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconSliders = () => <I d="M4 7h9m4 0h3M4 17h3m4 0h9M13 4.5v5m-6 5v5" />;
export const IconCube = () => <I d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12v9M12 12 4 7.5" />;
export const IconProfile = () => <I d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm0 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />;

/** Brand mark: a small cycloidal disc inside a ring of pins, drawn from the same maths as the app. */
export function Logo({ size = 30 }: { size?: number }) {
  const d = useMemo(() => {
    const pts = discProfile({ pins: 8, R: 20, rp: 3.2, e: 1.6, clearance: 0 }, 14);
    return 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z';
  }, []);
  const pins = Array.from({ length: 8 }, (_, k) => [20 * Math.cos((k / 8) * Math.PI * 2), 20 * Math.sin((k / 8) * Math.PI * 2)]);
  return (
    <svg width={size} height={size} viewBox="-26 -26 52 52" aria-hidden="true" className="logo">
      {pins.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" className="logo-pin" />)}
      <g transform="translate(1.6 0)"><path d={d} className="logo-disc" /></g>
      <circle r="4" cx="1.6" className="logo-hub" />
    </svg>
  );
}
