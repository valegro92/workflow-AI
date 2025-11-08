import React, { useState, useRef } from 'react';
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

    // Validate file type
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|mp4|m4a|wav)$/i)) {
      setUploadStatus('❌ Formato file non valido. Usa MP3, MP4, M4A o WAV');
      return;
    }

    // Validate file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      setUploadStatus('❌ File troppo grande. Massimo 25MB');
      return;
    }

    setIsProcessing(true);
    setUploadStatus('🎤 Trascrizione audio in corso...');

    try {
      // Convert file to base64 for reliable Vercel upload
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage = 'Errore durante il processing';

        try {
          const error = JSON.parse(responseText);
          errorMessage = error.details || error.error || errorMessage;
        } catch {
          console.error('API Error (non-JSON):', responseText.substring(0, 500));
          errorMessage = `Server error (${response.status})`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUploadStatus('🧠 Estrazione workflow in corso...');

      if (data.workflows && data.workflows.length > 0) {
        bulkAddWorkflows(data.workflows);
        setUploadStatus(`✅ ${data.workflows.length} workflow importati con successo!`);

        setTimeout(() => {
          setUploadStatus('');
        }, 3000);
      } else {
        setUploadStatus('⚠️ Nessun workflow trovato nella trascrizione');
      }

    } catch (error: any) {
      console.error('Error processing audio:', error);
      setUploadStatus(`❌ Errore: ${error.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const evaluatedCount = Object.keys(state.evaluations).length;
  const hasWorkflows = state.workflows.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Workflow Mappati</p>
              <p className="text-3xl font-bold text-blue-600">{state.workflows.length}</p>
            </div>
            <span className="text-4xl">📝</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Workflow Valutati</p>
              <p className="text-3xl font-bold text-green-600">{evaluatedCount}</p>
            </div>
            <span className="text-4xl">⚖️</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tempo Totale</p>
              <p className="text-3xl font-bold text-purple-600">{state.stats.totalTime}</p>
              <p className="text-xs text-gray-500">min/mese</p>
            </div>
            <span className="text-4xl">⏱️</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setCurrentStep(2)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3"
        >
          <span className="text-2xl">+</span>
          <span>Aggiungi Workflow</span>
        </button>

        <label
          htmlFor="audio-upload"
          className={`
            text-white font-bold py-4 px-6 rounded-lg transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer
            ${isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
            }
          `}
        >
          <span className="text-2xl">🎤</span>
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
        <div className={`
          mb-6 p-4 rounded-lg text-sm font-medium text-center
          ${uploadStatus.startsWith('✅') ? 'bg-green-100 text-green-800' :
            uploadStatus.startsWith('❌') ? 'bg-red-100 text-red-800' :
            uploadStatus.startsWith('⚠️') ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'}
        `}>
          {uploadStatus}
        </div>
      )}

      {/* ROI Calculator (Collapsible) */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowROI(!showROI)}
        >
          <div className="flex items-center">
            <span className="text-2xl mr-3">💰</span>
            <h3 className="text-lg font-bold text-gray-900">
              Calcola Risparmio Economico
            </h3>
          </div>
          <span className="text-gray-500 text-xl">
            {showROI ? '▼' : '▶'}
          </span>
        </div>

        {showROI && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-gray-600 mb-4 text-sm">
              Inserisci il tuo costo orario per calcolare il risparmio mensile
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 flex-1">
                <span className="text-gray-700 font-semibold whitespace-nowrap">
                  Costo orario:
                </span>
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-700 font-semibold">€/ora</span>
              </label>
            </div>
            {state.costoOrario && (
              <p className="mt-3 text-sm text-green-600">
                ✓ ROI calcolato in base a {state.costoOrario}€/ora
              </p>
            )}
          </div>
        )}
      </div>

      {/* Workflow List */}
      {hasWorkflows ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            I tuoi workflow
          </h2>
          <div className="space-y-2">
            {state.workflows.map((workflow) => {
              const isEvaluated = !!state.evaluations[workflow.id];
              const evaluation = state.evaluations[workflow.id];

              return (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`text-xl ${isEvaluated ? 'text-green-600' : 'text-gray-300'}`}>
                      {isEvaluated ? '✓' : '○'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">{workflow.id}</span>
                        <span className="font-semibold text-gray-900">{workflow.titolo}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                        <span>📂 {workflow.fase}</span>
                        <span>⏱️ {workflow.tempoTotale} min/mese</span>
                        {isEvaluated && evaluation && (
                          <span
                            className="px-2 py-0.5 rounded-full text-white font-semibold"
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
                        className="text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded font-semibold transition-colors"
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
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nessun workflow ancora
          </h3>
          <p className="text-gray-600 mb-6">
            Inizia aggiungendo il tuo primo workflow o importa da registrazione audio
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              + Aggiungi Workflow
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
