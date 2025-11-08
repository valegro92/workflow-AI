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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            🏢 Workflow AI Analyzer
          </h1>
          <p className="text-lg text-gray-600">
            Seleziona un'azienda esistente o creane una nuova per iniziare l'assessment
          </p>
        </div>

        {/* Crea Nuova Azienda */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>✨</span>
            <span>Nuova Azienda</span>
          </h2>

          <form onSubmit={handleCreateAzienda} className="flex gap-3">
            <input
              type="text"
              value={nuovaAzienda}
              onChange={(e) => setNuovaAzienda(e.target.value)}
              placeholder="Nome azienda (es: Acme S.p.A.)"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              autoFocus
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Crea
            </button>
          </form>
        </div>

        {/* Aziende Esistenti */}
        {aziende.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📂</span>
              <span>Aziende Esistenti ({aziende.length})</span>
            </h2>

            <div className="space-y-3">
              {aziende.map((azienda) => (
                <div
                  key={azienda.nomeAzienda}
                  className="border-2 border-gray-200 hover:border-blue-400 rounded-lg p-4 transition-all hover:shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => selectAzienda(azienda.nomeAzienda)}>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🏢</div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {azienda.nomeAzienda}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>
                              📊 {azienda.state.workflows.length} workflow
                            </span>
                            <span>
                              ⏱️ {azienda.state.stats.totalTime} min/mese
                            </span>
                            <span>
                              🕒 Aggiornato {formatDate(azienda.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => selectAzienda(azienda.nomeAzienda)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                      >
                        Apri
                      </button>

                      {showDeleteConfirm === azienda.nomeAzienda ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteAzienda(azienda.nomeAzienda)}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                          >
                            Conferma
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(azienda.nomeAzienda)}
                          className="bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 font-semibold px-4 py-2 rounded-lg transition-colors"
                          title="Elimina azienda"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {aziende.length === 0 && (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Inizia il tuo primo assessment
            </h3>
            <p className="text-gray-600">
              Crea una nuova azienda per iniziare a mappare i workflow e scoprire le opportunità di automazione AI
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
