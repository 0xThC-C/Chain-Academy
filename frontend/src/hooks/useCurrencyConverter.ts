import { useState, useEffect, useCallback } from 'react';

interface ConversionRates {
  ETH_USD: number;
  USDC_USD: number;
  lastUpdated: number;
}

interface ConvertedPrice {
  originalAmount: number;
  originalToken: 'ETH' | 'USDC';
  ethAmount: number;
  usdcAmount: number;
  usdValue: number;
  displayPrice: string;
  equivalentPrice: string;
}

export const useCurrencyConverter = () => {
  const [rates, setRates] = useState<ConversionRates>({
    ETH_USD: 3500, // Default fallback
    USDC_USD: 1,
    lastUpdated: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock API call - In production, use real price API
  const fetchRates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // MOCK: Simulate API call with realistic prices
      // In production, replace with CoinGecko, CoinMarketCap, or Chainlink
      const mockRates = {
        ETH_USD: 3500 + Math.random() * 200 - 100, // $3400-3600
        USDC_USD: 1.0 + Math.random() * 0.02 - 0.01, // $0.99-1.01
        lastUpdated: Date.now()
      };

      setRates(mockRates);
      
      // Cache for 5 minutes
      localStorage.setItem('currencyRates', JSON.stringify(mockRates));
      
    } catch (err) {
      console.error('Failed to fetch currency rates:', err);
      setError('Failed to update exchange rates');
      
      // Try to load from cache
      const cached = localStorage.getItem('currencyRates');
      if (cached) {
        const cachedRates = JSON.parse(cached);
        if (Date.now() - cachedRates.lastUpdated < 30 * 60 * 1000) { // 30 min cache
          setRates(cachedRates);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convert between currencies
  const convertPrice = useCallback((
    amount: number, 
    fromToken: 'ETH' | 'USDC',
    toToken: 'ETH' | 'USDC'
  ): number => {
    if (fromToken === toToken) return amount;
    
    const fromUSD = fromToken === 'ETH' ? amount * rates.ETH_USD : amount * rates.USDC_USD;
    const toAmount = toToken === 'ETH' ? fromUSD / rates.ETH_USD : fromUSD / rates.USDC_USD;
    
    return parseFloat(toAmount.toFixed(toToken === 'ETH' ? 6 : 2));
  }, [rates]);

  // Format price with proper token display
  const formatPrice = useCallback((amount: number, token: 'ETH' | 'USDC'): ConvertedPrice => {
    const usdValue = token === 'ETH' ? amount * rates.ETH_USD : amount * rates.USDC_USD;
    const ethAmount = token === 'ETH' ? amount : convertPrice(amount, 'USDC', 'ETH');
    const usdcAmount = token === 'USDC' ? amount : convertPrice(amount, 'ETH', 'USDC');

    const displayPrice = token === 'ETH' 
      ? `${amount.toFixed(4)} ETH`
      : `$${amount.toFixed(2)} USDC`;

    const equivalentPrice = token === 'ETH'
      ? `~$${usdValue.toFixed(2)}`
      : `~${ethAmount.toFixed(4)} ETH`;

    return {
      originalAmount: amount,
      originalToken: token,
      ethAmount,
      usdcAmount,
      usdValue,
      displayPrice,
      equivalentPrice
    };
  }, [rates, convertPrice]);

  // Get payment options for a mentor's price
  const getPaymentOptions = useCallback((
    mentorPrice: number,
    mentorToken: 'ETH' | 'USDC'
  ) => {
    const converted = formatPrice(mentorPrice, mentorToken);
    
    return {
      primary: {
        amount: converted.originalAmount,
        token: mentorToken,
        display: converted.displayPrice,
        contractAmount: mentorToken === 'ETH' 
          ? (converted.originalAmount * 1e18).toString() // Wei
          : (converted.originalAmount * 1e6).toString()   // USDC decimals
      },
      alternative: {
        amount: mentorToken === 'ETH' ? converted.usdcAmount : converted.ethAmount,
        token: mentorToken === 'ETH' ? 'USDC' as const : 'ETH' as const,
        display: mentorToken === 'ETH' 
          ? `$${converted.usdcAmount.toFixed(2)} USDC`
          : `${converted.ethAmount.toFixed(4)} ETH`,
        contractAmount: mentorToken === 'ETH'
          ? (converted.usdcAmount * 1e6).toString()   // USDC decimals
          : (converted.ethAmount * 1e18).toString()   // Wei
      },
      usdValue: converted.usdValue
    };
  }, [formatPrice]);

  // Check if rates are stale (older than 5 minutes)
  const areRatesStale = useCallback(() => {
    return Date.now() - rates.lastUpdated > 5 * 60 * 1000;
  }, [rates.lastUpdated]);

  // Initialize and fetch rates
  useEffect(() => {
    // Load from cache first
    const cached = localStorage.getItem('currencyRates');
    if (cached) {
      try {
        const cachedRates = JSON.parse(cached);
        if (Date.now() - cachedRates.lastUpdated < 30 * 60 * 1000) {
          setRates(cachedRates);
        }
      } catch (error) {
        console.warn('Failed to parse cached rates');
      }
    }

    // Fetch fresh rates
    fetchRates();

    // Set up periodic refresh (every 5 minutes)
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  return {
    rates,
    isLoading,
    error,
    convertPrice,
    formatPrice,
    getPaymentOptions,
    areRatesStale,
    refreshRates: fetchRates
  };
};

export default useCurrencyConverter;