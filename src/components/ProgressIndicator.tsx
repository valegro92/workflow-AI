import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: 'Benvenuto' },
  { number: 2, label: 'Mappatura' },
  { number: 3, label: 'Valutazione' },
  { number: 4, label: 'Risultati' }
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="w-full py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                    transition-all duration-300
                    ${step.number < currentStep
                      ? 'bg-green-500 text-white'
                      : step.number === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-300 animate-pulse'
                      : 'bg-gray-300 text-gray-600'
                    }
                  `}
                >
                  {step.number < currentStep ? '✓' : step.number}
                </div>
                <span
                  className={`
                    mt-2 text-sm font-semibold text-center
                    ${step.number === currentStep ? 'text-blue-600' : 'text-gray-600'}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 -mt-8">
                  <div
                    className={`
                      h-full transition-all duration-300
                      ${step.number < currentStep ? 'bg-green-500' : 'bg-gray-300'}
                    `}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
