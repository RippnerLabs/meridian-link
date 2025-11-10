# Meridian Link - Cross-Chain Token Bridge

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/RippnerLabs/meridian-link)

A production-ready **bidirectional** cross-chain bridge enabling secure token transfers between Solana (using Light Protocol state compression) and EVM-compatible chains using zero-knowledge proofs.

## 🌉 Architecture Overview

Meridian Link is a comprehensive cross-chain bridge system consisting of four primary components working together to enable secure, trustless token transfers:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Meridian Link Bridge                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐      ┌──────────────┐      ┌───────────────┐  │
│  │  Next.js    │◄────►│   Relayer    │◄────►│  EVM Bridge   │  │
│  │  Frontend   │      │   Service    │      │   Contracts   │  │
│  └──────┬──────┘      └──────┬───────┘      └───────────────┘  │
│         │                     │                                  │
│         └─────────────┬───────┘                                  │
│                       │                                          │
│                ┌──────▼───────┐                                  │
│                │    Solana    │                                  │
│                │    Bridge    │                                  │
│                │   Program    │                                  │
│                └──────────────┘                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Flow: Solana ◄──ZK Proofs──► Relayer ◄──State Sync──► EVM
      (Light Protocol)        (Proof Gen)         (Verification)
```

### Key Features

✅ **Bidirectional Transfers** - Seamless token movement between Solana and EVM chains  
✅ **Zero-Knowledge Proofs** - Privacy-preserving transaction verification  
✅ **State Compression** - Efficient storage using Light Protocol's compressed accounts  
✅ **Replay Protection** - Unique nullifiers prevent double spending  
✅ **Modern UI** - Beautiful Next.js 15 frontend with React 19  
✅ **Type Safety** - Full TypeScript implementation across all services  
✅ **Production Ready** - Comprehensive testing and deployment infrastructure  

## 📦 System Components

### 1. Web Frontend (`web/`)

Modern Next.js application providing the user interface for bridge operations.

**Technology Stack:**
- **Framework:** Next.js 15.0.3 with React 19.0.0-rc
- **Styling:** Tailwind CSS 3.4.1 with shadcn/ui components
- **Animations:** Framer Motion for smooth transitions
- **State Management:**
  - Jotai for atomic state management
  - @tanstack/react-query for server state
  - next-themes for theme persistence
- **Blockchain Integration:**
  - @solana/web3.js 1.95.8
  - @solana/wallet-adapter-react 0.15.35
  - viem 2.x for EVM interactions
  - wagmi for Ethereum wallet connections

**Key Components:**
- `bridge-data-access.tsx` - Core bridge logic and contract integration
- `app-header.tsx` - Navigation and wallet connection
- `use-bridge-token-balance.ts` - Real-time balance tracking

**Development Commands:**
```bash
cd web
bun install          # Install dependencies
bun run dev          # Start development server
bun run build        # Production build
bun run lint         # Run ESLint
```

### 2. Solana Bridge Program (`sol-bridge/`)

Anchor-based Solana program managing deposits and state on Solana side.

**Key Features:**
- Light Protocol integration for compressed accounts
- Deposit record creation and management
- Cross-chain message formatting
- Security validations and access controls

**Core Files:**
- `programs/cross-chain-token-bridge/src/lib.rs` - Main program logic
- `tests/test.ts` - Comprehensive test suite

**Development Commands:**
```bash
cd sol-bridge
cargo build-sbf              # Build program
anchor test                  # Run tests
anchor deploy                # Deploy to configured network
```

**Dependencies:**
- anchor-lang ^0.30.1
- light-compressed-token
- light-hasher
- light-merkle-tree-reference
- light-verifier

### 3. EVM Bridge Contracts (`evm-bridge/`)

Solidity smart contracts for EVM-compatible chains (Ethereum, Polygon, BSC, etc.).

**Core Contracts:**
- `SolDepositVerifier.sol` - Groth16 ZK proof verification (generated from Circom)
- `evm-bridge.sol` - Main bridge contract for deposits/withdrawals
- `SolanaEVMBridge.json` - ABI and deployment artifacts

**Key Features:**
- ZK-SNARK proof verification using BN254 curve
- Nullifier tracking for replay protection
- ERC20 token management
- State root synchronization
- Address mapping (Solana ↔ EVM)

**Development Commands:**
```bash
cd evm-bridge
npm install                          # Install dependencies
npx hardhat compile                  # Compile contracts
npx hardhat test                     # Run tests
npx hardhat coverage                 # Generate coverage report
npx hardhat run scripts/deploy.ts    # Deploy contracts
```

### 4. Relayer Service (`relayer-ts/`)

TypeScript service coordinating cross-chain operations and proof generation.

**Responsibilities:**
- Monitor deposits on both chains
- Generate ZK proofs for cross-chain verification
- Coordinate state synchronization
- Process withdrawal requests
- Maintain Incremental Merkle Tree state

**Key Files:**
- `src/server.ts` - Main relayer server (453 lines)
- `src/sol-bridge.ts` - Solana bridge integration
- `ethDepositIMT.json` - Ethereum deposit merkle tree state

**Development Commands:**
```bash
cd relayer-ts
npm install                  # Install dependencies
npm run start                # Start relayer service
npm run build                # Build TypeScript
```

### 5. ZK Circuit (`circom/`)

Circom circuit for generating zero-knowledge proofs of Solana deposits.

**Circuit Components:**
- Light Protocol compressed account inclusion proof
- Nullifier generation (prevents double spending)
- Transaction parameter commitments
- Public signal outputs for Ethereum verification

**Development Commands:**
```bash
cd circom
npm install                  # Install dependencies
circom solDepositProof.circom --r1cs --wasm --sym   # Compile circuit
snarkjs r1cs info solDepositProof.r1cs              # Circuit info
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install Rust (for Solana program)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli

