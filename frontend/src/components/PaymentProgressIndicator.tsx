import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/solid';
import {
  ClockIcon as ClockOutlineIcon
} from '@heroicons/react/24/outline';

interface PaymentStep {
  amount: number;
  released: boolean;
  timestamp?: number;
  description: string;
  trigger: string;
}

interface PaymentProgressIndicatorProps {
  totalAmount: number;
  steps: PaymentStep[];
  currentStep: number;
  className?: string;
  showDetails?: boolean;
}

const PaymentProgressIndicator: React.FC<PaymentProgressIndicatorProps> = ({
  totalAmount,
  steps,
  currentStep,
  className = '',
  showDetails = true
}) => {
  const { isDarkMode } = useTheme();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStepIcon = (stepIndex: number, step: PaymentStep) => {
    const isCompleted = step.released;
    const isCurrent = stepIndex === currentStep;

    if (isCompleted) {
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    } else if (isCurrent) {
      return <ClockIcon className="h-6 w-6 text-yellow-500" />;
    } else {
      return <LockClosedIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStepStatus = (stepIndex: number, step: PaymentStep) => {
    if (step.released) return 'Completed';
    if (stepIndex === currentStep) return 'In Progress';
    if (stepIndex < currentStep) return 'Pending Release';
    return 'Locked';
  };

  const getStepColorClass = (stepIndex: number, step: PaymentStep) => {
    if (step.released) {
      return isDarkMode ? 'text-green-400' : 'text-green-600';
    } else if (stepIndex === currentStep) {
      return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return isDarkMode ? 'text-gray-400' : 'text-gray-500';
    }
  };

  const totalReleased = steps.reduce((sum, step) => sum + (step.released ? step.amount : 0), 0);
  const percentageReleased = (totalReleased / totalAmount) * 100;

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CurrencyDollarIcon className="h-5 w-5 text-primary-red" />
          <h3 className={`text-lg font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Payment Progress
          </h3>
        </div>
        <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {formatAmount(totalReleased)} / {formatAmount(totalAmount)} released
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3`}>
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentageReleased}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {percentageReleased.toFixed(1)}% released
          </span>
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {(100 - percentageReleased).toFixed(1)}% remaining
          </span>
        </div>
      </div>

      {/* Payment Steps */}
      {showDetails && (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              {/* Step Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(index, step)}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${getStepColorClass(index, step)}`}>
                      Step {index + 1}: {step.description}
                    </p>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {step.trigger}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getStepColorClass(index, step)}`}>
                      {formatAmount(step.amount)}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {getStepStatus(index, step)}
                    </p>
                  </div>
                </div>

                {/* Timestamp if completed */}
                {step.released && step.timestamp && (
                  <p className={`text-xs mt-1 ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    Released at {formatTimestamp(step.timestamp)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className={`mt-4 p-3 rounded-lg border ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Total Payment Status
          </span>
          <div className="flex items-center space-x-2">
            {percentageReleased === 100 ? (
              <>
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-green-500 font-medium text-sm">Complete</span>
              </>
            ) : (
              <>
                <ClockOutlineIcon className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-500 font-medium text-sm">
                  {formatAmount(totalAmount - totalReleased)} remaining
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentProgressIndicator;