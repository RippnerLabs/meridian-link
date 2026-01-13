"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { SearchableSelect, SearchableItem } from "../ui/select-menu";
import { WalletButton as SolWalletButton } from "../solana/solana-provider";
import { EthereumWalletButton } from "../ethereum/ethereum-wallet-button";
import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import useBridgeTokenBalance from "../bridge/use-bridge-token-balance";
import { useWriteContract } from "wagmi";
import BridgeTokenABI from "@/contracts/BridgeToken.json";
import { parseUnits } from "viem";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getMint, createMintToInstruction } from "@solana/spl-token";
import { NetworkEthereum, NetworkSolana, TokenUSDC } from "@web3icons/react";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Droplet, Coins, Sparkles, RefreshCw } from "lucide-react";

type ChainValue = "ethereum" | "solana";

const CHAINS: SearchableItem[] = [
  { value: "ethereum", label: "Ethereum", Icon: NetworkEthereum as any },
  { value: "solana", label: "Solana", Icon: NetworkSolana as any },
];

// Tokens per chain
const TOKENS_BY_CHAIN: Record<ChainValue, SearchableItem[]> = {
  ethereum: [
    { value: process.env.NEXT_PUBLIC_ETH_TOKEN_SMART_CONTRACT_ADDRESS || "", label: "BridgeToken", Icon: TokenUSDC as any },
  ],
  solana: [
    { value: process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR || "", label: "BridgeToken (SPL)", Icon: TokenUSDC as any },
  ],
};

export default function FaucetUI() {
  const [chain, setChain] = useState<ChainValue>("ethereum");
  const [token, setToken] = useState<string>(TOKENS_BY_CHAIN["ethereum"].find(t => !!t.value)?.value || "");
  const [isRequesting, setIsRequesting] = useState(false);

  // Wallets
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  const { publicKey: solPk, connected: isSolConnected } = useWallet();

  // Unified balance for selected chain
  const { balance, isLoading, refetch } = useBridgeTokenBalance({ fromChain: chain, token });

  // Update token list when chain changes
  useEffect(() => {
    const list = TOKENS_BY_CHAIN[chain].filter(t => !!t.value);
    setToken(list[0]?.value || "");
  }, [chain]);

  // ETH faucet – call server API to mint ERC-20 to user using owner signer
  const requestEthAirdrop = async () => {
    try {
      if (!isEthConnected || !ethAddress) {
        toast.error("Connect Ethereum wallet");
        return;
      }
      const tokenAddr = token as `0x${string}`;
      if (!tokenAddr || tokenAddr === "0x0000000000000000000000000000000000000000") {
        toast.error("Invalid token address");
        return;
      }
      setIsRequesting(true);
      const res = await fetch('/api/faucet/ethereum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: ethAddress, token: tokenAddr, amount: 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Mint failed');
      toast.success(`Airdrop sent: ${String(data.hash || '').slice(0,8)}…`);
      setTimeout(refetch, 1500);
    } catch (err: any) {
      console.error(err);
      toast.error("Ethereum airdrop failed");
    } finally {
      setIsRequesting(false);
    }
  };

  // SOL faucet – call server API to mint SPL to user's ATA using backend signer
  const requestSolAirdrop = async () => {
    try {
      if (!isSolConnected || !solPk) {
        toast.error("Connect Solana wallet");
        return;
      }
      const mintAddr = token;
      if (!mintAddr) {
        toast.error("Invalid mint address");
        return;
      }
      setIsRequesting(true);
      const res = await fetch('/api/faucet/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: solPk.toBase58(), mint: mintAddr, amount: 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Mint failed');
      toast.success(`Airdrop sent: ${data.signature?.slice(0,8)}…`);
      setTimeout(refetch, 1500);
    } catch (err: any) {
      console.error(err);
      toast.error("Solana airdrop failed");
    } finally {
      setIsRequesting(false);
    }
  };

  const requestAirdrop = async () => {
    if (chain === "ethereum") return requestEthAirdrop();
    return requestSolAirdrop();
  };

  const walletConnected = chain === "ethereum" ? isEthConnected : isSolConnected;

  return (
    <div className="min-h-[80vh] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge className="bg-chart-1 text-white">
            <Droplet className="w-3 h-3 mr-1" />
            Testnet Faucet
          </Badge>
          <h1 className="text-4xl font-heading text-foreground">Get Test Tokens</h1>
          <p className="text-foreground/60">Request tokens to test the bridge on testnet</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-main" />
              Request Tokens
            </CardTitle>
            <CardDescription>Select your chain and token to receive an airdrop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chain selector */}
            <div className="space-y-2">
              <Label>Chain</Label>
              <SearchableSelect
                items={CHAINS}
                value={chain}
                onChange={(v) => setChain(v as ChainValue)}
                placeholder="Select chain"
              />
            </div>

            {/* Token selector per chain */}
            <div className="space-y-2">
              <Label>Token</Label>
              <SearchableSelect
                items={TOKENS_BY_CHAIN[chain].filter(t => !!t.value)}
                value={token}
                onChange={setToken}
                placeholder="Select token"
              />
            </div>

            {/* Balance Display */}
            <div className="rounded-base border-2 border-border bg-secondary-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Current Balance</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-heading">
                    {isLoading ? "Loading…" : `${parseFloat(balance.toString()).toFixed(4)}`}
                  </span>
                  <Button 
                    variant="neutral" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-foreground/50">
                You will receive 100 tokens per request
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-base border-2 border-border bg-secondary-background p-3">
                <span className="text-sm text-foreground/70">Connect Wallet</span>
                {chain === "ethereum" ? <EthereumWalletButton /> : <SolWalletButton />}
              </div>
              
              <Button
                className="w-full h-12 text-lg"
                onClick={requestAirdrop}
                disabled={!walletConnected || isRequesting}
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Requesting...
                  </>
                ) : walletConnected ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Request Airdrop
                  </>
                ) : (
                  "Connect Wallet First"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-secondary-background">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-base border-2 border-border bg-main">
                <Droplet className="w-4 h-4 text-main-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-heading">How it works</p>
                <p className="text-xs text-foreground/60">
                  This faucet provides test tokens for experimenting with the bridge. 
                  Tokens have no real value and are only for testing purposes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
