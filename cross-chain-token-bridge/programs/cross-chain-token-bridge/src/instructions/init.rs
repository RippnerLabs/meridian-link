use anchor_lang::prelude::*;
use crate::state::BridgeState;

#[derive(Accounts)]
pub struct InitContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        space = 8 + BridgeState::INIT_SPACE,
        payer = signer,
        seeds=[b"bridge_state"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    pub system_program: Program<'info, System>,
}


pub fn init_handler(ctx: Context<InitContext>) -> Result<()> {
    ctx.accounts.bridge_state.deposit_count = 0;
    Ok(())
}