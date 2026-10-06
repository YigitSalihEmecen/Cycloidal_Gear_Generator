import { lazy, Suspense, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
const ExportDialog = lazy(() => import('./components/ExportDialog'));
import Profile2D from './components/Profile2D';
import Sidebar from './components/Sidebar';
import Stage, { type ViewMode } from './components/Stage';
import Viewport3D, { type Viewport3DHandle } from './components/Viewport3D';
import { analyse, buildModel } from './core/model';
import { Playback } from './state/playback';
import { useParams, useTheme } from './state/hooks';
import { buildParts } from './three/parts';
import type { ViewOptions } from './three/scene';

const POINTS_PER_LOBE = { draft: 28, standard: 56, fine: 112 } as const;

export default function App() {
  const { params, setParams, patch } = useParams();
  const { choice, dark, cycle } = useTheme();
  const deferred = useDeferredValue(params);
  const stale = deferred !== params;

  const model = useMemo(() => buildModel(deferred, POINTS_PER_LOBE[deferred.resolution]), [deferred]);
  const report = useMemo(() => analyse(model), [model]);
  const parts = useMemo(() => buildParts(model), [model]);

  // While the design is invalid, keep showing the last good one instead of an empty stage.
  const lastGood = useRef<{ model: typeof model; parts: typeof parts } | null>(null);
  if (model.valid) lastGood.current = { model, parts };
  const live = model.valid ? { model, parts } : lastGood.current;

  const playback = useMemo(() => new Playback(), []);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) playback.play(true);
    return () => playback.dispose();
  }, [playback]);

  const [mode, setMode] = useState<ViewMode>('3d');
  const [exportOpen, setExportOpen] = useState(false);
  const [view, setView] = useState<Omit<ViewOptions, 'dark'>>({
    visible: { ring: true, pins: true, discs: true, cam: true, carrier: false },
    explode: 0,
    outlines: true,
    ghostRing: false,
  });
  const options = useMemo<ViewOptions>(() => ({ ...view, dark }), [view, dark]);
  const viewport = useRef<Viewport3DHandle>(null);

  const shown = live?.parts ?? parts;
  const available = {
    ring: !!shown.ring,
    pins: !!shown.pin,
    discs: shown.discs.length > 0,
    cam: !!shown.cam,
    carrier: !!shown.carrier,
  };

  return (
    <div className={`app${stale ? ' is-busy' : ''}`}>
      <Stage
        model={model}
        mode={mode}
        onMode={setMode}
        options={options}
        onOptions={(o) => setView((v) => ({ ...v, ...o }))}
        playback={playback}
        onFit={(v) => viewport.current?.fit(v)}
        availableParts={available}
        notice={model.valid ? null : live ? 'Showing the last valid design. Fix the errors in Checks to update the preview.' : 'Fix the errors in Checks to see the preview.'}
      >
        {/* Both views stay mounted so switching keeps the camera and the animation phase. */}
        <div className="layer" hidden={mode !== '3d'}>
          {live && <Viewport3D ref={viewport} model={live.model} parts={live.parts} options={options} playback={playback} />}
        </div>
        <div className="layer" hidden={mode !== '2d'}>
          {live && <Profile2D model={live.model} playback={playback} />}
        </div>
      </Stage>
      <Sidebar
        params={params}
        setParams={setParams}
        patch={patch}
        model={model}
        report={report}
        theme={choice}
        onTheme={cycle}
        onExport={() => setExportOpen(true)}
      />
      {exportOpen && (
        <Suspense fallback={null}>
          <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} model={model} parts={parts} />
        </Suspense>
      )}
    </div>
  );
}
