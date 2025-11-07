import React from 'react';
import { useAppContext } from '../context/AppContext';

export const Step1Welcome: React.FC = () => {
  const { setCurrentStep } = useAppContext();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Workflow AI Analyzer
        </h1>
        <p className="text-xl text-gray-600">
          Identifica quali attività delegare all'AI
        </p>
      </div>

      {/* 3 Info Boxes */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Mappa il Workflow
          </h3>
          <p className="text-gray-700">
            Descrivi ogni step del tuo processo con dettagli su tempi, input e output
          </p>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Valuta gli Step
          </h3>
          <p className="text-gray-700">
            Rispondi a 8 domande scientifiche su automazione e carico cognitivo
          </p>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Strategia AI
          </h3>
          <p className="text-gray-700">
            Ottieni la matrice 2×2 e scopri come l'AI può aiutarti
          </p>
        </div>
      </div>

      {/* Consiglio Pratico */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-bold text-yellow-800 mb-1">
              Consiglio pratico
            </h3>
            <p className="text-yellow-700">
              Inizia con un processo ripetitivo che svolgi regolarmente (es: report settimanali,
              preparazione documenti, analisi dati)
            </p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="text-center">
        <button
          onClick={() => setCurrentStep(2)}
          className="
            bg-blue-600 hover:bg-blue-700 text-white font-bold
            py-4 px-12 rounded-lg text-xl
            transition-all duration-200 transform hover:scale-105
            shadow-lg hover:shadow-xl
          "
        >
          Inizia Ora →
        </button>
      </div>
    </div>
  );
};
