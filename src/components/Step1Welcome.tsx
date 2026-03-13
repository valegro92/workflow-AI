import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export const Step1Welcome: React.FC = () => {
  const { state, setCurrentStep, setCostoOrario, bulkAddWorkflows } = useAppContext();
  const [showROI, setShowROI] = useState(false);
  const [costoInput, setCostoInput] = useState<string>(
    state.costoOrario ? state.costoOrario.toString() : ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|mp4|m4a|wav)$/i)) {
      setUploadStatus('Formato file non valido. Usa MP3, MP4, M4A o WAV');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadStatus('File troppo grande. Massimo 25MB');
      return;
    }

    setIsProcessing(true);
    setUploadStatus('Trascrizione audio in corso...');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, filename: file.name }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage = 'Errore durante il processing';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.details || error.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUploadStatus('Estrazione workflow in corso...');

      if (data.workflows && data.workflows.length > 0) {
        bulkAddWorkflows(data.workflows);
        setUploadStatus(`${data.workflows.length} workflow importati con successo!`);
      } else {
        setUploadStatus('Nessun workflow trovato nella trascrizione');
      }
    } catch (error: any) {
      console.error('Error processing audio:', error);
      setUploadStatus(`Errore: ${error.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (!uploadStatus || uploadStatus.startsWith('Errore') || uploadStatus.startsWith('Nessun') || uploadStatus.startsWith('Formato') || uploadStatus.startsWith('File troppo')) {
      return;
    }
    const timer = setTimeout(() => setUploadStatus(''), 5000);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  const evaluatedCount = Object.keys(state.evaluations).length;
  const hasWorkflows = state.workflows.length > 0;

  // Onboarding view for first-time users
  if (!hasWorkflows) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="bg-dark-card border border-brand/30 rounded-2xl p-8 md:p-12 text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Benvenuto nel Workflow AI Analyzer
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Mappa i tuoi processi lavorativi, valuta quali possono essere automatizzati con l'AI e genera un piano di implementazione con priorita e ROI.
          </p>

          {/* Mini flow */}
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-8 flex-wrap">
            {[
              { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Mappa' },
              { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Valuta' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Strategia' },
              { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Piano AI' },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <svg className="w-5 h-5 text-gray-500 flex-shrink-0 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-brand-50 border border-brand/30 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <p className="text-sm text-brand-light">
            Un regalo per gli iscritti a La Cassetta degli AI-trezzi
          </p>
        </div>

        {/* 3 Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setCurrentStep(2)}
            className="bg-brand hover:bg-brand-light text-dark-bg font-bold py-6 px-6 rounded-xl transition-all flex flex-col items-center gap-3"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-lg">Crea il tuo primo workflow</span>
            <span className="text-sm opacity-75 font-normal">Compila il form guidato</span>
          </button>

          <button
            onClick={() => {
              // Trigger template library via custom event
              window.dispatchEvent(new CustomEvent('openTemplateLibrary'));
            }}
            className="bg-dark-card border-2 border-brand/40 hover:border-brand text-white font-bold py-6 px-6 rounded-xl transition-all flex flex-col items-center gap-3"
          >
            <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-lg">Importa da Template</span>
            <span className="text-sm text-gray-400 font-normal">Scegli da processi comuni</span>
          </button>

          <div className="bg-dark-card border-2 border-dark-border hover:border-brand/40 text-white font-bold py-6 px-6 rounded-xl transition-all flex flex-col items-center gap-3">
            <label htmlFor="audio-upload-onboarding" className={`flex flex-col items-center gap-3 cursor-pointer w-full ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-lg">{isProcessing ? 'Elaborazione...' : 'Importa da Audio'}</span>
              <span className="text-sm text-gray-400 font-normal">Carica una registrazione</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.mp4,.m4a,.wav,audio/*"
              onChange={handleAudioUpload}
              disabled={isProcessing}
              className="hidden"
              id="audio-upload-onboarding"
            />
          </div>
        </div>

        {/* Upload Status */}
        {uploadStatus && (
          <div className={`p-4 rounded-lg text-sm font-medium text-center ${
            uploadStatus.includes('successo') ? 'bg-green-900/50 text-green-300 border border-green-700' :
            uploadStatus.startsWith('Errore') || uploadStatus.startsWith('Formato') || uploadStatus.startsWith('File troppo') ? 'bg-red-900/50 text-red-300 border border-red-700' :
            uploadStatus.startsWith('Nessun') ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
            'bg-brand-50 text-brand-light border border-brand/30'
          }`}>
            {uploadStatus}
          </div>
        )}
      </div>
    );
  }

  // Dashboard view with workflows
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Workflow Mappati</p>
              <p className="text-3xl font-bold text-brand">{state.workflows.length}</p>
            </div>
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Workflow Valutati</p>
              <p className="text-3xl font-bold text-brand-light">{evaluatedCount}</p>
            </div>
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Tempo Totale</p>
              <p className="text-3xl font-bold text-white">{state.stats.totalTime}</p>
              <p className="text-xs text-gray-500">min/mese</p>
            </div>
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setCurrentStep(2)}
          className="bg-brand hover:bg-brand-light text-dark-bg font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3"
        >
          <span className="text-2xl">+</span>
          <span>Aggiungi Workflow</span>
        </button>

        <label
          htmlFor="audio-upload"
          className={`
            text-white font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 cursor-pointer
            ${isProcessing
              ? 'bg-dark-hover cursor-not-allowed'
              : 'bg-dark-card border border-dark-border hover:border-brand'
            }
          `}
        >
          <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>{isProcessing ? 'Elaborazione...' : 'Importa da Audio'}</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.mp4,.m4a,.wav,audio/*"
          onChange={handleAudioUpload}
          disabled={isProcessing}
          className="hidden"
          id="audio-upload"
        />
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium text-center ${
          uploadStatus.includes('successo') ? 'bg-green-900/50 text-green-300 border border-green-700' :
          uploadStatus.startsWith('Errore') || uploadStatus.startsWith('Formato') || uploadStatus.startsWith('File troppo') ? 'bg-red-900/50 text-red-300 border border-red-700' :
          uploadStatus.startsWith('Nessun') ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
          'bg-brand-50 text-brand-light border border-brand/30'
        }`}>
          {uploadStatus}
        </div>
      )}

      {/* ROI Calculator */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6 mb-8">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowROI(!showROI)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Calcola Risparmio Economico</h3>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showROI ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {showROI && (
          <div className="mt-4 pt-4 border-t border-dark-border">
            <p className="text-gray-400 mb-4 text-sm">
              Inserisci il tuo costo orario per calcolare il risparmio mensile
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 flex-1">
                <span className="text-gray-300 font-semibold whitespace-nowrap">Costo orario:</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={costoInput}
                  onChange={(e) => {
                    setCostoInput(e.target.value);
                    const value = parseFloat(e.target.value);
                    setCostoOrario(value > 0 ? value : undefined);
                  }}
                  placeholder="es: 50"
                  className="flex-1 px-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand focus:border-transparent"
                />
                <span className="text-gray-300 font-semibold">/ora</span>
              </label>
            </div>
            {state.costoOrario && (
              <p className="mt-3 text-sm text-brand">
                ROI calcolato in base a {state.costoOrario}/ora
              </p>
            )}
          </div>
        )}
      </div>

      {/* Workflow List */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">I tuoi workflow</h2>
        <div className="space-y-2">
          {state.workflows.map((workflow) => {
            const isEvaluated = !!state.evaluations[workflow.id];
            const evaluation = state.evaluations[workflow.id];

            return (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-3 hover:bg-dark-hover rounded-lg transition-colors border border-dark-border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`text-xl ${isEvaluated ? 'text-brand' : 'text-gray-600'}`}>
                    {isEvaluated ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-500">{workflow.id}</span>
                      <span className="font-semibold text-white">{workflow.titolo}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>{workflow.fase}</span>
                      <span>{workflow.tempoTotale} min/mese</span>
                      {isEvaluated && evaluation && (
                        <span
                          className="px-2 py-0.5 rounded-full text-white font-semibold text-[10px]"
                          style={{ backgroundColor: evaluation.strategy.color }}
                        >
                          {evaluation.strategy.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isEvaluated && (
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="text-sm bg-brand-50 text-brand hover:bg-brand-dark px-3 py-1 rounded font-semibold transition-colors"
                    >
                      Da valutare
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
