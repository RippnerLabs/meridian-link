use light_sdk::{LightDiscriminator, LightHasher};
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BridgeState {
    // [43312, ...]
    // pub valid_dest_chain_ids: Vec<u32>,
    pub deposit_count: u128,
    pub withdraw_count: u128,
}

#[account]
#[derive(InitSpace)]
pub struct TokenBridge {
    pub source_chain: u32,
    #[max_len(50)]
    pub source_chain_mint_addr: String,
    pub dest_chain: u32,
    #[max_len(50)]
    pub dest_chain_mint_addr: String,
    // #[max_len(64)]
    // pub link_hash: String,
}

#[event] // to include in anchor idl
#[derive(
    Clone, Debug, Default, LightDiscriminator, LightHasher
)]
// #[account]
pub struct DepositRecordCompressedAccount {
    #[hash]
    pub owner: Pubkey,
    pub source_chain_id: u32,
    pub dest_chain_id: u32,
    // eth addr - 0x(40 chars) - hex string
    // #[max_len(42)]
    pub dest_chain_addr: String,
    pub dest_chain_mint_addr: String,
    #[hash]
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    #[hash]
    pub deposit_id: u128,
}

#[event]
#[derive(
    Clone, Debug, Default, LightDiscriminator, LightHasher
)]
pub struct WithdrawalRecordCompressedAccount {
    pub depositer: String,
    pub sourceChainId: u64,
    pub destChainId: u64,
    #[hash]
    pub destChainAddr: Pubkey,
    #[hash]
    pub destChainMintAddr: Pubkey,
    pub tokenMint: String,
    pub amount: u64,
    pub timestamp: i64,
    pub withdrawalId: u128,
}

pub const SOURCE_CHAIN_ID: u32 = 1u32;

#[account]
#[derive(InitSpace)]
pub struct WithdrawalProof {
    pub proof_a: [u8; 64],
    pub proof_b: [u8; 128],
    pub proof_c: [u8; 64],
    pub nullifier: [u8; 32],
    pub new_root: [u8; 32],
}