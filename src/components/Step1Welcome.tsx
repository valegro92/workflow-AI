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
        // Read body as text first (can only read once)
        const responseText = await response.text();
        let errorMessage = 'Errore durante il processing';

        try {
          // Try to parse as JSON
          const error = JSON.parse(responseText);
          errorMessage = error.details || error.error || errorMessage;
        } catch {
          // If JSON parsing fails, it's likely HTML error page
          console.error('API Error (non-JSON):', responseText.substring(0, 500));
          errorMessage = `Server error (${response.status})`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      setUploadStatus('🧠 Estrazione workflow in corso...');

      // Import workflows
      if (data.workflows && data.workflows.length > 0) {
        bulkAddWorkflows(data.workflows);
        setUploadStatus(`✅ ${data.workflows.length} workflow importati con successo!`);

        // Auto-navigate to step 2 after 2 seconds
        setTimeout(() => {
          setCurrentStep(2);
        }, 2000);
      } else {
        setUploadStatus('⚠️ Nessun workflow trovato nella trascrizione');
      }

    } catch (error: any) {
      console.error('Error processing audio:', error);
      setUploadStatus(`❌ Errore: ${error.message}`);
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Workflow AI Analyzer
        </h1>
        <p className="text-xl text-gray-600">
          Identifica quali attività delegare all'AI
        </p>
      </div>

      {/* 3 Info Boxes */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Mappa il Workflow
          </h3>
          <p className="text-gray-700">
            Descrivi ogni step del tuo processo con dettagli su tempi, input e output
          </p>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Valuta gli Step
          </h3>
          <p className="text-gray-700">
            Rispondi a 8 domande scientifiche su automazione e carico cognitivo
          </p>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Strategia AI
          </h3>
          <p className="text-gray-700">
            Ottieni la matrice 2×2 e scopri come l'AI può aiutarti
          </p>
        </div>
      </div>

      {/* Consiglio Pratico */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-bold text-yellow-800 mb-1">
              Consiglio pratico
            </h3>
            <p className="text-yellow-700">
              Inizia con un processo ripetitivo che svolgi regolarmente (es: report settimanali,
              preparazione documenti, analisi dati)
            </p>
          </div>
        </div>
      </div>

      {/* Opzionale: Calcolo ROI */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowROI(!showROI)}
        >
          <div className="flex items-center">
            <span className="text-2xl mr-3">💰</span>
            <h3 className="text-lg font-bold text-gray-900">
              Calcola il Risparmio Economico (opzionale)
            </h3>
          </div>
          <span className="text-gray-500 text-xl">
            {showROI ? '▼' : '▶'}
          </span>
        </div>

        {showROI && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-gray-600 mb-4 text-sm">
              Inserisci il tuo costo orario in € per calcolare automaticamente il risparmio economico
              mensile derivante dall'automazione.
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
                ✓ Verrà calcolato il ROI in base a {state.costoOrario}€/ora
              </p>
            )}
          </div>
        )}
      </div>

      {/* Import da Audio */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">🎙️</span>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Import Automatico da Registrazione Workshop
            </h3>
            <p className="text-sm text-gray-600">
              Carica un file audio MP3/M4A/WAV del workshop con il cliente - l'AI estrarrà automaticamente i workflow
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.mp4,.m4a,.wav,audio/*"
          onChange={handleAudioUpload}
          disabled={isProcessing}
          className="hidden"
          id="audio-upload"
        />

        <label
          htmlFor="audio-upload"
          className={`
            block w-full text-center py-3 px-6 rounded-lg font-semibold cursor-pointer transition-all
            ${isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg'
            }
          `}
        >
          {isProcessing ? '⏳ Elaborazione in corso...' : '🎤 Carica Audio Workshop (max 25MB)'}
        </label>

        {uploadStatus && (
          <div className={`
            mt-4 p-3 rounded-lg text-sm font-medium text-center
            ${uploadStatus.startsWith('✅') ? 'bg-green-100 text-green-800' :
              uploadStatus.startsWith('❌') ? 'bg-red-100 text-red-800' :
              uploadStatus.startsWith('⚠️') ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'}
          `}>
            {uploadStatus}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>💡 Formati supportati: MP3, MP4, M4A, WAV • Massimo 25MB • Trascrizione + Analisi AI in ~10 secondi</p>
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-gray-500 text-sm mb-2">oppure</p>
      </div>

      {/* CTA Button */}
      <div className="text-center">
        <button
          onClick={() => setCurrentStep(2)}
          className="
            bg-blue-600 hover:bg-blue-700 text-white font-bold
            py-4 px-12 rounded-lg text-xl
            transition-all duration-200 transform hover:scale-105
            shadow-lg hover:shadow-xl
          "
        >
          Inserisci Manualmente →
        </button>
      </div>
    </div>
  );
};
