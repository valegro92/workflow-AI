import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabNavigation } from './components/TabNavigation';
import { Step1Welcome } from './components/Step1Welcome';
import { Step2Mapping } from './components/Step2Mapping';
import { Step3Evaluation } from './components/Step3Evaluation';
import { Step4Results } from './components/Step4Results';
import ImportExport from './components/ImportExport';
import TemplateLibrary from './components/TemplateLibrary';
import WordImport from './components/WordImport';
import AIChat from './components/AIChat';
import { LandingPage } from './components/LandingPage';

const AppContent: React.FC = () => {
  const { state, setCurrentStep, bulkAddWorkflows, addWorkflow } = useAppContext();
  const [showImportExport, setShowImportExport] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showWordImport, setShowWordImport] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(() => {
    return localStorage.getItem('workflow-ai-entered') === 'true' || state.workflows.length > 0;
  });

  const handleEnterApp = () => {
    localStorage.setItem('workflow-ai-entered', 'true');
    setHasEntered(true);
  };

  // Listen for openTemplateLibrary event from Step1Welcome
  useEffect(() => {
    const handler = () => setShowTemplateLibrary(true);
    window.addEventListener('openTemplateLibrary', handler);
    return () => window.removeEventListener('openTemplateLibrary', handler);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowImportDropdown(false);
      }
    };
    if (showImportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showImportDropdown]);

  if (!hasEntered) {
    return <LandingPage onEnter={handleEnterApp} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Teal accent bar */}
      <div className="h-1 bg-brand" />

      {/* Header */}
      <header className="bg-dark-card border-b border-brand/30 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Toolbox icon */}
            <svg className="w-8 h-8 text-brand flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-white">Workflow AI Analyzer</h1>
              <p className="text-xs text-brand">La Cassetta degli AI-trezzi</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplateLibrary(true)}
              className="bg-brand text-dark-bg hover:bg-brand-light px-4 py-2 rounded-lg font-semibold transition-all text-sm"
            >
              Template
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowImportDropdown(!showImportDropdown)}
                className="bg-dark-hover hover:bg-dark-border text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm border border-dark-border flex items-center gap-1"
              >
                Importa
                <svg className={`w-4 h-4 transition-transform ${showImportDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showImportDropdown && (
                <div className="absolute right-0 mt-1 w-48 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => { setShowWordImport(true); setShowImportDropdown(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-white hover:bg-dark-hover rounded-t-lg transition-colors"
                  >
                    Import da Word
                  </button>
                  <button
                    onClick={() => { setShowImportExport(true); setShowImportDropdown(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-white hover:bg-dark-hover rounded-b-lg transition-colors border-t border-dark-border"
                  >
                    Import/Export JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stepper Navigation */}
      <TabNavigation
        currentStep={state.currentStep}
        onStepChange={setCurrentStep}
        workflowCount={state.workflows.length}
        evaluationCount={Object.keys(state.evaluations).length}
      />

      {/* Main Content */}
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
      <footer className="bg-dark-card border-t border-dark-border py-3">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a
              href="https://www.linkedin.com/in/valentino-grossi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-light hover:underline font-medium"
            >
              Valentino Grossi
            </a>
            {' | '}
            <a
              href="https://valentinogrossi.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 hover:underline"
            >
              valentinogrossi.it
            </a>
          </p>
        </div>
      </footer>

      {/* Bottom accent bar */}
      <div className="h-1 bg-brand" />

      {/* Modals */}
      {showImportExport && (
        <ImportExport
          workflows={state.workflows}
          evaluations={state.evaluations}
          onImport={(workflows, evaluations) => {
            bulkAddWorkflows(workflows);
            if (evaluations) {
              console.log('Evaluations imported:', evaluations);
            }
          }}
          onClose={() => setShowImportExport(false)}
        />
      )}

      {showTemplateLibrary && (
        <TemplateLibrary
          onSelectTemplate={(workflow) => {
            const newId = `W${String(state.workflows.length + 1).padStart(3, '0')}`;
            const tempoTotale = workflow.tempoMedio * workflow.frequenza;
            addWorkflow({
              ...workflow,
              id: newId,
              tempoTotale,
            });
            setCurrentStep(2);
          }}
          onSelectMultiple={(workflows) => {
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
            setCurrentStep(1);
            setShowTemplateLibrary(false);
          }}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}

      {showWordImport && (
        <WordImport
          onImportMultiple={(workflows) => {
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
            setCurrentStep(1);
            setShowWordImport(false);
          }}
          onClose={() => setShowWordImport(false)}
        />
      )}

      {/* AI Chat Assistant */}
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
              <Route
                path="/"
                element={
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
