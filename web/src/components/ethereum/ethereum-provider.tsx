'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { sepolia, hardhat } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { ReactNode } from 'react';

// Get network configuration from environment
const ETH_NETWORK = process.env.NEXT_PUBLIC_ETH_NETWORK || 'hardhat';
const HARDHAT_URL = process.env.NEXT_PUBLIC_HARDHAT_URL || 'http://127.0.0.1:8545';
const SEPOLIA_URL = process.env.NEXT_PUBLIC_SEPOLIA_URL || 'https://eth-sepolia.g.alchemy.com/v2/O-KBwceOlsxuOPBkWbi49j0QARo3qjcq';

// Configure chains based on environment
const getChains = () => {
  if (ETH_NETWORK === 'sepolia') {
    return [sepolia, hardhat] as const;
  }
  return [hardhat, sepolia] as const;
};

const chains = getChains();

// Create wagmi config
const config = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [hardhat.id]: http(HARDHAT_URL),
    [sepolia.id]: http(SEPOLIA_URL),
  },
});

interface EthereumProviderProps {
  children: ReactNode;
}

export function EthereumProvider({ children }: EthereumProviderProps) {
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  );
}

export { config as wagmiConfig }; 