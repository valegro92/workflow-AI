import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Workflow } from '../types';
import { calculateTotalTime, generateWorkflowId, getTimeColor } from '../utils/businessLogic';
import OpenRouterKeySetup from './OpenRouterKeySetup';

const FASI_PREDEFINITE = ['Analisi', 'Produzione', 'Controllo', 'Pianificazione', 'Esecuzione', 'Verifica'];

export const Step2Mapping: React.FC = () => {
  const { state, addWorkflow, updateWorkflow, deleteWorkflow, setCurrentStep, setOpenRouterKey } = useAppContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [freeTextDescription, setFreeTextDescription] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'it-IT';

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            }
          }
          if (finalTranscript) {
            setFreeTextDescription(prev => prev + finalTranscript);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setAiError('Permesso microfono negato. Abilita il microfono nelle impostazioni del browser.');
          } else if (event.error === 'network') {
            setAiError('Errore di rete. La registrazione vocale richiede una connessione internet.');
          } else if (event.error === 'no-speech') {
            setAiError('Nessun audio rilevato. Parla più vicino al microfono.');
          } else if (event.error === 'audio-capture') {
            setAiError('Errore nell\'acquisizione audio. Verifica che il microfono sia collegato.');
          } else if (event.error === 'aborted') {
            setAiError('');
          } else {
            setAiError(`Errore durante la registrazione vocale: ${event.error}`);
          }
        };

        recognitionInstance.onend = () => {
          setIsRecording(false);
        };

        setRecognition(recognitionInstance);

        return () => {
          if (recognitionInstance) {
            try { recognitionInstance.stop(); } catch { /* ignore */ }
          }
        };
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      setAiError('Il tuo browser non supporta la registrazione vocale. Usa Chrome, Edge o Safari.');
      return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setAiError('');
      recognition.start();
      setIsRecording(true);
    }
  };

  const [formData, setFormData] = useState<{
    fase: string; titolo: string; descrizione: string;
    tool: string[]; input: string[]; output: string[];
    tempoMedio: number; frequenza: number;
    painPoints: string; owner: string; note: string;
    pii: boolean; hitl: boolean; citazioni: boolean;
  }>({
    fase: '', titolo: '', descrizione: '',
    tool: [''], input: [''], output: [''],
    tempoMedio: 0, frequenza: 0,
    painPoints: '', owner: '', note: '',
    pii: false, hitl: false, citazioni: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showKeySetup, setShowKeySetup] = useState(false);

  const handleAIExtract = async () => {
    if (!freeTextDescription || freeTextDescription.trim().length < 10) {
      setAiError('Inserisci almeno 10 caratteri per descrivere il workflow');
      return;
    }

    // Check for OpenRouter key before calling AI
    if (!state.openRouterKey) {
      setShowKeySetup(true);
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (state.openRouterKey) {
        headers['X-OpenRouter-Key'] = state.openRouterKey;
      }
      const response = await fetch('/api/ai-workflow-extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ description: freeTextDescription }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Errore durante l\'estrazione';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.details || error.error || errorMessage;
        } catch { errorMessage = `Server error (${response.status})`; }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const extracted = data.workflow;
      setFormData({
        fase: extracted.fase || '', titolo: extracted.titolo || '',
        descrizione: extracted.descrizione || '',
        tool: extracted.tool?.length > 0 ? extracted.tool : [''],
        input: extracted.input?.length > 0 ? extracted.input : [''],
        output: extracted.output?.length > 0 ? extracted.output : [''],
        tempoMedio: extracted.tempoMedio || 0, frequenza: extracted.frequenza || 0,
        painPoints: extracted.painPoints || '', owner: '', note: '',
        pii: extracted.pii || false, hitl: extracted.hitl || false,
        citazioni: extracted.citazioni || false,
      });
      setFreeTextDescription('');
      setAiError('');
    } catch (error: any) {
      console.error('Error extracting workflow:', error);
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.fase || formData.fase.trim().length === 0) newErrors.fase = 'La fase è obbligatoria';
    if (!formData.titolo || formData.titolo.length < 3) newErrors.titolo = 'Il titolo deve essere di almeno 3 caratteri';
    if (!formData.descrizione || formData.descrizione.length < 20) newErrors.descrizione = 'La descrizione deve essere di almeno 20 caratteri';
    if (!formData.tempoMedio || formData.tempoMedio <= 0) newErrors.tempoMedio = 'Il tempo medio deve essere maggiore di 0';
    if (!formData.frequenza || formData.frequenza <= 0) newErrors.frequenza = 'La frequenza deve essere maggiore di 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const tempoTotale = calculateTotalTime(formData.tempoMedio || 0, formData.frequenza || 0);
    const tool = formData.tool.filter(t => t.trim() !== '');
    const input = formData.input.filter(i => i.trim() !== '');
    const output = formData.output.filter(o => o.trim() !== '');

    if (editingId) {
      const workflow: Workflow = {
        id: editingId, fase: formData.fase.trim(), titolo: formData.titolo,
        descrizione: formData.descrizione, tool, input, output,
        tempoMedio: formData.tempoMedio, frequenza: formData.frequenza, tempoTotale,
        painPoints: formData.painPoints, owner: formData.owner, note: formData.note,
        pii: formData.pii, hitl: formData.hitl, citazioni: formData.citazioni
      };
      updateWorkflow(editingId, workflow);
      setEditingId(null);
    } else {
      const newId = generateWorkflowId(state.workflows);
      const workflow: Workflow = {
        id: newId, fase: formData.fase.trim(), titolo: formData.titolo,
        descrizione: formData.descrizione, tool, input, output,
        tempoMedio: formData.tempoMedio, frequenza: formData.frequenza, tempoTotale,
        painPoints: formData.painPoints, owner: formData.owner, note: formData.note,
        pii: formData.pii, hitl: formData.hitl, citazioni: formData.citazioni
      };
      addWorkflow(workflow);
    }

    setFormData({
      fase: '', titolo: '', descrizione: '', tool: [''], input: [''], output: [''],
      tempoMedio: 0, frequenza: 0, painPoints: '', owner: '', note: '',
      pii: false, hitl: false, citazioni: false
    });
    setErrors({});
  };

  const handleEdit = (workflow: Workflow) => {
    setFormData({
      fase: workflow.fase, titolo: workflow.titolo, descrizione: workflow.descrizione,
      tool: workflow.tool.length > 0 ? workflow.tool : [''],
      input: workflow.input.length > 0 ? workflow.input : [''],
      output: workflow.output.length > 0 ? workflow.output : [''],
      tempoMedio: workflow.tempoMedio, frequenza: workflow.frequenza,
      painPoints: workflow.painPoints, owner: workflow.owner, note: workflow.note,
      pii: workflow.pii, hitl: workflow.hitl, citazioni: workflow.citazioni
    });
    setEditingId(workflow.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      fase: '', titolo: '', descrizione: '', tool: [''], input: [''], output: [''],
      tempoMedio: 0, frequenza: 0, painPoints: '', owner: '', note: '',
      pii: false, hitl: false, citazioni: false
    });
    setErrors({});
  };

  const addArrayItem = (field: 'tool' | 'input' | 'output') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };
  const removeArrayItem = (field: 'tool' | 'input' | 'output', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length > 0 ? newArray : [''] });
  };
  const updateArrayItem = (field: 'tool' | 'input' | 'output', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const tempoTotaleCalc = calculateTotalTime(formData.tempoMedio || 0, formData.frequenza || 0);

  const inputClasses = (hasError: boolean) =>
    `w-full px-4 py-2 bg-dark-hover border rounded-lg text-white focus:ring-2 focus:ring-brand focus:border-transparent ${hasError ? 'border-red-500' : 'border-dark-border'}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-white mb-2">Mappatura Workflow</h2>

      {/* Context bar */}
      <div className="bg-brand-50 border border-brand/30 text-brand-light rounded-lg px-4 py-3 mb-6 text-sm flex items-center justify-between">
        <span>
          Fase 2 di 4 — Compila i dettagli del processo. L'AI puo aiutarti a compilare il form automaticamente.
          {state.workflows.length > 0 && (
            <span className="ml-2 text-white font-semibold">({state.workflows.length} workflow aggiunti)</span>
          )}
        </span>
        {state.workflows.length > 0 && (
          <button
            onClick={() => setCurrentStep(3)}
            className="bg-brand text-dark-bg font-semibold py-1.5 px-4 rounded-lg hover:bg-brand-light transition-colors text-sm whitespace-nowrap ml-4"
          >
            Vai alla Valutazione →
          </button>
        )}
      </div>

      {/* AI Assistant */}
      <div className="bg-dark-card border border-brand/30 rounded-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-xl font-bold text-white">Compila con AI</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Scrivi o parla per descrivere il workflow, poi l'AI compilerà automaticamente il form.
        </p>
        <div className="relative">
          <textarea
            value={freeTextDescription}
            onChange={(e) => setFreeTextDescription(e.target.value)}
            placeholder="Scrivi qui o usa il microfono... Es: 'Ogni lunedì passo 2 ore a creare il report vendite...'"
            className="w-full px-4 py-3 pr-16 bg-dark-hover border border-dark-border rounded-lg text-white focus:border-brand focus:outline-none min-h-[120px] text-sm placeholder-gray-500"
            disabled={aiLoading || isRecording}
          />
          <button
            type="button"
            onClick={toggleRecording}
            disabled={aiLoading}
            className={`absolute right-3 bottom-3 p-3 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-brand hover:bg-brand-light text-dark-bg'
            } ${aiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRecording ? 'Ferma registrazione' : 'Inizia registrazione vocale'}
          >
            {isRecording ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="7" y="7" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M12 19v3m0 0h-3m3 0h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
            <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full inline-block" />
            <span className="font-semibold">Registrazione in corso...</span>
          </div>
        )}
        {aiError && (
          <div className="mt-3 bg-red-900/50 border border-red-700 p-3 rounded-lg">
            <p className="text-red-300 text-sm">{aiError}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleAIExtract}
          disabled={aiLoading || !freeTextDescription.trim()}
          className={`mt-4 flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            aiLoading || !freeTextDescription.trim()
              ? 'bg-dark-hover text-gray-500 cursor-not-allowed'
              : 'bg-brand hover:bg-brand-light text-dark-bg'
          }`}
        >
          {aiLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Sto compilando...</span>
            </>
          ) : (
            <span>Compila il Form</span>
          )}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border rounded-lg p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Fase *</label>
            <input
              type="text"
              list="fasi-options"
              value={formData.fase}
              onChange={(e) => setFormData({ ...formData, fase: e.target.value })}
              className={inputClasses(!!errors.fase)}
              placeholder="Scegli o scrivi una fase"
            />
            <datalist id="fasi-options">
              {FASI_PREDEFINITE.map(fase => (<option key={fase} value={fase} />))}
            </datalist>
            {errors.fase && <p className="text-red-400 text-sm mt-1">{errors.fase}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Titolo Step *</label>
            <input
              type="text"
              value={formData.titolo}
              onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
              className={inputClasses(!!errors.titolo)}
              placeholder="Es: Compilazione report settimanale"
            />
            {errors.titolo && <p className="text-red-400 text-sm mt-1">{errors.titolo}</p>}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Cosa faccio *</label>
          <textarea
            value={formData.descrizione}
            onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
            rows={4}
            className={inputClasses(!!errors.descrizione)}
            placeholder="Descrivi dettagliatamente cosa fai in questo step..."
          />
          {errors.descrizione && <p className="text-red-400 text-sm mt-1">{errors.descrizione}</p>}
        </div>

        {/* Dynamic arrays */}
        {(['tool', 'input', 'output'] as const).map(field => {
          const labels = { tool: 'Tool usati', input: 'Input necessario', output: 'Output prodotto' };
          const placeholders = { tool: 'Es: Excel, Jira, Notion...', input: 'Es: Dati vendite, Report precedente...', output: 'Es: Report PDF, Email di sintesi...' };
          return (
            <div key={field} className="mt-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">{labels[field]}</label>
              {formData[field].map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateArrayItem(field, index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand focus:border-transparent"
                    placeholder={placeholders[field]}
                  />
                  {formData[field].length > 1 && (
                    <button type="button" onClick={() => removeArrayItem(field, index)}
                      className="px-3 py-2 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem(field)}
                className="mt-2 px-4 py-2 bg-brand-50 text-brand rounded-lg hover:bg-brand-dark font-semibold text-sm">
                + Aggiungi {field.charAt(0).toUpperCase() + field.slice(1)}
              </button>
            </div>
          );
        })}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Tempo medio (minuti) *</label>
            <input
              type="number"
              value={formData.tempoMedio || ''}
              onChange={(e) => setFormData({ ...formData, tempoMedio: Number(e.target.value) })}
              className={inputClasses(!!errors.tempoMedio)}
              placeholder="60" min="1"
            />
            {errors.tempoMedio && <p className="text-red-400 text-sm mt-1">{errors.tempoMedio}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Frequenza al mese *</label>
            <input
              type="number"
              value={formData.frequenza || ''}
              onChange={(e) => setFormData({ ...formData, frequenza: Number(e.target.value) })}
              className={inputClasses(!!errors.frequenza)}
              placeholder="4" min="1"
            />
            {errors.frequenza && <p className="text-red-400 text-sm mt-1">{errors.frequenza}</p>}
          </div>
        </div>

        {tempoTotaleCalc > 0 && (
          <div className="mt-4 p-4 bg-brand-50 border border-brand/30 rounded-lg">
            <p className="text-sm font-semibold text-gray-300">
              Tempo totale: <span className="text-brand text-lg">{tempoTotaleCalc} minuti/mese</span>
              {' '}({Math.round(tempoTotaleCalc / 60 * 10) / 10} ore/mese)
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Pain Points</label>
            <input type="text" value={formData.painPoints}
              onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
              className={inputClasses(false)} placeholder="Problemi principali" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Owner/Responsabile</label>
            <input type="text" value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              className={inputClasses(false)} placeholder="Nome responsabile" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-6">
          {[
            { key: 'pii' as const, label: 'PII (Dati Personali)' },
            { key: 'hitl' as const, label: 'HITL (Supervisione Umana)' },
            { key: 'citazioni' as const, label: 'Citazioni Fonti' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input type="checkbox" checked={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                className="w-5 h-5 rounded bg-dark-hover border-dark-border text-brand focus:ring-brand" />
              <span className="ml-2 text-sm text-gray-300">{label}</span>
            </label>
          ))}
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Note aggiuntive</label>
          <textarea value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand focus:border-transparent"
            placeholder="Note opzionali..." />
        </div>

        <div className="mt-6 flex gap-4">
          <button type="submit"
            className="bg-brand hover:bg-brand-light text-dark-bg font-bold py-3 px-6 rounded-lg transition-colors">
            {editingId ? 'Salva Modifiche' : 'Aggiungi Step'}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancelEdit}
              className="bg-dark-hover hover:bg-dark-border text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Annulla
            </button>
          )}
        </div>
      </form>

      {/* Workflow List */}
      {state.workflows.length > 0 && (
        <>
          <h3 className="text-2xl font-bold text-white mb-4">
            Step Creati ({state.workflows.length})
          </h3>

          <div className="space-y-4 mb-8">
            {state.workflows.map((workflow) => (
              <div key={workflow.id}
                className="bg-dark-card border border-dark-border rounded-lg p-6 border-l-4"
                style={{ borderLeftColor: getTimeColor(workflow.tempoTotale) }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <span className="inline-block bg-dark-hover text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
                      {workflow.id}
                    </span>
                    <span className="inline-block bg-brand-50 text-brand px-3 py-1 rounded-full text-sm font-semibold">
                      {workflow.fase}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(workflow)}
                      className="text-brand hover:text-brand-light font-semibold text-sm">
                      Modifica
                    </button>
                    <button onClick={() => {
                      if (window.confirm('Sei sicuro di voler eliminare questo workflow?')) {
                        deleteWorkflow(workflow.id);
                      }
                    }}
                      className="text-red-400 hover:text-red-300 font-semibold text-sm">
                      Elimina
                    </button>
                  </div>
                </div>

                <h4 className="text-xl font-bold text-white mb-2">{workflow.titolo}</h4>
                <p className="text-gray-400 mb-3">{workflow.descrizione}</p>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-300">Tempo totale:</span>{' '}
                    <span style={{ color: getTimeColor(workflow.tempoTotale) }} className="font-bold">
                      {workflow.tempoTotale} min/mese
                    </span>
                  </div>
                  {workflow.tool.length > 0 && workflow.tool[0] !== '' && (
                    <div><span className="font-semibold text-gray-300">Tool:</span> <span className="text-gray-400">{workflow.tool.join(', ')}</span></div>
                  )}
                  {workflow.input.length > 0 && workflow.input[0] !== '' && (
                    <div><span className="font-semibold text-gray-300">Input:</span> <span className="text-gray-400">{workflow.input.join(', ')}</span></div>
                  )}
                  {workflow.output.length > 0 && workflow.output[0] !== '' && (
                    <div><span className="font-semibold text-gray-300">Output:</span> <span className="text-gray-400">{workflow.output.join(', ')}</span></div>
                  )}
                  {workflow.owner && (
                    <div><span className="font-semibold text-gray-300">Owner:</span> <span className="text-gray-400">{workflow.owner}</span></div>
                  )}
                  {workflow.painPoints && (
                    <div><span className="font-semibold text-gray-300">Pain Points:</span> <span className="text-gray-400">{workflow.painPoints}</span></div>
                  )}
                </div>

                {(workflow.pii || workflow.hitl || workflow.citazioni) && (
                  <div className="mt-3 flex gap-2">
                    {workflow.pii && <span className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-xs font-semibold">PII</span>}
                    {workflow.hitl && <span className="bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded text-xs font-semibold">HITL</span>}
                    {workflow.citazioni && <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs font-semibold">Citazioni</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setCurrentStep(1)}
              className="bg-dark-hover hover:bg-dark-border text-white font-bold py-3 px-6 rounded-lg transition-colors">
              Indietro
            </button>
            <button onClick={() => setCurrentStep(3)}
              className="bg-brand hover:bg-brand-light text-dark-bg font-bold py-3 px-6 rounded-lg transition-colors">
              Procedi alla Valutazione
            </button>
          </div>
        </>
      )}

      {state.workflows.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Nessun workflow creato. Inizia compilando il form sopra!</p>
        </div>
      )}

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
};
