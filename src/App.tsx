import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AziendaSelector } from './components/AziendaSelector';
import { TabNavigation } from './components/TabNavigation';
import { Step1Welcome } from './components/Step1Welcome';
import { Step2Mapping } from './components/Step2Mapping';
import { Step3Evaluation } from './components/Step3Evaluation';
import { Step4Results } from './components/Step4Results';

const AppContent: React.FC = () => {
  const { state, currentAzienda, setCurrentStep, deselectAzienda } = useAppContext();
  const { logout, user } = require('./context/AuthContext').useAuth();

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
              {user && (
                <span className="ml-2">
                  | 👤 {user.email}
                  {user.plan === 'pro' && (
                    <span className="ml-1 bg-yellow-400 text-purple-900 px-2 py-0.5 rounded-full text-xs font-bold">
                      PRO
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
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

            {user ? (
              <button
                onClick={() => {
                  if (window.confirm('Sei sicuro di voler uscire?')) {
                    logout();
                  }
                }}
                className="bg-red-500 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                title="Logout"
              >
                🚪 Esci
              </button>
            ) : (
              <a
                href="/login"
                className="bg-green-500 bg-opacity-80 hover:bg-opacity-100 px-4 py-2 rounded-lg font-semibold transition-all text-sm inline-flex items-center"
                title="Accedi per salvare i tuoi dati nel cloud"
              >
                👤 Accedi
              </a>
            )}
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
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            {/* Public routes - Login and Register are optional */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Main app - NO LOGIN REQUIRED! Works with localStorage */}
            <Route path="/" element={<AppContent />} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
