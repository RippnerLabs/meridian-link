import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useEffect, useState, useRef } from "react";
import * as anchor from "@coral-xyz/anchor";
import idl from "../../../../sol-bridge/target/idl/cross_chain_token_bridge.json";
import { CrossChainTokenBridge } from "../../../../sol-bridge/target/types/cross_chain_token_bridge";
import {
  bn,
  createRpc,
  deriveAddress,
  deriveAddressSeed,
  getDefaultAddressTreeInfo,
  sleep
} from "@lightprotocol/stateless.js";
import { PackedAccounts, SystemAccountMetaConfig } from "@/lib/lightprotocol-helpers";
import { CONSTANTS } from "@/lib/constants";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

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
  /**
   * Wallet adapter instance from @solana/wallet-adapter-react.
   * Using `any` to avoid strict type incompatibilities between different
   * wallet adapter interfaces (NodeWallet, WalletContextState, etc.).
   */
  wallet: any;
  /**
   * Optionally provide an Anchor provider. If omitted, one will be created
   * using the supplied connection (or the default RPC endpoint) and wallet.
   */
  provider?: anchor.AnchorProvider;
}

async function createSolDeposit(
  solDepositParams: SolanaDepositParams,
) {
  const rpc = createRpc(
    process.env.SOLANA_VALIDATOR_URL,
    process.env.SOLANA_COMPRESSION_API_ENDPOINT,
    process.env.SOLANA_PROVER_ENDPOINT,
  );
  const stateTreeInfos = await rpc.getStateTreeInfos();
  const outputMerkleTree = stateTreeInfos[0].tree;
  const defaultAddressTreeInfo = getDefaultAddressTreeInfo();
  const addressTree = defaultAddressTreeInfo.tree;
  const addressQueue = defaultAddressTreeInfo.queue;

  const { wallet, provider: providedProvider, connection: providedConnection } = solDepositParams as any;

  if (!wallet?.publicKey) {
    throw new Error("Solana wallet not connected");
  }

  const connection =
    providedConnection ??
    new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "http://127.0.0.1:8899",
      "confirmed",
    );

  const provider =
    providedProvider ?? new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });

  const program = getProgram(provider);

  const bridgeStateAddr = PublicKey.findProgramAddressSync([
    Buffer.from("bridge_state"),
  ], program.programId)[0];
  // Anchor generated typings for browser build may not include `bridgeState`; cast to any.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const bridgeStateAccount: any = await (program.account as any).bridgeState.fetch(bridgeStateAddr);

  const nextDepositCount = BigInt(bridgeStateAccount.depositCount.toString()) + BigInt(1);
  const depositCountBytes = Buffer.alloc(16);
  const twoPow64 = BigInt(1) << BigInt(64);
  const low = nextDepositCount % twoPow64;
  const high = nextDepositCount / twoPow64;
  depositCountBytes.writeBigUInt64LE(low, 0);
  depositCountBytes.writeBigUInt64LE(high, 8);

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

  // solDepositParams
  solDepositParams.destChainAddr = bs58.encode(Buffer.from(solDepositParams.destChainAddr.replace('0x', ""), "hex"));
  solDepositParams.destChainMintAddr = bs58.encode(Buffer.from(solDepositParams.destChainMintAddr.replace('0x', ""), "hex"));

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
    bn(solDepositParams.amountLamports.toString()),
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
  console.log("tx", tx);

  await sleep(4000);

  // step 2 - get the record details
  const coder = new anchor.BorshCoder(idl as anchor.Idl);

  let depositRecordAccount: any | null = null;
  const MAX_RETRIES = 6; // total ~(1+2+4+8+16+32)=63s
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      depositRecordAccount = await rpc.getCompressedAccount(bn(depositRecordAddr.toBytes()));
      if (depositRecordAccount && depositRecordAccount.data?.data) break;
    } catch (_) { }
    await sleep(1000 * 2 ** i);
  }

  if (!depositRecordAccount || !depositRecordAccount.data?.data) {
    console.error("Unable to fetch deposit record after retries");
    return tx;
  }

  const depositRecord = coder.types.decode(
    "DepositRecordCompressedAccount",
    depositRecordAccount.data.data,
  );

  console.log("depositRecordAccount", JSON.stringify(depositRecordAccount));
  console.log("depositRecord", depositRecord);

  // Convert the hex hash string into a Uint8Array before wrapping with bn().
  try {
    const accProof = await rpc.getCompressedAccountProof(depositRecordAccount.hash);
    console.log(accProof);
  } catch (err) {
    console.warn("Could not fetch compressed account proof yet - will retry later", err);
  }

  return tx;
}

export async function depositToSolanaBridge(
  params: SolanaDepositParams,
): Promise<string> {
  return await createSolDeposit(params);
}

// Default export for convenience in UI layer
export default useSolanaTransferMonitor;
