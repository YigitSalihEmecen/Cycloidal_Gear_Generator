import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

export function getSTLString(mesh) {
  const exporter = new STLExporter();
  return exporter.parse(mesh);
}

export function exportSTL(mesh, filename) {
  const stlString = getSTLString(mesh);
  
  const blob = new Blob([stlString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = filename + '.stl';
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
