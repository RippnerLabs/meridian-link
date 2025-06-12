import BN from "bn.js";
import {sha256} from "@noble/hashes/sha256";
import {keccak_256} from "@noble/hashes/sha3";

const leBytesToBn = (buf: Buffer) => new BN([...buf].reverse().map(x => x.toString(16).padStart(2, "0")).join(""), 16);

const bnToBe32 = (bn: BN) => {
    const b = bn.toArrayLike(Buffer, "be", 32);
    if (b.length !==32) throw new Error("unexpected size");
    return b;
}

const split32ToLimbs = (buf: Buffer) => {
    const hi = new BN(buf.subarray(0, 16), 'be');
    const lo = new BN(buf.subarray(16,32), "be");
    return {hi: hi.toString(10), lo:lo.toString(10)};
}

interface DepositCircuitInputs {
    // Public
    root_hi: string; root_lo: string;
    source_chain_id: string;
    dest_chain_id: string;
    amount: string;
    deposit_id_hi: string; deposit_id_lo: string;
    dest_addr_hash_hi: string; dest_addr_hash_lo: string;

    // Private
    owner_hi: string; owner_lo:string;
    mint_hi: string; mint_lo: string;
    timestamp: string;
    data_hash_hi: string; data_hash_lo: string;
    leaf_hi: string; leaf_lo: string;
    pathElements_hi: string[]; pathElements_lo: string[];
    pathIndices: number[];
}

export function buildInputs(
    decoded:any,
    accountRaw: any,
    proof:any,
): DepositCircuitInputs {

    const dataBytes = accountRaw.data.data;
    const dataHash = Buffer.from(sha256(dataBytes));
    const {hi: data_hash_hi, lo: data_hash_lo} = split32ToLimbs(dataHash);

    const ownerLE = Buffer.from(accountRaw.owner._bn.toArray('le', 32));
    const ownerBE = Buffer.from(ownerLE).reverse();
    const lamports = Buffer.alloc(8);
    const leafBuf = Buffer.concat([ownerBE, lamports, dataHash]);
    const leafHash = Buffer.from(sha256(leafBuf));
    const {hi: leaf_hi, lo: leaf_lo} = split32ToLimbs(leafHash);

    const {hi: root_hi, lo: root_lo} = split32ToLimbs(bnToBe32(proof.root));

    const pathElements_hi: string[] = [];
    const pathElements_lo: string[] = [];

    proof.merkleProof.forEach((bn: BN, i:number) => {
        const {hi, lo} = split32ToLimbs(bnToBe32(bn));
        pathElements_hi[i] = hi;
        pathElements_lo[i] = lo;
    })

// 1. Takes `proof.leafIndex` (a number) and converts it to binary string using `toString(2)`
// 2. Pads the binary string with leading zeros to match the length of the merkle proof using `padStart()`
// 3. Splits the string into individual characters using `split("")`
// 4. Reverses the array to get the path from leaf to root using `reverse()`
// 5. Converts each character back to a number using `map(Number)`
// The result is an array of 0s and 1s that represents the path through the Merkle tree from the leaf to the root. Each 0 or 1 indicates whether to take the left (0) or right (1) branch at each level of the tree.
    const pathIndices = proof.leafIndex
    .toString(2)
    .padStart(proof.merkleProof.length, "0")
    .split("")
    .reverse()
    .map(Number);

    const {hi: owner_hi, lo: owner_lo} = split32ToLimbs(bnToBe32(accountRaw.owner._bn));
    const {hi: mint_hi, lo: mint_lo} = split32ToLimbs(bnToBe32(decoded.mint._bn));

    const addrHash = Buffer.from(
        keccak_256(decoded.dest_chain_addr)
    )
    const {hi: dest_addr_hash_hi, lo: dest_addr_hash_lo} = split32ToLimbs(addrHash);

    const depBN = decoded.deposit_id as BN;
    const deposit_id_hi = depBN.shrn(64).toString(10);
    const deposit_id_lo = depBN.and(new BN("ffffffffffffffff", 16)).toString(10);

    return {
        // public
        root_hi,
        root_lo,
        source_chain_id: decoded.source_chain_id.toString(),
        dest_chain_id: decoded.dest_chain_id.toString(),
        amount: decoded.amount.toString(),
        deposit_id_hi, deposit_id_lo,
        dest_addr_hash_hi, dest_addr_hash_lo,

        // private
        owner_hi, owner_lo,
        mint_hi, mint_lo,
        timestamp: decoded.timestamp.toString(),
        data_hash_hi, data_hash_lo,
        leaf_hi, leaf_lo,
        pathElements_hi, pathElements_lo, pathIndices,
    }
}