# Install Bun (for frontend)
curl -fsSL https://bun.sh/install | bash

# Install Node.js 18+ (for EVM and relayer)
# Use nvm or download from nodejs.org

# Install Circom
npm install -g circom
```

### Local Development Environment

The project includes a comprehensive Makefile for orchestrating the full development environment:

```bash
# Start complete local environment
make dev

# This will:
# 1. Start Light Protocol validator (Solana testnet)
# 2. Deploy Solana bridge program
# 3. Start Hardhat EVM node
# 4. Deploy EVM contracts
# 5. Start relayer service
# 6. Launch frontend development server
```

### Manual Setup (Step-by-Step)

#### 1. Start Local Blockchain Nodes

```bash
# Terminal 1: Start Solana test validator with Light Protocol
solana-test-validator --bpf-program <LIGHT_PROTOCOL_PROGRAM_ID> <LIGHT_PROTOCOL_SO>

# Terminal 2: Start Hardhat EVM node
cd evm-bridge
npx hardhat node
```

#### 2. Deploy Solana Program

```bash
cd sol-bridge
anchor build
anchor deploy
# Note the program ID and update in config
```

#### 3. Deploy EVM Contracts

```bash
cd evm-bridge
npx hardhat run scripts/deploy.ts --network localhost
# Save contract addresses to config/localhost_address_book.json
```

#### 4. Configure Environment

Create `relayer-ts/.env.local`:

```bash
# Solana Configuration
SOLANA_RPC_URL=http://localhost:8899
SOLANA_BRIDGE_PROGRAM_ID=<your_program_id>
SOLANA_PRIVATE_KEY=<base58_encoded_keypair>

# EVM Configuration
EVM_RPC_URL=http://localhost:8545
EVM_CHAIN_ID=31337
EVM_BRIDGE_CONTRACT=<deployed_bridge_address>
EVM_VERIFIER_CONTRACT=<deployed_verifier_address>
EVM_PRIVATE_KEY=<your_private_key>

