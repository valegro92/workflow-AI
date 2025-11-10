import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getPasswordErrors } from '../lib/auth';

export const Register: React.FC = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Calculate password validation errors in real-time
  const passwordErrors = useMemo(() => getPasswordErrors(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (passwordErrors.length > 0) {
      setError('La password deve contenere: ' + passwordErrors.join(', '));
      return;
    }

    try {
      await register(email, password);
      navigate('/'); // Redirect to home after registration
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 Workflow AI
          </h1>
          <p className="text-gray-600">Crea il tuo account gratuito</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Free plan badge */}
        <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎉</span>
            <span className="font-bold text-green-900">Piano FREE</span>
          </div>
          <ul className="text-sm text-green-800 space-y-1">
            <li>✓ 1 azienda</li>
            <li>✓ 10 workflow</li>
            <li>✓ Analisi AI base</li>
          </ul>
        </div>

        {/* Register form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="tua@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="••••••••"
              disabled={loading}
            />
            {/* Password requirements checklist */}
            {password.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-1">Requisiti password:</p>
                <ul className="text-xs space-y-0.5">
                  <li className={password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                    {password.length >= 8 ? '✓' : '○'} Almeno 8 caratteri
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                    {/[A-Z]/.test(password) ? '✓' : '○'} Almeno una lettera maiuscola
                  </li>
                  <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                    {/[a-z]/.test(password) ? '✓' : '○'} Almeno una lettera minuscola
                  </li>
                  <li className={/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                    {/[0-9]/.test(password) ? '✓' : '○'} Almeno un numero
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                    {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'} Almeno un carattere speciale (!@#$%...)
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Conferma Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrazione in corso...
              </span>
            ) : (
              'Registrati Gratis'
            )}
          </button>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Hai già un account?{' '}
            <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
              Accedi
            </Link>
          </p>
        </div>

        {/* Terms */}
        <p className="mt-6 text-xs text-gray-500 text-center">
          Registrandoti accetti i nostri{' '}
          <a href="/terms" className="text-purple-600 hover:underline">
            Termini di Servizio
          </a>{' '}
          e la{' '}
          <a href="/privacy" className="text-purple-600 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};
