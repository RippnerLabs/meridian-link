# Relayer Service - Meridian Link

[![Part of Meridian Link](https://img.shields.io/badge/Meridian-Link-blue)](https://deepwiki.com/RippnerLabs/meridian-link)

TypeScript-based relayer service that coordinates cross-chain operations between Solana and EVM chains. This critical infrastructure component monitors deposits, generates zero-knowledge proofs, and orchestrates token transfers across the bridge.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Responsibilities](#core-responsibilities)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Event Monitoring](#event-monitoring)
- [Proof Generation](#proof-generation)
- [State Management](#state-management)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🌉 Overview

The Relayer Service is the orchestration layer of Meridian Link, acting as a trusted coordinator between Solana and EVM chains. It automates the complex processes required for cross-chain token transfers while maintaining security and reliability.

### Key Features

✅ **Automated Event Monitoring** - Tracks deposits on both Solana and EVM chains  
✅ **ZK Proof Generation** - Creates Groth16 proofs for Solana deposits  
✅ **Merkle Tree Management** - Maintains Incremental Merkle Trees for EVM deposits  
✅ **State Synchronization** - Keeps both chains in sync  
✅ **REST API** - Exposes endpoints for frontend and external services  
✅ **High Availability** - Designed for production redundancy  
✅ **Comprehensive Logging** - Detailed operation tracking  
✅ **Error Recovery** - Automatic retry mechanisms  

### Role in Bridge Ecosystem

```
┌──────────────────────────────────────────────────────────┐
│                    Relayer Service                        │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐         ┌─────────────────┐        │
│  │  Event Monitor  │         │  Proof Generator│        │
│  │  (Solana + EVM) │────────►│  (ZK + Merkle)  │        │
│  └────────┬────────┘         └────────┬────────┘        │
│           │                           │                   │
│           │    ┌──────────────────┐   │                  │
│           └───►│  State Manager   │◄──┘                  │
│                │  (IMT + Roots)   │                      │
│                └────────┬─────────┘                      │
│                         │                                 │
│                ┌────────▼─────────┐                      │
│                │   REST API       │                      │
│                │   Server         │                      │
│                └──────────────────┘                      │
│                                                            │
└──────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │                                    │
    Solana RPC                           EVM RPC
    (Light Protocol)                    (Ethereum, etc.)
```

## 🏗️ Architecture

### Service Components

1. **Express Server** - HTTP server exposing REST API
2. **Event Listeners** - WebSocket/polling listeners for chain events
3. **Proof Generator** - ZK-SNARK and Merkle proof creation
4. **State Manager** - Manages Incremental Merkle Trees and state roots
5. **Transaction Submitter** - Sends transactions to destination chains
6. **Database** - Stores pending transactions and state (optional)

### Data Flow

#### Solana → EVM Transfer

```
1. Solana Deposit Event
   ↓
2. Relayer detects deposit via Light Protocol RPC
   ↓
3. Fetch compressed account data
   ↓
4. Decode deposit record (Borsh)
   ↓
5. Generate ZK proof (Circom + snarkjs)
   ↓
6. Submit proof to EVM bridge contract
   ↓
7. EVM contract verifies and releases tokens
```

#### EVM → Solana Transfer

```
1. EVM Deposit Event (DepositToSolana)
   ↓
2. Relayer detects event via WebSocket
   ↓
3. Add deposit to Incremental Merkle Tree
   ↓
4. Generate Merkle inclusion proof
   ↓
5. Submit proof to Solana bridge program
   ↓
6. Solana program verifies and releases tokens
```

## 💼 Core Responsibilities

### 1. Event Monitoring

**Solana Side:**
- Monitor Light Protocol compressed account creation
- Track deposit records in Solana bridge program
- Listen for withdrawal confirmations
- Handle reorg scenarios

**EVM Side:**
- Subscribe to `DepositToSolana` events
- Track `WithdrawalProcessed` events
- Monitor state root updates
- Handle chain reorganizations

### 2. Proof Generation

**ZK Proofs (Solana → EVM):**
- Fetch Light Protocol Merkle proofs
- Extract compressed account data
- Generate circuit inputs
- Create Groth16 proofs using snarkjs
- Validate proof correctness

**Merkle Proofs (EVM → Solana):**
- Maintain Incremental Merkle Tree
- Add deposits to tree
- Generate inclusion proofs
- Persist tree state to disk

### 3. Transaction Coordination

**Transaction Lifecycle:**
1. Detect deposit
2. Validate transaction parameters
3. Generate proof
4. Queue transaction for submission
5. Submit to destination chain
6. Monitor confirmation
7. Handle failures with retry logic
8. Mark as completed

### 4. State Synchronization

- Update EVM bridge with Solana state roots
- Synchronize Light Protocol tree states
- Maintain consistency across chains
- Handle state recovery after downtime

## 🚀 Installation

### Prerequisites

```bash
# Node.js 18+ required
node --version  # Should be >= 18.0.0

# Install dependencies globally (optional)
npm install -g typescript ts-node nodemon

# Ensure circuit files are built
cd ../circom && ./build.sh
```

### Setup Steps

```bash
# Navigate to relayer directory
cd relayer-ts

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit configuration
vim .env.local

# Build TypeScript
npm run build

# Run tests
npm run test
```

### Dependencies

**Core Dependencies:**
```json
{
  "express": "^4.18.2",              // Web server
  "@lightprotocol/stateless.js": "latest", // Light Protocol client
  "@solana/web3.js": "^1.95.8",      // Solana SDK
  "viem": "^2.x",                    // EVM client
  "snarkjs": "^0.7.x",               // ZK proof generation
  "borsh": "^0.7.0",                 // Binary serialization
  "ethers": "^6.x",                  // Ethereum utilities
  "winston": "^3.11.0",              // Logging
  "dotenv": "^16.3.1"                // Environment config
}
```

**Development Dependencies:**
```json
{
  "typescript": "^5.3.3",
  "@types/express": "^4.17.21",
  "@types/node": "^20.10.6",
  "nodemon": "^3.0.2",
  "ts-node": "^10.9.2"
}
```

## ⚙️ Configuration

### Environment Variables

Create `.env.local` file:

```bash
# ============================================
# Server Configuration
# ============================================
PORT=3006
HOST=0.0.0.0
NODE_ENV=development  # development | production | test

# ============================================
# Solana Configuration
# ============================================
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com
SOLANA_BRIDGE_PROGRAM_ID=BridgeProgramID...
SOLANA_PRIVATE_KEY=base58_encoded_keypair

# Light Protocol Configuration
LIGHT_PROTOCOL_RPC=https://api.devnet.solana.com
LIGHT_PROTOCOL_PROGRAM_ID=LightProgramID...
STATE_TREE_PROGRAM_ID=StateTreeProgramID...

# ============================================
# EVM Configuration
# ============================================
EVM_RPC_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_KEY
EVM_WS_URL=wss://eth-goerli.g.alchemy.com/v2/YOUR_KEY
EVM_CHAIN_ID=5
EVM_BRIDGE_CONTRACT=0x1234...
EVM_VERIFIER_CONTRACT=0x5678...
EVM_PRIVATE_KEY=0xabcd...

# Multiple EVM chains (optional)
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_URL=https://bsc-testnet.publicnode.com

# ============================================
# Circuit Configuration
# ============================================
CIRCUIT_WASM_PATH=../circom/solDepositProof_js/solDepositProof.wasm
CIRCUIT_ZKEY_PATH=../circom/solDepositProof_js/circuit_final.zkey

# ============================================
# State Management
# ============================================
IMT_STATE_FILE=./data/ethDepositIMT.json
SOLANA_STATE_FILE=./data/solanaState.json
CHECKPOINT_INTERVAL=100  # blocks

# ============================================
# Monitoring & Alerting
# ============================================
LOG_LEVEL=info  # debug | info | warn | error
LOG_FILE=./logs/relayer.log
ENABLE_METRICS=true
METRICS_PORT=9090

# Alerting (optional)
ALERT_EMAIL=alerts@meridianlink.io
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# ============================================
# Performance Tuning
# ============================================
MAX_CONCURRENT_PROOFS=5
PROOF_TIMEOUT_MS=300000  # 5 minutes
EVENT_POLLING_INTERVAL=5000  # 5 seconds
TRANSACTION_RETRY_ATTEMPTS=3
TRANSACTION_RETRY_DELAY=10000  # 10 seconds

# ============================================
# Security
# ============================================
API_KEY=your_secure_api_key
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=60

# ============================================
# Database (Optional)
# ============================================
DATABASE_URL=postgresql://user:pass@localhost:5432/meridian
REDIS_URL=redis://localhost:6379
```

### Configuration Files

**Address Book:** Load contract addresses from config
```typescript
// src/config/addresses.ts
import localhost from '../../config/localhost_address_book.json';
import testnet from '../../config/testnet_address_book.json';
import mainnet from '../../config/mainnet_address_book.json';

const config = {
  localhost,
  testnet,
  mainnet
}[process.env.ENVIRONMENT || 'localhost'];

export const BRIDGE_ADDRESSES = config;
```

## 📡 API Reference

### REST Endpoints

#### 1. Health Check

**GET** `/health`

Returns service health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "solana": {
    "connected": true,
    "lastBlock": 123456789
  },
  "evm": {
    "connected": true,
    "lastBlock": 9876543
  }
}
```

#### 2. Generate ZK Proof

**POST** `/api/generate-proof`

Generates a Groth16 zero-knowledge proof for a Solana deposit.

**Request Body:**
```json
{
  "address": "CompressedAccountAddress...",
  "options": {
    "validate": true,
    "includeInputs": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "proof": {
    "a": ["0x123...", "0x456..."],
    "b": [
      ["0x789...", "0xabc..."],
      ["0xdef...", "0x012..."]
    ],
    "c": ["0x345...", "0x678..."],
    "Input": [
      "0x9ab...",  // nullifier
      "0xcde...",  // state root
      "0xf01...",  // deposit hash
      "0x234..."   // amount
    ]
  },
  "circuitInputs": {
    "stateRoot": "12345678901234567890",
    "amount": "10000",
    "destChainId": "1",
    "destChainAddr": "0x1234567890123456789012345678901234567890",
    "accountHash": "98765432109876543210",
    "leafIndex": "42",
    "merkleProof": ["...", "...", "..."],
    "pathIndices": [0, 1, 1, 0],
    "owner": "OwnerPublicKey...",
    "sourceChainId": "1",
    "mint": "MintAddress...",
    "timestamp": "1704067200",
    "depositId": "1",
    "dataHash": "56789012345678901234"
  },
  "metadata": {
    "proofGenerationTime": 2340,  // ms
    "circuitConstraints": 15000
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to fetch compressed account data",
  "code": "ACCOUNT_NOT_FOUND",
  "details": "..."
}
```

#### 3. Get Transaction Status

**GET** `/api/status/:txHash`

Query the status of a cross-chain transaction.

**Parameters:**
- `txHash` - Transaction hash from source chain

**Response:**
```json
{
  "status": "completed",  // pending | processing | completed | failed
  "sourceChain": "solana",
  "destChain": "ethereum",
  "sourceTransaction": "5xTx...abc",
  "destTransaction": "0x123...def",
  "amount": "100",
  "token": "USDC",
  "recipient": "0x1234...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "confirmations": {
    "source": 32,
    "destination": 12
  },
  "proofGenerated": true,
  "submittedAt": "2024-01-01T12:01:30.000Z",
  "completedAt": "2024-01-01T12:03:15.000Z"
}
```

#### 4. Get Bridge Statistics

**GET** `/api/stats`

Returns bridge usage statistics.

**Response:**
```json
{
  "totalTransfers": 1234,
  "volume24h": "1000000",
  "solanaToEvm": {
    "count": 678,
    "volume": "500000"
  },
  "evmToSolana": {
    "count": 556,
    "volume": "500000"
  },
  "pendingTransactions": 5,
  "avgProcessingTime": 180000,  // ms
  "successRate": 99.8
}
```

#### 5. Submit Manual Withdrawal

**POST** `/api/process-withdrawal`

Manually trigger withdrawal processing (admin only).

**Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "depositRecord": {
    "owner": "SolanaAddress...",
    "sourceChainId": 1,
    "destChainId": 1,
    "destChainAddr": "0x...",
    "mintAddr": "MintAddress...",
    "amount": "100",
    "timestamp": "1704067200",
    "depositId": "1"
  },
  "proof": {
    "a": ["...", "..."],
    "b": [["...", "..."], ["...", "..."]],
    "c": ["...", "..."]
  }
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x123...abc",
  "message": "Withdrawal submitted successfully"
}
```

### WebSocket API

**Endpoint:** `ws://localhost:3006/ws`

Real-time updates for transaction status.

**Subscribe to events:**
```javascript
const ws = new WebSocket('ws://localhost:3006/ws');

ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'transactions',
  filter: {
    sourceChain: 'solana'
  }
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Transaction update:', data);
};
```

## 👀 Event Monitoring

### Solana Event Monitoring

```typescript
// Monitoring Light Protocol compressed accounts
import { Rpc } from '@lightprotocol/stateless.js';

const rpc = new Rpc(process.env.SOLANA_RPC_URL);

// Monitor new compressed accounts
async function monitorSolanaDeposits() {
  const filter = {
    programId: BRIDGE_PROGRAM_ID,
    accountType: 'CompressedAccount'
  };
  
  rpc.subscribeToCompressedAccounts(filter, (account) => {
    console.log('New deposit detected:', account);
    processDeposit(account);
  });
}
```

### EVM Event Monitoring

```typescript
// Monitoring EVM bridge events
import { createPublicClient, webSocket } from 'viem';

const client = createPublicClient({
  transport: webSocket(process.env.EVM_WS_URL)
});

// Subscribe to deposit events
client.watchContractEvent({
  address: EVM_BRIDGE_CONTRACT,
  event: {
    type: 'event',
    name: 'DepositToSolana',
    inputs: [
      { indexed: true, name: 'depositor', type: 'address' },
      { indexed: true, name: 'tokenContract', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'solanaRecipient', type: 'string' },
      { indexed: false, name: 'depositId', type: 'uint256' }
    ]
  },
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log('EVM deposit detected:', log);
      processEvmDeposit(log);
    });
  }
});
```

## 🔐 Proof Generation

### ZK Proof Generation (Solana → EVM)

**Process Flow:**

```typescript
import * as snarkjs from 'snarkjs';
import { readFileSync } from 'fs';

async function generateZKProof(compressedAccountAddress: string) {
  // 1. Fetch compressed account data
  const accountData = await fetchCompressedAccount(compressedAccountAddress);
  
  // 2. Get Merkle proof from Light Protocol
  const merkleProof = await rpc.getCompressedAccountProof(
    accountData.hash
  );
  
  // 3. Decode deposit record
  const depositRecord = deserializeDepositRecord(accountData.data);
  
  // 4. Generate circuit inputs
  const circuitInputs = {
    stateRoot: merkleProof.root,
    amount: depositRecord.amount,
    destChainId: depositRecord.destChainId,
    destChainAddr: depositRecord.destChainAddr,
    accountHash: accountData.hash,
    leafIndex: merkleProof.leafIndex,
    merkleProof: merkleProof.proof,
    pathIndices: merkleProof.pathIndices,
    owner: depositRecord.owner,
    sourceChainId: depositRecord.sourceChainId,
    mint: depositRecord.mint,
    timestamp: depositRecord.timestamp,
    depositId: depositRecord.depositId,
    dataHash: computeDataHash(depositRecord)
  };
  
  // 5. Generate witness
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInputs,
    CIRCUIT_WASM_PATH,
    CIRCUIT_ZKEY_PATH
  );
  
  // 6. Format for Solidity
  const solidityProof = formatProofForSolidity(proof);
  
  return { proof: solidityProof, publicSignals, circuitInputs };
}
```

### Merkle Proof Generation (EVM → Solana)

**Incremental Merkle Tree Management:**

```typescript
import { IMT } from '@zk-kit/incremental-merkle-tree';
import { poseidon } from 'circomlibjs';

class MerkleTreeManager {
  private tree: IMT;
  
  constructor() {
    // Load or create tree
    this.tree = this.loadTree() || new IMT(poseidon, 20, 0n, 2);
  }
  
  addDeposit(deposit: EvmDeposit): number {
    // Hash deposit data
    const leaf = poseidon([
      BigInt(deposit.depositor),
      BigInt(deposit.amount),
      BigInt(deposit.timestamp),
      BigInt(deposit.depositId)
    ]);
    
    // Insert into tree
    this.tree.insert(leaf);
    
    // Save state
    this.saveTree();
    
    return this.tree.indexOf(leaf);
  }
  
  generateProof(depositId: number): MerkleProof {
    const proof = this.tree.createProof(depositId);
    
    return {
      root: proof.root,
      leaf: proof.leaf,
      siblings: proof.siblings,
      pathIndices: proof.pathIndices
    };
  }
  
  private saveTree() {
    const state = {
      root: this.tree.root.toString(),
      depth: this.tree.depth,
      leaves: this.tree.leaves.map(l => l.toString())
    };
    
    writeFileSync('./data/ethDepositIMT.json', JSON.stringify(state));
  }
}
```

## 💾 State Management

### State Persistence

**IMT State File (`ethDepositIMT.json`):**
```json
{
  "root": "12345678901234567890123456789012",
  "depth": 20,
  "leaves": [
    "11111111111111111111111111111111",
    "22222222222222222222222222222222",
    "33333333333333333333333333333333"
  ],
  "lastUpdate": "2024-01-01T12:00:00.000Z",
  "depositCount": 3
}
```

### State Synchronization

**Syncing Solana State Root to EVM:**

```typescript
async function syncStateRoot() {
  // Get latest Solana state root
  const stateRoot = await getLatestStateRoot();
  const blockHeight = await connection.getSlot();
  
  // Update EVM bridge contract
  const tx = await bridgeContract.write.updateStateRoot([
    stateRoot,
    blockHeight
  ]);
  
  await tx.wait();
  console.log(`State root updated: ${stateRoot}`);
}

// Run periodically
setInterval(syncStateRoot, 60000); // Every minute
```

## 🚀 Deployment

### Development Mode

```bash
# Start with hot reload
npm run dev

# With custom port
PORT=8080 npm run dev

# With debug logging
LOG_LEVEL=debug npm run dev
```

### Production Deployment

#### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs relayer

# Restart
pm2 restart relayer

# Stop
pm2 stop relayer
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'relayer',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3006
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
```

#### Using Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3006

CMD ["node", "dist/server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  relayer:
    build: .
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=production
      - PORT=3006
    env_file:
      - .env.production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3006/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Using Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meridian-relayer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: meridian-relayer
  template:
    metadata:
      labels:
        app: meridian-relayer
    spec:
      containers:
      - name: relayer
        image: meridianlink/relayer:latest
        ports:
        - containerPort: 3006
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: relayer-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3006
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3006
          initialDelaySeconds: 10
          periodSeconds: 5
```

### High Availability Setup

**Multiple Relayer Instances:**

1. **Active-Standby:** One active relayer with hot standby
2. **Active-Active:** Multiple relayers with coordination
3. **Sharded:** Different relayers handle different chains

**Coordination using Redis:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function acquireLock(txHash: string): Promise<boolean> {
  const result = await redis.set(
    `lock:${txHash}`,
    'processing',
    'EX', 300,  // 5 minute expiry
    'NX'        // Only if not exists
  );
  
  return result === 'OK';
}

async function processDeposit(deposit: Deposit) {
  if (await acquireLock(deposit.txHash)) {
    try {
      await handleDeposit(deposit);
    } finally {
      await redis.del(`lock:${deposit.txHash}`);
    }
  }
}
```

## 📊 Monitoring

### Logging

**Winston Logger Configuration:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: './logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: './logs/combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
```

### Metrics

**Prometheus Metrics:**

```typescript
import promClient from 'prom-client';

// Create metrics
const proofsGenerated = new promClient.Counter({
  name: 'relayer_proofs_generated_total',
  help: 'Total number of proofs generated'
});

const proofGenerationTime = new promClient.Histogram({
  name: 'relayer_proof_generation_duration_seconds',
  help: 'Proof generation duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const transactionsProcessed = new promClient.Counter({
  name: 'relayer_transactions_processed_total',
  help: 'Total transactions processed',
  labelNames: ['chain', 'status']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### Alerting

**Discord/Slack Webhooks:**

```typescript
async function sendAlert(message: string, severity: 'info' | 'warning' | 'error') {
  if (process.env.DISCORD_WEBHOOK_URL) {
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `[${severity.toUpperCase()}] ${message}`,
        username: 'Meridian Relayer'
      })
    });
  }
}

