import React from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base, optimism, arbitrum, polygon } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { injected, coinbaseWallet } from 'wagmi/connectors'

// Enhanced query client with better configurations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: 1000,
    },
  },
})

// Enhanced wagmi config with L2 mainnet chains
const config = createConfig({
  chains: [base, optimism, arbitrum, polygon],
  transports: {
    [base.id]: http('https://mainnet.base.org', {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [optimism.id]: http('https://mainnet.optimism.io', {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc', {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [polygon.id]: http('https://polygon-rpc.com', {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Chain Academy V2',
      appLogoUrl: 'https://localhost:3000/logo192.png',
    }),
  ],
  ssr: false,
})

// Create modal with enhanced configuration
const projectId = 'a5e8f3c1d2b4e7f9a1c3d5e7f9b1c3d5'

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#FF0000',
    '--w3m-border-radius-master': '12px',
  },
  enableWalletConnect: false,
  enableInjected: true,
  enableCoinbase: true,
})

// Enhanced provider with error boundaries
export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export { config as wagmiConfig }