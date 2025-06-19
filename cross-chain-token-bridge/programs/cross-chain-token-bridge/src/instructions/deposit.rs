use std::io::Read;

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked, TokenInterface}};
use light_sdk::{account::LightAccount, address::v1::derive_address, cpi::{CpiAccounts, CpiInputs}, instruction::merkle_context::PackedAddressMerkleContext, light_compressed_account::pubkey::PubkeyTrait, NewAddressParams, NewAddressParamsPacked, ValidityProof};

use crate::{error::ErrorCode, state::{BridgeState, DepositRecordCompressedAccount, TokenBridge, SOURCE_CHAIN_ID}, CounterCompressedAccount};

#[derive(Accounts)]
#[instruction(
    proof: ValidityProof,
    address_merkle_context: PackedAddressMerkleContext,
    output_merkle_tree_index: u8,
    amount: u64,
    dest_chain_id: u32,
    dest_chain_addr: String
)]
pub struct DepositContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bridge_state"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(
        seeds=[b"token_bridge", mint.key().as_ref(), dest_chain_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub token_bridge: Account<'info, TokenBridge>,
    
    #[account(
        init_if_needed,
        payer=signer,
        token::mint = mint,
        token::authority = token_vault,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer,
        // associated_token::token_program = token_program,
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_handler<'info> (
    ctx: Context<'_, '_, '_, 'info, DepositContext<'info>>,
    proof: ValidityProof,
    address_merkle_context: PackedAddressMerkleContext,
    output_merkle_tree_index: u8,
    amount: u64,
    dest_chain_id: u32,
    dest_chain_addr: String,
) -> Result<()> {

    require!(amount >0, ErrorCode::DepositAmountShouldBeGreaterThanZero);
    
    let tranfer_checked_t = TransferChecked {
        authority: ctx.accounts.signer.to_account_info(),
        from: ctx.accounts.user_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_vault.to_account_info(),
    };

    let transfer_checked_cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), tranfer_checked_t);

    let _res = transfer_checked(
        transfer_checked_cpi,
        amount,
        ctx.accounts.mint.decimals
    )?;
    
    let program_id = crate::ID.into();
    let light_cpi_accounts = CpiAccounts::new(
        ctx.accounts.signer.as_ref(),
        ctx.remaining_accounts,
        crate::ID,
    ).map_err(ProgramError::from)?;
    
    // Increment the global deposit counter (persist to account)
    let current_deposit_num = ctx.accounts
        .bridge_state
        .deposit_count
        .checked_add(1)
        .unwrap();

    // Persist the updated counter so that subsequent deposits use the correct value
    ctx.accounts.bridge_state.deposit_count = current_deposit_num;

    let (address, address_seed) = derive_address(
        &[b"deposit", ctx.accounts.signer.key().as_ref(), current_deposit_num.to_le_bytes().as_ref()],
        &light_cpi_accounts.tree_accounts()[address_merkle_context.address_merkle_tree_pubkey_index as usize].key(),
        &crate::ID,
    );
    let new_address_params = NewAddressParamsPacked {
        seed: address_seed,
        address_queue_account_index: address_merkle_context.address_queue_pubkey_index,
        address_merkle_tree_root_index: address_merkle_context.root_index,
        address_merkle_tree_account_index: address_merkle_context.address_merkle_tree_pubkey_index
    };
    
    let mut deposit_record = LightAccount::<'_, DepositRecordCompressedAccount>::new_init(
        &program_id,
        Some(address),
        output_merkle_tree_index,
    );
    
    deposit_record.owner = ctx.accounts.signer.key();
    deposit_record.mint = ctx.accounts.mint.key();
    msg!("amount {:?}", amount);
    deposit_record.amount = amount;
    deposit_record.source_chain_id = SOURCE_CHAIN_ID;
    deposit_record.dest_chain_id = dest_chain_id;
    deposit_record.dest_chain_addr = dest_chain_addr;
    deposit_record.dest_chain_mint_addr = ctx.accounts.token_bridge.dest_chain_mint_addr.clone();
    deposit_record.timestamp = Clock::get()?.unix_timestamp;
    deposit_record.deposit_id = current_deposit_num;
    
    let cpi = CpiInputs::new_with_address(
        proof,
        vec![deposit_record.to_account_info().map_err(|e| {
            msg!("Error converting deposit record to account info: {:?}", e);
            ProgramError::from(e)
        })?],
        vec![new_address_params],
    );
    msg!("depositRecordAddress {:?}", address);
    
    cpi.invoke_light_system_program(light_cpi_accounts).map_err(|e| {
        msg!("Error invoking light system program: {:?}", e);
        ProgramError::from(e)
    })?;

    Ok(())
}