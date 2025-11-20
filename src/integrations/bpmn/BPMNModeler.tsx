/**
 * BPMN Modeler Component - Editable BPMN diagram editor
 * Uses bpmn-js library with editing capabilities
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

interface BPMNModelerProps {
  bpmnXml: string;
  width?: string | number;
  height?: string | number;
  onXmlChange?: (xml: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  readOnly?: boolean;
}

/**
 * BPMNModeler provides an editable BPMN diagram editor
 */
export function BPMNModeler({
  bpmnXml,
  width = '100%',
  height = '600px',
  onXmlChange,
  onError,
  className = '',
  readOnly = false
}: BPMNModelerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propertiesPanelRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);

  // Export current diagram as XML
  const exportXML = useCallback(async () => {
    if (!modelerRef.current) return null;

    try {
      const result = await modelerRef.current.saveXML({ format: true });
      return result.xml;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to export BPMN XML:', err);
      }
      return null;
    }
  }, []);

  // Download diagram as .bpmn file
  const downloadBPMN = useCallback(async () => {
    const xml = await exportXML();
    if (!xml) return;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-diagram-${Date.now()}.bpmn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportXML]);

  // Download diagram as SVG image
  const downloadSVG = useCallback(async () => {
    if (!modelerRef.current) return;

    try {
      const result = await modelerRef.current.saveSVG();
      const blob = new Blob([result.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-diagram-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to export SVG:', err);
      }
    }
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get('canvas') as any;
    canvas.zoom(canvas.zoom() + 0.1);
  }, []);

  const zoomOut = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get('canvas') as any;
    canvas.zoom(canvas.zoom() - 0.1);
  }, []);

  const zoomReset = useCallback(() => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get('canvas') as any;
    canvas.zoom('fit-viewport');
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize modeler
    const modeler = new BpmnModeler({
      container: containerRef.current,
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      keyboard: {
        bindTo: document
      }
    });

    modelerRef.current = modeler;

    // Load BPMN XML
    const loadDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await modeler.importXML(bpmnXml);

        // Fit diagram to viewport con try-catch per errore SVGMatrix
        try {
          const canvas = modeler.get('canvas') as any;
          if (canvas && typeof canvas.zoom === 'function') {
            try {
              canvas.zoom('fit-viewport');
            } catch (zoomError) {
              console.warn('Fit-viewport failed in modeler, using fallback zoom:', zoomError);
              canvas.zoom(0.8);
            }
          }
        } catch (canvasError) {
          console.warn('Canvas zoom error in modeler (non-critical):', canvasError);
        }

        // Listen for changes
        const eventBus = modeler.get('eventBus') as any;
        eventBus.on('commandStack.changed', async () => {
          setHasChanges(true);
          if (onXmlChange) {
            const xml = await exportXML();
            if (xml) {
              onXmlChange(xml);
            }
          }
        });

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load BPMN diagram';
        setError(errorMessage);
        setIsLoading(false);

        if (onError && err instanceof Error) {
          onError(err);
        }

        if (process.env.NODE_ENV === 'development') {
          console.error('BPMN Modeler Error:', err);
        }
      }
    };

    loadDiagram();

    // Cleanup
    return () => {
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
    };
  }, [bpmnXml, width, height, onError, onXmlChange, exportXML]);

  return (
    <div className={`bpmn-modeler-container relative ${className}`}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="bg-white border border-gray-200 rounded-t-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={zoomIn}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              title="Zoom In"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
            <button
              onClick={zoomOut}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              title="Zoom Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <button
              onClick={zoomReset}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              title="Fit to View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-orange-600 mr-2">• Modifiche non salvate</span>
            )}
            <button
              onClick={downloadBPMN}
              className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              title="Download BPMN XML"
            >
              Scarica BPMN
            </button>
            <button
              onClick={downloadSVG}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              title="Download SVG Image"
            >
              Scarica SVG
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
            <p className="text-sm text-gray-600">Caricamento editor BPMN...</p>
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
              <h4 className="text-sm font-semibold text-red-900 mb-1">Errore nell'editor del diagramma</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Editor Layout: Canvas + Properties Panel */}
      <div className={`flex ${isLoading || error ? 'hidden' : ''}`}>
        {/* Canvas */}
        <div
          ref={containerRef}
          className={`flex-1 bpmn-canvas ${readOnly ? 'rounded-lg' : 'rounded-bl-lg'}`}
          style={{
            height: typeof height === 'number' ? `${height}px` : height,
            border: '1px solid #e5e7eb',
            borderTop: readOnly ? '1px solid #e5e7eb' : 'none',
            borderRight: showPropertiesPanel && !readOnly ? 'none' : '1px solid #e5e7eb',
            backgroundColor: '#ffffff'
          }}
        />

        {/* Properties Panel */}
        {!readOnly && showPropertiesPanel && (
          <div
            ref={propertiesPanelRef}
            className="properties-panel-parent rounded-br-lg"
            style={{
              width: '300px',
              height: typeof height === 'number' ? `${height}px` : height,
              border: '1px solid #e5e7eb',
              borderTop: 'none',
              borderLeft: 'none',
              backgroundColor: '#f9fafb',
              overflowY: 'auto'
            }}
          />
        )}
      </div>

      {/* Toggle Properties Panel */}
      {!readOnly && !isLoading && !error && (
        <button
          onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
          className="absolute top-16 right-4 z-10 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 shadow-sm"
          title={showPropertiesPanel ? 'Nascondi pannello proprietà' : 'Mostra pannello proprietà'}
        >
          {showPropertiesPanel ? '➡️ Nascondi Proprietà' : '⬅️ Mostra Proprietà'}
        </button>
      )}
    </div>
  );
}
