import React from 'react';

export default function ExportModal({ isOpen, onClose, numGears, onDownloadGears, onDownloadRing, onDownloadAll }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export 3D Models</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <button className="btn btn-primary" onClick={onDownloadAll} style={{ marginBottom: '20px', width: '100%', padding: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download All as ZIP
          </button>
          
          <div className="divider"></div>
          
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Individual Files</h3>
          <div className="export-list">
            {Array.from({ length: numGears }).map((_, i) => (
              <button key={i} className="btn" onClick={() => onDownloadGears(i + 1)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Disc {i + 1}
              </button>
            ))}
            <button className="btn btn-secondary" onClick={onDownloadRing}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download Outer Ring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
