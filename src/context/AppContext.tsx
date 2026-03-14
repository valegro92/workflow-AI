import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Workflow, Evaluation } from '../types';
import { calculateStats } from '../utils/businessLogic';

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
          return {
            ...parsed,
            stats: calculateStats(parsed.workflows || [], parsed.evaluations || {})
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

  // Salva stato su localStorage ad ogni cambiamento
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [state]);

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
