import React from 'react';

interface TabNavigationProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  workflowCount: number;
  evaluationCount: number;
}

const steps = [
  { step: 1, label: 'Panoramica', description: 'Dashboard workflow' },
  { step: 2, label: 'Mappatura', description: 'Aggiungi workflow' },
  { step: 3, label: 'Valutazione', description: 'Analizza con AI' },
  { step: 4, label: 'Risultati', description: 'Report e piano' },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  currentStep,
  onStepChange,
  workflowCount,
  evaluationCount,
}) => {
  const isCompleted = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return workflowCount > 0;
    if (step === 3) return evaluationCount > 0 && evaluationCount >= workflowCount && workflowCount > 0;
    return false;
  };

  return (
    <div className="bg-dark-card border-b border-dark-border">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center">
          {steps.map((s, index) => {
            const active = currentStep === s.step;
            const completed = isCompleted(s.step) && !active && currentStep > s.step;
            const future = !active && !completed;

            return (
              <React.Fragment key={s.step}>
                {/* Connector line */}
                {index > 0 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > s.step || (completed && !future) ? 'bg-brand' : 'bg-dark-border'
                  }`} />
                )}

                {/* Step circle + label */}
                <button
                  onClick={() => onStepChange(s.step)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${active
                      ? 'bg-brand text-dark-bg ring-2 ring-brand ring-offset-2 ring-offset-dark-card'
                      : completed
                        ? 'bg-brand text-dark-bg'
                        : 'bg-dark-hover text-gray-400 group-hover:bg-dark-border group-hover:text-gray-300'
                    }
                  `}>
                    {completed ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.step
                    )}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    active ? 'text-brand' : completed ? 'text-white' : 'text-gray-500'
                  }`}>
                    {s.label}
                  </span>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap hidden md:block">
                    {s.description}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
