import React, { useState, useRef } from 'react';
import { Workflow } from '../types';
import { importWorkflowsFromWord, validateWordFile } from '../utils/wordParser';

interface WordImportProps {
  onImportMultiple: (workflows: Omit<Workflow, 'id' | 'tempoTotale'>[]) => void;
  onClose: () => void;
}

interface PreviewWorkflow {
  file: File;
  workflows: Omit<Workflow, 'id' | 'tempoTotale'>[];
  error: string | null;
  loading: boolean;
}

const WordImport: React.FC<WordImportProps> = ({ onImportMultiple, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<PreviewWorkflow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    // Filtra solo file .docx
    const wordFiles = files.filter((file) => file.name.endsWith('.docx'));

    if (wordFiles.length === 0) {
      alert('Nessun file Word (.docx) trovato');
      return;
    }

    // Crea preview per ogni file
    const newPreviews: PreviewWorkflow[] = wordFiles.map((file) => ({
      file,
      workflows: [],
      error: null,
      loading: true,
    }));

    setPreviews((prev) => [...prev, ...newPreviews]);

    // Processa ogni file
    for (let i = 0; i < wordFiles.length; i++) {
      const file = wordFiles[i];
      const previewIndex = previews.length + i;

      try {
        // Valida il file
        const validation = validateWordFile(file);
        if (!validation.valid) {
          setPreviews((prev) =>
            prev.map((p, idx) =>
              idx === previewIndex ? { ...p, loading: false, error: validation.error || 'Errore validazione' } : p
            )
          );
          continue;
        }

        // Importa i workflows (uno per step)
        const workflows = await importWorkflowsFromWord(file);

        if (!workflows || workflows.length === 0) {
          setPreviews((prev) =>
            prev.map((p, idx) =>
              idx === previewIndex
                ? { ...p, loading: false, error: 'Impossibile estrarre workflow dal documento' }
                : p
            )
          );
          continue;
        }

        // Successo
        setPreviews((prev) =>
          prev.map((p, idx) => (idx === previewIndex ? { ...p, loading: false, workflows } : p))
        );
      } catch (error) {
        console.error('Errore nel processare il file:', error);
        setPreviews((prev) =>
          prev.map((p, idx) =>
            idx === previewIndex ? { ...p, loading: false, error: (error as Error).message } : p
          )
        );
      }
    }
  };

  const handleImportWorkflows = (preview: PreviewWorkflow) => {
    if (preview.workflows.length > 0) {
      onImportMultiple(preview.workflows);
      // Rimuovi dalla lista
      setPreviews((prev) => prev.filter((p) => p !== preview));
    }
  };

  const handleImportAll = () => {
    const validPreviews = previews.filter((p) => p.workflows.length > 0 && !p.error);
    const allWorkflows = validPreviews.flatMap((p) => p.workflows);
    if (allWorkflows.length > 0) {
      onImportMultiple(allWorkflows);
    }
    setPreviews([]);
    onClose();
  };

  const handleRemovePreview = (preview: PreviewWorkflow) => {
    setPreviews((prev) => prev.filter((p) => p !== preview));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">📄 Import da Word</h2>
              <p className="text-sm opacity-90">
                Carica i tuoi file Word (.docx) già compilati e li trasformeremo in workflow automaticamente
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
              title="Chiudi"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Trascina qui i tuoi file Word o clicca per selezionarli
            </p>
            <p className="text-sm text-gray-500 mb-4">Supportati: file .docx</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              Seleziona File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Preview List */}
          {previews.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">File caricati ({previews.length})</h3>
                {previews.some((p) => p.workflows.length > 0 && !p.error) && (
                  <button
                    onClick={handleImportAll}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all text-sm"
                  >
                    Importa Tutti ({previews.reduce((sum, p) => sum + (p.error ? 0 : p.workflows.length), 0)} workflow)
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      preview.error
                        ? 'border-red-300 bg-red-50'
                        : preview.workflows.length > 0
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{preview.file.name}</h4>
                        <p className="text-xs text-gray-500">{(preview.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => handleRemovePreview(preview)}
                        className="text-gray-400 hover:text-red-600 ml-2"
                        title="Rimuovi"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {preview.loading && (
                      <div className="flex items-center text-blue-600 text-sm">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Analisi in corso...
                      </div>
                    )}

                    {preview.error && (
                      <div className="text-red-600 text-sm">
                        <strong>Errore:</strong> {preview.error}
                      </div>
                    )}

                    {preview.workflows.length > 0 && (
                      <div className="mt-3">
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="font-semibold">Processo:</span> {preview.workflows[0]?.fase || 'N/A'}
                            </div>
                            <div>
                              <span className="font-semibold">Workflow estratti:</span> {preview.workflows.length}
                            </div>
                            <div>
                              <span className="font-semibold">Frequenza:</span> {preview.workflows[0]?.frequenza || 0}x/anno
                            </div>
                            <div>
                              <span className="font-semibold">Tempo totale:</span>{' '}
                              {preview.workflows.reduce((sum, w) => sum + w.tempoMedio, 0)} min
                            </div>
                          </div>

                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-semibold text-sm">
                              Vedi dettagli workflow ({preview.workflows.length})
                            </summary>
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                              {preview.workflows.map((workflow, idx) => (
                                <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                  <div className="font-semibold">{workflow.titolo}</div>
                                  <div className="text-gray-600 mt-1">
                                    <div>Tool: {workflow.tool.join(', ')}</div>
                                    <div>Tempo: {workflow.tempoMedio} min</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>

                          <button
                            onClick={() => handleImportWorkflows(preview)}
                            className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all text-sm"
                          >
                            ✓ Importa {preview.workflows.length} Workflow
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          {previews.length === 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Struttura documento richiesta</h4>
              <p className="text-sm text-blue-800 mb-2">Il parser riconosce automaticamente questi campi:</p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li>
                  <strong>Nome workflow:</strong> "Quale processo sto mappando?"
                </li>
                <li>
                  <strong>Frequenza:</strong> giornaliera, settimanale, mensile, annuale
                </li>
                <li>
                  <strong>Step:</strong> numerati come "step 1", "step 2", etc.
                </li>
                <li>Per ogni step: Cosa faccio, Che tool uso, Input, Output, Tempo, Pain points</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordImport;
