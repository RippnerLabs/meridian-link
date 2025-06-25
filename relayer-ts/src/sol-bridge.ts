import fs from "fs";
import {Connection, PublicKey} from "@solana/web3.js";
import {getAccount, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { CrossChainTokenBridge } from "../../sol-bridge/target/types/cross_chain_token_bridge";
import idl from "../../sol-bridge/target/idl/cross_chain_token_bridge.json";
import {
  bn,
  CompressedAccountWithMerkleContext,
  createRpc,
  defaultStaticAccountsStruct,
  deriveAddress,
  deriveAddressSeed,
  getDefaultAddressTreeInfo,
  LightSystemProgram,
  Rpc,
  sleep,
} from "@lightprotocol/stateless.js";
import bs58 from "bs58";
import path from "path";
import os from "os";

// globals
const program = anchor.workspace.CrossChainTokenBridge as anchor.Program<CrossChainTokenBridge>;
const relayerKp = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path.join(__dirname, "../relayer.json"), "utf8"))));
let initialised = false;
const rpc = createRpc(process.env.SOLANA_VALIDATOR_URL,process.env.SOLANA_COMPRESSION_API_ENDPOINT,process.env.SOLANA_PROVER_ENDPOINT);

async function init() {
  const stateTreeInfos = await rpc.getStateTreeInfos();
  const outputMerkleTree = stateTreeInfos[0].tree;
  const defaultAddressTreeInfo = getDefaultAddressTreeInfo()
  const addressTree = defaultAddressTreeInfo.tree;
  const addressQueue = defaultAddressTreeInfo.queue;

  initialised = true;
}

// async function mintToRelayer()