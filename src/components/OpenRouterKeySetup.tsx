import { useState } from 'react';

interface OpenRouterKeySetupProps {
  onKeySaved: (key: string, groqKey?: string) => void;
  onCancel?: () => void;
  inline?: boolean; // true = renders as inline card, false = renders as overlay
  showGroqKey?: boolean; // true = also ask for Groq key (for audio import)
}

export default function OpenRouterKeySetup({ onKeySaved, onCancel, inline = false, showGroqKey = false }: OpenRouterKeySetupProps) {
  const [key, setKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    const trimmed = key.trim();
    const trimmedGroq = groqKey.trim();
    if (trimmed) {
      onKeySaved(trimmed, trimmedGroq || undefined);
    }
  };

  const content = (
    <div className={`${inline ? '' : 'bg-dark-card border border-dark-border rounded-xl shadow-2xl max-w-md w-full mx-4'}`}>
      {/* Header */}
      <div className={`${inline ? 'mb-3' : 'px-5 pt-5 pb-3'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-brand/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🔑</span>
          </div>
          <h3 className="text-white font-bold text-base">Configura Chiave AI</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          Per usare le funzioni AI serve una chiave OpenRouter.
          <strong className="text-brand"> È gratis</strong> — i modelli che usiamo sono a costo zero.
        </p>
      </div>

      {/* Steps */}
      <div className={`${inline ? 'mb-3' : 'px-5 pb-3'} space-y-2`}>
        <div className="flex items-start gap-2">
          <span className="bg-brand/20 text-brand text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
          <p className="text-gray-300 text-sm">
            Vai su{' '}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:text-brand-light">
              openrouter.ai
            </a>
            {' '}e crea un account gratis (puoi usare Google)
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="bg-brand/20 text-brand text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
          <p className="text-gray-300 text-sm">
            Vai su{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:text-brand-light">
              openrouter.ai/keys
            </a>
            {' '}→ "Create Key"
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="bg-brand/20 text-brand text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
          <p className="text-gray-300 text-sm">
            Copia la chiave (<code className="bg-dark-hover px-1 rounded text-brand text-xs">sk-or-...</code>) e incollala qui sotto
          </p>
        </div>
      </div>

      {/* Input */}
      <div className={`${inline ? '' : 'px-5 pb-5'}`}>
        <div className="relative mb-3">
          <label className="text-xs text-gray-400 mb-1 block">Chiave OpenRouter</label>
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full px-3 py-2.5 bg-dark-hover border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand text-sm placeholder-gray-500 pr-10"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 bottom-2.5 text-gray-500 hover:text-gray-300 p-1"
            title={showKey ? 'Nascondi' : 'Mostra'}
          >
            {showKey ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {showGroqKey && (
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1 block">
              Chiave Groq <span className="text-gray-500">(per trascrizione audio)</span>
            </label>
            <input
              type={showKey ? 'text' : 'password'}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-2.5 bg-dark-hover border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand text-sm placeholder-gray-500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ottienila gratis su{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:text-brand-light">
                console.groq.com/keys
              </a>
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!key.trim() || (showGroqKey && !groqKey.trim())}
            className="flex-1 bg-brand text-dark-bg py-2 px-4 rounded-lg font-semibold hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Salva e continua
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-dark-hover text-gray-400 rounded-lg hover:text-white transition-colors text-sm border border-dark-border"
            >
              Annulla
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Le chiavi restano solo nel tuo browser. Non le salviamo sui nostri server.
        </p>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  // Modal overlay
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget && onCancel) onCancel(); }}>
      {content}
    </div>
  );
}
