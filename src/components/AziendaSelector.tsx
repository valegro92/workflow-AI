import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const AziendaSelector: React.FC = () => {
  const { getAllAziende, createAzienda, selectAzienda, deleteAzienda } = useAppContext();
  const [nuovaAzienda, setNuovaAzienda] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const aziende = getAllAziende();

  const handleCreateAzienda = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nuovaAzienda.trim();

    if (!trimmedName) {
      alert('Inserisci il nome dell\'azienda');
      return;
    }

    // Verifica che non esista già
    if (aziende.some(a => a.nomeAzienda === trimmedName)) {
      alert('Un\'azienda con questo nome esiste già');
      return;
    }

    createAzienda(trimmedName);
    setNuovaAzienda('');
  };

  const handleDeleteAzienda = (nomeAzienda: string) => {
    deleteAzienda(nomeAzienda);
    setShowDeleteConfirm(null);
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;

    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Compatto */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏢 Workflow AI Analyzer
          </h1>
          <p className="text-gray-600">
            Mappa processi aziendali e scopri opportunità di automazione AI
          </p>
        </div>

        {/* Nuova Azienda - Inline */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleCreateAzienda} className="flex gap-3">
            <input
              type="text"
              value={nuovaAzienda}
              onChange={(e) => setNuovaAzienda(e.target.value)}
              placeholder="Nome nuova azienda (es: Acme S.p.A.)"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              + Nuova Azienda
            </button>
          </form>
        </div>

        {/* Grid Aziende o Empty State */}
        {aziende.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Inizia il tuo primo assessment
            </h2>
            <div className="max-w-2xl mx-auto text-left space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <p className="text-gray-700"><strong>Multi-cliente:</strong> Gestisci assessment di più aziende in un unico posto</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <p className="text-gray-700"><strong>Privacy-first:</strong> Tutti i dati restano nel tuo browser (localStorage)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <p className="text-gray-700"><strong>AI-powered:</strong> Analisi automatica e roadmap di implementazione</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              Inserisci il nome dell'azienda qui sopra per iniziare
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Le tue aziende ({aziende.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aziende.map((azienda) => (
                <div
                  key={azienda.nomeAzienda}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-2 border-transparent hover:border-blue-400 cursor-pointer group"
                  onClick={() => selectAzienda(azienda.nomeAzienda)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">🏢</div>
                    {showDeleteConfirm === azienda.nomeAzienda ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteAzienda(azienda.nomeAzienda)}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1 rounded text-xs"
                        >
                          Conferma
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold px-3 py-1 rounded text-xs"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(azienda.nomeAzienda);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 truncate">
                    {azienda.nomeAzienda}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span>{azienda.state.workflows.length} workflow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⏱️</span>
                      <span>{azienda.state.stats.totalTime} min/mese</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🕒</span>
                      <span>{formatDate(azienda.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-blue-600 font-semibold text-sm group-hover:underline">
                      Apri →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Dati salvati localmente • Privacy-first • Nessun server esterno</p>
        </div>
      </div>
    </div>
  );
};
