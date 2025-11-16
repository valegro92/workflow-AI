/**
 * BPMN Viewer Component - Read-only BPMN diagram display
 * Uses bpmn-js library to render BPMN 2.0 XML diagrams
 */

import { useEffect, useRef, useState } from 'react';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

interface BPMNViewerProps {
  bpmnXml: string;
  width?: string | number;
  height?: string | number;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * BPMNViewer displays a read-only BPMN diagram
 */
export function BPMNViewer({
  bpmnXml,
  width = '100%',
  height = '500px',
  onError,
  className = ''
}: BPMNViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnViewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize viewer
    const viewer = new BpmnViewer({
      container: containerRef.current,
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    });

    viewerRef.current = viewer;

    // Load BPMN XML
    const loadDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await viewer.importXML(bpmnXml);

        // Fit diagram to viewport
        const canvas = viewer.get('canvas') as any;
        canvas.zoom('fit-viewport');

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load BPMN diagram';
        setError(errorMessage);
        setIsLoading(false);

        if (onError && err instanceof Error) {
          onError(err);
        }

        if (process.env.NODE_ENV === 'development') {
          console.error('BPMN Viewer Error:', err);
        }
      }
    };

    loadDiagram();

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [bpmnXml, width, height, onError]);

  return (
    <div className={`bpmn-viewer-container ${className}`}>
      {isLoading && (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
            <p className="text-sm text-gray-600">Caricamento diagramma BPMN...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-red-900 mb-1">Errore nel caricamento del diagramma</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`bpmn-canvas ${isLoading || error ? 'hidden' : ''}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          backgroundColor: '#ffffff'
        }}
      />
    </div>
  );
}
