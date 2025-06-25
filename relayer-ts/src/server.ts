import express, { raw } from "express";
import cors from "cors";
import {
  Rpc,
  createRpc,
  MerkleContextWithMerkleProof,
  CompressedAccountWithMerkleContext,
  proverRequest,
} from "@lightprotocol/stateless.js";
import bn from "bn.js";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
// @ts-ignore
import * as snarkjs from "snarkjs";
import path from "path";
import * as anchor from "@coral-xyz/anchor";
import { DepositRecord, CircuitInputs, ProofResponse } from "./types";
import idl from "../../sol-bridge/target/idl/cross_chain_token_bridge.json";
import bs58 from "bs58";
import dotenv from "dotenv";
import { ethers } from "ethers";
import {IndexedMerkleTree, NonMembershipProof} from "@jayanth-kumar-morem/indexed-merkle-tree"
import { poseidon9 } from "poseidon-lite";
import * as fs from "fs";
const { getSolanaCompatibleProof } = require("@jayanth-kumar-morem/snarkjs-to-solana");

// ABIs
import BridgeToken from "../../evm-bridge/artifacts/contracts/BridgeToken.sol/BridgeToken.json";
import SolanaEVMBridge from "../../evm-bridge/artifacts/contracts/evm-bridge.sol/SolanaEVMBridge.json";
import addressBook from "../../config/localhost_address_book.json";
dotenv.config({ path: ".env.local" });
// @ts-ignore
import snarkjs from "snarkjs";
import { solanaWithdraw } from "./sol-bridge";

const app = express();
const PORT = process.env.PORT || 3006;
// const web3 = new Web3(process.env.ETHEREUM_NODE_URL);
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL);
const wallet = new ethers.Wallet(process.env.RELAYER_PRIVKEY, provider);

// contracts
const evmBridgeContract = new ethers.Contract(
  addressBook.bridgeSmartContractAddress,
  SolanaEVMBridge.abi,
  provider
);

app.use(cors());
app.use(express.json());

function hexToField(hex: string): string {
  console.log("hex", hex);
  const bn = new BN(hex.replace("0x", ""), 16);
  return bn.toString(10);
}

function pubkeyToField(pubkey: string): string {
  try {
    const pk = new PublicKey(pubkey);
    const bytes = pk.toBytes();
    const bn = new BN(bytes);
    return bn.toString(10);
  } catch (err) {
    console.log(`invalid pubkey ${pubkey}`);
    return hexToField(pubkey);
  }
}

function stringToField(str: string): string {
  if (str.startsWith("0x")) {
    return hexToField(str);
  }

  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const bn = new BN(bytes);
  return bn.toString(10);
}

function computePathIndices(leafIndex: number, levels: number): number[] {
  const pathIndices = [];
  let index = leafIndex;
  for (let i = 0; i < levels; i++) {
    pathIndices.push(index % 2);
    index = Math.floor(index / 2);
  }
  return pathIndices;
}

function padArray(arr: string[], targetLength: number): string[] {
  const padded = [...arr];
  while (padded.length < targetLength) {
    padded.push("0");
  }
  return padded.slice(0, targetLength);
}

function generateCircuitInputs(
  proofData: MerkleContextWithMerkleProof,
  accountData: CompressedAccountWithMerkleContext,
  rawDepositRecord: any
): CircuitInputs {
  proofData = JSON.parse(JSON.stringify(proofData));
  // @ts-ignore
  const stateRoot = hexToField(proofData.root);
  const amount = rawDepositRecord.amount.toString();
  const destChainId = rawDepositRecord.dest_chain_id.toString();
  const destChainAddr = stringToField(rawDepositRecord.dest_chain_addr);

  const accountHash = hexToField(proofData.hash.toString());
  const leafIndex = proofData.leafIndex.toString();

  const merkleProofFields = proofData.merkleProof.map(String).map(hexToField);
  const merkleProof = padArray(merkleProofFields, 26);

  const pathIndices = computePathIndices(proofData.leafIndex, 26);
  const pathIndicesStr = pathIndices.map((i) => i.toString());

  const owner = pubkeyToField(rawDepositRecord.owner.toString());
  const sourceChainId = rawDepositRecord.source_chain_id.toString();
  const mint = pubkeyToField(rawDepositRecord.mint.toString());
  const timestamp = rawDepositRecord.timestamp.toString();
  const depositId = rawDepositRecord.deposit_id.toString();

  const dataHash = hexToField(
    accountData.data.dataHash
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );

  return {
    // public
    stateRoot,
    amount,
    destChainId,
    destChainAddr,

    // private
    accountHash,
    leafIndex,
    merkleProof,
    pathIndices: pathIndicesStr,
    owner,
    sourceChainId,
    mint,
    timestamp,
    depositId,
    dataHash,
  };
}

