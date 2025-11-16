import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error component stack:', errorInfo.componentStack);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // In production, errors are logged to browser console for debugging
    // Future: Integrate error tracking service (Sentry, LogRocket, etc.)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            {/* Error Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Oops! Qualcosa è andato storto
              </h1>
              <p className="text-gray-600">
                Si è verificato un errore imprevisto. Non preoccuparti, i tuoi dati sono al sicuro.
              </p>
            </div>

            {/* Error Details (collapsed by default) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                  Dettagli tecnici (sviluppo)
                </summary>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Errore:</p>
                    <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto text-red-900">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Stack trace:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto text-gray-700 max-h-40 overflow-y-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Riprova
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-300 transition-all"
              >
                Torna alla home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-300 transition-all"
              >
                Ricarica pagina
              </button>
            </div>

            {/* Help text */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Se il problema persiste, prova a{' '}
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-purple-600 hover:text-purple-700 font-semibold underline"
              >
                cancellare i dati locali
              </button>
              {' '}o contatta il supporto.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
