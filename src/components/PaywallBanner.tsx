import React from 'react';
import { daysUntilPaywall, isBannerDismissed, dismissBanner } from '../utils/auth';

/**
 * Banner di avviso durante il periodo di grazia (8-14 maggio 2026)
 * Avvisa che tra X giorni servira il login per accedere all'app
 */
export const PaywallBanner: React.FC = () => {
  const [dismissed, setDismissed] = React.useState(isBannerDismissed);

  if (dismissed) return null;

  const days = daysUntilPaywall();

  const handleDismiss = () => {
    dismissBanner();
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-brand-dark/30 via-brand/20 to-brand-dark/30 border-b border-brand/40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-brand text-lg flex-shrink-0">⏳</span>
          <p className="text-sm text-gray-200">
            <span className="font-semibold text-white">Tra {days} giorn{days === 1 ? 'o' : 'i'}</span>{' '}
            questo strumento sara riservato agli abbonati de{' '}
            <a
              href="https://cassettadegliaitrezzi.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-light font-semibold underline"
            >
              L'Officina
            </a>
            .
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white transition flex-shrink-0 p-1"
          aria-label="Chiudi avviso"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
