import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Workflow } from '../types';
import { calculateTotalTime, generateWorkflowId, getTimeColor } from '../utils/businessLogic';

const FASI_PREDEFINITE = ['Analisi', 'Produzione', 'Controllo', 'Pianificazione', 'Esecuzione', 'Verifica'];

export const Step2Mapping: React.FC = () => {
  const { state, addWorkflow, updateWorkflow, deleteWorkflow, setCurrentStep } = useAppContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [freeTextDescription, setFreeTextDescription] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');

  const [formData, setFormData] = useState<{
    fase: string;
    titolo: string;
    descrizione: string;
    tool: string[];
    input: string[];
    output: string[];
    tempoMedio: number;
    frequenza: number;
    painPoints: string;
    owner: string;
    note: string;
    pii: boolean;
    hitl: boolean;
    citazioni: boolean;
  }>({
    fase: '',
    titolo: '',
    descrizione: '',
    tool: [''],
    input: [''],
    output: [''],
    tempoMedio: 0,
    frequenza: 0,
    painPoints: '',
    owner: '',
    note: '',
    pii: false,
    hitl: false,
    citazioni: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAIExtract = async () => {
    if (!freeTextDescription || freeTextDescription.trim().length < 10) {
      setAiError('Inserisci almeno 10 caratteri per descrivere il workflow');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const response = await fetch('/api/ai-workflow-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: freeTextDescription,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Errore durante l\'estrazione';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.details || error.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const extracted = data.workflow;

      // Popola il form con i dati estratti
      setFormData({
        fase: extracted.fase || '',
        titolo: extracted.titolo || '',
        descrizione: extracted.descrizione || '',
        tool: extracted.tool && extracted.tool.length > 0 ? extracted.tool : [''],
        input: extracted.input && extracted.input.length > 0 ? extracted.input : [''],
        output: extracted.output && extracted.output.length > 0 ? extracted.output : [''],
        tempoMedio: extracted.tempoMedio || 0,
        frequenza: extracted.frequenza || 0,
        painPoints: extracted.painPoints || '',
        owner: '',
        note: '',
        pii: extracted.pii || false,
        hitl: extracted.hitl || false,
        citazioni: extracted.citazioni || false,
      });

      // Clear the free text dopo la compilazione
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

    if (!formData.fase || formData.fase.trim().length === 0) {
      newErrors.fase = 'La fase è obbligatoria';
    }

    if (!formData.titolo || formData.titolo.length < 3) {
      newErrors.titolo = 'Il titolo deve essere di almeno 3 caratteri';
    }

    if (!formData.descrizione || formData.descrizione.length < 20) {
      newErrors.descrizione = 'La descrizione deve essere di almeno 20 caratteri';
    }

    if (!formData.tempoMedio || formData.tempoMedio <= 0) {
      newErrors.tempoMedio = 'Il tempo medio deve essere maggiore di 0';
    }

    if (!formData.frequenza || formData.frequenza <= 0) {
      newErrors.frequenza = 'La frequenza deve essere maggiore di 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const tempoTotale = calculateTotalTime(
      formData.tempoMedio || 0,
      formData.frequenza || 0
    );

    // Filtra array vuoti
    const tool = formData.tool.filter(t => t.trim() !== '');
    const input = formData.input.filter(i => i.trim() !== '');
    const output = formData.output.filter(o => o.trim() !== '');

    if (editingId) {
      const workflow: Workflow = {
        id: editingId,
        fase: formData.fase.trim(),
        titolo: formData.titolo,
        descrizione: formData.descrizione,
        tool,
        input,
        output,
        tempoMedio: formData.tempoMedio,
        frequenza: formData.frequenza,
        tempoTotale,
        painPoints: formData.painPoints,
        owner: formData.owner,
        note: formData.note,
        pii: formData.pii,
        hitl: formData.hitl,
        citazioni: formData.citazioni
      };
      updateWorkflow(editingId, workflow);
      setEditingId(null);
    } else {
      const newId = generateWorkflowId(state.workflows);
      const workflow: Workflow = {
        id: newId,
        fase: formData.fase.trim(),
        titolo: formData.titolo,
        descrizione: formData.descrizione,
        tool,
        input,
        output,
        tempoMedio: formData.tempoMedio,
        frequenza: formData.frequenza,
        tempoTotale,
        painPoints: formData.painPoints,
        owner: formData.owner,
        note: formData.note,
        pii: formData.pii,
        hitl: formData.hitl,
        citazioni: formData.citazioni
      };
      addWorkflow(workflow);
    }

    // Reset form
    setFormData({
      fase: '',
      titolo: '',
      descrizione: '',
      tool: [''],
      input: [''],
      output: [''],
      tempoMedio: 0,
      frequenza: 0,
      painPoints: '',
      owner: '',
      note: '',
      pii: false,
      hitl: false,
      citazioni: false
    });
    setErrors({});
  };

  const handleEdit = (workflow: Workflow) => {
    setFormData({
      fase: workflow.fase,
      titolo: workflow.titolo,
      descrizione: workflow.descrizione,
      tool: workflow.tool.length > 0 ? workflow.tool : [''],
      input: workflow.input.length > 0 ? workflow.input : [''],
      output: workflow.output.length > 0 ? workflow.output : [''],
      tempoMedio: workflow.tempoMedio,
      frequenza: workflow.frequenza,
      painPoints: workflow.painPoints,
      owner: workflow.owner,
      note: workflow.note,
      pii: workflow.pii,
      hitl: workflow.hitl,
      citazioni: workflow.citazioni
    });
    setEditingId(workflow.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      fase: '',
      titolo: '',
      descrizione: '',
      tool: [''],
      input: [''],
      output: [''],
      tempoMedio: 0,
      frequenza: 0,
      painPoints: '',
      owner: '',
      note: '',
      pii: false,
      hitl: false,
      citazioni: false
    });
    setErrors({});
  };

  // Gestione array dinamici
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

  const tempoTotaleCalc = calculateTotalTime(
    formData.tempoMedio || 0,
    formData.frequenza || 0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        📝 Mappatura Workflow
      </h2>

      {/* AI Assistant - Compilazione Automatica */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-md p-6 mb-8 border-2 border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🪄</span>
          <h3 className="text-xl font-bold text-gray-900">Compila con AI</h3>
        </div>
        <p className="text-gray-700 text-sm mb-4">
          Descrivi il workflow a parole libere e l'AI compilerà automaticamente il form per te.
        </p>
        <textarea
          value={freeTextDescription}
          onChange={(e) => setFreeTextDescription(e.target.value)}
          placeholder="Esempio: 'Ogni lunedì passo 2 ore a creare il report vendite. Prendo i dati dal CRM, li metto su Excel, faccio pivot table, poi mando email al team. È noioso e a volte sbaglio le formule.'"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none min-h-[120px] text-sm"
          disabled={aiLoading}
        />
        {aiError && (
          <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-3 rounded">
            <p className="text-red-700 text-sm">{aiError}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleAIExtract}
          disabled={aiLoading || !freeTextDescription.trim()}
          className={`mt-4 flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            aiLoading || !freeTextDescription.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {aiLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sto compilando...</span>
            </>
          ) : (
            <>
              <span>🪄</span>
              <span>Compila il Form</span>
            </>
          )}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Fase - Combobox personalizzabile */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fase *
            </label>
            <input
              type="text"
              list="fasi-options"
              value={formData.fase}
              onChange={(e) => setFormData({ ...formData, fase: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.fase ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Scegli o scrivi una fase"
            />
            <datalist id="fasi-options">
              {FASI_PREDEFINITE.map(fase => (
                <option key={fase} value={fase} />
              ))}
            </datalist>
            {errors.fase && (
              <p className="text-red-500 text-sm mt-1">{errors.fase}</p>
            )}
          </div>

          {/* Titolo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Titolo Step *
            </label>
            <input
              type="text"
              value={formData.titolo}
              onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.titolo ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Es: Compilazione report settimanale"
            />
            {errors.titolo && (
              <p className="text-red-500 text-sm mt-1">{errors.titolo}</p>
            )}
          </div>
        </div>

        {/* Descrizione */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cosa faccio *
          </label>
          <textarea
            value={formData.descrizione}
            onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.descrizione ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Descrivi dettagliatamente cosa fai in questo step..."
          />
          {errors.descrizione && (
            <p className="text-red-500 text-sm mt-1">{errors.descrizione}</p>
          )}
        </div>

        {/* Tool usati - Array multiplo */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🛠️ Tool usati
          </label>
          {formData.tool.map((tool, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={tool}
                onChange={(e) => updateArrayItem('tool', index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Es: Excel, Jira, Notion..."
              />
              {formData.tool.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('tool', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('tool')}
            className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
          >
            + Aggiungi Tool
          </button>
        </div>

        {/* Input necessario - Array multiplo */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📥 Input necessario
          </label>
          {formData.input.map((inputItem, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={inputItem}
                onChange={(e) => updateArrayItem('input', index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Es: Dati vendite, Report precedente..."
              />
              {formData.input.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('input', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('input')}
            className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
          >
            + Aggiungi Input
          </button>
        </div>

        {/* Output prodotto - Array multiplo */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📤 Output prodotto
          </label>
          {formData.output.map((outputItem, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={outputItem}
                onChange={(e) => updateArrayItem('output', index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Es: Report PDF, Email di sintesi..."
              />
              {formData.output.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem('output', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('output')}
            className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
          >
            + Aggiungi Output
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Tempo Medio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tempo medio (minuti) *
            </label>
            <input
              type="number"
              value={formData.tempoMedio || ''}
              onChange={(e) => setFormData({ ...formData, tempoMedio: Number(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.tempoMedio ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="60"
              min="1"
            />
            {errors.tempoMedio && (
              <p className="text-red-500 text-sm mt-1">{errors.tempoMedio}</p>
            )}
          </div>

          {/* Frequenza */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Frequenza al mese *
            </label>
            <input
              type="number"
              value={formData.frequenza || ''}
              onChange={(e) => setFormData({ ...formData, frequenza: Number(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.frequenza ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="4"
              min="1"
            />
            {errors.frequenza && (
              <p className="text-red-500 text-sm mt-1">{errors.frequenza}</p>
            )}
          </div>
        </div>

        {/* Calcolo Tempo Totale */}
        {tempoTotaleCalc > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">
              ⏱️ Tempo totale: <span className="text-blue-600 text-lg">{tempoTotaleCalc} minuti/mese</span>
              {' '}({Math.round(tempoTotaleCalc / 60 * 10) / 10} ore/mese)
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Pain Points */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pain Points
            </label>
            <input
              type="text"
              value={formData.painPoints}
              onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Problemi principali"
            />
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Owner/Responsabile
            </label>
            <input
              type="text"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome responsabile"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="mt-6 flex gap-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.pii}
              onChange={(e) => setFormData({ ...formData, pii: e.target.checked })}
              className="w-5 h-5 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">PII (Dati Personali)</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.hitl}
              onChange={(e) => setFormData({ ...formData, hitl: e.target.checked })}
              className="w-5 h-5 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">HITL (Supervisione Umana)</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.citazioni}
              onChange={(e) => setFormData({ ...formData, citazioni: e.target.checked })}
              className="w-5 h-5 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Citazioni Fonti</span>
          </label>
        </div>

        {/* Note */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Note aggiuntive
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Note opzionali..."
          />
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {editingId ? '✓ Salva Modifiche' : '✓ Aggiungi Step'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Annulla
            </button>
          )}
        </div>
      </form>

      {/* Lista Step Creati */}
      {state.workflows.length > 0 && (
        <>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Step Creati ({state.workflows.length})
          </h3>

          <div className="space-y-4 mb-8">
            {state.workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white rounded-lg shadow-md p-6 border-l-4"
                style={{ borderLeftColor: getTimeColor(workflow.tempoTotale) }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold mr-2">
                      {workflow.id}
                    </span>
                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {workflow.fase}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(workflow)}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Sei sicuro di voler eliminare questo workflow?')) {
                          deleteWorkflow(workflow.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 font-semibold"
                    >
                      Elimina
                    </button>
                  </div>
                </div>

                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {workflow.titolo}
                </h4>
                <p className="text-gray-700 mb-3">
                  {workflow.descrizione}
                </p>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">⏱️ Tempo totale:</span>{' '}
                    <span style={{ color: getTimeColor(workflow.tempoTotale) }} className="font-bold">
                      {workflow.tempoTotale} min/mese
                    </span>
                  </div>
                  {workflow.tool.length > 0 && workflow.tool[0] !== '' && (
                    <div>
                      <span className="font-semibold">🛠️ Tool:</span> {workflow.tool.join(', ')}
                    </div>
                  )}
                  {workflow.input.length > 0 && workflow.input[0] !== '' && (
                    <div>
                      <span className="font-semibold">📥 Input:</span> {workflow.input.join(', ')}
                    </div>
                  )}
                  {workflow.output.length > 0 && workflow.output[0] !== '' && (
                    <div>
                      <span className="font-semibold">📤 Output:</span> {workflow.output.join(', ')}
                    </div>
                  )}
                  {workflow.owner && (
                    <div>
                      <span className="font-semibold">👤 Owner:</span> {workflow.owner}
                    </div>
                  )}
                  {workflow.painPoints && (
                    <div>
                      <span className="font-semibold">⚠️ Pain Points:</span> {workflow.painPoints}
                    </div>
                  )}
                </div>

                {(workflow.pii || workflow.hitl || workflow.citazioni) && (
                  <div className="mt-3 flex gap-2">
                    {workflow.pii && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                        PII
                      </span>
                    )}
                    {workflow.hitl && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                        HITL
                      </span>
                    )}
                    {workflow.citazioni && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
                        Citazioni
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ← Indietro
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Procedi alla Valutazione →
            </button>
          </div>
        </>
      )}

      {state.workflows.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Nessun workflow creato. Inizia compilando il form sopra!</p>
        </div>
      )}
    </div>
  );
};
