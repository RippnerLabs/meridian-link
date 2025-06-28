import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useEffect, useState, useRef } from "react";

export interface SolanaMonitorParams {
  recipient: string;
  mint: string;
  expectedAmount: bigint;
  rpcEndpoint?: string;
  pollIntervalMs?: number;
}

export function useSolanaTransferMonitor({
  recipient,
  mint,
  expectedAmount,
  rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "http://127.0.0.1:8899",
  pollIntervalMs = 4000,
}: SolanaMonitorParams) {
  const [hasReceived, setHasReceived] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<bigint | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!recipient || !mint || expectedAmount === undefined) return;
    const connection = new Connection(rpcEndpoint, "confirmed");

    const recipientPk = new PublicKey(recipient);
    const mintPk = new PublicKey(mint);

    const checkBalance = async () => {
      try {
        const ata = await getAssociatedTokenAddress(mintPk, recipientPk, false, TOKEN_PROGRAM_ID, undefined);
        const acc = await getAccount(connection, ata, undefined, TOKEN_PROGRAM_ID);
        const bal = BigInt(acc.amount.toString());
        setCurrentBalance(bal);
        if (bal >= expectedAmount) {
          setHasReceived(true);
        }
      } catch (err) {
        // account may not exist yet – ignore
      }
    };

    // initial call and start polling
    checkBalance();
    intervalRef.current = setInterval(checkBalance, pollIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [recipient, mint, expectedAmount, rpcEndpoint, pollIntervalMs]);

  return { hasReceived, currentBalance };
}

export default useSolanaTransferMonitor;