async function createProof(circuitInputs: CircuitInputs): Promise<any> {
  const wasmPath = path.join(
    __dirname,
    "../../circom/solDepositProof_js/solDepositProof.wasm"
  );
  const zkeyPath = path.join(
    __dirname,
    "../../circom/solDepositProof_js/1_0000.zkey"
  );

  const { proof, publicSignals: circomPublicSignals } =
    await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);

  const calldataBlob = await snarkjs.groth16.exportSolidityCallData(
    proof,
    circomPublicSignals
  );

  const argv = calldataBlob
    .replace(/["[\]\s]/g, "")
    .split(",")
    .map((x: string | number | bigint | boolean) => BigInt(x).toString());

  const a = [argv[0], argv[1]];
  const b = [
    [argv[2], argv[3]],
    [argv[4], argv[5]],
  ];
  const c = [argv[6], argv[7]];
  const publicSignals = [];

  for (let i = 8; i < argv.length; i++) {
    publicSignals.push(argv[i]);
  }

  return { a, b, c, publicSignals };
}

async function getTokenBalance(rawDepositRecord: any) {
  const receiverAddr =
    "0x" +
    Buffer.from(bs58.decode(rawDepositRecord.dest_chain_addr)).toString("hex");
  // Use the actual deployed token contract address from address book
  const tokenContractAddr = addressBook.tokenSmartContractAddress;
  const bridgeTokenContract = new ethers.Contract(
    tokenContractAddr,
    BridgeToken.abi,
    provider
  );
  const receiverBalance = await bridgeTokenContract.balanceOf(receiverAddr);
  console.log("receiverBalance", receiverBalance.toString());
  return receiverBalance;
}

async function withdrawFromEthChain(rawDepositRecord: any, proof: any) {
  try {
    const contractWithSigner = evmBridgeContract.connect(wallet);

    console.log("Getting balance before withdrawal...");
    await getTokenBalance(rawDepositRecord);
    const destChainAddr =
      "0x" +
      Buffer.from(bs58.decode(rawDepositRecord.dest_chain_addr)).toString(
        "hex"
      );
    const destChainMintAddr = addressBook.tokenSmartContractAddress;
    const depositRecord = {
      owner: rawDepositRecord.owner.toString(),
      sourceChainId: rawDepositRecord.source_chain_id,
      destChainId: rawDepositRecord.dest_chain_id,
      destChainAddr: destChainAddr,
      destChainMintAddr: destChainMintAddr,
      mint: rawDepositRecord.mint.toString(),
      amount: rawDepositRecord.amount.toString(),
      timestamp: rawDepositRecord.timestamp.toString(),
      depositId: rawDepositRecord.deposit_id.toString(),
    };

    const tx = await contractWithSigner.processWithdrawal(depositRecord, proof);
    console.log("tx.hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("receipt:", receipt);
    await getTokenBalance(rawDepositRecord);
    return receipt;
  } catch (error) {
    console.error("Error in withdrawFromEthChain:", error);
    throw error;
  }
}

evmBridgeContract.on(
  "EthDeposit",
  async (
    depositor,
    sourceChainId,
    destChainId,
    destChainAddr,
    destChainMintAddr,
    tokenMint,
    amount,
    timestamp,
    depositId,
    ...args
  ) => {
    try {
        let depositEvent = {
            depositor,
            sourceChainId,
            destChainId,
            destChainAddr,
            destChainMintAddr,
            tokenMint,
            amount,
            timestamp,
            depositId,
        }
        console.log("depositEvent", depositEvent);
        const depositEventArr = [
          depositor,
          sourceChainId,
          destChainId,
          destChainAddr,
          destChainMintAddr,
          tokenMint,
          amount,
          timestamp,
          depositId,
        ];

        const toBigInt = (x: any) => {
            try {
                return BigInt(String(x)).toString()
            } catch {
                return BigInt("0x" + Buffer.from(bs58.decode(x)).toString("hex")).toString()
            }
        }

        const bigInts = depositEventArr.map(x => toBigInt(x));
        const nullifier = poseidon9(bigInts)
        
        const fileStorage = "./ethDepositIMT.json";
        // IndexedMerkleTree, NonMembershipProof, Leaf, SerializedIMT
        let imt;
        try {
          imt = IndexedMerkleTree.loadFromFile(fileStorage);
        } catch (err) {
          console.log("err", err);
          imt = new IndexedMerkleTree();
        }
        const proof: NonMembershipProof = imt.createNonMembershipProof(nullifier);
        
        const toDec = (x: bigint | string) => BigInt(x).toString();
        const circuitInputs = {
            ...Object.fromEntries(Object.entries(depositEvent).map(([k, v]) => [k, toBigInt(v)])),
            pre_val: toDec(proof.preLeaf.val),
            pre_next: toDec(proof.preLeaf.nextVal),
            path: proof.path.map(toDec),
            dirs: proof.directions.map(String),
            old_root: toDec(proof.root),
            nullifier: nullifier.toString(),
        }

        console.log("circuitInputs", circuitInputs);

        const {proof: circuitProof, publicSignals: circomPublicSignals} = await snarkjs.groth16.fullProve(
            circuitInputs,
            "../circom/ethDepositProof_js/ethDepositProof.wasm",
            "../circom/ethDepositProof_js/1_0000.zkey",
        )

        const proofProc = await getSolanaCompatibleProof(circuitProof, circomPublicSignals);

        // console.log({proofA, proofB, proofC, publicSignals, nullifier});
        const withdrawalRecord = await solanaWithdraw(proofProc, depositEvent);

        await imt.insert(nullifier);
        fs.writeFileSync(fileStorage, JSON.stringify(imt.serialize()));

        return withdrawalRecord;
    } catch (err) {
        console.error("err", err);
    }
  }
);

// @ts-ignore
app.post("/api/generate-proof", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    console.log("Processing address:", address);

    const rpc: Rpc = createRpc();

    const addressBytes = new PublicKey(address).toBytes();

    // get compressed account data
    const accountData = await rpc.getCompressedAccount(new bn(addressBytes));
    console.log("Account structure:", JSON.stringify(accountData));

    if (!accountData.data?.data) {
      return res
        .status(400)
        .json({ error: "No data found in compressed account" });
    }

    const coder = new anchor.BorshCoder(idl as anchor.Idl);
    const rawDepositRecord = coder.types.decode(
      "DepositRecordCompressedAccount",
      accountData.data.data
    );

    console.log("Deposit record decoded:", rawDepositRecord);

    const proofData = await rpc.getCompressedAccountProof(accountData.hash);
    console.log("Proof data retrieved", proofData);

    const circuitInputs = generateCircuitInputs(
      proofData,
      accountData,
      rawDepositRecord
    );
    console.log(
      "Circuit inputs generated",
      JSON.stringify(circuitInputs, null, 2)
    );

    const proof = await createProof(circuitInputs);
    console.log("Proof generated successfully", proof);

    const withdrawRes = await withdrawFromEthChain(rawDepositRecord, proof);

    res.json({
      success: true,
      proof,
      circuitInputs,
      withdrawRes,
    });
  } catch (error) {
    console.error("Error generating proof:", error);
    res.status(500).json({
      error: "Failed to generate proof",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Relayer TypeScript server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(
    `Generate proof: POST http://localhost:${PORT}/api/generate-proof`
  );
});

export default app;
