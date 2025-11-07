import React from 'react';
import { useAppContext } from '../context/AppContext';
import { exportToJSON, downloadJSON } from '../utils/businessLogic';

export const Step4Results: React.FC = () => {
  const { state, setCurrentStep, resetApp } = useAppContext();

  const handleExport = () => {
    const jsonData = exportToJSON(state.workflows, state.evaluations);
    downloadJSON(jsonData);
  };

  const handleReset = () => {
    if (window.confirm('Sei sicuro di voler cancellare tutti i dati e ricominciare?')) {
      resetApp();
      setCurrentStep(1);
    }
  };

  const { stats } = state;

  const getWorkflowsForStrategy = (strategyName: string) => {
    return state.workflows.filter(w => {
      const evaluation = state.evaluations[w.id];
      return evaluation && evaluation.strategy.name.includes(strategyName);
    });
  };

  const partnerWorkflows = getWorkflowsForStrategy('AI Partner');
  const assistantWorkflows = getWorkflowsForStrategy('AI Assistant');
  const toolWorkflows = getWorkflowsForStrategy('AI Tool');

  const getPercentage = (count: number) => {
    return stats.totalSteps > 0
      ? Math.round((count / stats.totalSteps) * 100)
      : 0;
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

        <div className="bg-green-50 rounded-lg shadow-md p-4 border-2 border-green-200">
          <p className="text-sm text-gray-600 mb-1">💡 AI Partner</p>
          <p className="text-3xl font-bold text-green-600">
            {stats.strategyCounts.partner}
          </p>
          <p className="text-xs text-gray-500">{getPercentage(stats.strategyCounts.partner)}%</p>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow-md p-4 border-2 border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">🤝 AI Assistant</p>
          <p className="text-3xl font-bold text-yellow-600">
            {stats.strategyCounts.assistant}
          </p>
          <p className="text-xs text-gray-500">{getPercentage(stats.strategyCounts.assistant)}%</p>
        </div>

        <div className="bg-blue-50 rounded-lg shadow-md p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">🔧 AI Tool</p>
          <p className="text-3xl font-bold text-blue-600">
            {stats.strategyCounts.tool}
          </p>
          <p className="text-xs text-gray-500">{getPercentage(stats.strategyCounts.tool)}%</p>
        </div>

        <div className="bg-red-50 rounded-lg shadow-md p-4 border-2 border-red-200">
          <p className="text-sm text-gray-600 mb-1">🔴 Fuori Perimetro</p>
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
      </div>

      {/* Matrice 2×2 Visuale */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Matrice 2×2 - Strategia AI
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Top Left - AI Assistant */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 min-h-[200px]">
            <div className="text-center mb-3">
              <div className="text-sm font-semibold text-gray-600 mb-1">
                Automazione BASSA (0-4) | Carico Cogn. ALTO (5-8)
              </div>
              <div className="text-3xl font-bold text-yellow-700 mb-2">
                🤝 AI ASSISTANT
              </div>
              <div className="text-xl font-bold text-yellow-600">
                {stats.strategyCounts.assistant} step
              </div>
            </div>
            <p className="text-sm text-gray-700 text-center">
              Crea un assistente tramite prompt ripetibile
            </p>
          </div>

          {/* Top Right - AI Partner */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 min-h-[200px]">
            <div className="text-center mb-3">
              <div className="text-sm font-semibold text-gray-600 mb-1">
                Automazione ALTA (5-8) | Carico Cogn. ALTO (5-8)
              </div>
              <div className="text-3xl font-bold text-green-700 mb-2">
                💡 AI PARTNER
              </div>
              <div className="text-xl font-bold text-green-600">
                {stats.strategyCounts.partner} step
              </div>
            </div>
            <p className="text-sm text-gray-700 text-center">
              Conversa con AI per esplorare idee e ricerche
            </p>
          </div>

          {/* Bottom Left - Fuori Perimetro */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 min-h-[200px]">
            <div className="text-center mb-3">
              <div className="text-sm font-semibold text-gray-600 mb-1">
                Automazione BASSA (0-4) | Carico Cogn. BASSO (0-4)
              </div>
              <div className="text-3xl font-bold text-red-700 mb-2">
                🔴 FUORI PERIMETRO
              </div>
              <div className="text-xl font-bold text-red-600">
                {stats.strategyCounts.out} step
              </div>
            </div>
            <p className="text-sm text-gray-700 text-center">
              Non delegabile o non vantaggioso
            </p>
          </div>

          {/* Bottom Right - AI Tool */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 min-h-[200px]">
            <div className="text-center mb-3">
              <div className="text-sm font-semibold text-gray-600 mb-1">
                Automazione ALTA (5-8) | Carico Cogn. BASSO (0-4)
              </div>
              <div className="text-3xl font-bold text-blue-700 mb-2">
                🔧 AI TOOL
              </div>
              <div className="text-xl font-bold text-blue-600">
                {stats.strategyCounts.tool} step
              </div>
            </div>
            <p className="text-sm text-gray-700 text-center">
              Trova un tool specifico per automatizzare
            </p>
          </div>
        </div>
      </div>

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
                {workflow.tool && (
                  <div className="bg-white rounded px-3 py-1">
                    <span className="font-semibold">🛠️ Tool:</span> {workflow.tool}
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
              <h4 className="font-bold text-green-700 mb-2">
                💡 AI Partner ({partnerWorkflows.length} step)
              </h4>
              <p className="text-gray-700">
                Questi step hanno alto potenziale di automazione E alto carico cognitivo.
                Considera l'uso di Claude, ChatGPT o altri LLM per conversazioni approfondite,
                brainstorming, ricerca e analisi complesse.
              </p>
            </div>
          )}

          {assistantWorkflows.length > 0 && (
            <div className="mb-4 bg-white rounded-lg p-4">
              <h4 className="font-bold text-yellow-700 mb-2">
                🤝 AI Assistant ({assistantWorkflows.length} step)
              </h4>
              <p className="text-gray-700">
                Questi step richiedono thinking ma non sono completamente standardizzabili.
                Crea prompt ripetibili e template per assistere il lavoro cognitivo mantenendo
                supervisione umana.
              </p>
            </div>
          )}

          {toolWorkflows.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-bold text-blue-700 mb-2">
                🔧 AI Tool ({toolWorkflows.length} step)
              </h4>
              <p className="text-gray-700">
                Questi step sono altamente ripetibili ma non richiedono molto thinking.
                Cerca tool specifici di automazione (RPA, API, script) o AI specializzati
                per il task specifico.
              </p>
            </div>
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
            📥 Esporta JSON
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
