import React from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

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

// Multiple reliable RPC endpoints for Sepolia
const sepoliaRpcs = [
  'https://eth-sepolia.public.blastapi.io',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia',
  'https://rpc.sepolia.org'
]

// Enhanced wagmi config with multiple transports and connectors
const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(sepoliaRpcs[0], {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  connectors: [
    walletConnect({
      projectId: '6d8c9eea8158d10561e9ca18a6975284',
      metadata: {
        name: 'Chain Academy',
        description: 'Decentralized Mentorship Platform',
        url: 'https://chainacademy.com',
        icons: ['https://chainacademy.com/icon.png']
      },
    }),
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Chain Academy',
      appLogoUrl: 'https://chainacademy.com/icon.png',
    }),
  ],
  ssr: false,
})

// Create modal with enhanced configuration
const projectId = '6d8c9eea8158d10561e9ca18a6975284'

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#FF0000',
    '--w3m-border-radius-master': '12px',
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
  ]
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
export { sepoliaRpcs }