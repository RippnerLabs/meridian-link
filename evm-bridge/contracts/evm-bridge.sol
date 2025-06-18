// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SolDepositVerifier.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ReentrancyGuard, Pausable

/**
 * @title SolanaEVMBridge
 * @dev Bridge contract for withdrawing tokens from Solana to EVM chains using ZK proofs
 */
contract SolanaEVMBridge is Ownable {
    // enable the SafeERC20 library functions for all IERC20 token interactions
    using SafeERC20 for IERC20;
    
    SolDepositVerifier public immutable verifier;
    
    // deposit - record.json
    struct DepositRecord {
        string owner;                // Solana owner pubkey
        uint32 sourceChainId;        // Source chain ID (Solana = 1)
        uint32 destChainId;          // Destination chain ID
        string destChainAddr;        // Destination address (base58 format)
        address destChainMintAddr;   // ERC20 token contract address
        string mint;                 // Solana mint pubkey
        uint256 amount;              // Token amount
        string timestamp;           // Deposit timestamp
        uint256 depositId;           // Unique deposit ID
    }

    struct ZKProof {
        uint[2] a;
        uint[2][2] b;
        uint[2] c;
        uint[7] publicSignals;
    }

    // Events
    event WithdrawalProcessed(
        uint256 indexed depositId,
        address indexed recipient,
        address indexed tokenContract,
        uint256 amount
    );
    
    event StateRootUpdated(
        uint256 indexed stateRoot,
        uint256 blockHeight,
        address updater
    );

    // storage
    mapping(uint256 => bool) public usedNullifiers;           // Prevent double spending
    mapping(uint256 => bool) public validStateRoots;         // Valid Solana state roots
    mapping(address => bool) public authorizedRelayers;      // Can update state roots
    mapping(string => address) public addressMapping;        // Base58 to Ethereum address mapping
    mapping(string => address) public tokenMapping;          // Solana mint to ERC20 mapping
    
    uint256 public constant SOLANA_CHAIN_ID = 1;
    uint256 public minAmount = 1; // min amount to withdraw
    
    modifier onlyAuthorized() {
        require(authorizedRelayers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _addr) Ownable(msg.sender) {
        verifier = SolDepositVerifier(_addr);
        authorizedRelayers[msg.sender] = true;
    }

    function processWithdrawal(
        DepositRecord calldata record,
        ZKProof calldata proof
    ) external 
    // nonReentrant whenNotPaused 
    {
        
        // Basic validation
        require(record.sourceChainId == SOLANA_CHAIN_ID, "Invalid source chain");
        // require(record.destChainId == block.chainid, "Invalid destination chain");
        require(record.amount >= minAmount, "Amount too small");
        // require(!usedNullifiers[proof.nullifier], "Nullifier already used");
        
        // Verify state root is valid
        require(validStateRoots[proof.publicSignals[0]], "Invalid state root");
        
        // Get recipient address
        address recipient = getRecipientAddress(record.destChainAddr);
        require(recipient != address(0), "Invalid recipient address");
        
        // Get token contract
        require(record.destChainMintAddr != address(0), "Invalid token contract");
        IERC20 token = IERC20(record.destChainMintAddr);
        
        // Verify public signals match record data
        // require(proof.publicSignals[1] == record.amount, "Amount mismatch");
        // require(proof.publicSignals[2] == record.destChainId, "Chain ID mismatch");
        
        // Convert destChainAddr to uint256 for comparison
        // uint256 destChainAddrHash = uint256(keccak256(abi.encodePacked(record.destChainAddr))) >> 8; // Truncate to fit field
        // require(proof.publicSignals[3] == destChainAddrHash, "Destination address mismatch");
        
        // Verify ZK proof
        require(
            verifier.verifyProof(
                proof.a,
                proof.b,
                proof.c,
                proof.publicSignals
            ),
            "Invalid ZK proof"
        );
        
        // Verify commitment
        // uint256 expectedCommitment = computeCommitment(
        //     record.amount,
        //     destChainAddrHash,
        //     record.destChainId,
        //     proof.nullifier
        // );
        // require(proof.commitment == expectedCommitment, "Invalid commitment");
        
        // Mark nullifier as used to prevent replay
        // usedNullifiers[proof.nullifier] = true;
        
        // Transfer tokens to recipient
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance >= record.amount, "Insufficient contract balance");
        
        token.safeTransfer(recipient, record.amount);
        
        emit WithdrawalProcessed(
            record.depositId,
            recipient,
            record.destChainMintAddr,
            record.amount
        );
    }

    /**
     * @dev Update Solana state root (called by authorized relayers)
     */
    function updateStateRoot(uint256 stateRoot, uint256 blockHeight) external onlyAuthorized {
        validStateRoots[stateRoot] = true;
        emit StateRootUpdated(stateRoot, blockHeight, msg.sender);
    }

    /**
     * @dev Map a base58 address to an Ethereum address
     */
    function mapAddress(string calldata base58Addr, address ethAddr) external onlyOwner {
        addressMapping[base58Addr] = ethAddr;
    }

    /**
     * @dev Map a Solana mint to an ERC20 token contract
     */
    function mapToken(string calldata solanaMint, address tokenContract) external onlyOwner {
        tokenMapping[solanaMint] = tokenContract;
    }

    /**
     * @dev Get recipient address from base58 string
     */
    function getRecipientAddress(string memory destChainAddr) public view returns (address) {
        // First check if there's a manual mapping
        address mapped = addressMapping[destChainAddr];
        if (mapped != address(0)) {
            return mapped;
        }
        
        // Try to decode as hex (if it's already an Ethereum address in hex format)
        if (bytes(destChainAddr).length == 42) { // "0x" + 40 hex chars
            return parseHexAddress(destChainAddr);
        }
        
        // For now, return zero address if no mapping found
        // In production, implement proper base58 to address conversion
        return address(0);
    }

    /**
     * @dev Parse hex string to address
     */
    function parseHexAddress(string memory hexStr) internal pure returns (address) {
        bytes memory data = bytes(hexStr);
        require(data.length == 42, "Invalid hex address length");
        require(data[0] == '0' && data[1] == 'x', "Invalid hex prefix");
        
        uint160 result = 0;
        for (uint i = 2; i < 42; i++) {
            uint8 digit = uint8(data[i]);
            if (digit >= 48 && digit <= 57) {
                result = result * 16 + (digit - 48);
            } else if (digit >= 65 && digit <= 70) {
                result = result * 16 + (digit - 55);
            } else if (digit >= 97 && digit <= 102) {
                result = result * 16 + (digit - 87);
            } else {
                revert("Invalid hex character");
            }
        }
        return address(result);
    }

    /**
     * @dev Compute expected commitment for validation
     */
    function computeCommitment(
        uint256 amount,
        uint256 destChainAddr,
        uint256 destChainId,
        uint256 nullifier
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(amount, destChainAddr, destChainId, nullifier))) >> 8;
    }

    // Admin functions
    function addAuthorizedRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = true;
    }

    function removeAuthorizedRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
    }

    function setMinAmount(uint256 _minAmount) external onlyOwner {
        minAmount = _minAmount;
    }


    /**
     * @dev Deposit tokens to the bridge contract (for liquidity)
     */
    function depositTokens(address tokenContract, uint256 amount) external {
        IERC20(tokenContract).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw(address tokenContract, uint256 amount) external onlyOwner {
        IERC20(tokenContract).safeTransfer(owner(), amount);
    }

    /**
     * @dev Check if nullifier has been used
     */
    function isNullifierUsed(uint256 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }

    /**
     * @dev Check if state root is valid
     */
    function isStateRootValid(uint256 stateRoot) external view returns (bool) {
        return validStateRoots[stateRoot];
    }

    /**
     * @dev Get token balance of the contract
     */
    function getTokenBalance(address tokenContract) external view returns (uint256) {
        return IERC20(tokenContract).balanceOf(address(this));
    }
}
