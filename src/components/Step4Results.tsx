import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { exportToPDF, calculateMonthlySavings, calculateROI } from '../utils/businessLogic';
import { workflowToBpmn, workflowsToBpmn, BPMNViewer } from '../integrations/bpmn';

export const Step4Results: React.FC = () => {
  const { state, currentAzienda, setCurrentStep, resetApp, saveImplementationPlan } = useAppContext();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('all');

  const handleExport = () => {
    if (!currentAzienda) {
      alert('Errore: nessuna azienda selezionata');
      return;
    }
    exportToPDF(
      state.workflows,
      state.evaluations,
      currentAzienda,
      state.costoOrario,
      state.implementationPlan
    );
  };

  const handleReset = () => {
    if (window.confirm('Sei sicuro di voler cancellare tutti i dati e ricominciare?')) {
      resetApp();
      setCurrentStep(1);
    }
  };

  const handleGenerateAIPlan = async () => {
    setAiLoading(true);
    setAiError('');

    try {
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'implementation-plan',
          workflows: state.workflows,
          evaluations: state.evaluations,
          costoOrario: state.costoOrario,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Errore durante la generazione del piano';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.details || error.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      saveImplementationPlan(data.suggestion);
      setAiError(''); // Clear any previous errors

    } catch (error: any) {
      console.error('Error generating AI plan:', error);
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const { stats } = state;

  const getWorkflowsForStrategy = (strategyName: string) => {
    return state.workflows.filter(w => {
      const evaluation = state.evaluations[w.id];
      return evaluation && evaluation.strategy.name.includes(strategyName);
    });
  };

  const partnerWorkflows = getWorkflowsForStrategy('Brainstorming');
  const assistantWorkflows = getWorkflowsForStrategy('Assistente AI');
  const toolWorkflows = getWorkflowsForStrategy('Strumento');

  const getPercentage = (count: number) => {
    return stats.totalSteps > 0
      ? Math.round((count / stats.totalSteps) * 100)
      : 0;
  };

  // Generate BPMN XML based on selected workflow(s)
  const bpmnXml = useMemo(() => {
    if (state.workflows.length === 0) return '';

    if (selectedWorkflowId === 'all') {
      return workflowsToBpmn(state.workflows);
    } else {
      const workflow = state.workflows.find(w => w.id === selectedWorkflowId);
      return workflow ? workflowToBpmn(workflow) : '';
    }
  }, [selectedWorkflowId, state.workflows]);

  // Download BPMN XML file
  const handleDownloadBPMN = () => {
    if (!bpmnXml) return;

    const blob = new Blob([bpmnXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const filename = selectedWorkflowId === 'all'
      ? `workflow-all-${Date.now()}.bpmn`
      : `workflow-${selectedWorkflowId}-${Date.now()}.bpmn`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        📊 Risultati e Dashboard
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600 mb-1">Step Totali</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalSteps}</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow-md p-4 border-2 border-purple-200">
          <p className="text-sm text-gray-600 mb-1">💡 Brainstorming</p>
          <p className="text-3xl font-bold text-purple-600">
            {stats.strategyCounts.partner}
          </p>
          <p className="text-xs text-gray-500">{getPercentage(stats.strategyCounts.partner)}%</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow-md p-4 border-2 border-green-200">
          <p className="text-sm text-gray-600 mb-1">🤝 Assistente AI</p>
          <p className="text-3xl font-bold text-green-600">
            {stats.strategyCounts.assistant}
          </p>
          <p className="text-xs text-gray-500">{getPercentage(stats.strategyCounts.assistant)}%</p>
        </div>

        <div className="bg-blue-50 rounded-lg shadow-md p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">🔧 Strumento</p>
          <p className="text-3xl font-bold text-blue-600">
            {stats.strategyCounts.tool}
          </p>
          <p className="text-xs text-gray-500">{getPercentage(stats.strategyCounts.tool)}%</p>
        </div>

        <div className="bg-red-50 rounded-lg shadow-md p-4 border-2 border-red-200">
          <p className="text-sm text-gray-600 mb-1">🔴 Mantieni umano</p>
          <p className="text-3xl font-bold text-red-600">
            {stats.strategyCounts.out}
          </p>
          <p className="text-xs text-gray-500">{getPercentage(stats.strategyCounts.out)}%</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow-md p-4 border-2 border-purple-200">
          <p className="text-sm text-gray-600 mb-1">⏱️ Tempo Totale</p>
          <p className="text-2xl font-bold text-purple-600">
            {stats.totalTime}
          </p>
          <p className="text-xs text-gray-500">min/mese</p>
        </div>

        {state.costoOrario && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow-md p-4 border-2 border-green-300">
            <p className="text-sm text-gray-600 mb-1">💰 Risparmio Potenziale</p>
            <p className="text-2xl font-bold text-green-700">
              {calculateMonthlySavings(stats.totalTime, state.costoOrario).toFixed(0)}€
            </p>
            <p className="text-xs text-gray-500">al mese</p>
          </div>
        )}
      </div>

      {/* Prioritizzazione e ROI */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          🎯 Priorità di Implementazione
        </h3>

        <p className="text-center text-gray-600 mb-6">
          Step ordinati per priorità (impatto ÷ complessità) - inizia dai valori più alti
        </p>

        {state.costoOrario && (
          <div className="bg-white rounded-lg p-3 mb-4 text-center">
            <p className="text-sm text-gray-600">
              Calcolo ROI basato su <strong>{state.costoOrario}€/ora</strong>
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Step</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Strategia</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Impatto<br/>(min/mese)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Complessità<br/>(1-5)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Priorità</th>
                {state.costoOrario && (
                  <>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Risparmio<br/>(€/mese)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">ROI</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {state.workflows
                .filter(w => state.evaluations[w.id])
                .sort((a, b) => {
                  const evalA = state.evaluations[a.id];
                  const evalB = state.evaluations[b.id];
                  return evalB.priorita - evalA.priorita;
                })
                .map((workflow, index) => {
                  const evaluation = state.evaluations[workflow.id];
                  const savings = state.costoOrario
                    ? calculateMonthlySavings(workflow.tempoTotale, state.costoOrario)
                    : 0;
                  const roi = state.costoOrario
                    ? calculateROI(savings, evaluation.complessita)
                    : 0;

                  return (
                    <tr
                      key={workflow.id}
                      className={`border-b border-gray-200 ${index < 3 ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {index < 3 && <span className="text-lg mr-2">🏆</span>}
                          <span className="font-bold text-gray-900">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{workflow.id}</div>
                        <div className="text-sm text-gray-600">{workflow.titolo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: evaluation.strategy.color }}
                        >
                          {evaluation.strategy.name.split(' ')[0]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">
                        {workflow.tempoTotale}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-purple-600">
                          {evaluation.complessita}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-green-600 text-lg">
                          {evaluation.priorita.toFixed(1)}
                        </span>
                      </td>
                      {state.costoOrario && (
                        <>
                          <td className="px-4 py-3 text-center font-semibold text-green-700">
                            {savings.toFixed(0)}€
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-blue-600">
                              {roi.toFixed(0)}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Consiglio:</strong> Inizia dai primi 3 step (evidenziati) per ottenere risultati rapidi e costruire momentum.
          </p>
        </div>

        {/* Bottone AI Piano Implementazione */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGenerateAIPlan}
            disabled={aiLoading}
            className={`
              inline-flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg
              ${aiLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-xl transform hover:scale-105'
              }
            `}
          >
            {aiLoading ? (
              <>
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>L'AI sta ragionando...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">{state.implementationPlan ? '🔄' : '🪄'}</span>
                <span>{state.implementationPlan ? 'Rigenera Piano di Implementazione AI' : 'Genera Piano di Implementazione AI'}</span>
              </>
            )}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Analisi intelligente AI • Roadmap 30/60/90 giorni • Quick wins evidenziati
          </p>
        </div>
      </div>

      {/* Mappa delle Opportunità AI */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          🎯 Mappa delle Opportunità AI
        </h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          I tuoi workflow organizzati per strategia di automazione
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Top Left - Brainstorming */}
          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 min-h-[250px] flex flex-col">
            <div className="text-center mb-3">
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Automazione BASSA | Carico Cogn. ALTO
              </div>
              <div className="text-2xl font-bold text-purple-700 mb-1">
                💡 BRAINSTORMING
              </div>
              <div className="text-lg font-bold text-purple-600 mb-2">
                {getWorkflowsForStrategy('Brainstorming').length} workflow
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center mb-3 italic">
              Partner di pensiero per esplorare idee
            </p>
            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
              {getWorkflowsForStrategy('Brainstorming').map((w) => (
                <div key={w.id} className="bg-white rounded px-2 py-1.5 text-xs border border-purple-200">
                  <span className="font-mono text-purple-600 font-semibold">{w.id}</span>
                  <span className="text-gray-700 ml-1">{w.titolo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Right - Assistente AI */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 min-h-[250px] flex flex-col">
            <div className="text-center mb-3">
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Automazione ALTA | Carico Cogn. ALTO
              </div>
              <div className="text-2xl font-bold text-green-700 mb-1">
                🤝 ASSISTENTE AI
              </div>
              <div className="text-lg font-bold text-green-600 mb-2">
                {getWorkflowsForStrategy('Assistente').length} workflow
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center mb-3 italic">
              Prompt riutilizzabile per delegare
            </p>
            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
              {getWorkflowsForStrategy('Assistente').map((w) => (
                <div key={w.id} className="bg-white rounded px-2 py-1.5 text-xs border border-green-200">
                  <span className="font-mono text-green-600 font-semibold">{w.id}</span>
                  <span className="text-gray-700 ml-1">{w.titolo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Left - Mantieni umano */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 min-h-[250px] flex flex-col">
            <div className="text-center mb-3">
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Automazione BASSA | Carico Cogn. BASSO
              </div>
              <div className="text-2xl font-bold text-red-700 mb-1">
                🔴 MANTIENI UMANO
              </div>
              <div className="text-lg font-bold text-red-600 mb-2">
                {getWorkflowsForStrategy('umano').length} workflow
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center mb-3 italic">
              Gestione manuale, non delegare
            </p>
            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
              {getWorkflowsForStrategy('umano').map((w) => (
                <div key={w.id} className="bg-white rounded px-2 py-1.5 text-xs border border-red-200">
                  <span className="font-mono text-red-600 font-semibold">{w.id}</span>
                  <span className="text-gray-700 ml-1">{w.titolo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Right - Strumento automatizzato */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 min-h-[250px] flex flex-col">
            <div className="text-center mb-3">
              <div className="text-xs font-semibold text-gray-500 mb-1">
                Automazione ALTA | Carico Cogn. BASSO
              </div>
              <div className="text-2xl font-bold text-blue-700 mb-1">
                🔧 TOOL AUTOMAZIONE
              </div>
              <div className="text-lg font-bold text-blue-600 mb-2">
                {getWorkflowsForStrategy('Strumento').length} workflow
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center mb-3 italic">
              Tool specifico per automatizzare
            </p>
            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
              {getWorkflowsForStrategy('Strumento').map((w) => (
                <div key={w.id} className="bg-white rounded px-2 py-1.5 text-xs border border-blue-200">
                  <span className="font-mono text-blue-600 font-semibold">{w.id}</span>
                  <span className="text-gray-700 ml-1">{w.titolo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BPMN Diagram Viewer */}
      {state.workflows.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                🗺️ Diagramma BPMN Workflow
              </h3>
              <p className="text-sm text-gray-600">
                Visualizzazione dei processi secondo lo standard BPMN 2.0
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Visualizza:
              </label>
              <select
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
              >
                <option value="all">Tutti i workflow (sequenza)</option>
                {state.workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.id} - {workflow.titolo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {bpmnXml && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <BPMNViewer
                bpmnXml={bpmnXml}
                height={450}
                onError={(error) => {
                  if (process.env.NODE_ENV === 'development') {
                    console.error('BPMN Viewer Error:', error);
                  }
                }}
              />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 flex-1">
              <p className="text-sm text-blue-800">
                <strong>💡 Info:</strong> Il diagramma BPMN mostra il flusso dei processi con notazione standard.
                Seleziona un workflow specifico dal menu a tendina per visualizzarlo in dettaglio, oppure visualizza
                tutti i workflow come sequenza completa.
              </p>
            </div>
            <button
              onClick={handleDownloadBPMN}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
              title="Scarica il diagramma BPMN in formato XML"
            >
              📥 Scarica BPMN
            </button>
          </div>
        </div>
      )}

      {/* Lista Dettagliata Step */}
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        Dettaglio Step e Strategie
      </h3>

      <div className="space-y-4 mb-8">
        {state.workflows.map((workflow) => {
          const evaluation = state.evaluations[workflow.id];
          if (!evaluation) return null;

          return (
            <div
              key={workflow.id}
              className="rounded-lg shadow-md p-6 border-l-4"
              style={{
                backgroundColor: `${evaluation.strategy.color}15`,
                borderLeftColor: evaluation.strategy.color
              }}
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
                <div
                  className="px-4 py-2 rounded-lg text-white font-bold"
                  style={{ backgroundColor: evaluation.strategy.color }}
                >
                  {evaluation.strategy.name}
                </div>
              </div>

              <h4 className="text-xl font-bold text-gray-900 mb-2">
                {workflow.titolo}
              </h4>
              <p className="text-gray-700 mb-3">{workflow.descrizione}</p>

              <div className="grid md:grid-cols-2 gap-4 mb-3">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600">Score Automazione</p>
                  <p className="text-2xl font-bold text-green-600">
                    {evaluation.autoScore}/8
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600">Score Carico Cognitivo</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {evaluation.cogScore}/8
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-600 mb-1">Strategia Consigliata</p>
                <p className="text-lg font-semibold text-gray-900">
                  {evaluation.strategy.desc}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <div className="bg-white rounded px-3 py-1">
                  <span className="font-semibold">⏱️ Tempo:</span> {workflow.tempoTotale} min/mese
                </div>
                {workflow.tool.length > 0 && workflow.tool[0] !== '' && (
                  <div className="bg-white rounded px-3 py-1">
                    <span className="font-semibold">🛠️ Tool:</span> {workflow.tool.join(', ')}
                  </div>
                )}
                {workflow.input.length > 0 && workflow.input[0] !== '' && (
                  <div className="bg-white rounded px-3 py-1">
                    <span className="font-semibold">📥 Input:</span> {workflow.input.join(', ')}
                  </div>
                )}
                {workflow.output.length > 0 && workflow.output[0] !== '' && (
                  <div className="bg-white rounded px-3 py-1">
                    <span className="font-semibold">📤 Output:</span> {workflow.output.join(', ')}
                  </div>
                )}
                {workflow.owner && (
                  <div className="bg-white rounded px-3 py-1">
                    <span className="font-semibold">👤 Owner:</span> {workflow.owner}
                  </div>
                )}
              </div>

              {workflow.painPoints && (
                <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                  <p className="text-sm">
                    <span className="font-semibold">⚠️ Pain Points:</span> {workflow.painPoints}
                  </p>
                </div>
              )}

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
          );
        })}
      </div>

      {/* Raccomandazioni Personalizzate */}
      {(partnerWorkflows.length > 0 || assistantWorkflows.length > 0 || toolWorkflows.length > 0) && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            💡 Raccomandazioni Personalizzate
          </h3>

          {partnerWorkflows.length > 0 && (
            <div className="mb-4 bg-white rounded-lg p-4">
              <h4 className="font-bold text-purple-700 mb-2">
                💡 Brainstorming con l'intelligenza artificiale ({partnerWorkflows.length} step)
              </h4>
              <p className="text-gray-700">
                Questi step non possono essere standardizzati (non si ripetono mai nello stesso modo) ma richiedono
                ragionamento, creatività e pensiero esplorativo. Usa l'IA come partner di pensiero:
                inizia con un contesto ben definito, poni domande aperte, valuta le proposte e itera.
              </p>
            </div>
          )}

          {assistantWorkflows.length > 0 && (
            <div className="mb-4 bg-white rounded-lg p-4">
              <h4 className="font-bold text-green-700 mb-2">
                🤝 Assistente AI ({assistantWorkflows.length} step)
              </h4>
              <p className="text-gray-700">
                Questi step sono cognitivamente impegnativi ma altamente ripetitivi. L'input cambia ogni volta
                ma il processo rimane coerente. Crea un prompt ben strutturato che diventa una risorsa riutilizzabile:
                definisci ruolo, input, output e regole con precisione.
              </p>
            </div>
          )}

          {toolWorkflows.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-bold text-blue-700 mb-2">
                🔧 Strumento automatizzato ({toolWorkflows.length} step)
              </h4>
              <p className="text-gray-700">
                Questi step sono così operativi e ripetitivi che non richiedono praticamente alcun intervento umano.
                Identifica uno strumento specializzato che esegua già l'attività: configuralo, testalo e lascialo eseguire.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Piano di Implementazione AI - Sezione Permanente */}
      {(state.implementationPlan || aiLoading || aiError) && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg p-6 mb-8 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🪄</span>
            <h3 className="text-2xl font-bold text-gray-900">Piano di Implementazione AI</h3>
          </div>

          {/* Loading State */}
          {aiLoading && (
            <div className="bg-white rounded-lg p-12 shadow-inner">
              <div className="flex flex-col items-center justify-center">
                <svg className="animate-spin h-16 w-16 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg text-gray-600 mb-2">L'AI sta analizzando i tuoi workflow...</p>
                <p className="text-sm text-gray-500">Creazione piano dettagliato in corso (~15 secondi)</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!aiLoading && aiError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg">
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div className="flex-1">
                  <h4 className="font-bold text-red-800 mb-2">Errore</h4>
                  <p className="text-red-700 mb-4">{aiError}</p>
                  <button
                    onClick={handleGenerateAIPlan}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    🔄 Riprova
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success State - Piano Generato */}
          {!aiLoading && !aiError && state.implementationPlan && (
            <>
              <div className="bg-white rounded-lg p-6 shadow-inner">
                <div className="prose prose-sm max-w-none">
                  <div
                    className="markdown-content whitespace-pre-wrap text-sm leading-relaxed"
                    style={{
                      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
                      maxHeight: '600px',
                      overflowY: 'auto'
                    }}
                  >
                    {state.implementationPlan}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(state.implementationPlan || '');
                    alert('Piano copiato negli appunti!');
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  📋 Copia Piano
                </button>
                <button
                  onClick={handleGenerateAIPlan}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  🔄 Rigenera
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <button
          onClick={() => setCurrentStep(3)}
          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ← Modifica Valutazioni
        </button>

        <div className="flex gap-4">
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            📄 Esporta PDF
          </button>

          <button
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🔄 Nuova Analisi
          </button>
        </div>
      </div>

    </div>
  );
};
