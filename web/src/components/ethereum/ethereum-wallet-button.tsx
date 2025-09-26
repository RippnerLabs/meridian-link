'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Wallet, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function EthereumWalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="bg-blue-900/20 border-blue-500 text-blue-400">
          <Zap className="w-3 h-3 mr-1" />
          {chain?.name || 'Ethereum'}
        </Badge>
        <Button
          variant="outline"
          onClick={() => disconnect()}
          className="text-sm"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {(() => {
        // Build a clean, unique, prioritized list of connectors
        const hasMetaMask = connectors.some((c) =>
          c.name?.toLowerCase().includes('metamask')
        );

        // Exclude wallets that are primarily Solana-focused from the EVM list
        const disallowed = new Set([
          'Phantom',
          'Backpack',
          'Solflare',
          'Slope',
          'Sollet',
        ]);

        // Deduplicate by id/name and filter out disallowed
        const uniqueByKey = new Map<string, (typeof connectors)[number]>();
        for (const c of connectors) {
          const name = (c.name || 'Wallet').trim();
          if (disallowed.has(name)) continue;
          const key = `${c.id}:${name}`;
          if (!uniqueByKey.has(key)) uniqueByKey.set(key, c);
        }
        let availableConnectors = Array.from(uniqueByKey.values());

        // Hide generic Injected if a specific wallet like MetaMask is present
        if (hasMetaMask) {
          availableConnectors = availableConnectors.filter((c) => c.name !== 'Injected');
        }

        // Prioritize popular wallets first
        const priority = ['MetaMask', 'Coinbase Wallet', 'Brave Wallet', 'Uniswap Extension'];
        availableConnectors.sort((a, b) => {
          const ai = priority.indexOf(a.name);
          const bi = priority.indexOf(b.name);
          if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          return a.name.localeCompare(b.name);
        });

        if (availableConnectors.length <= 1) {
          const only = availableConnectors[0] ?? connectors[0];
          return (
            <Button
              key={only?.uid}
              onClick={() => only && connect({ connector: only })}
              disabled={isPending || !only}
              variant="outline"
              className="bg-blue-900/20 border-blue-500 text-blue-400 hover:bg-blue-900/30"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isPending ? 'Connecting...' : `Connect ${only?.name ?? 'Wallet'}`}
            </Button>
          );
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isPending}
                className="bg-blue-900/20 border-blue-500 text-blue-400 hover:bg-blue-900/30"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {isPending ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 text-white border-gray-700 min-w-[14rem]">
              {availableConnectors.map((connector) => (
                <DropdownMenuItem
                  key={connector.uid}
                  onSelect={(e) => {
                    e.preventDefault();
                    connect({ connector });
                  }}
                  className="cursor-pointer focus:bg-gray-700 focus:text-white text-gray-200"
                >
                  {connector.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })()}
    </div>
  );
} 