"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useBridgeDataAccess } from "./bridge-data-access";

function formatUnitsLike(value: bigint, decimals: number): string {
  if (decimals === 0) return value.toString();
  const negative = value < 0n;
  const base = negative ? -value : value;
  const divider = 10n ** BigInt(decimals);
  const integer = base / divider;
  const fraction = base % divider;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  const result = fractionStr.length > 0 ? `${integer.toString()}.${fractionStr}` : integer.toString();
  return negative ? `-${result}` : result;
}

export function useBridgeTokenBalance({ fromChain }: { fromChain: "ethereum" | "solana" }) {
  const isEth = fromChain === "ethereum";

  // Ethereum side reuses existing data-access (wagmi-backed)
  const { tokenBalance: ethBalance, isBalanceLoading: ethLoading, balanceError: ethError, refetchBalance: refetchEth } = useBridgeDataAccess();

  // Solana side
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState<string>("0");
  const [solLoading, setSolLoading] = useState(false);
  const [solError, setSolError] = useState<string | null>(null);

  const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "http://127.0.0.1:8899";
  const mintAddress = process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR || "";

  const connection = useMemo(() => new Connection(rpcEndpoint, "confirmed"), [rpcEndpoint]);

  const fetchSolBalance = useCallback(async () => {
    if (!connected || !publicKey || !mintAddress) {
      setSolBalance("0");
      return;
    }
    try {
      setSolLoading(true);
      setSolError(null);

      const mintPk = new PublicKey(mintAddress);
      const ata = await getAssociatedTokenAddress(mintPk, publicKey, false, TOKEN_PROGRAM_ID, undefined);

      // Query ATA account (may throw if account does not exist yet)
      const [acc, mintInfo] = await Promise.all([
        getAccount(connection, ata, undefined, TOKEN_PROGRAM_ID),
        getMint(connection, mintPk),
      ]);

      const amount = BigInt(acc.amount.toString());
      const decimals = mintInfo.decimals ?? 0;
      const human = formatUnitsLike(amount, decimals);
      setSolBalance(human);
    } catch (err: any) {
      // If ATA does not exist, balance is zero
      setSolBalance("0");
      // Only set an error for unexpected cases; missing account is not an error
      if (err && !("message" in err && typeof err.message === "string" && err.message.includes("Account does not exist"))) {
        setSolError(err?.message || "Failed to fetch Solana balance");
      }
    } finally {
      setSolLoading(false);
    }
  }, [connected, publicKey, mintAddress, connection]);

  useEffect(() => {
    if (fromChain === "solana") {
      fetchSolBalance();
      const id = setInterval(fetchSolBalance, 10000);
      return () => clearInterval(id);
    }
  }, [fromChain, fetchSolBalance]);

  const refetch = useCallback(() => {
    if (isEth) {
      refetchEth();
    } else {
      fetchSolBalance();
    }
  }, [isEth, refetchEth, fetchSolBalance]);

  return {
    balance: isEth ? (ethBalance || "0") : solBalance,
    isLoading: isEth ? !!ethLoading : solLoading,
    error: isEth ? (ethError as any)?.message || null : solError,
    refetch,
  } as const;
}

export default useBridgeTokenBalance;


