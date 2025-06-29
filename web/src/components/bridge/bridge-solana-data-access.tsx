import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useEffect, useState, useRef } from "react";
import * as anchor from "@coral-xyz/anchor";
import idl from "../../../../sol-bridge/target/idl/cross_chain_token_bridge.json";
import {CrossChainTokenBridge} from "../../../../sol-bridge/target/types/cross_chain_token_bridge";
import { useAnchorProvider } from "../solana/solana-provider";
import {
  bn,
  createRpc,
  deriveAddress,
  deriveAddressSeed,
  getDefaultAddressTreeInfo,
  sleep
} from "@lightprotocol/stateless.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { PackedAccounts, SystemAccountMetaConfig } from "@/lib/lightprotocol-helpers";
import { CONSTANTS } from "@/lib/constants";

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    intervalRef.current = setInterval(checkBalance, pollIntervalMs) as unknown as NodeJS.Timeout;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [recipient, mint, expectedAmount, rpcEndpoint, pollIntervalMs]);

  return { hasReceived, currentBalance };
}

export const getProgram = (provider: anchor.Provider) => {
  return new anchor.Program({...idl, address: (process.env.NEXT_PUBLIC_SOLANA_CROSS_CHAIN_TOKEN_PROGRAM || idl.address) } as CrossChainTokenBridge, provider)
}

export interface SolanaDepositParams {
  amountLamports: bigint;
  mint: string;
  bridgeProgramId: string;
  destChainId: number;
  destChainAddr: string;
  destChainMintAddr: string;
  connection?: Connection;
}


async function createSolDeposit(
  solDepositParams: SolanaDepositParams,
) {
  const rpc = createRpc(process.env.SOLANA_VALIDATOR_URL,process.env.SOLANA_COMPRESSION_API_ENDPOINT,process.env.SOLANA_PROVER_ENDPOINT);
  const stateTreeInfos = await rpc.getStateTreeInfos();
  const outputMerkleTree = stateTreeInfos[0].tree;
  const defaultAddressTreeInfo = getDefaultAddressTreeInfo();
  const addressTree = defaultAddressTreeInfo.tree;
  const addressQueue = defaultAddressTreeInfo.queue;
  const wallet = useWallet();
  const provider = useAnchorProvider()
  const program = getProgram(provider);

  const bridgeStateAddr = PublicKey.findProgramAddressSync([Buffer.from("bridge_state")], program.programId)[0];
  const bridgeStateAccount = await program.account.bridgeState.fetch(bridgeStateAddr);
  const nextDepositCount = BigInt(bridgeStateAccount.depositCount.toString())+BigInt(1);
  const depositCountBytes = Buffer.alloc(16);
  const twoPow64 = BigInt(1) << BigInt(64);
  const low = nextDepositCount % twoPow64;
  const high = nextDepositCount / twoPow64;
  depositCountBytes.writeBigUint64LE(low, 0);
  depositCountBytes.writeBigUint64LE(high, 8);

  if(!wallet.publicKey) {
    throw new Error("Solana wallet not connected");
  }

  const depositRecordSeed = deriveAddressSeed(
    [
      new TextEncoder().encode("deposit"),
      wallet.publicKey?.toBytes(),
      depositCountBytes,
    ],
    program.programId
  );
  const depositRecordAddr = deriveAddress(depositRecordSeed, addressTree);
  const proof = await rpc.getValidityProofV0(
    [],
    [
      {
        tree: addressTree,
        queue: addressQueue,
        address: bn(depositRecordAddr.toBytes())
      }
    ],
  )
  const systemAccountConfig = SystemAccountMetaConfig.new(program.programId);
  let remainingAccounts = PackedAccounts.newWithSystemAccounts(systemAccountConfig);
  const addressMerkleTreePubkeyIndex = remainingAccounts.insertOrGet(addressTree);
  const addressQueuePubkeyIndex = remainingAccounts.insertOrGet(addressQueue);
  const packedAddressMerkleContext = {
    rootIndex: proof.rootIndices[0],
    addressMerkleTreePubkeyIndex,
    addressQueuePubkeyIndex
  };
  const outputMerkleTreeIndex = remainingAccounts.insertOrGet(outputMerkleTree);
  let proofProc = {
    0: proof.compressedProof
  }
  const computeBudgetIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  });

  const link = `${CONSTANTS.SOLANA_CHAIN_ID}_${process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR}_${solDepositParams.destChainId}_${solDepositParams.destChainMintAddr}`
  console.log('link', link);
  const linkHash = require('crypto')
  .createHash('sha256')
  .update(link)
  .digest("hex")
  .slice(0, 16);

  console.log('linkHash', linkHash);

  let tx = await program.methods.deposit(
    proofProc,
    packedAddressMerkleContext,
    outputMerkleTreeIndex,
    solDepositParams.amountLamports,
    linkHash,
    solDepositParams.destChainAddr
  )
  .accounts({
    signer: wallet.publicKey,
    mint: new anchor.web3.PublicKey(process.env.NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR || ""),
    tokenProgram: TOKEN_PROGRAM_ID
  })
  .preInstructions([computeBudgetIx])
  .remainingAccounts(remainingAccounts.toAccountMetas().remainingAccounts)
  .rpc({commitment: "confirmed"});

  await sleep(4000);

  // step 2 - get the record details
  let depositRecordAccount = await rpc.getCompressedAccount(bn(depositRecordAddr.toBytes()));
  const coder = new anchor.BorshCoder(idl as anchor.Idl);
  let depositRecord = coder.types.decode(
    "DepositRecordCompressedAccount",
    depositRecordAccount?.data?.data
  );
  console.log("depositRecord", depositRecord);
  return tx;
}

export async function depositToSolanaBridge(
  params: SolanaDepositParams,
): Promise<string> {
  return await createSolDeposit(params);
}

// Default export for convenience in UI layer
export default useSolanaTransferMonitor;
