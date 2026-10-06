import { useEffect, useRef, useState } from 'react';
import type { Model } from '../core/model';
import type { Playback } from '../state/playback';
import type { PartKind } from '../three/parts';
import type { ViewOptions, ViewPreset } from '../three/scene';
import { PART_COLORS } from '../three/scene';
import { IconCube, IconFit, IconPause, IconPlay, IconProfile, IconSliders } from './Icons';

export type ViewMode = '3d' | '2d';

interface Props {
  model: Model;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  options: ViewOptions;
  onOptions: (o: Partial<ViewOptions>) => void;
  playback: Playback;
  onFit: (v: ViewPreset) => void;
  availableParts: Record<PartKind, boolean>;
  notice: string | null;
  children: React.ReactNode;
}

const PART_LABELS: Record<PartKind, string> = { ring: 'Ring', pins: 'Pins', discs: 'Discs', cam: 'Cam', carrier: 'Carrier' };

export default function Stage({ model, mode, onMode, options, onOptions, playback, onFit, availableParts, notice, children }: Props) {
  const [playing, setPlaying] = useState(playback.playing);
  const [rpm, setRpm] = useState(playback.rpm);
  const [viewOpen, setViewOpen] = useState(false);
  const scrubRef = useRef<HTMLInputElement>(null);
  const angleRef = useRef<HTMLSpanElement>(null);
  const outRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return playback.subscribe((a) => {
      if (scrubRef.current) scrubRef.current.value = String((a * 180) / Math.PI);
      if (angleRef.current) angleRef.current.textContent = `${((a * 180) / Math.PI).toFixed(0)}°`;
      if (outRef.current) outRef.current.textContent = `${((-a * 180) / Math.PI / model.lobes).toFixed(1)}°`;
    });
  }, [playback, model.lobes]);

  const toggle = () => {
    playback.play(!playback.playing);
    setPlaying(playback.playing);
  };

  const parts = (Object.keys(PART_LABELS) as PartKind[]).filter((k) => availableParts[k]);

  return (
    <section className="stage" aria-label="Preview">
      <div className="stage-bar">
        <div className="seg-tabs" role="tablist" aria-label="View">
          <button role="tab" type="button" aria-selected={mode === '3d'} className={mode === '3d' ? 'on' : ''} onClick={() => onMode('3d')}>
            <IconCube /> 3D
          </button>
          <button role="tab" type="button" aria-selected={mode === '2d'} className={mode === '2d' ? 'on' : ''} onClick={() => onMode('2d')}>
            <IconProfile /> Profile
          </button>
        </div>

        {mode === '3d' && (
          <button type="button" className={`icon-btn view-btn${viewOpen ? ' on' : ''}`} aria-pressed={viewOpen} aria-label="View options" onClick={() => setViewOpen((v) => !v)}>
            <IconSliders />
          </button>
        )}

        {mode === '3d' && (
          <div className="chips" role="group" aria-label="Visible parts">
            {parts.map((k) => (
              <button
                key={k}
                type="button"
                className={`chip${options.visible[k] ? ' on' : ''}`}
                aria-pressed={options.visible[k]}
                onClick={() => onOptions({ visible: { ...options.visible, [k]: !options.visible[k] } })}
              >
                <i style={{ background: PART_COLORS[k] }} />
                {PART_LABELS[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="canvas-wrap">
        {children}
        {notice && <p className="notice" role="status">{notice}</p>}
        <div className="ratio-badge" aria-hidden="true">
          <span className="ratio-num">{model.ratio}<em>:1</em></span>
          <span className="ratio-cap">reduction</span>
        </div>
        {mode === '3d' && (
          <div className="view-tools">
            <div className="view-presets" role="group" aria-label="Camera presets">
              {(['iso', 'top', 'front', 'side'] as ViewPreset[]).map((v) => (
                <button key={v} type="button" onClick={() => onFit(v)}>{v === 'iso' ? 'Iso' : v[0].toUpperCase() + v.slice(1)}</button>
              ))}
              <button type="button" onClick={() => onFit('iso')} aria-label="Fit to view" title="Fit to view"><IconFit /></button>
            </div>
            <div className={`view-toggles${viewOpen ? ' open' : ''}`}>
              <label className="mini-switch"><input type="checkbox" checked={options.outlines} onChange={(e) => onOptions({ outlines: e.target.checked })} /><span>Outlines</span></label>
              <label className="mini-switch"><input type="checkbox" checked={options.ghostRing} onChange={(e) => onOptions({ ghostRing: e.target.checked })} /><span>Ghost ring</span></label>
              <label className="mini-range">
                <span>Explode</span>
                <input type="range" min={0} max={1} step={0.01} value={options.explode} onChange={(e) => onOptions({ explode: Number(e.target.value) })} aria-label="Explode" />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="transport">
        <button type="button" className="play" onClick={toggle} aria-label={playing ? 'Pause animation' : 'Play animation'} aria-pressed={playing}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <label className="scrub">
          <span className="sr-only">Input angle</span>
          <input ref={scrubRef} type="range" min={0} max={360} step={0.5} defaultValue={0} onChange={(e) => playback.set((Number(e.target.value) * Math.PI) / 180)} aria-label="Input shaft angle" />
        </label>
        <div className="readout" aria-live="off">
          <span><small>Input</small><b ref={angleRef}>0°</b></span>
          <span><small>Output</small><b ref={outRef}>0.0°</b></span>
        </div>
        <label className="speed">
          <small>{rpm} rpm in</small>
          <input
            type="range" min={4} max={120} step={1} value={rpm}
            onChange={(e) => { const v = Number(e.target.value); playback.rpm = v; setRpm(v); }}
            aria-label="Input speed in rpm"
          />
          <small className="out-rpm">{(rpm / model.lobes).toFixed(1)} rpm out, reversed</small>
        </label>
      </div>
    </section>
  );
}
