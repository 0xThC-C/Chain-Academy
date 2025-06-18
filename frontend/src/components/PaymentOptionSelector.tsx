import React, { useState } from 'react';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface PaymentOption {
  token: 'ETH' | 'USDC';
  amount: number;
  display: string;
  contractAmount: string;
  usdValue: number;
}

interface PaymentOptionSelectorProps {
  mentorPrice: number;
  mentorToken: 'ETH' | 'USDC';
  onPaymentOptionChange: (option: PaymentOption) => void;
  selectedOption?: 'ETH' | 'USDC';
}

const PaymentOptionSelector: React.FC<PaymentOptionSelectorProps> = ({
  mentorPrice,
  mentorToken,
  onPaymentOptionChange,
  selectedOption = mentorToken // Default to mentor's preferred token
}) => {
  const { getPaymentOptions, areRatesStale, refreshRates } = useCurrencyConverter();
  const [selectedPayment, setSelectedPayment] = useState<'ETH' | 'USDC'>(selectedOption);

  const paymentOptions = getPaymentOptions(mentorPrice, mentorToken);

  const handleOptionSelect = (token: 'ETH' | 'USDC') => {
    setSelectedPayment(token);
    
    const option = token === mentorToken ? paymentOptions.primary : paymentOptions.alternative;
    
    onPaymentOptionChange({
      token,
      amount: option.amount,
      display: option.display,
      contractAmount: option.contractAmount,
      usdValue: paymentOptions.usdValue
    });
  };

  // Auto-select on mount
  React.useEffect(() => {
    handleOptionSelect(selectedOption);
  }, [selectedOption, mentorPrice, mentorToken]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Choose Payment Method
        </h3>
        {areRatesStale() && (
          <button 
            onClick={refreshRates}
            className="text-sm text-yellow-600 hover:text-yellow-700 underline"
          >
            Update exchange rates
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Option (Mentor's Preferred) */}
        <div 
          className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
            selectedPayment === mentorToken
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
          }`}
          onClick={() => handleOptionSelect(mentorToken)}
        >
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
              Preferred
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedPayment === mentorToken
                ? 'border-red-500 bg-red-500'
                : 'border-gray-300'
            }`}>
              {selectedPayment === mentorToken && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-lg">
                  {paymentOptions.primary.display}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {mentorToken === 'ETH' 
                  ? `≈ $${paymentOptions.usdValue.toFixed(2)} USD`
                  : `≈ ${paymentOptions.alternative.amount.toFixed(4)} ETH`
                }
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                Mentor's preferred payment method
              </div>
            </div>
          </div>
        </div>

        {/* Alternative Option */}
        <div 
          className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
            selectedPayment !== mentorToken
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
          }`}
          onClick={() => handleOptionSelect(mentorToken === 'ETH' ? 'USDC' : 'ETH')}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedPayment !== mentorToken
                ? 'border-red-500 bg-red-500'
                : 'border-gray-300'
            }`}>
              {selectedPayment !== mentorToken && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-lg">
                  {paymentOptions.alternative.display}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ≈ ${paymentOptions.usdValue.toFixed(2)} USD
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                Alternative payment option
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full mt-0.5"></div>
          <div className="text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
              Live Exchange Rates
            </p>
            <p className="text-blue-600 dark:text-blue-400 text-xs">
              Both payment options are equivalent in USD value. The mentor set their price in {mentorToken}, 
              but you can pay with either token based on current exchange rates.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Payment Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          Payment Summary
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Payment method:</span>
            <span className="font-medium">{selectedPayment}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
            <span className="font-medium">
              {selectedPayment === mentorToken 
                ? paymentOptions.primary.display 
                : paymentOptions.alternative.display
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">USD Value:</span>
            <span className="font-medium">${paymentOptions.usdValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Platform fee (10%):</span>
            <span>${(paymentOptions.usdValue * 0.1).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Mentor receives:</span>
            <span>${(paymentOptions.usdValue * 0.9).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOptionSelector;