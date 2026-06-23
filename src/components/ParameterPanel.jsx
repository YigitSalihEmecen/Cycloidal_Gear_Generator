import React, { useState } from 'react';

const paramDescriptions = {
  N: "Number of pins on the outer ring. The reduction ratio is (N-1):1.",
  R: "Radius from the center to the center of the pins.",
  rp: "Radius of the individual pins.",
  e: "Eccentricity (offset of the cycloidal disc from the center axis).",
  tolerance: "Clearance gap between the cycloidal disc and the outer ring pins.",
  thickness: "Extrusion depth (thickness) of each cycloidal gear disc.",
  outerRingThickness: "Extrusion depth of the outer ring base.",
  outerRingDiameter: "Outer diameter defining the wall thickness of the outer ring.",
  centerHoleRadius: "Radius of the center hole for the eccentric bearing.",
  numOutputHoles: "Number of output pins/holes used to drive the output shaft.",
  outputHoleRadius: "Radius of each output hole.",
  outputHoleOffset: "Distance from the center to the output holes.",
  numGears: "Number of cycloidal discs stacked together for balance."
};

export default function ParameterPanel({ params, setParams, onDownloadGears, onDownloadRing }) {
  const [activeInfo, setActiveInfo] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  const toggleInfo = (name) => {
    setActiveInfo(activeInfo === name ? null : name);
  };

  const renderSlider = (label, name, min, max, step) => (
    <div className="control-group">
      <div className="control-header">
        <label>
          <span>{label}</span>
          <button className="info-btn" onClick={() => toggleInfo(name)} title="Show info">i</button>
        </label>
        <input 
          type="number" 
          name={name} 
          value={params[name]} 
          onChange={handleChange}
          step={step}
          className="val-input"
        />
      </div>
      {activeInfo === name && (
        <div className="info-text">{paramDescriptions[name]}</div>
      )}
      <input 
        type="range" 
        name={name} 
        min={min} 
        max={max} 
        step={step} 
        value={params[name]} 
        onChange={handleChange} 
      />
    </div>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Cycloidal Generator</h1>
        <p>Parametric 3D Gear Design</p>
      </div>
      
      <div className="sidebar-content">
        <div className="reduction-rate" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div><strong>Reduction Ratio:</strong>&nbsp; {params.N - 1}:1</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Shaft Eccentric Offset: {params.e} mm</div>
        </div>
        
        {renderSlider('Ring Pins (N)', 'N', 5, 40, 1)}
        {renderSlider('Ring Radius (R) [mm]', 'R', 10, 150, 1)}
        {renderSlider('Pin Radius (rp) [mm]', 'rp', 1, 20, 0.5)}
        {renderSlider('Eccentricity (e) [mm]', 'e', 0.1, 10, 0.1)}
        {renderSlider('Tolerance [mm]', 'tolerance', 0, 1, 0.05)}
        {renderSlider('Gear Thickness [mm]', 'thickness', 1, 50, 1)}
        {renderSlider('Outer Ring Thickness [mm]', 'outerRingThickness', 1, 50, 1)}
        {renderSlider('Outer Ring Diameter [mm]', 'outerRingDiameter', 20, 300, 1)}
        
        <div className="divider"></div>
        
        <div className="control-group">
          <div className="control-header">
            <label>
              <span>Number of Gears</span>
              <button className="info-btn" onClick={() => toggleInfo('numGears')}>i</button>
            </label>
          </div>
          {activeInfo === 'numGears' && (
            <div className="info-text">{paramDescriptions['numGears']}</div>
          )}
          <select name="numGears" value={params.numGears} onChange={handleChange}>
            <option value={1}>1 Gear</option>
            <option value={2}>2 Gears</option>
            <option value={3}>3 Gears</option>
            <option value={4}>4 Gears</option>
          </select>
        </div>

        <div className="divider"></div>

        <label className="checkbox-group">
          <input 
            type="checkbox" 
            name="hasOutputHoles" 
            checked={params.hasOutputHoles} 
            onChange={handleChange} 
          />
          <span>Include Output Holes</span>
        </label>

        {renderSlider('Center Hole Radius [mm]', 'centerHoleRadius', 0, 30, 0.5)}

        {params.hasOutputHoles && (
          <>
            {renderSlider('Output Hole Count', 'numOutputHoles', 3, 12, 1)}
            {renderSlider('Output Hole Radius [mm]', 'outputHoleRadius', 1, 15, 0.5)}
            {renderSlider('Output Hole Offset [mm]', 'outputHoleOffset', 5, 100, 1)}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-primary" onClick={() => setParams(prev => ({ ...prev, isExportModalOpen: true }))} style={{ width: '100%', padding: '12px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export 3D Models
        </button>
      </div>
    </div>
  );
}
