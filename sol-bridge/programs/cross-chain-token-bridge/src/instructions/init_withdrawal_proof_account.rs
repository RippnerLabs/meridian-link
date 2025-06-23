use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use crate::state::{TokenBridge, WithdrawalProof};

#[derive(Accounts)]
#[instruction(
    withdrawal_id: u128,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    nullifier: [u8; 16],
    new_root: [u8; 16],
)]
pub struct InitWithdrawalProofAccountContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer=signer,
        space=8+WithdrawalProof::INIT_SPACE,
        seeds=[
            b"withdrawal_proof",
            withdrawal_id.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub withdrawal_proof: Account<'info, WithdrawalProof>,

    pub system_program: Program<'info, System>,
}

pub fn init_withdrawal_proof_account_handler(
    ctx: Context<InitWithdrawalProofAccountContext>,
    withdrawal_id: u128,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    nullifier: [u8; 32],
    new_root: [u8; 32],
) -> Result<()> {
    let withdrawal_proof = &mut ctx.accounts.withdrawal_proof;
    withdrawal_proof.proof_a = proof_a;
    withdrawal_proof.proof_b = proof_b;
    withdrawal_proof.proof_c = proof_c;
    withdrawal_proof.nullifier = nullifier;
    withdrawal_proof.new_root = new_root;

    Ok(())
}