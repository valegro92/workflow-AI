import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Workflow } from '../types';
import { calculateTotalTime } from '../utils/businessLogic';
import OpenRouterKeySetup from './OpenRouterKeySetup';

interface SmartImportProps {
  onClose: () => void;
}

interface ExtractedWorkflow {
  fase: string;
  titolo: string;
  descrizione: string;
  tool: string[];
  input: string[];
  output: string[];
  tempoMedio: number;
  frequenza: number;
  painPoints: string;
  pii: boolean;
  hitl: boolean;
  citazioni: boolean;
}

export default function SmartImport({ onClose }: SmartImportProps) {
  const { state, bulkAddWorkflows, setCurrentStep, setOpenRouterKey } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [extractedWorkflows, setExtractedWorkflows] = useState<ExtractedWorkflow[]>([]);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError('');
    setExtractedWorkflows([]);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'txt' && ext !== 'json') {
      setError('Formato non supportato. Usa file .txt o .json');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File troppo grande. Massimo 5MB.');
      return;
    }

    try {
      const text = await file.text();
      setFileName(file.name);

      // For JSON, try to pretty-format for display
      if (ext === 'json') {
        try {
          const parsed = JSON.parse(text);
          setFileContent(JSON.stringify(parsed, null, 2));
        } catch {
          setFileContent(text);
        }
      } else {
        setFileContent(text);
      }
    } catch (err: any) {
      setError('Errore nella lettura del file: ' + (err.message || 'Errore sconosciuto'));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await handleFileSelect(files[0]);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) await handleFileSelect(files[0]);
  };

  const handleAnalyze = async () => {
    if (!fileContent.trim()) {
      setError('Nessun contenuto da analizzare.');
      return;
    }

    if (!state.openRouterKey) {
      setShowKeySetup(true);
      return;
    }

    setIsLoading(true);
    setError('');
    setExtractedWorkflows([]);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.openRouterKey) {
        headers['X-OpenRouter-Key'] = state.openRouterKey;
      }

      const response = await fetch('/api/ai-workflow-extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          description: fileContent,
          multi: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Errore durante l\'analisi';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.workflows && Array.isArray(data.workflows)) {
        setExtractedWorkflows(data.workflows);
      } else {
        throw new Error('Risposta AI non contiene workflow validi.');
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'analisi del documento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveWorkflow = (index: number) => {
    setExtractedWorkflows(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = () => {
    if (extractedWorkflows.length === 0) return;

    const workflowsToAdd: Workflow[] = extractedWorkflows.map((wf, index) => {
      const id = `W${String(state.workflows.length + index + 1).padStart(3, '0')}`;
      const tempoTotale = calculateTotalTime(wf.tempoMedio, wf.frequenza);
      return {
        id,
        fase: wf.fase,
        titolo: wf.titolo,
        descrizione: wf.descrizione,
        tool: wf.tool || [],
        input: wf.input || [],
        output: wf.output || [],
        tempoMedio: wf.tempoMedio,
        frequenza: wf.frequenza,
        tempoTotale,
        painPoints: wf.painPoints || '',
        owner: '',
        note: '',
        pii: wf.pii || false,
        hitl: wf.hitl || false,
        citazioni: wf.citazioni || false,
      };
    });

    bulkAddWorkflows(workflowsToAdd);
    setCurrentStep(2);
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-dark-hover border-b border-brand/30 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Import Intelligente</h2>
            <p className="text-sm text-gray-400 mt-1">
              Importa un file TXT o JSON e l'AI identifichera automaticamente le fasi del processo
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold" aria-label="Chiudi">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1: File Upload */}
          {extractedWorkflows.length === 0 && (
            <>
              {/* Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-brand bg-brand-50' : 'border-dark-border hover:border-gray-500 hover:bg-dark-hover'}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-5xl mb-4">
                  <svg className="w-14 h-14 mx-auto text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-white mb-2">
                  Trascina qui il file o clicca per selezionare
                </p>
                <p className="text-sm text-gray-400">
                  Formati supportati: TXT, JSON (max 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* File Preview */}
              {fileContent && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-white">{fileName}</span>
                      <span className="text-xs text-gray-500">({Math.round(fileContent.length / 1024)}KB)</span>
                    </div>
                    <button
                      onClick={() => { setFileContent(''); setFileName(''); }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Rimuovi
                    </button>
                  </div>
                  <pre className="bg-dark-hover border border-dark-border rounded-lg p-4 text-sm text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                    {fileContent.substring(0, 3000)}
                    {fileContent.length > 3000 && '\n\n... (troncato per la preview)'}
                  </pre>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 bg-red-900/50 border border-red-700 p-3 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Analyze Button */}
              {fileContent && (
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className={`mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    isLoading
                      ? 'bg-dark-hover text-gray-500 cursor-not-allowed'
                      : 'bg-brand hover:bg-brand-light text-dark-bg'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Analisi in corso... L'AI sta identificando le fasi</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Analizza con AI</span>
                    </>
                  )}
                </button>
              )}

              {/* Instructions */}
              <div className="mt-4 bg-dark-hover rounded-lg p-4 text-sm text-gray-300">
                <h4 className="font-semibold mb-2">Come funziona:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Carica un file <strong>.txt</strong> o <strong>.json</strong> che descrive il tuo processo</li>
                  <li>L'AI analizza il contenuto e identifica ogni singola fase/step</li>
                  <li>Rivedi le fasi estratte e rimuovi quelle che non ti servono</li>
                  <li>Conferma l'importazione</li>
                </ol>
              </div>
            </>
          )}

          {/* Step 2: Extracted Workflows Preview */}
          {extractedWorkflows.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {extractedWorkflows.length} fasi identificate
                  </h3>
                  <p className="text-sm text-gray-400">
                    Rimuovi le fasi che non vuoi importare, poi conferma.
                  </p>
                </div>
                <button
                  onClick={() => { setExtractedWorkflows([]); setError(''); }}
                  className="text-sm text-gray-400 hover:text-white px-3 py-1 border border-dark-border rounded-lg"
                >
                  Ricomincia
                </button>
              </div>

              <div className="space-y-3">
                {extractedWorkflows.map((wf, index) => (
                  <div
                    key={index}
                    className="bg-dark-hover border border-dark-border rounded-lg p-4 relative group"
                  >
                    {/* Delete button */}
                    <button
                      onClick={() => handleRemoveWorkflow(index)}
                      className="absolute top-3 right-3 p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Rimuovi questa fase"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Phase badge and title */}
                    <div className="flex items-start gap-2 pr-10">
                      <span className="inline-block bg-brand-50 text-brand px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap mt-0.5">
                        {wf.fase}
                      </span>
                      <h4 className="font-bold text-white">{wf.titolo}</h4>
                    </div>

                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{wf.descrizione}</p>

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                      <span>
                        <strong className="text-gray-300">Tempo:</strong> {wf.tempoMedio} min
                      </span>
                      <span>
                        <strong className="text-gray-300">Frequenza:</strong> {wf.frequenza}/mese
                      </span>
                      {wf.tool.length > 0 && (
                        <span>
                          <strong className="text-gray-300">Tool:</strong> {wf.tool.join(', ')}
                        </span>
                      )}
                    </div>

                    {(wf.pii || wf.hitl || wf.citazioni) && (
                      <div className="mt-2 flex gap-1">
                        {wf.pii && <span className="bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded text-xs">PII</span>}
                        {wf.hitl && <span className="bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded text-xs">HITL</span>}
                        {wf.citazioni && <span className="bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded text-xs">Citazioni</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {extractedWorkflows.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Hai rimosso tutte le fasi. Clicca "Ricomincia" per analizzare di nuovo.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-dark-hover px-6 py-4 flex justify-between gap-3 border-t border-dark-border flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-dark-border rounded-lg transition-colors"
          >
            Chiudi
          </button>
          {extractedWorkflows.length > 0 && (
            <button
              onClick={handleConfirmImport}
              className="bg-brand hover:bg-brand-light text-dark-bg font-bold px-6 py-2 rounded-lg transition-colors"
            >
              Importa {extractedWorkflows.length} fasi
            </button>
          )}
        </div>
      </div>

      {showKeySetup && (
        <OpenRouterKeySetup
          onKeySaved={(key: string) => {
            setOpenRouterKey(key);
            setShowKeySetup(false);
          }}
          onCancel={() => setShowKeySetup(false)}
        />
      )}
    </div>
  );
}
