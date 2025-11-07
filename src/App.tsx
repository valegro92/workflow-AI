import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ProgressIndicator } from './components/ProgressIndicator';
import { Step1Welcome } from './components/Step1Welcome';
import { Step2Mapping } from './components/Step2Mapping';
import { Step3Evaluation } from './components/Step3Evaluation';
import { Step4Results } from './components/Step4Results';

const AppContent: React.FC = () => {
  const { state } = useAppContext();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold">AI Collaboration Canvas</h1>
          <p className="text-sm opacity-90">by Nicola Mattina</p>
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
            <strong>AI Collaboration Canvas</strong> - Framework by Nicola Mattina
          </p>
          <p className="text-xs opacity-75">
            <a
              href="https://radicalcuriosity.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              radicalcuriosity.xyz
            </a>
            {' | '}
            <a
              href="https://linkedin.com/in/nicolamattina"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
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
