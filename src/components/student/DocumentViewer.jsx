import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize, X, ShieldAlert } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function DocumentViewer({ url, type, title, onClose }) {
  const [scale, setScale] = useState(1.2);
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);

  // Prevent right click
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.2);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-brand-bg/95 backdrop-blur-md">
      {/* Viewer Header */}
      <div className="h-16 border-b border-theme-border bg-theme-card/80 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-theme-text tracking-wide">{title}</h2>
          <span className="px-2 py-1 bg-brand-primary/20 text-brand-primary rounded text-[10px] font-bold uppercase tracking-wider">
            {type} Document
          </span>
          <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full text-xs font-bold">
            <ShieldAlert className="w-4 h-4" /> Protected View
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center bg-theme-card rounded-lg border border-theme-border p-1">
            <button onClick={handleZoomOut} className="p-2 hover:bg-theme-border rounded-md text-theme-text-muted hover:text-theme-text transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-theme-text-muted w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-theme-border rounded-md text-theme-text-muted hover:text-theme-text transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button onClick={handleResetZoom} className="p-2 hover:bg-theme-border rounded-md text-theme-text-muted hover:text-theme-text transition-colors" title="Reset Zoom">
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          <button onClick={onClose} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewer Content (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-8 flex justify-center">
        <div className="max-w-5xl w-full flex flex-col items-center">
          
          {type === 'PDF' ? (
            <div className="pdf-container select-none">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="text-brand-primary font-bold animate-pulse py-20">
                    Decrypting and Loading Premium PDF...
                  </div>
                }
                error={
                  <div className="text-red-400 p-8 text-center bg-red-500/10 rounded-xl border border-red-500/20">
                    Failed to load document securely. Please try again.
                  </div>
                }
              >
                {Array.from(new Array(numPages || 0), (el, index) => (
                  <div key={`page_${index + 1}`} className="mb-6 shadow-2xl rounded-lg overflow-hidden border border-theme-border pointer-events-none">
                    <Page 
                      pageNumber={index + 1} 
                      scale={scale} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false}
                    />
                  </div>
                ))}
              </Document>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="relative shadow-2xl rounded-2xl overflow-hidden border border-theme-border select-none pointer-events-none"
              style={{ width: `${scale * 100}%`, transition: 'width 0.2s ease-out' }}
            >
              <img src={url} alt={title} className="w-full h-auto block bg-white" />
            </motion.div>
          )}

        </div>
      </div>
      
      {/* CSS to enforce no-print and no-select via stylesheet as extra security */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { display: none !important; }
        }
        .pdf-container canvas {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
      `}} />
    </div>
  );
}
