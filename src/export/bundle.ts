import * as THREE from 'three';
import { profiles2D, toDxf, toSvg } from '../core/export2d';
import type { Model } from '../core/model';
import { encodeParams } from '../core/params';
import { ringBoreProfile } from '../core/profile';
import type { PartGeometry, PartSet } from '../three/parts';
import { geometryToBinaryStl } from '../three/stl';

export interface ExportFile {
  file: string;
  label: string;
  qty: number;
  size: string;
  note: string;
  make: () => Blob;
}

const NOTES: Record<string, string> = {
  disc: 'Print flat. Discs 2 and up differ only in hole phase, so keep the numbering.',
  outer_ring: 'Print flat. Use 4 or more walls for stiffness.',
  ring_pin: 'Optional. Cut steel rod to the pin length instead of printing.',
  eccentric_cam: 'Print upright. Ream or file the shaft hole to fit.',
  output_carrier: 'Exported pins-up so it prints without supports.',
};

function noteFor(name: string): string {
  return NOTES[name] ?? NOTES[name.replace(/_\d+$/, '')] ?? '';
}

function bboxSize(g: THREE.BufferGeometry, flip?: boolean): string {
  const c = g.clone();
  if (flip) c.rotateX(Math.PI);
  c.computeBoundingBox();
  const s = new THREE.Vector3();
  c.boundingBox?.getSize(s);
  c.dispose();
  return `${s.x.toFixed(1)} × ${s.y.toFixed(1)} × ${s.z.toFixed(1)} mm`;
}

function stlFile(part: PartGeometry, label: string): ExportFile {
  return {
    file: `${part.name}.stl`,
    label,
    qty: part.count,
    size: bboxSize(part.geometry, part.printFlip),
    note: noteFor(part.name),
    make: () => new Blob([geometryToBinaryStl(part.geometry, { flip: part.printFlip })], { type: 'model/stl' }),
  };
}

export function stlFiles(parts: PartSet): ExportFile[] {
  const out: ExportFile[] = [];
  parts.discs.forEach((d, i) => out.push({ ...stlFile(d, `Cycloidal disc ${i + 1}`), note: i === 0 ? noteFor('disc') : 'Same outline as disc 1, with the output holes at this disc\'s phase.' }));
  if (parts.ring) out.push(stlFile(parts.ring, 'Outer ring'));
  if (parts.pin) out.push(stlFile(parts.pin, 'Ring pin'));
  if (parts.cam) out.push(stlFile(parts.cam, 'Eccentric cam'));
  if (parts.carrier) out.push(stlFile(parts.carrier, 'Output carrier'));
  return out;
}

export function flatFiles(m: Model, format: 'svg' | 'dxf'): ExportFile[] {
  const bore = ringBoreProfile(
    { pins: m.N, R: m.R, rp: m.rp, wallRadius: m.wallRadius, style: m.p.ringStyle, socketFit: m.p.socketFit },
    2400,
  );
  return profiles2D(m, bore).map((prof) => ({
    file: `${prof.name}.${format}`,
    label: prof.name.startsWith('disc') ? `Disc ${prof.name.slice(5)} profile` : 'Outer ring profile',
    qty: 1,
    size: `Ø${(2 * Math.max(...prof.outline.map(([x, y]) => Math.hypot(x, y)))).toFixed(1)} mm`,
    note: format === 'svg' ? 'Millimetres, red hairline cut path.' : 'Millimetres, layer CUT.',
    make: () => new Blob([format === 'svg' ? toSvg(prof) : toDxf(prof)], { type: format === 'svg' ? 'image/svg+xml' : 'application/dxf' }),
  }));
}

export function bomText(m: Model, files: ExportFile[]): string {
  const { p } = m;
  const lines = [
    'Cycloidal Gear Generator, bill of parts',
    '',
    `Reduction ${m.ratio}:1 (${m.N} ring pins, ${m.lobes} lobes), ${p.discCount} disc(s), eccentricity ${p.eccentricity} mm.`,
    '',
    ...files.map((f) => `${f.qty} x ${f.label.padEnd(20)} ${f.file.padEnd(22)} ${f.size}`),
  ];
  if (p.ringStyle === 'pins') {
    lines.push('', `Ring pins: ${m.N} x Ø${p.pinDiameter} mm steel rod, ${m.ringThickness.toFixed(1)} mm long.`);
  }
  if (p.outputPins > 0 && !p.carrierEnabled) {
    lines.push('', `Output pins: ${p.outputPins} x Ø${p.outputPinDiameter} mm on a Ø${p.outputPitchDiameter} mm circle.`);
  }
  if (p.camEnabled && p.boreDiameter > 0) {
    lines.push('', `Bearing option: Ø${p.boreDiameter} mm bore. Fit one bearing per disc around each cam lobe if you want less friction.`);
  }
  lines.push('', `Share link parameters: ${encodeParams(p) || 'defaults'}`);
  return lines.join('\n') + '\n';
}

export async function zipFiles(files: ExportFile[], extra: Record<string, string>): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.file, f.make()));
  Object.entries(extra).forEach(([k, v]) => zip.file(k, v));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
