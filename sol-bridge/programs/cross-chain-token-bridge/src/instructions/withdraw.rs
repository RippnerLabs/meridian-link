use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked}};
use light_sdk::{account::LightAccount, address::v1::derive_address, cpi::{CpiAccounts, CpiInputs}, instruction::merkle_context::PackedAddressMerkleContext, NewAddressParamsPacked, ValidityProof};

use crate::{error::ErrorCode, state::{BridgeState, TokenBridge, WithdrawalProof, WithdrawalRecordCompressedAccount, SOURCE_CHAIN_ID}, zk::{groth16_verifier, ETHDEPOSIT_VERIFYINGKEY}};

#[derive(Accounts)]
#[instruction(
    proof: ValidityProof,
    address_merkle_context: PackedAddressMerkleContext,
    output_merkle_tree_index: u8,
    amount: u64,
    withdraw_addr: Pubkey,
    depositer: String,
    link_hash: String,
    withdrawal_id: u128,
)]
pub struct WithdrawContext<'info> {
    #[account(mut)]
    pub relayer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [b"withdrawal_proof", withdrawal_id.to_le_bytes().as_ref()],
        bump
    )]
    pub withdrawal_proof: Account<'info, WithdrawalProof>,

    #[account(
        mut,
        seeds = [b"bridge_state"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(
        seeds=[
            b"tb",
            link_hash.as_bytes().as_ref(),
        ],
        bump,
    )]
    pub token_bridge: Account<'info, TokenBridge>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = token_vault,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = withdraw_addr,
        // associated_token::token_program = token_program,
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_handler<'info>(
    ctx: Context<'_,'_,'_, 'info, WithdrawContext<'info>>,
    proof: ValidityProof,
    address_merkle_context: PackedAddressMerkleContext,
    output_merkle_tree_index: u8,
    amount: u64,
    withdraw_addr: Pubkey,
    link_hash: String,
    withdrawal_id: u128,
) -> Result<()> {
    require!(amount > 0, ErrorCode::WithdrawAmountShouldBeGreaterThanZero);

    // groth16_verifier(proof_a, proof_b, proof_c, &[nullifier, new_root], ETHDEPOSIT_VERIFYINGKEY);

    let transfer_checked_t = TransferChecked {
        authority: ctx.accounts.token_vault.to_account_info(),
        from: ctx.accounts.token_vault.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.user_ata.to_account_info(),
    };

    let mint_key = ctx.accounts.mint.key();
    let signer_seeds: &[&[&[u8]]] = &[
        &[
            b"vault",
            mint_key.as_ref(),
            &[ctx.bumps.token_vault]
        ],
    ];

    let transfer_checked_cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_checked_t,
        signer_seeds
    );

    let res = transfer_checked(
        transfer_checked_cpi,
        amount,
        ctx.accounts.mint.decimals
    );

    let program_id = crate::ID.into();
    let light_cpi_accounts = CpiAccounts::new(
        ctx.accounts.relayer.as_ref(),
        ctx.remaining_accounts,
        crate::ID,
    ).map_err(ProgramError::from)?;

    let current_withdrawl_num = ctx.accounts.bridge_state.withdraw_count.checked_add(1).unwrap();

    ctx.accounts.bridge_state.withdraw_count = current_withdrawl_num.clone();

    let (address, address_seed) = derive_address(
        &[b"withdrawal", withdraw_addr.key().as_ref(), withdrawal_id.to_le_bytes().as_ref()],
        &light_cpi_accounts.tree_accounts()[address_merkle_context.address_merkle_tree_pubkey_index as usize].key(),
        &crate::ID);

    let new_address_params = NewAddressParamsPacked {
        seed: address_seed,
        address_queue_account_index: address_merkle_context.address_queue_pubkey_index,
        address_merkle_tree_account_index:address_merkle_context.address_merkle_tree_pubkey_index,
        address_merkle_tree_root_index: address_merkle_context.root_index,
    };

    let mut withdrawl_record = LightAccount::<'_, WithdrawalRecordCompressedAccount>::new_init(
        &program_id,
        Some(address),
        output_merkle_tree_index,
    );

    let token_bridge = &ctx.accounts.token_bridge;

    // withdrawl_record.depositer = depositer;
    withdrawl_record.sourceChainId = token_bridge.source_chain as u64;
    withdrawl_record.destChainId = SOURCE_CHAIN_ID as u64;
    withdrawl_record.destChainAddr = withdraw_addr;
    withdrawl_record.destChainMintAddr = ctx.accounts.mint.key();
    withdrawl_record.tokenMint = token_bridge.source_chain_mint_addr.clone();
    withdrawl_record.amount = amount;
    withdrawl_record.timestamp = Clock::get()?.unix_timestamp;
    withdrawl_record.withdrawalId = withdrawal_id;

    msg!("withdrawl_record: {:?}", withdrawl_record);

    let cpi = CpiInputs::new_with_address(
        proof,
        vec![withdrawl_record.to_account_info().map_err(|e| {
            msg!("Error converting withdrawal record to account info: {:?}", e);
            ProgramError::from(e)
        })?],
        vec![new_address_params],
    );

    msg!("withdrawal_record addr: {:?}", address);

    cpi.invoke_light_system_program(light_cpi_accounts).map_err(|e| {
        msg!("err invoking light sys program: {:?}", e);
        ProgramError::from(e)
    })?;

    Ok(())
}