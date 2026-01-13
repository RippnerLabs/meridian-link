"use client";

import { useState } from "react";
import { Wallet, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { WalletButton } from "@/components/solana/solana-provider";
import { EthereumWalletButton } from "@/components/ethereum/ethereum-wallet-button";
import { useBridgeDataAccess } from "./bridge-data-access";
import { useWallet } from "@solana/wallet-adapter-react";

// Import Web3 Icons
import { 
  NetworkEthereum, 
  NetworkSolana,
  TokenUSDC
} from "@web3icons/react";

interface WalletConnectionDrawerProps {
  children: React.ReactNode;
}

export function WalletConnectionDrawer({ children }: WalletConnectionDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Ethereum bridge functionality
  const { 
    isConnected: isEthConnected, 
    address: ethAddress, 
    chain: ethChain,
    tokenBalance,
    isBalanceLoading,
    balanceError,
    refetchBalance 
  } = useBridgeDataAccess();

  // Solana wallet
  const solWallet = useWallet();
  const { connected: isSolanaConnected, publicKey: solanaAddress } = solWallet;

  const getConnectionStatus = () => {
    if (isEthConnected && isSolanaConnected) {
      return { status: "connected", text: "Both Wallets Connected", color: "text-chart-4" };
    } else if (isEthConnected || isSolanaConnected) {
      return { status: "partial", text: "Partial Connection", color: "text-chart-2" };
    } else {
      return { status: "disconnected", text: "Connect Wallets", color: "text-foreground/60" };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
        <SheetContent side="right">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-base border-2 border-border bg-main">
                  <Wallet className="h-5 w-5 text-main-foreground" />
                </div>
                <div>
                  <SheetTitle>
                    Connect Wallets
                  </SheetTitle>
                  <SheetDescription>
                    Connect both chains to start bridging
                  </SheetDescription>
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center gap-2 mt-4">
                <div className={`h-3 w-3 rounded-full border-2 border-border ${
                  connectionStatus.status === "connected" ? "bg-chart-4" : 
                  connectionStatus.status === "partial" ? "bg-chart-2" : "bg-secondary-background"
                }`} />
                <span className={`text-sm font-base ${connectionStatus.color}`}>
                  {connectionStatus.text}
                </span>
              </div>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 py-6 space-y-6 overflow-y-auto">
              
              {/* Network Status */}
              <div className="text-center">
                <Badge className="bg-chart-4 text-main-foreground">
                  <Zap className="w-3 h-3 mr-1" />
                  {process.env.NEXT_PUBLIC_ETH_NETWORK === 'sepolia' ? 'Sepolia Testnet' : 'Hardhat Local'}
                </Badge>
              </div>

              {/* EVM Wallets Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <NetworkEthereum className="w-6 h-6" style={{ color: "#627EEA" }} />
                    <div>
                      <CardTitle className="text-base">EVM Chains</CardTitle>
                      <CardDescription className="text-sm">
                        Ethereum, Polygon, Arbitrum
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/70">Ethereum</span>
                    <EthereumWalletButton />
                  </div>
                  
                  {/* EVM Connection Status */}
                  {isEthConnected ? (
                    <div className="rounded-base border-2 border-chart-4 bg-chart-4/10 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-4" />
                        <span className="text-sm font-base text-chart-4">Connected</span>
                      </div>
                      <div className="text-xs text-foreground/60">
                        {ethAddress?.slice(0, 6)}...{ethAddress?.slice(-4)}
                      </div>
                      <div className="text-xs text-foreground/60">
                        Network: {ethChain?.name || 'Unknown'}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-foreground/30 rounded-full" />
                        <span className="text-sm text-foreground/60">Not Connected</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Solana Wallets Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <NetworkSolana className="w-6 h-6" style={{ color: "#9945FF" }} />
                    <div>
                      <CardTitle className="text-base">Solana</CardTitle>
                      <CardDescription className="text-sm">
                        Phantom, Solflare, Backpack
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/70">Solana</span>
                    <WalletButton />
                  </div>
                  
                  {/* Solana Connection Status */}
                  {isSolanaConnected ? (
                    <div className="rounded-base border-2 border-[#9945FF] bg-[#9945FF]/10 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#9945FF]" />
                        <span className="text-sm font-base text-[#9945FF]">Connected</span>
                      </div>
                      <div className="text-xs text-foreground/60">
                        {solanaAddress?.toString().slice(0, 6)}...{solanaAddress?.toString().slice(-4)}
                      </div>
                      <div className="text-xs text-foreground/60">
                        Network: Solana {process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.includes('devnet') ? 'Devnet' : 'Localnet'}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-base border-2 border-border bg-secondary-background p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-foreground/30 rounded-full" />
                        <span className="text-sm text-foreground/60">Not Connected</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Balance Information */}
              {isEthConnected && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TokenUSDC className="w-5 h-5" style={{ color: "#2775CA" }} />
                      <span>Token Balance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/70">BridgeToken (BrTN)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-base">
                          {isBalanceLoading ? 'Loading...' : `${tokenBalance} BrTN`}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="neutral"
                              size="icon"
                              onClick={() => refetchBalance()}
                              disabled={isBalanceLoading}
                              className="h-7 w-7"
                            >
                              <RefreshCw className={`h-3 w-3 ${isBalanceLoading ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Refresh balance</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    
                    {balanceError && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Balance Error</AlertTitle>
                        <AlertDescription className="text-xs">
                          Error loading balance. Check if contracts are deployed.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Network Warnings */}
              {process.env.NEXT_PUBLIC_ETH_NETWORK === 'sepolia' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Sepolia Network</AlertTitle>
                  <AlertDescription className="text-xs">
                    Make sure contracts are deployed to Sepolia and addresses are updated.
                  </AlertDescription>
                </Alert>
              )}

              {/* Quick Actions */}
              {(isEthConnected || isSolanaConnected) && (
                <div className="space-y-3">
                  <div className="h-[3px] bg-border" />
                  <div className="text-sm text-foreground/60 font-base">Quick Actions</div>
                  <div className="grid grid-cols-1 gap-2">
                    {isEthConnected && isSolanaConnected && (
                      <Button
                        onClick={() => setIsOpen(false)}
                        className="w-full"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Start Bridging
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t-4 border-border">
              <div className="text-xs text-foreground/50 text-center">
                Connect both wallets to enable cross-chain transfers
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
