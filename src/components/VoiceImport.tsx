import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import OpenRouterKeySetup from './OpenRouterKeySetup';

interface VoiceImportProps {
  onImportComplete: () => void;
  onClose: () => void;
}

const VoiceImport: React.FC<VoiceImportProps> = ({ onImportComplete, onClose }) => {
  const { state, bulkAddWorkflows, setOpenRouterKey } = useAppContext();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [showKeySetup, setShowKeySetup] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleDictation = useCallback(() => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Il tuo browser non supporta la dettatura vocale. Usa Chrome o Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'it-IT';

    let finalTranscript = transcript;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setStatus(`Errore dettatura: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setTranscript(finalTranscript);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setStatus('');
  }, [isRecording, transcript]);

  const processTranscript = async (keyOverride?: string) => {
    const text = transcript.trim();
    if (!text || text.length < 20) {
      setStatus('Testo troppo breve. Descrivi almeno un processo in dettaglio.');
      return;
    }

    const apiKey = keyOverride || state.openRouterKey;
    if (!apiKey) {
      setShowKeySetup(true);
      return;
    }

    setIsProcessing(true);
    setStatus('Estrazione workflow in corso...');

    try {
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenRouter-Key': apiKey,
        },
        body: JSON.stringify({ transcript: text }),
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

      if (data.workflows && data.workflows.length > 0) {
        bulkAddWorkflows(data.workflows);
        setStatus(`${data.workflows.length} workflow importati con successo!`);
        setTimeout(() => {
          onImportComplete();
        }, 1500);
      } else {
        setStatus('Nessun workflow trovato. Prova a descrivere i processi in modo piu\' dettagliato.');
      }
    } catch (error: any) {
      console.error('Error processing transcript:', error);
      setStatus(`Errore: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeySaved = (key: string) => {
    setOpenRouterKey(key);
    setShowKeySetup(false);
    // Retry processing with the key directly (state may not be updated yet)
    setTimeout(() => processTranscript(key), 100);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Importa da Nota Vocale</h2>
              <p className="text-sm text-gray-400">Dettata o incolla il testo dei tuoi processi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Dictation button */}
          <div className="flex gap-2">
            <button
              onClick={toggleDictation}
              disabled={isProcessing}
              className={`flex-1 font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-dark-hover border border-dark-border hover:border-brand text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>{isRecording ? 'Stop Dettatura' : 'Inizia Dettatura Vocale'}</span>
            </button>
          </div>

          {isRecording && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-center">
              <p className="text-sm text-red-300 animate-pulse">Registrazione in corso... Parla ora</p>
            </div>
          )}

          {/* Editable transcript textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trascrizione / Testo dei processi
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Puoi dettare a voce, incollare testo da Word, note o qualsiasi fonte. Descrivi i tuoi processi in dettaglio: cosa fai, che strumenti usi, quanto tempo impieghi, con che frequenza.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Esempio: Ogni lunedi preparo il report settimanale delle vendite. Apro Excel, scarico i dati dal CRM, creo i grafici e invio il PDF via email al direttore commerciale. Ci metto circa 2 ore..."
              rows={10}
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-dark-hover border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-brand focus:border-transparent resize-y min-h-[150px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              {transcript.length} caratteri {transcript.length < 20 && transcript.length > 0 ? '(minimo 20)' : ''}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => processTranscript()}
              disabled={isProcessing || isRecording || transcript.trim().length < 20}
              className="flex-1 bg-brand hover:bg-brand-light text-dark-bg font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Elaborazione AI...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Estrai Workflow con AI</span>
                </>
              )}
            </button>
            {transcript && !isProcessing && (
              <button
                onClick={() => setTranscript('')}
                className="px-4 py-3 text-gray-400 hover:text-white border border-dark-border rounded-lg transition-colors"
              >
                Cancella
              </button>
            )}
          </div>

          {/* Status message */}
          {status && (
            <div className={`p-3 rounded-lg text-sm font-medium text-center ${
              status.includes('successo') ? 'bg-green-900/50 text-green-300 border border-green-700' :
              status.startsWith('Errore') || status.startsWith('Il tuo browser') || status.startsWith('Testo troppo') ? 'bg-red-900/50 text-red-300 border border-red-700' :
              status.startsWith('Nessun') ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
              'bg-brand-50 text-brand-light border border-brand/30'
            }`}>
              {status}
            </div>
          )}

          {/* Tips */}
          <div className="bg-dark-hover border border-dark-border rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-300 mb-2">Suggerimenti per risultati migliori:</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>- Descrivi ogni processo separatamente con dettagli</li>
              <li>- Indica gli strumenti usati (Excel, Email, CRM, etc.)</li>
              <li>- Specifica tempi e frequenza (es. "ogni settimana", "ci metto 2 ore")</li>
              <li>- Menziona problemi e difficolta che incontri</li>
              <li>- Puoi incollare testi lunghi da documenti Word o note</li>
            </ul>
          </div>
        </div>
      </div>

      {/* OpenRouter Key Setup Modal */}
      {showKeySetup && (
        <OpenRouterKeySetup
          onKeySaved={handleKeySaved}
          onCancel={() => setShowKeySetup(false)}
        />
      )}
    </div>
  );
};

export default VoiceImport;
