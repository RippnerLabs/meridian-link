# Solana to Ethereum ZK Bridge

A production-ready cross-chain bridge that enables secure token transfers from Solana (using Light Protocol) to Ethereum using zero-knowledge proofs.

## Architecture Overview

```
Solana (Light Protocol) → ZK Circuit → Ethereum Bridge Contract
                ↓           ↓              ↓
    Compressed Account → SNARK Proof → Token Transfer
```

## Components

### 1. Circom Circuit (`circom/solDepositProof.circom`)
- Verifies Light Protocol compressed account inclusion
- Generates unique nullifiers to prevent double spending
- Creates commitments binding all transaction parameters
- Outputs ZK-SNARK proof for Ethereum verification

### 2. Solidity Verifier (`evm-bridge/contracts/SolDepositVerifier.sol`)
- Generated from Circom circuit using snarkjs
- Verifies Groth16 proofs on-chain
- BN254 elliptic curve pairing verification

### 3. Bridge Contract (`evm-bridge/contracts/evm-bridge.sol`)
- Main contract for processing withdrawals
- Validates deposit records against ZK proofs
- Prevents replay attacks using nullifiers
- Transfers ERC20 tokens to recipients

## Security Features

✅ **Replay Protection** - Unique nullifiers prevent double spending  
✅ **Amount Binding** - ZK circuit ensures exact amount matching  
✅ **State Verification** - Only valid Solana deposits can be processed  
✅ **Privacy** - Sensitive data remains hidden in ZK proof  
✅ **Fail-Safe** - Multiple validation layers with emergency controls  

## Usage

### Prerequisites

```bash
# Install dependencies
cd evm-bridge && npm install
cd ../circom && npm install

# Install Circom
npm install -g circom
```

### Step 1: Generate Circuit Input

From your Light Protocol deposit data:

```bash
cd circom/scripts
npx ts-node generateInput.ts
```

This creates `input.json` from your `proof.json`, `account.json`, and `record.json`.

### Step 2: Generate ZK Proof

```bash
cd circom

# Compile circuit
circom solDepositProof.circom --r1cs --wasm --sym

# Generate witness
node solDepositProof_js/generate_witness.js solDepositProof_js/solDepositProof.wasm input.json witness.wtns

# Setup ceremony (development only)
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# Generate proving/verification keys
snarkjs groth16 setup solDepositProof.r1cs pot12_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="1st Contributor" -v

# Generate proof
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json

# Export Solidity verifier
snarkjs zkey export solidityverifier circuit_final.zkey verifier.sol
```

### Step 3: Deploy Contracts

```bash
cd evm-bridge

# Deploy verifier and bridge
npx hardhat run scripts/deploy.ts --network <your-network>
```

### Step 4: Process Withdrawal

```bash
# Set contract addresses
export BRIDGE_CONTRACT_ADDRESS="0x..."
export VERIFIER_CONTRACT_ADDRESS="0x..."

# Process withdrawal
npx hardhat run scripts/processWithdrawal.ts --network <your-network>
```

## Example: Using Your Record Data

Your `record.json`:
```json
{
  "owner": "Ea9KnXpSXdRKfJAUhrqqWhuBMK3RKPWGQGFto6gvhVco",
  "source_chain_id": 1,
  "dest_chain_id": 41312,
  "dest_chain_addr": "2Uk4AtEZ3mbEVqZQ7En7c4cLuc4Q",
  "dest_chain_mint_addr": "",
  "mint": "svCXW2ivW3L7yBuFLapYKqdeKCcdAEnFQEXpZEF9CUw",
  "amount": "64",
  "timestamp": "6852bbce",
  "deposit_id": "01"
}
```

### Setup Required:

1. **Map destination address** to Ethereum address:
```solidity
bridge.mapAddress("2Uk4AtEZ3mbEVqZQ7En7c4cLuc4Q", "0xYourEthereumAddress");
```

2. **Set ERC20 token contract** address in `dest_chain_mint_addr`

3. **Deposit tokens** to bridge for liquidity:
```solidity
bridge.depositTokens("0xTokenContract", "64");
```

4. **Update state root** with Light Protocol root:
```solidity
bridge.updateStateRoot("0xStateRoot", blockHeight);
```

## Contract Interactions

### Bridge Contract Methods

```solidity
// Process withdrawal with ZK proof
function processWithdrawal(DepositRecord record, ZKProof proof)

// Admin functions
function mapAddress(string base58Addr, address ethAddr)
function updateStateRoot(uint256 stateRoot, uint256 blockHeight)
function depositTokens(address tokenContract, uint256 amount)

// View functions
function isNullifierUsed(uint256 nullifier) → bool
function getTokenBalance(address tokenContract) → uint256
```

## Development

### Testing Circuit

```bash
cd circom
circom solDepositProof.circom --r1cs --wasm --sym
# Check circuit info
snarkjs r1cs info solDepositProof.r1cs
```

### Testing Contracts

```bash
cd evm-bridge
npx hardhat test
npx hardhat coverage
```

## Production Deployment

### Security Checklist

- [ ] Use production ceremony for trusted setup
- [ ] Audit ZK circuit and contracts
- [ ] Set up multi-sig for admin functions
- [ ] Configure proper state root oracle
- [ ] Set withdrawal limits and rate limiting
- [ ] Monitor for unusual activity
- [ ] Prepare emergency pause mechanisms

### Mainnet Deployment

1. Generate production trusted setup
2. Deploy contracts with proper access controls
3. Set up relayer infrastructure
4. Configure monitoring and alerting
5. Coordinate with Light Protocol team for state root sync

## Troubleshooting

**Circuit compilation fails:**
- Ensure circom 2.1.8+ is installed
- Check circomlib is in node_modules

**Proof verification fails:**
- Verify circuit inputs match expected format
- Check public signals order matches contract
- Ensure verifying key matches proving key

**Transaction reverts:**
- Check nullifier not already used
- Verify state root is valid
- Ensure sufficient bridge token balance
- Confirm address mapping is set

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## License

MIT License - see LICENSE file for details.

## Security

For security issues, please email security@yourproject.com

Do not create public GitHub issues for security vulnerabilities. 