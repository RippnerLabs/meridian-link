'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Wallet, Zap } from 'lucide-react';

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
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          variant="outline"
          className="bg-blue-900/20 border-blue-500 text-blue-400 hover:bg-blue-900/30"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isPending ? 'Connecting...' : `Connect ${connector.name}`}
        </Button>
      ))}
    </div>
  );
} 