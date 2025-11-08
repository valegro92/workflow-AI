import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const AziendaSelector: React.FC = () => {
  const { getAllAziende, createAzienda, selectAzienda, deleteAzienda } = useAppContext();
  const [nuovaAzienda, setNuovaAzienda] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showSavedAziende, setShowSavedAziende] = useState(false);

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
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            🏢 Workflow AI Analyzer
          </h1>
          <p className="text-xl text-gray-600">
            Mappa i processi aziendali e scopri le opportunità di automazione AI
          </p>
        </div>

        {/* HERO - Inizia Nuovo Assessment */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl p-10 mb-6 border-2 border-blue-200">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Inizia Nuovo Assessment
            </h2>
            <p className="text-gray-600">
              Inserisci il nome dell'azienda per iniziare subito
            </p>
          </div>

          <form onSubmit={handleCreateAzienda} className="max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={nuovaAzienda}
                onChange={(e) => setNuovaAzienda(e.target.value)}
                placeholder="Nome azienda (es: Acme S.p.A., Studio Rossi, ...)"
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-xl shadow-sm"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-xl"
              >
                ✨ Inizia Assessment
              </button>
            </div>
          </form>
        </div>

        {/* Aziende Salvate (collassabile) */}
        {aziende.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowSavedAziende(!showSavedAziende)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📂</span>
                <span className="text-lg font-semibold text-gray-900">
                  Oppure riprendi un assessment esistente
                </span>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {aziende.length}
                </span>
              </div>
              <span className={`text-2xl transition-transform ${showSavedAziende ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showSavedAziende && (
              <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
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
                                🕒 {formatDate(azienda.updatedAt)}
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
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>I tuoi dati sono salvati localmente nel browser e non vengono mai inviati a server esterni</p>
        </div>
      </div>
    </div>
  );
};