# Light Protocol
LIGHT_PROTOCOL_RPC=http://localhost:8899
STATE_TREE_PROGRAM_ID=<light_protocol_program_id>

# Server Configuration
PORT=3001
LOG_LEVEL=debug
```

#### 5. Start Relayer Service

```bash
cd relayer-ts
npm install
npm run start
```

#### 6. Start Frontend

```bash
cd web
bun install
bun run dev
# Open http://localhost:3000
```

## ⚙️ Configuration Management

### Address Book System

The project uses a structured address book system for managing contract addresses across environments:

**Configuration Files:**
- `config/localhost_address_book.json` - Local development addresses
- `config/testnet_address_book.json` - Testnet deployment addresses
- `config/mainnet_address_book.json` - Production addresses
- `config/*_solana_address.json` - Solana-specific configurations

**Example Address Book Structure:**
```json
{
  "evm": {
    "bridgeContract": "0x...",
    "verifierContract": "0x...",
    "tokenContract": "0x...",
    "deployer": "0x..."
  },
  "solana": {
    "programId": "...",
    "mint": "...",
    "authority": "..."
  },
  "relayer": {
    "endpoint": "http://localhost:3001",
    "publicKey": "..."
  }
}
```

### Environment-Specific Configuration

**Naming Convention:**
- `localhost_*` - Local development
- `devnet_*` / `testnet_*` - Test networks
- `mainnet_*` - Production

**Runtime Selection:**
Set `ENVIRONMENT` variable to load appropriate configs:
```bash
export ENVIRONMENT=testnet
npm run start
```

### Network Constants

Defined in source code:
- `web/src/lib/constants.ts` - Chain IDs and protocol parameters
  ```typescript
  export const SOLANA_CHAIN_ID = 1;
  export const ETHEREUM_CHAIN_ID = 1;
  export const POLYGON_CHAIN_ID = 137;
  ```

## 🔄 Bridge Usage Flow

### Solana → EVM Transfer

1. **User Initiates Transfer**
   - Connect Solana wallet in frontend
   - Select token and amount
   - Specify destination EVM address
   - Submit deposit transaction

2. **Deposit on Solana**
   - Frontend calls Solana bridge program
   - Program creates compressed account with Light Protocol
   - Deposit record stored on-chain
   - Event emitted for relayer

3. **Relayer Processing**
   - Relayer detects deposit event
   - Fetches Light Protocol proof data
   - Generates ZK-SNARK proof using Circom circuit
   - Submits proof to EVM bridge contract

4. **Withdrawal on EVM**
   - EVM contract verifies ZK proof
   - Validates nullifier (prevent replay)
   - Checks state root
   - Transfers ERC20 tokens to recipient

### EVM → Solana Transfer

1. **User Initiates Transfer**
   - Connect EVM wallet (MetaMask, etc.)
   - Approve ERC20 token spending
   - Submit deposit to EVM bridge contract
   - Specify Solana recipient address

2. **Deposit on EVM**
   - Bridge contract locks tokens
   - Creates deposit record in Merkle tree
   - Emits deposit event
   - Updates Merkle root

3. **Relayer Processing**
   - Relayer monitors EVM events
   - Generates Merkle inclusion proof
   - Submits cross-chain message to Solana

4. **Withdrawal on Solana**
   - Solana program verifies Merkle proof
   - Validates EVM signatures
   - Mints/transfers tokens to recipient
   - Marks deposit as processed

## 🔐 Security Features

### Cryptographic Security
- **ZK-SNARK Proofs** - Groth16 over BN254 curve for succinct verification
- **Merkle Trees** - Incremental Merkle trees for efficient state proofs
- **State Compression** - Light Protocol compressed accounts reduce costs

### Transaction Security
- **Nullifier System** - Unique nullifiers prevent double spending
- **Amount Binding** - ZK circuit ensures exact amount matching
- **State Verification** - Only valid deposits can be processed
- **Replay Protection** - On-chain nullifier tracking

### Smart Contract Security
- **Access Controls** - Role-based permissions for admin functions
- **Pausable** - Emergency stop mechanism
- **Reentrancy Guards** - Protection against reentrancy attacks
- **Safe Math** - Overflow protection (Solidity 0.8+)

### Operational Security
- **Multi-layer Validation** - Multiple verification steps
- **Fail-Safe Mechanisms** - Graceful degradation
- **Monitoring** - Event logging and alerting
- **Rate Limiting** - Protection against spam

## 🧪 Testing

### Frontend Tests

```bash
cd web
bun run test           # Run Jest tests
bun run test:watch     # Watch mode
```

### Solana Program Tests

```bash
cd sol-bridge
anchor test            # Run Anchor tests
cargo test-sbf         # Run Rust unit tests
```

### EVM Contract Tests

```bash
cd evm-bridge
npx hardhat test                    # Run all tests
npx hardhat test --grep "deposit"   # Run specific tests
npx hardhat coverage                # Generate coverage report
```

### Relayer Tests

```bash
cd relayer-ts
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
```

### Circuit Tests

```bash
cd circom
npm run test           # Test circuit compilation and proof generation
```

### Integration Testing

```bash
# Run complete integration test suite
make test-integration

# This will:
# 1. Deploy all contracts to local networks
# 2. Execute test deposits on both chains
# 3. Verify relayer processing
# 4. Validate proof generation and verification
# 5. Confirm token transfers
```

## 📚 API Reference

### Solana Bridge Program

```rust
// Initialize bridge
pub fn initialize(ctx: Context<Initialize>) -> Result<()>

// Deposit tokens for cross-chain transfer
pub fn deposit(
    ctx: Context<Deposit>,
    amount: u64,
    dest_chain_id: u32,
    dest_address: String,
) -> Result<()>

// Process withdrawal from EVM chain
pub fn process_evm_withdrawal(
    ctx: Context<ProcessWithdrawal>,
    proof: Vec<u8>,
    merkle_root: [u8; 32],
) -> Result<()>
```

### EVM Bridge Contract

```solidity
// Deposit tokens for Solana transfer
function depositToSolana(
    address tokenContract,
    uint256 amount,
    string memory solanaRecipient
) external

// Process withdrawal from Solana with ZK proof
function processWithdrawal(
    DepositRecord calldata record,
    uint256[2] calldata a,
    uint256[2][2] calldata b,
    uint256[2] calldata c,
    uint256[4] calldata publicSignals
) external

// Admin: Update Solana state root
function updateStateRoot(
    uint256 newStateRoot,
    uint256 blockHeight
) external onlyOwner

// Admin: Map Solana address to EVM address
function mapAddress(
    string calldata solanaAddress,
    address evmAddress
) external onlyOwner

// View: Check if nullifier was used
function isNullifierUsed(uint256 nullifier) external view returns (bool)

// View: Get bridge token balance
function getTokenBalance(address tokenContract) external view returns (uint256)
```

### Relayer API

```typescript
// Health check
GET /health
Response: { status: "ok", uptime: number }

// Get bridge statistics
GET /stats
Response: {
  totalDeposits: number,
  totalWithdrawals: number,
  pendingTransactions: number
}

// Get transaction status
GET /status/:txHash
Response: {
  status: "pending" | "processing" | "completed" | "failed",
  sourceChain: string,
  destChain: string,
  amount: string
}
```

## 🏗️ Build Scripts

The project includes comprehensive build and development scripts:

### Root-level Commands

```bash
make dev                    # Start full development environment
make build                  # Build all components
make test                   # Run all tests
make clean                  # Clean build artifacts
make deploy-local           # Deploy to local networks
make deploy-testnet         # Deploy to testnets
```

### Component-Specific Builds

```bash
# Frontend
cd web && bun run build

# Solana
cd sol-bridge && anchor build

# EVM
cd evm-bridge && npx hardhat compile

# Relayer
cd relayer-ts && npm run build

# Circuit
cd circom && ./build.sh
```

## 🌐 Deployment

### Development Deployment (Localhost)

1. **Start local networks:**
   ```bash
   make start-local-networks
   ```

2. **Deploy contracts:**
   ```bash
   make deploy-local
   ```

3. **Update configuration:**
   - Addresses saved to `config/localhost_address_book.json`
   - Frontend automatically reads from config

### Testnet Deployment

1. **Configure testnet endpoints** in `.env.testnet`

2. **Fund deployer wallets:**
   ```bash
   # Solana devnet
   solana airdrop 2 <your-address> --url devnet
   
   # EVM testnet (use faucets)
   ```

3. **Deploy Solana program:**
   ```bash
   cd sol-bridge
   anchor build
   anchor deploy --provider.cluster devnet
   ```

4. **Deploy EVM contracts:**
   ```bash
   cd evm-bridge
   npx hardhat run scripts/deploy.ts --network goerli
   ```

5. **Update address books:**
   - Save addresses to `config/testnet_address_book.json`
   - Update `config/testnet_solana_address.json`

6. **Start relayer:**
   ```bash
   cd relayer-ts
   ENVIRONMENT=testnet npm run start
   ```

7. **Deploy frontend:**
   ```bash
   cd web
   bun run build
   # Deploy to Vercel/Netlify or serve statically
   ```

### Production Deployment

⚠️ **IMPORTANT: Follow security checklist before mainnet deployment**

#### Pre-Deployment Security Checklist

- [ ] **Audit all smart contracts** by reputable security firm
- [ ] **Audit ZK circuit** for soundness and completeness
- [ ] **Conduct trusted setup ceremony** for production proving keys
- [ ] **Set up multi-signature wallets** for admin functions
- [ ] **Configure state root oracle** with proper validation
- [ ] **Implement withdrawal limits** and daily caps
- [ ] **Set up rate limiting** on all public endpoints
- [ ] **Deploy monitoring infrastructure** (Grafana, DataDog, etc.)
- [ ] **Configure alerting** for unusual activity
- [ ] **Prepare incident response plan**
- [ ] **Test emergency pause mechanisms**
- [ ] **Verify all dependencies** and supply chain security
- [ ] **Document recovery procedures**
- [ ] **Set up backup relayer nodes**
- [ ] **Coordinate with Light Protocol** for state sync

#### Deployment Steps

1. **Generate Production ZK Keys:**
   ```bash
   cd circom
   # Run production trusted setup ceremony
   # DO NOT use development powers of tau
   snarkjs powersoftau new bn128 20 pot_0000.ptau
   # ... complete ceremony with multiple contributors
   ```

2. **Deploy with Multi-Sig:**
   - Use Gnosis Safe or similar
   - Require 3-of-5 signatures for admin functions

3. **Deploy Contracts:**
   ```bash
   # Solana mainnet
   anchor deploy --provider.cluster mainnet
   
   # Ethereum mainnet
   npx hardhat run scripts/deploy.ts --network mainnet
   ```

4. **Configure Production Relayer:**
   - Use high-availability infrastructure (AWS, GCP)
   - Set up redundant relayer nodes
   - Configure automatic failover
   - Enable comprehensive logging

5. **Launch Frontend:**
   - Deploy to CDN (Vercel, CloudFlare)
   - Configure custom domain
   - Enable HTTPS
   - Set up analytics

6. **Post-Deployment:**
   - Monitor for 24-48 hours with small limits
   - Gradually increase limits
   - Regular security audits
   - Community bug bounty program

## 🐛 Troubleshooting

### Common Issues

**Frontend fails to connect to wallet:**
- Ensure wallet extension is installed and unlocked
- Check network selection matches deployment
- Verify RPC endpoints in `constants.ts`

**Solana transaction fails:**
- Check account has sufficient SOL for fees
- Verify program ID matches deployed program
- Ensure Light Protocol is properly configured
- Check account initialization status

**EVM transaction reverts:**
- Verify nullifier hasn't been used: `isNullifierUsed()`
- Check state root is valid and up-to-date
- Ensure bridge has sufficient token balance
- Confirm address mapping is set correctly
- Check ERC20 approval was granted

**Circuit compilation fails:**
- Ensure circom 2.1.8+ is installed: `circom --version`
- Verify circomlib is in node_modules: `npm list circomlib`
- Check for syntax errors in circuit
- Ensure sufficient memory for large circuits

**Proof generation fails:**
- Verify witness generation succeeded
- Check input format matches circuit expectations
- Ensure proving key matches circuit
- Verify sufficient system memory (8GB+ recommended)

**Proof verification fails on-chain:**
- Verify verifier contract matches circuit
- Check public signals order is correct
- Ensure proving key and verifying key match
- Validate proof was generated correctly

**Relayer not processing transactions:**
- Check relayer service is running: `systemctl status relayer`
- Verify RPC endpoints are accessible
- Check private keys are configured correctly
- Review logs for errors: `journalctl -u relayer -f`
- Ensure sufficient funds for gas on both chains

**State root mismatch:**
- Coordinate with Light Protocol for latest root
- Check block height is current
- Verify state tree program ID is correct
- Ensure relayer is syncing properly

### Debug Mode

Enable detailed logging:

```bash
# Frontend
NEXT_PUBLIC_DEBUG=true bun run dev

# Relayer
LOG_LEVEL=debug npm run start

# Solana program (local testing)
RUST_LOG=debug anchor test
```

### Getting Help

1. **Check Documentation:** [DeepWiki](https://deepwiki.com/RippnerLabs/meridian-link)
2. **Review Issues:** Search existing GitHub issues
3. **Community Support:** Join Discord/Telegram
4. **Professional Support:** Contact team@meridianlink.io

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes:**
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Run tests:**
   ```bash
   make test
   ```
5. **Commit changes:**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   Use conventional commits (feat, fix, docs, style, refactor, test, chore)
6. **Push to branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open Pull Request** with detailed description

### Code Standards

- **TypeScript:** Follow ESLint configuration, use strict mode
- **Rust:** Follow Anchor and Solana best practices
- **Solidity:** Follow OpenZeppelin patterns, use NatSpec comments
- **Testing:** Minimum 80% code coverage for new features
- **Documentation:** Update README and inline comments

### Review Process

- All PRs require 2+ approvals
- CI/CD must pass (tests, lints, builds)
- Security-sensitive changes require additional review
- Maintain backwards compatibility when possible

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔒 Security

### Reporting Vulnerabilities

**DO NOT create public GitHub issues for security vulnerabilities.**

To report a security issue:
- **Email:** security@meridianlink.io
- **PGP Key:** [Download public key](https://meridianlink.io/.well-known/pgp-key.txt)
- **Response Time:** We aim to respond within 24 hours
- **Bug Bounty:** Rewards available for valid findings

### Security Measures

- All smart contracts audited by [Audit Firm Name]
- Continuous security monitoring
- Regular dependency updates
- Penetration testing performed quarterly
- Incident response team on standby 24/7

## 📞 Contact & Support

- **Website:** https://meridianlink.io
- **Documentation:** https://deepwiki.com/RippnerLabs/meridian-link
- **Twitter:** [@MeridianLink](https://twitter.com/meridianlink)
- **Discord:** [Join our community](https://discord.gg/meridianlink)
- **Email:** hello@meridianlink.io

## 🙏 Acknowledgments

- **Light Protocol** - For state compression infrastructure
- **Anchor Framework** - Solana development framework
- **Circom & SnarkJS** - ZK proof tools
- **OpenZeppelin** - Smart contract libraries
- **Solana Foundation** - Blockchain infrastructure
- **Ethereum Foundation** - EVM ecosystem support

---

**Built with ❤️ by the Meridian Link team**

*Enabling seamless cross-chain communication for the decentralized future* 