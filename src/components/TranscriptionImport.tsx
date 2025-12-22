import React, { useState, useRef } from 'react';
import { Workflow } from '../types';
import {
  validateTranscriptionFile,
  readAndParseTranscription,
  cleanTranscriptionText,
  SUPPORTED_TRANSCRIPTION_EXTENSIONS,
  TranscriptionParseResult
} from '../utils/transcriptionParser';

interface TranscriptionImportProps {
  onImportMultiple: (workflows: Workflow[]) => void;
  onClose: () => void;
}

interface TranscriptionPreview {
  file: File;
  parseResult: TranscriptionParseResult | null;
  workflows: Workflow[];
  error: string | null;
  loading: boolean;
  processingAI: boolean;
}

const TranscriptionImport: React.FC<TranscriptionImportProps> = ({ onImportMultiple, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<TranscriptionPreview[]>([]);
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
    // Filter supported file types
    const validFiles = files.filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return SUPPORTED_TRANSCRIPTION_EXTENSIONS.includes(ext);
    });

    if (validFiles.length === 0) {
      alert(`Nessun file supportato trovato. Formati accettati: ${SUPPORTED_TRANSCRIPTION_EXTENSIONS.join(', ')}`);
      return;
    }

    // Create preview entries
    const newPreviews: TranscriptionPreview[] = validFiles.map((file) => ({
      file,
      parseResult: null,
      workflows: [],
      error: null,
      loading: true,
      processingAI: false,
    }));

    const startIndex = previews.length;
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Process each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const previewIndex = startIndex + i;

      try {
        // Validate file
        const validation = validateTranscriptionFile(file);
        if (!validation.valid) {
          setPreviews((prev) =>
            prev.map((p, idx) =>
              idx === previewIndex ? { ...p, loading: false, error: validation.error || 'Errore validazione' } : p
            )
          );
          continue;
        }

        // Parse the transcription file
        const parseResult = await readAndParseTranscription(file);

        if (!parseResult.text || parseResult.text.trim().length === 0) {
          setPreviews((prev) =>
            prev.map((p, idx) =>
              idx === previewIndex ? { ...p, loading: false, error: 'Il file non contiene testo leggibile' } : p
            )
          );
          continue;
        }

        // Update with parse result (before AI processing)
        setPreviews((prev) =>
          prev.map((p, idx) =>
            idx === previewIndex ? { ...p, loading: false, parseResult } : p
          )
        );

      } catch (error) {
        console.error('Errore nel parsing del file:', error);
        setPreviews((prev) =>
          prev.map((p, idx) =>
            idx === previewIndex ? { ...p, loading: false, error: (error as Error).message } : p
          )
        );
      }
    }
  };

  const handleExtractWorkflows = async (preview: TranscriptionPreview, previewIndex: number) => {
    if (!preview.parseResult?.text) return;

    setPreviews((prev) =>
      prev.map((p, idx) =>
        idx === previewIndex ? { ...p, processingAI: true, error: null } : p
      )
    );

    try {
      // Clean the transcription text
      const cleanedText = cleanTranscriptionText(preview.parseResult.text);

      // Call API to extract workflows
      const response = await fetch('/api/process-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: cleanedText,
          filename: preview.file.name,
          format: preview.parseResult.format,
          speakers: preview.parseResult.speakers,
        }),
      });

      // Handle non-OK responses with proper error parsing
      if (!response.ok) {
        let errorMessage = `Errore HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          // Try to parse as JSON first
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If not JSON, use text directly (truncated)
            if (errorText && errorText.length > 0) {
              errorMessage = errorText.substring(0, 200);
            }
          }
        } catch {
          // Ignore read errors
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Risposta del server non valida. Riprova tra qualche minuto.');
      }

      if (!data.success || !data.workflows || data.workflows.length === 0) {
        throw new Error('Nessun workflow estratto dalla trascrizione. Verifica che contenga descrizioni di processi.');
      }

      // Use workflows directly from API (includes id and tempoTotale)
      const workflows: Workflow[] = data.workflows.map((w: Workflow) => ({
        id: w.id,
        fase: w.fase || 'Generale',
        titolo: w.titolo,
        descrizione: w.descrizione,
        tool: w.tool || [],
        input: w.input || [],
        output: w.output || [],
        tempoMedio: w.tempoMedio,
        frequenza: w.frequenza,
        tempoTotale: w.tempoTotale,
        painPoints: w.painPoints || '',
        pii: w.pii || false,
        hitl: w.hitl || false,
        citazioni: w.citazioni || false,
        owner: w.owner || '',
        note: w.note || '',
      }));

      setPreviews((prev) =>
        prev.map((p, idx) =>
          idx === previewIndex ? { ...p, processingAI: false, workflows } : p
        )
      );

    } catch (error) {
      console.error('Errore nell\'estrazione workflows:', error);
      setPreviews((prev) =>
        prev.map((p, idx) =>
          idx === previewIndex ? { ...p, processingAI: false, error: (error as Error).message } : p
        )
      );
    }
  };

  const handleImportWorkflows = (preview: TranscriptionPreview) => {
    if (preview.workflows.length > 0) {
      onImportMultiple(preview.workflows);
      // Remove from list
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

  const handleRemovePreview = (preview: TranscriptionPreview) => {
    setPreviews((prev) => prev.filter((p) => p !== preview));
  };

  const formatFormatLabel = (format: string) => {
    switch (format) {
      case 'vtt':
        return 'WebVTT';
      case 'srt':
        return 'SubRip (SRT)';
      case 'txt':
        return 'Testo semplice';
      case 'docx':
        return 'Microsoft Word';
      default:
        return format.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Import da Trascrizione</h2>
              <p className="text-sm opacity-90">
                Carica le trascrizioni delle tue call (TXT, VTT, SRT) e le trasformeremo in workflow
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
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
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
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Trascina qui i tuoi file di trascrizione
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supportati: {SUPPORTED_TRANSCRIPTION_EXTENSIONS.join(', ')} (max 25MB)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-all"
            >
              Seleziona File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_TRANSCRIPTION_EXTENSIONS.join(',')}
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
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-all text-sm"
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
                        : preview.parseResult
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{preview.file.name}</h4>
                        <p className="text-xs text-gray-500">
                          {(preview.file.size / 1024).toFixed(1)} KB
                          {preview.parseResult && (
                            <> | Formato: {formatFormatLabel(preview.parseResult.format)}</>
                          )}
                          {preview.parseResult?.speakers && preview.parseResult.speakers.length > 0 && (
                            <> | {preview.parseResult.speakers.length} speaker rilevati</>
                          )}
                        </p>
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

                    {/* Loading state - parsing */}
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
                        Lettura file in corso...
                      </div>
                    )}

                    {/* Processing AI state */}
                    {preview.processingAI && (
                      <div className="flex items-center text-purple-600 text-sm">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        AI sta estraendo i workflow...
                      </div>
                    )}

                    {/* Error state */}
                    {preview.error && (
                      <div className="text-red-600 text-sm">
                        <strong>Errore:</strong> {preview.error}
                      </div>
                    )}

                    {/* Parsed but not yet processed */}
                    {preview.parseResult && preview.workflows.length === 0 && !preview.processingAI && !preview.error && (
                      <div className="mt-3">
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="text-sm text-gray-700 mb-3">
                            <strong>{preview.parseResult.text.length.toLocaleString()}</strong> caratteri rilevati
                            {preview.parseResult.speakers.length > 0 && (
                              <span className="ml-2">
                                | Speaker: {preview.parseResult.speakers.slice(0, 3).join(', ')}
                                {preview.parseResult.speakers.length > 3 && '...'}
                              </span>
                            )}
                          </div>

                          <details className="mb-3">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 text-sm">
                              Anteprima trascrizione
                            </summary>
                            <div className="mt-2 bg-gray-50 p-3 rounded text-xs max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                              {preview.parseResult.text.substring(0, 1000)}
                              {preview.parseResult.text.length > 1000 && '...'}
                            </div>
                          </details>

                          <button
                            onClick={() => handleExtractWorkflows(preview, index)}
                            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-all text-sm"
                          >
                            Estrai Workflow con AI
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Workflows extracted */}
                    {preview.workflows.length > 0 && (
                      <div className="mt-3">
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="font-semibold">Workflow estratti:</span> {preview.workflows.length}
                            </div>
                            <div>
                              <span className="font-semibold">Tempo totale:</span>{' '}
                              {preview.workflows.reduce((sum, w) => sum + w.tempoMedio, 0)} min
                            </div>
                          </div>

                          <details className="mt-2">
                            <summary className="cursor-pointer text-purple-600 hover:text-purple-800 font-semibold text-sm">
                              Vedi dettagli workflow ({preview.workflows.length})
                            </summary>
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                              {preview.workflows.map((workflow, idx) => (
                                <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                                  <div className="font-semibold">{workflow.titolo}</div>
                                  <div className="text-gray-600 mt-1">
                                    <div>Fase: {workflow.fase}</div>
                                    <div>Tool: {workflow.tool.join(', ') || 'N/A'}</div>
                                    <div>Tempo: {workflow.tempoMedio} min | Frequenza: {workflow.frequenza}x/mese</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>

                          <button
                            onClick={() => handleImportWorkflows(preview)}
                            className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all text-sm"
                          >
                            Importa {preview.workflows.length} Workflow
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
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">Formati supportati</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-purple-800">
                <div>
                  <h5 className="font-semibold mb-1">.docx - Microsoft Word</h5>
                  <p className="text-xs">Trascrizioni e note meeting esportate da Teams, documenti di processo aziendali</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-1">.txt - Testo semplice</h5>
                  <p className="text-xs">Trascrizioni da qualsiasi fonte. Riconosce speaker nel formato "Nome: testo"</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-1">.vtt - WebVTT</h5>
                  <p className="text-xs">Sottotitoli da YouTube, Teams, Google Meet con timestamp</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-1">.srt - SubRip</h5>
                  <p className="text-xs">Sottotitoli standard da Zoom, tool di trascrizione automatica</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-1">.md - Markdown</h5>
                  <p className="text-xs">Note strutturate, export da Notion, Obsidian, etc.</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200">
                <p className="text-xs text-purple-700">
                  <strong>Creazione Flussi:</strong> L'AI identifica automaticamente i flussi di processo completi,
                  collegando gli step in sequenza (l'output di uno diventa input del successivo).
                  Per risultati ottimali, descrivi processi end-to-end con attivita, tool, input/output e responsabili.
                </p>
              </div>
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

export default TranscriptionImport;
