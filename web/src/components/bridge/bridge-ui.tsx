"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { SidebarUI } from "../sidebar/sidebar-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Zap, ArrowUpDown, Settings, ChevronDown, Info, Copy, ExternalLink, RefreshCw, Wallet } from "lucide-react";
import { WalletButton } from "../solana/solana-provider";
import { EthereumWalletButton } from "../ethereum/ethereum-wallet-button";
import { useBridgeDataAccess } from "./bridge-data-access";
import useBridgeTokenBalance from "./use-bridge-token-balance";
import { WalletConnectionDrawer } from "./wallet-connection-drawer";
import { useState, useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../ui/tooltip";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "../ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import useSolanaTransferMonitor, { depositToSolanaBridge } from "./bridge-solana-data-access";

// Import Web3 Icons
import { 
  NetworkEthereum, 
  NetworkSolana, 
  NetworkPolygon, 
  NetworkArbitrumOne,
  TokenUSDC,
  TokenETH,
  TokenSOL
} from "@web3icons/react";

// Helper constants with proper Web3 icons
const CHAINS = [
  { 
    value: "ethereum", 
    label: "Ethereum (Sepolia)", 
    icon: NetworkEthereum, 
    color: "bg-blue-500",
    iconColor: "#627EEA" 
  },
  { 
    value: "solana", 
    label: "Solana (Localnet)", 
    icon: NetworkSolana, 
    color: "bg-purple-500",
    iconColor: "#9945FF" 
  },
];

const TOKENS = [
  { 
    value: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512", 
    label: "BridgeToken", 
    balance: "0", 
    icon: TokenUSDC,
    iconColor: "#2775CA"
  },
];

const STEP_LABELS = [
  "Approve",
  "Generate Proof", 
  "Relay Deposit",
  "Receive on Dest",
  "Complete",
];

function TokenSelector({ 
  value, 
  onValueChange, 
  label, 
  showBalance = false,
  balance = '0'
}: { 
  value: string; 
  onValueChange: (value: string) => void; 
  label: string; 
  showBalance?: boolean;
  balance?: string;
}) {
  const selectedToken = TOKENS.find(t => t.value === value);
  
  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-gray-400">{label}</label>}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white hover:bg-gray-800 transition-colors">
          <SelectValue placeholder="Select token" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {TOKENS.map((token) => {
            const IconComponent = token.icon;
            return (
              <SelectItem key={token.value} value={token.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <IconComponent 
                      className="w-5 h-5" 
                      style={{ color: token.iconColor }}
                    />
                    <span>{token.label}</span>
                  </div>
                  {showBalance && (
                    <span className="text-gray-400 text-xs ml-2">
                      {token.balance}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {showBalance && (
        <div className="text-right">
          <span className="text-xs text-gray-400">
            Balance: {parseFloat(balance).toFixed(2)} {selectedToken?.label || 'BridgeToken'}
          </span>
        </div>
      )}
    </div>
  );
}

function ChainSelector({ 
  value, 
  onValueChange, 
  label 
}: { 
  value: string; 
  onValueChange: (value: string) => void; 
  label: string; 
}) {
  const selectedChain = CHAINS.find(c => c.value === value);
  
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white hover:bg-gray-800 transition-colors">
          <SelectValue placeholder="Select network" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {CHAINS.map((chain) => {
            const IconComponent = chain.icon;
            return (
              <SelectItem key={chain.value} value={chain.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${chain.color}`}></div>
                  <IconComponent 
                    className="w-5 h-5" 
                    style={{ color: chain.iconColor }}
                  />
                  <span>{chain.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function MainContent() {
  const [fromChain, setFromChain] = useState<"ethereum" | "solana">("ethereum");
  const [toChain, setToChain] = useState<"ethereum" | "solana">("solana");
  const [token, setToken] = useState<string>("BridgeToken");
  const [amount, setAmount] = useState<string>("");
  const [customAddress, setCustomAddress] = useState<string>("");
  const [showCustomAddress, setShowCustomAddress] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [expectedAmountLamports, setExpectedAmountLamports] = useState<bigint>(0n);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Ethereum bridge functionality
  const { 
    isConnected: isEthConnected, 
    address: ethAddress, 
    chain: ethChain,
    isTransferring, 
    executeBridgeTransfer,
    refetchBalance: refetchEthBalance 
  } = useBridgeDataAccess();

  // Unified token balance based on selected fromChain
  const { balance: unifiedBalance, isLoading: isBalanceLoading, error: balanceError, refetch } = useBridgeTokenBalance({ fromChain });

  // Solana wallet
  const solWallet = useWallet();
  const { connected: isSolanaConnected, publicKey: solanaAddress } = solWallet;

  const selectedToken = TOKENS.find(t => t.value === token);
  const selectedFromChain = CHAINS.find(c => c.value === fromChain);
  const selectedToChain = CHAINS.find(c => c.value === toChain);
  const estimatedValue = amount ? (parseFloat(amount) * 1.0001).toFixed(4) : "0.00";

  // Refresh balance when wallet connects
  useEffect(() => {
    if (fromChain === 'ethereum' && isEthConnected && ethAddress) {
      refetch();
    }
  }, [fromChain, isEthConnected, ethAddress, refetch]);

  // Update token balance display
  useEffect(() => {
    if (selectedToken && unifiedBalance) {
      selectedToken.balance = parseFloat(unifiedBalance.toString()).toFixed(4);
    }
  }, [unifiedBalance, selectedToken]);

  // 👀  monitor Solana balance when waiting for relay
  const solMonitor = useSolanaTransferMonitor({
    recipient: (solanaAddress?.toString() || customAddress) ?? "",
    mint: process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR ?? "",
    expectedAmount: expectedAmountLamports,
    pollIntervalMs: 5000,
  });

  useEffect(() => {
    if(currentStep === 3 && solMonitor.hasReceived) {
      toast.success("Tokens received on Solana! 🎉");
    }
  }, [currentStep, solMonitor.hasReceived]);

  const startTransfer = async () => {
    if (!amount) {
      toast.error("Enter amount");
      return;
    }

    if (!isEthConnected) {
      toast.error("Please connect your Ethereum wallet");
      return;
    }

    if (!isSolanaConnected) {
      toast.error("Please connect your Solana wallet");
      return;
    }

    const destChainAddr = solanaAddress?.toString() || customAddress;
    if (!destChainAddr) {
      toast.error("Please provide a Solana destination address");
      return;
    }
    console.log("process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR", process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR);
    if(!process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR) {
      throw new Error("Solana bridge token not present");
    }

    // BridgeToken has 2 decimals
    const lamports = BigInt(Math.floor(Number(amount) * 10 ** 2));

    if(fromChain === 'ethereum' && toChain === 'solana') {
      // ---------- ETH ➜ SOL flow (existing) ----------
      setExpectedAmountLamports(lamports);
      await executeBridgeTransfer({
        amount,
        destChainAddr,
        destChainMintAddr: process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR
      });
    } else if(fromChain === 'solana' && toChain === 'ethereum') {
      // ---------- SOL -> ETH flow (new) ----------
      if(!isSolanaConnected) {
        toast.error('Connect Solana wallet');
        return;
      }

      try {
        setCurrentStep(1); // Deposit on Solana
        const solTxSig = await depositToSolanaBridge({
          amountLamports: lamports,
          mint: process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR ?? '',
          bridgeProgramId: process.env.NEXT_PUBLIC_SOLANA_BRIDGE_PROGRAM_ID ?? '',
          destChainId: ethChain?.id || 31337,
          destChainAddr: ethAddress ?? '',
          destChainMintAddr: selectedToken?.value ?? '',
          wallet: solWallet,
        });
        toast.success(`Solana deposit tx sent: ${solTxSig.slice(0,6)}…`);

        // Step 2 – Wait for relayer to process withdrawal
        setCurrentStep(2);
        toast.info('Waiting for relayer to execute withdrawal on Ethereum…');

        // poll ERC20 balance until increased
        const startBal = parseFloat(unifiedBalance.toString());
        let attempts = 0;
        const MAX_ATTEMPTS = 360; // ~30 min at 5s intervals
        while(attempts < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 5000));
          await refetch();
          const newBal = parseFloat((selectedToken?.balance ?? '0'));
          if(newBal > startBal) {
            setCurrentStep(3);
            toast.success('Tokens received on Ethereum! 🎉');
            break;
          }
          attempts++;
        }

        if(attempts >= MAX_ATTEMPTS) {
          toast.error('Timed-out waiting for withdrawal');
          setCurrentStep(0);
        }
      } catch(err:any) {
        console.error(err);
        toast.error('Solana deposit failed');
        setCurrentStep(0);
      }
    }
  };

  const swapChains = () => {
    const temp = fromChain;
    setFromChain(toChain);
    setToChain(temp);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen text-white">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md space-y-6">
            
            {/* Network Status */}
            <div className="text-center">
              <Badge variant="outline" className="bg-green-900/20 border-green-500 text-green-400">
                <Zap className="w-3 h-3 mr-1" />
                {process.env.NEXT_PUBLIC_ETH_NETWORK === 'sepolia' ? 'Sepolia Testnet' : 'Hardhat Local'}
              </Badge>
            </div>
            
            {/* Connection Warning */}
            {(!isEthConnected || !isSolanaConnected) && (
              <Alert className="bg-blue-900/20 border-blue-500/30">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-blue-400">Wallet Connection Required</AlertTitle>
                <AlertDescription className="text-xs text-blue-300">
                  {!isEthConnected && !isSolanaConnected 
                    ? "Connect both Ethereum and Solana wallets to start bridging"
                    : !isEthConnected 
                    ? "Connect your Ethereum wallet to continue"
                    : "Connect your Solana wallet to continue"
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Main Transfer Card */}
            <Card className="bg-gray-900/80 backdrop-blur border-gray-800 text-white shadow-2xl">
              <CardContent className="p-6 space-y-6">
                
                {/* From Section */}
                <div className="space-y-4">
                  <ChainSelector 
                    value={fromChain} 
                    onValueChange={(v) => setFromChain(v as "ethereum" | "solana")} 
                    label="From" 
                  />
                  
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white text-2xl h-16 pr-20 focus:bg-gray-800 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 text-xs hover:bg-blue-900/20 transition-colors"
                            onClick={() => setAmount(unifiedBalance.toString())}
                            disabled={!unifiedBalance || parseFloat(unifiedBalance.toString()) === 0}
                          >
                            Max
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Use maximum balance</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  
                  <TokenSelector 
                    value={token} 
                    onValueChange={setToken} 
                    label=""
                    showBalance={true}
                    balance={unifiedBalance.toString()}
                  />
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={swapChains}
                        className="rounded-full bg-gray-800/50 hover:bg-gray-700 border border-gray-600 transition-all duration-200 hover:scale-105"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Swap chains</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* To Section */}
                <div className="space-y-4">
                  <ChainSelector 
                    value={toChain} 
                    onValueChange={(v) => setToChain(v as "ethereum" | "solana")} 
                    label="To" 
                  />
                  
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={estimatedValue}
                      disabled
                      className="bg-gray-800/30 border-gray-700 text-white text-2xl h-16 opacity-75"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Est. Value: -</span>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-400">Custom Address</label>
                      <button
                        onClick={() => setShowCustomAddress(!showCustomAddress)}
                        className={`w-8 h-4 rounded-full relative transition-all duration-200 ease-in-out ${
                          showCustomAddress ? 'bg-blue-600' : 'bg-gray-700'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ease-in-out ${
                            showCustomAddress ? 'transform translate-x-4' : 'transform translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  {showCustomAddress && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter custom address"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        className="bg-gray-800/50 border-gray-700 text-white focus:bg-gray-800 transition-colors"
                      />
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <Copy className="h-3 w-3" />
                        <span>Paste address</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Route Info */}
                {amount && (
                  <div className="bg-gray-800/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Route</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {selectedFromChain && (
                            <selectedFromChain.icon 
                              className="w-4 h-4" 
                              style={{ color: selectedFromChain.iconColor }}
                            />
                          )}
                          <span className="text-xs">{selectedFromChain?.label}</span>
                        </div>
                        <ArrowUpDown className="h-3 w-3 text-gray-500" />
                        <div className="flex items-center space-x-1">
                          {selectedToChain && (
                            <selectedToChain.icon 
                              className="w-4 h-4" 
                              style={{ color: selectedToChain.iconColor }}
                            />
                          )}
                          <span className="text-xs">{selectedToChain?.label}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Est. time</span>
                      <span className="text-xs">~2-3 minutes</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Fee</span>
                      <span className="text-xs">~$0.50</span>
                    </div>
                  </div>
                )}

                {/* Transfer Button */}
                {(!isEthConnected || !isSolanaConnected) ? (
                  <WalletConnectionDrawer>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium transition-all duration-200"
                    >
                      <Wallet className="h-5 w-5 mr-2" />
                      {!isEthConnected && !isSolanaConnected 
                        ? "Connect Wallets"
                        : !isEthConnected 
                        ? "Connect Ethereum Wallet"
                        : "Connect Solana Wallet"
                      }
                    </Button>
                  </WalletConnectionDrawer>
                ) : (
                  <Button
                    onClick={startTransfer}
                    disabled={!amount || isTransferring}
                    className="w-full bg-gray-600 hover:bg-gray-500 text-white h-12 text-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTransferring 
                      ? "Processing..." 
                      : !amount 
                      ? "Enter Amount" 
                      : "Transfer"}
                  </Button>
                )}

                {/* Progress Bar */}
                {isTransferring && (
                  <div className="space-y-2">
                    <Progress value={(currentStep / STEP_LABELS.length) * 100} className="bg-gray-800" />
                    <p className="text-xs text-gray-400 text-center">
                      {currentStep > 0 ? STEP_LABELS[currentStep - 1] : "Preparing..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transfer Mode Buttons */}
            <div className="flex justify-center space-x-4">
              <Button
              variant="outline"
                className="bg-teal-900/20 border-teal-500 text-teal-400 hover:bg-teal-900/30 transition-colors"
              >
                ✓ Simple Transfer
              </Button>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
              >
                Advanced Transfer
              </Button>
            </div>

            {/* Info Banner */}
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-900/20 border border-blue-500/30 rounded-full px-4 py-2 hover:bg-blue-900/30 transition-colors cursor-pointer">
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">NEW</span>
                <span className="text-blue-400 text-sm">Learn more</span>
                <ExternalLink className="h-4 w-4 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function BridgeUI() {
  return (
    <MainContent />
  );
}