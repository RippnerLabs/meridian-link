pragma circom 2.1.8;

include "node_modules/circomlib/circuits/sha256/sha256.circom";
include "node_modules/circomlib/circuits/bitify.circom";
// Note: Using circomlib's Num2Bits and Bits2Num templates to ensure compliance with Circom 2.x initialization rules.

template Limbs256ToBits() {
    signal input hi; // upper 128
    signal input lo; // lower 128
    signal output bits[256]; // msb first - be

    component loBits = Num2Bits(128);
    loBits.in <== lo;
    component hiBits = Num2Bits(128);
    hiBits.in <== hi;

    for (var i=0; i<128; i++) bits[i] <== hiBits.out[127-i];
    for (var i=0; i<128; i++) bits[i+128] <== loBits.out[127-i];
}

template Lamports64Bits() {
    signal output bits[64];
    for (var i=0;i<64;i++) bits[i] <== 0;
}

template HashBitsToLimbs() {
    signal input in[256];
    signal output hi;
    signal output lo;

    component hiB2N = Bits2Num(128);
    component loB2N = Bits2Num(128);

    for(var i=0; i<128; i++) {
        hiB2N.in[i] <== in[127 -i];
        loB2N.in[i] <== in[255 -i];
    }
    hi <== hiB2N.out;
    lo <== loB2N.out;
}

template LeafHash() {
    // inputs
    signal input owner_hi;
    signal input owner_lo;
    signal input data_hash_hi;
    signal input data_hash_lo;

    // output
    signal output leaf_hi;
    signal output leaf_lo;   // 2×128-bit limbs

    /* ---- build 72-byte message ----
       owner 32B  | lamports 8B | dataHash 32B
    */
    component ownerBits = Limbs256ToBits();
    ownerBits.hi <== owner_hi;
    ownerBits.lo <== owner_lo;

    component lamBits = Lamports64Bits();       // 64 zero bits

    component dataBits = Limbs256ToBits();
    dataBits.hi <== data_hash_hi;
    dataBits.lo <== data_hash_lo;

    // concat → 32+8+32 = 72 B = 576 bits
    signal message[576];
    // Fill first 256 bits with owner bits
    for (var i = 0; i < 256; i++) {
        message[i] <== ownerBits.bits[i];
    }
    // Next 64 bits are zero lamport bits
    for (var i = 0; i < 64; i++) {
        message[256 + i] <== lamBits.bits[i];
    }
    // Final 256 bits are data hash bits
    for (var i = 0; i < 256; i++) {
        message[320 + i] <== dataBits.bits[i];
    }

    /* ---- SHA-256 of 72-byte message ---- */
    component hasher = Sha256(576);
    for (var i = 0; i < 576; i++) {
        hasher.in[i] <== message[i];
    }

    /* ---- produce limbs ---- */
    component bits2Limbs = HashBitsToLimbs();
    for (var i = 0; i < 256; i++) bits2Limbs.in[i] <== hasher.out[i];

    leaf_hi <== bits2Limbs.hi;
    leaf_lo <== bits2Limbs.lo;
}

/* ****************************************************
 * *************  Merkle Inclusion  *******************
 * ****************************************************/

template MerkleProof(DEPTH) {
    signal input leaf_hi;
    signal input leaf_lo;
    signal input pathElements_hi[DEPTH];
    signal input pathElements_lo[DEPTH];
    signal input pathIndices[DEPTH];        // 0/1 LE (leaf-bottom)

    // public root
    signal input root_hi;
    signal input root_lo;

    /* ---- arrays for each depth ---- */
    component sibBits[DEPTH];
    component curBits[DEPTH];
    component levelHash[DEPTH];
    component limbConv[DEPTH];
    signal blockBits[DEPTH][512];

    /* ---- iterative state arrays ---- */
    signal cur_hi_state[DEPTH + 1];
    signal cur_lo_state[DEPTH + 1];

    cur_hi_state[0] <== leaf_hi;
    cur_lo_state[0] <== leaf_lo;

    for (var d = 0; d < DEPTH; d++) {
        /* unpack sibling */
        sibBits[d] = Limbs256ToBits();
        sibBits[d].hi <== pathElements_hi[d];
        sibBits[d].lo <== pathElements_lo[d];

        /* unpack current */
        curBits[d] = Limbs256ToBits();
        curBits[d].hi <== cur_hi_state[d];
        curBits[d].lo <== cur_lo_state[d];

        /* build concatenation block - Light Protocol style */
        /* pathIndices[d] = 0 means current is left child, sibling is right */
        /* pathIndices[d] = 1 means sibling is left child, current is right */
        for (var i = 0; i < 256; i++) {
            // left = pathIndices[d] == 0 ? current : sibling
            blockBits[d][i] <== curBits[d].bits[i] + pathIndices[d] * (sibBits[d].bits[i] - curBits[d].bits[i]);
            // right = pathIndices[d] == 0 ? sibling : current  
            blockBits[d][i+256] <== sibBits[d].bits[i] + pathIndices[d] * (curBits[d].bits[i] - sibBits[d].bits[i]);
        }

        /* hash */
        levelHash[d] = Sha256(512);
        for (var i = 0; i < 512; i++) levelHash[d].in[i] <== blockBits[d][i];

        /* convert */
        limbConv[d] = HashBitsToLimbs();
        for (var i = 0; i < 256; i++) limbConv[d].in[i] <== levelHash[d].out[i];

        cur_hi_state[d + 1] <== limbConv[d].hi;
        cur_lo_state[d + 1] <== limbConv[d].lo;
    }

    /* ---- final equality with public root ---- */
    cur_hi_state[DEPTH] === root_hi;
    cur_lo_state[DEPTH] === root_lo;
}

/* ****************************************************
 * *******************  MAIN  *************************
 * ****************************************************/

template DepositProof(TREE_HEIGHT, CANOPY) {
    var DEPTH = TREE_HEIGHT - CANOPY;          // compile-time constant
    /* **********  PUBLIC  ********** */
    signal input root_hi;
    signal input root_lo;
    signal input source_chain_id;
    signal input dest_chain_id;
    signal input amount;
    signal input deposit_id_hi;
    signal input deposit_id_lo;
    signal input dest_addr_hash_hi;
    signal input dest_addr_hash_lo;

    /* **********  PRIVATE  ********* */
    signal input owner_hi;
    signal input owner_lo;
    signal input mint_hi;
    signal input mint_lo;
    signal input timestamp;              // not checked; exposed for external queries
    signal input data_hash_hi;
    signal input data_hash_lo;

    signal input pathElements_hi[DEPTH];
    signal input pathElements_lo[DEPTH];
    signal input pathIndices[DEPTH];

    // Provided leaf hash (private)
    signal input leaf_hi;
    signal input leaf_lo;

    /* 1️⃣  Merkle inclusion with provided leaf */
    component inc = MerkleProof(DEPTH);
    inc.leaf_hi <== leaf_hi;
    inc.leaf_lo <== leaf_lo;
    for (var i=0; i<DEPTH; i++) {
        inc.pathElements_hi[i] <== pathElements_hi[i];
        inc.pathElements_lo[i] <== pathElements_lo[i];
        inc.pathIndices[i]     <== pathIndices[i];
    }
    inc.root_hi <== root_hi;
    inc.root_lo <== root_lo;

    // add outputs
    // amount fits in 64 bits → no constraint needed in-circuit
    // dest/source chain IDs etc. are *public inputs* only.
    
    
    // TODO: Complete checking adding the checks for Leaf Hash computation
    // SHA-inside-leaf ↔ public equality here.
}

/* **************  Export main **************** */
component main = DepositProof(32, 6);

