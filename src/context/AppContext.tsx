import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Workflow, Evaluation, ClientRepository, AziendaData } from '../types';
import { calculateStats } from '../utils/businessLogic';

interface AppContextType {
  // Stato corrente
  state: AppState;
  currentAzienda: string | null;

  // Gestione aziende
  getAllAziende: () => AziendaData[];
  createAzienda: (nomeAzienda: string) => void;
  selectAzienda: (nomeAzienda: string) => void;
  deselectAzienda: () => void;
  deleteAzienda: (nomeAzienda: string) => void;

  // Metodi workflow (esistenti)
  setCurrentStep: (step: number) => void;
  setCostoOrario: (costo: number | undefined) => void;
  addWorkflow: (workflow: Workflow) => void;
  bulkAddWorkflows: (workflows: Workflow[]) => void;
  updateWorkflow: (id: string, workflow: Workflow) => void;
  deleteWorkflow: (id: string) => void;
  addEvaluation: (evaluation: Evaluation) => void;
  updateEvaluation: (workflowId: string, evaluation: Evaluation) => void;
  resetApp: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'ai-collaboration-canvas-multi-client';
const OLD_STORAGE_KEY = 'ai-collaboration-canvas-data'; // per migrazione

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

const initialRepository: ClientRepository = {
  currentAzienda: null,
  aziende: {}
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Repository multi-cliente
  const [repository, setRepository] = useState<ClientRepository>(() => {
    try {
      // Prova a caricare nuovo formato multi-cliente
      const savedRepo = localStorage.getItem(STORAGE_KEY);
      if (savedRepo) {
        return JSON.parse(savedRepo);
      }

      // Migrazione da vecchio formato (singolo cliente)
      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldData) {
        const oldState = JSON.parse(oldData);
        const now = new Date().toISOString();

        // Crea azienda "Cliente Importato" con i vecchi dati
        const migratedRepo: ClientRepository = {
          currentAzienda: 'Cliente Importato',
          aziende: {
            'Cliente Importato': {
              nomeAzienda: 'Cliente Importato',
              state: {
                ...oldState,
                stats: calculateStats(oldState.workflows || [], oldState.evaluations || {})
              },
              createdAt: now,
              updatedAt: now
            }
          }
        };

        // Salva nuovo formato e rimuovi vecchio
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedRepo));
        localStorage.removeItem(OLD_STORAGE_KEY);

        return migratedRepo;
      }
    } catch (error) {
      console.error('Error loading repository:', error);
    }
    return initialRepository;
  });

  // Stato dell'azienda corrente
  const [state, setState] = useState<AppState>(() => {
    if (repository.currentAzienda && repository.aziende[repository.currentAzienda]) {
      return repository.aziende[repository.currentAzienda].state;
    }
    return initialState;
  });

  // Salva repository ogni volta che cambia
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(repository));
    } catch (error) {
      console.error('Error saving repository:', error);
    }
  }, [repository]);

  // Sincronizza state → repository quando state cambia
  useEffect(() => {
    if (repository.currentAzienda) {
      setRepository(prev => {
        const updatedAziende = {
          ...prev.aziende,
          [repository.currentAzienda!]: {
            ...prev.aziende[repository.currentAzienda!],
            state: state,
            updatedAt: new Date().toISOString()
          }
        };

        return {
          ...prev,
          aziende: updatedAziende
        };
      });
    }
  }, [state]);

  // === GESTIONE AZIENDE ===

  const getAllAziende = (): AziendaData[] => {
    return Object.values(repository.aziende).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  };

  const createAzienda = (nomeAzienda: string) => {
    const now = new Date().toISOString();
    const newAzienda: AziendaData = {
      nomeAzienda,
      state: initialState,
      createdAt: now,
      updatedAt: now
    };

    setRepository(prev => ({
      currentAzienda: nomeAzienda,
      aziende: {
        ...prev.aziende,
        [nomeAzienda]: newAzienda
      }
    }));

    setState(initialState);
  };

  const selectAzienda = (nomeAzienda: string) => {
    if (repository.aziende[nomeAzienda]) {
      setRepository(prev => ({
        ...prev,
        currentAzienda: nomeAzienda
      }));
      setState(repository.aziende[nomeAzienda].state);
    }
  };

  const deselectAzienda = () => {
    setRepository(prev => ({
      ...prev,
      currentAzienda: null
    }));
    setState(initialState);
  };

  const deleteAzienda = (nomeAzienda: string) => {
    setRepository(prev => {
      const newAziende = { ...prev.aziende };
      delete newAziende[nomeAzienda];

      // Se eliminiamo l'azienda corrente, resettiamo
      const newCurrentAzienda = prev.currentAzienda === nomeAzienda
        ? null
        : prev.currentAzienda;

      return {
        currentAzienda: newCurrentAzienda,
        aziende: newAziende
      };
    });

    // Se abbiamo eliminato l'azienda corrente, resettiamo lo stato
    if (repository.currentAzienda === nomeAzienda) {
      setState(initialState);
    }
  };

  // === METODI WORKFLOW (invariati, operano su state) ===

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
      return {
        ...prev,
        workflows: newWorkflows,
        stats: newStats
      };
    });
  };

  const bulkAddWorkflows = (workflows: Workflow[]) => {
    setState(prev => {
      const newWorkflows = [...prev.workflows, ...workflows];
      const newStats = calculateStats(newWorkflows, prev.evaluations);
      return {
        ...prev,
        workflows: newWorkflows,
        stats: newStats
      };
    });
  };

  const updateWorkflow = (id: string, workflow: Workflow) => {
    setState(prev => {
      const newWorkflows = prev.workflows.map(w => w.id === id ? workflow : w);
      const newStats = calculateStats(newWorkflows, prev.evaluations);
      return {
        ...prev,
        workflows: newWorkflows,
        stats: newStats
      };
    });
  };

  const deleteWorkflow = (id: string) => {
    setState(prev => {
      const newWorkflows = prev.workflows.filter(w => w.id !== id);
      const newEvaluations = { ...prev.evaluations };
      delete newEvaluations[id];
      const newStats = calculateStats(newWorkflows, newEvaluations);
      return {
        ...prev,
        workflows: newWorkflows,
        evaluations: newEvaluations,
        stats: newStats
      };
    });
  };

  const addEvaluation = (evaluation: Evaluation) => {
    setState(prev => {
      const newEvaluations = {
        ...prev.evaluations,
        [evaluation.workflowId]: evaluation
      };
      const newStats = calculateStats(prev.workflows, newEvaluations);
      return {
        ...prev,
        evaluations: newEvaluations,
        stats: newStats
      };
    });
  };

  const updateEvaluation = (workflowId: string, evaluation: Evaluation) => {
    setState(prev => {
      const newEvaluations = {
        ...prev.evaluations,
        [workflowId]: evaluation
      };
      const newStats = calculateStats(prev.workflows, newEvaluations);
      return {
        ...prev,
        evaluations: newEvaluations,
        stats: newStats
      };
    });
  };

  const resetApp = () => {
    if (repository.currentAzienda) {
      // Reset solo l'azienda corrente
      setRepository(prev => ({
        ...prev,
        aziende: {
          ...prev.aziende,
          [repository.currentAzienda!]: {
            ...prev.aziende[repository.currentAzienda!],
            state: initialState,
            updatedAt: new Date().toISOString()
          }
        }
      }));
    }
    setState(initialState);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        currentAzienda: repository.currentAzienda,
        getAllAziende,
        createAzienda,
        selectAzienda,
        deselectAzienda,
        deleteAzienda,
        setCurrentStep,
        setCostoOrario,
        addWorkflow,
        bulkAddWorkflows,
        updateWorkflow,
        deleteWorkflow,
        addEvaluation,
        updateEvaluation,
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
