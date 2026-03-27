import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { AppState, Workflow, Evaluation } from '../types';
import { calculateStats, fixDuplicateWorkflowIds } from '../utils/businessLogic';
import { isAuthenticated, getAuthHeaders } from '../utils/auth';

interface AppContextType {
  state: AppState;
  setCurrentStep: (step: number) => void;
  setCostoOrario: (costo: number | undefined) => void;
  addWorkflow: (workflow: Workflow) => void;
  bulkAddWorkflows: (workflows: Workflow[]) => void;
  updateWorkflow: (id: string, workflow: Workflow) => void;
  deleteWorkflow: (id: string) => void;
  addEvaluation: (evaluation: Evaluation) => void;
  updateEvaluation: (workflowId: string, evaluation: Evaluation) => void;
  setNomeAzienda: (nome: string) => void;
  setOpenRouterKey: (key: string) => void;
  saveImplementationPlan: (plan: string) => void;
  resetApp: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'ai-collaboration-canvas-data';
const MULTI_CLIENT_KEY = 'ai-collaboration-canvas-multi-client';

const initialState: AppState = {
  currentStep: 1,
  workflows: [],
  evaluations: {},
  stats: {
    totalSteps: 0,
    totalTime: 0,
    strategyCounts: {
      partner: 0,
      assistant: 0,
      tool: 0,
      out: 0
    }
  }
};

/**
 * Migra dati dal vecchio formato multi-client al formato singolo.
 * Prende lo state dell'azienda corrente o la prima disponibile.
 */
function migrateFromMultiClient(data: any): AppState | null {
  try {
    if (!data || typeof data !== 'object') return null;

    const { currentAzienda, aziende } = data;
    if (!aziende || typeof aziende !== 'object') return null;

    const aziendaNames = Object.keys(aziende);
    if (aziendaNames.length === 0) return null;

    // Usa l'azienda corrente se esiste, altrimenti la prima per data di aggiornamento
    let targetName = currentAzienda && aziende[currentAzienda]
      ? currentAzienda
      : aziendaNames.sort((a, b) => {
          const dateA = new Date(aziende[a]?.updatedAt || 0).getTime();
          const dateB = new Date(aziende[b]?.updatedAt || 0).getTime();
          return dateB - dateA;
        })[0];

    const targetState = aziende[targetName]?.state;
    if (!targetState) return null;

    // Ricalcola stats per sicurezza
    return {
      ...targetState,
      stats: calculateStats(targetState.workflows || [], targetState.evaluations || {})
    };
  } catch (error) {
    console.error('Error migrating from multi-client format:', error);
    return null;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      // 1. Prova il formato singolo
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && parsed.workflows) {
          // Fix ID duplicati da bug precedente
          const { workflows, evaluations, changed } = fixDuplicateWorkflowIds(
            parsed.workflows || [],
            parsed.evaluations || {}
          );
          if (changed) {
            console.log('Fixed duplicate workflow IDs');
          }
          return {
            ...parsed,
            workflows,
            evaluations,
            stats: calculateStats(workflows, evaluations)
          };
        }
      }

