import { useEffect, useMemo, useRef, useState } from 'react';
import type { Model } from '../core/model';
import { encodeParams } from '../core/params';
import { bomText, flatFiles, saveBlob, stlFiles, zipFiles, type ExportFile } from '../export/bundle';
import type { PartSet } from '../three/parts';
import { IconClose, IconDownload } from './Icons';

type Tab = 'stl' | 'svg' | 'dxf';

const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'stl', label: '3D print', blurb: 'Binary STL in millimetres, one file per part, each laid in its print orientation.' },
  { id: 'svg', label: 'SVG', blurb: 'Flat cut profiles for laser cutters and vector editors.' },
  { id: 'dxf', label: 'DXF', blurb: 'Flat cut profiles for CAD and CNC. Polylines and circles, layer CUT.' },
];

export default function ExportDialog({ open, onClose, model, parts }: { open: boolean; onClose: () => void; model: Model; parts: PartSet }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>('stl');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const files: ExportFile[] = useMemo(() => {
    if (!open) return [];
    return tab === 'stl' ? stlFiles(parts) : flatFiles(model, tab);
  }, [open, tab, model, parts]);

  const info = TABS.find((t) => t.id === tab)!;

  const downloadAll = async () => {
    setBusy(true);
    try {
      const blob = await zipFiles(files, {
        'parameters.txt': (encodeParams(model.p) || 'defaults') + '\n',
        'bill_of_parts.txt': bomText(model, stlFiles(parts)),
      });
      saveBlob(blob, `cycloidal-${model.ratio}to1-${tab}.zip`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="export-title">
      <div className="dialog-card">
        <header className="dialog-head">
          <div>
            <h2 id="export-title">Export</h2>
            <p>{model.ratio}:1 drive, {model.p.discCount} disc{model.p.discCount > 1 ? 's' : ''}, Ø{(model.ringOuterRadius * 2).toFixed(0)} mm</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close export dialog"><IconClose /></button>
        </header>

        <div className="tabs" role="tablist" aria-label="Export format">
          {TABS.map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="dialog-blurb">{info.blurb}</p>

        <ul className="file-list">
          {files.map((f) => (
            <li key={f.file}>
              <div className="file-main">
                <strong>{f.label}</strong>
                <span className="file-meta">{f.file} · {f.size}{f.qty > 1 ? ` · make ${f.qty}` : ''}</span>
                {f.note && <span className="file-note">{f.note}</span>}
              </div>
              <button type="button" className="btn" onClick={() => saveBlob(f.make(), f.file)}>
                <IconDownload /> {tab.toUpperCase()}
              </button>
            </li>
          ))}
          {!files.length && <li className="file-empty">Nothing to export until the checks pass.</li>}
        </ul>

        <footer className="dialog-foot">
          <button type="button" className="btn btn-primary" disabled={!files.length || busy} onClick={downloadAll}>
            <IconDownload /> {busy ? 'Packing…' : 'Download all as ZIP'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
