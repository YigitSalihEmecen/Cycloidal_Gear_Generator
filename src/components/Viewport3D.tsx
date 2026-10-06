import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Model } from '../core/model';
import { disposeParts, type PartSet } from '../three/parts';
import { SceneController, type ViewOptions, type ViewPreset } from '../three/scene';
import type { Playback } from '../state/playback';

export interface Viewport3DHandle {
  fit: (view: ViewPreset) => void;
}

interface Props {
  model: Model;
  parts: PartSet;
  options: ViewOptions;
  playback: Playback;
}

const Viewport3D = forwardRef<Viewport3DHandle, Props>(function Viewport3D({ model, parts, options, playback }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneController | null>(null);
  const prevParts = useRef<PartSet | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useImperativeHandle(ref, () => ({ fit: (v) => sceneRef.current?.fit(v) }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let scene: SceneController;
    try {
      scene = new SceneController(host, optionsRef.current);
    } catch {
      host.dataset.error = 'webgl';
      return;
    }
    sceneRef.current = scene;
    const off = playback.subscribe((a) => scene.setAngle(a));
    return () => {
      off();
      scene.dispose();
      sceneRef.current = null;
      disposeParts(prevParts.current);
      prevParts.current = null;
    };
  }, [playback]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setParts(model, parts);
    scene.setAngle(playback.angle);
    if (prevParts.current && prevParts.current !== parts) disposeParts(prevParts.current);
    prevParts.current = parts;
  }, [model, parts, playback]);

  useEffect(() => {
    sceneRef.current?.applyOptions(options);
  }, [options]);

  return (
    <div className="viewport3d" ref={hostRef} role="img" aria-label="Interactive 3D view of the cycloidal drive. Drag to orbit, scroll to zoom.">
      <p className="webgl-fallback">WebGL is not available in this browser. The 2D profile view still works.</p>
    </div>
  );
});

export default Viewport3D;
