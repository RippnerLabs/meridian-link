import * as fs from "fs";
import {
    MerkleContextWithMerkleProof,
    CompressedAccountWithMerkleContext,
} from "@lightprotocol/stateless.js";
import BN from "bn.js";
import {PublicKey} from "@solana/web3.js";
import path from "path";

interface DepositRecord {
    owner: string,
    source_chain_id: number,
    dest_chain_id: number,
    dest_chain_addr: string,
    dest_chain_mint_addr: string,
    mint: string,
    amount: string,
    timestamp: string,
    deposit_id: string,
}

function hexToField(hex: string) {
    // 16 specifies the input string is a hex
    const bn = new BN(hex.replace("0x", ''), 16);
    // we want the output string to base 10 decimal
    return bn.toString(10);
}

function pubkeyToField(pubkey: string): string {
    try {
        const pk = new PublicKey(pubkey);
        const bytes = pk.toBytes();
        const bn = new BN(bytes);
        return bn.toString(10);
    } catch (err) {
        console.log(`invalid pubkey ${pubkey}`)
        return hexToField(pubkey)
    }
}

function stringToField(str: string): string {
    if(str.startsWith('0x')) {
        return hexToField(str);
    }

    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const bn = new BN(bytes);
    return bn.toString(10);
}

function computePathIndices(leafIndex: number, levels: number): number[] {
    const pathIndices=[];
    let index = leafIndex;
    for(let i=0;i<levels;i++) {
        pathIndices.push(index % 2);
        index = Math.floor(index / 2);
    }
    return pathIndices;
}

function padArray(arr: string[], targetLength: number): string[] {
    const padded = [...arr];
    while (padded.length < targetLength) {
        padded.push('0');
    }
    return padded.slice(0, targetLength);
}

function generateCircuitInput(): any {
    try {
        const proofData:MerkleContextWithMerkleProof = JSON.parse(fs.readFileSync("../proof.json", 'utf8'))
        const accountData: CompressedAccountWithMerkleContext = JSON.parse(fs.readFileSync("../account.json", "utf8"));
        const recordData: DepositRecord = JSON.parse(fs.readFileSync("../record.json", "utf8"));

        const stateRoot = hexToField(proofData.root);
        const amount = recordData.amount;
        const destChainId = recordData.dest_chain_id.toString();
        const destChainAddr = stringToField(recordData.dest_chain_addr);

        const accountHash = hexToField(proofData.hash);
        const leafIndex = proofData.leafIndex.toString();

        const merkleProofFields = proofData.merkleProof.map(hexToField);
        const merkleProof = padArray(merkleProofFields, 26);

        const pathIndices = computePathIndices(proofData.leafIndex, 26);
        const pathIndicesStr = pathIndices.map(i => i.toString());

        const owner = pubkeyToField(recordData.owner);
        const sourceChainId = recordData.source_chain_id.toString();
        const mint = pubkeyToField(recordData.mint);
        const timestamp = parseInt(recordData.timestamp, 16).toString();
        const depositId = recordData.deposit_id;

        const dataHash = hexToField(accountData.data.dataHash.map(
            b => b.toString(16).padStart(2, '0')
        ).join(''));
        console.log("dataHash", dataHash);

        const circuitInput = {
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
        }

        return circuitInput;
    } catch (err) {
        throw new Error(err);
    }
}

const integrationTestsDir = path.join(__dirname, "../../integration-tests");

function writeInputToFile() {
    try {
        const input = generateCircuitInput();
        fs.writeFileSync(path.join(integrationTestsDir, "input.json"), JSON.stringify(input, null, 2));
    } catch (err) {
        throw new Error(err);
    }
}

writeInputToFile()