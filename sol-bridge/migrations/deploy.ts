// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.
import dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import path from "path";
dotenv.config({
  path: path.join(__dirname, "../../relayer-ts/.env.test")
})
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import idl from "../target/idl/cross_chain_token_bridge.json";
import { CrossChainTokenBridge } from "../target/types/cross_chain_token_bridge"
import { createRpc } from "@lightprotocol/stateless.js";
import { BN } from "bn.js";
import addressBook from "../../config/devnet_solana_address.json";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

function toBigInt(amount: number | bigint): bigint {
  return typeof amount === "bigint" ? amount : BigInt(amount);
}

async function main() {
  const signer = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, "../../keys/solana-admin.json"), "utf8")
      )
    )
  );

  console.log(
    "process.env.SOLANA_VALIDATOR_URL", process.env.SOLANA_VALIDATOR_URL
  )
  const connection = new Connection(process.env.SOLANA_VALIDATOR_URL, {
    commitment: "confirmed",
  });

  const decimals = 2;

  const mintPubkey = await createMint(
    connection,
    signer,
    signer.publicKey,
    signer.publicKey,
    decimals,
    undefined,
    { commitment: "confirmed", skipPreflight: true }
  );

  console.log("Created mint:", mintPubkey.toBase58());

  const ata = await createAssociatedTokenAccount(
    connection,
    signer,
    mintPubkey,
    signer.publicKey,
    { commitment: "confirmed", skipPreflight: true }
  );

  const mintAmount = toBigInt(1_000_000 * 10 ** decimals);
  await mintTo(
    connection,
    signer,
    mintPubkey,
    ata,
    signer,
    mintAmount,
    [],
    { commitment: "confirmed", skipPreflight: true }
  );

  console.log(
    `Minted ${(1_000_000).toLocaleString()} tokens to ${ata.toBase58()}`
  );

  fs.writeFileSync(
    path.join(
      __dirname,
      `../../config/${process.env.SOLANA_NETWORK}_solana_address.json`
    ),
    JSON.stringify({ bridgeTokenAddress: mintPubkey.toString() })
  );

  // override ANCHOR_WALLET env
  process.env.ANCHOR_WALLET = path.join(__dirname, "../../keys/solana-admin.json");
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider)
  const program = new anchor.Program(idl as CrossChainTokenBridge, provider);
  const rpc = process.env.SOLANA_NETWORK == "devnet" ?
    createRpc(
      process.env.SOLANA_VALIDATOR_URL,
    )
  :
   createRpc(
    process.env.SOLANA_VALIDATOR_URL,
    process.env.SOLANA_COMPRESSION_API_ENDPOINT,
    process.env.SOLANA_PROVER_ENDPOINT
  );
  const depositToVaultTx = await program.methods.depositToVault(new BN(mintAmount))
  .accounts({
    signer: signer.publicKey,
    mint: mintPubkey,
    tokenProgram: TOKEN_PROGRAM_ID
  })
  .signers([signer])
  .transaction();

  depositToVaultTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  const sign = await rpc.sendTransaction(depositToVaultTx, [signer]);
  await rpc.confirmTransaction(sign);

  // 2 - by here sol bridge has enough tokens to withdraw to the users

  const initBridgeStatePdaTx = await program.methods.init()
  .accounts({
    signer: signer.publicKey
  })
  .signers([signer])
  .transaction();
  initBridgeStatePdaTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  const sign2 = await rpc.sendTransaction(initBridgeStatePdaTx, [signer]);
  await rpc.confirmTransaction(sign2);

  // 3 - by here token bridge is initialised
  const toBs58 = x => bs58.encode(Buffer.from(x.replace("0x", ""), "hex"));
  const CHAIN_IDS = [
    {mintAddr: mintPubkey, chaindId: 1},
    // {mintAddr: toBs58(addressBook.tokenSmartContractAddress), chaindId: 31337},
    {mintAddr: toBs58("0xf91577ae75b339eb709a333ee40a9c9109ef013e"), chaindId: 11155111},
  ]
  
  for (let i = 0; i < CHAIN_IDS.length; i++) {
    for (let j = 0; j < CHAIN_IDS.length; j++) {
      if (i === j) continue;
      const link = `${CHAIN_IDS[i].chaindId}_${CHAIN_IDS[i].mintAddr}_${CHAIN_IDS[j].chaindId}_${CHAIN_IDS[j].mintAddr}`;
      console.log('link',link);
      const linkHash = await require('crypto').createHash('sha256')
      .update(link)
      .digest('hex')
      .slice(0, 16);
      
      console.log('link',linkHash);
      const initTokenBridgeTx = await program.methods.initTokenBridge(
        CHAIN_IDS[i].chaindId,
        CHAIN_IDS[i].mintAddr.toString(),
        CHAIN_IDS[j].chaindId,
        CHAIN_IDS[j].mintAddr.toString(),
        linkHash
      )
      .accounts({
        signer: signer.publicKey
      })
      .signers([signer])
      .transaction();
      
      initTokenBridgeTx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
      const bridgeSign = await rpc.sendTransaction(initTokenBridgeTx, [signer]);
      await rpc.confirmTransaction(bridgeSign);
      
      console.log(`Initialized token bridge from chain ${CHAIN_IDS[i].chaindId} to ${CHAIN_IDS[j].chaindId}`);
    }
  }

  // update web/.env.local with SOLANA_BRIDGE_TOKEN_MINT_ADDR
  const envPath = path.join(__dirname, "../../web/.env.test");
  const envUpdates: Record<string, string> = {
    NEXT_PUBLIC_SOLANA_BRIDGE_TOKEN_MINT_ADDR: mintPubkey.toString()
  };
  updateEnvFile(envPath, envUpdates);
};

function updateEnvFile(filePath: string, updates: Record<string, string>) {
  let original = "";
  try {
    original = fs.readFileSync(filePath, { encoding: "utf8" });
  } catch (e) {
    // If file doesn't exist, we'll create it
    original = "";
  }

  const lines = original.length > 0 ? original.split(/\n/) : [];
  const seenKeys = new Set<string>();

  // Prepare a set for keys we need to ensure are present
  const requiredKeys = new Set(Object.keys(updates));

  const updatedLines = lines.map((line) => {
    // Leave pure comments or empty lines untouched
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) return line;

    // Basic .env KEY=VALUE parsing (preserve comments at end of line)
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) return line;

    const key = match[1];
    const valueAndMaybeComment = match[2];

    if (!(key in updates)) return line;

    seenKeys.add(key);
    requiredKeys.delete(key);

    // Try to preserve trailing inline comments
    let valuePart = valueAndMaybeComment;
    let commentPart = "";

    // Split off a trailing comment if present (best-effort, not a full parser)
    const commentIdx = valueAndMaybeComment.indexOf("#");
    if (commentIdx >= 0) {
      valuePart = valueAndMaybeComment.slice(0, commentIdx).trimEnd();
      commentPart = valueAndMaybeComment.slice(commentIdx);
    }

    const newValue = updates[key];
    return `${key}=${newValue}${commentPart ? ` ${commentPart}` : ""}`;
  });

  // Append any missing keys at the end, preserving file if it had content
  const trailing = Array.from(requiredKeys).map((key) => `${key}=${updates[key]}`);
  const resultLines = updatedLines.length > 0 ? [...updatedLines, ...trailing] : trailing;

  // Ensure file ends with a newline
  const finalContent = resultLines.join("\n").replace(/\n?$/, "\n");
  fs.writeFileSync(filePath, finalContent, { encoding: "utf8" });
  console.log("Updated:", filePath);
}


main();