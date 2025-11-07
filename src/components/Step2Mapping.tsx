import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Workflow } from '../types';
import { calculateTotalTime, generateWorkflowId, getTimeColor } from '../utils/businessLogic';

export const Step2Mapping: React.FC = () => {
  const { state, addWorkflow, updateWorkflow, deleteWorkflow, setCurrentStep } = useAppContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Workflow>>({
    fase: 'Analisi',
    titolo: '',
    descrizione: '',
    tool: '',
    input: '',
    output: '',
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

    if (editingId) {
      // Modifica workflow esistente
      const workflow: Workflow = {
        id: editingId,
        fase: formData.fase as 'Analisi' | 'Produzione' | 'Controllo',
        titolo: formData.titolo || '',
        descrizione: formData.descrizione || '',
        tool: formData.tool || '',
        input: formData.input || '',
        output: formData.output || '',
        tempoMedio: formData.tempoMedio || 0,
        frequenza: formData.frequenza || 0,
        tempoTotale,
        painPoints: formData.painPoints || '',
        owner: formData.owner || '',
        note: formData.note || '',
        pii: formData.pii || false,
        hitl: formData.hitl || false,
        citazioni: formData.citazioni || false
      };
      updateWorkflow(editingId, workflow);
      setEditingId(null);
    } else {
      // Nuovo workflow
      const newId = generateWorkflowId(state.workflows);
      const workflow: Workflow = {
        id: newId,
        fase: formData.fase as 'Analisi' | 'Produzione' | 'Controllo',
        titolo: formData.titolo || '',
        descrizione: formData.descrizione || '',
        tool: formData.tool || '',
        input: formData.input || '',
        output: formData.output || '',
        tempoMedio: formData.tempoMedio || 0,
        frequenza: formData.frequenza || 0,
        tempoTotale,
        painPoints: formData.painPoints || '',
        owner: formData.owner || '',
        note: formData.note || '',
        pii: formData.pii || false,
        hitl: formData.hitl || false,
        citazioni: formData.citazioni || false
      };
      addWorkflow(workflow);
    }

    // Reset form
    setFormData({
      fase: 'Analisi',
      titolo: '',
      descrizione: '',
      tool: '',
      input: '',
      output: '',
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
    setFormData(workflow);
    setEditingId(workflow.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      fase: 'Analisi',
      titolo: '',
      descrizione: '',
      tool: '',
      input: '',
      output: '',
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

  const tempoTotaleCalc = calculateTotalTime(
    formData.tempoMedio || 0,
    formData.frequenza || 0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        📝 Mappatura Workflow
      </h2>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Fase */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fase *
            </label>
            <select
              value={formData.fase}
              onChange={(e) => setFormData({ ...formData, fase: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Analisi">Analisi</option>
              <option value="Produzione">Produzione</option>
              <option value="Controllo">Controllo</option>
            </select>
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

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {/* Tool */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tool usati
            </label>
            <input
              type="text"
              value={formData.tool}
              onChange={(e) => setFormData({ ...formData, tool: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es: Excel, Jira"
            />
          </div>

          {/* Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Input necessario
            </label>
            <input
              type="text"
              value={formData.input}
              onChange={(e) => setFormData({ ...formData, input: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es: Dati vendite"
            />
          </div>

          {/* Output */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Output prodotto
            </label>
            <input
              type="text"
              value={formData.output}
              onChange={(e) => setFormData({ ...formData, output: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es: Report PDF"
            />
          </div>
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
                  {workflow.tool && (
                    <div>
                      <span className="font-semibold">🛠️ Tool:</span> {workflow.tool}
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
