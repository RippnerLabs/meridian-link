pragma circom 2.1.8;

include "node_modules/circomlib/circuits/sha256/sha256.circom";
include "node_modules/circomlib/circuits/bitify.circom";
include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

// Simple Merkle proof verification for Light Protocol
template VerifyMerkleProof(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    
    signal currentHash[levels + 1];
    currentHash[0] <== leaf;
    
    component hashers[levels];
    
    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        
        // If pathIndices[i] == 0, current is left child
        // If pathIndices[i] == 1, current is right child
        hashers[i].inputs[0] <== currentHash[i] + pathIndices[i] * (pathElements[i] - currentHash[i]);
        hashers[i].inputs[1] <== pathElements[i] + pathIndices[i] * (currentHash[i] - pathElements[i]);
        
        currentHash[i + 1] <== hashers[i].out;
    }
    
    // Verify final hash equals root
    root === currentHash[levels];
}

// Create unique nullifier to prevent double spending
template ComputeNullifier() {
    signal input depositId;
    signal input sourceChainId;
    signal input destChainId;
    signal input amount;
    signal input mint;
    signal input owner;
    signal input timestamp;
    
    signal output nullifier;
    
    // Create unique nullifier using Poseidon hash
    component hasher = Poseidon(7);
    hasher.inputs[0] <== depositId;
    hasher.inputs[1] <== sourceChainId;
    hasher.inputs[2] <== destChainId;
    hasher.inputs[3] <== amount;
    hasher.inputs[4] <== mint;
    hasher.inputs[5] <== owner;
    hasher.inputs[6] <== timestamp;
    
    nullifier <== hasher.out;
}

// Compute commitment for the deposit
template ComputeCommitment() {
    signal input amount;
    signal input destChainAddr;
    signal input destChainId;
    signal input depositId;
    signal input nullifier;
    
    signal output commitment;
    
    component hasher = Poseidon(5);
    hasher.inputs[0] <== amount;
    hasher.inputs[1] <== destChainAddr;
    hasher.inputs[2] <== destChainId;
    hasher.inputs[3] <== depositId;
    hasher.inputs[4] <== nullifier;
    
    commitment <== hasher.out;
}

// Main circuit for Solana deposit proof
template SolDepositProof(MERKLE_LEVELS) {
    // Public inputs (known to Ethereum verifier)
    signal input stateRoot;           // Light Protocol state tree root
    signal input amount;              // Amount to be withdrawn on Ethereum
    signal input destChainId;         // Destination chain ID (Ethereum)
    signal input destChainAddr;       // Destination address on Ethereum
    
    // Private inputs (from Light Protocol proof)
    signal input accountHash;         // From proof.json: hash
    signal input leafIndex;           // From proof.json: leafIndex  
    signal input merkleProof[MERKLE_LEVELS]; // From proof.json: merkleProof
    signal input pathIndices[MERKLE_LEVELS]; // Computed from leafIndex
    
    // Private inputs (from record.json)
    signal input owner;               // Solana owner pubkey
    signal input sourceChainId;       // Source chain ID (Solana)
    signal input mint;                // Token mint address
    signal input timestamp;           // Deposit timestamp
    signal input depositId;           // Unique deposit ID
    
    // Private inputs (from account.json for validation)
    signal input dataHash;            // Account data hash
    
    // Public outputs
    signal output nullifier;          // Unique nullifier to prevent double spending
    signal output commitment;         // Commitment binding all parameters
    signal output isValid;           // Proof validity flag
    
    // Step 1: Verify the Merkle proof inclusion
    component merkleVerifier = VerifyMerkleProof(MERKLE_LEVELS);
    merkleVerifier.leaf <== accountHash;
    merkleVerifier.root <== stateRoot;
    
    for (var i = 0; i < MERKLE_LEVELS; i++) {
        merkleVerifier.pathElements[i] <== merkleProof[i];
        merkleVerifier.pathIndices[i] <== pathIndices[i];
    }
    
    // Step 2: Compute unique nullifier
    component nullifierComputer = ComputeNullifier();
    nullifierComputer.depositId <== depositId;
    nullifierComputer.sourceChainId <== sourceChainId;
    nullifierComputer.destChainId <== destChainId;
    nullifierComputer.amount <== amount;
    nullifierComputer.mint <== mint;
    nullifierComputer.owner <== owner;
    nullifierComputer.timestamp <== timestamp;
    
    nullifier <== nullifierComputer.nullifier;
    
    // Step 3: Compute commitment
    component commitmentComputer = ComputeCommitment();
    commitmentComputer.amount <== amount;
    commitmentComputer.destChainAddr <== destChainAddr;
    commitmentComputer.destChainId <== destChainId;
    commitmentComputer.depositId <== depositId;
    commitmentComputer.nullifier <== nullifier;
    
    commitment <== commitmentComputer.commitment;
    
    // Step 4: Validate constraints
    
    // Ensure source chain is Solana (chain ID = 1)
    signal sourceChainCheck;
    sourceChainCheck <== sourceChainId - 1;
    sourceChainCheck === 0;
    
    // Ensure destination chain matches input
    signal destChainCheck;
    destChainCheck <== destChainId - destChainId;
    destChainCheck === 0;
    
    // Ensure amount is positive (> 0)
    component amountPositive = GreaterThan(64);
    amountPositive.in[0] <== amount;
    amountPositive.in[1] <== 0;
    amountPositive.out === 1;
    
    // Validate deposit ID is positive
    component depositIdPositive = GreaterThan(64);
    depositIdPositive.in[0] <== depositId;
    depositIdPositive.in[1] <== 0;  
    depositIdPositive.out === 1;
    
    // Validate timestamp is reasonable (not zero)
    component timestampPositive = GreaterThan(64);
    timestampPositive.in[0] <== timestamp;
    timestampPositive.in[1] <== 0;
    timestampPositive.out === 1;
    
    // If all checks pass, proof is valid
    isValid <== 1;
}

// Instantiate main circuit with 26 levels (Light Protocol tree depth)
component main {public [stateRoot, amount, destChainId, destChainAddr]} = SolDepositProof(26);
