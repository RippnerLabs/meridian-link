"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
    }
  };

  const requestAirdrop = async () => {
    if (chain === "ethereum") return requestEthAirdrop();
    return requestSolAirdrop();
  };

  const walletConnected = chain === "ethereum" ? isEthConnected : isSolConnected;

  return (
    <div className="min-h-[80vh] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        <Card className="bg-gray-900/80 backdrop-blur border-gray-800 text-white">
          <CardHeader>
            <CardTitle>Faucet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1/ Chain selector */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Chain</label>
              <SearchableSelect
                items={CHAINS}
                value={chain}
                onChange={(v) => setChain(v as ChainValue)}
                placeholder="Select chain"
              />
            </div>

            {/* 2/ Token selector per chain */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Token</label>
              <SearchableSelect
                items={TOKENS_BY_CHAIN[chain].filter(t => !!t.value)}
                value={token}
                onChange={setToken}
                placeholder="Select token"
              />
            </div>

            {/* 3/ Balance and Airdrop */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Balance</span>
                <span className="text-sm font-medium text-white">{isLoading ? "Loading…" : balance}</span>
              </div>
              <div className="flex items-center justify-between">
                {chain === "ethereum" ? <EthereumWalletButton /> : <SolWalletButton />}
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={requestAirdrop}
                  disabled={!walletConnected}
                >
                  {walletConnected ? "Request Airdrop" : "Connect Wallet"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
