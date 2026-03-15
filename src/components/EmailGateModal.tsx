import React, { useState } from 'react';

const EMAIL_STORAGE_KEY = 'workflow-ai-user-email';

interface EmailGateModalProps {
  onEmailSubmitted: (email: string) => void;
  onCancel: () => void;
}

export function getStoredEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeEmail(email: string): void {
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  } catch {
    // ignore
  }
}

const EmailGateModal: React.FC<EmailGateModalProps> = ({ onEmailSubmitted, onCancel }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Inserisci un indirizzo email valido');
      return;
    }
    storeEmail(trimmed);
    onEmailSubmitted(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📊</span>
            <h3 className="text-xl font-bold text-white">Report AI pronto!</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Inserisci la tua email per visualizzare il report completo e ricevere
            aggiornamenti sui nuovi tool gratuiti della Cassetta degli AI-trezzi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            La tua email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="mario.rossi@azienda.it"
            className="w-full px-4 py-3 bg-dark-hover border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

          <div className="mt-2 flex items-start gap-2">
            <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-xs text-gray-500">
              Zero spam. Solo tool utili. Cancellati quando vuoi.
            </p>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="submit"
              className="flex-1 bg-brand text-dark-bg font-bold py-3 px-6 rounded-lg hover:bg-brand-light transition-colors"
            >
              Mostra il Report
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 bg-dark-hover text-gray-400 rounded-lg hover:bg-dark-border hover:text-white transition-colors text-sm"
            >
              Annulla
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 pb-5 pt-0">
          <p className="text-xs text-gray-600 text-center">
            La Cassetta degli AI-trezzi | Tool gratuiti per l'automazione AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailGateModal;
