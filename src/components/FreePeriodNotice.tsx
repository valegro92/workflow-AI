import React, { useState, useEffect } from 'react';
import { isFreePeriod, FREE_PERIOD_END } from '../utils/auth';

const NOTICE_KEY = 'workflow-ai-free-notice-shown';

/**
 * Popup che avvisa che dal 1° maggio serve abbonamento a L'Officina.
 * Si mostra una volta per sessione durante il periodo free, dopo il login.
 */
export const FreePeriodNotice: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mostra solo durante il periodo free e solo una volta per sessione
    if (isFreePeriod() && !sessionStorage.getItem(NOTICE_KEY)) {
      // Piccolo delay per non apparire subito dopo il login
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(NOTICE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const formattedDate = FREE_PERIOD_END.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={handleDismiss}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="bg-dark-surface border border-brand/30 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand/15 rounded-full mb-4">
              <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Accesso gratuito fino al {formattedDate}
            </h3>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            <p className="text-gray-300 text-sm text-center leading-relaxed">
              Stai usando <span className="text-white font-semibold">Workflow AI Analyzer</span> in modalita gratuita.
              I tuoi workflow sono gia salvati nel cloud.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-300 text-sm text-center font-medium">
                Dal {formattedDate} l'accesso sara riservato agli abbonati de L'Officina della Cassetta degli AI-trezzi.
              </p>
            </div>
            <p className="text-gray-400 text-xs text-center">
              L'Officina e il piano a pagamento della newsletter{' '}
              <span className="text-brand font-medium">La Cassetta degli AI-trezzi</span>:
              include questo tool, forfAIt e tutti i futuri strumenti pratici per adottare l'AI nel tuo lavoro quotidiano.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href="https://cassettadegliaitrezzi.it"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 px-4 bg-brand text-dark-bg font-semibold rounded-lg hover:bg-brand-light transition"
            >
              Scopri L'Officina →
            </a>
            <button
              onClick={handleDismiss}
              className="block w-full text-center py-3 px-4 text-gray-400 hover:text-white text-sm transition"
            >
              Ho capito, continua
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
