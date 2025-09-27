"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAccount, useReadContract } from "wagmi";
import BridgeTokenABI from "@/contracts/BridgeToken.json";

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

export function useBridgeTokenBalance({ fromChain, token }: { fromChain: "ethereum" | "solana"; token: string }) {
  const isEth = fromChain === "ethereum";
  const { address: ethAddress } = useAccount();

  // Ethereum side – read directly from selected token
  const tokenAddressEth = (token?.startsWith("0x") ? token : "") as `0x${string}` | "";
  const { data: ethRawBalance, refetch: refetchEthBal, isLoading: ethLoading, error: ethError } = useReadContract({
    address: tokenAddressEth || undefined,
    abi: BridgeTokenABI.abi as any,
    functionName: "balanceOf",
    args: ethAddress && tokenAddressEth ? [ethAddress] : undefined,
    query: {
      enabled: !!ethAddress && !!tokenAddressEth,
      refetchInterval: 10000,
    },
  } as any);
  const { data: ethDecimals } = useReadContract({
    address: tokenAddressEth || undefined,
    abi: BridgeTokenABI.abi as any,
    functionName: "decimals",
    args: undefined,
    query: {
      enabled: !!tokenAddressEth,
      refetchInterval: 60000,
    },
  } as any);

  // Solana side
  const { publicKey, connected } = useWallet();
  const [solBalance, setSolBalance] = useState<string>("0");
  const [solLoading, setSolLoading] = useState(false);
  const [solError, setSolError] = useState<string | null>(null);

  const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "http://127.0.0.1:8899";
  const mintAddress = isEth ? "" : (token || "");

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
      refetchEthBal();
    } else {
      fetchSolBalance();
    }
  }, [isEth, refetchEthBal, fetchSolBalance]);

  return {
    balance: isEth ? (formatUnitsLike((ethRawBalance as bigint) || 0n, typeof ethDecimals === "number" ? ethDecimals : Number(ethDecimals || 18))) : solBalance,
    isLoading: isEth ? !!ethLoading : solLoading,
    error: isEth ? (ethError as any)?.message || null : solError,
    refetch,
  } as const;
}

export default useBridgeTokenBalance;


