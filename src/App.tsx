import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AziendaSelector } from './components/AziendaSelector';
import { TabNavigation } from './components/TabNavigation';
import { Step1Welcome } from './components/Step1Welcome';
import { Step2Mapping } from './components/Step2Mapping';
import { Step3Evaluation } from './components/Step3Evaluation';
import { Step4Results } from './components/Step4Results';
import ImportExport from './components/ImportExport';
import TemplateLibrary from './components/TemplateLibrary';
import AIChat from './components/AIChat';

const AppContent: React.FC = () => {
  const { state, currentAzienda, setCurrentStep, deselectAzienda, bulkAddWorkflows, addWorkflow } = useAppContext();
  const [showImportExport, setShowImportExport] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  // Se non c'è un'azienda selezionata, mostra il selettore
  if (!currentAzienda) {
    return <AziendaSelector />;
  }

  // Mappiamo gli step ai tab:
  // Tab 1 (step: 1) → step 1 o 2 (Workflow/Mapping)
  // Tab 2 (step: 2) → step 3 (Evaluation)
  // Tab 3 (step: 3) → step 4 (Results)
  const currentTabStep = state.currentStep <= 2 ? 1 : state.currentStep === 3 ? 2 : 3;

  const handleTabChange = (tabStep: number) => {
    if (tabStep === 1) {
      setCurrentStep(1); // Torna al dashboard
    } else if (tabStep === 2) {
      setCurrentStep(3); // Vai a valutazione
    } else if (tabStep === 3) {
      setCurrentStep(4); // Vai a risultati
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Workflow AI Analyzer</h1>
            <p className="text-xs opacity-90">
              <span className="font-semibold">🏢 {currentAzienda}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplateLibrary(true)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
              title="Template Library"
            >
              📚 Template
            </button>
            <button
              onClick={() => setShowImportExport(true)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
              title="Import/Export"
            >
              📤 Import/Export
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Vuoi tornare alla selezione aziende?\n\nI dati di "${currentAzienda}" sono salvati automaticamente.`)) {
                  deselectAzienda();
                }
              }}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
              title="Cambia azienda"
            >
              🔄 Cambia Azienda
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNavigation
        currentStep={currentTabStep}
        onStepChange={handleTabChange}
        workflowCount={state.workflows.length}
        evaluationCount={Object.keys(state.evaluations).length}
      />

      {/* Main Content - Each step wrapped in ErrorBoundary to isolate errors */}
      <main className="pb-12">
        {state.currentStep === 1 && (
          <ErrorBoundary>
            <Step1Welcome />
          </ErrorBoundary>
        )}
        {state.currentStep === 2 && (
          <ErrorBoundary>
            <Step2Mapping />
          </ErrorBoundary>
        )}
        {state.currentStep === 3 && (
          <ErrorBoundary>
            <Step3Evaluation />
          </ErrorBoundary>
        )}
        {state.currentStep === 4 && (
          <ErrorBoundary>
            <Step4Results />
          </ErrorBoundary>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm mb-2">
            <strong>Powered by</strong>{' '}
            <a
              href="https://www.linkedin.com/in/valentino-grossi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
            >
              Valentino Grossi
            </a>
          </p>
          <p className="text-xs opacity-75">
            <a
              href="https://valentinogrossi.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300 hover:underline"
            >
              valentinogrossi.it
            </a>
            {' | '}
            <a
              href="https://www.linkedin.com/in/valentino-grossi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300 hover:underline"
            >
              LinkedIn
            </a>
          </p>
        </div>
      </footer>

      {/* Modals */}
      {showImportExport && (
        <ImportExport
          workflows={state.workflows}
          evaluations={state.evaluations}
          onImport={(workflows, evaluations) => {
            bulkAddWorkflows(workflows);
            if (evaluations) {
              // TODO: Implementare merge evaluations se necessario
              console.log('Evaluations imported:', evaluations);
            }
          }}
          onClose={() => setShowImportExport(false)}
        />
      )}

      {showTemplateLibrary && (
        <TemplateLibrary
          onSelectTemplate={(workflow) => {
            // Genera id e tempoTotale per il nuovo workflow
            const newId = `W${String(state.workflows.length + 1).padStart(3, '0')}`;
            const tempoTotale = workflow.tempoMedio * workflow.frequenza;
            addWorkflow({
              ...workflow,
              id: newId,
              tempoTotale,
            });
            setCurrentStep(2); // Vai al mapping per vedere/modificare il workflow
          }}
          onSelectMultiple={(workflows) => {
            // Importa tutti i template selezionati in blocco
            const workflowsToAdd = workflows.map((workflow, index) => {
              const newId = `W${String(state.workflows.length + index + 1).padStart(3, '0')}`;
              const tempoTotale = workflow.tempoMedio * workflow.frequenza;
              return {
                ...workflow,
                id: newId,
                tempoTotale,
              };
            });

            bulkAddWorkflows(workflowsToAdd);
            setCurrentStep(1); // Torna al dashboard per vedere tutti i workflow importati
            setShowTemplateLibrary(false); // Chiudi automaticamente dopo l'import
          }}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}

      {/* AI Chat Assistant - Always available */}
      <AIChat
        currentWorkflow={state.workflows[state.workflows.length - 1]}
        allWorkflows={state.workflows}
        currentStep={state.currentStep}
      />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ErrorBoundary>
          <AppProvider>
            <Routes>
              {/* Main route - No authentication required (internal use only) */}
              <Route
                path="/"
                element={
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                }
              />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
