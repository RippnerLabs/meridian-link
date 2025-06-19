use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::state::TokenBridge;

#[derive(Accounts)]
#[instruction(dest_chain: u32, dest_chain_mint_addr: String)]
pub struct InitTokenBridgeContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer=signer,
        space=8+TokenBridge::INIT_SPACE,
        seeds=[b"token_bridge", mint.key().as_ref(), dest_chain.to_le_bytes().as_ref()],
        bump,
    )]
    pub token_bridge: Account<'info, TokenBridge>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn init_token_bridge_handler(ctx: Context<InitTokenBridgeContext>, dest_chain: u32, dest_chain_mint_addr: String) -> Result<()> {
    let token_bridge = &mut ctx.accounts.token_bridge;
    token_bridge.mint = ctx.accounts.mint.key();
    token_bridge.dest_chain = dest_chain;
    token_bridge.dest_chain_mint_addr = dest_chain_mint_addr;
    Ok(())
}