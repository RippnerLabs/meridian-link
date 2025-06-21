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
    struct SolDepositRecord {
        string owner;                // Solana owner pubkey
        uint32 sourceChainId;        // Source chain ID (Solana = 1)
        uint32 destChainId;          // Destination chain ID
        address destChainAddr;        // Destination address (base58 format)
        address destChainMintAddr;   // ERC20 token contract address
        string mint;                 // Solana mint pubkey
        uint256 amount;              // Token amount
        string timestamp;           // Deposit timestamp
        uint256 depositId;           // Unique deposit ID
    }

    event EthDeposit(
        address indexed depositor,
        uint32 sourceChainId,
        uint32 destChainId,
        string destChainAddr,
        string destChainMintAddr,
        address tokenMint,
        uint256 amount,
        uint256 timestamp,
        uint256 depositId
    );

    uint256 public depositCount;

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

    function deposit(
        uint32 sourceChainId,
        uint32 destChainId,
        string memory destChainAddr,
        string memory destChainMintAddr,
        address tokenMint,
        uint256 amount
    ) external {
        require(sourceChainId == block.chainid, "Invalid source chain");
        require(destChainId == SOLANA_CHAIN_ID, "Invalid destination chain");
        // additional checcks for solana address
        require(bytes(destChainAddr).length > 0, "Invalid destination address");
        require(bytes(destChainMintAddr).length > 0, "Invalid destination mint address");
        require(tokenMint != address(0), "Invalid token mint address");

        IERC20 token = IERC20(tokenMint);
        uint256 userbalance = token.balanceOf(msg.sender);
        require(userbalance >= amount, "Amount too small");

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit EthDeposit(msg.sender, sourceChainId, destChainId, destChainAddr, destChainMintAddr, tokenMint, amount, block.timestamp, depositCount++);
    }

    function processWithdrawal(
        SolDepositRecord calldata record,
        ZKProof calldata proof
    ) external 
    // nonReentrant whenNotPaused 
    {
        require(record.sourceChainId == SOLANA_CHAIN_ID, "Invalid source chain");
        require(record.amount >= minAmount, "Amount too small");
        
        // Get recipient address
        address recipient = record.destChainAddr;
        require(recipient != address(0), "Invalid recipient address");
        require(!usedNullifiers[proof.publicSignals[0]], "Nullifier already used");
        usedNullifiers[proof.publicSignals[0]] = true;
        
        require(record.destChainMintAddr != address(0), "Invalid token contract");
        IERC20 token = IERC20(record.destChainMintAddr);

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
