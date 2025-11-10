# EVM Bridge Contracts - Meridian Link

[![Part of Meridian Link](https://img.shields.io/badge/Meridian-Link-blue)](https://deepwiki.com/RippnerLabs/meridian-link)

Smart contracts for the Ethereum Virtual Machine (EVM) side of the Meridian Link cross-chain token bridge. These contracts enable secure token transfers between Solana and Ethereum-compatible chains using zero-knowledge proof verification.

## 📋 Table of Contents

- [Overview](#overview)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Contract Details](#contract-details)
- [Deployment](#deployment)
- [Testing](#testing)
- [Integration](#integration)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🌉 Overview

The EVM bridge implementation is a critical component of Meridian Link, handling the Ethereum side of cross-chain token transfers. It consists of three primary smart contracts that work together to:

1. **Verify zero-knowledge proofs** of Solana deposits
2. **Manage token custody** and transfers
3. **Prevent replay attacks** using nullifiers
4. **Synchronize state** between chains

### Key Features

✅ **Groth16 ZK Proof Verification** - Cryptographic verification of Solana deposits  
✅ **Nullifier System** - Prevents double-spending and replay attacks  
✅ **ERC-20 Token Support** - Standard token interface compatibility  
✅ **State Root Synchronization** - Maintains consistency with Solana state  
✅ **Access Control** - Role-based permissions for admin functions  
✅ **Emergency Pause** - Fail-safe mechanism for critical situations  
✅ **Gas Optimized** - Efficient contract design for lower transaction costs  

## 🏗️ Smart Contract Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    EVM Bridge System                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐                                   │
│  │  BridgeToken     │ ERC-20 Token                      │
│  │  (ERC-20)        │ - Standard token interface        │
│  └────────┬─────────┘ - Minting/burning capabilities   │
│           │                                               │
│           ▼                                               │
│  ┌──────────────────┐                                   │
│  │ SolanaEVMBridge  │ Main Bridge Contract              │
│  │  (Core Logic)    │ - Token deposits/withdrawals      │
│  └────────┬─────────┘ - Nullifier tracking              │
│           │           - Address mapping                  │
│           │           - State root validation            │
│           │                                               │
│           ▼                                               │
│  ┌──────────────────┐                                   │
│  │ SolDepositVerifier│ ZK Proof Verifier                │
│  │  (Groth16)       │ - BN254 curve operations          │
│  └──────────────────┘ - Pairing checks                  │
│                       - Public signal validation         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Contract Interactions

```
User → SolanaEVMBridge.depositToSolana()
         ├─→ BridgeToken.transferFrom()  // Lock tokens
         └─→ Emit DepositToSolana event → Relayer

Relayer → SolanaEVMBridge.processWithdrawal()
           ├─→ SolDepositVerifier.verifyProof()  // Verify ZK proof
           ├─→ Check nullifier (no replay)
           ├─→ Validate state root
           └─→ BridgeToken.transfer()  // Release tokens
```

## 📄 Contract Details

### 1. SolanaEVMBridge.sol

**Primary bridge contract managing all cross-chain operations.**

#### Core State Variables

```solidity
// Nullifier tracking for replay protection
mapping(uint256 => bool) public usedNullifiers;

// Solana state root synchronization
uint256 public currentStateRoot;
uint256 public currentBlockHeight;

// Address mappings (Solana ↔ EVM)
mapping(string => address) public solanaToEthAddress;
mapping(address => string) public ethToSolanaAddress;

// Token balances for liquidity pool
mapping(address => uint256) public tokenBalances;

// Reference to ZK verifier contract
ISolDepositVerifier public verifier;
```

#### Key Functions

##### Deposit to Solana

```solidity
function depositToSolana(
    address tokenContract,
    uint256 amount,
    string memory solanaRecipient
) external nonReentrant whenNotPaused
```

**Description:** Initiates a token transfer from Ethereum to Solana.

**Parameters:**
- `tokenContract` - Address of the ERC-20 token to transfer
- `amount` - Amount of tokens to transfer (in token's smallest unit)
- `solanaRecipient` - Base58-encoded Solana address of the recipient

**Process:**
1. Validates token contract and amount
2. Transfers tokens from user to bridge contract
3. Creates deposit record in Incremental Merkle Tree
4. Emits `DepositToSolana` event for relayer to process
5. Updates Merkle root

**Events Emitted:**
```solidity
event DepositToSolana(
    address indexed depositor,
    address indexed tokenContract,
    uint256 amount,
    string solanaRecipient,
    uint256 depositId,
    uint256 timestamp
);
```

**Requirements:**
- Contract must not be paused
- User must have approved token spending
- Amount must be greater than 0
- Solana recipient address must be valid Base58

##### Process Withdrawal (from Solana)

```solidity
function processWithdrawal(
    DepositRecord calldata record,
    uint256[2] calldata a,
    uint256[2][2] calldata b,
    uint256[2] calldata c,
    uint256[4] calldata publicSignals
) external nonReentrant whenNotPaused
```

**Description:** Processes a token withdrawal from Solana to Ethereum using ZK proof verification.

**Parameters:**
- `record` - Deposit record from Solana containing:
  - `owner` - Solana depositor address
  - `sourceChainId` - Solana chain ID (1)
  - `destChainId` - Target EVM chain ID
  - `destChainAddr` - Recipient Ethereum address (mapped)
  - `mintAddr` - Token mint address on Solana
  - `amount` - Transfer amount
  - `timestamp` - Deposit timestamp
  - `depositId` - Unique deposit identifier
- `a`, `b`, `c` - Groth16 proof components
- `publicSignals` - Public inputs to the ZK circuit:
  - `[0]` - Nullifier (unique per deposit)
  - `[1]` - State root
  - `[2]` - Deposit hash
  - `[3]` - Amount

**Process:**
1. Verifies ZK proof using SolDepositVerifier
2. Validates nullifier hasn't been used
3. Checks state root matches current Solana state
4. Validates deposit record matches public signals
5. Marks nullifier as used
6. Transfers tokens to recipient
7. Emits `WithdrawalProcessed` event

**Events Emitted:**
```solidity
event WithdrawalProcessed(
    address indexed recipient,
    address indexed tokenContract,
    uint256 amount,
    uint256 nullifier,
    uint256 timestamp
);
```

**Security Checks:**
- ✅ ZK proof must be valid
- ✅ Nullifier must not have been used before
- ✅ State root must match current root
- ✅ Public signals must match deposit record
- ✅ Bridge must have sufficient token balance
- ✅ Recipient address must be mapped

##### Admin Functions

```solidity
// Update Solana state root
function updateStateRoot(
    uint256 newStateRoot,
    uint256 blockHeight
) external onlyOwner

// Map Solana address to Ethereum address
function mapAddress(
    string calldata solanaAddress,
    address ethAddress
) external onlyOwner

// Deposit tokens to bridge for liquidity
function depositTokens(
    address tokenContract,
    uint256 amount
) external onlyOwner

// Withdraw tokens from bridge
function withdrawTokens(
    address tokenContract,
    uint256 amount,
    address recipient
) external onlyOwner

// Emergency pause mechanism
function pause() external onlyOwner
function unpause() external onlyOwner
```

##### View Functions

```solidity
// Check if nullifier has been used
function isNullifierUsed(uint256 nullifier) 
    external view returns (bool)

// Get bridge token balance
function getTokenBalance(address tokenContract) 
    external view returns (uint256)

// Get current state root
function getCurrentStateRoot() 
    external view returns (uint256, uint256)

// Get address mapping
function getSolanaAddress(address ethAddress) 
    external view returns (string memory)

function getEthAddress(string memory solanaAddress) 
    external view returns (address)
```

### 2. SolDepositVerifier.sol

**Zero-knowledge proof verifier implementing Groth16 verification over the BN254 elliptic curve.**

#### Overview

This contract is automatically generated from the Circom circuit using snarkjs. It implements the pairing check verification for Groth16 proofs:

```
e(A, B) = e(α, β) · e(L, γ) · e(C, δ)
```

Where:
- `A`, `B`, `C` are proof elements
- `α`, `β`, `γ`, `δ` are verification key elements
- `L` is a linear combination of public inputs
- `e()` is the BN254 pairing function

#### Key Functions

```solidity
function verifyProof(
    uint256[2] memory a,
    uint256[2][2] memory b,
    uint256[2] memory c,
    uint256[4] memory input
) public view returns (bool)
```

**Description:** Verifies a Groth16 zero-knowledge proof.

**Parameters:**
- `a` - Proof point A (G1)
- `b` - Proof point B (G2)
- `c` - Proof point C (G1)
- `input` - Public signals (nullifier, state root, deposit hash, amount)

**Returns:** `true` if proof is valid, `false` otherwise

**Circuit Public Inputs:**
1. **Nullifier** - Unique identifier preventing double-spending
   - Computed as: `hash(depositId, depositHash)`
2. **State Root** - Light Protocol compressed state tree root
3. **Deposit Hash** - Hash of deposit record parameters
4. **Amount** - Transfer amount (must match deposit record)

#### Verification Key

The contract contains hardcoded verification key parameters generated during the trusted setup ceremony:

```solidity
VerifyingKey memory vk = VerifyingKey({
    alfa1: G1Point(...),
    beta2: G2Point(...),
    gamma2: G2Point(...),
    delta2: G2Point(...),
    IC: new G1Point[](5)  // Public input commitments
});
```

**⚠️ Production Warning:** For mainnet deployment, use a production trusted setup ceremony with multiple contributors. The development keys should NEVER be used in production.

### 3. BridgeToken.sol (ERC-20)

**Standard ERC-20 token contract with minting capabilities for the bridge.**

#### Features

- Standard ERC-20 implementation (OpenZeppelin)
- Minting/burning capabilities restricted to bridge contract
- 18 decimal precision (configurable)
- Pausable for emergency situations

#### Key Functions

```solidity
// Standard ERC-20
function transfer(address to, uint256 amount) external returns (bool)
function approve(address spender, uint256 amount) external returns (bool)
function transferFrom(address from, address to, uint256 amount) external returns (bool)

// Bridge-specific
function mint(address to, uint256 amount) external onlyBridge
function burn(address from, uint256 amount) external onlyBridge
```

## 🚀 Deployment

### Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

Create `.env` file:

```bash
# Network Configuration
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
GOERLI_RPC_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_KEY

# Deployment Account
DEPLOYER_PRIVATE_KEY=0x...

# Contract Configuration
INITIAL_TOKEN_SUPPLY=1000000
TOKEN_NAME="Meridian Bridge Token"
TOKEN_SYMBOL="MBT"

# Verification (Optional)
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Gas Configuration
GAS_PRICE=50  # gwei
GAS_LIMIT=8000000
```

### Deployment Scripts

#### 1. Deploy All Contracts

```bash
# Deploy to local Hardhat network
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to testnet
npx hardhat run scripts/deploy.ts --network goerli

# Deploy to mainnet
npx hardhat run scripts/deploy.ts --network mainnet
```

The deployment script (`scripts/deploy.ts`) performs the following steps:

1. **Deploy BridgeToken**
   - Initial supply minted to deployer
   - Token name and symbol configured

2. **Deploy SolDepositVerifier**
   - Verification key embedded during compilation
   - No initialization required

3. **Deploy SolanaEVMBridge**
   - Links to verifier contract
   - Sets initial state root (if provided)
   - Transfers token ownership to bridge

4. **Configure Permissions**
   - Grant bridge minting/burning rights
   - Set up admin roles
   - Configure initial parameters

5. **Save Deployment Addresses**
   - Outputs to `../config/${network}_address_book.json`
   - Creates ABI files in `artifacts/`
   - Generates deployment report

#### 2. Verify Contracts on Etherscan

```bash
# Verify BridgeToken
npx hardhat verify --network mainnet <TOKEN_ADDRESS> "Meridian Bridge Token" "MBT"

# Verify SolDepositVerifier
npx hardhat verify --network mainnet <VERIFIER_ADDRESS>

# Verify SolanaEVMBridge
npx hardhat verify --network mainnet <BRIDGE_ADDRESS> <VERIFIER_ADDRESS> <TOKEN_ADDRESS>
```

#### 3. Post-Deployment Setup

```bash
# Run post-deployment configuration
npx hardhat run scripts/configure.ts --network mainnet
```

This configures:
- Initial address mappings
- State root synchronization
- Token deposit for liquidity
- Rate limits and caps

### Deployment Output

```
Deploying to network: mainnet
Deployer address: 0x1234...
Deployer balance: 1.5 ETH

1. Deploying BridgeToken...
   ✓ BridgeToken deployed at: 0xABCD...
   ✓ Gas used: 1,234,567

2. Deploying SolDepositVerifier...
   ✓ SolDepositVerifier deployed at: 0xEF12...
   ✓ Gas used: 2,345,678

3. Deploying SolanaEVMBridge...
   ✓ SolanaEVMBridge deployed at: 0x3456...
   ✓ Gas used: 3,456,789

4. Configuring contracts...
   ✓ Bridge granted minting rights
   ✓ Initial state root set
   ✓ Configuration complete

Total gas used: 7,037,034
Total cost: 0.352 ETH

Deployment addresses saved to:
  ../config/mainnet_address_book.json

ABIs exported to:
  artifacts/contracts/
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/SolanaEVMBridge.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage

# Run tests with specific grep pattern
npx hardhat test --grep "deposit"
```

### Test Structure

```
test/
├── SolanaEVMBridge.test.ts      # Main bridge contract tests
├── SolDepositVerifier.test.ts   # ZK verifier tests
├── BridgeToken.test.ts          # Token contract tests
├── integration/
│   ├── fullFlow.test.ts         # End-to-end flow tests
│   └── edge-cases.test.ts       # Edge case scenarios
└── helpers/
    ├── fixtures.ts              # Test fixtures
    └── utils.ts                 # Test utilities
```

### Test Coverage Areas

#### 1. Bridge Contract Tests

```typescript
describe("SolanaEVMBridge", () => {
  // Deployment tests
  describe("Deployment", () => {
    it("Should set the correct verifier address")
    it("Should set the deployer as owner")
    it("Should initialize with zero state root")
  })

  // Deposit tests
  describe("Deposit to Solana", () => {
    it("Should accept valid deposit")
    it("Should transfer tokens to bridge")
    it("Should emit DepositToSolana event")
    it("Should update Merkle tree")
    it("Should reject deposits when paused")
    it("Should reject zero amount deposits")
  })

  // Withdrawal tests
  describe("Process Withdrawal", () => {
    it("Should process valid withdrawal with proof")
    it("Should mark nullifier as used")
    it("Should transfer tokens to recipient")
    it("Should reject invalid proofs")
    it("Should reject reused nullifiers")
    it("Should reject stale state roots")
  })

  // Admin tests
  describe("Admin Functions", () => {
    it("Should allow owner to update state root")
    it("Should allow owner to map addresses")
    it("Should allow owner to pause/unpause")
    it("Should reject non-owner admin calls")
  })
})
```

#### 2. Verifier Contract Tests

```typescript
describe("SolDepositVerifier", () => {
  it("Should verify valid proof")
  it("Should reject invalid proof")
  it("Should reject proof with wrong public inputs")
  it("Should handle edge cases in pairing checks")
})
```

#### 3. Integration Tests

```typescript
describe("Full Bridge Flow", () => {
  it("Should complete Ethereum -> Solana transfer")
  it("Should complete Solana -> Ethereum transfer")
  it("Should handle concurrent transfers")
  it("Should prevent double-spending attacks")
})
```

### Gas Benchmarks

Expected gas costs for common operations:

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Deploy BridgeToken | ~1.2M | One-time deployment |
| Deploy Verifier | ~2.3M | One-time deployment |
| Deploy Bridge | ~3.4M | One-time deployment |
| Deposit to Solana | ~80K | Per transaction |
| Process Withdrawal | ~250K | Includes ZK verification |
| Update State Root | ~45K | Admin operation |
| Map Address | ~35K | Admin operation |

### Running Specific Test Scenarios

```bash
# Test deposit functionality
npx hardhat test --grep "deposit"

# Test withdrawal functionality
npx hardhat test --grep "withdrawal"

# Test admin functions
npx hardhat test --grep "admin"

# Test security features
npx hardhat test --grep "security"

# Test edge cases
npx hardhat test test/integration/edge-cases.test.ts
```

## 🔗 Integration

### With Relayer Service

The EVM contracts integrate with the relayer service for cross-chain coordination:

1. **Relayer monitors** `DepositToSolana` events
2. **Generates Merkle proofs** for Solana verification
3. **Monitors Solana** for deposits
4. **Generates ZK proofs** using Circom circuit
5. **Submits proofs** to `processWithdrawal()`

### With Frontend

The web frontend interacts with contracts using wagmi/viem:

```typescript
// Example: Deposit to Solana
import { useBridgeContract } from './hooks/useBridgeContract';

function BridgeComponent() {
  const { depositToSolana } = useBridgeContract();
  
  const handleDeposit = async () => {
    const tx = await depositToSolana({
      tokenContract: "0x...",
      amount: parseEther("100"),
      solanaRecipient: "Base58Address..."
    });
    
    await tx.wait();
  };
}
```

### Contract ABIs

Contract ABIs are exported to:
- `artifacts/contracts/` - Hardhat compilation output
- `../web/src/contracts/SolanaEVMBridge.json` - Frontend integration
- `../config/*_address_book.json` - Deployment addresses

## 🔐 Security

### Security Features

1. **Reentrancy Protection**
   - All state-changing functions use `nonReentrant` modifier
   - OpenZeppelin's ReentrancyGuard implementation

2. **Access Control**
   - Owner-only admin functions
   - Role-based permissions for critical operations
   - Pausable mechanism for emergencies

3. **Input Validation**
   - Address zero checks
   - Amount validation
   - String length limits
   - Parameter consistency verification

4. **ZK Proof Security**
   - Groth16 proof system (industry standard)
   - BN254 elliptic curve (Ethereum-optimized)
   - Trusted setup verification
   - Public signal validation

5. **Nullifier System**
   - Prevents replay attacks
   - One-time use per deposit
   - Cryptographically secure
   - Efficiently stored in mapping

### Security Best Practices

#### Pre-Deployment

- [ ] Complete security audit by reputable firm
- [ ] Conduct formal verification of critical functions
- [ ] Perform extensive fuzzing tests
- [ ] Review trusted setup ceremony process
- [ ] Validate all configuration parameters
- [ ] Test with maximum gas price scenarios
- [ ] Verify emergency pause mechanisms

#### Post-Deployment

- [ ] Monitor all contract events in real-time
- [ ] Set up alerting for unusual patterns
- [ ] Implement rate limiting on frontend
- [ ] Regular security reviews
- [ ] Bug bounty program
- [ ] Incident response plan
- [ ] Multi-sig for admin functions

### Known Limitations

1. **Trusted Setup Dependency**
   - ZK verifier relies on trusted setup ceremony
   - Development keys should NEVER be used in production
   - Requires coordination with multiple parties

2. **State Root Synchronization**
   - Bridge owner must regularly update Solana state root
   - Stale state roots prevent withdrawals
   - Consider automated oracle integration

3. **Gas Costs**
   - ZK proof verification costs ~200K gas
   - Can be expensive during high gas price periods
   - Consider Layer 2 deployment options

4. **Finality Assumptions**
   - Assumes Solana finality before processing withdrawals
   - Relayer should wait for sufficient confirmations
   - Chain reorganization risks on both sides

## 🐛 Troubleshooting

### Common Issues

#### Transaction Reverts

**Error: "Nullifier already used"**
```
Cause: Attempting to process a withdrawal that was already completed
Solution: Check nullifier usage with isNullifierUsed() before submitting
```

**Error: "Invalid state root"**
```
Cause: State root is outdated or incorrect
Solution: Ensure bridge owner updates state root regularly
         Call getCurrentStateRoot() to verify current value
```

**Error: "Proof verification failed"**
```
Cause: Invalid ZK proof or mismatched public signals
Solution: Verify proof generation process
         Ensure public signals match deposit record
         Check verifier contract address
```

**Error: "Insufficient bridge balance"**
```
Cause: Bridge doesn't have enough tokens for withdrawal
Solution: Bridge owner must deposit tokens using depositTokens()
         Check balance with getTokenBalance()
```

**Error: "Address not mapped"**
```
Cause: Solana address not mapped to Ethereum address
Solution: Bridge owner must call mapAddress()
         Verify mapping with getSolanaAddress()
```

#### Deployment Issues

**Error: "Contract size exceeds limit"**
```
Cause: Contract bytecode too large (>24KB)
Solution: Enable optimizer in hardhat.config.ts
         Increase optimizer runs
         Consider splitting contracts
```

**Error: "Insufficient funds for deployment"**
```
Cause: Deployer account lacks ETH for gas
Solution: Fund deployer account
         Estimate gas costs: deployment = ~7M gas
```

**Error: "Nonce too low/high"**
```
Cause: Transaction nonce mismatch
Solution: Reset nonce in wallet
         Use hardhat-gas-reporter for better estimation
```

#### Integration Issues

**Contract not responding**
```
Cause: Wrong network or RPC issues
Solution: Verify network in hardhat.config.ts
         Check RPC endpoint connectivity
         Ensure contract address is correct
```

**ABI mismatch**
```
Cause: Contract redeployed but ABI not updated
Solution: Recompile contracts: npx hardhat compile
         Copy new ABI to frontend
         Clear cache: npx hardhat clean
```

### Debug Commands

```bash
# Check contract deployment
npx hardhat run scripts/checkDeployment.ts --network mainnet

# Verify contract state
npx hardhat console --network mainnet
> const bridge = await ethers.getContractAt("SolanaEVMBridge", "0x...")
> await bridge.getCurrentStateRoot()

# Test proof verification locally
npx hardhat test test/SolDepositVerifier.test.ts --verbose

# Estimate gas costs
REPORT_GAS=true npx hardhat test

# Run local node for debugging
npx hardhat node
```

### Getting Help

1. **Documentation:** [Meridian Link Docs](https://deepwiki.com/RippnerLabs/meridian-link)
2. **GitHub Issues:** Report bugs or request features
3. **Discord:** Join community for support
4. **Security Issues:** Email security@meridianlink.io (do not create public issues)

## 📚 Additional Resources

### Related Documentation

- [Main README](../README.md) - Overall system documentation
- [Solana Bridge](../sol-bridge/README.md) - Solana program details
- [Relayer Service](../relayer-ts/README.md) - Relayer coordination
- [Web Frontend](../web/README.md) - User interface
- [Circom Circuit](../circom/README.md) - ZK proof generation

### External Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Groth16 Proof System](https://eprint.iacr.org/2016/260.pdf)
- [BN254 Curve Specification](https://hackmd.io/@jpw/bn254)
- [Solidity Best Practices](https://consensys.github.io/smart-contract-best-practices/)

### Development Tools

- **Hardhat** - Ethereum development environment
- **Ethers.js** - Ethereum JavaScript library
- **OpenZeppelin** - Secure smart contract library
- **Slither** - Static analysis tool
- **Mythril** - Security analysis tool
- **Tenderly** - Smart contract monitoring

## 📞 Support

For questions or issues specific to the EVM bridge contracts:

- **General Questions:** hello@meridianlink.io
- **Technical Support:** dev@meridianlink.io
- **Security Issues:** security@meridianlink.io (PGP key available)

---

**Part of the [Meridian Link](https://deepwiki.com/RippnerLabs/meridian-link) Cross-Chain Bridge System**

*Enabling trustless token transfers between Solana and Ethereum*
