import React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface FormStepsProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowClickableSteps?: boolean;
  className?: string;
}

export function FormSteps({
  steps,
  currentStep,
  onStepClick,
  allowClickableSteps = false,
  className,
}: FormStepsProps) {
  return (
    <nav className={cn('pb-8', className)} aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowClickableSteps && onStepClick && (isCompleted || index <= currentStep + 1);

          return (
            <li key={step.id} className="relative flex-1">
              {/* Step connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 translate-x-1/2',
                    isCompleted || (isCurrent && index < steps.length - 1)
                      ? 'bg-primary-600'
                      : 'bg-gray-200'
                  )}
                />
              )}

              {/* Step button/indicator */}
              <button
                type="button"
                onClick={isClickable ? () => onStepClick(index) : undefined}
                disabled={!isClickable}
                className={cn(
                  'relative flex flex-col items-center group',
                  isClickable && 'cursor-pointer hover:opacity-80',
                  !isClickable && 'cursor-default'
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-200',
                    isCompleted && 'bg-primary-600 border-primary-600',
                    isCurrent && 'border-primary-600 bg-white',
                    !isCompleted && !isCurrent && 'border-gray-300 bg-white'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isCurrent && 'text-primary-600',
                        !isCompleted && !isCurrent && 'text-gray-500'
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step label */}
                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      'text-xs font-medium',
                      isCurrent && 'text-primary-600',
                      isCompleted && 'text-gray-900',
                      !isCompleted && !isCurrent && 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="mt-1 text-xs text-gray-400">
                      {step.description}
                    </div>
                  )}
                </div>
              </button>

              {/* Arrow connector for mobile */}
              {index < steps.length - 1 && (
                <ChevronRight className="hidden sm:block absolute top-4 right-0 w-5 h-5 text-gray-400 transform translate-x-1/2 -translate-y-1/2" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface StepIndicatorProps {
  current: number;
  total: number;
  className?: string;
}

export function StepIndicator({ current, total, className }: StepIndicatorProps) {
  const percentage = (current / total) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {current} of {total}
        </span>
        <span className="text-sm text-gray-500">{Math.round(percentage)}% complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}