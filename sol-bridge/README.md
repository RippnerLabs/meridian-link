# Solana Bridge Program - Meridian Link

[![Part of Meridian Link](https://img.shields.io/badge/Meridian-Link-blue)](https://deepwiki.com/RippnerLabs/meridian-link)

Solana smart contract (Anchor program) for the Meridian Link cross-chain token bridge. Built with Anchor Framework and Light Protocol for state compression, enabling efficient and cost-effective token transfers between Solana and EVM-compatible chains.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Program Instructions](#program-instructions)
- [State Structures](#state-structures)
- [Light Protocol Integration](#light-protocol-integration)
- [Installation](#installation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Integration](#integration)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🌉 Overview

The Solana Bridge Program is the Solana-side implementation of Meridian Link, managing deposits and withdrawals of tokens in cross-chain transfers. It leverages Light Protocol's state compression to dramatically reduce storage costs while maintaining security and composability.

**Program ID:** `82ZuVtSrqVWfmuxH34R9ASdwLJ6TTNxGyBeBXbeZMycP`

### Key Features

✅ **State Compression** - Uses Light Protocol compressed accounts to reduce costs  
✅ **Secure Deposits** - Creates tamper-proof deposit records on-chain  
✅ **Token Vault Management** - Manages liquidity pools for bidirectional transfers  
✅ **ZK Proof Verification** - Verifies Ethereum deposits using zero-knowledge proofs  
✅ **Nullifier System** - Prevents double-spending with unique withdrawal identifiers  
✅ **Multi-Token Support** - Bridge any SPL token to EVM chains  
✅ **Atomic Operations** - All-or-nothing transaction guarantees  

### Role in Bridge Ecosystem

```
┌──────────────────────────────────────────────────────┐
│              Solana Bridge Program                    │
├──────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────┐      ┌──────────────────┐       │
│  │  Deposit       │      │   Withdrawal      │       │
│  │  (Sol → EVM)   │      │   (EVM → Sol)     │       │
│  └────────┬───────┘      └────────┬──────────┘       │
│           │                       │                   │
│           ▼                       ▼                   │
│  ┌─────────────────────────────────────────┐         │
│  │   Compressed Account Storage            │         │
│  │   (Light Protocol Integration)          │         │
│  └─────────────────────────────────────────┘         │
│           │                       │                   │
│           ▼                       ▼                   │
│  ┌─────────────────────────────────────────┐         │
│  │        Token Vault Management           │         │
│  │      (SPL Token Lock/Release)           │         │
│  └─────────────────────────────────────────┘         │
│                                                        │
└──────────────────────────────────────────────────────┘
         ↓                                    ↑
    Record Created                      Proof Verified
    (sent to Relayer)                  (from EVM)
```

## 🏗️ Architecture

### Program Structure

```
sol-bridge/
├── programs/
│   └── cross-chain-token-bridge/
│       └── src/
│           ├── lib.rs                  # Main program entry point
│           ├── state.rs                # Account state structures
│           ├── error.rs                # Custom error types
│           ├── instructions/
│           │   ├── init.rs             # Initialize bridge
│           │   ├── init_token_bridge.rs # Token bridge config
│           │   ├── deposit.rs          # Deposit to EVM
│           │   ├── deposit_to_vault.rs # Add liquidity
│           │   ├── withdraw.rs         # Withdraw from EVM
│           │   └── init_withdrawal_proof_account.rs
│           └── zk/
│               ├── verifier.rs         # ZK proof verifier
│               └── eth_deposit_verifying_key.rs
│
├── tests/
│   └── test.ts                         # Integration tests
├── Anchor.toml                         # Anchor configuration
└── Cargo.toml                          # Rust dependencies
```

### Technology Stack

**Framework:**
- **Anchor** - v0.30.1 - Solana development framework
- **Rust** - Edition 2021 - Systems programming language

**Key Dependencies:**
```toml
[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
light-sdk = "0.12.0"
light-hasher = "1.0.0"
light-merkle-tree-reference = "1.1.0"
light-verifier = "1.0.0"
```

**Light Protocol Components:**
- `light-sdk` - Compressed account primitives
- `light-hasher` - Poseidon hash function
- `light-merkle-tree-reference` - Merkle tree operations
- `light-verifier` - ZK proof verification

## 📝 Program Instructions

### 1. Initialize Bridge

**Function:** `init()`

Initializes the bridge state account that tracks deposit and withdrawal counts.

```rust
pub fn init(ctx: Context<InitContext>) -> Result<()>
```

**Accounts:**
- `signer` - The bridge authority (payer)
- `bridge_state` - PDA storing bridge counters

**PDA Derivation:**
```rust
seeds = [b"bridge_state"]
```

**State Initialized:**
```rust
pub struct BridgeState {
    pub deposit_count: u128,   // Total deposits
    pub withdraw_count: u128,  // Total withdrawals
}
```

**Example Usage:**
```typescript
await program.methods
  .init()
  .accounts({
    signer: authority.publicKey,
  })
  .rpc();
```

### 2. Initialize Token Bridge

**Function:** `init_token_bridge()`

Creates a bidirectional token mapping between Solana and an EVM chain.

```rust
pub fn init_token_bridge(
    ctx: Context<InitTokenBridgeContext>,
    source_chain: u32,
    source_chain_mint_addr: String,
    dest_chain: u32,
    dest_chain_mint_addr: String,
    link_hash: String,
) -> Result<()>
```

**Parameters:**
- `source_chain` - Source chain ID (1 for Solana, 31337 for Hardhat, etc.)
- `source_chain_mint_addr` - Token mint on source chain
- `dest_chain` - Destination chain ID
- `dest_chain_mint_addr` - Token address on destination
- `link_hash` - Unique hash identifying this bridge link

**Link Hash Generation:**
```typescript
const linkHash = createHash('sha256')
  .update(`${sourceChain}_${sourceMint}_${destChain}_${destMint}`)
  .digest('hex')
  .slice(0, 16);
```

**PDA Derivation:**
```rust
seeds = [b"tb", link_hash.as_bytes()]
```

**Example Usage:**
```typescript
const SOLANA_CHAIN_ID = 1;
const ETHEREUM_CHAIN_ID = 1;

await program.methods
  .initTokenBridge(
    SOLANA_CHAIN_ID,
    solanaMint.toString(),
    ETHEREUM_CHAIN_ID,
    ethereumTokenAddress,
    linkHash
  )
  .accounts({ signer: authority.publicKey })
  .rpc();
```

### 3. Deposit to Vault

**Function:** `deposit_to_vault()`

Deposits tokens into the bridge vault to provide liquidity for withdrawals.

```rust
pub fn deposit_to_vault(
    ctx: Context<DepositToVaultContext>,
    amount: u64
) -> Result<()>
```

**Process:**
1. Transfers tokens from user's ATA to vault
2. Vault is a PDA-controlled token account
3. Provides liquidity for EVM → Solana withdrawals

**Accounts:**
- `signer` - Liquidity provider
- `mint` - SPL token mint
- `user_ata` - User's associated token account
- `token_vault` - Bridge vault PDA

**Vault PDA:**
```rust
seeds = [b"vault", mint.key().as_ref()]
```

**Example Usage:**
```typescript
const amount = new BN(1000 * 10**decimals);

await program.methods
  .depositToVault(amount)
  .accounts({
    signer: provider.publicKey,
    mint: tokenMint,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

### 4. Deposit (Solana → EVM)

**Function:** `deposit()`

Creates a compressed deposit record for cross-chain transfer to EVM.

```rust
pub fn deposit<'info>(
    ctx: Context<'_, '_, '_, 'info, DepositContext<'info>>,
    proof: ValidityProof,
    address_merkle_context: PackedAddressMerkleContext,
    output_merkle_tree_index: u8,
    amount: u64,
    link_hash: String,
    dest_chain_addr: String,
) -> Result<()>
```

**Parameters:**
- `proof` - Light Protocol validity proof for account creation
- `address_merkle_context` - Address tree context
- `output_merkle_tree_index` - Output tree index
- `amount` - Amount to transfer
- `link_hash` - Token bridge identifier
- `dest_chain_addr` - Recipient address on EVM (Base58-encoded)

**Process Flow:**

```
1. Validate amount > 0
   ↓
2. Transfer tokens from user to vault
   ↓
3. Increment deposit_count
   ↓
4. Derive deposit record address
   │  seeds: [b"deposit", signer, deposit_count_bytes]
   ↓
5. Create compressed account via Light Protocol CPI
   │  - DepositRecordCompressedAccount
   │  - Contains: owner, chains, amount, timestamp, etc.
   ↓
6. Emit DepositEvent with address
   ↓
7. Record is indexed by relayer
```

**Deposit Record Structure:**
```rust
pub struct DepositRecordCompressedAccount {
    pub owner: Pubkey,               // Depositor
    pub source_chain_id: u32,        // Solana (1)
    pub dest_chain_id: u32,          // Target EVM chain
    pub dest_chain_addr: String,     // EVM recipient
    pub dest_chain_mint_addr: String, // EVM token
    pub mint: Pubkey,                // Solana token mint
    pub amount: u64,                 // Transfer amount
    pub timestamp: i64,              // Unix timestamp
    pub deposit_id: u128,            // Unique ID
}
```

**Example Usage:**
```typescript
const proofRpcResult = await rpc.getValidityProofV0([], [
  {
    tree: addressTree,
    queue: addressQueue,
    address: depositRecordAddress,
  },
]);

await program.methods
  .deposit(
    { 0: proofRpcResult.compressedProof },
    packedAddressMerkleContext,
    outputMerkleTreeIndex,
    new BN(amount),
    linkHash,
    destChainAddr
  )
  .accounts({
    signer: user.publicKey,
    mint: tokenMint,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .remainingAccounts(remainingAccounts)
  .rpc();
```

**Compressed Account Benefits:**
- **Cost:** ~0.0001 SOL vs ~0.002 SOL for regular accounts
- **Storage:** Off-chain data with on-chain proof
- **Composability:** Full Solana compatibility

### 5. Withdraw (EVM → Solana)

**Function:** `withdraw()`

Processes withdrawal from EVM chain after ZK proof verification.

```rust
pub fn withdraw<'info>(
    ctx: Context<'_,'_,'_, 'info, WithdrawContext<'info>>,
    proof: ValidityProof,
    address_merkle_context: PackedAddressMerkleContext,
    output_merkle_tree_index: u8,
    amount: u64,
    link_hash: String,
    nullifier: [u8; 32],
) -> Result<()>
```

**Parameters:**
- `proof` - Light Protocol validity proof
- `address_merkle_context` - Address tree context
- `output_merkle_tree_index` - Output tree index
- `amount` - Withdrawal amount
- `link_hash` - Token bridge identifier
- `nullifier` - Unique nullifier from EVM deposit (prevents replay)

**Process Flow:**

```
1. Verify withdrawal proof account exists
   │  PDA: [b"withdrawal_proof", nullifier]
   ↓
2. Extract and verify ZK proof components
   │  - proof_a, proof_b, proof_c
   │  - nullifier, new_root
   ↓
3. Verify ZK proof using Groth16 verifier
   │  - Proves valid EVM deposit
   ↓
4. Check nullifier not already used
   ↓
5. Create withdrawal record (compressed account)
   │  seeds: [b"withdrawal", relayer, nullifier]
   ↓
6. Transfer tokens from vault to recipient
   ↓
7. Increment withdraw_count
```

**Withdrawal Record:**
```rust
pub struct WithdrawalRecordCompressedAccount {
    pub depositer: String,          // EVM depositor
    pub sourceChainId: u64,         // EVM chain ID
    pub destChainId: u64,           // Solana (1)
    pub destChainAddr: Pubkey,      // Solana recipient
    pub destChainMintAddr: Pubkey,  // Solana token
    pub tokenMint: String,          // EVM token
    pub amount: u64,                // Amount
    pub timestamp: i64,             // Timestamp
    pub withdrawalId: u128,         // Unique ID
}
```

**ZK Proof Verification:**

The program verifies Groth16 proofs that prove:
- Valid deposit occurred on EVM chain
- Deposit was included in EVM Merkle tree
- Nullifier is correctly computed
- All parameters match

**Example Usage:**
```typescript
// 1. Initialize withdrawal proof account
await program.methods
  .initWithdrawalProofAccount(
    withdrawalId,
    proof_a,
    proof_b,
    proof_c,
    nullifier,
    newRoot
  )
  .accounts({ signer: relayer.publicKey })
  .rpc();

// 2. Execute withdrawal
await program.methods
  .withdraw(
    { 0: lightProof.compressedProof },
    packedAddressMerkleContext,
    outputMerkleTreeIndex,
    new BN(amount),
    linkHash,
    nullifier
  )
  .accounts({
    relayer: relayer.publicKey,
    recipient: recipient.publicKey,
    mint: tokenMint,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .remainingAccounts(remainingAccounts)
  .rpc();
```

### 6. Initialize Withdrawal Proof Account

**Function:** `init_withdrawal_proof_account()`

Stores ZK proof data for a withdrawal from EVM.

```rust
pub fn init_withdrawal_proof_account(
    ctx: Context<InitWithdrawalProofAccountContext>,
    withdrawal_id: u128,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    nullifier: [u8; 32],
    new_root: [u8; 32]
) -> Result<()>
```

**Parameters:**
- `withdrawal_id` - Unique withdrawal identifier
- `proof_a`, `proof_b`, `proof_c` - Groth16 proof components
- `nullifier` - Unique nullifier from EVM
- `new_root` - Updated Merkle root after deposit

**Storage:**
```rust
pub struct WithdrawalProof {
    pub proof_a: [u8; 64],
    pub proof_b: [u8; 128],
    pub proof_c: [u8; 64],
    pub nullifier: [u8; 32],
    pub new_root: [u8; 32],
}
```

## 🗃️ State Structures

### BridgeState

Global bridge statistics stored as PDA.

```rust
#[account]
pub struct BridgeState {
    pub deposit_count: u128,
    pub withdraw_count: u128,
}
```

**PDA:** `[b"bridge_state"]`

### TokenBridge

Bidirectional token mapping configuration.

```rust
#[account]
pub struct TokenBridge {
    pub source_chain: u32,
    pub source_chain_mint_addr: String,
    pub dest_chain: u32,
    pub dest_chain_mint_addr: String,
}
```

**PDA:** `[b"tb", link_hash]`

### DepositRecordCompressedAccount

Compressed account storing deposit information.

```rust
pub struct DepositRecordCompressedAccount {
    pub owner: Pubkey,                    // Hashed
    pub source_chain_id: u32,
    pub dest_chain_id: u32,
    pub dest_chain_addr: String,
    pub dest_chain_mint_addr: String,
    pub mint: Pubkey,                     // Hashed
    pub amount: u64,
    pub timestamp: i64,
    pub deposit_id: u128,                 // Hashed
}
```

**PDA:** `[b"deposit", owner, deposit_count_bytes]`

**Hashed Fields:** `owner`, `mint`, `deposit_id` - Used in Merkle tree

### WithdrawalRecordCompressedAccount

Compressed account for withdrawal records.

```rust
pub struct WithdrawalRecordCompressedAccount {
    pub depositer: String,
    pub sourceChainId: u64,
    pub destChainId: u64,
    pub destChainAddr: Pubkey,            // Hashed
    pub destChainMintAddr: Pubkey,        // Hashed
    pub tokenMint: String,
    pub amount: u64,
    pub timestamp: i64,
    pub withdrawalId: u128,
}
```

**PDA:** `[b"withdrawal", relayer, nullifier]`

### WithdrawalProof

Regular account storing ZK proof data.

```rust
#[account]
pub struct WithdrawalProof {
    pub proof_a: [u8; 64],
    pub proof_b: [u8; 128],
    pub proof_c: [u8; 64],
    pub nullifier: [u8; 32],
    pub new_root: [u8; 32],
}
```

**PDA:** `[b"withdrawal_proof", nullifier]`

## 🌟 Light Protocol Integration

### What is Light Protocol?

Light Protocol provides **ZK Compression** for Solana, enabling:
- **10-100x cheaper accounts** - Compressed accounts cost ~0.0001 SOL
- **State compression** - Off-chain storage with on-chain proofs
- **Full composability** - Works with existing Solana programs
- **Zero-knowledge proofs** - Privacy-preserving state transitions

### Compressed Account Lifecycle

```
1. Derive Address
   ↓
   deriveAddress(seed, addressTree)
   
2. Get Validity Proof
   ↓
   rpc.getValidityProofV0([], [addressParams])
   
3. Create Compressed Account
   ↓
   LightAccount::new_init()
   
4. CPI to Light System Program
   ↓
   cpi.invoke_light_system_program()
   
5. Account Indexed
   ↓
   Photon Indexer indexes compressed account
   
6. Query Account
   ↓
   rpc.getCompressedAccount(address)
```

### Key Components

**1. Address Derivation**

```rust
let (address, address_seed) = derive_address(
    &[b"deposit", ctx.accounts.signer.key().as_ref()],
    &address_tree,
    &program_id,
);
```

**2. Account Creation**

```rust
let mut deposit_record = LightAccount::<'_, DepositRecordCompressedAccount>::new_init(
    &program_id,
    Some(address),
    output_merkle_tree_index,
);
```

**3. CPI Context**

```rust
let light_cpi_accounts = CpiAccounts::new(
    ctx.accounts.signer.as_ref(),
    ctx.remaining_accounts,
    program_id,
)?;

let cpi = CpiInputs::new_with_address(
    proof,
    vec![deposit_record.to_account_info()?],
    vec![new_address_params],
);

cpi.invoke_light_system_program(light_cpi_accounts)?;
```

### Required System Accounts

When invoking Light Protocol instructions, pass these remaining accounts:

```typescript
const systemAccounts = [
  lightSystemProgram,          // Light Protocol program
  cpiSigner,                   // CPI authority PDA
  registeredProgramPda,        // Program registration
  noopProgram,                 // Event logging
  accountCompressionAuthority, // Compression authority
  accountCompressionProgram,   // Compression program
  selfProgram,                 // Your program
  systemProgram,               // Solana system program
];
```

## 🚀 Installation

### Prerequisites

```bash
# Rust (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI 2.1.16+
sh -c "$(curl -sSfL https://release.solana.com/v2.1.16/install)"

# Anchor 0.30.1+
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli

# Light CLI 0.24.0+
cargo install --git https://github.com/Lightprotocol/light-protocol light-cli

# Node.js 18+
# Use nvm or download from nodejs.org
```

### Setup

```bash
# Clone repository
cd sol-bridge

# Install dependencies
npm install

# Build program
anchor build

# Get program ID
solana address -k target/deploy/cross_chain_token_bridge-keypair.json
```

### Update Program ID

After building, update the program ID in:

1. **Anchor.toml:**
   ```toml
   [programs.localnet]
   cross_chain_token_bridge = "YOUR_PROGRAM_ID"
   ```

2. **lib.rs:**
   ```rust
   declare_id!("YOUR_PROGRAM_ID");
   ```

3. **Rebuild:**
   ```bash
   anchor build
   ```

## 🧪 Testing

### Local Test Validator

**Start Light Protocol validator:**

```bash
light test-validator \
  --sbf-program Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS \
  ./target/deploy/cross_chain_token_bridge.so
```

This spawns:
1. **Solana validator** - `http://127.0.0.1:8899`
2. **Prover server** - `http://127.0.0.1:8784`
3. **Photon indexer** - `http://127.0.0.1:3001`

### Run Tests

```bash
# Run test suite
npm test

# Or with Anchor
anchor test --skip-local-validator
```

### Test Workflow

The test suite (`tests/test.ts`) performs:

1. **Initialize Bridge**
   ```typescript
   await program.methods.init()
     .accounts({ signer: authority.publicKey })
     .rpc();
   ```

2. **Create Token Mint**
   ```typescript
   const mint = await createMint(
     connection,
     payer,
     authority,
     authority,
     decimals
   );
   ```

3. **Initialize Token Bridge**
   ```typescript
   await program.methods.initTokenBridge(
     SOLANA_CHAIN_ID,
     mint.toString(),
     ETHEREUM_CHAIN_ID,
     ethTokenAddress,
     linkHash
   )
   .rpc();
   ```

4. **Deposit to Vault**
   ```typescript
   await program.methods
     .depositToVault(new BN(amount))
     .accounts({
       signer: provider.publicKey,
       mint: mint,
       tokenProgram: TOKEN_PROGRAM_ID,
     })
     .rpc();
   ```

5. **Create Deposit Record**
   ```typescript
   await program.methods
     .deposit(
       proof,
       addressMerkleContext,
       outputMerkleTreeIndex,
       new BN(amount),
       linkHash,
       destChainAddr
     )
     .accounts({ /* ... */ })
     .remainingAccounts(remainingAccounts)
     .rpc();
   ```

6. **Fetch and Export Data**
   ```typescript
   const depositRecord = await rpc.getCompressedAccount(
     bn(address.toBytes())
   );
   
   fs.writeFileSync(
     'config/sol_deposit_record.json',
     JSON.stringify(depositRecord)
   );
   ```

### Cleanup

Kill background processes:

```bash
# Find process IDs
lsof -i:8899  # Solana validator
lsof -i:8784  # Prover server
lsof -i:3001  # Photon indexer

# Kill processes
kill <pid>
```

## 🌐 Deployment

### Devnet Deployment

```bash
# Configure for devnet
solana config set --url devnet

# Fund deployer
solana airdrop 2 <your-address>

# Deploy program
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <program-id>
```

### Mainnet Deployment

⚠️ **Pre-deployment checklist:**

- [ ] Complete security audit
- [ ] Test on devnet extensively
- [ ] Prepare upgrade authority
- [ ] Set up monitoring
- [ ] Document recovery procedures
- [ ] Coordinate with relayer team

**Deployment steps:**

```bash
# Configure for mainnet
solana config set --url mainnet-beta

# Deploy (requires SOL for deployment)
anchor deploy --provider.cluster mainnet-beta \
  --program-name cross_chain_token_bridge

# Verify deployment
solana program show <program-id>

# Set upgrade authority (multi-sig recommended)
solana program set-upgrade-authority \
  <program-id> \
  --new-upgrade-authority <multisig-address>
```

### Upgrade Program

```bash
# Build new version
anchor build

# Upgrade
anchor upgrade target/deploy/cross_chain_token_bridge.so \
  --program-id <program-id> \
  --provider.cluster mainnet-beta
```

## 🔗 Integration

### With Relayer Service

**1. Monitor Deposit Events:**

```typescript
// Relayer listens for DepositEvent
connection.onLogs(
  programId,
  async (logs, context) => {
    if (logs.logs.some(log => log.includes('DepositEvent'))) {
      const address = parseEventAddress(logs);
      await processDeposit(address);
    }
  }
);
```

**2. Fetch Deposit Record:**

```typescript
const rpc = createRpc(RPC_URL, PROVER_URL, INDEXER_URL);

const depositRecord = await rpc.getCompressedAccount(
  bn(address.toBytes())
);

const decoded = program.coder.types.decode(
  'DepositRecordCompressedAccount',
  depositRecord.data.data
);
```

**3. Generate ZK Proof:**

```typescript
const proof = await rpc.getCompressedAccountProof(
  depositRecord.hash
);

// Generate circuit inputs
const circuitInputs = generateCircuitInputs(
  depositRecord,
  proof
);

// Generate ZK-SNARK proof
const zkProof = await generateZKProof(circuitInputs);
```

**4. Submit to EVM:**

```typescript
await evmBridge.processWithdrawal(
  depositRecord,
  zkProof.a,
  zkProof.b,
  zkProof.c,
  zkProof.publicSignals
);
```

### With Frontend

**Connect Wallet:**

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

function BridgeComponent() {
  const { publicKey, sendTransaction } = useWallet();
  const program = useProgram();
  
  // ...
}
```

**Execute Deposit:**

```typescript
async function depositToEvm(amount: number, recipientEthAddr: string) {
  const depositTx = await program.methods
    .deposit(
      proof,
      addressMerkleContext,
      outputTreeIndex,
      new BN(amount),
      linkHash,
      recipientEthAddr
    )
    .accounts({
      signer: wallet.publicKey,
      mint: tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .transaction();
  
  const signature = await sendTransaction(depositTx, connection);
  await connection.confirmTransaction(signature);
  
  return signature;
}
```

## 🔒 Security

### Security Features

1. **PDA Authority**
   - All vaults controlled by program PDAs
   - No external authority can access funds

2. **Amount Validation**
   - Deposits must be > 0
   - Withdrawals checked against vault balance

3. **Nullifier System**
   - Each withdrawal has unique nullifier
   - Prevents double-spending from EVM

4. **ZK Proof Verification**
   - Groth16 proofs verified on-chain
   - Ensures valid EVM deposits

5. **Token Account Validation**
   - ATA checks for correct ownership
   - Mint validation on transfers

### Best Practices

**For Integrators:**

1. **Validate Addresses**
   ```rust
   require!(
       ctx.accounts.recipient.key() == expected_recipient,
       ErrorCode::InvalidRecipient
   );
   ```

2. **Check Token Balances**
   ```rust
   require!(
       vault_balance >= amount,
       ErrorCode::InsufficientVaultBalance
   );
   ```

3. **Use PDAs Correctly**
   ```rust
   #[account(
       seeds = [b"vault", mint.key().as_ref()],
       bump
   )]
   ```

4. **Handle Errors Gracefully**
   ```rust
   #[error_code]
   pub enum ErrorCode {
       #[msg("Deposit amount must be greater than zero")]
       DepositAmountShouldBeGreaterThanZero,
       #[msg("Insufficient vault balance")]
       InsufficientVaultBalance,
       // ...
   }
   ```

### Security Considerations

**Compressed Accounts:**
- Trust Light Protocol's state compression
- Validate proofs from relayer
- Monitor for suspicious patterns

**Cross-Chain:**
- Verify destination addresses carefully
- Confirm transactions on both chains
- Implement timeouts for stale deposits

**Upgrades:**
- Use multi-sig for upgrade authority
- Test upgrades on devnet first
- Have rollback plan ready

## 🐛 Troubleshooting

### Common Issues

#### Program Build Fails

**Error: "anchor-lang version mismatch"**
```
Solution:
  1. Check Anchor.toml version matches Cargo.toml
  2. Reinstall Anchor CLI: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.30.1
  3. Clear cache: rm -rf target/
  4. Rebuild: anchor build
```

#### Test Validator Won't Start

**Error: "Port already in use"**
```
Solution:
  1. Find process: lsof -i:8899
  2. Kill process: kill <pid>
  3. Start fresh: light test-validator --reset
```

#### Compressed Account Not Found

**Error: "Account does not exist"**
```
Cause: Indexer hasn't caught up yet
Solution:
  1. Add delay: await sleep(2000)
  2. Check indexer status: curl http://localhost:3001/health
  3. Verify address derivation is correct
```

#### Transaction Fails: "Invalid proof"

**Error: "Proof verification failed"**
```
Cause: Incorrect proof or merkle context
Solution:
  1. Verify proof fetched from correct RPC
  2. Check merkle tree accounts are correct
  3. Ensure address tree and output tree are valid
  4. Validate root indices match
```

#### Insufficient Vault Balance

**Error: "InsufficientVaultBalance"**
```
Cause: Vault doesn't have enough tokens
Solution:
  1. Check vault balance:
     const vault = await program.account.tokenVault.fetch(vaultPda);
  2. Deposit more liquidity:
     await program.methods.depositToVault(amount).rpc();
```

### Debug Commands

```bash
# Check program deployment
solana program show <program-id>

# View program logs
solana logs <program-id>

# Check account data
solana account <account-address>

# Fetch compressed account
curl -X POST http://localhost:3001/v1/compressed-accounts/account \
  -H "Content-Type: application/json" \
  -d '{"address": "<base64-address>"}'

# Check validator status
solana cluster-version
solana validator-info get
```

### Getting Help

1. **Light Protocol Docs:** https://www.lightprotocol.com/docs
2. **Anchor Documentation:** https://www.anchor-lang.com/
3. **GitHub Issues:** Report bugs specific to Meridian Link
4. **Discord:** Join Light Protocol and Solana discords

## 📚 Additional Resources

### Related Documentation

- [Main README](../README.md) - Overall system
- [EVM Bridge](../evm-bridge/README.md) - EVM contracts
- [Relayer Service](../relayer-ts/README.md) - Backend coordinator
- [Web Frontend](../web/README.md) - User interface

### External Resources

- [Anchor Framework](https://www.anchor-lang.com/)
- [Light Protocol](https://www.lightprotocol.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana Program Library](https://github.com/solana-labs/solana-program-library)

### Development Tools

- **Anchor** - Solana development framework
- **Light CLI** - Compressed account tooling
- **Solana CLI** - Blockchain interaction
- **Photon** - Compressed account indexer

## 📞 Support

For questions or issues specific to the Solana bridge program:

- **General Questions:** hello@meridianlink.io
- **Technical Support:** dev@meridianlink.io
- **Security Issues:** security@meridianlink.io (PGP key available)

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

### Development Workflow

1. Create feature branch
2. Write tests for new functionality
3. Update documentation
4. Submit pull request

### Code Style

- Follow Rust best practices
- Use Anchor conventions
- Add comprehensive error handling
- Document all public functions

---

**Part of the [Meridian Link](https://deepwiki.com/RippnerLabs/meridian-link) Cross-Chain Bridge System**

*Secure, efficient cross-chain transfers powered by Light Protocol*