      // 2. Prova migrazione dal formato multi-client
      const multiData = localStorage.getItem(MULTI_CLIENT_KEY);
      if (multiData) {
        const parsed = JSON.parse(multiData);
        const migrated = migrateFromMultiClient(parsed);
        if (migrated) {
          // Salva nel nuovo formato e rimuovi il vecchio
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          localStorage.removeItem(MULTI_CLIENT_KEY);
          console.log('Migrated from multi-client to single-client format');
          return migrated;
        }
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
    return initialState;
  });

  // Ref per il debounce del sync server
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingFromServer = useRef(false);

  /**
   * Salva stato sul server (debounced)
   */
  const syncToServer = useCallback((stateToSync: AppState) => {
    if (!isAuthenticated()) return;
    if (isLoadingFromServer.current) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/user-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ appState: stateToSync }),
        });
      } catch (err) {
        console.error('❌ Sync to server failed:', err);
      }
    }, 5000); // Debounce 5 secondi
  }, []);

  /**
   * Carica stato dal server al mount (se loggato)
   */
  useEffect(() => {
    if (!isAuthenticated()) return;

    const loadFromServer = async () => {
      try {
        isLoadingFromServer.current = true;
        const res = await fetch('/api/user-data', {
          headers: { ...getAuthHeaders() },
        });
        const json = await res.json();

        if (json.success && json.data) {
          const serverState = json.data as AppState;
          // Merge: se il server ha workflow, usa quelli; altrimenti mantieni localStorage
          if (serverState.workflows && serverState.workflows.length > 0) {
            setState(prev => ({
              ...serverState,
              currentStep: prev.currentStep, // mantieni step corrente locale
              stats: calculateStats(serverState.workflows, serverState.evaluations || {}),
            }));
          } else {
            // Primo login: salva i dati locali sul server
            syncToServer(state);
          }
        } else {
          // Nessun dato sul server: salva lo stato locale
          syncToServer(state);
        }
      } catch (err) {
        console.error('❌ Load from server failed:', err);
      } finally {
        isLoadingFromServer.current = false;
      }
    };

    loadFromServer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Salva stato su localStorage ad ogni cambiamento + sync server
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
    // Sync con server se loggato
    syncToServer(state);
  }, [state, syncToServer]);

  const setCurrentStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const setCostoOrario = (costo: number | undefined) => {
    setState(prev => ({ ...prev, costoOrario: costo }));
  };

  const addWorkflow = (workflow: Workflow) => {
    setState(prev => {
      const newWorkflows = [...prev.workflows, workflow];
      const newStats = calculateStats(newWorkflows, prev.evaluations);
      return { ...prev, workflows: newWorkflows, stats: newStats };
    });
  };

  const bulkAddWorkflows = (workflows: Workflow[]) => {
    setState(prev => {
      const newWorkflows = [...prev.workflows, ...workflows];
      const newStats = calculateStats(newWorkflows, prev.evaluations);
      return { ...prev, workflows: newWorkflows, stats: newStats };
    });
  };

  const updateWorkflow = (id: string, workflow: Workflow) => {
    setState(prev => {
      const newWorkflows = prev.workflows.map(w => w.id === id ? workflow : w);
      const newStats = calculateStats(newWorkflows, prev.evaluations);
      return { ...prev, workflows: newWorkflows, stats: newStats };
    });
  };

  const deleteWorkflow = (id: string) => {
    setState(prev => {
      const newWorkflows = prev.workflows.filter(w => w.id !== id);
      const newEvaluations = { ...prev.evaluations };
      delete newEvaluations[id];
      const newStats = calculateStats(newWorkflows, newEvaluations);
      return { ...prev, workflows: newWorkflows, evaluations: newEvaluations, stats: newStats };
    });
  };

  const addEvaluation = (evaluation: Evaluation) => {
    setState(prev => {
      const newEvaluations = { ...prev.evaluations, [evaluation.workflowId]: evaluation };
      const newStats = calculateStats(prev.workflows, newEvaluations);
      return { ...prev, evaluations: newEvaluations, stats: newStats };
    });
  };

  const updateEvaluation = (workflowId: string, evaluation: Evaluation) => {
    setState(prev => {
      const newEvaluations = { ...prev.evaluations, [workflowId]: evaluation };
      const newStats = calculateStats(prev.workflows, newEvaluations);
      return { ...prev, evaluations: newEvaluations, stats: newStats };
    });
  };

  const setNomeAzienda = (nome: string) => {
    setState(prev => ({ ...prev, nomeAzienda: nome }));
  };

  const setOpenRouterKey = (key: string) => {
    setState(prev => ({ ...prev, openRouterKey: key }));
  };

  const saveImplementationPlan = (plan: string) => {
    setState(prev => ({ ...prev, implementationPlan: plan }));
  };

  const resetApp = () => {
    setState(initialState);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        setCurrentStep,
        setCostoOrario,
        addWorkflow,
        bulkAddWorkflows,
        updateWorkflow,
        deleteWorkflow,
        addEvaluation,
        updateEvaluation,
        setNomeAzienda,
        setOpenRouterKey,
        saveImplementationPlan,
        resetApp
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
