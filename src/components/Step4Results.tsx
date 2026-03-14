import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { exportToPDF, calculateMonthlySavings, calculateROI, generateLocalImplementationPlan } from '../utils/businessLogic';
import { workflowToBpmn, workflowsToBpmn, BPMNViewer, BPMNModeler } from '../integrations/bpmn';

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export const Step4Results: React.FC = () => {
  const { state, setCurrentStep, resetApp, saveImplementationPlan, setNomeAzienda, setOpenRouterKey } = useAppContext();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('all');
  const [aiBpmnXml, setAiBpmnXml] = useState<string | null>(null);
  const [bpmnLoading, setBpmnLoading] = useState(false);
  const [bpmnError, setBpmnError] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [editedBpmnXml, setEditedBpmnXml] = useState<string | null>(null);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'opportunity-map': true,
    'bpmn-diagram': true,
    'step-details': true,
    'recommendations': true,
    'implementation-plan': false,
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    exportToPDF(
      state.workflows,
      state.evaluations,
      state.nomeAzienda || 'La mia azienda',
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (state.openRouterKey) {
        headers['X-OpenRouter-Key'] = state.openRouterKey;
      }

      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers,
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
      setAiError('');

    } catch (error: any) {
      console.error('Error generating AI plan via API, using local fallback:', error);
      // Fallback: genera piano localmente senza chiamata API
      const localPlan = generateLocalImplementationPlan(
        state.workflows,
        state.evaluations,
        state.costoOrario
      );
      if (localPlan) {
        saveImplementationPlan(localPlan);
        setAiError('');
      } else {
        setAiError('Nessun workflow valutato disponibile per generare il piano.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateAIBpmn = async () => {
    if (selectedWorkflowId === 'all') {
      setBpmnError('Per generare con AI, seleziona un workflow specifico (non "Tutti")');
      return;
    }

    const workflow = state.workflows.find(w => w.id === selectedWorkflowId);
    if (!workflow) {
      setBpmnError('Workflow non trovato');
      return;
    }

    setBpmnLoading(true);
    setBpmnError('');
    setAiBpmnXml(null);

    try {
      // Trova workflow correlati con stessa fase ma owner diversi per creare lane
      const relatedWorkflows = state.workflows
        .filter(w =>
          w.id !== workflow.id &&
          w.fase === workflow.fase &&
          w.owner &&
          w.owner !== workflow.owner
        )
        .map(w => ({
          titolo: w.titolo,
          descrizione: w.descrizione,
          owner: w.owner,
        }));

      const bpmnHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (state.openRouterKey) {
        bpmnHeaders['X-OpenRouter-Key'] = state.openRouterKey;
      }

      const response = await fetch('/api/ai-generate-bpmn', {
        method: 'POST',
        headers: bpmnHeaders,
        body: JSON.stringify({
          workflow: {
            titolo: workflow.titolo,
            descrizione: workflow.descrizione,
            tool: workflow.tool,
            input: workflow.input,
            output: workflow.output,
            painPoints: workflow.painPoints,
            owner: workflow.owner,
          },
          relatedWorkflows: relatedWorkflows.length > 0 ? relatedWorkflows : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Errore durante la generazione BPMN';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.details || error.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAiBpmnXml(data.bpmnXml);
      setBpmnError('');

    } catch (error: any) {
      console.error('Error generating AI BPMN:', error);
      setBpmnError(error.message);
    } finally {
      setBpmnLoading(false);
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

  // Reset AI BPMN when workflow selection changes
  React.useEffect(() => {
    setAiBpmnXml(null);
    setBpmnError('');
  }, [selectedWorkflowId]);

  // Generate BPMN XML based on selected workflow(s)
  // Use AI-generated BPMN if available, otherwise fall back to simple generation
  const bpmnXml = useMemo(() => {
    // Priorità all'AI BPMN se disponibile
    if (aiBpmnXml) {
      return aiBpmnXml;
    }

    if (state.workflows.length === 0) return '';

    if (selectedWorkflowId === 'all') {
      return workflowsToBpmn(state.workflows);
    } else {
      const workflow = state.workflows.find(w => w.id === selectedWorkflowId);
      return workflow ? workflowToBpmn(workflow) : '';
    }
  }, [selectedWorkflowId, state.workflows, aiBpmnXml]);

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

  // Empty state guard
  if (Object.keys(state.evaluations).length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center max-w-md">
          <p className="text-gray-300 text-lg mb-6">Non hai ancora valutato nessun workflow</p>
          <button
            onClick={() => setCurrentStep(3)}
            className="bg-brand text-dark-bg font-bold py-3 px-8 rounded-lg hover:bg-brand-light transition-colors"
          >
            Vai alla Valutazione
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-white mb-4">
        Risultati e Dashboard
      </h2>

      <div className="bg-brand-50 border border-brand/30 text-brand-light rounded-lg px-4 py-3 mb-6 text-sm">
        Fase 4 di 4 — Visualizza risultati, priorità e piano di implementazione.
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-dark-card border border-dark-border rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Step Totali</p>
          <p className="text-3xl font-bold text-white">{stats.totalSteps}</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4 border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-400 mb-1">Brainstorming</p>
          <p className="text-3xl font-bold text-purple-400">
            {stats.strategyCounts.partner}
          </p>
          <p className="text-xs text-gray-400">{getPercentage(stats.strategyCounts.partner)}%</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-400 mb-1">Assistente AI</p>
          <p className="text-3xl font-bold text-green-400">
            {stats.strategyCounts.assistant}
          </p>
          <p className="text-xs text-gray-400">{getPercentage(stats.strategyCounts.assistant)}%</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-400 mb-1">Strumento</p>
          <p className="text-3xl font-bold text-blue-400">
            {stats.strategyCounts.tool}
          </p>
          <p className="text-xs text-gray-400">{getPercentage(stats.strategyCounts.tool)}%</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-400 mb-1">Mantieni umano</p>
          <p className="text-3xl font-bold text-red-400">
            {stats.strategyCounts.out}
          </p>
          <p className="text-xs text-gray-400">{getPercentage(stats.strategyCounts.out)}%</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-4 border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-400 mb-1">Tempo Totale</p>
          <p className="text-2xl font-bold text-purple-400">
            {stats.totalTime}
          </p>
          <p className="text-xs text-gray-400">min/mese</p>
        </div>

        {state.costoOrario && (
          <div className="bg-dark-card border border-dark-border rounded-lg p-4 border-l-4 border-l-green-400">
            <p className="text-sm text-gray-400 mb-1">Risparmio Potenziale</p>
            <p className="text-2xl font-bold text-green-400">
              {calculateMonthlySavings(stats.totalTime, state.costoOrario).toFixed(0)}€
            </p>
            <p className="text-xs text-gray-400">al mese</p>
          </div>
        )}
      </div>

      {/* Prioritizzazione e ROI */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6 mb-8">
        <h3 className="text-2xl font-bold text-white mb-4 text-center">
          Priorità di Implementazione
        </h3>

        <p className="text-center text-gray-400 mb-6">
          Step ordinati per priorità (impatto / complessità) - inizia dai valori più alti
        </p>

        {state.costoOrario && (
          <div className="bg-dark-hover rounded-lg p-3 mb-4 text-center">
            <p className="text-sm text-gray-300">
              Calcolo ROI basato su <strong className="text-white">{state.costoOrario}€/ora</strong>
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full bg-dark-card rounded-lg overflow-hidden">
            <thead className="bg-dark-hover">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Step</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Strategia</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Impatto<br/>(min/mese)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Complessità<br/>(1-5)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Priorità</th>
                {state.costoOrario && (
                  <>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Risparmio<br/>(€/mese)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">ROI</th>
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
                      className={`border-b border-dark-border ${index % 2 === 0 ? 'bg-dark-card' : 'bg-dark-hover/50'} ${index < 3 ? 'bg-brand-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {index < 3 && <span className="text-lg mr-2">🏆</span>}
                          <span className="font-bold text-white">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{workflow.id}</div>
                        <div className="text-sm text-gray-400">{workflow.titolo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: evaluation.strategy.color }}
                        >
                          {evaluation.strategy.name.split(' ')[0]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-white">
                        {workflow.tempoTotale}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-purple-400">
                          {evaluation.complessita}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-brand text-lg">
                          {evaluation.priorita.toFixed(1)}
                        </span>
                      </td>
                      {state.costoOrario && (
                        <>
                          <td className="px-4 py-3 text-center font-semibold text-green-400">
                            {savings.toFixed(0)}€
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-blue-400">
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

        <div className="mt-4 bg-brand-50 border-l-4 border-brand p-4">
          <p className="text-sm text-brand-light">
            <strong>Consiglio:</strong> Inizia dai primi 3 step (evidenziati) per ottenere risultati rapidi e costruire momentum.
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
                ? 'bg-dark-hover text-gray-400 cursor-not-allowed'
                : 'bg-brand text-dark-bg hover:bg-brand-light hover:shadow-xl transform hover:scale-105'
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
          <p className="mt-2 text-xs text-gray-400">
            {state.openRouterKey
              ? 'Analisi intelligente AI - Roadmap 30/60/90 giorni - Quick wins evidenziati'
              : 'Genera un piano base automatico. Per un piano AI avanzato, configura la chiave OpenRouter nelle impostazioni in basso.'
            }
          </p>
        </div>
      </div>

      {/* Mappa delle Opportunità AI - Collapsible */}
      <div className="bg-dark-card border border-dark-border rounded-lg mb-8">
        <button
          onClick={() => toggleSection('opportunity-map')}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <h3 className="text-2xl font-bold text-white">
              Mappa delle Opportunità AI
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              I tuoi workflow organizzati per strategia di automazione
            </p>
          </div>
          <ChevronIcon expanded={!collapsedSections['opportunity-map']} />
        </button>

        {!collapsedSections['opportunity-map'] && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Top Left - Brainstorming */}
              <div className="bg-purple-900/20 border-2 border-purple-500/50 rounded-lg p-4 min-h-[250px] flex flex-col">
                <div className="text-center mb-3">
                  <div className="text-xs font-semibold text-gray-400 mb-1">
                    Automazione BASSA | Carico Cogn. ALTO
                  </div>
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    💡 BRAINSTORMING
                  </div>
                  <div className="text-lg font-bold text-purple-400 mb-2">
                    {getWorkflowsForStrategy('Brainstorming').length} workflow
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mb-3 italic">
                  Partner di pensiero per esplorare idee
                </p>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
                  {getWorkflowsForStrategy('Brainstorming').map((w) => (
                    <div key={w.id} className="bg-dark-hover rounded px-2 py-1.5 text-xs border border-purple-500/30">
                      <span className="font-mono text-purple-400 font-semibold">{w.id}</span>
                      <span className="text-gray-300 ml-1">{w.titolo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Right - Assistente AI */}
              <div className="bg-green-900/20 border-2 border-green-500/50 rounded-lg p-4 min-h-[250px] flex flex-col">
                <div className="text-center mb-3">
                  <div className="text-xs font-semibold text-gray-400 mb-1">
                    Automazione ALTA | Carico Cogn. ALTO
                  </div>
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    🤝 ASSISTENTE AI
                  </div>
                  <div className="text-lg font-bold text-green-400 mb-2">
                    {getWorkflowsForStrategy('Assistente').length} workflow
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mb-3 italic">
                  Prompt riutilizzabile per delegare
                </p>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
                  {getWorkflowsForStrategy('Assistente').map((w) => (
                    <div key={w.id} className="bg-dark-hover rounded px-2 py-1.5 text-xs border border-green-500/30">
                      <span className="font-mono text-green-400 font-semibold">{w.id}</span>
                      <span className="text-gray-300 ml-1">{w.titolo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Left - Mantieni umano */}
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4 min-h-[250px] flex flex-col">
                <div className="text-center mb-3">
                  <div className="text-xs font-semibold text-gray-400 mb-1">
                    Automazione BASSA | Carico Cogn. BASSO
                  </div>
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    🔴 MANTIENI UMANO
                  </div>
                  <div className="text-lg font-bold text-red-400 mb-2">
                    {getWorkflowsForStrategy('umano').length} workflow
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mb-3 italic">
                  Gestione manuale, non delegare
                </p>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
                  {getWorkflowsForStrategy('umano').map((w) => (
                    <div key={w.id} className="bg-dark-hover rounded px-2 py-1.5 text-xs border border-red-500/30">
                      <span className="font-mono text-red-400 font-semibold">{w.id}</span>
                      <span className="text-gray-300 ml-1">{w.titolo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Right - Strumento automatizzato */}
              <div className="bg-blue-900/20 border-2 border-blue-500/50 rounded-lg p-4 min-h-[250px] flex flex-col">
                <div className="text-center mb-3">
                  <div className="text-xs font-semibold text-gray-400 mb-1">
                    Automazione ALTA | Carico Cogn. BASSO
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    🔧 TOOL AUTOMAZIONE
                  </div>
                  <div className="text-lg font-bold text-blue-400 mb-2">
                    {getWorkflowsForStrategy('Strumento').length} workflow
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mb-3 italic">
                  Tool specifico per automatizzare
                </p>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
                  {getWorkflowsForStrategy('Strumento').map((w) => (
                    <div key={w.id} className="bg-dark-hover rounded px-2 py-1.5 text-xs border border-blue-500/30">
                      <span className="font-mono text-blue-400 font-semibold">{w.id}</span>
                      <span className="text-gray-300 ml-1">{w.titolo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BPMN Diagram Viewer - Collapsible */}
      {state.workflows.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg mb-8">
          <button
            onClick={() => toggleSection('bpmn-diagram')}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <div>
              <h3 className="text-2xl font-bold text-white">
                Diagramma BPMN Workflow
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Visualizzazione dei processi secondo lo standard BPMN 2.0
              </p>
            </div>
            <ChevronIcon expanded={!collapsedSections['bpmn-diagram']} />
          </button>

          {!collapsedSections['bpmn-diagram'] && (
            <div className="px-6 pb-6">
              <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-300">
                    Visualizza:
                  </label>
                  <select
                    value={selectedWorkflowId}
                    onChange={(e) => setSelectedWorkflowId(e.target.value)}
                    className="px-4 py-2 border border-dark-border rounded-lg bg-dark-hover text-white focus:ring-2 focus:ring-brand focus:border-transparent text-sm font-medium"
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

              {/* BPMN Error Message */}
              {bpmnError && (
                <div className="bg-red-900/50 border-l-4 border-red-700 p-4 mb-4">
                  <p className="text-sm text-red-300">
                    <strong>Attenzione:</strong> {bpmnError}
                  </p>
                </div>
              )}

              {/* AI Generated Badge */}
              {aiBpmnXml && (
                <div className="bg-brand-50 border border-brand/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="text-sm font-semibold text-brand-light">Diagramma Generato con AI</p>
                    <p className="text-xs text-brand-light/70">
                      Questo diagramma è stato creato intelligentemente dall'AI analizzando la descrizione del workflow.
                    </p>
                  </div>
                </div>
              )}

              {/* Mode Toggle */}
              {bpmnXml && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center bg-dark-hover rounded-lg p-1">
                    <button
                      onClick={() => setEditMode(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        !editMode
                          ? 'bg-dark-card text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Visualizza
                    </button>
                    <button
                      onClick={() => setEditMode(true)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        editMode
                          ? 'bg-dark-card text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Modifica
                    </button>
                  </div>
                  {editMode && (
                    <div className="bg-brand-50 border border-brand/30 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-brand-light">
                      <span>Trascina elementi dalla palette, clicca per modificare proprietà</span>
                    </div>
                  )}
                </div>
              )}

              {bpmnXml && (
                <div className="border border-dark-border rounded-lg overflow-hidden">
                  {editMode ? (
                    <BPMNModeler
                      bpmnXml={editedBpmnXml || bpmnXml}
                      height={600}
                      onXmlChange={(xml) => {
                        setEditedBpmnXml(xml);
                      }}
                      onError={(error) => {
                        console.error('BPMN Modeler Error:', error);
                      }}
                    />
                  ) : (
                    <BPMNViewer
                      bpmnXml={editedBpmnXml || bpmnXml}
                      height={450}
                      onError={(error) => {
                        console.error('BPMN Viewer Error:', error);
                      }}
                    />
                  )}
                </div>
              )}

              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="bg-brand-50 border-l-4 border-brand p-4 flex-1">
                  <p className="text-sm text-brand-light">
                    <strong>Info:</strong> Il diagramma BPMN mostra il flusso dei processi con notazione standard.
                    Seleziona un workflow specifico dal menu a tendina per visualizzarlo in dettaglio, oppure visualizza
                    tutti i workflow come sequenza completa.
                    {selectedWorkflowId !== 'all' && (
                      <span className="block mt-2 font-semibold">
                        Usa "Genera con AI" per creare un diagramma più dettagliato e realistico!
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleGenerateAIBpmn}
                    disabled={bpmnLoading || selectedWorkflowId === 'all'}
                    className={`${
                      selectedWorkflowId === 'all'
                        ? 'bg-dark-hover text-gray-400 cursor-not-allowed'
                        : 'bg-brand text-dark-bg hover:bg-brand-light'
                    } font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg whitespace-nowrap flex items-center gap-2`}
                    title={selectedWorkflowId === 'all' ? 'Seleziona un workflow specifico per generare con AI' : 'Genera diagramma BPMN intelligente con AI'}
                  >
                    {bpmnLoading ? (
                      <>
                        <span className="animate-spin">⚙️</span>
                        Generazione...
                      </>
                    ) : (
                      <>
                        🤖 Genera con AI
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadBPMN}
                    className="bg-brand text-dark-bg font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg whitespace-nowrap hover:bg-brand-light"
                    title="Scarica il diagramma BPMN in formato XML"
                  >
                    Scarica BPMN
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista Dettagliata Step - Collapsible */}
      <div className="bg-dark-card border border-dark-border rounded-lg mb-8">
        <button
          onClick={() => toggleSection('step-details')}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h3 className="text-2xl font-bold text-white">
            Dettaglio Step e Strategie
          </h3>
          <ChevronIcon expanded={!collapsedSections['step-details']} />
        </button>

        {!collapsedSections['step-details'] && (
          <div className="px-6 pb-6 space-y-4">
            {state.workflows.map((workflow) => {
              const evaluation = state.evaluations[workflow.id];
              if (!evaluation) return null;

              return (
                <div
                  key={workflow.id}
                  className="rounded-lg p-6 border-l-4 bg-dark-hover"
                  style={{
                    borderLeftColor: evaluation.strategy.color
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-block bg-dark-border text-gray-300 px-3 py-1 rounded-full text-sm font-semibold mr-2">
                        {workflow.id}
                      </span>
                      <span className="inline-block bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">
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

                  <h4 className="text-xl font-bold text-white mb-2">
                    {workflow.titolo}
                  </h4>
                  <p className="text-gray-300 mb-3">{workflow.descrizione}</p>

                  <div className="grid md:grid-cols-2 gap-4 mb-3">
                    <div className="bg-dark-card rounded-lg p-3">
                      <p className="text-sm text-gray-400">Score Automazione</p>
                      <p className="text-2xl font-bold text-green-400">
                        {evaluation.autoScore}/8
                      </p>
                    </div>
                    <div className="bg-dark-card rounded-lg p-3">
                      <p className="text-sm text-gray-400">Score Carico Cognitivo</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {evaluation.cogScore}/8
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-card rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-400 mb-1">Strategia Consigliata</p>
                    <p className="text-lg font-semibold text-white">
                      {evaluation.strategy.desc}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="bg-dark-card rounded px-3 py-1 text-gray-300">
                      <span className="font-semibold text-white">Tempo:</span> {workflow.tempoTotale} min/mese
                    </div>
                    {workflow.tool.length > 0 && workflow.tool[0] !== '' && (
                      <div className="bg-dark-card rounded px-3 py-1 text-gray-300">
                        <span className="font-semibold text-white">Tool:</span> {workflow.tool.join(', ')}
                      </div>
                    )}
                    {workflow.input.length > 0 && workflow.input[0] !== '' && (
                      <div className="bg-dark-card rounded px-3 py-1 text-gray-300">
                        <span className="font-semibold text-white">Input:</span> {workflow.input.join(', ')}
                      </div>
                    )}
                    {workflow.output.length > 0 && workflow.output[0] !== '' && (
                      <div className="bg-dark-card rounded px-3 py-1 text-gray-300">
                        <span className="font-semibold text-white">Output:</span> {workflow.output.join(', ')}
                      </div>
                    )}
                    {workflow.owner && (
                      <div className="bg-dark-card rounded px-3 py-1 text-gray-300">
                        <span className="font-semibold text-white">Owner:</span> {workflow.owner}
                      </div>
                    )}
                  </div>

                  {workflow.painPoints && (
                    <div className="mt-3 bg-yellow-900/30 border-l-4 border-yellow-600 p-3">
                      <p className="text-sm text-yellow-300">
                        <span className="font-semibold">Pain Points:</span> {workflow.painPoints}
                      </p>
                    </div>
                  )}

                  {(workflow.pii || workflow.hitl || workflow.citazioni) && (
                    <div className="mt-3 flex gap-2">
                      {workflow.pii && (
                        <span className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-xs font-semibold">
                          PII
                        </span>
                      )}
                      {workflow.hitl && (
                        <span className="bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded text-xs font-semibold">
                          HITL
                        </span>
                      )}
                      {workflow.citazioni && (
                        <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs font-semibold">
                          Citazioni
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raccomandazioni Personalizzate - Collapsible */}
      {(partnerWorkflows.length > 0 || assistantWorkflows.length > 0 || toolWorkflows.length > 0) && (
        <div className="bg-dark-card border border-dark-border rounded-lg mb-8">
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h3 className="text-2xl font-bold text-white">
              Raccomandazioni Personalizzate
            </h3>
            <ChevronIcon expanded={!collapsedSections['recommendations']} />
          </button>

          {!collapsedSections['recommendations'] && (
            <div className="px-6 pb-6">
              {partnerWorkflows.length > 0 && (
                <div className="mb-4 bg-dark-hover rounded-lg p-4">
                  <h4 className="font-bold text-purple-400 mb-2">
                    💡 Brainstorming con l'intelligenza artificiale ({partnerWorkflows.length} step)
                  </h4>
                  <p className="text-gray-300">
                    Questi step non possono essere standardizzati (non si ripetono mai nello stesso modo) ma richiedono
                    ragionamento, creatività e pensiero esplorativo. Usa l'IA come partner di pensiero:
                    inizia con un contesto ben definito, poni domande aperte, valuta le proposte e itera.
                  </p>
                </div>
              )}

              {assistantWorkflows.length > 0 && (
                <div className="mb-4 bg-dark-hover rounded-lg p-4">
                  <h4 className="font-bold text-green-400 mb-2">
                    🤝 Assistente AI ({assistantWorkflows.length} step)
                  </h4>
                  <p className="text-gray-300">
                    Questi step sono cognitivamente impegnativi ma altamente ripetitivi. L'input cambia ogni volta
                    ma il processo rimane coerente. Crea un prompt ben strutturato che diventa una risorsa riutilizzabile:
                    definisci ruolo, input, output e regole con precisione.
                  </p>
                </div>
              )}

              {toolWorkflows.length > 0 && (
                <div className="bg-dark-hover rounded-lg p-4">
                  <h4 className="font-bold text-blue-400 mb-2">
                    🔧 Strumento automatizzato ({toolWorkflows.length} step)
                  </h4>
                  <p className="text-gray-300">
                    Questi step sono così operativi e ripetitivi che non richiedono praticamente alcun intervento umano.
                    Identifica uno strumento specializzato che esegua già l'attività: configuralo, testalo e lascialo eseguire.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Piano di Implementazione AI - Collapsible */}
      {(state.implementationPlan || aiLoading || aiError) && (
        <div className="bg-dark-card border border-dark-border rounded-lg mb-8">
          <button
            onClick={() => toggleSection('implementation-plan')}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h3 className="text-2xl font-bold text-white">Piano di Implementazione AI</h3>
            <ChevronIcon expanded={!collapsedSections['implementation-plan']} />
          </button>

          {!collapsedSections['implementation-plan'] && (
            <div className="px-6 pb-6">
              {/* Loading State */}
              {aiLoading && (
                <div className="bg-dark-hover rounded-lg p-12">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="animate-spin h-16 w-16 text-brand mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg text-gray-300 mb-2">L'AI sta analizzando i tuoi workflow...</p>
                    <p className="text-sm text-gray-400">Creazione piano dettagliato in corso (~15 secondi)</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {!aiLoading && aiError && (
                <div className="bg-red-900/50 border-l-4 border-red-700 p-6 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">❌</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-300 mb-2">Errore</h4>
                      <p className="text-red-300 mb-4">{aiError}</p>
                      <button
                        onClick={handleGenerateAIPlan}
                        className="bg-red-900/50 hover:bg-red-900 text-red-300 font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Riprova
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success State - Piano Generato */}
              {!aiLoading && !aiError && state.implementationPlan && (
                <>
                  <div className="bg-dark-hover rounded-lg p-6">
                    <div className="prose prose-sm max-w-none">
                      <div
                        className="markdown-content whitespace-pre-wrap text-sm leading-relaxed text-gray-200"
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
                      className="bg-brand text-dark-bg font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-brand-light"
                    >
                      Copia Piano
                    </button>
                    <button
                      onClick={handleGenerateAIPlan}
                      className="bg-dark-hover text-white font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-dark-border"
                    >
                      Rigenera
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Configurazione AI + Export */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6 mb-6">
        {/* Banner chiave mancante */}
        {!state.openRouterKey && (
          <div className="bg-yellow-900/30 border border-yellow-600/40 rounded-lg p-4 mb-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🔑</span>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-300 mb-1">Configura le funzionalita AI (gratis)</h4>
                <p className="text-sm text-yellow-200/80 mb-3">
                  Per usare il Piano AI, i diagrammi BPMN e la Chat AI, ti serve una chiave OpenRouter.
                  E' <strong>completamente gratis</strong> — i modelli AI usati non hanno costi.
                </p>
                <div className="bg-dark-bg/50 rounded-lg p-3 text-sm text-gray-300 space-y-2">
                  <p className="font-semibold text-white">Come ottenerla in 30 secondi:</p>
                  <p>1. Vai su <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-semibold">openrouter.ai</a> e crea un account gratuito (anche con Google)</p>
                  <p>2. Vai su <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-semibold">openrouter.ai/keys</a> e clicca "Create Key"</p>
                  <p>3. Copia la chiave (inizia con <code className="bg-dark-hover px-1 rounded text-brand">sk-or-...</code>) e incollala qui sotto</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input chiave */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-1 flex items-center gap-2">
            <span>Chiave OpenRouter</span>
            {state.openRouterKey && (
              <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Configurata
              </span>
            )}
          </label>
          <input
            type="password"
            value={state.openRouterKey || ''}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full px-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            La chiave resta nel tuo browser. Viene usata solo per chiamare i modelli AI gratuiti su OpenRouter.
          </p>
        </div>

        <hr className="border-dark-border mb-4" />

        {/* Export PDF */}
        <h4 className="text-md font-bold text-white mb-3">Esporta Report PDF</h4>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-400 mb-1 block">Nome azienda (per il report)</label>
            <input
              type="text"
              value={state.nomeAzienda || ''}
              onChange={(e) => setNomeAzienda(e.target.value)}
              placeholder="Es: Acme S.r.l."
              className="w-full px-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <button
            onClick={handleExport}
            className="bg-brand text-dark-bg font-bold py-2.5 px-6 rounded-lg transition-colors hover:bg-brand-light whitespace-nowrap"
          >
            Scarica PDF
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <button
          onClick={() => setCurrentStep(3)}
          className="bg-dark-hover hover:bg-dark-border text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ← Modifica Valutazioni
        </button>

        <div className="flex gap-4">

          <button
            onClick={handleReset}
            className="bg-red-900/50 text-red-300 hover:bg-red-900 font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Nuova Analisi
          </button>
        </div>
      </div>

    </div>
  );
};
