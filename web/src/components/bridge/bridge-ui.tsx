"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { SidebarUI } from "../sidebar/sidebar-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Zap, ArrowUpDown, Settings, ChevronDown, Info, Copy, ExternalLink } from "lucide-react";
import { WalletButton } from "../solana/solana-provider";
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

// Helper constants
const CHAINS = [
  { value: "ethereum", label: "Ethereum", icon: "🔷", color: "bg-blue-500" },
  { value: "solana", label: "Solana", icon: "🟣", color: "bg-purple-500" },
  { value: "polygon", label: "Polygon", icon: "🟪", color: "bg-purple-600" },
  { value: "arbitrum", label: "Arbitrum", icon: "🔵", color: "bg-blue-600" },
];

const TOKENS = [
  { value: "USDC", label: "USDC", balance: "1,234.56", icon: "💵" },
  { value: "ETH", label: "ETH", balance: "0.5432", icon: "⚡" },
  { value: "SOL", label: "SOL", balance: "100.25", icon: "☀️" },
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
  showBalance = false 
}: { 
  value: string; 
  onValueChange: (value: string) => void; 
  label: string; 
  showBalance?: boolean;
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
          {TOKENS.map((token) => (
            <SelectItem key={token.value} value={token.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <span>{token.icon}</span>
                  <span>{token.label}</span>
                </div>
                {showBalance && (
                  <span className="text-gray-400 text-xs ml-2">
                    {token.balance}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showBalance && selectedToken && (
        <div className="text-right">
          <span className="text-xs text-gray-400">
            Balance: {selectedToken.balance} {selectedToken.label}
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
          {CHAINS.map((chain) => (
            <SelectItem key={chain.value} value={chain.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${chain.color}`}></div>
                <span>{chain.icon}</span>
                <span>{chain.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MainContent() {
  const [fromChain, setFromChain] = useState<string>("ethereum");
  const [toChain, setToChain] = useState<string>("solana");
  const [token, setToken] = useState<string>("USDC");
  const [amount, setAmount] = useState<string>("");
  const [customAddress, setCustomAddress] = useState<string>("");
  const [showCustomAddress, setShowCustomAddress] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [isTransferring, setIsTransferring] = useState(false);

  const selectedToken = TOKENS.find(t => t.value === token);
  const selectedFromChain = CHAINS.find(c => c.value === fromChain);
  const selectedToChain = CHAINS.find(c => c.value === toChain);
  const estimatedValue = amount ? (parseFloat(amount) * 1.0001).toFixed(4) : "0.00";

  const startTransfer = () => {
    if (!amount) {
      toast.error("Enter amount");
      return;
    }

    setIsTransferring(true);
    let current = 0;
    setProgress(0);
    
    const interval = setInterval(() => {
      current += 1;
      setProgress((current / STEP_LABELS.length) * 100);
      if (current >= STEP_LABELS.length) {
        clearInterval(interval);
        setIsTransferring(false);
        toast.success("Transfer complete!");
      }
    }, 1500);
  };

  const swapChains = () => {
    const temp = fromChain;
    setFromChain(toChain);
    setToChain(temp);
  };

  return (
    <TooltipProvider>
      <div className="max-h-screen text-white">
        {/* Settings Button */}
        <div className="absolute top-4 right-4 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Advanced Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md space-y-6">
            
            {/* Main Transfer Card */}
            <Card className="bg-gray-900/80 backdrop-blur border-gray-800 text-white shadow-2xl">
              <CardContent className="p-6 space-y-6">
                
                {/* From Section */}
                <div className="space-y-4">
                  <ChainSelector 
                    value={fromChain} 
                    onValueChange={setFromChain} 
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
                            onClick={() => selectedToken && setAmount(selectedToken.balance.replace(',', ''))}
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
                    onValueChange={setToChain} 
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
                        <span className="text-xs">{selectedFromChain?.label}</span>
                        <ArrowUpDown className="h-3 w-3 text-gray-500" />
                        <span className="text-xs">{selectedToChain?.label}</span>
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
                <Button
                  onClick={startTransfer}
                  disabled={!amount || isTransferring}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-white h-12 text-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTransferring ? "Processing..." : amount ? "Transfer" : "Select network"}
                </Button>

                {/* Progress Bar */}
                {progress > 0 && (
                  <div className="space-y-2">
                    <Progress value={progress} className="bg-gray-800" />
                    <p className="text-xs text-gray-400 text-center">
                      {STEP_LABELS[Math.min(Math.floor((progress / 100) * STEP_LABELS.length), STEP_LABELS.length - 1)]}
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