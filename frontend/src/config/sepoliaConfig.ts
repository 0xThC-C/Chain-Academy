import { http, fallback } from 'wagmi'
import { defineChain } from 'viem'

// RPCs testados e funcionais para browser (ordenados por velocidade - 2025-06-16)
const BROWSER_SAFE_RPCS = [
  'https://gateway.tenderly.co/public/sepolia',        // 235ms - Fastest & CORS-safe
  'https://sepolia.gateway.tenderly.co',               // 362ms - CORS-safe
  'https://ethereum-sepolia-rpc.publicnode.com',       // 540ms - Public, stable
  'https://eth-sepolia.public.blastapi.io',            // 639ms - Public RPC
  'https://1rpc.io/sepolia',                           // 823ms - 1RPC service
]

// Criar transports individuais com configuração otimizada para detecção de transação
const createSepoliaTransport = () => {
  console.log('🚀 Creating Sepolia transport optimized for transaction detection:', BROWSER_SAFE_RPCS)
  
  const transports = BROWSER_SAFE_RPCS.map((rpc, index) => {
    console.log(`📡 RPC ${index + 1}: ${rpc}`)
    return http(rpc, {
      batch: false, // Disable batching for faster individual requests
      fetchOptions: {
        signal: AbortSignal.timeout(5000), // Shorter timeout for faster failover
      },
      retryCount: 3, // More retries per RPC
      retryDelay: 500, // Shorter retry delay
      timeout: 5000, // Explicit timeout
    })
  })
  
  return fallback(transports, {
    rank: false, // Don't rank by latency, use in order
  })
}

// Sepolia chain com configuração otimizada
export const sepoliaCustom = defineChain({
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: BROWSER_SAFE_RPCS,
    },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
})

export { createSepoliaTransport, BROWSER_SAFE_RPCS }