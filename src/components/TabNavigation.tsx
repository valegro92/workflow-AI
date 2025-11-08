import React from 'react';

interface TabNavigationProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  workflowCount: number;
  evaluationCount: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  currentStep,
  onStepChange,
  workflowCount,
  evaluationCount,
}) => {
  const tabs = [
    {
      step: 1,
      icon: '📝',
      label: 'Workflow',
      count: workflowCount,
      description: 'Mappa processi'
    },
    {
      step: 2,
      icon: '⚖️',
      label: 'Valuta',
      count: evaluationCount,
      description: 'Analizza automazione'
    },
    {
      step: 3,
      icon: '📊',
      label: 'Risultati',
      count: null,
      description: 'Dashboard e export'
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = currentStep === tab.step;

            return (
              <button
                key={tab.step}
                onClick={() => onStepChange(tab.step)}
                className={`
                  flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap
                  ${isActive
                    ? 'border-blue-600 text-blue-600 font-semibold bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <span className="text-xl">{tab.icon}</span>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? 'font-bold' : 'font-medium'}>
                      {tab.label}
                    </span>
                    {tab.count !== null && tab.count > 0 && (
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs font-bold
                        ${isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                        }
                      `}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 hidden md:block">
                    {tab.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
