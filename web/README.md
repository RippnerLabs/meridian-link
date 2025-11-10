# Web Frontend - Meridian Link

[![Part of Meridian Link](https://img.shields.io/badge/Meridian-Link-blue)](https://deepwiki.com/RippnerLabs/meridian-link)

Modern Next.js 15 frontend application for the Meridian Link cross-chain bridge. Built with React 19, TypeScript, and Tailwind CSS, providing a beautiful, responsive interface for seamless token transfers between Solana and EVM-compatible chains.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [UI Components](#ui-components)
- [State Management](#state-management)
- [Blockchain Integration](#blockchain-integration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Styling](#styling)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

## 🌉 Overview

The Meridian Link web application is a production-ready, user-friendly interface that enables anyone to bridge tokens between Solana and Ethereum-compatible chains. It abstracts the complexity of cross-chain transfers while providing real-time updates and comprehensive transaction tracking.

### Key Features

✅ **Dual Wallet Support** - Connect Solana and EVM wallets simultaneously  
✅ **Real-time Balance Tracking** - Live token balance updates  
✅ **Transaction History** - Complete transfer history with status  
✅ **Gas Estimation** - Preview transaction costs before submission  
✅ **Mobile Responsive** - Fully optimized for all screen sizes  
✅ **Dark/Light Mode** - Theme switching with persistence  
✅ **Progressive Enhancement** - Works even with slow connections  
✅ **Error Recovery** - Graceful handling of network issues  

## 🛠️ Technology Stack

### Core Framework

```json
{
  "next": "15.0.3",                    // React framework with App Router
  "react": "19.0.0-rc",                // UI library (Release Candidate)
  "react-dom": "19.0.0-rc",            // React DOM renderer
  "typescript": "^5.3.3"               // Type safety
}
```

### Styling

```json
{
  "tailwindcss": "3.4.1",              // Utility-first CSS
  "@radix-ui/*": "latest",             // Accessible UI primitives
  "framer-motion": "^11.0.0",          // Animation library
  "next-themes": "^0.2.1",             // Theme management
  "lucide-react": "^0.263.1"           // Icon library
}
```

### Blockchain Libraries

**Solana:**
```json
{
  "@solana/web3.js": "1.95.8",         // Solana SDK
  "@solana/wallet-adapter-react": "0.15.35",
  "@solana/wallet-adapter-react-ui": "0.9.35",
  "@solana/wallet-adapter-wallets": "0.19.32",
  "@coral-xyz/anchor": "0.30.1"        // Anchor framework client
}
```

**EVM:**
```json
{
  "viem": "^2.x",                      // EVM client library
  "wagmi": "^2.x",                     // React hooks for Ethereum
  "@rainbow-me/rainbowkit": "^2.x"    // Wallet connection UI
}
```

### State Management

```json
{
  "jotai": "^2.6.4",                   // Atomic state management
  "@tanstack/react-query": "^5.17.19" // Server state management
}
```

### Build Tools

```json
{
  "bun": "^1.0.0",                     // Fast package manager/runtime
  "postcss": "^8.4.35",                // CSS processing
  "autoprefixer": "^10.4.17",          // CSS vendor prefixes
  "eslint": "^8.56.0"                  // Code linting
}
```

## ✨ Features

### 1. Wallet Integration

**Solana Wallets Supported:**
- Phantom
- Solflare
- Backpack
- Torus
- Coinbase Wallet
- Trust Wallet

**EVM Wallets Supported:**
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow Wallet
- Trust Wallet
- Ledger

### 2. Bridge Operations

**Solana → EVM:**
1. Connect Solana wallet
2. Select token and amount
3. Enter destination EVM address
4. Approve transaction
5. Track withdrawal processing
6. Receive tokens on EVM chain

**EVM → Solana:**
1. Connect EVM wallet
2. Approve token spending
3. Enter Solana recipient address
4. Submit deposit
5. Monitor relayer processing
6. Receive tokens on Solana

### 3. User Experience

- **Real-time Updates** - WebSocket connection for instant status
- **Transaction Tracking** - View all transfers and their status
- **Balance Display** - Live balance updates on both chains
- **Gas Estimation** - Preview fees before submitting
- **Error Messages** - Clear, actionable error descriptions
- **Loading States** - Smooth transitions and skeleton loaders
- **Success Animations** - Delightful confirmation feedback

## 🏗️ Architecture

### Application Structure

```
web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── bridge/                   # Bridge interface
│   │   │   └── page.tsx
│   │   ├── history/                  # Transaction history
│   │   │   └── page.tsx
│   │   └── api/                      # API routes
│   │       └── relayer/
│   │           └── route.ts
│   │
│   ├── components/                   # React components
│   │   ├── bridge/
│   │   │   ├── bridge-data-access.tsx      # Core bridge logic
│   │   │   ├── bridge-transfer-form.tsx    # Transfer UI
│   │   │   └── bridge-status.tsx           # Status display
│   │   ├── wallet/
│   │   │   ├── solana-provider.tsx         # Solana wallet provider
│   │   │   ├── evm-provider.tsx            # EVM wallet provider
│   │   │   └── wallet-button.tsx           # Connection buttons
│   │   ├── ui/                       # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── toast.tsx
│   │   └── app-header.tsx            # Navigation header
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-bridge-contract.ts    # Bridge contract interaction
│   │   ├── use-bridge-token-balance.ts  # Balance tracking
│   │   ├── use-transaction-status.ts    # Status polling
│   │   └── use-network-config.ts        # Network configuration
│   │
│   ├── lib/                          # Utility functions
│   │   ├── constants.ts              # Chain IDs, addresses
│   │   ├── contracts.ts              # Contract ABIs
│   │   ├── utils.ts                  # Helper functions
│   │   └── types.ts                  # TypeScript types
│   │
│   ├── store/                        # Jotai atoms
│   │   ├── bridge-atoms.ts           # Bridge state
│   │   └── wallet-atoms.ts           # Wallet state
│   │
│   └── styles/
│       └── globals.css               # Global styles
│
├── public/                           # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies
```

### Component Hierarchy

```
App
├── RootLayout
│   ├── SolanaProvider
│   │   └── EVMProvider
│   │       ├── ThemeProvider
│   │       │   ├── AppHeader
│   │       │   │   ├── WalletButtons
│   │       │   │   └── NetworkSelector
│   │       │   │
│   │       │   └── {page}
│   │       │       ├── BridgeTransferForm
│   │       │       │   ├── TokenSelector
│   │       │       │   ├── AmountInput
│   │       │       │   ├── AddressInput
│   │       │       │   └── SubmitButton
│   │       │       │
│   │       │       ├── BridgeStatus
│   │       │       │   ├── StatusCard
│   │       │       │   └── ProgressBar
│   │       │       │
│   │       │       └── TransactionHistory
│   │       │           └── HistoryTable
│   │       │
│   │       └── Toaster (notifications)
│   │
│   └── ReactQueryProvider
```

## 🚀 Installation

### Prerequisites

```bash
# Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# Or Node.js 18+
node --version  # Should be >= 18.0.0

# Git
git --version
```

### Setup Steps

```bash
# Clone repository (if starting from scratch)
git clone https://github.com/your-org/meridian-link.git
cd meridian-link/web

# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local

# Edit configuration
vim .env.local

# Start development server
bun run dev
```

### Environment Configuration

Create `.env.local`:

```bash
# ============================================
# Application
# ============================================
NEXT_PUBLIC_APP_NAME="Meridian Link"
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# Solana Configuration
# ============================================
NEXT_PUBLIC_SOLANA_NETWORK=devnet  # mainnet-beta | devnet | testnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_BRIDGE_PROGRAM_ID=BridgeProgramID...

# ============================================
# EVM Configuration
# ============================================
NEXT_PUBLIC_EVM_CHAIN_ID=5  # 1 (mainnet) | 5 (goerli) | 137 (polygon)
NEXT_PUBLIC_EVM_RPC_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_EVM_BRIDGE_CONTRACT=0x1234...
NEXT_PUBLIC_EVM_VERIFIER_CONTRACT=0x5678...
NEXT_PUBLIC_TOKEN_CONTRACT=0x9abc...

# Multiple chains (optional)
NEXT_PUBLIC_POLYGON_CHAIN_ID=137
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_BSC_CHAIN_ID=56
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed.binance.org

# ============================================
# Relayer Service
# ============================================
NEXT_PUBLIC_RELAYER_URL=http://localhost:3006
NEXT_PUBLIC_RELAYER_WS_URL=ws://localhost:3006/ws

# ============================================
# WalletConnect
# ============================================
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# ============================================
# Feature Flags
# ============================================
NEXT_PUBLIC_ENABLE_TESTNET=true
NEXT_PUBLIC_ENABLE_HISTORY=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## 💻 Development

### Development Server

```bash
# Start development server (default: http://localhost:3000)
bun run dev

# Start on custom port
PORT=3001 bun run dev

# Enable turbopack (faster)
bun run dev --turbo
```

### Build Commands

```bash
# Production build
bun run build

# Type checking
bun run type-check

# Linting
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format
```

### Code Quality Scripts

**package.json:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 🎨 UI Components

### Core Bridge Components

#### BridgeDataAccess

**Location:** `src/components/bridge/bridge-data-access.tsx`

Main data layer component handling bridge contract interactions.

```typescript
export function BridgeDataAccess() {
  // Wallet connections
  const { publicKey } = useWallet();
  const { address } = useAccount();
  
  // Contract interactions
  const { data: balance } = useBridgeTokenBalance();
  const { write: depositToSolana } = useDepositToSolana();
  
  // State management
  const [transferAmount, setTransferAmount] = useAtom(transferAmountAtom);
  const [recipient, setRecipient] = useAtom(recipientAtom);
  
  return (
    <BridgeTransferForm
      balance={balance}
      onTransfer={handleTransfer}
    />
  );
}
```

**Key Functions:**
- `useDepositToSolana()` - EVM → Solana transfers
- `useProcessWithdrawal()` - Solana → EVM withdrawals
- `useBridgeTokenBalance()` - Real-time balance tracking
- `useTransactionStatus()` - Poll transaction state

#### BridgeTransferForm

**Location:** `src/components/bridge/bridge-transfer-form.tsx`

User interface for initiating transfers.

```typescript
interface BridgeTransferFormProps {
  direction: 'solana-to-evm' | 'evm-to-solana';
  onSubmit: (params: TransferParams) => Promise<void>;
  balance?: string;
}

export function BridgeTransferForm({ 
  direction, 
  onSubmit, 
  balance 
}: BridgeTransferFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bridge Tokens</CardTitle>
      </CardHeader>
      <CardContent>
        <TokenSelector />
        <AmountInput max={balance} />
        <AddressInput 
          type={direction === 'solana-to-evm' ? 'evm' : 'solana'} 
        />
        <GasEstimate />
        <SubmitButton onClick={handleSubmit} />
      </CardContent>
    </Card>
  );
}
```

#### BridgeStatus

**Location:** `src/components/bridge/bridge-status.tsx`

Real-time transaction status display.

```typescript
export function BridgeStatus({ txHash }: { txHash: string }) {
  const { data: status } = useTransactionStatus(txHash);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Status</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusBadge status={status?.status} />
        <ProgressBar progress={calculateProgress(status)} />
        <StatusSteps steps={status?.steps} />
        
        {status?.sourceTransaction && (
          <ExternalLink
            href={getExplorerUrl(status.sourceTransaction)}
            text="View on Explorer"
          />
        )}
      </CardContent>
    </Card>
  );
}
```

### Wallet Components

#### SolanaProvider

**Location:** `src/components/wallet/solana-provider.tsx`

Provides Solana wallet context to the application.

```typescript
export function SolanaProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    []
  );
  
  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

#### EVMProvider

**Location:** `src/components/wallet/evm-provider.tsx`

Provides EVM wallet context using wagmi and RainbowKit.

```typescript
const { chains, publicClient } = configureChains(
  [mainnet, goerli, polygon],
  [alchemyProvider({ apiKey: ALCHEMY_API_KEY }), publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'Meridian Link',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export function EVMProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
```

### UI Primitives

Built with Radix UI for accessibility and customized with Tailwind CSS.

**Available Components:**
- `Button` - Interactive button with variants
- `Card` - Container for content sections
- `Input` - Text input with validation
- `Select` - Dropdown selector
- `Dialog` - Modal dialogs
- `Toast` - Notification toasts
- `Badge` - Status indicators
- `Skeleton` - Loading placeholders
- `Tooltip` - Helpful tooltips
- `Tabs` - Tabbed navigation

## 🔄 State Management

### Jotai Atoms

**Location:** `src/store/bridge-atoms.ts`

```typescript
import { atom } from 'jotai';

// Transfer state
export const transferDirectionAtom = atom<'solana-to-evm' | 'evm-to-solana'>('solana-to-evm');
export const transferAmountAtom = atom<string>('');
export const recipientAddressAtom = atom<string>('');
export const selectedTokenAtom = atom<string>('');

// Transaction state
export const pendingTransactionsAtom = atom<PendingTransaction[]>([]);
export const transactionHistoryAtom = atom<Transaction[]>([]);

// UI state
export const isTransferModalOpenAtom = atom<boolean>(false);
export const activeStepAtom = atom<number>(0);
```

### React Query

**Location:** `src/hooks/use-bridge-contract.ts`

```typescript
export function useBridgeTokenBalance() {
  const { address } = useAccount();
  const { data: balance } = useContractRead({
    address: BRIDGE_CONTRACT_ADDRESS,
    abi: BridgeABI,
    functionName: 'getTokenBalance',
    args: [TOKEN_CONTRACT_ADDRESS],
    watch: true,
    cacheTime: 5000,
  });
  
  return { balance };
}

export function useTransactionStatus(txHash: string) {
  return useQuery({
    queryKey: ['transaction-status', txHash],
    queryFn: () => fetchTransactionStatus(txHash),
    refetchInterval: 5000,
    enabled: !!txHash,
  });
}
```

## 🔗 Blockchain Integration

### Solana Integration

**Connection Setup:**
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export function useSolanaBridge() {
  const wallet = useWallet();
  const program = useMemo(() => {
    if (!wallet.publicKey) return null;
    
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
    
    return new Program(BridgeIDL, BRIDGE_PROGRAM_ID, provider);
  }, [wallet]);
  
  return { program, connection };
}
```

**Deposit Function:**
```typescript
export async function depositToEvm(
  program: Program,
  amount: number,
  destAddress: string
) {
  const tx = await program.methods
    .deposit(
      new BN(amount),
      DEST_CHAIN_ID,
      destAddress
    )
    .accounts({
      user: wallet.publicKey,
      bridgeState: bridgeStatePDA,
      depositRecord: depositRecordPDA,
      tokenAccount: userTokenAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
    
  return tx;
}
```

### EVM Integration

**Contract Interaction:**
```typescript
import { useContractWrite, usePrepareContractWrite } from 'wagmi';

export function useDepositToSolana() {
  const { config } = usePrepareContractWrite({
    address: BRIDGE_CONTRACT_ADDRESS,
    abi: BridgeABI,
    functionName: 'depositToSolana',
  });
  
  const { write, data, isLoading } = useContractWrite(config);
  
  const deposit = async (
    tokenContract: string,
    amount: bigint,
    solanaRecipient: string
  ) => {
    return write?.({
      args: [tokenContract, amount, solanaRecipient],
    });
  };
  
  return { deposit, data, isLoading };
}
```

**Event Listening:**
```typescript
export function useWatchBridgeEvents() {
  useContractEvent({
    address: BRIDGE_CONTRACT_ADDRESS,
    abi: BridgeABI,
    eventName: 'WithdrawalProcessed',
    listener(logs) {
      logs.forEach((log) => {
        toast.success(`Withdrawal processed: ${log.args.amount}`);
        queryClient.invalidateQueries(['bridge-balance']);
      });
    },
  });
}
```

## 🧪 Testing

### Test Structure

```
web/
├── __tests__/
│   ├── components/
│   │   ├── bridge-transfer-form.test.tsx
│   │   └── bridge-status.test.tsx
│   ├── hooks/
│   │   ├── use-bridge-contract.test.ts
│   │   └── use-transaction-status.test.ts
│   └── utils/
│       └── format.test.ts
│
└── vitest.config.ts
```

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BridgeTransferForm } from '@/components/bridge/bridge-transfer-form';

describe('BridgeTransferForm', () => {
  it('renders transfer form', () => {
    render(<BridgeTransferForm direction="solana-to-evm" />);
    expect(screen.getByText('Bridge Tokens')).toBeInTheDocument();
  });
  
  it('validates amount input', async () => {
    render(<BridgeTransferForm balance="100" />);
    const input = screen.getByLabelText('Amount');
    
    fireEvent.change(input, { target: { value: '150' } });
    expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
  });
  
  it('submits valid transfer', async () => {
    const onSubmit = vi.fn();
    render(<BridgeTransferForm onSubmit={onSubmit} />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Amount'), { 
      target: { value: '50' } 
    });
    fireEvent.change(screen.getByLabelText('Recipient'), { 
      target: { value: '0x123...' } 
    });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        amount: '50',
        recipient: '0x123...'
      });
    });
  });
});
```

### Hook Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useBridgeTokenBalance } from '@/hooks/use-bridge-contract';

describe('useBridgeTokenBalance', () => {
  it('fetches token balance', async () => {
    const { result } = renderHook(() => useBridgeTokenBalance());
    
    await waitFor(() => {
      expect(result.current.balance).toBeDefined();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
bun run test

# Watch mode
bun run test --watch

# Coverage report
bun run test:coverage

# UI mode
bun run test:ui
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SOLANA_RPC_URL": "@solana-rpc-url",
    "NEXT_PUBLIC_EVM_RPC_URL": "@evm-rpc-url"
  }
}
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM oven/bun:1 as builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build application
COPY . .
RUN bun run build

# Production image
FROM oven/bun:1-slim

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

RUN bun install --production

EXPOSE 3000

CMD ["bun", "run", "start"]
```

**Build and run:**
```bash
# Build image
docker build -t meridian-web .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SOLANA_RPC_URL=$SOLANA_RPC \
  -e NEXT_PUBLIC_EVM_RPC_URL=$EVM_RPC \
  meridian-web
```

### Static Export

For CDN deployment:

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

```bash
# Build static site
bun run build

# Output in ./out directory
# Deploy to: CloudFlare Pages, AWS S3, Netlify, etc.
```

## 🎨 Styling

### Tailwind Configuration

**tailwind.config.ts:**
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more colors
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Theme System

**CSS Variables:**
```css
/* src/styles/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    /* ... */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... */
  }
}
```

### Component Styling Example

```tsx
export function Button({ variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': 
            variant === 'default',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90': 
            variant === 'destructive',
          'border border-input bg-background hover:bg-accent': 
            variant === 'outline',
        }
      )}
      {...props}
    />
  );
}
```

## ⚡ Performance

### Optimization Techniques

1. **Code Splitting**
   - Dynamic imports for heavy components
   - Route-based chunking with Next.js App Router

2. **Image Optimization**
   - Next.js Image component with automatic optimization
   - WebP format with fallbacks
   - Lazy loading below the fold

3. **State Management**
   - Jotai for granular re-renders
   - React Query for server state caching
   - Memoization of expensive computations

4. **Bundle Size**
   - Tree-shaking unused code
   - Dynamic imports for wallet adapters
   - Analyze with `@next/bundle-analyzer`

### Performance Monitoring

```typescript
// src/lib/analytics.ts
import { onCLS, onFID, onLCP, onTTFB } from 'web-vitals';

export function reportWebVitals({ id, name, value }: any) {
  // Send to analytics
  if (process.env.NEXT_PUBLIC_GA_TRACKING_ID) {
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
    });
  }
}

// Measure vitals
onCLS(reportWebVitals);
onFID(reportWebVitals);
onLCP(reportWebVitals);
onTTFB(reportWebVitals);
```

## 🐛 Troubleshooting

### Common Issues

#### Wallet Connection Fails

**Error: "Wallet adapter not ready"**
```
Cause: Wallet extension not installed or not initialized
Solution:
  1. Ensure wallet extension is installed
  2. Refresh page after installation
  3. Check wallet is unlocked
  4. Verify network selection matches app
```

#### Transaction Fails

**Error: "Insufficient funds for gas"**
```
Cause: Not enough ETH/SOL for transaction fees
Solution:
  1. Check native token balance
  2. Get testnet tokens from faucet
  3. Reduce transfer amount to account for gas
```

**Error: "User rejected transaction"**
```
Cause: User cancelled transaction in wallet
Solution: This is expected behavior, no action needed
```

#### RPC Errors

**Error: "Failed to fetch"**
```
Cause: RPC endpoint unreachable or rate limited
Solution:
  1. Check RPC URL in .env.local
  2. Verify network connectivity
  3. Try alternative RPC provider
  4. Check rate limits
```

#### Build Errors

**Error: "Module not found"**
```
Cause: Missing dependency or incorrect import
Solution:
  1. Run: bun install
  2. Clear cache: rm -rf .next node_modules
  3. Reinstall: bun install
  4. Check import paths
```

### Debug Mode

Enable detailed logging:

```bash
# Development with debug logs
DEBUG=* bun run dev

# Specific namespace
DEBUG=bridge:* bun run dev
```

**Debug utilities:**
```typescript
// src/lib/debug.ts
export const debug = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
```

### Browser Console Commands

```javascript
// Check wallet connection
window.solana?.isConnected
window.ethereum?.selectedAddress

// Get app state
localStorage.getItem('app-state')

// Clear cache
localStorage.clear()
sessionStorage.clear()
```

## 📚 Additional Resources

### Related Documentation

- [Main README](../README.md) - Overall system
- [EVM Bridge](../evm-bridge/README.md) - Smart contracts
- [Solana Bridge](../sol-bridge/README.md) - Solana program
- [Relayer Service](../relayer-ts/README.md) - Backend coordinator

### External Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 RC Docs](https://react.dev/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Docs](https://www.rainbowkit.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

### Development Tools

- **Bun** - Fast JavaScript runtime
- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Testing framework
- **React DevTools** - Component debugging

## 📞 Support

For questions or issues specific to the web application:

- **General Questions:** hello@meridianlink.io
- **Technical Support:** dev@meridianlink.io
- **Bug Reports:** [GitHub Issues](https://github.com/your-org/meridian-link/issues)
- **Discord:** Join our community

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

### Component Development

1. Create component in appropriate directory
2. Add TypeScript types
3. Write tests
4. Add to Storybook (if applicable)
5. Document props and usage

### Code Style

- Use TypeScript strict mode
- Follow React best practices
- Implement proper error boundaries
- Add loading and error states
- Make components accessible (ARIA)

---

**Part of the [Meridian Link](https://deepwiki.com/RippnerLabs/meridian-link) Cross-Chain Bridge System**

*A beautiful, user-friendly interface for seamless cross-chain transfers*
