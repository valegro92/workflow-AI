import React, { useState, useEffect } from 'react';

const WELCOME_SEEN_KEY = 'workflow-ai-welcome-seen';

interface WelcomeBannerProps {
  userEmail: string | null;
}

/**
 * Banner di benvenuto che appare una sola volta dopo il primo login.
 * Si chiude automaticamente dopo 8 secondi o con click.
 */
export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ userEmail }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(WELCOME_SEEN_KEY);
      if (!seen) {
        setVisible(true);
        localStorage.setItem(WELCOME_SEEN_KEY, 'true');
        // Auto-chiudi dopo 8 secondi
        const timer = setTimeout(() => setVisible(false), 8000);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="mx-4 mt-4 max-w-6xl lg:mx-auto">
      <div className="bg-gradient-to-r from-brand-dark/40 to-brand/20 border border-brand/40 rounded-xl p-5 relative">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition p-1"
          aria-label="Chiudi"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-1">
              Benvenuto{userEmail ? `, ${userEmail.split('@')[0]}` : ''}!
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Da ora i tuoi workflow si salvano automaticamente nel cloud.
              Puoi accedere da qualsiasi dispositivo con la tua email.
            </p>
          </div>
        </div>

        {/* Progress bar che si riduce in 8 secondi */}
        <div className="mt-4 h-0.5 bg-dark-border rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full"
            style={{
              animation: 'shrink 8s linear forwards',
            }}
          />
        </div>

        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
};
