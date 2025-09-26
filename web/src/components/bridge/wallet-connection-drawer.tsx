"use client";

import { useState } from "react";
import { Wallet, X, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, Zap } from "lucide-react";
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
  SheetClose
} from "@/components/ui/sheet";
import { 
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
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
      return { status: "connected", text: "Both Wallets Connected", color: "text-green-400" };
    } else if (isEthConnected || isSolanaConnected) {
      return { status: "partial", text: "Partial Connection", color: "text-amber-400" };
    } else {
      return { status: "disconnected", text: "Connect Wallets", color: "text-gray-400" };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md bg-gray-900/95 backdrop-blur border-gray-800 text-white p-0 overflow-y-auto"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-800 rounded-lg">
                    <Wallet className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <SheetTitle className="text-white text-lg font-semibold">
                      Connect Wallets
                    </SheetTitle>
                    <SheetDescription className="text-gray-400 text-sm">
                      Connect both chains to start bridging
                    </SheetDescription>
                  </div>
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center space-x-2 mt-2">
                <div className={`h-2 w-2 rounded-full ${
                  connectionStatus.status === "connected" ? "bg-green-400" : 
                  connectionStatus.status === "partial" ? "bg-amber-400" : "bg-gray-500"
                }`} />
                <span className={`text-sm ${connectionStatus.color}`}>
                  {connectionStatus.text}
                </span>
              </div>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 px-6 py-4 space-y-6">
              
              {/* Network Status */}
              <div className="text-center">
                <Badge variant="outline" className="bg-green-900/20 border-green-500 text-green-400">
                  <Zap className="w-3 h-3 mr-1" />
                  {process.env.NEXT_PUBLIC_ETH_NETWORK === 'sepolia' ? 'Sepolia Testnet' : 'Hardhat Local'}
                </Badge>
              </div>

              {/* EVM Wallets Section */}
              <Card className="bg-gray-800/50 border-gray-700 text-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <NetworkEthereum className="w-6 h-6" style={{ color: "#627EEA" }} />
                    <div>
                      <CardTitle className="text-base">EVM Chains</CardTitle>
                      <CardDescription className="text-gray-400 text-sm">
                        Ethereum, Polygon, Arbitrum
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Ethereum</span>
                    <EthereumWalletButton />
                  </div>
                  
                  {/* EVM Connection Status */}
                  {isEthConnected ? (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Connected</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {ethAddress?.slice(0, 6)}...{ethAddress?.slice(-4)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Network: {ethChain?.name || 'Unknown'}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-gray-500 rounded-full" />
                        <span className="text-sm text-gray-400">Not Connected</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Solana Wallets Section */}
              <Card className="bg-gray-800/50 border-gray-700 text-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <NetworkSolana className="w-6 h-6" style={{ color: "#9945FF" }} />
                    <div>
                      <CardTitle className="text-base">Solana</CardTitle>
                      <CardDescription className="text-gray-400 text-sm">
                        Phantom, Solflare, Backpack
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Solana</span>
                    <WalletButton />
                  </div>
                  
                  {/* Solana Connection Status */}
                  {isSolanaConnected ? (
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-400">Connected</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {solanaAddress?.toString().slice(0, 6)}...{solanaAddress?.toString().slice(-4)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Network: Solana {process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT?.includes('devnet') ? 'Devnet' : 'Localnet'}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-gray-500 rounded-full" />
                        <span className="text-sm text-gray-400">Not Connected</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Balance Information */}
              {isEthConnected && (
                <Card className="bg-gray-800/30 border-gray-700 text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <TokenUSDC className="w-5 h-5" style={{ color: "#2775CA" }} />
                      <span>Token Balance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">BridgeToken (BrTN)</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">
                          {isBalanceLoading ? 'Loading...' : `${tokenBalance} BrTN`}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => refetchBalance()}
                              disabled={isBalanceLoading}
                              className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50"
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
                      <Alert className="bg-red-900/20 border-red-500/30">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="text-red-400">Balance Error</AlertTitle>
                        <AlertDescription className="text-xs text-red-300">
                          Error loading balance. Check if contracts are deployed.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Network Warnings */}
              {process.env.NEXT_PUBLIC_ETH_NETWORK === 'sepolia' && (
                <Alert className="bg-amber-900/20 border-amber-500/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-amber-400">Sepolia Network</AlertTitle>
                  <AlertDescription className="text-xs text-amber-300">
                    Make sure contracts are deployed to Sepolia and addresses are updated.
                  </AlertDescription>
                </Alert>
              )}

              {/* Quick Actions */}
              {(isEthConnected || isSolanaConnected) && (
                <div className="space-y-3">
                  <Separator className="bg-gray-700" />
                  <div className="text-sm text-gray-400">Quick Actions</div>
                  <div className="grid grid-cols-1 gap-2">
                    {isEthConnected && isSolanaConnected && (
                      <Button
                        onClick={() => setIsOpen(false)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-center"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Start Bridging
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-800">
              <div className="text-xs text-gray-500 text-center">
                Connect both wallets to enable cross-chain transfers
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
} 