# ZK Circuits - Meridian Link

[![Part of Meridian Link](https://img.shields.io/badge/Meridian-Link-blue)](https://deepwiki.com/RippnerLabs/meridian-link)

Zero-knowledge proof circuits for the Meridian Link cross-chain token bridge. Built with Circom 2, these circuits enable privacy-preserving verification of deposits across Solana and EVM chains using Groth16 SNARKs.

## 📋 Table of Contents

- [Overview](#overview)
- [Circuit Architecture](#circuit-architecture)
- [Circuit Details](#circuit-details)
- [Installation](#installation)
- [Compilation](#compilation)
- [Proof Generation](#proof-generation)
- [Trusted Setup](#trusted-setup)
- [Verifier Deployment](#verifier-deployment)
- [Testing](#testing)
- [Integration](#integration)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🌉 Overview

The Meridian Link bridge uses zero-knowledge proofs to verify cross-chain deposits without revealing sensitive information. Three Circom circuits enable secure, privacy-preserving token transfers:

### Circuits Overview

**1. SolDepositProof** - Solana → EVM Transfers
- **Purpose:** Proves valid deposit on Solana for withdrawal on EVM chains
- **Inputs:** Light Protocol compressed account proof, deposit record
- **Outputs:** Nullifier, commitment, validity flag
- **Complexity:** ~15,000 constraints

**2. EthDepositProof** - EVM → Solana Transfers  
- **Purpose:** Proves valid deposit on EVM for withdrawal on Solana
- **Inputs:** EVM deposit event data, Indexed Merkle Tree proof
- **Outputs:** New Merkle root, nullifier
- **Complexity:** ~8,000 constraints

**3. EthDepositNullifier** - Helper Circuit
- **Purpose:** Computes unique nullifier for EVM deposits
- **Inputs:** Deposit event parameters
- **Outputs:** Poseidon hash (nullifier)
- **Complexity:** ~1,000 constraints

### Key Features

✅ **Groth16 SNARKs** - Fast proof generation and verification  
✅ **Poseidon Hashing** - Optimized for zkSNARKs  
✅ **Merkle Proofs** - Efficient state verification  
✅ **Nullifier System** - Prevents double-spending  
✅ **Commitment Scheme** - Binds all transaction parameters  
✅ **Privacy-Preserving** - Sensitive data stays private  
✅ **EVM Compatible** - Verifier contracts deploy to any EVM chain  

## 🏗️ Circuit Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Circom ZK Circuits                       │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐      ┌──────────────────────┐  │
│  │  SolDepositProof    │      │  EthDepositProof     │  │
│  │  (Solana → EVM)     │      │  (EVM → Solana)      │  │
│  └──────────┬──────────┘      └──────────┬───────────┘  │
│             │                            │               │
│             │  ┌────────────────────┐    │               │
│             └─►│  Poseidon Hashing  │◄───┘               │
│                │  (ZK-Friendly)     │                    │
│                └────────────────────┘                    │
│                          │                               │
│             ┌────────────┴────────────┐                  │
│             │                         │                  │
│    ┌────────▼─────────┐    ┌─────────▼────────┐        │
│    │ Merkle Proof     │    │ IMT Insertion     │        │
│    │ Verification     │    │ (Indexed Tree)    │        │
│    │ (Light Protocol) │    │                   │        │
│    └──────────────────┘    └───────────────────┘        │
│                                                            │
└──────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
    Groth16 Proof                  Groth16 Proof
    (to EVM Verifier)              (to Solana Program)
```

### Directory Structure

```
circom/
├── solDepositProof.circom          # Main circuit: Solana → EVM
├── ethDepositProof.circom          # Main circuit: EVM → Solana
├── ethDepositNullifier.circom      # Helper: Nullifier computation
│
├── solDepositProof_js/             # Compiled WASM + witness gen
│   ├── solDepositProof.wasm
│   ├── generate_witness.js
│   └── witness.wtns
│
├── ethDepositProof_js/             # Compiled WASM + witness gen
│   ├── ethDepositProof.wasm
│   └── generate_witness.js
│
├── *.r1cs                          # Rank-1 Constraint Systems
├── *.sym                           # Symbol files
├── *.zkey                          # Proving/verification keys
│
├── verification_key.json           # Verification key
├── proof.json                      # Example proof
├── public.json                     # Example public inputs
├── verifier.sol                    # Solidity verifier contract
│
├── pot15_final.ptau                # Powers of Tau ceremony file
├── Makefile                        # Build automation
├── package.json                    # Dependencies
└── scripts/
    └── generate-solana-deposit-proof-circuit-input.ts.ts
```

## 📝 Circuit Details

### 1. SolDepositProof Circuit

**File:** `solDepositProof.circom`  
**Purpose:** Proves a valid deposit on Solana for withdrawal on EVM chains.

#### Circuit Components

**a) VerifyMerkleProof Template**

Verifies Light Protocol Merkle tree inclusion.

```circom
template VerifyMerkleProof(levels) {
    signal input leaf;              // Compressed account hash
    signal input root;              // Light Protocol state root
    signal input pathElements[levels];  // Merkle proof siblings
    signal input pathIndices[levels];   // Path direction (0=left, 1=right)
    
    // Computes root using Poseidon hash
    // Verifies: computed_root === root
}
```

**b) ComputeNullifier Template**

Creates unique nullifier to prevent double-spending.

```circom
template ComputeNullifier() {
    signal input depositId;
    signal input sourceChainId;
    signal input destChainId;
    signal input amount;
    signal input mint;
    signal input owner;
    signal input timestamp;
    
    signal output nullifier;
    
    // nullifier = Poseidon(depositId, sourceChainId, destChainId, 
    //                      amount, mint, owner, timestamp)
}
```

**c) ComputeCommitment Template**

Binds all transaction parameters in a commitment.

```circom
template ComputeCommitment() {
    signal input amount;
    signal input destChainAddr;
    signal input destChainId;
    signal input depositId;
    signal input nullifier;
    
    signal output commitment;
    
    // commitment = Poseidon(amount, destChainAddr, destChainId,
    //                       depositId, nullifier)
}
```

**d) Main Circuit**

```circom
template SolDepositProof(MERKLE_LEVELS) {
    // PUBLIC INPUTS (known to EVM verifier)
    signal input stateRoot;         // Light Protocol state tree root
    signal input amount;            // Withdrawal amount
    signal input destChainId;       // Target EVM chain ID
    signal input destChainAddr;     // Recipient address on EVM
    
    // PRIVATE INPUTS (from Light Protocol proof)
    signal input accountHash;       // Compressed account hash
    signal input leafIndex;         // Position in tree
    signal input merkleProof[MERKLE_LEVELS];
    signal input pathIndices[MERKLE_LEVELS];
    
    // PRIVATE INPUTS (from deposit record)
    signal input owner;             // Solana depositor
    signal input sourceChainId;     // Solana chain ID (1)
    signal input mint;              // Token mint
    signal input timestamp;         // Deposit time
    signal input depositId;         // Unique ID
    signal input dataHash;          // Account data hash
    
    // PUBLIC OUTPUTS
    signal output nullifier;        // Unique identifier
    signal output commitment;       // Transaction commitment
    signal output isValid;         // Validation flag
    
    // CONSTRAINTS
    // 1. Verify Merkle inclusion proof
    // 2. Compute nullifier
    // 3. Compute commitment
    // 4. Validate: sourceChain = 1 (Solana)
    // 5. Validate: amount > 0
    // 6. Validate: depositId > 0
    // 7. Validate: timestamp > 0
}

// Instantiate with 26 levels (Light Protocol depth)
component main {public [stateRoot, amount, destChainId, destChainAddr]} 
    = SolDepositProof(26);
```

#### Input Requirements

**Public Inputs (4):**
```json
{
  "stateRoot": "12345...",      // Light Protocol state root (from RPC)
  "amount": "1000000",          // Withdrawal amount in smallest unit
  "destChainId": "1",           // Ethereum mainnet (1), Polygon (137), etc.
  "destChainAddr": "0x123..."   // Recipient address (as field element)
}
```

**Private Inputs (from Light Protocol):**
```json
{
  "accountHash": "98765...",    // From getCompressedAccount().hash
  "leafIndex": "42",            // From proof.leafIndex
  "merkleProof": ["...", ...],  // From getCompressedAccountProof()
  "pathIndices": [0, 1, 0, ...], // Computed from leafIndex
  "owner": "67890...",          // Solana public key as field element
  "sourceChainId": "1",         // Solana = 1
  "mint": "54321...",           // Token mint as field element
  "timestamp": "1704067200",    // Unix timestamp
  "depositId": "1",             // Unique deposit counter
  "dataHash": "13579..."        // Account data hash
}
```

#### Output Format

**Public Signals (4):**
```json
[
  "nullifier",      // Unique nullifier for replay protection
  "commitment",     // Commitment binding parameters
  "isValid",        // Always 1 if proof succeeds
  "stateRoot"       // Echo of input (for verification)
]
```

### 2. EthDepositProof Circuit

**File:** `ethDepositProof.circom`  
**Purpose:** Proves a valid deposit on EVM for withdrawal on Solana using Indexed Merkle Trees.

#### Circuit Overview

```circom
template EthDepositProof(depthI) {
    // INPUTS - EVM deposit event data
    signal input depositor;         // EVM depositor address
    signal input sourceChainId;     // EVM chain ID
    signal input destChainId;       // Solana chain ID (1)
    signal input destChainAddr;     // Solana recipient
    signal input destChainMintAddr; // Solana token mint
    signal input tokenMint;         // EVM token address
    signal input amount;            // Transfer amount
    signal input timestamp;         // Deposit time
    signal input depositId;         // Unique ID
    signal input nullifier;         // Expected nullifier
    
    // INPUTS - IMT (Indexed Merkle Tree) membership proof
    signal input pre_val;           // Previous value in tree
    signal input pre_next;          // Previous next pointer
    signal input path[depthI];      // Merkle proof path
    signal input dirs[depthI];      // Path directions
    signal input old_root;          // Old Merkle root
    
    // OUTPUTS
    signal output nullifierComputed; // Computed nullifier
    signal output new_root;          // New Merkle root after insertion
    
    // CONSTRAINTS
    // 1. Compute nullifier from deposit data
    // 2. Verify nullifier matches input
    // 3. Perform IMT insertion
    // 4. Output new root
}

component main = EthDepositProof(32);
```

#### Indexed Merkle Tree (IMT)

Unlike standard Merkle trees, IMTs:
- **Maintain sorted order** of leaves
- **Enable non-membership proofs** (prove element NOT in set)
- **Support efficient insertions** without rebuilding
- **Prevent nullifier collisions**

**IMT Operations:**
1. Check nullifier not already in tree (non-membership)
2. Insert nullifier in sorted position
3. Update neighboring pointers
4. Compute new Merkle root

#### Input Requirements

**EVM Deposit Data:**
```json
{
  "depositor": "1390849...",        // EVM address as field element
  "sourceChainId": "31337",         // Hardhat local (31337), Ethereum (1)
  "destChainId": "1",               // Solana = 1
  "destChainAddr": "44750...",      // Solana pubkey as field element
  "destChainMintAddr": "44750...",  // Solana mint as field element
  "tokenMint": "126038...",         // EVM token as field element
  "amount": "100",                  // Amount in smallest unit
  "timestamp": "1750526164",        // Unix timestamp
  "depositId": "14"                 // Unique counter
}
```

**IMT Proof Data:**
```json
{
  "pre_val": "0",                   // Previous value (0 for new)
  "pre_next": "16576...",           // Next pointer
  "path": ["11882...", ...],        // 32 Merkle siblings
  "dirs": [0, 0, 0, ...],           // 32 directions
  "old_root": "11601...",           // Current root
  "nullifier": "12482..."           // Expected nullifier
}
```

### 3. EthDepositNullifier Circuit

**File:** `ethDepositNullifier.circom`  
**Purpose:** Helper circuit to compute nullifiers for EVM deposits.

```circom
template DepositNullifier() {
    // INPUTS - deposit event parameters
    signal input depositor;
    signal input sourceChainId;
    signal input destChainId;
    signal input destChainAddr;
    signal input destChainMintAddr;
    signal input tokenMint;
    signal input amount;
    signal input timestamp;
    signal input despositId;    // Note: typo in original
    
    // OUTPUT
    signal output nullifier;
    
    // Compute Poseidon hash of all 9 inputs
    component poseidon = Poseidon(9);
    // ... hash all inputs
    nullifier <== poseidon.out;
}
```

**Usage:** Pre-compute nullifiers before generating full EthDepositProof.

## 🚀 Installation

### Prerequisites

```bash
# Node.js 18+
node --version

# Circom 2.1.8+
circom --version

# Install Circom (if not installed)
# Method 1: From source
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Method 2: Direct install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
git clone https://github.com/iden3/circom.git
cd circom && cargo install --path circom

# Verify installation
circom --version  # Should show 2.1.8 or higher
```

### Setup

```bash
# Navigate to circom directory
cd circom

# Install dependencies
npm install

# Or with yarn
yarn install

# Install snarkjs globally (for proof generation)
npm install -g snarkjs
```

### Dependencies

```json
{
  "@jayanth-kumar-morem/indexed-merkle-tree": "^1.1.2",
  "@lightprotocol/stateless.js": "^0.22.0",
  "@noble/hashes": "^1.8.0",
  "@solana/web3.js": "^1.98.2",
  "bn.js": "^5.2.2",
  "bs58": "^6.0.0",
  "circomlib": "^2.0.5",
  "ethers": "^6.14.4",
  "poseidon-lite": "^0.3.0"
}
```

## 🔨 Compilation

### Quick Build

Using the Makefile:

```bash
# Compile SolDepositProof circuit
make sol_deposit_proof
```

This runs the complete workflow:
1. Compile circuit → R1CS + WASM
2. Generate witness from test input
3. Perform trusted setup
4. Generate proof
5. Verify proof
6. Export Solidity verifier

### Manual Compilation

**Step 1: Compile Circuit**

```bash
# Compile SolDepositProof
circom solDepositProof.circom \
  --r1cs \              # Generate R1CS constraint system
  --wasm \              # Generate WASM for witness
  --sym \               # Generate symbol table
  --O2                  # Optimization level 2

# Compile EthDepositProof
circom ethDepositProof.circom --r1cs --wasm --sym --O2

# Compile EthDepositNullifier
circom ethDepositNullifier.circom --r1cs --wasm --sym --O2
```

**Output files:**
- `*.r1cs` - Rank-1 Constraint System (circuit definition)
- `*_js/*.wasm` - WebAssembly for witness generation
- `*_js/generate_witness.js` - Witness generator script
- `*.sym` - Symbol table for debugging

**Step 2: Verify Compilation**

```bash
# Check constraint count
snarkjs r1cs info solDepositProof.r1cs

# Output:
# [INFO]  snarkJS: Constraints: 15234
# [INFO]  snarkJS: Private Inputs: 42
# [INFO]  snarkJS: Public Inputs: 4
# [INFO]  snarkJS: Labels: 15287
# [INFO]  snarkJS: Outputs: 3
```

### Circuit Statistics

| Circuit | Constraints | Private Inputs | Public Inputs | Outputs |
|---------|-------------|----------------|---------------|---------|
| SolDepositProof | ~15,000 | 42 | 4 | 3 |
| EthDepositProof | ~8,000 | 75 | 0 | 2 |
| EthDepositNullifier | ~1,000 | 9 | 0 | 1 |

## 🎯 Proof Generation

### Complete Workflow

#### 1. Generate Circuit Inputs

**For SolDepositProof:**

```bash
# Run input generation script
npx esrun ./scripts/generate-solana-deposit-proof-circuit-input.ts

# Output: config/sol_deposit_proof_circom_circuit_input.json
```

**Manual Input Generation:**

```typescript
import { createRpc } from '@lightprotocol/stateless.js';
import { PublicKey } from '@solana/web3.js';

async function generateInputs() {
  const rpc = createRpc(RPC_URL, PROVER_URL, INDEXER_URL);
  
  // 1. Fetch compressed account
  const account = await rpc.getCompressedAccount(
    bn(depositRecordAddress.toBytes())
  );
  
  // 2. Fetch Merkle proof
  const proof = await rpc.getCompressedAccountProof(account.hash);
  
  // 3. Decode deposit record
  const record = decodeDepositRecord(account.data);
  
  // 4. Convert to circuit inputs
  const circuitInputs = {
    // Public
    stateRoot: proof.root.toString(),
    amount: record.amount.toString(),
    destChainId: record.dest_chain_id.toString(),
    destChainAddr: addressToFieldElement(record.dest_chain_addr),
    
    // Private
    accountHash: account.hash.toString(),
    leafIndex: proof.leafIndex.toString(),
    merkleProof: proof.proof.map(p => p.toString()),
    pathIndices: computePathIndices(proof.leafIndex),
    owner: publicKeyToFieldElement(record.owner),
    sourceChainId: "1",
    mint: publicKeyToFieldElement(record.mint),
    timestamp: record.timestamp.toString(),
    depositId: record.deposit_id.toString(),
    dataHash: computeDataHash(account.data)
  };
  
  return circuitInputs;
}
```

#### 2. Generate Witness

```bash
cd solDepositProof_js

node generate_witness.js \
  solDepositProof.wasm \
  ../input.json \
  witness.wtns

cd ..
```

**Output:** `witness.wtns` - Binary witness file containing all wire values.

#### 3. Generate Proof

```bash
snarkjs groth16 prove \
  1_0000.zkey \
  solDepositProof_js/witness.wtns \
  proof.json \
  public.json
```

**Outputs:**
- `proof.json` - The Groth16 proof (π)
- `public.json` - Public inputs/outputs

**proof.json format:**
```json
{
  "pi_a": ["...", "...", "1"],
  "pi_b": [["...", "..."], ["...", "..."], ["1", "0"]],
  "pi_c": ["...", "...", "1"],
  "protocol": "groth16",
  "curve": "bn128"
}
```

#### 4. Verify Proof (Local)

```bash
snarkjs groth16 verify \
  verification_key.json \
  public.json \
  proof.json

# Output: [INFO] snarkJS: OK!
```

#### 5. Format for Smart Contract

**Convert to Solidity format:**

```typescript
import { ethers } from 'ethers';

function formatProofForSolidity(proof: any) {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]]
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
    input: proof.publicSignals
  };
}

const solidityProof = formatProofForSolidity(proof);

// Submit to contract
await bridgeContract.processWithdrawal(
  depositRecord,
  solidityProof.a,
  solidityProof.b,
  solidityProof.c,
  solidityProof.input
);
```

### Automated Script

**Complete end-to-end script:**

```typescript
async function generateAndSubmitProof(depositAddress: PublicKey) {
  // 1. Generate inputs
  const inputs = await generateCircuitInputs(depositAddress);
  fs.writeFileSync('input.json', JSON.stringify(inputs, null, 2));
  
  // 2. Generate witness
  await exec(
    'node solDepositProof_js/generate_witness.js ' +
    'solDepositProof_js/solDepositProof.wasm ' +
    'input.json witness.wtns'
  );
  
  // 3. Generate proof
  await exec(
    'snarkjs groth16 prove 1_0000.zkey witness.wtns ' +
    'proof.json public.json'
  );
  
  // 4. Verify locally
  const verifyResult = await exec(
    'snarkjs groth16 verify verification_key.json ' +
    'public.json proof.json'
  );
  
  if (!verifyResult.includes('OK')) {
    throw new Error('Proof verification failed');
  }
  
  // 5. Format and submit
  const proof = JSON.parse(fs.readFileSync('proof.json'));
  const formattedProof = formatProofForSolidity(proof);
  
  const tx = await bridgeContract.processWithdrawal(
    depositRecord,
    formattedProof.a,
    formattedProof.b,
    formattedProof.c,
    formattedProof.input
  );
  
  return tx.wait();
}
```

## 🔐 Trusted Setup

### Development Setup (Testing Only)

⚠️ **WARNING:** Never use development keys in production!

```bash
# Download Powers of Tau (development)
make download_pot15_final_ptau

# Or manual download
curl https://raw.githubusercontent.com/darkforest-eth/circuits/refs/heads/master/pot15_final.ptau \
  --output pot15_final.ptau

# Generate proving/verification keys
snarkjs groth16 setup \
  solDepositProof.r1cs \
  pot15_final.ptau \
  circuit_0000.zkey

# Contribute to key (single contribution - dev only)
snarkjs zkey contribute \
  circuit_0000.zkey \
  1_0000.zkey \
  --name="First contribution" \
  -v

# Export verification key
snarkjs zkey export verificationkey \
  1_0000.zkey \
  verification_key.json
```

### Production Setup (Multi-Party)

**Phase 1: Powers of Tau**

```bash
# Start ceremony
snarkjs powersoftau new bn128 20 pot20_0000.ptau -v

# Contributor 1
snarkjs powersoftau contribute \
  pot20_0000.ptau \
  pot20_0001.ptau \
  --name="Contributor 1" \
  -v -e="random entropy 1"

# Contributor 2
snarkjs powersoftau contribute \
  pot20_0001.ptau \
  pot20_0002.ptau \
  --name="Contributor 2" \
  -v -e="random entropy 2"

# ... More contributors (5+ recommended)

# Contributor N
snarkjs powersoftau contribute \
  pot20_000N.ptau \
  pot20_final.ptau \
  --name="Contributor N" \
  -v -e="random entropy N"

# Prepare phase 2
snarkjs powersoftau prepare phase2 \
  pot20_final.ptau \
  pot20_final.ptau \
  -v
```

**Phase 2: Circuit-Specific Setup**

```bash
# Generate initial zkey
snarkjs groth16 setup \
  solDepositProof.r1cs \
  pot20_final.ptau \
  circuit_0000.zkey

# Contributor 1
snarkjs zkey contribute \
  circuit_0000.zkey \
  circuit_0001.zkey \
  --name="Circuit Contributor 1" \
  -v -e="random entropy 1"

# Contributor 2
snarkjs zkey contribute \
  circuit_0001.zkey \
  circuit_0002.zkey \
  --name="Circuit Contributor 2" \
  -v -e="random entropy 2"

# ... More contributors

# Final key
snarkjs zkey contribute \
  circuit_000N.zkey \
  circuit_final.zkey \
  --name="Circuit Contributor N" \
  -v -e="random entropy N"

# Verify contributions
snarkjs zkey verify \
  solDepositProof.r1cs \
  pot20_final.ptau \
  circuit_final.zkey

# Export verification key
snarkjs zkey export verificationkey \
  circuit_final.zkey \
  verification_key.json

# Export beacon (for transparency)
snarkjs zkey beacon \
  circuit_000N.zkey \
  circuit_final.zkey \
  0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f \
  10 \
  -n="Final Beacon"
```

**Best Practices:**
- **Minimum 5 contributors** (more is better)
- **Independent contributions** (don't reuse entropy)
- **Secure environments** (air-gapped machines)
- **Destroy intermediate keys** after contribution
- **Publish contribution hashes** for transparency
- **Use random beacon** for final randomness

## 📤 Verifier Deployment

### Export Solidity Verifier

```bash
snarkjs zkey export solidityverifier \
  1_0000.zkey \
  verifier.sol
```

**Generated contract:**
```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Verification Key values
    uint256 constant alphax = ...;
    uint256 constant alphay = ...;
    // ... more key values
    
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) public view returns (bool r) {
        // Pairing check implementation
        // ...
    }
}
```

### Deploy Verifier

**Using Hardhat:**

```typescript
import { ethers } from 'hardhat';
import fs from 'fs';

async function deployVerifier() {
  const Verifier = await ethers.getContractFactory('Groth16Verifier');
  const verifier = await Verifier.deploy();
  await verifier.deployed();
  
  console.log('Verifier deployed at:', verifier.address);
  
  // Save address
  fs.writeFileSync(
    '../config/verifier_address.json',
    JSON.stringify({ address: verifier.address })
  );
  
  return verifier;
}
```

### Integration with Bridge

**Update bridge contract:**

```solidity
import "./Groth16Verifier.sol";

contract SolanaEVMBridge {
    Groth16Verifier public verifier;
    
    constructor(address _verifier) {
        verifier = Groth16Verifier(_verifier);
    }
    
    function processWithdrawal(
        DepositRecord calldata record,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input
    ) external {
        // Verify proof
        require(
            verifier.verifyProof(a, b, c, input),
            "Invalid proof"
        );
        
        // Process withdrawal
        // ...
    }
}
```

## 🧪 Testing

### Unit Tests

**Test circuit constraints:**

```bash
# Install testing dependencies
npm install --save-dev circom_tester

# Create test file
```

**test/solDepositProof.test.ts:**

```typescript
import { wasm as wasmTester } from 'circom_tester';
import path from 'path';

describe('SolDepositProof Circuit', function() {
  let circuit: any;
  
  before(async () => {
    circuit = await wasmTester(
      path.join(__dirname, '../solDepositProof.circom'),
      { include: ['node_modules'] }
    );
  });
  
  it('Should generate valid proof with correct inputs', async () => {
    const input = {
      stateRoot: "12345...",
      amount: "1000000",
      // ... all other inputs
    };
    
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
  });
  
  it('Should reject proof with invalid Merkle path', async () => {
    const input = {
      // ... inputs with wrong merkleProof
    };
    
    await expect(
      circuit.calculateWitness(input)
    ).to.be.rejected;
  });
  
  it('Should reject amount = 0', async () => {
    const input = {
      // ... inputs with amount = 0
    };
    
    await expect(
      circuit.calculateWitness(input)
    ).to.be.rejected;
  });
});
```

### Integration Tests

**End-to-end proof generation and verification:**

```typescript
describe('Proof Generation and Verification', () => {
  it('Should generate and verify proof', async () => {
    // 1. Generate inputs from real Solana data
    const inputs = await generateCircuitInputs(depositAddress);
    
    // 2. Generate witness
    const witness = await generateWitness(inputs);
    
    // 3. Generate proof
    const { proof, publicSignals } = await generateProof(witness);
    
    // 4. Verify locally
    const isValid = await verifyProof(proof, publicSignals);
    expect(isValid).to.be.true;
    
    // 5. Verify on-chain
    const result = await verifier.verifyProof(
      proof.a,
      proof.b,
      proof.c,
      publicSignals
    );
    expect(result).to.be.true;
  });
});
```

### Run Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Specific test file
npm test test/solDepositProof.test.ts
```

## 🔗 Integration

### With Relayer Service

**relayer-ts integration:**

```typescript
import { generateProof } from './zkProofs';

async function processDeposit(depositAddress: PublicKey) {
  // 1. Fetch deposit data
  const depositData = await fetchDepositFromSolana(depositAddress);
  
  // 2. Generate circuit inputs
  const circuitInputs = await generateCircuitInputs(depositData);
  
  // 3. Generate ZK proof
  const { proof, publicSignals } = await generateProof(
    circuitInputs,
    'solDepositProof'
  );
  
  // 4. Submit to EVM
  await submitToEvmBridge(depositData, proof, publicSignals);
}
```

### With Frontend

**web integration:**

```typescript
// In browser using snarkjs
import * as snarkjs from 'snarkjs';

async function generateProofInBrowser(inputs: any) {
  // Load WASM and zkey
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    '/circuits/solDepositProof.wasm',
    '/circuits/circuit_final.zkey'
  );
  
  return formatProofForSolidity(proof);
}
```

**Note:** Proof generation in browser takes 5-30 seconds depending on circuit size.

## 🔒 Security

### Security Considerations

**1. Trusted Setup**
- Use multi-party ceremony (5+ contributors)
- Verify all contributions
- Publish ceremony transcript
- Use random beacon for final randomness

**2. Circuit Security**
- Audit circuit logic
- Test edge cases
- Verify constraint completeness
- Check for under-constrained signals

**3. Input Validation**
- Validate all inputs before proof generation
- Check ranges (e.g., amount > 0)
- Verify Merkle proofs
- Sanitize address conversions

**4. Nullifier Security**
- Ensure nullifiers are unique
- Check nullifier hasn't been used
- Use cryptographically secure hash (Poseidon)

### Common Vulnerabilities

**Under-constrained Circuits:**
```circom
// BAD: Missing constraint
signal x;
signal y;
// Missing: x === y

// GOOD: Properly constrained
signal x;
signal y;
x === y;
```

**Non-deterministic Circuits:**
```circom
// BAD: Division can have multiple solutions
signal output result;
result <-- input / divisor;

// GOOD: Use proper constraints
signal output result;
result * divisor === input;
```

### Audit Checklist

- [ ] All signals properly constrained
- [ ] No under-constrained branches
- [ ] Range checks on all numeric inputs
- [ ] Merkle proof verification complete
- [ ] Nullifier computation correct
- [ ] No information leaks in public signals
- [ ] Trusted setup ceremony completed
- [ ] Multiple independent code reviews
- [ ] Formal verification (if possible)
- [ ] Extensive testing with edge cases

## 🐛 Troubleshooting

### Common Issues

#### Circuit Compilation Fails

**Error: "Include not found"**
```
Cause: Missing circomlib dependency
Solution:
  npm install circomlib
  # Or specify include path
  circom circuit.circom -l node_modules
```

#### Witness Generation Fails

**Error: "Signal not assigned"**
```
Cause: Missing or invalid input value
Solution:
  1. Check all required inputs are provided
  2. Verify input types match (string numbers for big integers)
  3. Ensure no null/undefined values
```

**Error: "Assert Failed"**
```
Cause: Constraint violation
Solution:
  1. Check input values satisfy all constraints
  2. Verify Merkle proof is valid
  3. Ensure amount > 0
  4. Check timestamp is reasonable
```

#### Proof Generation Fails

**Error: "zkey file not found"**
```
Cause: Trusted setup not completed
Solution:
  Run trusted setup:
  snarkjs groth16 setup circuit.r1cs pot.ptau circuit.zkey
```

**Error: "Out of memory"**
```
Cause: Circuit too large for available RAM
Solution:
  1. Increase Node.js memory:
     NODE_OPTIONS="--max-old-space-size=8192" snarkjs groth16 prove ...
  2. Use machine with more RAM
  3. Optimize circuit (reduce constraints)
```

#### Verification Fails

**Error: "Invalid proof"**
```
Cause: Proof doesn't match verification key or public inputs
Solution:
  1. Verify zkey matches circuit
  2. Check public inputs match
  3. Ensure proof format is correct
  4. Regenerate proof with correct inputs
```

### Debug Commands

```bash
# Check circuit info
snarkjs r1cs info circuit.r1cs

# Print circuit constraints
snarkjs r1cs print circuit.r1cs circuit.sym

# Verify zkey
snarkjs zkey verify circuit.r1cs pot.ptau circuit.zkey

# Check witness values
snarkjs wtns export json witness.wtns witness.json
cat witness.json

# Test proof locally
snarkjs groth16 verify verification_key.json public.json proof.json
```

### Performance Optimization

**Reduce constraint count:**
```circom
// Use optimized templates from circomlib
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";

// Minimize for loops
// Use constant-time operations where possible
```

**Speed up proof generation:**
```bash
# Use multi-threading
export RAYON_NUM_THREADS=8

# Enable WASM optimization
circom circuit.circom --wasm --O2

# Use faster proving algorithm (if available)
snarkjs groth16 prove --rapid circuit.zkey witness.wtns proof.json public.json
```

## 📚 Additional Resources

### Related Documentation

- [Main README](../README.md) - Overall system
- [EVM Bridge](../evm-bridge/README.md) - Smart contracts
- [Solana Bridge](../sol-bridge/README.md) - Solana program
- [Relayer Service](../relayer-ts/README.md) - Backend coordinator

### External Resources

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Guide](https://github.com/iden3/snarkjs)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [Circomlib Library](https://github.com/iden3/circomlib)
- [ZK Proof Systems](https://zkp.science/)
- [Light Protocol Docs](https://www.lightprotocol.com/docs)

### Development Tools

- **Circom** - Circuit compiler
- **snarkjs** - ZK proof toolkit
- **circom_tester** - Testing framework
- **circomlib** - Standard circuit library

## 📞 Support

For questions or issues specific to the ZK circuits:

- **General Questions:** hello@meridianlink.io
- **Technical Support:** dev@meridianlink.io
- **Security Issues:** security@meridianlink.io (PGP key available)

## 🤝 Contributing

### Circuit Development

1. **Design circuit logic**
2. **Implement in Circom**
3. **Write unit tests**
4. **Optimize constraints**
5. **Document thoroughly**
6. **Submit for review**

### Code Style

- Use descriptive signal names
- Comment complex logic
- Group related constraints
- Follow circomlib patterns
- Test edge cases

---

**Part of the [Meridian Link](https://deepwiki.com/RippnerLabs/meridian-link) Cross-Chain Bridge System**

*Zero-knowledge proofs enabling private, secure cross-chain transfers*

