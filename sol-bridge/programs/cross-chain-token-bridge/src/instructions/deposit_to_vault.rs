use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};

#[derive(Accounts)]
pub struct DepositToVaultContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        token::mint = mint,
        token::authority = token_vault,
        seeds = [b"vault", mint.key().as_ref()],
        bump
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::authority = signer,
        associated_token::mint = mint
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_to_vault_handler(
    ctx: Context<DepositToVaultContext>,
    amount: u64
) -> Result<()> {

    let transfer_checked_t = TransferChecked {
        authority: ctx.accounts.signer.to_account_info(),
        from: ctx.accounts.user_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_vault.to_account_info(),
    };

    let transfer_checked_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_checked_t,
    );

    let _res = transfer_checked(
        transfer_checked_cpi,
        amount,
        ctx.accounts.mint.decimals
    )?;

    Ok(())
}