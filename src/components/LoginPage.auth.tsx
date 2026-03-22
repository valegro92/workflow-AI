import React, { useState } from 'react';
import { storeToken, isFreePeriod, FREE_PERIOD_END } from '../utils/auth';

interface LoginPageAuthProps {
  onLoginSuccess: () => void;
}

/**
 * Pagina di login
 * - Periodo free (prima del 1° maggio): chiunque può registrarsi
 * - Dopo: solo abbonati L'Officina (verifica via Upstash Redis)
 */
export const LoginPageAuth: React.FC<LoginPageAuthProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const freePeriod = isFreePeriod();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Errore durante l'accesso");
        setLoading(false);
        return;
      }

      // Salva token
      storeToken(data.token);

      // Callback di successo
      onLoginSuccess();
    } catch (err) {
      setError('Errore di connessione. Riprova più tardi.');
      setLoading(false);
    }
  };

  const formattedDate = FREE_PERIOD_END.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-dark-surface rounded-xl shadow-2xl p-8 border border-dark-border">
          {/* Logo and branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-brand rounded-lg mb-4">
              <svg className="w-7 h-7 text-dark-bg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Workflow AI Analyzer</h1>
            <p className="text-brand text-sm font-medium">
              La Cassetta degli AI-trezzi
            </p>
          </div>

          {/* Info box — cambia in base al periodo */}
          {freePeriod ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300 text-center">
                <span className="text-green-400 font-semibold">Accesso gratuito</span> fino al {formattedDate}.
                <br />
                Registrati con la tua email per salvare i tuoi workflow nel cloud.
              </p>
            </div>
          ) : (
            <div className="bg-brand/10 border border-brand/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300 text-center">
                Questo strumento e riservato agli abbonati de{' '}
                <span className="text-brand font-semibold">L'Officina della Cassetta degli AI-trezzi</span>,
                il piano a pagamento della newsletter con tutti i tool pratici per adottare l'AI nel tuo lavoro.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                {freePeriod ? 'La tua email' : 'La tua email di Substack'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua@email.it"
                required
                autoFocus
                className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 px-4 bg-brand text-dark-bg font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Verifico...' : freePeriod ? 'Registrati gratis' : 'Accedi'}
            </button>
          </form>

          {/* Footer — Cos'è L'Officina */}
          <div className="mt-8 pt-6 border-t border-dark-border">
            {freePeriod ? (
              <>
                <p className="text-center text-sm text-text-secondary mb-3">
                  Dal {formattedDate} l'accesso sara riservato agli abbonati de{' '}
                  <span className="text-brand font-semibold">L'Officina</span>.
                </p>
                <p className="text-center text-xs text-gray-500 mb-4">
                  L'Officina della Cassetta degli AI-trezzi e il piano a pagamento della newsletter:
                  include questo tool, forfAIt e tutti i futuri strumenti pratici per integrare l'AI nel tuo lavoro.
                </p>
              </>
            ) : (
              <p className="text-center text-sm text-text-secondary mb-3">
                Non sei ancora abbonato?
              </p>
            )}
            <a
              href="https://cassettadegliaitrezzi.it"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2 px-4 border border-brand-dark text-brand rounded-lg text-sm hover:bg-brand-dark/20 transition"
            >
              Scopri L'Officina →
            </a>
          </div>
        </div>

        {/* Credits */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Powered by{' '}
          <a
            href="https://valentinogrossi.it"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-400 hover:underline"
          >
            Valentino Grossi
          </a>
        </p>
      </div>
    </div>
  );
};
