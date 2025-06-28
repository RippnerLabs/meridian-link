'use client';

import { useAccount, useWriteContract, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useState } from 'react';
import { toast } from 'sonner';

// Import ABIs from contracts
import BridgeTokenABI from '@/contracts/BridgeToken.json';
import SolanaEVMBridgeABI from '@/contracts/SolanaEVMBridge.json';

// Smart contract addresses
const LOCALHOST_ADDRESSES = {
  verifierSmartContractAddress: "0x4a679253410272dd5232b3ff7cf5dbb88f295319",
  bridgeSmartContractAddress: "0x7a2088a1bfc9d81c55368ae168c2c02570cb814f",
  tokenSmartContractAddress: "0x09635f643e140090a9a8dcd712ed6285858cebef",
  secondWalletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  deployer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
};

// Sepolia addresses (to be updated when deployed)
const SEPOLIA_ADDRESSES = {
  verifierSmartContractAddress: "0x0000000000000000000000000000000000000000", // Update after deployment
  bridgeSmartContractAddress: "0x0000000000000000000000000000000000000000", // Update after deployment
  tokenSmartContractAddress: "0x0000000000000000000000000000000000000000", // Update after deployment
  secondWalletAddress: "0x0000000000000000000000000000000000000000"
};

// Get addresses based on current network
const getContractAddresses = (chainId?: number) => {
  const ETH_NETWORK = process.env.NEXT_PUBLIC_ETH_NETWORK || 'hardhat';
  
  // If explicitly set to sepolia or connected to sepolia chain
  if (ETH_NETWORK === 'sepolia' || chainId === 11155111) {
    return SEPOLIA_ADDRESSES;
  }
  
  // Default to localhost/hardhat
  return LOCALHOST_ADDRESSES;
};

// BridgeToken has 2 decimals instead of 18
const BRIDGE_TOKEN_DECIMALS = 2;

export interface BridgeTransferParams {
  amount: string;
  destChainAddr: string;
  destChainMintAddr: string;
}

export function useBridgeDataAccess() {
  const { address, isConnected, chain } = useAccount();
  const [isTransferring, setIsTransferring] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const publicClient = usePublicClient();
  
  // Get contract addresses based on current chain
  const contractAddresses = getContractAddresses(chain?.id);

  // Contract write hooks (async variants return the tx hash immediately)
  const { writeContractAsync: writeApproveAsync } = useWriteContract();
  const { writeContractAsync: writeDepositAsync } = useWriteContract();

  // Read token balance
  const { data: tokenBalance, refetch: refetchBalance, isLoading: isBalanceLoading, error: balanceError } = useReadContract({
    address: contractAddresses.tokenSmartContractAddress as `0x${string}`,
    abi: BridgeTokenABI.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractAddresses.tokenSmartContractAddress !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Read token allowance
  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: contractAddresses.tokenSmartContractAddress as `0x${string}`,
    abi: BridgeTokenABI.abi,
    functionName: 'allowance',
    args: address ? [address, contractAddresses.bridgeSmartContractAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!address && contractAddresses.tokenSmartContractAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  const approveToken = async (amount: string): Promise<`0x${string}` | null> => {
    if (!isConnected || !address) {
      toast.error('Please connect your Ethereum wallet');
      return null;
    }

    try {
      setCurrentStep(1);
      const amountWei = parseUnits(amount, BRIDGE_TOKEN_DECIMALS);
      
      const approveTxHash = await writeApproveAsync({
        address: contractAddresses.tokenSmartContractAddress as `0x${string}`,
        abi: BridgeTokenABI.abi,
        functionName: 'approve',
        args: [contractAddresses.bridgeSmartContractAddress as `0x${string}`, amountWei],
      });

      return approveTxHash;
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Token approval failed');
      setCurrentStep(0);
      return null;
    }
  };

  const depositToBridge = async (params: BridgeTransferParams): Promise<`0x${string}` | null> => {
    if (!isConnected || !address) {
      toast.error('Please connect your Ethereum wallet');
      return null;
    }

    try {
      setCurrentStep(2);
      const amountWei = parseUnits(params.amount, BRIDGE_TOKEN_DECIMALS);
      const sourceChainId = chain?.id || 31337;
      const destChainId = 1;

      const depositTxHash = await writeDepositAsync({
        address: contractAddresses.bridgeSmartContractAddress as `0x${string}`,
        abi: SolanaEVMBridgeABI.abi,
        functionName: 'deposit',
        args: [
          sourceChainId,
          destChainId,
          params.destChainAddr,
          params.destChainMintAddr,
          contractAddresses.tokenSmartContractAddress as `0x${string}`,
          amountWei,
        ],
      });

      return depositTxHash;
    } catch (error) {
      console.error('Deposit failed:', error);
      toast.error('Bridge deposit failed');
      setCurrentStep(0);
      return null;
    }
  };

  const TX_TIMEOUT_MS = 3 * 60 * 1000; // 3-minute safety timeout per tx

  const waitForTx = async (hash: `0x${string}`, stepOnSuccess: number) => {
    try {
      if(!publicClient) throw new Error('No public client');
      await publicClient.waitForTransactionReceipt({ hash, timeout: TX_TIMEOUT_MS });
      setCurrentStep(stepOnSuccess);
      return true;
    } catch (err) {
      console.error('Transaction timed-out / failed', err);
      toast.error('Transaction confirmation failed – please check the explorer.');
      setIsTransferring(false);
      setCurrentStep(0);
      return false;
    }
  };

  const executeBridgeTransfer = async (params: BridgeTransferParams) => {
    if (!isConnected) {
      toast.error('Please connect your Ethereum wallet');
      return;
    }

    setIsTransferring(true);
    setCurrentStep(0);

    try {
      const amountWei = parseUnits(params.amount, BRIDGE_TOKEN_DECIMALS);
      const currentAllowance = (tokenAllowance as bigint) || 0n;

      if (currentAllowance < amountWei) {
        toast.info('Approving token spending…');

        const approveHash = await approveToken(params.amount);
        if (!approveHash) {
          setIsTransferring(false);
          return;
        }

        const ok = await waitForTx(approveHash, 2);
        if (!ok) return;
        toast.success('Token approved');
        await refetchAllowance();
      }

      // 2️⃣  Deposit to bridge
      toast.info('Sending deposit transaction…');
      const depositHash = await depositToBridge(params);
      if (!depositHash) {
        setIsTransferring(false);
        return;
      }

      const ok2 = await waitForTx(depositHash, 3);
      if (!ok2) return;

      toast.success('Bridge deposit confirmed');
      await refetchBalance();

    } catch (error) {
      console.error('Bridge transfer failed:', error);
      toast.error('Bridge transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  return {
    // State
    isConnected,
    address,
    chain,
    isTransferring,
    currentStep,
    
    // Data
    tokenBalance: tokenBalance ? formatUnits(tokenBalance as bigint, BRIDGE_TOKEN_DECIMALS) : '0',
    tokenAllowance: tokenAllowance ? formatUnits(tokenAllowance as bigint, BRIDGE_TOKEN_DECIMALS) : '0',
    isBalanceLoading,
    balanceError,
    
    // Actions
    executeBridgeTransfer,
    refetchBalance,
    refetchAllowance,
    
    // Contract addresses for reference
    addresses: contractAddresses,
  };
}

