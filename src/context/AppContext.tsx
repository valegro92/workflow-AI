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
  resetApp: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'ai-collaboration-canvas-data';

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    // Carica dati da localStorage all'inizializzazione
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return {
          ...parsed,
          stats: calculateStats(parsed.workflows, parsed.evaluations)
        };
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return initialState;
  });

  // Salva in localStorage ogni volta che lo stato cambia
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
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
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
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
