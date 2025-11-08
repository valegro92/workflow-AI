import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { AziendaSelector } from './components/AziendaSelector';
import { ProgressIndicator } from './components/ProgressIndicator';
import { Step1Welcome } from './components/Step1Welcome';
import { Step2Mapping } from './components/Step2Mapping';
import { Step3Evaluation } from './components/Step3Evaluation';
import { Step4Results } from './components/Step4Results';

const AppContent: React.FC = () => {
  const { state, currentAzienda, setCurrentStep } = useAppContext();

  // Se non c'è un'azienda selezionata, mostra il selettore
  if (!currentAzienda) {
    return <AziendaSelector />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Workflow AI Analyzer</h1>
            <p className="text-sm opacity-90">
              <span className="font-semibold">🏢 {currentAzienda}</span> • Identifica quali attività delegare all'AI
            </p>
          </div>
          <div className="flex gap-3">
            {state.currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(1)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-all"
              >
                🏠 Home
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm(`Vuoi tornare alla selezione aziende?\n\nI dati di "${currentAzienda}" sono salvati automaticamente.`)) {
                  window.location.reload();
                }
              }}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-all"
              title="Cambia azienda"
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={state.currentStep} />

      {/* Main Content */}
      <main className="pb-12">
        {state.currentStep === 1 && <Step1Welcome />}
        {state.currentStep === 2 && <Step2Mapping />}
        {state.currentStep === 3 && <Step3Evaluation />}
        {state.currentStep === 4 && <Step4Results />}
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
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
