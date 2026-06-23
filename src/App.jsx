import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import ParameterPanel from './components/ParameterPanel.jsx';
import ThreeViewer from './components/ThreeViewer.jsx';
import ExportModal from './components/ExportModal.jsx';
import { exportSTL, getSTLString } from './utils/stlExport.js';
import JSZip from 'jszip';

function App() {
  const [params, setParams] = useState({
    N: 10,
    R: 50,
    rp: 5,
    e: 2,
    tolerance: 0.1,
    thickness: 10,
    outerRingThickness: 12,
    outerRingDiameter: 130,
    numGears: 2,
    centerHoleRadius: 10,
    outputHoleRadius: 4,
    outputHoleOffset: 25,
    numOutputHoles: 5,
    hasOutputHoles: true,
    isExportModalOpen: false
  });

  const geometriesRef = useRef({});

  const handleSetGeometries = (geos) => {
    geometriesRef.current = geos;
  };

  const downloadMesh = (geometry, filename) => {
    if (!geometry) {
      alert("Geometry not generated yet.");
      return;
    }
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    exportSTL(mesh, filename);
  };

  const onDownloadGears = (index) => {
    const key = `gear${index}`;
    downloadMesh(geometriesRef.current[key], `cycloidal_disc_${index}`);
  };

  const onDownloadAll = async () => {
    const zip = new JSZip();
    
    // Add all gears
    for (let i = 1; i <= params.numGears; i++) {
      const geo = geometriesRef.current[`gear${i}`];
      if (geo) {
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
        const stlString = getSTLString(mesh);
        zip.file(`cycloidal_disc_${i}.stl`, stlString);
      }
    }
    
    // Add outer ring
    const ringGeo = geometriesRef.current.ring;
    if (ringGeo) {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial());
      const stlString = getSTLString(mesh);
      zip.file(`outer_ring.stl`, stlString);
    }
    
    // Generate and download zip
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "cycloidal_gears.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    setParams(prev => ({ ...prev, isExportModalOpen: false }));
  };

  return (
    <div className="app-container">
      <ParameterPanel 
        params={params} 
        setParams={setParams} 
        onDownloadGears={onDownloadGears}
        onDownloadRing={() => downloadMesh(geometriesRef.current.ring, 'outer_ring')}
      />
      <div className="viewer-container">
        <ThreeViewer params={params} setGeometries={handleSetGeometries} />
      </div>
      <ExportModal 
        isOpen={params.isExportModalOpen}
        onClose={() => setParams(prev => ({ ...prev, isExportModalOpen: false }))}
        numGears={params.numGears}
        onDownloadGears={onDownloadGears}
        onDownloadRing={() => downloadMesh(geometriesRef.current.ring, 'outer_ring')}
        onDownloadAll={onDownloadAll}
      />
    </div>
  );
}

export default App;
