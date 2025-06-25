'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useState } from 'react';
import { toast } from 'sonner';

// Import ABIs from contracts
import BridgeTokenABI from '@/contracts/BridgeToken.json';
import SolanaEVMBridgeABI from '@/contracts/SolanaEVMBridge.json';

// Smart contract addresses
const LOCALHOST_ADDRESSES = {
  verifierSmartContractAddress: "0x610178da211fef7d417bc0e6fed39f05609ad788",
  bridgeSmartContractAddress: "0xb7f8bc63bbcad18155201308c8f3540b07f84f5e",
  tokenSmartContractAddress: "0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0",
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
  
  // Get contract addresses based on current chain
  const contractAddresses = getContractAddresses(chain?.id);

  // Contract write hooks
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeDeposit, data: depositHash } = useWriteContract();

  // Transaction receipt hooks
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

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

  const approveToken = async (amount: string) => {
    if (!isConnected || !address) {
      toast.error('Please connect your Ethereum wallet');
      return false;
    }

    try {
      setCurrentStep(1);
      const amountWei = parseUnits(amount, BRIDGE_TOKEN_DECIMALS);
      
      writeApprove({
        address: contractAddresses.tokenSmartContractAddress as `0x${string}`,
        abi: BridgeTokenABI.abi,
        functionName: 'approve',
        args: [contractAddresses.bridgeSmartContractAddress as `0x${string}`, amountWei],
      });

      return true;
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Token approval failed');
      setCurrentStep(0);
      return false;
    }
  };

  const depositToBridge = async (params: BridgeTransferParams) => {
    if (!isConnected || !address) {
      toast.error('Please connect your Ethereum wallet');
      return false;
    }

    try {
      setCurrentStep(2);
      const amountWei = parseUnits(params.amount, BRIDGE_TOKEN_DECIMALS);
      const sourceChainId = chain?.id || 31337;
      const destChainId = 1;

      writeDeposit({
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

      return true;
    } catch (error) {
      console.error('Deposit failed:', error);
      toast.error('Bridge deposit failed');
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
      // Step 1: Check if approval is needed
      const amountWei = parseUnits(params.amount, BRIDGE_TOKEN_DECIMALS);
      const currentAllowance = tokenAllowance as bigint || 0n;

      if (currentAllowance < amountWei) {
        toast.info('Approving token spending...');
        const approved = await approveToken(params.amount);
        if (!approved) {
          setIsTransferring(false);
          return;
        }
        
        // Wait for approval to complete
        while (!isApproveSuccess && isApproveLoading) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!isApproveSuccess) {
          toast.error('Token approval failed');
          setIsTransferring(false);
          return;
        }
        
        toast.success('Token approved successfully');
        await refetchAllowance();
      }

      // Step 2: Execute deposit
      toast.info('Executing bridge deposit...');
      const deposited = await depositToBridge(params);
      if (!deposited) {
        setIsTransferring(false);
        return;
      }

      // Wait for deposit to complete
      while (!isDepositSuccess && isDepositLoading) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (isDepositSuccess) {
        setCurrentStep(3);
        toast.success('Bridge transfer initiated successfully!');
        await refetchBalance();
      } else {
        toast.error('Bridge deposit failed');
      }

    } catch (error) {
      console.error('Bridge transfer failed:', error);
      toast.error('Bridge transfer failed');
    } finally {
      setIsTransferring(false);
      setCurrentStep(0);
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