// Alert on errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  sendAlert(`Uncaught exception: ${error.message}`, 'error');
});
```

## 🔒 Security

### Security Best Practices

1. **Private Key Management**
   - Use environment variables (never commit)
   - Consider hardware security modules (HSM)
   - Rotate keys regularly
   - Use different keys for testnet/mainnet

2. **API Security**
   - Implement rate limiting
   - Use API keys for sensitive endpoints
   - Enable CORS appropriately
   - Validate all inputs

3. **Network Security**
   - Use HTTPS/WSS in production
   - Whitelist IP addresses
   - Set up firewall rules
   - Use VPN for admin access

4. **Operational Security**
   - Monitor for unusual activity
   - Set up alerts for failures
   - Regular security audits
   - Incident response plan

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Input Validation

```typescript
import { z } from 'zod';

const ProofRequestSchema = z.object({
  address: z.string().min(32).max(44),
  options: z.object({
    validate: z.boolean().optional(),
    includeInputs: z.boolean().optional()
  }).optional()
});

app.post('/api/generate-proof', async (req, res) => {
  try {
    const validated = ProofRequestSchema.parse(req.body);
    // Process request
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});
```

## 🐛 Troubleshooting

### Common Issues

#### Proof Generation Fails

**Error: "Circuit witness generation failed"**
```
Cause: Invalid circuit inputs or malformed data
Solution: 
  1. Validate circuit input format
  2. Check compressed account data integrity
  3. Verify Light Protocol proof structure
  4. Ensure circuit files are built correctly
```

#### RPC Connection Issues

**Error: "Failed to connect to Solana RPC"**
```
Cause: Network issues or RPC endpoint down
Solution:
  1. Check RPC endpoint in .env
  2. Verify network connectivity
  3. Try alternative RPC providers
  4. Check firewall settings
```

#### Event Monitoring Stops

**Error: "WebSocket connection closed"**
```
Cause: Connection timeout or network interruption
Solution:
  1. Implement automatic reconnection
  2. Check WebSocket URL configuration
  3. Monitor connection health
  4. Use backup RPC endpoints
```

#### State Tree Corruption

**Error: "IMT state mismatch"**
```
Cause: Interrupted state save or file corruption
Solution:
  1. Restore from backup
  2. Rebuild tree from blockchain data
  3. Implement atomic writes
  4. Regular state validation
```

### Debug Commands

```bash
# Check service status
curl http://localhost:3006/health

# Generate test proof
curl -X POST http://localhost:3006/api/generate-proof \
  -H "Content-Type: application/json" \
  -d '{"address":"YourTestAddress"}'

# View logs
tail -f logs/combined.log

# Check metrics
curl http://localhost:3006/metrics

# Test Solana connection
node -e "
const { Connection } = require('@solana/web3.js');
const conn = new Connection(process.env.SOLANA_RPC_URL);
conn.getSlot().then(console.log);
"

# Test EVM connection
node -e "
const { createPublicClient, http } = require('viem');
const client = createPublicClient({ transport: http(process.env.EVM_RPC_URL) });
client.getBlockNumber().then(console.log);
"
```

### Performance Tuning

```bash
# Increase max concurrent proofs
MAX_CONCURRENT_PROOFS=10 npm start

# Reduce polling interval
EVENT_POLLING_INTERVAL=2000 npm start

# Enable proof caching
ENABLE_PROOF_CACHE=true npm start
```

## 📚 Additional Resources

### Related Documentation

- [Main README](../README.md) - Overall system documentation
- [EVM Bridge](../evm-bridge/README.md) - EVM contracts
- [Solana Bridge](../sol-bridge/README.md) - Solana program
- [Web Frontend](../web/README.md) - User interface
- [Circom Circuit](../circom/README.md) - ZK circuit

### External Resources

- [Light Protocol Docs](https://www.lightprotocol.com/docs)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [Express.js Guide](https://expressjs.com/)
- [Viem Documentation](https://viem.sh/)
- [PM2 Process Manager](https://pm2.keymetrics.io/)

## 📞 Support

For questions or issues specific to the relayer service:

- **General Questions:** hello@meridianlink.io
- **Technical Support:** dev@meridianlink.io
- **Security Issues:** security@meridianlink.io (PGP key available)
- **Discord:** Join our community

---

**Part of the [Meridian Link](https://deepwiki.com/RippnerLabs/meridian-link) Cross-Chain Bridge System**

*Orchestrating trustless token transfers between blockchains* 